<i18n>
    {
        "en": {
            "item_not_found": "Record not found",
            "delete": "Delete",
            "delete_confirmation": "Are you sure want to delete this record?",
            "ok": "OK",
            "cancel": "Cancel",
            "no_value": "(No value)",
            "select_value": "(Select value)",
            "yes": "Yes",
            "no": "No"
        },
        "ru": {
            "item_not_found": "Запись не найдена",
            "delete": "Удалить",
            "delete_confirmation": "Вы действительно хотите удалить эту запись?",
            "ok": "ОК",
            "cancel": "Отмена",
            "no_value": "(Пусто)",
            "yes": "Да",
            "no": "Нет"
        }
    }
</i18n>

<template>
    <div fluid class="view-form">
        <div v-if="rowPositions.length === 0 && uv.newRowsPositions.length === 0 && !showEmptyRow">
            {{ $t('item_not_found') }}
        </div>
        <template v-else>
            <!-- The first form control is special, it points either to the empty row or to the first added row
                 _dynamically_. This is as to not lose focus when user starts editing empty row. -->
            <FormEntry v-if="uv.newRowsPositions.length > 0 || showEmptyRow"
                    :uv="uv"
                    :blocks="blocks"
                    :row="showEmptyRow ? local.emptyRow.row : uv.newRows[uv.newRowsPositions[0]]"
                    :localRow="showEmptyRow ? local.emptyRow.local : local.newRows[uv.newRowsPositions[0]]"
                    :locked="addedLocked"
                    :indirectLinks="indirectLinks"
                    :scope="scope"
                    :level="level"
                    @update="updateValue(showEmptyRow ? { type: 'new', column: arguments[0] } : { type: 'added', id: uv.newRowsPositions[0], column: arguments[0] }, arguments[1])"
                    @goto="$emit('goto', $event)" />
            <FormEntry v-for="rowId in newRowsPositions" :key="`added-${rowId}`"
                    :uv="uv"
                    :blocks="blocks"
                    :row="uv.newRows[rowId]"
                    :localRow="local.newRows[rowId]"
                    :locked="addedLocked"
                    :indirectLinks="indirectLinks"
                    :scope="scope"
                    :level="level"
                    @update="updateValue({ type: 'added', id: rowId, column: arguments[0] }, arguments[1])"
                    @delete="deleteRowAndSignal({ type: 'added', id: rowId })"
                    @goto="$emit('goto', $event)" />
            <FormEntry v-for="rowI in rowPositions" :key="rowI"
                    :uv="uv"
                    :blocks="blocks"
                    :row="uv.rows[rowI]"
                    :localRow="local.rows[rowI]"
                    :indirectLinks="indirectLinks"
                    :scope="scope"
                    :level="level"
                    :selectionMode="selectionMode"
                    @update="updateValue({ type: 'existing', position: rowI, column: arguments[0] }, arguments[1])"
                    @delete="deleteRowAndSignal({ type: 'existing', position: rowI })"
                    @goto="$emit('goto', $event)"
                    @select="$emit('select', $event)" />
        </template>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { Store } from "vuex";
import { namespace } from "vuex-class";

import { tryDicts, mapMaybe } from "@/utils";
import { AttributesMap, IResultColumnInfo } from "@/api";
import { CombinedUserView, ICombinedValue, IRowCommon, ICombinedRow, IAddedRow, homeSchema } from "@/state/user_view";
import { AddedRowId } from "@/state/staging_changes";
import { IQuery } from "@/state/query";
import { LocalUserView, SimpleLocalUserView, ILocalRowInfo, ILocalRow, ValueRef, RowRef } from "@/local_user_view";
import { UserView } from "@/components";
import { ISelectionRef } from "@/components/BaseUserView";
import BaseUserView from "@/components/BaseUserView";
import FormEntry from "@/components/views/form/FormEntry.vue";
import { IAction } from "@/components/ActionsMenu.vue";

interface IFieldInfo {
    index: number;
    columnInfo: IResultColumnInfo;
    caption: string;
    visible: boolean;
}

interface IBlockInfo {
    width: number;
    fields: IFieldInfo[];
}

interface IFormValueExtra {
    attributes: AttributesMap;
}

interface IFormRowExtra {
    selectionEntry?: ISelectionRef;
}

interface IFormUserViewExtra {
    homeSchema: string | null;
}

type IFormLocalRowInfo = ILocalRowInfo<IFormRowExtra>;
type IFormLocalRow = ILocalRow<IFormValueExtra, IFormRowExtra>;

class LocalFormUserView extends LocalUserView<IFormValueExtra, IFormRowExtra, IFormUserViewExtra> {
    constructor(store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>, oldLocal: LocalUserView<IFormValueExtra, IFormRowExtra, IFormUserViewExtra> | null) {
        super(store, uv, defaultRawValues, oldLocal);
    }

    createCommonLocalValue(row: IRowCommon, localRow: IFormLocalRowInfo, columnIndex: number, value: ICombinedValue): IFormValueExtra {
        const columnAttrs = this.uv.columnAttributes[columnIndex];
        const attributes = { ...this.uv.attributes, ...columnAttrs, ...row.attributes, ...value.attributes };
        const extra = {
            attributes,
        };
        return extra;
    }

    createLocalValue(rowIndex: number, row: ICombinedRow, localRow: IFormLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: IFormValueExtra | null) {
        const extra = this.createCommonLocalValue(row, localRow, columnIndex, value);
        if (extra.attributes["Selectable"] && value.info !== undefined) {
            localRow.extra.selectionEntry = {
                entity: value.info.fieldRef.entity,
                id: value.info.id,
            };
        } else if (this.uv.info.mainEntity !== null) {
            localRow.extra.selectionEntry = {
                entity: this.uv.info.mainEntity,
                id: row.mainId!,
            };
        }
        return extra;
    }

    createAddedLocalValue(rowId: AddedRowId, row: IAddedRow, localRow: IFormLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: IFormValueExtra | null) {
        const extra = this.createCommonLocalValue(row, localRow, columnIndex, value);
        return extra;
    }

    createEmptyLocalValue(row: IRowCommon, localRow: IFormLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: IFormValueExtra | null) {
        const extra = this.createCommonLocalValue(row, localRow, columnIndex, value);
        return extra;
    }

    createCommonLocalRow(row: IRowCommon): IFormRowExtra {
        return {};
    }

    createLocalRow(rowIndex: number, row: ICombinedRow) {
        const extra = this.createCommonLocalRow(row);
        if (row.mainId !== undefined) {
            extra.selectionEntry = {
                entity: this.uv.info.mainEntity!,
                id: row.mainId,
            };
        }
        return extra;
    }

    createAddedLocalRow(rowId: AddedRowId, row: IAddedRow) {
        return this.createCommonLocalRow(row);
    }

    createEmptyLocalRow(row: IRowCommon) {
        return this.createCommonLocalRow(row);
    }

    createLocalUserView(): IFormUserViewExtra {
        const extra = {
            homeSchema: homeSchema(this.uv.args),
        };
        return extra;
    }
}

const query = namespace("query");

@UserView({
    localConstructor: LocalFormUserView,
})
@Component({
    components: {
        FormEntry,
    },
})
export default class UserViewForm extends mixins<BaseUserView<LocalFormUserView, IFormValueExtra, IFormRowExtra, IFormUserViewExtra>>(BaseUserView) {
    @query.State("previous") previousQuery!: IQuery | null;

    @Prop({ type: CombinedUserView, required: true }) uv!: CombinedUserView;
    @Prop({ type: Boolean, default: false }) isRoot!: boolean;
    @Prop({ type: Object, required: true }) local!: LocalFormUserView;

    private deletedOne = false;

    // Show empty row only if it's a create view and there are no already created rows.
    get showEmptyRow() {
        return this.uv.newRowsPositions.length === 0 && this.uv.rows === null && this.uv.info.mainEntity !== null;
    }

    // Because we treat the first added row specially we use only second+ new rows here.
    get newRowsPositions() {
        return this.uv.newRowsPositions.slice(1);
    }

    get fields(): IFieldInfo[] {
        const viewAttrs = this.uv.attributes;
        return this.uv.info.columns.map((columnInfo, i) => {
            const columnAttrs = this.uv.columnAttributes[i];
            const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs);

            const captionAttr = getColumnAttr("Caption");
            const caption = captionAttr !== undefined ? String(captionAttr) : columnInfo.name;

            const visibleColumnAttr = getColumnAttr("Visible");
            const visible = visibleColumnAttr === undefined ? true : Boolean(visibleColumnAttr);

            return {
                index: i,
                columnInfo,
                caption,
                visible,
            };
        });
    }

    get blocks(): IBlockInfo[] {
        const viewAttrs = this.uv.attributes;
        // Relative block widths. [0..1]. Each block contains zero or more inputs.
        const blockWidths: number[] = viewAttrs["FormBlockWidths"] || [1];
        const blocks: IBlockInfo[] = blockWidths.map(width => ({ width: width * 0.95, fields: [] }));

        this.uv.info.columns.forEach((columnInfo, i) => {
            const columnAttrs = this.uv.columnAttributes[i];
            const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs);
            const field = this.fields[i];

            const blockAttr = Number(getColumnAttr("FormBlock"));
            const blockNumber = Number.isNaN(blockAttr) ? 0 : blockAttr;
            const block = Math.max(0, Math.min(blockNumber, blocks.length - 1));

            blocks[block].fields.push(field);
        });

        return blocks;
    }

    private init() {
        if (this.isRoot) {
            this.$emit("update:bodyStyle", `
                @media print {
                    @page {
                        size: portrait;
                    }
                }
            `);
        }
    }

    private created() {
        this.init();
    }

    private deleteRowAndSignal(ref: RowRef) {
        this.deleteRow(ref);
        this.deletedOne = true;
    }

    @Watch("uv")
    private uvChanged() {
        this.init();
    }

    @Watch("rowPositions")
    private returnIfEmpty() {
        if (this.isRoot && this.deletedOne && this.rowPositions.length === 0 && this.uv.newRowsPositions.length === 0 && this.previousQuery !== null) {
            this.$emit("goto", this.previousQuery);
        }
    }

    get rowPositions() {
        if (this.uv.rows === null) {
            return [];
        } else {
            return mapMaybe((row, rowI) => row.deleted ? undefined : rowI, this.uv.rows);
        }
    }
}
</script>

<style scoped>
    .view-form {
        padding: 0px !important;
        overflow-y: auto;
        overflow-x: hidden;
        height: 100%;
        width: 100vw;
    }
 
    @media screen and (max-aspect-ratio: 13/9) {
        @media screen and (max-device-width: 480px) {
            .view-form {
                overflow: auto !important;
            }
        }
    }
</style>
