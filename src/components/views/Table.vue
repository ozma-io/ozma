<i18n>
    {
      "en": {
        "clear": "Clear entries",
        "yes": "Yes",
        "no": "No",
        "add_entry": "Add entry",
        "remove_selected_rows": "Remove selected entries",
        "add_entry_in_modal": "Add new entry (in modal)"
      },
      "ru": {
        "clear": "Очистить записи",
        "yes": "Да",
        "no": "Нет",
        "add_entry": "Добавить запись",
        "remove_selected_rows": "Удалить выбранные записи",
        "add_entry_in_modal": "Добавить новую запись (в модале)"
      }
    }
</i18n>

<template>
  <div
    fluid
    :class="['table-block', {'nested-table-block': !isRoot, 'active_editing': editingValue !== null}]"
  >
    <table-cell-edit
      v-if="editingValue"
      v-click-outside="clickOutsideEdit"
      :width="editParams.width"
      :min-height="editParams.minHeight"
      :is-last-fixed-cell="isSelectedLastFixedCell"
      :coords="editCoords"
    >
      <FormControl
        :value="editingValue.value"
        :attributes="editingValue.attributes"
        :type="editingValue.type"
        :locked="editingLocked"
        :disable-color="editing.ref.type === 'new'"
        :uv-args="uv.args"
        :scope="scope"
        :level="level"
        is-cell-edit
        autofocus
        modal-only
        @set-input-height="setInputHeight"
        @update="updateCurrentValue"
        @close-modal-input="clickOutsideEdit"
      />
    </table-cell-edit>

    <div
      ref="tableContainer"
      class="tabl"
      @scroll="updateShowLength()"
      @resize="updateShowLength()"
    >
      <div
        v-if="local.emptyRow !== null"
        class="button-container top"
      >
        <div
          class="button"
          @click="addNewRowOnPosition('top')"
        >
          <i class="material-icons">add</i>
          <span class="label">{{ this.$t('add_entry').toString() }}</span>
        </div>
      </div>

      <table
        :class="['custom-table', 'table', 'b-table',
                 {'edit_active': editingValue !== null}]"
      >
        <colgroup>
          <col class="checkbox-col"> <!-- Checkbox column -->
          <col
            v-if="local.extra.hasRowLinks"
            class="open-form-col"
          >
          <!-- Row link column -->
          <col
            v-for="i in columnIndexes"
            :key="i"
            class="data-col"
            :style="local.extra.columns[i].style"
          >
        </colgroup>
        <thead
          class="table-head"
        >
          <tr>
            <th
              class="fixed-column checkbox-cells table-th"
              @click="selectAllRows"
            >
              <checkbox :checked="baseLocal.selectedAll" />
            </th>
            <th
              v-if="local.extra.hasRowLinks"
              class="fixed-column openform-cells table-th"
            >
              <FunLink
                v-if="creationLink !== null"
                :link="creationLink"
                @goto="$emit('goto', $event)"
              >
                <i
                  v-b-tooltip.hover.right
                  :title="$t('add_entry_in_modal')"
                  class="material-icons openform-add-icon"
                >add_box</i>
              </FunLink>
            </th>
            <th
              v-for="(i, index) in columnIndexes"
              :key="i"
              :class="['sorting', 'table-th', {
                'fixed-column' : local.extra.columns[i].fixed,
                'th_after-last-fixed': lastFixedColumnIndex === index,
                'td-moz': isFirefoxBrowser
              }]"
              :style="local.extra.columns[i].style"
              :title="local.extra.columns[i].caption"
              @click="updateSort(i)"
            >
              <span class="table_header__content">
                {{ local.extra.columns[i].caption }}
              </span>
              <span v-if="sortColumn === i">{{ sortAsc ? "▲" : "▼" }}</span>
            </th>
          </tr>
        </thead>
        <tbody class="table-body">
          <TableRow
            v-for="(rowId, rowIndex) in local.extra.newRowTopSidePositions"
            ref="newRowsTopSideRef"
            :key="`top-${rowId}`"
            :row="uv.newRows[rowId]"
            :local-row="local.newRows[rowId]"
            :base-local-row="baseLocal.newRows[rowId]"
            :column-indexes="columnIndexes"
            :local-uv="local.extra"
            from="added"
            @select="selectRow({ type: 'added', position: rowIndex }, $event)"
            @cell-click="clickCell({ type: 'added', id: rowId, column: arguments[0] }, arguments[1])"
            @goto="$emit('goto', $event)"
          />
          <TableRow
            v-for="(rowI, rowIndex) in shownRowPositions"
            :key="rowI"
            :row="uv.rows[rowI]"
            :local-row="local.rows[rowI]"
            :base-local-row="baseLocal.rows[rowI]"
            :column-indexes="columnIndexes"
            :local-uv="local.extra"
            :is-tree="isTree"
            @select="selectRow({ type: 'existing', position: rowIndex }, $event)"
            @cell-click="clickCell({ type: 'existing', position: rowI, column: arguments[0] }, arguments[1])"
            @update:visibleChildren="visibleChildren(arguments[0], arguments[1])"
            @goto="$emit('goto', $event)"
          />
          <TableRow
            v-for="(rowId, rowIndex) in local.extra.newRowBottomSidePositions"
            ref="newRowsBottomSideRef"
            :key="`bottom-${rowId}`"
            :row="uv.newRows[rowId]"
            :local-row="local.newRows[rowId]"
            :base-local-row="baseLocal.newRows[rowId]"
            :column-indexes="columnIndexes"
            :local-uv="local.extra"
            from="added"
            @select="selectRow({ type: 'added', position: rowIndex }, $event)"
            @cell-click="clickCell({ type: 'added', id: rowId, column: arguments[0] }, arguments[1])"
            @goto="$emit('goto', $event)"
          />
        </tbody>
      </table>
      <div
        v-if="local.emptyRow !== null"
        class="button-container bottom"
      >
        <div
          class="button"
          @click="addNewRowOnPosition('bottom')"
        >
          <i class="material-icons">add</i>
          <span class="label">{{ this.$t('add_entry').toString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { namespace } from "vuex-class";
import { Store } from "vuex";
import { Moment } from "moment";
import * as moment from "moment";

import { deepEquals, isFirefox, isIOS, mapMaybe, nextRender, ObjectSet, tryDicts, ReferenceName, debugLog } from "@/utils";
import { valueIsNull } from "@/values";
import { IResultColumnInfo, ValueType } from "@/api";
import {
  CombinedUserView,
  currentValue,
  homeSchema,
  IAddedRow,
  ICombinedRow,
  ICombinedValue,
  IRowCommon,
  valueToPunnedText,
  IEntriesRef,
  Entries,
  referenceEntriesRef,
} from "@/state/user_view";
import { UserView } from "@/components";
import { ScopeName, AddedRowId, AutoSaveLock } from "@/state/staging_changes";
import { attrToQueryRef, attrToQuerySelf, IAttrToQueryOpts, IQuery } from "@/state/query";
import {
  equalRowPositionRef,
  IAddedRowPositionRef,
  IAddedRowRef,
  IExistingRowPositionRef,
  ILocalRow,
  ILocalRowInfo,
  INewRowRef,
  LocalUserView,
  RowPositionRef,
  RowRef,
  ValueRef,
} from "@/local_user_view";
import BaseUserView, { ISelectionRef } from "@/components/BaseUserView";
import { Action } from "@/components/ActionsMenu.vue";
import TableRow from "@/components/views/table/TableRow.vue";
import Checkbox from "@/components/checkbox/Checkbox.vue";
import TableCellEdit, { ICellCoords, IEditParams } from "@/components/views/table/TableCellEdit.vue";
import { Link, attrToLinkRef, attrToLinkSelf, attrToLink } from "@/links";
import * as R from "ramda";

interface ITableEditing {
  lock: AutoSaveLock;
  ref: ValueRef;
}

interface IColumn {
  caption: string;
  style: Record<string, unknown>;
  visible: boolean;
  fixed: boolean;
  columnInfo: IResultColumnInfo;
  width: number; // in px
  treeUnfoldColumn: boolean;
  scannable: boolean;
  type: string;
}

interface ITableValueExtra {
  // FIXME: is this still needed? We could drop it and use computed properties in TableRows instead.
  valueText: string;
  link?: Link;
  style?: Record<string, unknown>;
  selected: boolean;
}

type NewRowSide = "top" | "bottom";

interface ITableRowExtra {
  searchText: string;
  selected: boolean;
  visible: boolean;
  parent?: number;
  level?: number;
  arrowDown?: boolean;
  children: number[];
  style?: Record<string, unknown>;
  height?: number;
  link?: Link;
  selectionEntry?: ISelectionRef;
  newRowSide: NewRowSide;
}

interface ITableUserViewExtra {
  hasRowLinks: boolean;
  selectedRows: ObjectSet<RowRef>;
  selectedValues: ObjectSet<ValueRef>;
  columns: IColumn[];
  fixedColumnPositions: Record<number, string>;
  rowsParentPositions: Record<number, number>;
  linkOpts?: IAttrToQueryOpts;
  newRowTopSidePositions: number[];
  newRowBottomSidePositions: number[];
}

type ITableLocalRowInfo = ILocalRowInfo<ITableRowExtra>;
type ITableLocalRow = ILocalRow<ITableValueExtra, ITableRowExtra>;

const showStep = 20;
const doubleClickTime = 700;
// FIXME: Use CSS variables to avoid this constant
const technicalFieldsWidth = 35; // checkbox's and openform's td width

const createColumns = (uv: CombinedUserView): IColumn[] => {
  const viewAttrs = uv.attributes;
  const columns: IColumn[] = [];
  let isTreeUnfoldColumnSet = false;

  uv.info.columns.forEach((columnInfo, i) => {
    const columnAttrs = uv.columnAttributes[i];
    const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs);

    const captionAttr = getColumnAttr("caption");
    const caption = captionAttr !== undefined ? String(captionAttr) : columnInfo.name;

    const style: Record<string, unknown> = {};

    const columnWidthAttr = Number(getColumnAttr("column_width"));
    const columnWidth = Number.isNaN(columnWidthAttr) ? 200 : columnWidthAttr;
    style["width"] = `${columnWidth}px`;

    const fixedColumnAttr = getColumnAttr("fixed");
    const fixedColumn = fixedColumnAttr === undefined ? false : Boolean(fixedColumnAttr);

    const visibleColumnAttr = getColumnAttr("visible");
    const visibleColumn = visibleColumnAttr === undefined ? true : Boolean(visibleColumnAttr);

    const treeUnfoldColumnAttr = getColumnAttr("tree_unfold_column");
    const treeUnfoldColumn = treeUnfoldColumnAttr === undefined ? false : Boolean(treeUnfoldColumnAttr);
    if (treeUnfoldColumn) {
      isTreeUnfoldColumnSet = true;
    }

    const type = String(getColumnAttr("column_type"));

    const scannable = getColumnAttr("text_type") === "barcode";

    columns[i] = {
      caption,
      style,
      visible: visibleColumn,
      fixed: fixedColumn,
      columnInfo,
      width: columnWidth,
      treeUnfoldColumn,
      scannable,
      type,
    };
  });

  if (!isTreeUnfoldColumnSet) {
    columns[0].treeUnfoldColumn = true;
  }

  return columns;
};

export class LocalTableUserView extends LocalUserView<ITableValueExtra, ITableRowExtra, ITableUserViewExtra> {
  createCommonLocalValue(row: IRowCommon, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: ITableValueExtra | null, deleted: boolean): ITableValueExtra {
    const columnInfo = this.uv.info.columns[columnIndex];
    const columnAttrs = this.uv.columnAttributes[columnIndex];
    const getCellAttr = (name: string) => tryDicts(name, value.attributes, row.attributes, columnAttrs, this.uv.attributes);

    const valueText = valueToPunnedText(columnInfo.valueType, value);

    const style: Record<string, unknown> = {};

    const cellColor = getCellAttr("cell_color");
    if (cellColor !== undefined && cellColor !== null) {
      style["background-color"] = String(cellColor);
    }

    const textAlignRightTypes: (ValueType["type"])[] = ["int", "decimal"];
    const punOrValue: ValueType = columnInfo.punType ?? columnInfo.valueType;
    if (textAlignRightTypes.includes(punOrValue.type)) {
      style["text-align"] = "right";
    }

    const textAlignAttr = getCellAttr("text_align");
    if (textAlignAttr !== undefined) {
      style["text-align"] = String(textAlignAttr);
    }

    if (localRow.extra.height !== undefined) {
      style["height"] = `${localRow.extra.height}px`;
    }

    const fixedPosition = this.extra.fixedColumnPositions[columnIndex];
    if (fixedPosition !== undefined) {
      style["left"] = fixedPosition;
    }

    const selected = oldLocal !== null ? oldLocal.selected && !deleted : false;

    const extra: ITableValueExtra = {
      selected,
      valueText,
    };
    if (!R.isEmpty(style)) {
      extra.style = style;
    }
    return extra;
  }

  createLocalValue(rowIndex: number, row: ICombinedRow, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, oldLocal: ITableValueExtra | null) {
    const extra = this.createCommonLocalValue(row, localRow, columnIndex, value, oldLocal, row.deleted);

    const columnInfo = this.uv.info.columns[columnIndex];
    const columnAttrs = this.uv.columnAttributes[columnIndex];
    const getCellAttr = (name: string) => tryDicts(name, value.attributes, row.attributes, columnAttrs, this.uv.attributes);

    if (value.info) {
      if (value.info.field && value.info.field.fieldType.type === "reference") {
        const link = attrToLinkRef(getCellAttr("link"), currentValue(value), this.extra.linkOpts);
        if (link) {
          extra.link = link;
        }
      }
      const currLinkForRow = attrToLinkSelf(getCellAttr("row_link"), value.info, this.extra.linkOpts);
      if (currLinkForRow) {
        localRow.extra.link = currLinkForRow;
        this.extra.hasRowLinks = true;
      }

      if (getCellAttr("tree_parent_ids")) {
        // Init indexes by ids
        this.extra.rowsParentPositions[value.info.id] = rowIndex;

        // Init parent
        if (value.value !== null) {
          localRow.extra.parent = Number(value.value);
          localRow.extra.visible = false;
        }
      }
    }

    if (getCellAttr("selectable") && value.info) {
      localRow.extra.selectionEntry = {
        entity: value.info.fieldRef.entity,
        id: value.info.id,
      };
    } else if (this.uv.info.mainEntity) {
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

  createCommonLocalRow(row: IRowCommon, oldLocal: ITableRowExtra | null): ITableRowExtra {
    const getRowAttr = (name: string) => tryDicts(name, row.attributes, this.uv.attributes);

    const extra: ITableRowExtra = {
      selected: false,
      searchText: "",
      visible: true,
      children: [],
      level: 0,
      newRowSide: oldLocal?.newRowSide ?? "bottom",
    };

    const style: Record<string, unknown> = {};
    let touchedStyle = false;

    const height = Number(getRowAttr("row_height"));
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

  createLocalRow(rowIndex: number, row: ICombinedRow, oldLocal: ITableRowExtra | null) {
    const extra = this.createCommonLocalRow(row, oldLocal);
    if (row.mainId !== undefined) {
      extra.selectionEntry = {
        entity: this.uv.info.mainEntity!,
        id: row.mainId,
      };
    }
    return extra;
  }

  createAddedLocalRow(rowId: AddedRowId, row: IAddedRow, oldLocal: ITableRowExtra | null) {
    return this.createCommonLocalRow(row, oldLocal);
  }

  createEmptyLocalRow(row: IRowCommon, oldLocal: ITableRowExtra | null) {
    return this.createCommonLocalRow(row, oldLocal);
  }

  postInitCommonRow(row: IRowCommon, localRow: ITableLocalRow) {
    const searchStrings = localRow.values.map(extra => {
      return extra.valueText.toLocaleLowerCase();
    });
    localRow.extra.searchText = "\0".concat(...searchStrings);
  }

  postInitAddedRow(rowId: AddedRowId, row: IAddedRow, localRow: ITableLocalRow) {
    this.postInitCommonRow(row, localRow);
  }

  postInitRow(rowIndex: number, row: ICombinedRow, localRow: ITableLocalRow) {
    this.postInitCommonRow(row, localRow);
  }

  deleteRow(rowIndex: number, row: ICombinedRow, localRow: ITableLocalRowInfo) {
    if (localRow.extra.selected) {
      localRow.extra.selected = false;
      this.extra.selectedRows.delete({
        type: "existing",
        position: rowIndex,
      });
    }
  }

  deleteAddedRow(rowId: AddedRowId, row: ICombinedRow, localRow: ITableLocalRowInfo) {
    if (localRow.extra.selected) {
      this.extra.selectedRows.delete({
        type: "added",
        id: rowId,
      });
    }
  }

  createLocalUserView(): ITableUserViewExtra {
    const columns = createColumns(this.uv);
    const extra: ITableUserViewExtra = {
      hasRowLinks: false,
      selectedRows: new ObjectSet<RowRef>(),
      selectedValues: new ObjectSet<ValueRef>(),
      columns,
      fixedColumnPositions: {},
      rowsParentPositions: {},
      newRowTopSidePositions: [],
      newRowBottomSidePositions: [],
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
  } else if (a.type === "new") {
    return 0;
  } else {
    return Math.sign(a.position - (b as IAddedRowPositionRef | IExistingRowPositionRef).position);
  }
};

const rowContains = (row: ITableLocalRow, searchWords: string[]) => {
  return searchWords.every(word => row.extra.searchText.includes(word));
};

const rowIndicesCompare = (aIndex: number, bIndex: number, entries: IRowCommon[], sortColumn: number, collator: Intl.Collator) => {
  const a = entries[aIndex];
  const b = entries[bIndex];
  const aValue = a.values[sortColumn].value;
  const bValue = b.values[sortColumn].value;
  if (aValue === null) {
    return 1;
  } else if (bValue === null) {
    return -1;
  } else if (aValue instanceof moment) {
    return (aValue as Moment).unix() - (bValue as Moment).unix();
  } else if (typeof aValue === "number") {
    return aValue - (bValue as number);
  } else {
    return collator.compare(String(aValue), String(bValue));
  }
};

const isEmptyRow = (row: IRowCommon) => {
  return row.values.every(cell => valueIsNull(cell.rawValue) || cell.info === null);
};

const userView = namespace("userView");
const staging = namespace("staging");

@UserView({
  localConstructor: LocalTableUserView,
})
@Component({
  components: {
    TableRow, Checkbox, TableCellEdit,
  },
})
export default class UserViewTable extends mixins<BaseUserView<LocalTableUserView, ITableValueExtra, ITableRowExtra, ITableUserViewExtra>>(BaseUserView) {
  @staging.Action("addAutoSaveLock") addAutoSaveLock!: () => Promise<AutoSaveLock>;
  @staging.Action("removeAutoSaveLock") removeAutoSaveLock!: (id: AutoSaveLock) => Promise<void>;
  @userView.Mutation("removeEntriesConsumer") removeEntriesConsumer!: (args: { ref: IEntriesRef; reference: ReferenceName }) => void;
  @userView.Action("getEntries") getEntries!: (args: { reference: ReferenceName; ref: IEntriesRef }) => Promise<Entries>;

  private currentFilter: string[] = [];
  private sortColumn: number | null = null;
  private sortAsc = true;
  private sortOptions: Intl.CollatorOptions = {};
  private rowPositions: number[] = [];
  private showLength = 0;
  // XXX: this has positions relative to current sorting and filtering. It needs to be converted to a global position ref using `getRowByLocalPosition`.
  private lastSelectedRow: RowPositionRef | null = null;
  private lastSelectedValue: ValueRef | null = null;
  private editing: ITableEditing | null = null;
  private printListener: { query: MediaQueryList; queryCallback: (mql: MediaQueryListEvent) => void; printCallback: () => void } | null = null;
  private clickTimeoutId: NodeJS.Timeout | null = null;
  private emptyLocalRow: ITableLocalRow | null = null;
  private isFirefoxBrowser: boolean = isFirefox();
  private isSelectedLastFixedCell = false;
  private editCoords: ICellCoords = {
    x: 0,
    y: 0,
  };
  private editParams: IEditParams = {
    height: 0,
    width: 0,
    minHeight: 0,
  };
  // Keep references to entries used for editing once, so we don't re-request them.
  private keptEntries = new ObjectSet<IEntriesRef>();

  private cellEditHeight = 0;

  private rowsState: Record<number, any> = {};
  private isTree = false;

  get columnIndexes() {
    const columns = this.local.extra.columns.map((column, index) => ({
      index,
      fixed: column.fixed,
      visible: column.visible,
    })).filter(c => c.visible);
    const fixed = columns.filter(c => c.fixed);
    const nonFixed = columns.filter(c => !c.fixed);
    return fixed.concat(nonFixed).map(c => c.index);
  }

  get fixedColumnIndexes() {
    return mapMaybe((col, colI) => col.fixed ? colI : undefined, this.local.extra.columns);
  }

  get lastFixedColumnIndex(): number {
    return this.local.extra.columns.filter(item => item.fixed).length;
  }

  get editingLocked() {
    if (this.editing === null) {
      return false;
    } else {
      return this.editing.ref.type !== "existing" && this.addedLocked;
    }
  }

  get editingValue() {
    if (this.editing === null
     || this.editingIsBool // Bools are special case because they toggles by double click.
    ) {
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
    this.currentFilter = this.filter;
    this.init();

    if (this.isTopLevel) {
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

  @Watch("uv")
  protected uvChanged() {
    this.init();
    this.updateShowLength();
  }

  @Watch("uv")
  protected uvInsidesChanged() {
    this.updateRows();
  }

  protected mounted() {
    this.updateShowLength();
    (this.$refs.tableContainer as HTMLElement).addEventListener("scroll", () => {
      this.removeCellEditing();
    });

    this.$root.$on("cell-click", () => {
      this.local.extra.selectedValues.keys().forEach(key => {
        this.local.selectCell(key, false);
      });
      this.lastSelectedRow = null;
      this.lastSelectedValue = null;
      this.removeCellEditing();
    });

    if (!R.isEmpty(this.local.extra.rowsParentPositions)
     && "tree_all_open" in this.local.uv.attributes
     && this.local.uv.attributes.tree_all_open
    ) {
      this.toggleAllTreeChildren(true);
    }
  }

  protected destroyed() {
    if (this.printListener !== null) {
      window.removeEventListener("beforeprint", this.printListener.printCallback);
      this.printListener.query.removeListener(this.printListener.queryCallback);
    }
    if (this.clickTimeoutId !== null) {
      clearTimeout(this.clickTimeoutId);
    }
    this.releaseEntries();
  }

  @Watch("filter")
  protected updateFilter() {
    const oldFilter = this.currentFilter;
    this.currentFilter = this.filter;

    // Check if current filter contained this one
    const contained = oldFilter.every(oldWord => this.currentFilter.some(newWord => newWord.startsWith(oldWord)));

    if (!contained) {
      this.buildRowPositions();
    } else {
      // Filter existing rows when we filter a subset of already filtered ones.
      const newWords = this.currentFilter.filter(newWord => !oldFilter.some(oldWord => oldWord.startsWith(newWord)));
      this.rowPositions = this.rowPositions.filter(rowI => rowContains(this.local.rows[rowI], newWords));
    }

    if (this.filter.length === 0) {
      this.buildRowPositions();
      this.initRowsState();
    } else if (this.isTree) {
      this.offTree();
    }
  }

  @Watch("editingValue")
  protected updateEditingValue() {
    if (this.editingValue === null) {
      this.removeCellEditing();
    } else {
      const fieldType = this.editingValue.value.info?.field?.fieldType;
      if (fieldType !== undefined && fieldType.type === "reference") {
        if (!this.keptEntries.exists(fieldType)) {
          const ref = referenceEntriesRef(fieldType);
          void this.getEntries({ ref, reference: this.uid });
          this.keptEntries.insert(ref);
        }
      }
    }
  }

  private getNewRowsBySide(position: NewRowSide): number[] {
    return this.uv.newRowsPositions.filter(
      (rowI: number) => this.local.newRows[rowI].extra.newRowSide === position,
    );
  }

  @Watch("uv.newRows")
  private updateNewRowsSides() {
    this.local.extra.newRowTopSidePositions = this.getNewRowsBySide("top");
    this.local.extra.newRowBottomSidePositions = this.getNewRowsBySide("bottom").reverse();
  }

  private async addNewRowOnPosition(side: NewRowSide): Promise<void> {
    const rowId = await this.addNewRow();
    this.local.newRows[rowId].extra.newRowSide = side;
    this.updateNewRowsSides();

    const firstNotDisabledColumn = this.uv.newRows[rowId].values.findIndex((value, i) => {
      return value.info !== undefined && this.local.extra.columns[i].visible;
    });
    const firstNotDisabledDOMColumn = this.columnIndexes.indexOf(firstNotDisabledColumn);
    if (firstNotDisabledDOMColumn === -1) return;

    void nextRender().then(() => {
      const sideName = side === "top" ? "newRowsTopSideRef" : "newRowsBottomSideRef";
      const newRowsRef = this.$refs[sideName] as TableRow[] | undefined;
      if (newRowsRef === undefined) return;
      const childRef = newRowsRef?.[newRowsRef.length - 1]?.$children?.[1 + firstNotDisabledDOMColumn].$el;
      if (childRef === undefined) return;

      this.cellEditByTarget(
        {
          type: "added",
          id: rowId,
          column: firstNotDisabledColumn,
        },
        childRef as HTMLElement,
      );
    });
  }

  // Toggle children rows visibles.
  private visibleChildren(children: number[], visible: boolean, depth = false) {
    // Save state.
    if (this.local.rows[children[0]] !== undefined) {
      const parent = this.local.rows[children[0]].extra.parent;
      if (parent === undefined) {
        return;
      }
      const parentIndex = this.local.extra.rowsParentPositions[parent];
      const extra = this.local.rows[parentIndex].extra;
      this.local.rows[parentIndex].extra.arrowDown = visible;
      if (visible) {
        this.rowsState[parentIndex] = extra;
      } else {
        delete this.rowsState[parentIndex];
      }
    }

    // Toggle
    children.forEach((child, i) => {
      if (!visible && this.local.rows[child].extra.visible) {
        this.visibleChildren(this.local.rows[child].extra.children, visible);

        // Hidden children.
        const childPosition = this.rowPositions.indexOf(child);
        this.rowPositions.splice(childPosition, 1);
      }

      // Open in depth
      if (depth) {
        this.visibleChildren(this.local.rows[child].extra.children, true, depth);
      }

      this.local.rows[child].extra.visible = visible;
    });

    if (visible) {
      this.displayChildren(children);
    }
  }

  private displayChildren(children: number[]) {
    const index = this?.local?.rows[children[0]]?.extra?.parent ?? null;
    const parent = index !== null ? this.local.extra.rowsParentPositions[index] : null;
    if (parent !== null) {
      for (let i = children.length - 1; i >= 0; i--) {
        if (this.rowPositions.includes(children[i])) {
          const childPosition = this.rowPositions.indexOf(children[i]);
          this.rowPositions.splice(childPosition, 1);
        }
        this.rowPositions.splice(this.rowPositions.indexOf(parent) + 1, 0, children[i]);
      }
    }
  }

  private toggleAllTreeChildren(visible: boolean) {
    this.rowPositions.forEach(rowI => {
      if (this.local.rows[rowI].extra.children.length > 0 && this.local.rows[rowI].extra.parent === undefined) {
        this.visibleChildren(this.local.rows[rowI].extra.children, visible, true);
      }
    });
    this.initRowsState();
  }

  private initRowsState() {
    this.local.rows.forEach((row, rowI) => {
      const parentIndex = row.extra.parent !== undefined ? this.local.extra.rowsParentPositions[row.extra.parent] : undefined;
      if (parentIndex !== undefined
       && this.local.rows[parentIndex] !== undefined
       && !this.local.rows[parentIndex].extra.children.includes(rowI)
      ) {
        this.local.rows[parentIndex].extra.children.push(rowI);
        let level = 0;
        let parent: number | undefined = parentIndex;
        while (parent !== undefined && this.local.rows[parent] !== undefined && level < 100) {
          const index: number | undefined = this?.local?.rows[parent]?.extra?.parent ?? undefined;
          parent = index !== undefined ? this.local.extra.rowsParentPositions[index] : undefined;
          level++;
        }
        this.local.rows[rowI].extra.level = level;
      }
    });
    if (!R.isEmpty(this.rowsState)) {
      const sort = R.sortBy(R.compose(R.prop<string, number>("level"), R.prop<any>(1)));
      const sortable = sort(R.toPairs(this.rowsState));
      // Load visible data from rowsState to rows.
      sortable.forEach(item => {
        this.visibleChildren(item[1].children, true);
      });
    } else {
      this.buildRowPositions();
    }
  }

  private offTree() {
    this.isTree = false;
    this.buildRowPositions();
  }

  // Update this.rowsPositions when this.uv.rows has changed.
  private buildRowPositions() {
    const rows = this.uv.rows;
    if (rows === null) {
      this.rowPositions = [];
    } else {
      this.rowPositions = rows.map((row, rowI) => rowI);
      if (this.filter.length !== 0) {
        this.rowPositions = this.rowPositions.filter(rowI => rowContains(this.local.rows[rowI], this.filter));
      } else if (!R.isEmpty(this.local.extra.rowsParentPositions)) {
        this.rowPositions = this.rowPositions.filter(rowI => this.local.rows[rowI].extra.visible);
        this.isTree = true;
      }
      debugLog("buildRowsPositions", this.uv.rows, this.rowPositions);
      this.sortRows();
      this.updateShowLength();
    }
  }

  private clickOutsideEdit(event: Event) {
    const element = (event instanceof MouseEvent) ? document.elementFromPoint(event.x, event.y) : null;
    if (element) {
      if (element.closest(".v--modal-box")) {
        return;
      }
    }
    this.removeCellEditing();
    this.cellEditHeight = 0;
  }

  private removeCellEditing() {
    if (this.editing === null) {
      return;
    }

    void this.removeAutoSaveLock(this.editing.lock);
    this.editing = null;
  }

  // Value is not actually required to be editable - it can be opened in read-only mode too.
  private setCellEditing(ref: ValueRef) {
    this.removeCellEditing();

    void this.addAutoSaveLock().then(async lock => {
      const value = this.local.getValueByRef(ref);

      if (this.editing !== null // Lock already taken (somehow)
       || value === null // value not found
      ) {
        await this.removeAutoSaveLock(lock);
        return;
      }

      this.editing = { ref, lock };
    });
  }

  private get editingIsBool(): boolean {
    if (this.editing === null) return false;
    return this.uv.info.columns[this.editing.ref.column].valueType.type === "bool";
  }

  @Watch("editing")
  private async watchEditingForBool() {
    if (this.editing === null) return;
    const ref = this.editing.ref;
    if (ref.type === "new") return;

    if (this.editingIsBool) {
      const value = this.local.getValueByRef(ref)!.value.value;
      await this.updateCurrentValue(!value);
      this.removeCellEditing();
    }
  }

  private setInputHeight(value: number) {
    this.cellEditHeight = value;
  }

  private setCoordsForEditCell(target: HTMLElement) {
    this.isSelectedLastFixedCell = target.classList.value.includes("next-after-last-fixed");

    const bodyRect = document.body.getBoundingClientRect();
    const rect = target.getBoundingClientRect();

    this.editCoords.x = rect.x;

    // If edit window lower than screen, raise the window up.
    // +54px for bottom panel.
    if (bodyRect.bottom - rect.bottom - 54 < 0) {
      this.editCoords.y = bodyRect.bottom - this.editParams.height - 54;
      this.editParams.height += 54;
    } else {
      this.editCoords.y = rect.y;
    }
  }

  private updateClickTimer(ref: ValueRef) {
    // this.selectCell() breaks the timer for double click in iOS,
    // so when we're running iOS we don't check for double click
    const sameCellClicked = deepEquals(this.lastSelectedValue, ref);
    if (this.clickTimeoutId === null) {
      this.clickTimeoutId = setTimeout(() => {
        this.clickTimeoutId = null;
      }, doubleClickTime);
      if (this.lastSelectedValue !== null && !sameCellClicked) {
        this.removeCellEditing();
      }
    } else {
      clearTimeout(this.clickTimeoutId);
      this.clickTimeoutId = null;
      if (this.lastSelectedValue !== null && sameCellClicked) {
        this.setCellEditing(ref);
      }
    }
  }

  private clickCell(ref: ValueRef, event: MouseEvent) {
    this.removeCellEditing();
    this.updateClickTimer(ref);
    this.cellEditHandler(ref, event.target as HTMLElement);
  }

  private cellEditByTarget(ref: ValueRef, target: HTMLElement) {
    this.setCellEditing(ref);
    this.cellEditHandler(ref, target);
  }

  private cellEditHandler(ref: ValueRef, target: HTMLElement) {
    this.setCoordsForEditCell(target);
    this.editParams.width = target.offsetWidth;
    this.editParams.height = target.offsetHeight;
    this.editParams.minHeight = target.offsetHeight;

    this.selectCell(ref);
    if (this.lastSelectedValue
     && !deepEquals(this.lastSelectedValue, ref)
     && this.lastSelectedValue.type === "added") {
      const row = this.uv.newRows[this.lastSelectedValue.id];
      if (!row) {
        this.lastSelectedValue = null;
      } else if (isEmptyRow(row)) {
        const entity = this.uv.info.mainEntity;
        if (!entity) {
          throw new Error("View doesn't have a main entity");
        }

        void this.resetAddedEntry({
          entityRef: entity,
          id: this.lastSelectedValue.id,
        });
      }
    }
  }

  private selectCell(ref: ValueRef) {
    this.local.extra.selectedValues.keys().forEach(prevRef => {
      this.local.selectCell(prevRef, false);
    });

    // Deselect another cells
    this.$root.$emit("cell-click");

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
    const row = this.baseLocal.getRowByRef(ref);
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
      const prevRow = this.baseLocal.getRowByRef(prevRef);
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
        this.baseLocal.selectRow(currRef, prevRow.local.extra.selected);
        i = this.nextLocalRowPosition(i);
      }
      this.baseLocal.selectRow(this.getRowByLocalPosition(to)!, prevRow.local.extra.selected);
      return true;
    };

    if (!(this.lastSelectedRow !== null && event.shiftKey && proc())) {
      this.baseLocal.selectRow(ref, !row.local.extra.selected);
    }

    this.lastSelectedRow = posRef;
  }

  private selectAllRows() {
    this.baseLocal.selectAll(!this.baseLocal.selectedAll);
  }

  private removeSelectedRows() {
    const entity = this.uv.info.mainEntity;
    if (entity === null || this.uv.rows === null) {
      throw new Error("View doesn't have a main entity");
    }

    this.baseLocal.extra.selectedRows.keys().forEach(rowRef => this.deleteRow(rowRef));
  }

  private releaseEntries() {
    this.keptEntries.keys().forEach(ref => {
      this.removeEntriesConsumer({ ref, reference: this.uid });
    });
    this.keptEntries = new ObjectSet();
  }

  private init() {
    this.releaseEntries();

    if (this.isTopLevel) {
      this.$emit("update:bodyStyle", `
                @media print {
                    @page {
                        size: landscape;
                    }
                }
            `);
    }

    const actions: Action[] = [];
    if (this.uv.info.mainEntity !== null) {
      actions.push(
        { icon: "delete_sweep", name: this.$t("remove_selected_rows").toString(), callback: () => this.removeSelectedRows() },
        { icon: "playlist_add", name: this.$t("add_entry").toString(), callback: () => this.addNewRowOnPosition("top") },
      );
    }

    this.$emit("update:actions", actions);
    this.$emit("update:enableFilter", this.uv.rows !== null);

    this.updateRows();
  }

  private updateRows() {
    this.buildRowPositions();
    this.initRowsState();
  }

  /*
            first sort
            bool:   descending
            number: descending
            string: ascending
        */
  private updateSort(sortColumn: number) {
    const type = this.local.extra.columns[sortColumn].columnInfo.valueType.type;
    if (this.sortColumn !== sortColumn) {
      this.sortColumn = sortColumn;
      switch (type) {
        case "decimal":
          this.sortOptions = { numeric: true };
          this.sortAsc = false;
          break;
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
    this.sortRows();
  }

  private sortRows() {
    const rows = this.uv.rows!;

    if (this.sortColumn !== null) {
      const sortColumn = this.sortColumn;
      const collator = new Intl.Collator(["en", "ru"], this.sortOptions);
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
    if (tableContainer.scrollTop + tableContainer.clientHeight + 1 >= tableContainer.scrollHeight
     && this.showLength < this.rowPositions.length
    ) {
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
    const selectedCount = this.baseLocal.selectedCount;
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

  private async updateCurrentValue(rawValue: any) {
    const editing = this.editing!;
    const ref = editing.ref;
    const newRef = await this.updateValue(ref, rawValue);
    if (ref.type === "new") {
      editing.ref = newRef;
      this.selectCell(newRef);
      if (this.uv.columnAttributes[newRef.column].text_type === "barcode") {
        void this.addNewRowOnPosition("bottom");
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  /* Current Z layout:

    * Form control          (2000)
    * Disable-edit block    (500)
    * Table head            (20)
    * FixedColumn           (25)
*/

  table,
  th,
  td {
    border: 1px solid var(--MainBackgroundColor);
  }

  .button-container {
    width: 100%;
    position: sticky;
    left: 0;

    &.bottom {
      border-bottom: 1px solid var(--MainBorderColor);
    }

    .button {
      width: max-content;
      display: flex;
      align-items: center;
      cursor: pointer;
      color: var(--MainTextColorLight);
      padding: 3px 6px;

      &:hover {
        color: var(--MainTextColor);
      }

      > .label {
        padding-left: 2px;
      }
    }
  }

  .table-block {
    width: 100%;
    margin: 0;
    position: relative;
    height: 100%;
  }

  .data-col {
    max-width: 100vw !important;
  }

  .form_background {
    padding: 50px;
    box-sizing: border-box;
    box-shadow: 0 0 10px 5px var(--MainBorderColor);
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
    z-index: 1000;
  }

  .tabl {
    height: 100%;
    width: 100%; /* на весь экран */
    padding: 0;
    overflow: auto; /* чтобы скролить таблицу в том числе на мобилке */
  }

  .custom-table {
    border-collapse: separate !important;
    border-spacing: 0;
    table-layout: fixed;
    width: 0;
    border: 1px solid var(--MainBorderColor);
    background-color: var(--TableBackColor);
    margin: 0;
  }

  .table-th {
    border: 0;
    font-weight: normal;
    max-width: 50px !important;
    overflow: hidden;
    white-space: nowrap;
    padding: 2px 10px 0 10px;
    box-shadow: 0 2px 0 var(--MainBorderColor);
    text-overflow: ellipsis;
    position: sticky; /* фиксация шапки при скроле */
    z-index: 20; /* при скроле таблицы чтобы шапка была видна */
    border-right: 1px solid var(--MainBorderColor);
    top: 0;
    cursor: pointer;
    color: var(--MainTextColorLight);
    background-color: var(--MainBackgroundColor);
  }

  .td-moz {
    box-shadow: -1px 2px 0 var(--MainBorderColor);
  }

  .table-th:last-child {
    border-right: none;
  }

  ::v-deep td > p {
    margin-bottom: 0;
  }

  th.fixed-column {
    z-index: 25; /* поверх обычных столбцов */
    box-shadow: 0 2px 0 var(--MainBorderColor);

    &.checkbox-cells {
      box-shadow:
        0 2px 0 var(--MainBorderColor),
        1px 0 0 var(--MainBorderColor);
    }
  }

  th.th_after-last-fixed {
    padding-left: 10px;
  }

  th.tabl_heading {
    text-overflow: ellipsis;
    vertical-align: middle;
  }

  th.links-style {
    text-align: center;
    cursor: pointer;
    padding: 0;
  }

  .table-th_span {
    justify-content: center;
  }

  .nested-table-block {
    border: 1px solid var(--MainBorderColor);
    border-radius: 4px;
    overflow: hidden;
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .nested-table-block {
        position: sticky;
        float: right;
        right: 0;
      }

      /* This is a potential hack. Here's to hoping it would go away soon. */
      .nested-table-block > .tabl {
        width: 92vw !important;
      }
    }
  }

  @media screen and (max-device-width: 650px) {
    .tabl {
      flex: 1;
      height: none;
      margin-bottom: 0;
    }

    .table-block {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .active_editing {
      position: sticky !important;
      justify-content: flex-start;
      z-index: 100000; /* чтобы FormControl был поверх других таблиц, когда их несколько на странице */
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
      left: 0;
    }

    .openform-cells {
      left: 35px;
    }

    .fixed-column {
      position: sticky;
      z-index: 20;
      border-left: 0;
    }
  }

  @-moz-document url-prefix() {
    .fixed-column {
      outline: solid 1px var(--MainBorderColor);
    }
  }

  @media print {
    .tabl {
      height: 100%;
      float: none !important; /* при печати для правильной масштабируемости */
      overflow: visible !important; /* чтобы при печати была возможность видеть таблицу */
    }

    @-moz-document url-prefix() { /* стили в лисе исправляем баги с отображением границ таблицы */
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

  @media screen and (max-device-width: 480px) {
    .edit_container {
      align-items: flex-start;
    }

    div.form-control-panel {
      margin-top: 15%;
    }

    div.form-control-panel > div.select-container {
      width: calc(100vw - 44px) !important;

      /* padding 20px and left 2px */
    }

    div.form-control-panel > div.select-container > select.form-control-panel_select {
      width: 100%;
    }

    div.form-control-panel > div.select-container::after {
      position: relative;
      left: 0;
    }
  }

  div.form-control-panel > div.select-container {
    width: 300px;
  }

  div.form-control-panel > pre {
    min-width: 600px;
    height: 200px !important;
    margin-bottom: 0;
  }

  ::v-deep .checkbox-cells {
    text-align: center;
    color: var(--MainTextColorLight);
    padding: 0;

    &.table-th .material-icons {
      top: 5px;
      left: 5px;
    }

    .table-td_span .material-icons {
      position: relative;
      top: 2px;
    }

    &:hover {
      color: var(--MainTextColor);
      background-color: rgb(239, 239, 239);
    }
  }

  ::v-deep .openform-cells {
    padding: 0;
    text-align: center;
    height: 100%;
    width: 100%;

    .openform-add-icon {
      color: var(--MainTextColorLight);
      position: relative;
      top: 5px;
    }

    > a {
      display: block;
      text-decoration: none;

      &:hover {
        .openform-add-icon {
          color: var(--MainTextColor);
        }
      }
    }

    .openform-cells__icon {
      color: var(--MainTextColorLight);
    }

    .icon-link {
      height: 100%;
      width: 100%;
      display: block;
      text-decoration: none;

      .material-icons {
        position: relative;
        top: 2px;
      }
    }

    > span > i {
      position: absolute;
      top: 5px;
      left: 5px;
    }

    &:hover {
      background-color: rgb(239, 239, 239);

      .openform-cells__icon {
        color: var(--MainTextColor);
      }
    }

    &.table-th {
      padding: 0;
    }
  }

  .checkbox-col,
  .open-form-col {
    width: 35px;
  }

  thead {
    line-height: 30px;
  }

  *::selection {
    background: transparent;
  }

  * {
    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
    -khtml-user-select: none; /* Konqueror HTML */
    -moz-user-select: none; /* Old versions of Firefox */
    -ms-user-select: none; /* Internet Explorer/Edge */
    user-select: none; /* Non-prefixed version, currently
                                  supported by Chrome, Opera and Firefox */
  }
</style>
