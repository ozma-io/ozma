<i18n>
    {
      "en": {
        "clear": "Clear",
        "yes": "Yes",
        "no": "No",
        "add": "➕Add",
        "remove_selected_rows": "Remove selected rows",
        "show_new_row": "Add/remove new row"
      },
      "ru": {
        "clear": "Очистить",
        "yes": "Да",
        "no": "Нет",
        "add": "➕Добавить",
        "remove_selected_rows": "Удалить выбранные записи",
        "show_new_row": "Добавить/убрать новую строку"
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
        auto-open
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
      <table
        :class="['custom-table', 'table', 'b-table',
                 {'edit_active': editingValue !== null}]"
      >
        <colgroup>
          <col :class="['checkbox-col', {'checkbox-cells': showFixedRow}]"> <!-- Checkbox column -->
          <col
            v-if="local.extra.hasRowLinks"
            :class="['open-form-col', {'openform-cells': showFixedRow}]"
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
          ref="tableHead"
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
              <span
                :title="this.$t('show_new_row')"
                @click="setShowEmptyRow(!showEmptyRow)"
              >
                <i
                  v-if="showEmptyRow"
                  class="material-icons md-20"
                >remove</i>
                <i
                  v-else
                  class="material-icons md-20"
                >add</i>
              </span>
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
          <template v-if="showEmptyRow">
            <!--<TableFixedRow
              v-if="showFixedRow"
              :row="local.emptyRow.row"
              :local-row="local.emptyRow.local"
              :column-indexes="fixedRowColumnIndexes"
              :local-uv="local.extra"
              from="new"
              @cell-click="clickCell({ type: 'new', column: arguments[0] }, arguments[1])"
              @goto="$emit('goto', $event)"
            />-->
            <TableRow
              ref="emptyRowRef"
              :row="local.emptyRow.row"
              :local-row="local.emptyRow.local"
              :base-local-row="baseLocal.emptyRow.local"
              :column-indexes="columnIndexes"
              :local-uv="local.extra"
              :show-fixed-row="showFixedRow"
              from="new"
              @cell-click="clickCell({ type: 'new', column: arguments[0] }, arguments[1])"
              @goto="$emit('goto', $event)"
            />
          </template>
          <template v-for="(rowId, rowIndex) in uv.newRowsPositions">
            <!--<TableFixedRow
              v-if="showFixedRow"
              :key="`fixed-new-${rowId}`"
              :row="uv.newRows[rowId]"
              :local-row="local.newRows[rowId]"
              :column-indexes="fixedRowColumnIndexes"
              :local-uv="local.extra"
              from="added"
              @select="selectRow({ type: 'added', position: rowIndex }, $event)"
              @cell-click="clickCell({ type: 'added', id: rowId, column: arguments[0] }, arguments[1])"
              @goto="$emit('goto', $event)"
            />-->
            <TableRow
              :key="`new-${rowId}`"
              :row="uv.newRows[rowId]"
              :local-row="local.newRows[rowId]"
              :base-local-row="baseLocal.newRows[rowId]"
              :column-indexes="columnIndexes"
              :local-uv="local.extra"
              :show-fixed-row="showFixedRow"
              from="added"
              @select="selectRow({ type: 'added', position: rowIndex }, $event)"
              @cell-click="clickCell({ type: 'added', id: rowId, column: arguments[0] }, arguments[1])"
              @goto="$emit('goto', $event)"
            />
          </template>
          <template v-for="(rowI, rowIndex) in shownRowPositions">
            <!--<TableFixedRow
              v-if="showFixedRow"
              :key="`fixed-${rowI}`"
              :row="uv.rows[rowI]"
              :local-row="local.rows[rowI]"
              :column-indexes="fixedRowColumnIndexes"
              :local-uv="local.extra"
              @select="selectRow({ type: 'existing', position: rowIndex }, $event)"
              @cell-click="clickCell({ type: 'existing', position: rowI, column: arguments[0] }, arguments[1])"
              @goto="$emit('goto', $event)"
            />-->
            <TableRow
              :key="rowI"
              :row="uv.rows[rowI]"
              :local-row="local.rows[rowI]"
              :base-local-row="baseLocal.rows[rowI]"
              :column-indexes="columnIndexes"
              :local-uv="local.extra"
              :show-fixed-row="showFixedRow"
              :is-tree="isTree"
              @select="selectRow({ type: 'existing', position: rowIndex }, $event)"
              @cell-click="clickCell({ type: 'existing', position: rowI, column: arguments[0] }, arguments[1])"
              @update:visibleChildren="visibleChildren(arguments[0], arguments[1])"
              @goto="$emit('goto', $event)"
            />
          </template>
        </tbody>
      </table>
      <input
        v-if="baseLocal.extra.rowCount < 30 && local.emptyRow !== null"
        type="button"
        :value="this.$t('add').toString()"
        class="button"
        @click="setShowEmptyRow(true)"
      >
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

import { deepEquals, isFirefox, isIOS, mapMaybe, nextRender, nextRenderOneJump, ObjectSet, tryDicts, ReferenceName } from "@/utils";
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
  ILocalRow,
  ILocalRowInfo,
  LocalUserView,
  RowPositionRef,
  RowRef,
  ValueRef,
} from "@/local_user_view";
import BaseUserView, { ISelectionRef } from "@/components/BaseUserView";
import { Action } from "@/components/ActionsMenu.vue";
import TableRow from "@/components/views/table/TableRow.vue";
import TableFixedRow from "@/components/views/table/TableFixedRow.vue";
import Checkbox from "@/components/checkbox/Checkbox.vue";
import TableCellEdit, { ICellCoords, IEditParams } from "@/components/views/table/TableCellEdit.vue";
import { Link, attrToLinkRef, attrToLinkSelf } from "@/links";
import * as R from "ramda";

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
  treeBranchesView: boolean;
}

interface ITableValueExtra {
  valueText: string;
  link?: Link;
  style?: Record<string, any>;
  selected: boolean;
}

interface ITableRowExtra {
  searchText: string;
  selected: boolean;
  visible: boolean;
  parent?: number;
  level?: number;
  arrowDown?: boolean;
  children: number[];
  style?: Record<string, any>;
  height?: number;
  link?: Link;
  selectionEntry?: ISelectionRef;
}

interface ITableUserViewExtra {
  hasRowLinks: boolean;
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
const technicalFieldsWidth = 35; // checkbox's and openform's td width

const createColumns = (uv: CombinedUserView): IColumn[] => {
  const viewAttrs = uv.attributes;

  return uv.info.columns.map((columnInfo, i) => {
    const columnAttrs = uv.columnAttributes[i];
    const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs);

    const captionAttr = getColumnAttr("caption");
    const caption = captionAttr !== undefined ? String(captionAttr) : columnInfo.name;

    const style: Record<string, any> = {};

    const columnWidthAttr = Number(getColumnAttr("column_width"));
    const columnWidth = Number.isNaN(columnWidthAttr) ? 200 : columnWidthAttr;
    style["width"] = `${columnWidth}px`;

    const fixedColumnAttr = getColumnAttr("fixed");
    const fixedColumn = fixedColumnAttr === undefined ? false : Boolean(fixedColumnAttr);

    // FIXME: we stopped supporting it for now.
    //const fixedFieldAttr = getColumnAttr("mobile_fixed");
    //const fixedField = fixedFieldAttr === undefined ? false : Boolean(fixedFieldAttr);

    const visibleColumnAttr = getColumnAttr("visible");
    const visibleColumn = visibleColumnAttr === undefined ? true : Boolean(visibleColumnAttr);

    const treeBranchesViewAttr = getColumnAttr("tree_branches_view");
    const treeBranchesView = treeBranchesViewAttr === undefined ? false : Boolean(treeBranchesViewAttr);

    return {
      caption,
      style,
      visible: visibleColumn,
      fixed: fixedColumn,
      //mobileFixed: fixedField,
      mobileFixed: false,
      columnInfo,
      attrs: columnAttrs,
      width: columnWidth,
      treeBranchesView,
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

    const cellColor = getCellAttr("cell_color");
    if (cellColor !== undefined && cellColor !== null) {
      style["background-color"] = String(cellColor);
    }

    const textAlignRightTypes: (ValueType["type"])[] = ["int", "decimal"];
    const punOrValue: ValueType = columnInfo.punType ?? columnInfo.valueType
    if(textAlignRightTypes.includes(punOrValue.type)) {
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

    const getDeprecatedAttr = (name: string, oldName: string) => {
      const ret = getCellAttr(name);
      if (ret !== undefined) {
        return ret;
      }
      const oldRet = getCellAttr(oldName);
      if (oldRet !== undefined) {
        console.warn(`Old-style link attribute detected: "${oldName}"`);
        return oldRet;
      }
    };

    if (value.info) {
      if (value.info.field && value.info.field.fieldType.type === "reference") {
        const link = attrToLinkRef(getDeprecatedAttr("link", "linked_view"), currentValue(value), this.extra.linkOpts);
        if (link) {
          extra.link = link;
        }
      }
      const currLinkForRow = attrToLinkSelf(getDeprecatedAttr("row_link", "row_linked_view"), value.info, this.extra.linkOpts);
      if (currLinkForRow) {
        localRow.extra.link = currLinkForRow;
        this.extra.hasRowLinks = true;
      }
      const parent = getCellAttr("tree_branches") && value.value ? value.value : 0;
      const rows = this?.uv?.rows ?? null;
      if (parent > 0 && rows !== null) {
        const parentIndex = rows.findIndex(row => {
          if (row.entityIds === undefined || Object.keys(row.entityIds)[0] === undefined)
            return -1;
          return row.entityIds[Object.keys(row.entityIds)[0]].id === parent;
        });
        if (parentIndex > -1) {
          localRow.extra.parent = parentIndex;
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

  createCommonLocalRow(row: IRowCommon): ITableRowExtra {
    const getRowAttr = (name: string) => tryDicts(name, row.attributes, this.uv.attributes);

    const extra: ITableRowExtra = {
      selected: false,
      searchText: "",
      visible: true,
      children: [],
      level: 0,
    };

    const style: Record<string, any> = {};
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
  const aValue = a.values[sortColumn].value;
  const bValue = b.values[sortColumn].value;
  if (aValue === null) {
    return 1;
  } else if (bValue === null) {
    return -1;
  } else if (aValue instanceof moment) {
    return (aValue as Moment).unix() - (bValue as Moment).unix();
  } else if (typeof aValue === "number") {
    return aValue - bValue;
  } else {
    return collator.compare(aValue, bValue);
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
    TableRow, TableFixedRow, Checkbox, TableCellEdit,
  },
})
export default class UserViewTable extends mixins<BaseUserView<LocalTableUserView, ITableValueExtra, ITableRowExtra, ITableUserViewExtra>>(BaseUserView) {
  @staging.Action("addAutoSaveLock") addAutoSaveLock!: () => Promise<AutoSaveLock>;
  @staging.Action("removeAutoSaveLock") removeAutoSaveLock!: (id: AutoSaveLock) => Promise<void>;
  @staging.Action("submit") submitChanges!: (_: { scope?: ScopeName; preReload?: () => Promise<void> }) => Promise<void>;
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
  private showEmptyRow = false;
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
    minHeight: 0
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
    return this.local.extra.columns.filter((item: any) => item.fixed).length;
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
    });
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
    } else {
      if (this.isTree)
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
          this.getEntries({ ref, reference: this.uid });
          this.keptEntries.insert(ref);
        }
      }
    }
  }

  private setShowEmptyRow(newValue: boolean) {
    const emptyRow = this.local.emptyRow;
    if (emptyRow !== null) {
      this.showEmptyRow = newValue;
      if (!newValue) {
        this.baseLocal.selectRow({ type: "new" }, false);
        emptyRow.local.values.forEach((_, colI) => {
          this.local.selectCell({ type: "new", column: colI }, false);
        });
      }
      nextRender().then(() => {
        const emptyRowRefElement = this.$refs.emptyRowRef as any | undefined;
        if (emptyRowRefElement !== undefined)
          this.cellEditByTarget({ type:"new", column: emptyRowRefElement.columnIndexes[0] }, emptyRowRefElement.$children[0].$el);
      });
    }
  }

  // Toggle children rows visibles.
  private visibleChildren(children: number[], visible: boolean) {

    //Save state.
    if( this.local.rows[children[0]] !== undefined) {
      const parent = this.local.rows[children[0]].extra.parent;
      if(parent === undefined)
        return;
      const extra = this.local.rows[parent].extra;
      if (visible) {
        this.rowsState[parent] = extra;
      } else {
        delete this.rowsState[parent];
        this.local.rows[parent].extra.arrowDown = false;
      }
    }

    // Toggle
    children.forEach( (child, i) => {

      if (!visible && this.local.rows[child].extra.visible) {
        this.visibleChildren(this.local.rows[child].extra.children, visible);

        // Hidden children.
        const childPosition = this.rowPositions.indexOf(child);
        this.rowPositions.splice(childPosition, 1);
      }

      this.local.rows[child].extra.visible = visible;
    })

    if (visible)
      this.displayChildren(children);
  }

  private displayChildren(children: number[]) {
    const parent = this.local.rows[children[0]].extra.parent;
    if (parent !== undefined)
      for (let i = children.length - 1; i >= 0; i--) {
        if (this.rowPositions.includes(children[i])) {
          const childPosition = this.rowPositions.indexOf(children[i]);
          this.rowPositions.splice(childPosition, 1);
        }
        this.rowPositions.splice(this.rowPositions.indexOf(parent) + 1, 0, children[i]);
      }
  }

  private initRowsState() {
    this.local.rows.forEach((row, rowI) => {
      if (row.extra.parent !== undefined &&  this.local.rows[row.extra.parent] !== undefined &&!this.local.rows[row.extra.parent].extra.children.includes(rowI)) {
        this.local.rows[row.extra.parent].extra.children.push(rowI);
        let level = 1;
        let parent = this.local.rows[row.extra.parent].extra.parent;
        while (parent !== undefined && this.local.rows[parent] !== undefined && level < 100) {
          parent = this.local.rows[parent].extra.parent;
          level++;
        }
        this.local.rows[rowI].extra.level = level;
      }
    })
    if (!R.isEmpty(this.rowsState)) {
      // Load visible data from rowsState to rows.
      for (const key in this.rowsState) {
        const id = this?.local?.rows[key]?.extra?.selectionEntry?.id ?? undefined;
        if (id !== undefined && id === this.rowsState[key].selectionEntry.id) {
          this.local.rows[key].extra.arrowDown = true;
          // nextRenderOneJump need for correct render rows after update. But be cearful with Chrome!
          // https://stackoverflow.com/questions/44145740/how-does-double-requestanimationframe-work
          nextRenderOneJump().then(() => {
            this.visibleChildren(this.local.rows[key].extra.children, true);
          });
        }
      }
    } else {
      this.buildRowPositions();
    }
  }

  private offTree() {
    this.isTree = false;
    this.buildRowPositions();
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
      } else if ("tree" in this.local.uv.attributes && this.local.uv.attributes.tree) {
        this.rowPositions = this.rowPositions.filter(rowI => this.local.rows[rowI].extra.visible);
        this.isTree = true;
      }
      this.sortRows();
      this.updateShowLength();
    }
  }

  private clickOutsideEdit(event: MouseEvent) {
    const element = event ? document.elementFromPoint(event.x, event.y) : null;
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

    if ('loss_of_focus_save' in this.uv.attributes && Boolean(this.uv.attributes['loss_of_focus_save']))
      this.submitChanges({ scope: this.scope });

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

  private setInputHeight(value: number) {
    this.cellEditHeight = value;
  }

  private setCoordsForEditCell(target: HTMLElement) {
    this.isSelectedLastFixedCell = target.classList.value.includes('next-after-last-fixed');

    const bodyRect = document.body.getBoundingClientRect();
    const rect = target.getBoundingClientRect();

    this.editCoords.x = rect.x;

    // If edit window lower than screen, raise the window up.
    // +54px for bottom panel.
    if (0 > bodyRect.bottom - rect.bottom - 54) {
      this.editCoords.y = bodyRect.bottom - this.editParams.height - 54;
      this.editParams.height += 54;
    } else {
      this.editCoords.y = rect.y;
    }
  }

  private clickCell(ref: ValueRef, event: MouseEvent | any) {
    this.removeCellEditing();

    // this.selectCell() breaks the timer for double click in iOS,
    // so when we're running iOS we don't check for double click
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

    this.cellEditHandler(ref, event.target);
  }

  private cellEditByTarget(ref: ValueRef, target: HTMLElement) {
    this.removeCellEditing();
    this.setCellEditing(ref);
    this.cellEditHandler(ref, target);
  }

  private cellEditHandler(ref: ValueRef, target: HTMLElement) {

    this.setCoordsForEditCell(target);
    this.editParams.width = target.offsetWidth;
    this.editParams.height = target.offsetHeight;
    this.editParams.minHeight = target.offsetHeight;

    this.selectCell(ref);
    if (this.lastSelectedValue &&
                !deepEquals(this.lastSelectedValue, ref) &&
                this.lastSelectedValue.type === "added") {
      const row = this.uv.newRows[this.lastSelectedValue.id];
      if (!row) {
        this.lastSelectedValue = null;
      } else if (isEmptyRow(row)) {
        const entity = this.uv.info.mainEntity;
        if (!entity) {
          throw new Error("View doesn't have a main entity");
        }

        this.resetAddedEntry({
          entityRef: entity,
          userView: this.uv.userViewKey,
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
        { name: this.$t("remove_selected_rows").toString(), callback: () => this.removeSelectedRows() },
        { name: this.$t("show_new_row").toString(), callback: () => this.setShowEmptyRow(true) },
      );
    }

    this.$emit("update:actions", actions);
    this.$emit("update:enableFilter", this.uv.rows !== null);

    this.updateRows();
  }

  private updateRows() {
    this.buildRowPositions();
    this.initRowsState();
    // this.setShowEmptyRow(this.uv.rows === null || this.uv.rows.length === 0);
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
    const selectedCount = this.baseLocal.selectedCount;
    const selected = (selectedCount > 0) ? `${selectedCount}/` : "";
    return `${selected}${this.uv.newRowsPositions.length + this.nonDeletedRowPositions.length}`;
  }

  @Watch("statusLine")
  private updateStatusLine() {
    this.setShowEmptyRow(false);
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
    /*let tableWidth = this.technicalWidth;
    for (const column of this.local.extra.columns) {
      tableWidth += column.width;
    }
    return tableWidth > screen.width && this.fixedRowColumnIndexes.length > 0;*/
    return false;
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

  table,
  th,
  td {
    border: 1px solid var(--MainBackgroundColor);
  }

  .button {
    background-color: transparent;
    border: none;
    border-radius: 5px;
    color: var(--MainTextColorLight);
    padding: 2px 5px;
    margin: 5px 0;
  }

  .button:hover {
    color: var(--MainTextColor);
  }

  .button:focus {
    outline: 0 !important;
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
    margin-bottom: 10px;
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

  /deep/ td > p {
    margin-bottom: 0;
  }

  th.fixed-column {
    z-index: 25; /* поверх обычных столбцов */
    box-shadow: 2px 2px 0 var(--MainBorderColor);
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

  .checkbox-cells,
  .openform-cells {
    text-align: center;
  }

  .openform-cells > span > i {
    position: absolute;
    top: 4px;
    left: 5px;
  }

  .checkbox-col,
  .open-form-col {
    width: 35px;
  }

  /deep/ .openform-cells {
    left: 35px;
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
