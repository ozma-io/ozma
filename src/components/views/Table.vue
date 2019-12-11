<i18n>
    {
        "en": {
            "clear": "Clear",
            "yes": "Yes",
            "no": "No",
            "export_to_csv": "Export to .csv",
            "remove_selected_rows": "Remove selected rows",
            "show_new_row": "Add/remove new row"
        },
        "ru": {
            "clear": "Очистить",
            "yes": "Да",
            "no": "Нет",
            "export_to_csv": "Экспорт в .csv",
            "remove_selected_rows": "Удалить выбранные записи",
            "show_new_row": "Добавить/убрать новую строку"
        }
    }
</i18n>

<template>
    <div fluid
         :class="['table-block',
                  {'nested-table-block': !isRoot,
                  'active_editing': editingValue !== null}]">
        <div class="edit_container" v-if="editingValue !== null" :v-show="false">
            <div id="disable_edit"
                :class="{'edit_active': editingValue !== null}"
                @click="removeCellEditing()">
            </div>
            <div class="form_background">
                <b-row>
                    <b-col cols="12">
                        <FormControl :value="editingValue.value"
                                :attributes="editingValue.attributes"
                                :type="editingValue.type"
                                :locked="editingLocked"
                                :disableColor="editing.ref.type === 'new'"
                                :uvArgs="uv.args"
                                :indirectLinks="indirectLinks"
                                :scope="scope"
                                :level="level"
                                autofocus
                                dontFocus
                                @update="updateCurrentValue" />
                    </b-col>
                </b-row>
            </div>
        </div>

        <div ref="tableContainer" class="tabl" @scroll="updateShowLength()" @resize="updateShowLength()">
            <table :class="['custom-table', 'table', 'b-table',
                            {'edit_active': editingValue !== null}]">
                <colgroup>
                    <col :class="['checkbox-col', {'checkbox-cells': showFixedRow}]"> <!-- Checkbox column -->
                    <col v-if="local.extra.hasRowLinks" :class="['open-form-col', {'openform-cells': showFixedRow}]"> <!-- Row link column -->
                    <col v-for="i in columnIndexes" :key="i" class="data-col" :style="local.extra.columns[i].style">
                </colgroup>
                <thead class="table-head">
                    <tr>
                        <th class="fixed-column checkbox-cells table-th" @click="selectAllRows">
                            <span class="table-th_span">
                                <input type="checkbox" :checked="local.extra.selectedAll">
                            </span>
                        </th>
                        <th v-if="local.extra.hasRowLinks" class="fixed-column openform-cells links-style table-th">
                            <span class="table-th_span" @click="setShowEmptyRow(!showEmptyRow)" :title="this.$t('show_new_row')">
                                {{ showEmptyRow ? "-" : "+" }}
                            </span>
                        </th>
                        <th v-for="i in columnIndexes"
                                :key="i"
                                :class="['sorting', 'table-th', { 'fixed-column' : local.extra.columns[i].fixed }]"
                                :style="local.extra.columns[i].style"
                                :title="local.extra.columns[i].caption"
                                @click="updateSort(i)">
                            <span class="table_header__content">
                                {{ local.extra.columns[i].caption }}
                            </span>
                            <span v-if="sortColumn === i">{{ sortAsc ? "▲" : "▼" }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody class="table-body">
                    <template v-if="showEmptyRow">
                        <TableFixedRow v-if="showFixedRow"
                                :row="local.emptyRow.row"
                                :localRow="local.emptyRow.local"
                                :columnIndexes="fixedRowColumnIndexes"
                                :localUv="local.extra"
                                from="new"
                                :indirectLinks="indirectLinks"
                                @cellClick="clickCell({ type: 'new', column: arguments[0] }, arguments[1])"
                                @goto="$emit('goto', $event)" />
                        <TableRow
                                :row="local.emptyRow.row"
                                :localRow="local.emptyRow.local"
                                :columnIndexes="columnIndexes"
                                :localUv="local.extra"
                                :showFixedRow="showFixedRow"
                                from="new"
                                :indirectLinks="indirectLinks"
                                @cellClick="clickCell({ type: 'new', column: arguments[0] }, arguments[1])"
                                @goto="$emit('goto', $event)" />
                    </template>
                    <template v-for="(rowId, rowIndex) in uv.newRowsPositions">
                        <TableFixedRow v-if="showFixedRow"
                                :key="`fixed-new-${rowId}`"
                                :row="uv.newRows[rowId]"
                                :localRow="local.newRows[rowId]"
                                :columnIndexes="fixedRowColumnIndexes"
                                :localUv="local.extra"
                                from="added"
                                :indirectLinks="indirectLinks"
                                @select="selectRow({ type: 'added', position: rowIndex }, $event)"
                                @cellClick="clickCell({ type: 'added', id: rowId, column: arguments[0] }, arguments[1])"
                                @goto="$emit('goto', $event)" />
                        <TableRow :key="`new-${rowId}`"
                                :row="uv.newRows[rowId]"
                                :localRow="local.newRows[rowId]"
                                :columnIndexes="columnIndexes"
                                :localUv="local.extra"
                                :showFixedRow="showFixedRow"
                                from="added"
                                :indirectLinks="indirectLinks"
                                @select="selectRow({ type: 'added', position: rowIndex }, $event)"
                                @cellClick="clickCell({ type: 'added', id: rowId, column: arguments[0] }, arguments[1])"
                                @goto="$emit('goto', $event)" />
                    </template>
                    <template v-for="(rowI, rowIndex) in shownRowPositions">
                        <TableFixedRow v-if="showFixedRow"
                                :key="`fixed-${rowI}`"
                                :row="uv.rows[rowI]"
                                :localRow="local.rows[rowI]"
                                :columnIndexes="fixedRowColumnIndexes"
                                :localUv="local.extra"
                                :indirectLinks="indirectLinks"
                                @select="selectRow({ type: 'existing', position: rowIndex }, $event)"
                                @cellClick="clickCell({ type: 'existing', position: rowI, column: arguments[0] }, arguments[1])"
                                @goto="$emit('goto', $event)" />
                        <TableRow :key="rowI"
                                :row="uv.rows[rowI]"
                                :localRow="local.rows[rowI]"
                                :columnIndexes="columnIndexes"
                                :localUv="local.extra"
                                :showFixedRow="showFixedRow"
                                :indirectLinks="indirectLinks"
                                @select="selectRow({ type: 'existing', position: rowIndex }, $event)"
                                @cellClick="clickCell({ type: 'existing', position: rowI, column: arguments[0] }, arguments[1])"
                                @goto="$emit('goto', $event)" />
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { Location } from "vue-router";
import { namespace } from "vuex-class";
import { Store } from "vuex";

import { RecordSet, ObjectSet, tryDicts, mapMaybe, deepEquals, isIOS } from "@/utils";
import { valueIsNull } from "@/values";
import { IResultColumnInfo } from "@/api";
import {
    ICombinedValue, IRowCommon, ICombinedRow, IAddedRow, CombinedUserView, homeSchema, valueToPunnedText, currentValue,
} from "@/state/user_view";
import { UserView } from "@/components";
import { AutoSaveLock, AddedRowId } from "@/state/staging_changes";
import { IQuery, attrToQuerySelf, attrToQueryRef, IAttrToQueryOpts } from "@/state/query";
import { LocalUserView, ILocalRowInfo, ILocalRow, ValueRef, RowRef, RowPositionRef, equalRowPositionRef } from "@/local_user_view";
import { ISelectionRef } from "@/components/BaseUserView";
import BaseUserView from "@/components/BaseUserView";
import { IAction } from "@/components/ActionsMenu.vue";
import TableRow from "@/components/views/table/TableRow.vue";
import TableFixedRow from "@/components/views/table/TableFixedRow.vue";

interface ITableEditing {
    lock: AutoSaveLock;
    ref: ValueRef;
}

interface IColumn {
    caption: string;
    style: Record<string, any>;
    visible: boolean;
    fixed: boolean;
    mobileFixed: boolean;
    columnInfo: IResultColumnInfo;
    width: number; // in px
}

interface ITableValueExtra {
    valueText: string;
    link?: IQuery;
    style?: Record<string, any>;
    selected: boolean;
}

interface ITableRowExtra {
    searchText: string;
    selected: boolean;
    style?: Record<string, any>;
    height?: number;
    link?: IQuery;
    selectionEntry?: ISelectionRef;
}

interface ITableUserViewExtra {
    hasRowLinks: boolean;
    rowCount: number;
    selectedRows: ObjectSet<RowRef>;
    selectedValues: ObjectSet<ValueRef>;
    columns: IColumn[];
    fixedColumnPositions: Record<number, string>;
    linkOpts?: IAttrToQueryOpts;
}

type ITableLocalRowInfo = ILocalRowInfo<ITableRowExtra>;
type ITableLocalRow = ILocalRow<ITableValueExtra, ITableRowExtra>;

const showStep = 20;
const doubleClickTime = 700;
// FIXME: Use CSS variables to avoid this constant
const technicalFieldsWidth = 50; // checkbox's and openform's td width

const createColumns = (uv: CombinedUserView): IColumn[] => {
    const viewAttrs = uv.attributes;

    return uv.info.columns.map((columnInfo, i) => {
        const columnAttrs = uv.columnAttributes[i];
        const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs);

        const captionAttr = getColumnAttr("Caption");
        const caption = captionAttr !== undefined ? String(captionAttr) : columnInfo.name;

        const style: Record<string, any> = {};

        const columnWidthAttr = Number(getColumnAttr("ColumnWidth"));
        const columnWidth = Number.isNaN(columnWidthAttr) ? 200 : columnWidthAttr;
        style["width"] = `${columnWidth}px`;

        const fixedColumnAttr = getColumnAttr("Fixed");
        const fixedColumn = fixedColumnAttr === undefined ? false : Boolean(fixedColumnAttr);

        const fixedFieldAttr = getColumnAttr("MobileFixed");
        const fixedField = fixedFieldAttr === undefined ? false : Boolean(fixedFieldAttr);

        const visibleColumnAttr = getColumnAttr("Visible");
        const visibleColumn = visibleColumnAttr === undefined ? true : Boolean(visibleColumnAttr);

        return {
            caption, style,
            visible: visibleColumn,
            fixed: fixedColumn,
            mobileFixed: fixedField,
            columnInfo,
            attrs: columnAttrs,
            width: columnWidth,
        };
    });
};

export class LocalTableUserView extends LocalUserView<ITableValueExtra, ITableRowExtra, ITableUserViewExtra> {
    constructor(store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>, oldLocal: LocalUserView<ITableValueExtra, ITableRowExtra, ITableUserViewExtra> | null) {
        super(store, uv, defaultRawValues, oldLocal);
    }

    createCommonLocalValue(row: IRowCommon, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: ITableValueExtra | null, deleted: boolean): ITableValueExtra {
        const columnInfo = this.uv.info.columns[columnIndex];
        const columnAttrs = this.uv.columnAttributes[columnIndex];
        const getCellAttr = (name: string) => tryDicts(name, value.attributes, row.attributes, columnAttrs, this.uv.attributes);

        const valueText = valueToPunnedText(columnInfo.valueType, value);

        const style: Record<string, any> = {};
        let touchedStyle = false;

        const cellColor = getCellAttr("CellColor");
        if (cellColor !== undefined) {
            style["background-color"] = String(cellColor);
            touchedStyle = true;
        }

        if (localRow.extra.height !== undefined) {
            style["height"] = `${localRow.extra.height}px`;
            touchedStyle = true;
        }

        const fixedPosition = this.extra.fixedColumnPositions[columnIndex];
        if (fixedPosition !== undefined) {
            style["left"] = fixedPosition;
            touchedStyle = true;
        }

        const selected = oldLocal !== null ? oldLocal.selected && !deleted : false;

        const extra: ITableValueExtra = {
            selected,
            valueText,
        };
        if (touchedStyle) {
            extra.style = style;
        }
        return extra;
    }

    createLocalValue(rowIndex: number, row: ICombinedRow, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: ITableValueExtra | null) {
        const extra = this.createCommonLocalValue(row, localRow, columnIndex, value, oldLocal, row.deleted);

        const columnInfo = this.uv.info.columns[columnIndex];
        const columnAttrs = this.uv.columnAttributes[columnIndex];
        const getCellAttr = (name: string) => tryDicts(name, value.attributes, row.attributes, columnAttrs, this.uv.attributes);

        if (value.info !== undefined) {
            if (value.info.field !== null && value.info.field.fieldType.type === "reference") {
                const link = attrToQueryRef(getCellAttr("LinkedView"), currentValue(value), this.extra.linkOpts);
                if (link !== null) {
                    extra.link = link;
                }
            }
            const currLinkForRow = attrToQuerySelf(getCellAttr("RowLinkedView"), value.info, this.extra.linkOpts);
            if (currLinkForRow !== null) {
                localRow.extra.link = currLinkForRow;
                this.extra.hasRowLinks = true;
            }
        }

        if (getCellAttr("Selectable") && value.info !== undefined) {
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

        if (extra.selected) {
            this.extra.selectedValues.insert({
                type: "existing",
                position: rowIndex,
                column: columnIndex,
            });
        }
        return extra;
    }

    createAddedLocalValue(rowId: AddedRowId, row: IAddedRow, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: ITableValueExtra | null) {
        const extra = this.createCommonLocalValue(row, localRow, columnIndex, value, oldLocal, false);
        if (extra.selected) {
            this.extra.selectedValues.insert({
                type: "added",
                id: rowId,
                column: columnIndex,
            });
        }
        return extra;
    }

    createEmptyLocalValue(row: IRowCommon, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: ITableValueExtra | null) {
        const extra = this.createCommonLocalValue(row, localRow, columnIndex, value, oldLocal, false);
        if (extra.selected) {
            this.extra.selectedValues.insert({
                type: "new",
                column: columnIndex,
            });
        }
        return extra;
    }

    updateCommonValue(row: IRowCommon, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, extra: ITableValueExtra) {
        const columnInfo = this.uv.info.columns[columnIndex];

        extra.valueText = valueToPunnedText(columnInfo.valueType, value);
    }

    updateValue(rowIndex: number, row: ICombinedRow, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, localValue: ITableValueExtra) {
        this.updateCommonValue(row, localRow, columnIndex, value, localValue);
    }

    updateAddedValue(rowId: number, row: IAddedRow, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, localValue: ITableValueExtra) {
        this.updateCommonValue(row, localRow, columnIndex, value, localValue);
    }

    updateNewValue(columnIndex: number, value: ICombinedValue, localValue: ITableValueExtra) {
        this.updateCommonValue(this.emptyRow!.row, this.emptyRow!.local, columnIndex, value, localValue);
    }

    createCommonLocalRow(row: IRowCommon): ITableRowExtra {
        const getRowAttr = (name: string) => tryDicts(name, row.attributes, this.uv.attributes);

        const extra: ITableRowExtra = {
            selected: false,
            searchText: "",
        };

        const style: Record<string, any> = {};
        let touchedStyle = false;

        const height = Number(getRowAttr("RowHeight"));
        if (!Number.isNaN(height)) {
            style["white-space"] = "nowrap";
            extra.height = height;
            touchedStyle = true;
        }

        if (touchedStyle) {
            extra.style = style;
        }

        return extra;
    }

    createLocalRow(rowIndex: number, row: ICombinedRow) {
        const extra = this.createCommonLocalRow(row);
        if (row.mainId !== undefined) {
            extra.selectionEntry = {
                entity: this.uv.info.mainEntity!,
                id: row.mainId,
            };
        }

        this.extra.rowCount++;

        return extra;
    }

    createAddedLocalRow(rowId: AddedRowId, row: IAddedRow) {
        this.extra.rowCount++;

        return this.createCommonLocalRow(row);
    }

    createEmptyLocalRow(row: IRowCommon) {
        return this.createCommonLocalRow(row);
    }

    postInitCommonRow(row: IRowCommon, localRow: ITableLocalRow) {
        const searchStrings = localRow.values.map(extra => {
            return extra.valueText.toLocaleLowerCase();
        });
        localRow.extra.searchText = "\0".concat(...searchStrings);
    }

    postInitRow(rowIndex: number, row: ICombinedRow, localRow: ITableLocalRow) {
        this.postInitCommonRow(row, localRow);
        if (row.deleted) {
            this.extra.rowCount--;
        }
    }

    postInitAddedRow(rowId: AddedRowId, row: IAddedRow, localRow: ITableLocalRow) {
        this.postInitCommonRow(row, localRow);
    }

    deleteCommonRow(row: ICombinedRow, localRow: ITableLocalRowInfo) {
        this.extra.rowCount--;
    }

    deleteRow(rowIndex: number, row: ICombinedRow, localRow: ITableLocalRowInfo) {
        this.deleteCommonRow(row, localRow);
        if (localRow.extra.selected) {
            localRow.extra.selected = false;
            this.extra.selectedRows.delete({
                type: "existing",
                position: rowIndex,
            });
        }
    }

    deleteAddedRow(rowId: AddedRowId, row: ICombinedRow, localRow: ITableLocalRowInfo) {
        this.deleteCommonRow(row, localRow);
        if (localRow.extra.selected) {
            this.extra.selectedRows.delete({
                type: "added",
                id: rowId,
            });
        }
    }

    undeleteRow(rowIndex: number, row: ICombinedRow, localRow: ITableLocalRowInfo) {
        this.extra.rowCount++;
    }

    createLocalUserView(): ITableUserViewExtra {
        const columns = createColumns(this.uv);
        const extra: ITableUserViewExtra = {
            hasRowLinks: false,
            rowCount: 0,
            selectedRows: new ObjectSet<RowRef>(),
            selectedValues: new ObjectSet<ValueRef>(),
            columns,
            fixedColumnPositions: {},
        };
        const home = homeSchema(this.uv.args);
        if (home !== null) {
            extra.linkOpts = { homeSchema: home };
        }
        return extra;
    }

    postInitUserView() {
        this.extra.fixedColumnPositions = this.fixedColumnPositions(this.extra.columns);
        Object.entries(this.extra.fixedColumnPositions).forEach(([colIRaw, position]) => {
            const colI = Number(colIRaw);
            this.extra.columns[colI].style["left"] = position;

            this.forEachLocalRow(row => {
                const value = row.values[colI];
                let style = value.style;
                if (style === undefined) {
                    style = {};
                    value.style = style;
                }
                style["left"] = position;
            });
        });
    }

    selectCell(ref: ValueRef, selectedStatus: boolean) {
        const cell = this.getValueByRef(ref);
        if (cell === null) {
            return;
        }
        if (cell.local.selected !== selectedStatus) {
            cell.local.selected = selectedStatus;
            if (selectedStatus) {
                this.extra.selectedValues.insert(ref);
            } else {
                this.extra.selectedValues.delete(ref);
            }
        }
    }

    selectRow(ref: RowRef, selectedStatus: boolean) {
        const row = this.getRowByRef(ref);
        if (row === null) {
            return;
        }
        if (row.local.extra.selected !== selectedStatus) {
            row.local.extra.selected = selectedStatus;
            if (selectedStatus) {
                this.extra.selectedRows.insert(ref);
            } else {
                this.extra.selectedRows.delete(ref);
            }
        }
    }

    selectAll(selectedStatus: boolean) {
        Object.entries(this.newRows).forEach(([rowIdRaw, row]) => {
            const rowId = Number(rowIdRaw);
            row.extra.selected = selectedStatus;
            if (selectedStatus) {
                this.extra.selectedRows.insert({
                    type: "added",
                    id: rowId,
                });
            }
        });
        if (this.uv.rows !== null) {
            this.rows.forEach((localRow, rowI) => {
                const row = (this.uv.rows as ICombinedRow[])[rowI];
                if (!row.deleted) {
                    localRow.extra.selected = selectedStatus;
                    if (selectedStatus) {
                        this.extra.selectedRows.insert({
                            type: "existing",
                            position: rowI,
                        });
                    }
                }
            });
        }

        if (!selectedStatus) {
            this.extra.selectedRows = new ObjectSet<RowRef>();
        }
    }

    get selectedCount() {
        return this.extra.selectedRows.length;
    }

    get selectedAll() {
        return this.selectedCount === this.extra.rowCount;
    }

    get technicalWidth() {
        let left = technicalFieldsWidth;
        if (this.extra.hasRowLinks) {
            left += technicalFieldsWidth;
        }
        return left;
    }

    private fixedColumnPositions(columns: IColumn[]): Record<number, string> {
        let left = this.technicalWidth;
        const fixedColumnIndexes = mapMaybe((col, colI) => col.fixed ? colI : undefined, columns);
        const positions: Record<number, string> = {};
        for (const fixedColumnIndex of fixedColumnIndexes) {
            positions[fixedColumnIndex] = `${left}px`;
            left += columns[fixedColumnIndex].width;
        }
        return positions;
    }
}

const ordRowPositionRef = (a: RowPositionRef, b: RowPositionRef) => {
    if (a.type !== b.type) {
        if (a.type === "new") {
            return -1;
        } else if (a.type === "added" && b.type !== "new") {
            return -1;
        } else {
            return 1;
        }
    } else {
        if (a.type === "new") {
            return 0;
        } else {
            return Math.sign(a.position - (b as any).position);
        }
    }
};

const rowContains = (row: ITableLocalRow, searchWords: string[]) => {
    return searchWords.every(word => row.extra.searchText.includes(word));
};

const rowIndicesCompare = (aIndex: number, bIndex: number, entries: IRowCommon[], sortColumn: number, collator: Intl.Collator) => {
    const a = entries[aIndex];
    const b = entries[bIndex];
    return collator.compare(a.values[sortColumn].value,
                            b.values[sortColumn].value);
};

const getCsvString = (str: string): string => {
    let csvstr = str.replace(/"/g, '""');
    if (csvstr.search(/("|;|\n)/g) > 0) {
        csvstr = "\"" + csvstr + "\"";
    }
    csvstr += ";";
    return csvstr;
};

const isEmptyRow = (row: IRowCommon) => {
    return row.values.every(cell => valueIsNull(cell.rawValue) || cell.info === null);
};

const staging = namespace("staging");

@UserView({
    localConstructor: LocalTableUserView,
})
@Component({
    components: {
        TableRow, TableFixedRow,
    },
})
export default class UserViewTable extends mixins<BaseUserView<LocalTableUserView, ITableValueExtra, ITableRowExtra, ITableUserViewExtra>>(BaseUserView) {
    @staging.Action("addAutoSaveLock") addAutoSaveLock!: () => Promise<AutoSaveLock>;
    @staging.Action("removeAutoSaveLock") removeAutoSaveLock!: (id: AutoSaveLock) => Promise<void>;

    private currentFilter: string[] = [];
    private sortColumn: number | null = null;
    private sortAsc: boolean = true;
    private sortOptions: Intl.CollatorOptions = {};
    private rowPositions: number[] = [];
    private showLength: number = 0;
    // XXX: this has positions relative to current sorting and filtering. It needs to be converted to a global position ref using `getRowByLocalPosition`.
    private lastSelectedRow: RowPositionRef | null = null;
    private lastSelectedValue: ValueRef | null = null;
    private editing: ITableEditing | null = null;
    private printListener: { query: MediaQueryList, queryCallback: (mql: MediaQueryListEvent) => void, printCallback: () => void } | null = null;
    private clickTimeoutId: NodeJS.Timeout | null = null;
    private showEmptyRow: boolean = false;
    private emptyLocalRow: ITableLocalRow | null = null;

    get columnIndexes() {
        const columns = this.local.extra.columns.map((column, index) => ({ index, fixed: column.fixed, visible: column.visible })).filter(c => c.visible);
        const fixed = columns.filter(c => c.fixed);
        const nonFixed = columns.filter(c => !c.fixed);
        return fixed.concat(nonFixed).map(c => c.index);
    }

    get fixedColumnIndexes() {
        return mapMaybe((col, colI) => col.fixed ? colI : undefined, this.local.extra.columns);
    }

    get fixedRowColumnIndexes() {
        return mapMaybe((col, colI) => col.mobileFixed ? colI : undefined, this.local.extra.columns);
    }

    get editingLocked() {
        if (this.editing === null) {
            return false;
        } else {
            return this.editing.ref.type !== "existing" && this.addedLocked;
        }
    }

    get editingValue() {
        if (this.editing === null) {
            return null;
        } else {
            const value = this.local.getValueByRef(this.editing.ref);
            if (value === null) {
                return null;
            } else {
                const columnInfo = this.uv.info.columns[this.editing.ref.column];
                const columnAttrs = this.uv.columnAttributes[this.editing.ref.column];
                const type = columnInfo.valueType;
                const attributes = { ...this.uv.attributes, ...columnAttrs, ...value.row.row.attributes, ...value.value.attributes };
                return {
                    value: value.value,
                    attributes,
                    type,
                };
            }
        }
    }

    protected created() {
        this.init();

        if (this.isRoot) {
            const queryCallback = (mql: MediaQueryListEvent) => {
                if (mql.matches) {
                    this.showLength = this.local.rows.length;
                }
            };
            const query = window.matchMedia("print");
            query.addListener(queryCallback);
            const printCallback = () => {
                this.showLength = this.local.rows.length;
            };
            window.addEventListener("beforeprint", printCallback);
            this.printListener = { query, queryCallback, printCallback };
        }
    }

    @Watch("uv", { deep: true })
    protected uvChanged() {
        this.init();
        this.updateShowLength();
    }

    protected mounted() {
        this.updateShowLength();
    }

    protected destroyed() {
        if (this.printListener !== null) {
            window.removeEventListener("beforeprint", this.printListener.printCallback);
            this.printListener.query.removeListener(this.printListener.queryCallback);
        }
        if (this.clickTimeoutId !== null) {
            clearTimeout(this.clickTimeoutId);
        }
    }

    @Watch("filter")
    protected updateFilter() {
        const oldFilter = this.currentFilter;
        const currentFilter = this.filter;
        this.currentFilter = currentFilter;

        // Check if current filter contained this one
        const contained = oldFilter.every(oldWord => currentFilter.some(newWord => newWord.startsWith(oldWord)));

        if (!contained) {
            this.buildRowPositions();
        } else {
            // Filter existing rows when we filter a subset of already filtered ones.
            const newWords = currentFilter.filter(newWord => !oldFilter.some(oldWord => oldWord.startsWith(newWord)));
            this.rowPositions = this.rowPositions.filter(rowI => rowContains(this.local.rows[rowI], newWords));
        }
    }

    @Watch("editingValue")
    protected removeEditingIfInvalid() {
        if (this.editingValue === null) {
            this.removeCellEditing();
        }
    }

    private setShowEmptyRow(newValue: boolean) {
        const emptyRow = this.local.emptyRow;
        if (emptyRow !== null) {
            this.showEmptyRow = newValue;
            if (!newValue) {
                this.local.selectRow({ type: "new" }, false);
                emptyRow.local.values.forEach((_, colI) => {
                    this.local.selectCell({ type: "new", column: colI }, false);
                });
            }
        }
    }

    // Update this.rows from this.entries
    private buildRowPositions() {
        const rows = this.uv.rows;

        if (rows === null) {
            this.rowPositions = [];
        } else {
            this.rowPositions = rows.map((row, rowI) => rowI);
            if (this.filter.length !== 0) {
                this.rowPositions = this.rowPositions.filter(rowI => rowContains(this.local.rows[rowI], this.filter));
            }

            this.sortRows();
            this.updateShowLength();
        }
    }

    private export2csv() {
        let data: string = "";
        for (const col of this.local.extra.columns) {
            data += getCsvString(col.caption);
        }
        data += "\n";
        for (const rowId of this.uv.newRowsPositions) {
            const row = this.local.newRows[rowId];
            for (const extra of row.values) {
                data += getCsvString(extra.valueText);
            }
            data += "\n";
        }
        for (const row of this.local.rows) {
            for (const extra of row.values) {
                data += getCsvString(extra.valueText);
            }
            data += "\n";
        }

        const element = document.createElement("a");
        element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + data));
        element.setAttribute("download", `${this.uv.name}.csv`);
        element.style.display = "none";

        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    private removeCellEditing() {
        if (this.editing === null) {
            return;
        }

        this.removeAutoSaveLock(this.editing.lock);
        this.editing = null;
    }

    // Value is not actually required to be editable - it can be opened in read-only mode too.
    private setCellEditing(ref: ValueRef) {
        this.removeCellEditing();

        this.addAutoSaveLock().then(lock => {
            const value = this.local.getValueByRef(ref);

            if (this.editing !== null // Lock already taken (somehow)
                    || value === null // value not found
                    ) {
                this.removeAutoSaveLock(lock);
                return;
            }

            this.editing = { ref, lock };
        });
    }

    private clickCell(ref: ValueRef, event: MouseEvent) {
        this.selectCell(ref);
        if (this.lastSelectedValue !== null &&
                !deepEquals(this.lastSelectedValue, ref) &&
                this.lastSelectedValue.type === "added") {
            const row = this.uv.newRows[this.lastSelectedValue.id];
            if (row === undefined) {
                this.lastSelectedValue = null;
            } else if (isEmptyRow(row)) {
                const entity = this.uv.info.mainEntity;
                if (entity === null) {
                    throw new Error("View doesn't have a main entity");
                }

                this.resetAddedEntry({
                    schema: entity.schema,
                    entity: entity.name,
                    userView: this.uv.userViewKey,
                    id: this.lastSelectedValue.id,
                });
            }
        }

        // this.selectCell() breaks the timer for double click in iOS,
        // so when we're running iOS we don't check for double click
        if (!isIOS()) {
            if (this.clickTimeoutId === null) {
                this.clickTimeoutId = setTimeout(() => {
                    this.clickTimeoutId = null;
                }, doubleClickTime);
                if (this.lastSelectedValue !== null && !deepEquals(this.lastSelectedValue, ref)) {
                    this.removeCellEditing();
                }
            } else {
                clearTimeout(this.clickTimeoutId);
                this.clickTimeoutId = null;
                if (this.lastSelectedValue !== null && deepEquals(this.lastSelectedValue, ref)) {
                    this.setCellEditing(ref);
                }
            }
        } else {
            if (this.lastSelectedValue !== null && !deepEquals(this.lastSelectedValue, ref)) {
                this.removeCellEditing();
            }
            if (this.lastSelectedValue !== null && deepEquals(this.lastSelectedValue, ref)) {
                this.setCellEditing(ref);
            }
        }
    }

    private selectCell(ref: ValueRef) {
        this.local.extra.selectedValues.keys().forEach(prevRef => {
            this.local.selectCell(prevRef, false);
        });
        this.local.selectCell(ref, true);
        this.lastSelectedValue = ref;
    }

    @Watch("rowPositions")
    private clearSelectedRow() {
        this.lastSelectedRow = null;
    }

    private nextLocalRowPosition(rowRef: RowPositionRef): RowPositionRef | null {
        let type: string;
        let position: number;
        if (rowRef.type === "new") {
            type = "added";
            position = 0;
        } else {
            type = rowRef.type;
            position = rowRef.position + 1;
        }

        if (type === "added") {
            if (position < this.uv.newRowsPositions.length) {
                return {
                    type, position,
                };
            } else {
                type = "existing";
                position = 0;
            }
        }

        if (type === "existing") {
            if (position < this.rowPositions.length) {
                return {
                    type, position,
                };
            }
        }

        return null;
    }

    private getRowByLocalPosition(rowRef: RowPositionRef): RowRef | null {
        if (rowRef.type === "existing") {
            return this.local.getRowByPosition({ type: "existing", position: this.rowPositions[rowRef.position] });
        } else {
            return this.local.getRowByPosition(rowRef);
        }
    }

    private selectRow(posRef: RowPositionRef, event: MouseEvent) {
        const ref = this.getRowByLocalPosition(posRef);
        if (ref === null) {
            return;
        }
        const row = this.local.getRowByRef(ref);
        if (row === null) {
            return;
        }

        // If we are in a selection mode, just emit selected row.
        if (this.selectionMode && posRef.type === "existing" && row.local.extra.selectionEntry !== undefined) {
            this.$emit("select", row.local.extra.selectionEntry);
            return;
        }

        const proc = () => {
            const prevLocalRef = this.lastSelectedRow!;
            // Select all rows between current one and the previous selected one.
            const prevRef = this.getRowByLocalPosition(prevLocalRef);
            if (prevRef === null) {
                return false;
            }
            const prevRow = this.local.getRowByRef(prevRef);
            if (prevRow === null) {
                return false;
            }
            const [from, to] = ordRowPositionRef(prevLocalRef, posRef) <= 0 ? [prevLocalRef, posRef] : [posRef, prevLocalRef];
            let i: RowPositionRef | null = from;
            while (i !== null && !equalRowPositionRef(i, to)) {
                const currRef = this.getRowByLocalPosition(i);
                if (currRef === null) {
                    throw new Error("impossible");
                }
                this.local.selectRow(currRef, prevRow.local.extra.selected);
                i = this.nextLocalRowPosition(i);
            }
            this.local.selectRow(this.getRowByLocalPosition(to)!, prevRow.local.extra.selected);
            return true;
        };

        if (!(this.lastSelectedRow !== null && event.shiftKey && proc())) {
            this.local.selectRow(ref, !row.local.extra.selected);
        }

        this.lastSelectedRow = posRef;
    }

    private selectAllRows() {
        this.local.selectAll(!this.local.selectedAll);
    }

    private removeSelectedRows() {
        const entity = this.uv.info.mainEntity;
        if (entity === null || this.uv.rows === null) {
            throw new Error("View doesn't have a main entity");
        }

        this.local.extra.selectedRows.keys().forEach(rowRef => this.deleteRow(rowRef));
    }

    private init() {
        if (this.isRoot) {
            this.$emit("update:bodyStyle", `
                @media print {
                    @page {
                        size: landscape;
                    }
                }
            `);
        }

        const actions: IAction[] = [
            { name: this.$t("export_to_csv").toString(), callback: () => this.export2csv() },
        ];
        if (this.uv.info.mainEntity !== null) {
            actions.push(
                { name: this.$t("remove_selected_rows").toString(), callback: () => this.removeSelectedRows() },
                { name: this.$t("show_new_row").toString(), callback: () => this.setShowEmptyRow(true) },
            );
        }

        this.$emit("update:actions", actions);
        this.$emit("update:enableFilter", this.uv.rows !== null);

        this.buildRowPositions();
        this.updateFilter();
        this.setShowEmptyRow(this.uv.rows === null || this.uv.rows.length === 0);
    }

    /*
        first sort
        bool:   descending
        number: descending
        string: ascending
    */
    private updateSort(sortColumn: number) {
        if (this.sortColumn !== sortColumn) {
            const type = this.local.extra.columns[sortColumn].columnInfo.valueType.type;
            this.sortColumn = sortColumn;

            switch (type) {
                case "int":
                    this.sortOptions = { numeric: true };
                    this.sortAsc = false;
                    break;
                case "bool":
                    this.sortAsc = false;
                    this.sortOptions = {};
                    break;
                case "string":
                    this.sortAsc = true;
                    this.sortOptions = { sensitivity: "accent" };
                    break;
                default:
                    this.sortAsc = true;
                    this.sortOptions = {};
            }
        } else {
            this.sortAsc = !this.sortAsc;
        }

        this.sortRows(this.sortOptions);
    }

    private sortRows(options?: Intl.CollatorOptions) {
        const rows = this.uv.rows!;

        if (this.sortColumn !== null) {
            const sortColumn = this.sortColumn;
            const collator = new Intl.Collator(["en", "ru"], options);
            const sortFunction: (a: number, b: number) => number =
                this.sortAsc ?
                    (a, b) => rowIndicesCompare(a, b, rows, sortColumn, collator) :
                    (a, b) => rowIndicesCompare(b, a, rows, sortColumn, collator);
            this.rowPositions.sort(sortFunction);
        }
    }

    private updateShowLength() {
        const tableContainer = this.$refs.tableContainer as Element | undefined;
        // Component may still be unmounted
        if (tableContainer === undefined) {
            return;
        }
        // + 1 is needed because of rare cases like that:
        // top 974.4000244140625, client height 690, scroll height 1665
        if (tableContainer.scrollTop + tableContainer.clientHeight + 1 >= tableContainer.scrollHeight && this.showLength < this.rowPositions.length) {
            this.showLength = Math.min(this.showLength + showStep, this.local.rows.length);
            Vue.nextTick(() => this.updateShowLength());
        }
    }

    get nonDeletedRowPositions() {
        const rows = this.uv.rows;
        if (rows === null) {
            return [];
        } else {
            return this.rowPositions.filter(rowI => !rows[rowI].deleted);
        }
    }

    get statusLine() {
        const selectedCount = this.local.selectedCount;
        const selected = (selectedCount > 0) ? `${selectedCount}/` : "";
        return `${selected}${this.uv.newRowsPositions.length + this.nonDeletedRowPositions.length}`;
    }

    @Watch("statusLine")
    private updateStatusLine() {
        this.$emit("update:statusLine", this.statusLine);
    }

    get shownRowPositions() {
        return this.nonDeletedRowPositions.slice(0, this.showLength);
    }

    get technicalWidth() {
        let left = technicalFieldsWidth;
        if (this.local.extra.hasRowLinks) {
            left += technicalFieldsWidth;
        }
        return left;
    }

    get showFixedRow() {
        let tableWidth = this.technicalWidth;
        for (const column of this.local.extra.columns) {
            tableWidth += column.width;
        }
        return tableWidth > screen.width && this.fixedRowColumnIndexes.length > 0;
    }

    private async updateCurrentValue(rawValue: any) {
        const editing = this.editing!;
        const ref = editing.ref;
        const newRef = await this.updateValue(ref, rawValue);
        if (ref.type === "new") {
            editing.ref = newRef;
            this.selectCell(newRef);
        }
    }
}
</script>

<style scoped>
/* Current Z layout:

* Form control          (2000)
* Disable-edit block    (500) 
* Table head            (20)
* FixedColumn           (25)

*/
    .table-block {
        width: 100%;
        margin: 0px;
        position: relative;
        height: 100%;
    }
    .active_editing {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .checkbox-col, .open-form-col{
        width: 20px;
    }
    .data-col {
        max-width: 100vw !important;
    }
    .form_background {
        padding: 50px;
        box-sizing: border-box;
        box-shadow: 0px 0px 10px 5px var(--MainBorderColor);
        background: var(--MainBackgroundColor);
        width: 40%;
    }

    .edit_container {
        width: 100vw;
        height: 100vh;
        z-index: 10000;
        position: fixed;
        top: calc(1.5em + 6px);
        left: 0;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    /* блок для отключения редактирования в таблице */
    #disable_edit {
        position: fixed;
        top: calc(1.5em + 6px);
        left: 0;
    }
    #disable_edit.edit_active {
        width: 100vw;
        height: 100vh;
    }
    /* таблица поверх блока отключения редактирования */
    table.edit_active {
        position: relative;
        z-index: 1000
    }
    /deep/ tr:hover > td {
        background-color: var(--MainBorderColor);
    }
    .tabl {
        float: left;
        margin-bottom: 10px;
        height: 100%;
        width: 100%; /*на весь экран*/
        padding: 0;
        overflow: auto; /*чтобы скролить таблицу в том числе на мобилке*/
    }
    .custom-table {
        table-layout: fixed;
        width: 0px;
        border: 0;
        background-color: var(--TableBackColor);
        margin-bottom: 0px !important;
    }
    .table-head {
        height: 50px;
    }
    .table-th {
        border: 0;
        font-weight: bold;
        max-width: 50px !important;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        position: sticky; /*фиксация шапки при скроле*/
        z-index: 20; /*при скроле таблицы чтобы шапка была видна*/
        top: 0;
        font-size: 1.1.rem;
        cursor: pointer;
        color: var(--MainTextColor);
        background-color: var(--MainBackgroundColor);
    }
    /deep/ td > p {
        margin-bottom: 0px;
    }
    th.fixed-column {
        z-index: 25; /* поверх обычных столбцов */
        box-shadow: 2px 0 0px var(--MainBorderColor);
    }
    th.tabl_heading {
        text-overflow: ellipsis;
        vertical-align: top;
    }
    th.links-style {
        text-align: center;
        cursor: pointer;
        padding: 0;
    }
    .table-th_span {
        padding: 0;
        height: 100%;
        width: 100%;
        white-space: nowrap;
        display: inline-flex;
        justify-content: center;
        align-items: center;
    }


    @media screen and (max-aspect-ratio: 13/9) {
        @media screen and (max-device-width: 480px) {
            .nested-table-block {
                width: max-content !important;
                position: sticky;
                float: right;
                right: 0;
            }

            /* This is a potential hack. Here's to hoping it would go away soon. */
            .nested-table-block > .tabl {
                width: 90vw !important;
            }
        }
    }

    @media screen and (max-device-width: 650px) {
        .tabl{
            flex: 1;
            height: none;
            margin-bottom:0;
        }
        .table-block {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .active_editing {
            position: sticky !important;
            justify-content: flex-start;
            z-index: 100000; /* чтобы FormControl был поверх других таблиц, когда их несколько на странице*/
        }
        .form_background {
            width: 80%;
        }
    }

    @media screen and (max-device-width: 768px), screen and (orientation: portrait) {
        .fixed-column {
            left: auto !important;
        }
    }
	
    @media screen and (min-device-width: 813px) and (orientation: landscape) {
        .checkbox-cells {
            left: 0px;
        }
        .openform-cells {
            left: 20px;
        }
        .fixed-column {
            position: sticky;
            z-index: 20;
            border-left: 0;
        }
    }

    @-moz-document url-prefix() {
        .fixed-column {
            outline: solid 1px var(--MainBorderColor)
        }
    }

    @media print {
        .tabl {
            height: 100%;
            float: none !important; /*при печати для правильной масштабируемости*/
            overflow: visible !important; /*чтобы при печати была возможность видеть таблицу*/
        }

        @-moz-document url-prefix() { /*стили в лисе исправляем баги с отображением границ таблицы*/
            .custom-table {
                border-collapse: separate !important;
                border-right: solid 1px var(--NavigationBackColor);
            }
        }

        .custom-table {
            max-width: 100% !important;
            page-break-inside: auto;
            border-spacing: 0;
        }

        th {
            border: solid 1px var(--NavigationBackColor);
        }

        td {
            border: solid 1px var(--NavigationBackColor);
        }
        td >>> a {
            text-decoration: none !important;
        }
    }

    /* FormControl */
    div.form-control-panel {
        position: fixed;
        z-index: 2000; /* FormControl поверх таблицы */
        background-color: var(--MenuColor);
        display: block;
        align-items: center;
        padding: 20px;
    }
    @media screen and (max-device-width: 480px){
        .edit_container {
            align-items: flex-start;
        }
        div.form-control-panel {
            margin-top: 15%;
        }
        div.form-control-panel > div.select-container {
            width: calc(100vw - 44px) !important;
            /*padding 20px and left 2px*/
        }

        div.form-control-panel > div.select-container > select.form-control-panel_select {
            width: 100%;
        }
        div.form-control-panel > div.select-container:after {
            position: relative;
            left: 0px;
        }
    }
    div.form-control-panel > div.select-container {
        width: 300px
    }
    div.form-control-panel > pre {
        min-width: 600px;
        height: 200px !important;
        margin-bottom: 0px;
    }
 .checkbox-cells, .openform-cells {
     height: 50px;
     width: 50px;
     padding: 0 !important;
 }
 .openform-cells > .table-th_span,
 .checkbox-cells > .table-th_span {
     justify-content: unset;
     padding-left: 0.75rem;
 }
 th {
     padding: 0.5rem;
 }
 .checkbox-col, .open-form-col {
     width: 50px;
 }
 /deep/ .openform-cells {
     left: 50px;
 }
 thead {
     line-height: 50px;
 }
 .table_header__content {
     display: inline-flex;
     justify-items: center;
     alignt-content: center;
 }
</style>
