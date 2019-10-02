<i18n>
    {
        "en": {
            "no_select_column": "Please identify selectable column using \"Select\" = True attribute on desired column."
        },
        "ru": {
            "no_select_column": "Пожалуйста, обозначьте колонку для выбора через аттрибут \"Select\" = True на желаемой колонке."
        }
    }
</i18n>

<template>
    <div fluid class="view-form">
        <MultiSelect
            v-if="selectedValueIndex"
            :options="options"
            :value="selectValues"
            :emptyValue="[]"
            :disabled="disabled"
            @update:value="onSelectChange"
        />
        <div v-if="!selectedValueIndex" style="color: red;">
            {{$t('no_select_column')}}
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import * as R from "ramda";
import { mixins } from "vue-class-component";
import { Store } from "vuex";
import { namespace } from "vuex-class";

import { RecordSet, tryDicts, mapMaybe } from "@/utils";
import { AttributesMap, IResultColumnInfo, IReferenceFieldType, IMainFieldInfo, IEntityRef } from "@/api";
import { CurrentEntries, CombinedUserView, ICombinedValue, IRowCommon, ICombinedRow, IAddedRow, homeSchema } from "@/state/user_view";
import { AddedRowId } from "@/state/staging_changes";
import { IQuery } from "@/state/query";
import LocalEmptyUserView from "@/components/LocalEmptyUserView";
import { UserView } from "@/components";
import BaseUserView, { ISelectionRef } from "@/components/BaseUserView";
import BaseEntriesView from "@/components/BaseEntriesView";
import FormEntry from "@/components/views/form/FormEntry.vue";
import MultiSelect from "@/components/multiselect/MultiSelect.vue";
import { IAction } from "@/components/ActionsMenu.vue";

const query = namespace("query");
const userView = namespace("userView");

const findSelectColumnIndex = (attrs: { [key: string]: any}) =>
    Number(Object.keys(attrs).filter(key => R.pathOr(false, [key, "Select"], attrs))[0]);

interface IValueDeltaExisting {
    type: "existing";
    position: number;
}

interface IValueDeltaAdded {
    type: "added";
    id: number;
}

type IValueDeltaStore = IValueDeltaExisting | IValueDeltaAdded;

interface IValueDeltaNew {
    ref: { column: number; type: "new"; };
    value: number;
}

interface IValueDelta {
    rowsToRemove: IValueDeltaStore[];
    rowsToAdd: IValueDeltaNew[];
}

const findValueDelta = (rows: ICombinedRow[], newRows: Record<number, IRowCommon>, value: any[], indexColumn: number): IValueDelta => {
    const valuesOld = rows.reduce((acc, row, index) => {
        return { ...acc, [row.values[indexColumn].value]: { type: "existing", position: index } };
    }, {});
    const valuesNew = Object.entries(newRows).reduce((acc, [rowId, row]) => {
        return { ...acc, [row.values[indexColumn].value]: { type: "added", id: Number(rowId) } };
    }, {});
    const storeValues = { ...valuesOld, ...valuesNew };
    const selectValues = value.reduce((acc, vl) => {
        return { ...acc, [vl]: { ref: { column: indexColumn, type: "new" }, value: vl } };
    }, {});

    const rowsToAdd: IValueDeltaNew[] = mapMaybe(([id, ref]) => {
        if (id in storeValues) {
            return undefined;
        }
        return ref;
    }, Object.entries(selectValues));
    const rowsToRemove: IValueDeltaStore[] = mapMaybe(([id, ref]) => {
        if (id in selectValues) {
            return undefined;
        }
        return ref;
    }, Object.entries(storeValues));
    return {
        rowsToAdd,
        rowsToRemove,
    };
};

@UserView({
    localConstructor: LocalEmptyUserView,
})
@Component({
    components: {
        MultiSelect,
    },
})
export default class UserViewForm extends mixins<BaseUserView<LocalEmptyUserView, null, null, null>, BaseEntriesView>(BaseUserView, BaseEntriesView) {
    @query.State("previous") previousQuery!: IQuery | null;

    @Prop({ type: Boolean, default: false }) isRoot!: boolean;

    private selectedValueIndex = findSelectColumnIndex(this.uv.columnAttributes);

    get entriesEntity() {
        const mainField = this.uv.info.columns[this.selectedValueIndex].mainField;
        if (mainField) {
            const fieldType = mainField.field.fieldType;
            if (fieldType.type === "reference") {
                return fieldType.entity;
            }
        }
        return null;
    }

    private onSelectChange(value: any[]) {
        if (this.uv.rows) {
            const delta = findValueDelta(this.uv.rows, this.uv.newRows, value, this.selectedValueIndex);
            delta.rowsToRemove.forEach(row => {
                this.deleteRow(row);
            });
            delta.rowsToAdd.forEach(row => {
                this.updateValue(row.ref, row.value);
            });
        }
    }

    private get selectValues() {
        const existingValues = this.uv.rows ? this.uv.rows.filter(row => !row.deleted)
                                   .map(row => row.values[this.selectedValueIndex].value) : [];
        const addedValues = Object.entries(this.uv.newRows)
                                  .map(([_, row]) => row.values[this.selectedValueIndex].value);
        return R.uniq([...existingValues, ...addedValues]);
    }

    private get options() {
        const entity = this.entriesEntity;
        if (entity) {
            const entries = this.entriesMap.getEntries(entity);
            if (entries) {
                return Object.entries(entries).map(([key, value]) => ({ value: Number(key), label: value }));
            }
        }
        return [];
    }

    private get disabled() {
        return !this.uv.info.mainEntity || this.addedLocked;
    }
}
</script>

<style scoped>
</style>
