<i18n>
    {
      "en": {
        "clear": "Clear entries",
        "yes": "Yes",
        "no": "No",
        "paste_error": "Pasting error",
        "clear_error": "Clearing error",
        "cell_non_editable": "Non-editable cell",
        "paste_no_referencefield_data": "Clipboard has no reference field data",
        "add_entry": "Add entry",
        "add_entry_in_modal": "Add new entry (in modal)"
      },
      "ru": {
        "clear": "Очистить записи",
        "yes": "Да",
        "no": "Нет",
        "paste_error": "Ошибка при вставке",
        "clear_error": "Ошибка при очистке поля",
        "cell_non_editable": "Нередактируемая ячейка",
        "paste_no_referencefield_data": "В буфере обмена неверная информация для вставки в данное поле",
        "add_entry": "Добавить запись",
        "add_entry_in_modal": "Добавить новую запись (в модале)"
      }
    }
</i18n>

<template>
  <div
    v-hotkey="keymap"
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
        caption=""
        force-caption
        is-cell-edit
        autofocus
        modal-only
        @blur="removeCellEditing"
        @move-selection-next-row="moveSelectionNextRow"
        @move-selection-next-column="moveSelectionNextColumn"
        @set-input-height="setInputHeight"
        @update="updateCurrentValue"
        @close-modal-input="removeCellEditing"
      />
    </table-cell-edit>

    <div
      ref="tableContainer"
      class="tabl"
      data-infinite-wrapper
    >
      <div
        v-if="uv.emptyRow !== null"
        class="button-container"
      >
        <div
          class="button"
          @click="addNewRowOnPosition('top_front')"
        >
          <i class="material-icons">add</i>
          <span class="label">{{ this.$t('add_entry').toString() }}</span>
        </div>
      </div>

      <table
        :class="['custom-table', 'table', 'table-sm', 'b-table',
                 {'edit_active': editingValue !== null}]"
      >
        <colgroup>
          <col
            v-if="uv.extra.isSelectionColumnEnabled"
            class="checkbox-col"
          > <!-- Checkbox column -->
          <col
            v-if="hasLinksColumn"
            class="open-form-col"
          > <!-- Row link column -->
          <col
            v-for="i in columnIndexes"
            :key="i"
            class="data-col"
            :style="uv.extra.columns[i].style"
          >
        </colgroup>
        <thead
          class="table-head"
        >
          <tr>
            <th
              v-if="uv.extra.isSelectionColumnEnabled"
              class="fixed-column checkbox-cells table-th"
              @click="selectAllRows"
            >
              <checkbox :checked="selectedAll" />
            </th>
            <th
              v-if="hasLinksColumn"
              :class="[
                'table-th',
                'fixed-column',
                'openform-cells',
                {
                  'without-selection-cell': !uv.extra.isSelectionColumnEnabled,
                }
              ]"
            >
              <FunLink
                v-if="creationLink"
                :link="creationLink"
                @goto="$emit('goto', $event)"
              >
                <i
                  v-b-tooltip.hover.right.noninteractive
                  :title="$t('add_entry_in_modal')"
                  class="material-icons add-in-modal-icon"
                >add_box</i>
              </FunLink>
            </th>
            <th
              v-for="(i, index) in columnIndexes"
              :key="i"
              :class="['sorting', 'table-th', {
                'fixed-column' : uv.extra.columns[i].fixed,
                'th_after-last-fixed': lastFixedColumnIndex === index,
                'td-moz': isFirefoxBrowser
              }]"
              :style="uv.extra.columns[i].style"
              :title="uv.extra.columns[i].caption"
              @click="updateSort(i)"
            >
              <span class="table_header__content">
                {{ uv.extra.columns[i].caption }}
              </span>
              <span v-if="uv.extra.sortColumn === i">{{ uv.extra.sortAsc ? "▲" : "▼" }}</span>
            </th>
          </tr>
        </thead>
        <transition-group tag="tbody" name="fade-2">
          <TableRow
            v-for="(row, rowIndex) in shownRows"
            :key="row.key"
            :uv="uv"
            :row="row.row"
            :column-indexes="columnIndexes"
            :show-tree="showTree"
            :not-existing="row.notExisting"
            :show-link-column="hasLinksColumn"
            :row-index="rowIndex"
            @select="selectTableRow(rowIndex, $event)"
            @cell-click="clickCell({ ...row.ref, column: arguments[0] }, arguments[1])"
            @toggle-children="toggleChildren(row, $event)"
            @goto="$emit('goto', $event)"
          />
        </transition-group>
      </table>
      <infinite-loading
        v-if="!noMoreRows"
        spinner="spiral"
        @infinite="updateShowLength"
      >
        <template #no-results>
          <span />
        </template>
        <template #no-more>
          <span />
        </template>
        <template #error>
          <span />
        </template>
      </infinite-loading>
      <div
        v-if="noMoreRows && uv.emptyRow !== null"
        class="button-container"
      >
        <div
          class="button"
          @click="addNewRowOnPosition('bottom_back')"
        >
          <i class="material-icons">add</i>
          <span class="label">{{ this.$t('add_entry').toString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { namespace } from "vuex-class";
import InfiniteLoading, { StateChanger } from "vue-infinite-loading";
import { Moment, default as moment } from "moment";
import * as R from "ramda";
import { IResultColumnInfo, ValueType, RowId } from "ozma-api";

import { deepEquals, isFirefox, mapMaybe, nextRender, ObjectSet, tryDicts, ReferenceName, replaceHtmlLinks } from "@/utils";
import { valueIsNull } from "@/values";
import { UserView } from "@/components";
import { AddedRowId, AutoSaveLock } from "@/state/staging_changes";
import { IAttrToQueryOpts } from "@/state/query";
import BaseUserView, { IBaseRowExtra, IBaseValueExtra, IBaseViewExtra, baseUserViewHandler } from "@/components/BaseUserView";
import TableRow from "@/components/views/table/TableRow.vue";
import Checkbox from "@/components/checkbox/Checkbox.vue";
import TableCellEdit, { ICellCoords, IEditParams } from "@/components/views/table/TableCellEdit.vue";
import { Link, attrToLinkRef, attrToLinkSelf } from "@/links";
import {
  currentValue, IAddedRow, IAddedRowRef, ICombinedRow, ICombinedUserView, ICombinedUserViewAny, ICombinedValue, IExistingRowRef, IExtendedAddedRow,
  IExtendedRow, IExtendedRowCommon, IExtendedRowInfo, IExtendedValue, IRowCommon, IUserViewHandler, RowRef, ValueRef,
  valueToPunnedText,
} from "@/user_views/combined";
import { IEntriesRef, referenceEntriesRef } from "@/state/entries";

export interface IColumn {
  caption: string;
  style: Record<string, unknown>;
  visible: boolean;
  fixed: boolean;
  columnInfo: IResultColumnInfo;
  width: number; // in px
  treeUnfoldColumn: boolean;
  type: string;
}

export interface ITableValueExtra extends IBaseValueExtra {
  // FIXME: is this still needed? We could drop it and use computed properties in TableRows instead.
  valueText: string;
  valueFormatted: string;
  link: Link | null;
  style: Record<string, unknown> | null;
  selected: boolean;
  htmlElement: HTMLElement | null;
}

export interface ITableRowTree {
  parent: number | null;
  level: number;
  arrowDown: boolean;
  children: number[];
}

export interface ITableRowExtra extends IBaseRowExtra {
  searchText: string;
  shownAsNewRow: boolean;
  style: Record<string, unknown> | null;
  height: number | null;
  link: Link | null;
  tree: ITableRowTree;
}

export interface IAddedNewRowRef {
  type: "added";
  addedId: AddedRowId;
}

export interface ICommittedNewRowRef {
  type: "committed";
  id: RowId;
}

export type NewRowRef = IAddedNewRowRef | ICommittedNewRowRef;

export interface ITableViewExtra extends IBaseViewExtra {
  isSelectionColumnEnabled: boolean;
  hasRowLinks: boolean;
  selectedValues: ObjectSet<ValueRef>;
  columns: IColumn[];
  fixedColumnPositions: Record<number, string>;
  rowsParentPositions: Record<number, number>;
  linkOpts?: IAttrToQueryOpts;
  newRowTopSidePositions: NewRowRef[];
  newRowBottomSidePositions: NewRowRef[];
  sortColumn: number | null;
  sortAsc: boolean;
  sortOptions: Intl.CollatorOptions;
}

const showStep = 20;
const doubleClickTime = 700;
// FIXME: Use CSS variables to avoid this constant
const technicalFieldsWidth = 35; // checkbox's and openform's td width

const validNumberFormats = ["auto", "ru", "en"] as const;
type ValidNumberFormat = typeof validNumberFormats[number];
const makeMemoKey = (lang: ValidNumberFormat, fractionDigits?: number) => lang + String(fractionDigits);
const getNumberFormatter = R.memoizeWith(makeMemoKey, (lang: ValidNumberFormat, fractionDigits?: number) => {
  const locale = lang === "auto" ? undefined : lang;
  const options = fractionDigits === undefined ? undefined
    : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits };
  return Intl.NumberFormat(locale, options);
});

const createColumns = (uv: ICombinedUserViewAny): IColumn[] => {
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

    const textAlignRightTypes: (ValueType["type"])[] = ["int", "decimal"];
    const punOrValue: ValueType = columnInfo.punType ?? columnInfo.valueType;
    if (textAlignRightTypes.includes(punOrValue.type)) {
      style["text-align"] = "right";
    }

    const textAlignAttr = getColumnAttr("text_align");
    if (textAlignAttr !== undefined) {
      style["text-align"] = String(textAlignAttr);
    }

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

    columns[i] = {
      caption,
      style,
      visible: visibleColumn,
      fixed: fixedColumn,
      columnInfo,
      width: columnWidth,
      treeUnfoldColumn,
      type,
    };
  });

  if (!isTreeUnfoldColumnSet) {
    columns[0].treeUnfoldColumn = true;
  }

  return columns;
};

export type ITableCombinedUserView = ICombinedUserView<ITableValueExtra, ITableRowExtra, ITableViewExtra>;
export type ITableExtendedValue = IExtendedValue<ITableValueExtra>;
export type ITableExtendedRowInfo = IExtendedRowInfo<ITableRowExtra>;
export type ITableExtendedRow = IExtendedRow<ITableValueExtra, ITableRowExtra>;
export type ITableExtendedRowCommon = IExtendedRowCommon<ITableValueExtra, ITableRowExtra>;
export type ITableExtendedAddedRow = IExtendedAddedRow<ITableValueExtra, ITableRowExtra>;

const createCommonLocalValue = (uv: ITableCombinedUserView, row: IRowCommon & ITableExtendedRowInfo, columnIndex: number, value: ICombinedValue) => {
  const columnInfo = uv.info.columns[columnIndex];
  const columnAttrs = uv.columnAttributes[columnIndex];
  const getCellAttr = (name: string) => tryDicts(name, value.attributes, row.attributes, columnAttrs, uv.attributes);

  const valueText = valueToPunnedText(columnInfo.valueType, value);
  let valueFormatted = valueText;
  const style: Record<string, unknown> = {};

  const punOrValueType: ValueType = columnInfo.punType ?? columnInfo.valueType;

  const numberTypes: (ValueType["type"])[] = ["int", "decimal"];
  if (numberTypes.includes(punOrValueType.type)) {
    style["text-align"] = "right";

    const numberFormat = getCellAttr("number_format");
    if (typeof numberFormat === "string" && validNumberFormats.includes(numberFormat.toLowerCase() as any)) {
      const fractionDigitsRaw = getCellAttr("fraction_digits");
      const fractionDigits = typeof fractionDigitsRaw === "number" ? fractionDigitsRaw : undefined;
      valueFormatted = getNumberFormatter(numberFormat.toLowerCase() as any, fractionDigits).format(value.value as any);
    }
  } else if (punOrValueType.type === "string") {
    valueFormatted = replaceHtmlLinks(valueText);
  }

  const cellColor = getCellAttr("cell_color");
  if (cellColor !== undefined && cellColor !== null) {
    style["background-color"] = String(cellColor);
  }

  const textAlignAttr = getCellAttr("text_align");
  if (textAlignAttr !== undefined) {
    style["text-align"] = String(textAlignAttr);
  }

  if (row.extra.height !== undefined) {
    style["height"] = `${row.extra.height}px`;
  }

  const fixedPosition = uv.extra.fixedColumnPositions[columnIndex];
  if (fixedPosition !== undefined) {
    style["left"] = fixedPosition;
  }

  const extra = {
    valueText,
    valueFormatted,
    style: null as Record<string, unknown> | null,
  };
  if (!R.isEmpty(style)) {
    extra.style = style;
  }
  return extra;
};

const createCommonLocalRow = (uv: ITableCombinedUserView, row: IRowCommon, oldLocal: ITableRowExtra | null) => {
  const getRowAttr = (name: string) => tryDicts(name, row.attributes, uv.attributes);

  const style: Record<string, unknown> = {};

  const defaultArrow = Boolean(getRowAttr("tree_all_open"));

  const tree: ITableRowTree = {
    children: [],
    level: 0,
    parent: null,
    arrowDown: oldLocal?.tree.arrowDown ?? defaultArrow,
  };

  const extra = {
    searchText: "",
    height: null as number | null,
    style: null as Record<string, unknown> | null,
    link: null,
    shownAsNewRow: false,
    tree,
  };

  const height = Number(getRowAttr("row_height"));
  if (!Number.isNaN(height)) {
    style["white-space"] = "nowrap";
    extra.height = height;
  }

  if (!R.isEmpty(style)) {
    extra.style = style;
  }

  return extra;
};

const updateCommonValue = (uv: ITableCombinedUserView, row: ITableExtendedRowCommon, columnIndex: number, value: ITableExtendedValue) => {
  const columnInfo = uv.info.columns[columnIndex];

  value.extra.valueText = valueToPunnedText(columnInfo.valueType, value);
  // TODO: after paste and before save value is unformatted.
  value.extra.valueFormatted = valueToPunnedText(columnInfo.valueType, value);
};

const postInitCommonRow = (uv: ITableCombinedUserView, row: ITableExtendedRowCommon) => {
  const searchStrings = row.values.map(value => {
    return value.extra.valueText.toLocaleLowerCase();
  });
  row.extra.searchText = "\0".concat(...searchStrings);
};

const initTreeChildren = (uv: ITableCombinedUserView) => {
  uv.rows!.forEach((row, i) => {
    if (row.extra.tree.parent) {
      const parentIndex = uv.extra.rowsParentPositions[row.extra.tree.parent];
      uv.rows![parentIndex].extra.tree.children.push(i);

      let level = 0;
      let parent: number | undefined = parentIndex;
      while (parent !== undefined && uv.rows![parent] !== undefined) {
        const index: number | undefined = uv.rows![parent].extra.tree.parent ?? undefined;
        parent = index !== undefined ? uv.extra.rowsParentPositions[index] : undefined;
        level++;
      }
      uv.rows![i].extra.tree.level = level;
    }
  });

  return uv;
};

const technicalWidth = (uv: ITableCombinedUserView): number => {
  let left = 0;
  if (uv.extra.isSelectionColumnEnabled) {
    left += technicalFieldsWidth;
  }
  if (uv.extra.hasRowLinks) {
    left += technicalFieldsWidth;
  }
  return left;
};

const fixedColumnPositions = (uv: ITableCombinedUserView): Record<number, string> => {
  let left = technicalWidth(uv);
  const fixedColumnIndexes = mapMaybe((col, colI) => col.fixed ? colI : undefined, uv.extra.columns);
  const positions: Record<number, string> = {};
  for (const fixedColumnIndex of fixedColumnIndexes) {
    positions[fixedColumnIndex] = `${left}px`;
    left += uv.extra.columns[fixedColumnIndex].width;
  }
  return positions;
};

const equalNewRowRef = (a: NewRowRef, b: NewRowRef): boolean => {
  return a.type === b.type && (
    (a.type === "added" && a.addedId === (b as IAddedNewRowRef).addedId) ||
    (a.type === "committed" && a.id === (b as ICommittedNewRowRef).id));
};

const deleteFromPositions = (ref: NewRowRef, extra: ITableViewExtra) => {
  extra.newRowTopSidePositions = extra.newRowTopSidePositions.filter(r => !equalNewRowRef(ref, r));
  extra.newRowBottomSidePositions = extra.newRowBottomSidePositions.filter(r => !equalNewRowRef(ref, r));
};

const inheritOldRowsPosition = (uv: ITableCombinedUserView, pos: NewRowRef): NewRowRef | null => {
  if (pos.type === "added") {
    const newRow = uv.newRows[pos.addedId];
    if (newRow) {
      return pos;
    } else {
      const rowIndex = uv.oldCommittedRows[pos.addedId];
      if (rowIndex === undefined) {
        return null;
      }
      const row = uv.rows![rowIndex];
      return { type: "committed", id: row.mainId! };
    }
  } else if (pos.type === "committed") {
    if (!(pos.id in uv.mainRowMapping)) {
      return null;
    }
    return { type: "committed", id: pos.id };
  } else {
    throw new Error("Impossible");
  }
};

const inheritOldRowsPositions = (uv: ITableCombinedUserView, positions: NewRowRef[]): NewRowRef[] => {
  return mapMaybe(pos => inheritOldRowsPosition(uv, pos) ?? undefined, positions);
};

interface INewRow {
  row: ITableExtendedRow | ITableExtendedAddedRow;
  ref: IExistingRowRef | IAddedRowRef;
}

const getNewRow = (uv: ITableCombinedUserView, pos: NewRowRef): INewRow => {
  if (pos.type === "added") {
    return {
      ref: {
        type: "added",
        id: pos.addedId,
      },
      row: uv.newRows[pos.addedId],
    };
  } else {
    // We are sure this row ref is to an existing value.
    const ref = uv.mainRowMapping[pos.id][0] as IExistingRowRef;
    return {
      ref,
      row: uv.rows![ref.position],
    };
  }
};

interface IAddedValueMeta {
  side: "top_front" | "top_back" | "bottom_back";
}

const isAddedValueMeta = (obj: unknown): obj is IAddedValueMeta => {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const side = (obj as any).side;
  return side === "top_front" || side === "top_back" || side === "bottom_back";
};

export const tableUserViewHandler: IUserViewHandler<ITableValueExtra, ITableRowExtra, ITableViewExtra> = {
  ...baseUserViewHandler,

  createLocalValue(
    uv: ITableCombinedUserView,
    rowIndex: number,
    row: ICombinedRow & ITableExtendedRowInfo,
    columnIndex: number,
    value: ICombinedValue,
    oldView: ITableViewExtra | null,
    oldRow: ITableRowExtra | null,
    oldValue: ITableValueExtra | null,
  ): ITableValueExtra {
    const baseExtra = baseUserViewHandler.createLocalValue(uv, rowIndex, row, columnIndex, value, oldView, oldRow, oldValue);
    const commonExtra = createCommonLocalValue(uv, row, columnIndex, value);

    const columnInfo = uv.info.columns[columnIndex];
    const columnAttrs = uv.columnAttributes[columnIndex];
    const getCellAttr = (name: string) => tryDicts(name, value.attributes, row.attributes, columnAttrs, uv.attributes);

    const link = value.info?.field?.fieldType.type === "reference" ? attrToLinkRef(getCellAttr("link"), currentValue(value), uv.extra.linkOpts) : null;
    const currLinkForRow = value.info ? attrToLinkSelf(getCellAttr("row_link"), value.info, uv.extra.linkOpts) : null;
    if (currLinkForRow) {
      row.extra.link = currLinkForRow;
      uv.extra.hasRowLinks = true;
    }

    if (value.info) {
      if (getCellAttr("tree_parent_ids")) {
        // Init indexes by ids
        uv.extra.rowsParentPositions[value.info.id!] = rowIndex;

        // Init parent
        if (value.value !== null) {
          row.extra.tree.parent = Number(value.value);
        }
      }
    }

    const selected = (oldValue?.selected ?? false) && !row.deleted;
    if (selected) {
      uv.extra.selectedValues.insert({
        type: "existing",
        position: rowIndex,
        column: columnIndex,
      });
    }

    return {
      ...baseExtra,
      ...commonExtra,
      selected,
      link,
      htmlElement: null,
    };
  },

  createAddedLocalValue(
    uv: ITableCombinedUserView,
    rowId: AddedRowId,
    row: IAddedRow & ITableExtendedRowInfo,
    columnIndex: number,
    value: ICombinedValue,
    oldView: ITableViewExtra | null,
    oldRow: ITableRowExtra | null,
    oldValue: ITableValueExtra | null,
  ) {
    const baseExtra = baseUserViewHandler.createAddedLocalValue(uv, rowId, row, columnIndex, value, oldView, oldRow, oldValue);
    const commonExtra = createCommonLocalValue(uv, row, columnIndex, value);

    const selected = oldValue?.selected ?? false;
    if (selected) {
      uv.extra.selectedValues.insert({
        type: "added",
        id: rowId,
        column: columnIndex,
      });
    }
    return {
      ...baseExtra,
      ...commonExtra,
      selected,
      htmlElement: null,
      link: null,
    };
  },

  createEmptyLocalValue(
    uv: ITableCombinedUserView,
    row: IRowCommon & ITableExtendedRowInfo,
    columnIndex: number,
    value: ICombinedValue,
    oldView: ITableViewExtra | null,
    oldRow: ITableRowExtra | null,
    oldValue: ITableValueExtra | null,
  ) {
    const baseExtra = baseUserViewHandler.createEmptyLocalValue(uv, row, columnIndex, value, oldView, oldRow, oldValue);
    const commonExtra = createCommonLocalValue(uv, row, columnIndex, value);

    const selected = oldValue?.selected ?? false;
    if (selected) {
      uv.extra.selectedValues.insert({
        type: "new",
        column: columnIndex,
      });
    }
    return {
      ...baseExtra,
      ...commonExtra,
      selected,
      htmlElement: null,
      link: null,
    };
  },

  updateValue(uv: ITableCombinedUserView, rowIndex: number, row: ITableExtendedRow, columnIndex: number, value: ITableExtendedValue) {
    baseUserViewHandler.updateValue(uv, rowIndex, row, columnIndex, value);
    updateCommonValue(uv, row, columnIndex, value);
  },

  updateAddedValue(uv: ITableCombinedUserView, rowId: number, row: ITableExtendedAddedRow, columnIndex: number, value: ITableExtendedValue) {
    baseUserViewHandler.updateAddedValue(uv, rowId, row, columnIndex, value);
    updateCommonValue(uv, row, columnIndex, value);
  },

  updateEmptyValue(uv: ITableCombinedUserView, columnIndex: number, value: ITableExtendedValue) {
    baseUserViewHandler.updateEmptyValue(uv, columnIndex, value);
    updateCommonValue(uv, uv.emptyRow!, columnIndex, value);
  },

  createLocalRow(uv: ITableCombinedUserView, rowIndex: number, row: ICombinedRow, oldView: ITableViewExtra | null, oldRow: ITableRowExtra | null) {
    const baseExtra = baseUserViewHandler.createLocalRow(uv, rowIndex, row, oldView, oldRow);
    const commonExtra = createCommonLocalRow(uv, row, oldRow);
    return {
      ...commonExtra,
      ...baseExtra,
    };
  },

  createAddedLocalRow(uv: ITableCombinedUserView, rowId: AddedRowId, row: IAddedRow, oldView: ITableViewExtra | null, oldRow: ITableRowExtra | null, meta?: unknown) {
    const baseExtra = baseUserViewHandler.createAddedLocalRow(uv, rowId, row, oldView, oldRow);
    const commonExtra = createCommonLocalRow(uv, row, oldRow);
    const newRef: NewRowRef = {
      type: "added",
      addedId: rowId,
    };
    if (!uv.extra.newRowTopSidePositions.find(ref => equalNewRowRef(newRef, ref))
      && !uv.extra.newRowBottomSidePositions.find(ref => equalNewRowRef(newRef, ref))
    ) {
      const side = isAddedValueMeta(meta) ? meta.side : "top_back";
      if (side === "top_front") {
        uv.extra.newRowTopSidePositions.splice(0, 0, newRef);
      } else if (side === "top_back") {
        uv.extra.newRowTopSidePositions.push(newRef);
      } else if (side === "bottom_back") {
        uv.extra.newRowBottomSidePositions.push(newRef);
      } else {
        throw new Error("Impossible");
      }
    }
    return {
      ...commonExtra,
      ...baseExtra,
    };
  },

  createEmptyLocalRow(uv: ITableCombinedUserView, row: IRowCommon, oldView: ITableViewExtra | null, oldRow: ITableRowExtra | null) {
    const baseExtra = baseUserViewHandler.createEmptyLocalRow(uv, row, oldView, oldRow);
    const commonExtra = createCommonLocalRow(uv, row, oldRow);
    return {
      ...commonExtra,
      ...baseExtra,
    };
  },

  postInitRow(uv: ITableCombinedUserView, rowIndex: number, row: ITableExtendedRow) {
    baseUserViewHandler.postInitRow(uv, rowIndex, row);
    postInitCommonRow(uv, row);
  },

  postInitAddedRow(uv: ITableCombinedUserView, rowId: AddedRowId, row: ITableExtendedAddedRow) {
    baseUserViewHandler.postInitAddedRow(uv, rowId, row);
    postInitCommonRow(uv, row);
  },

  deleteRow(uv: ITableCombinedUserView, rowIndex: number, row: ITableExtendedRow) {
    baseUserViewHandler.deleteRow(uv, rowIndex, row);
    row.values.forEach((value, colI) => {
      if (value.extra.selected) {
        value.extra.selected = false;
        uv.extra.selectedValues.delete({
          type: "existing",
          position: rowIndex,
          column: colI,
        });
      }
    });
  },

  deleteAddedRow(uv: ITableCombinedUserView, rowId: AddedRowId, row: ITableExtendedAddedRow) {
    baseUserViewHandler.deleteAddedRow(uv, rowId, row);
    row.values.forEach((value, colI) => {
      if (value.extra.selected) {
        value.extra.selected = false;
        uv.extra.selectedValues.delete({
          type: "added",
          id: rowId,
          column: colI,
        });
      }
    });
    if (row.newId === undefined) {
      deleteFromPositions({ type: "added", addedId: rowId }, uv.extra);
    }
  },

  createLocalUserView(uv: ITableCombinedUserView, oldView: ITableViewExtra | null) {
    const baseExtra = baseUserViewHandler.createLocalUserView(uv, oldView);
    const columns = createColumns(uv);

    const disableSelectionColumn = uv.attributes["disable_selection_column"];
    const isSelectionColumnEnabled = typeof disableSelectionColumn === "boolean"
      ? !disableSelectionColumn
      : true;

    const newRowTopSidePositions = oldView ? inheritOldRowsPositions(uv, oldView.newRowTopSidePositions) : [];
    const newRowBottomSidePositions = oldView ? inheritOldRowsPositions(uv, oldView.newRowBottomSidePositions) : [];

    return {
      ...baseExtra,
      isSelectionColumnEnabled,
      hasRowLinks: false,
      selectedValues: new ObjectSet<ValueRef>(),
      columns,
      fixedColumnPositions: {},
      rowsParentPositions: oldView ? oldView.rowsParentPositions : {},
      newRowTopSidePositions,
      newRowBottomSidePositions,
      linkOpts: uv.homeSchema ? { homeSchema: uv.homeSchema } : {},
      sortAsc: oldView?.sortAsc ?? true,
      sortColumn: oldView?.sortColumn ?? null,
      sortOptions: oldView?.sortOptions ?? {},
      rowPositions: [],
    };
  },

  postInitUserView(uv: ITableCombinedUserView) {
    if (!R.isEmpty(uv.extra.rowsParentPositions)) {
      uv = initTreeChildren(uv);
    }

    uv.extra.fixedColumnPositions = fixedColumnPositions(uv);
    Object.entries(uv.extra.fixedColumnPositions).forEach(([colIRaw, position]) => {
      const colI = Number(colIRaw);
      uv.extra.columns[colI].style["left"] = position;

      uv.forEachRow(row => {
        const value = row.values[colI];

        let style = value.extra.style;
        if (style === null) {
          style = {};
          value.extra.style = style;
        }
        style["left"] = position;
      });
    });

    for (const pos of [...uv.extra.newRowTopSidePositions, ...uv.extra.newRowBottomSidePositions]) {
      if (pos.type === "committed") {
        // `index.type === "existing"` here; "added" may only appear after a commit.
        const index = uv.mainRowMapping[pos.id][0] as IExistingRowRef;
        uv.rows![index.position].extra.shownAsNewRow = true;
      }
    }
  },
};

const rowContains = (row: ITableExtendedRowCommon, searchWords: string[]) => {
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

const parseFromClipboard = (event: ClipboardEvent): number | null | undefined => {
  const serialized = event.clipboardData?.getData("text/html");
  if (serialized === undefined) return undefined;

  const parsed = (new DOMParser()).parseFromString(serialized, "application/xml");
  if (parsed.documentElement.nodeName !== "parsererror") {
    const valueJson = parsed.documentElement.attributes.getNamedItem("data-ozma-value")?.value;
    if (valueJson !== undefined) {
      const value = JSON.parse(valueJson) as number | null;
      return value;
    }
  }
  return undefined;
};

const serializeToClipboard = (event: ClipboardEvent, value: unknown, valueText: string): void => {
  const valueJson = JSON.stringify(value);
  const span = document.createElement("span");
  span.setAttribute("data-ozma-value", valueJson);
  span.textContent = valueText;
  const valueXml = (new XMLSerializer()).serializeToString(span);

  event.clipboardData?.setData("text/html", valueXml);
};

interface ITableEditing {
  lock: AutoSaveLock;
  ref: ValueRef;
}

const entries = namespace("entries");
const staging = namespace("staging");

interface IShownRow {
  key: string;
  row: ITableExtendedRowCommon;
  notExisting: boolean;
  ref: RowRef;
}

type MoveDirection = "up" | "right" | "down" | "left";

@UserView({
  handler: tableUserViewHandler,
})
@Component({
  components: {
    TableRow, Checkbox, TableCellEdit, InfiniteLoading,
  },
})
export default class UserViewTable extends mixins<BaseUserView<ITableValueExtra, ITableRowExtra, ITableViewExtra>>(BaseUserView) {
  @staging.Action("addAutoSaveLock") addAutoSaveLock!: () => Promise<AutoSaveLock>;
  @staging.Action("removeAutoSaveLock") removeAutoSaveLock!: (id: AutoSaveLock) => Promise<void>;
  @entries.Mutation("removeEntriesConsumer") removeEntriesConsumer!: (args: { ref: IEntriesRef; reference: ReferenceName }) => void;
  @entries.Mutation("addEntriesConsumer") addEntriesConsumer!: (args: { ref: IEntriesRef; reference: ReferenceName }) => void;

  // These two aren't computed properties for performance. They are computed during `init()` and mutated when other values change.
  // If `init()` is called again, their values after recomputation should be equal to those before it.
  private currentFilter: string[] = [];
  private rowPositions: number[] = [];
  private showLength = 0;
  private lastSelectedRow: number | null = null;
  private lastSelectedValue: ValueRef | null = null;
  private editing: ITableEditing | null = null;
  private printListener: { query: MediaQueryList; queryCallback: (mql: MediaQueryListEvent) => void; printCallback: () => void } | null = null;
  private clickTimeoutId: NodeJS.Timeout | null = null;
  private isFirefoxBrowser: boolean = isFirefox();
  // FIXME: we should get rid of this.
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

  // Used for Tab-Enter selection moving.
  // Probably need to move to extra.
  private columnDelta = 0;

  private get keymap() {
    return {
      "enter": () => this.onPressEnter(),
      "tab": () => this.onPressTab(),
      "shift+tab": () => this.onPressTab(),
      "esc": () => this.removeCellEditing(),
      "delete": () => this.clearSelectedCell(),
      "up": () => this.moveSelection("up"),
      "right": () => this.moveSelection("right"),
      "down": () => this.moveSelection("down"),
      "left": () => this.moveSelection("left"),
      // TODO: make pageup/pagedown movement depend on real page size, not just 5 rows.
      "pagedown": () => this.moveSelection("down", { step: 5 }),
      "pageup": () => this.moveSelection("up", { step: 5 }),
    };
  }

  // Finds vusual position of selected cell.
  // FIXME: bad performance!
  private getSelectedCellPosition(): { row: number; column: number } | null {
    const valueRef = this.getSelectedCell();
    if (!valueRef) return null;

    const rowWithSelectedCell = this.uv.getRowByRef(valueRef);
    if (!rowWithSelectedCell) return null;
    const rowI = this.shownRows.findIndex(row => row.row === rowWithSelectedCell);
    return { row: rowI, column: this.getVisualColumnIndex(valueRef.column) };
  }

  private getSelectedCell(): ValueRef | null {
    return this.uv.extra.selectedValues.keys()[0] ?? null;
  }

  // `columnIndexes` is 'visual index -> state index' mapping, this function do opposite.
  // 'visual' indexes are as they look in table for a user.
  // 'state' indexes are as they described in userview query, including ones with `visible = false` and so on.
  private getVisualColumnIndex(stateIndex: number) {
    return this.columnIndexes.indexOf(stateIndex);
  }

  private moveSelection(
    direction: MoveDirection,
    options: { step?: number; resetColumnDelta?: boolean } = { step: 1, resetColumnDelta: true },
  ): boolean {
    if (options?.resetColumnDelta ?? true) {
      this.columnDelta = 0;
    }
    const oldPosition = this.getSelectedCellPosition();
    if (!oldPosition) return false;
    const maxRow = this.shownRows.length - 1;
    const maxColumn = this.columnIndexes.length - 1;

    /* eslint-disable no-multi-spaces, comma-spacing, key-spacing, space-in-parens */
    const calcDelta = (decDirection: MoveDirection, incDirection: MoveDirection) =>
      (options?.step ?? 1) * ((direction === incDirection ? 1 : 0) - (direction === decDirection ? 1 : 0));
    const rowDelta    = calcDelta("up"  , "down" );
    const columnDelta = calcDelta("left", "right");

    const newPosition = {
      row   : R.clamp(0, maxRow   , oldPosition.row    + rowDelta   ),
      column: R.clamp(0, maxColumn, oldPosition.column + columnDelta),
    };
    /* eslint-enable no-multi-spaces, comma-spacing, key-spacing, space-in-parens */

    const valueRef = {
      ...this.shownRows[newPosition.row].ref,
      column: this.columnIndexes[newPosition.column],
    };
    this.selectCell(valueRef);
    // TODO: fix scrolling to first row and to first non-fixed columns when there are fixed columns.
    this.getCellElement(valueRef)?.scrollIntoView({ block: "nearest" });

    return !deepEquals(oldPosition, newPosition);
  }

  private moveSelectionNextColumn() {
    const isMoved = this.moveSelection("right", { resetColumnDelta: false });
    if (isMoved) {
      this.columnDelta += 1;
    }
    this.editSelectedCell();
  }

  private moveSelectionNextRow() {
    this.moveSelection("down", { resetColumnDelta: false });
    this.moveSelection("left", { step: this.columnDelta });
    this.columnDelta = 0;
    this.editSelectedCell();
  }

  private getCellElement(valueRef: ValueRef): HTMLElement | null {
    return this.uv.getValueByRef(valueRef)?.value.extra.htmlElement ?? null;
  }

  private editSelectedCell() {
    const valueRef = this.getSelectedCell();
    if (!valueRef) return;

    this.cellEditByTarget(valueRef, this.getCellElement(valueRef) as any);
  }

  get columnIndexes() {
    const columns = this.uv.extra.columns.map((column, index) => ({
      index,
      fixed: column.fixed,
      visible: column.visible,
    })).filter(c => c.visible);
    const fixed = columns.filter(c => c.fixed);
    const nonFixed = columns.filter(c => !c.fixed);
    return fixed.concat(nonFixed).map(c => c.index);
  }

  get fixedColumnIndexes() {
    return mapMaybe((col, colI) => col.fixed ? colI : undefined, this.uv.extra.columns);
  }

  get lastFixedColumnIndex(): number {
    return this.uv.extra.columns.filter(item => item.fixed).length;
  }

  get editingLocked() {
    if (this.editing === null) {
      return false;
    } else {
      return this.editing.ref.type !== "existing" && this.addedLocked;
    }
  }

  get hasLinksColumn() {
    return this.uv.extra.hasRowLinks || this.creationLink !== null;
  }

  get editingValue() {
    if (this.editing === null
     || this.editingNonNullableBoolean // Bools are special case because they toggles by double click.
    ) {
      return null;
    } else {
      const value = this.uv.getValueByRef(this.editing.ref);
      if (!value) {
        return null;
      } else {
        const columnInfo = this.uv.info.columns[this.editing.ref.column];
        const columnAttrs = this.uv.columnAttributes[this.editing.ref.column];
        const type = columnInfo.valueType;
        const attributes = { ...this.uv.attributes, ...columnAttrs, ...value.row.attributes, ...value.value.attributes };
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
          this.showLength = this.uv.rows?.length ?? 0;
        }
      };
      const query = window.matchMedia("print");
      query.addListener(queryCallback);
      const printCallback = () => {
        this.showLength = this.uv.rows?.length ?? 0;
      };
      window.addEventListener("beforeprint", printCallback);
      this.printListener = { query, queryCallback, printCallback };
    }
  }

  @Watch("uv")
  protected uvChanged() {
    this.init();
    this.updateRows();
  }

  private deselectAllCells() {
    this.uv.extra.selectedValues.keys().forEach(key => {
      this.selectValue(key, false);
    });
    this.lastSelectedRow = null;
    this.lastSelectedValue = null;
  }

  private copySelectedCell(event: ClipboardEvent) {
    if (this.editing) return;
    const valueRef = this.getSelectedCell();
    if (!valueRef) return;
    event.preventDefault();

    const value = this.uv.getValueByRef(valueRef)!.value;
    const valueText = value.extra.valueText;
    event.clipboardData?.setData("text/plain", valueText);

    const sourceColumnType = this.uv.info.columns[valueRef.column].mainField?.field.fieldType.type;
    if (sourceColumnType === "reference") {
      serializeToClipboard(event, value.value, valueText);
    }
  }

  private cutSelectedCell(event: ClipboardEvent) {
    if (this.editing) return;
    this.copySelectedCell(event);
    this.clearSelectedCell();
  }

  private pasteToSelectedCell(event: ClipboardEvent) {
    if (this.editing) return;
    const valueRef = this.getSelectedCell();
    if (!valueRef) return;

    const value = this.uv.getValueByRef(valueRef)!.value;
    if (!value.info || !value.info.field) {
      this.$bvToast.toast(this.$t("cell_non_editable").toString(), {
        title: this.$t("paste_error").toString(),
        variant: "danger",
        solid: true,
      });
      return;
    }

    const targetColumnType = this.uv.info.columns[valueRef.column].mainField?.field.fieldType.type;
    if (targetColumnType === "reference") {
      const parsed = parseFromClipboard(event);
      if (parsed !== undefined) {
        void this.updateValue(valueRef, parsed);
      } else {
        this.$bvToast.toast(this.$t("paste_no_referencefield_data").toString(), {
          title: this.$t("paste_error").toString(),
          variant: "danger",
          solid: true,
        });
      }
    } else {
      const sourcePlain = event.clipboardData?.getData("text/plain");
      void this.updateValue(valueRef, sourcePlain);
    }

    event.preventDefault();
  }

  private clearSelectedCell() {
    const valueRef = this.getSelectedCell();
    if (!valueRef) return;

    const value = this.uv.getValueByRef(valueRef)!.value;
    if (!value.info || !value.info.field) {
      this.$bvToast.toast(this.$t("cell_non_editable").toString(), {
        title: this.$t("clear_error").toString(),
        variant: "danger",
        solid: true,
      });
      return;
    }

    void this.updateValue(valueRef, "");
  }

  private onPressEnter() {
    if (this.editing) {
      this.removeCellEditing();
      this.moveSelectionNextRow();
    } else {
      this.editSelectedCell();
    }
  }

  private onPressTab() {
    if (this.editing) {
      this.removeCellEditing();
      this.moveSelectionNextColumn();
    } else {
      this.moveSelection("right");
    }
  }

  private onOtherTableClicked() {
    this.deselectAllCells();
    this.removeCellEditing();
  }

  private get rootEvents(): [name: string, callback: (event: ClipboardEvent) => void][] {
    /* eslint-disable @typescript-eslint/unbound-method */
    return [
      ["copy", this.copySelectedCell],
      ["cut", this.cutSelectedCell],
      ["paste", this.pasteToSelectedCell],
      ["cell-click", this.onOtherTableClicked],
      ["form-input-focused", this.deselectAllCells],
    ];
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  protected mounted() {
    /* eslint-disable @typescript-eslint/unbound-method */
    (this.$refs.tableContainer as HTMLElement).addEventListener("scroll", this.removeCellEditing);
    this.rootEvents.forEach(([name, callback]) => this.$root.$on(name, callback));
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  protected beforeDestroy() {
    /* eslint-disable @typescript-eslint/unbound-method */
    (this.$refs.tableContainer as HTMLElement).removeEventListener("scroll", this.removeCellEditing);
    this.rootEvents.forEach(([name, callback]) => this.$root.$off(name, callback));
    /* eslint-enable @typescript-eslint/unbound-method */

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
      this.rowPositions = this.rowPositions.filter(rowI => rowContains(this.uv.rows![rowI], newWords));
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
          void this.addEntriesConsumer({ ref, reference: this.uid });
          this.keptEntries.insert(ref);
        }
      }
    }
  }

  private async addNewRowOnPosition(side: IAddedValueMeta["side"]): Promise<void> {
    const rowId = await this.addNewRow({ side });

    const firstNotDisabledColumn = this.uv.newRows[rowId].values.findIndex((value, i) => {
      return value.info !== undefined && this.uv.extra.columns[i].visible;
    });
    const firstNotDisabledDOMColumn = this.columnIndexes.indexOf(firstNotDisabledColumn);
    if (firstNotDisabledDOMColumn === -1) return;

    void nextRender().then(() => {
      const sideName = side === "bottom_back" ? "newRowsBottomSideRef" : "newRowsTopSideRef";
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

  private showTreeChildren(parentIndex: number) {
    const children = this.uv.rows![parentIndex].extra.tree.children;

    this.uv.rows![parentIndex].extra.tree.arrowDown = true;

    const parentPosition = this.rowPositions.indexOf(parentIndex);
    const leftChank = this.rowPositions.splice(0, parentPosition + 1);
    const rightChank = this.rowPositions;
    this.rowPositions = leftChank.concat(children, rightChank);
  }

  private hideTreeChildren(parentIndex: number) {
    const children = this.uv.rows![parentIndex].extra.tree.children;
    this.uv.rows![parentIndex].extra.tree.arrowDown = false;

    children.forEach(child => {
      const childPosition = this.rowPositions.indexOf(child);
      this.rowPositions.splice(childPosition, 1);

      if (this.uv.rows![child].extra.tree.arrowDown) {
        this.hideTreeChildren(child);
      }
    });
  }

  private toggleChildren(row: IShownRow, visible: boolean) {
    if (visible) {
      this.showTreeChildren(Number(row.key));
    } else {
      this.hideTreeChildren(Number(row.key));
    }
  }

  get showTree() {
    if (!R.isEmpty(this.uv.extra.rowsParentPositions) && this.filter.length === 0) {
      return true;
    }
    return false;
  }

  private pushTreeChildrenPositions(parentIndex: number, children: number[]) {
    let newRowPositions: number[] = [parentIndex];

    children.forEach(child => {
      const row = this.uv.rows![child].extra.tree;
      if (row.arrowDown) {
        newRowPositions = newRowPositions.concat(this.pushTreeChildrenPositions(child, row.children));
      } else {
        newRowPositions.push(child);
      }
    });
    return newRowPositions;
  }

  get initialRowPositions() {
    const rowPositions = this.uv.rows!.map((row, rowI) => rowI);

    const topLevelRows = rowPositions.filter(rowI => this.uv.rows![rowI].extra.tree.parent === null);
    let newRowPositions: number[] = [];
    topLevelRows.forEach(rowI => {
      const row = this.uv.rows![rowI].extra.tree;
      if (row.arrowDown) {
        newRowPositions = newRowPositions.concat(this.pushTreeChildrenPositions(rowI, row.children));
      } else {
        newRowPositions.push(rowI);
      }
    });

    return newRowPositions;
  }

  // Update this.rowsPositions when this.uv.rows has changed.
  private buildRowPositions() {
    const rows = this.uv.rows;
    if (rows === null) {
      this.rowPositions = [];
    } else {
      this.rowPositions = rows.map((row, rowI) => rowI);
      if (this.filter.length !== 0) {
        this.rowPositions = this.rowPositions.filter(rowI => rowContains(this.uv.rows![rowI], this.filter));
      } else if (this.showTree) {
        this.rowPositions = this.initialRowPositions;
      }
      this.sortRows();
    }
  }

  private clickOutsideEdit(event: Event) {
    const element = (event instanceof MouseEvent) ? document.elementFromPoint(event.x, event.y) : null;
    // Fix for case when some cell is being edited and modal opens,
    // otherwise any click on this modal will close the cell editing and modal too.
    // FIXME: rely on CSS-classes for logic is bad thing, fix it someone, please.
    if ((element?.closest(".v--modal-box") && !this.$el.closest(".v--modal-box"))
     || (element?.closest(".modal__tab-content") !== this.$el.closest(".modal__tab-content"))
    ) {
      return;
    }

    this.removeCellEditing();
    this.cellEditHeight = 0;
  }

  private removeCellEditing() {
    if (this.editing === null) return;

    void this.removeAutoSaveLock(this.editing.lock);
    this.editing = null;
  }

  // Value is not actually required to be editable - it can be opened in read-only mode too.
  private setCellEditing(ref: ValueRef) {
    this.removeCellEditing();

    void this.addAutoSaveLock().then(async lock => {
      const value = this.uv.getValueByRef(ref);

      if (this.editing !== null // Lock already taken (somehow)
       || !value
      ) {
        await this.removeAutoSaveLock(lock);
        return;
      }

      this.editing = { ref, lock };
    });
  }

  private get editingNonNullableBoolean(): boolean {
    if (this.editing === null) return false;
    const valueField = this.uv.getValueByRef(this.editing.ref)?.value.info?.field;
    if (valueField === null || valueField === undefined) return false;
    return (valueField.valueType.type === "bool"
         && valueField.isNullable === false);
  }

  @Watch("editing")
  private async watchEditingForBool() {
    if (this.editing === null) return;
    const ref = this.editing.ref;
    if (ref.type === "new") return;

    if (this.editingNonNullableBoolean) {
      const value = this.uv.getValueByRef(ref)!.value.value;
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
    this.columnDelta = 0;
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

  private selectValue(ref: ValueRef, selectedStatus: boolean) {
    const cell = this.uv.getValueByRef(ref);
    if (!cell) {
      return;
    }
    if (cell.value.extra.selected !== selectedStatus) {
      cell.value.extra.selected = selectedStatus;
      if (selectedStatus) {
        this.uv.extra.selectedValues.insert(ref);
      } else {
        this.uv.extra.selectedValues.delete(ref);
      }
    }
  }

  // More high-level than `selectValue`: deselects other cells and
  // remembers last selected cell.
  private selectCell(ref: ValueRef) {
    this.uv.extra.selectedValues.keys().forEach(prevRef => {
      this.selectValue(prevRef, false);
    });

    // Deselect another cells
    this.$root.$emit("cell-click");

    this.selectValue(ref, true);
    this.lastSelectedValue = ref;
  }

  @Watch("allRows")
  private clearSelectedRow() {
    this.lastSelectedRow = null;
  }

  private selectTableRow(pos: number, event: MouseEvent) {
    const row = this.allRows[pos];

    // If we are in a selection mode, just emit selected row.
    if (this.selectionMode && row.ref.type === "existing" && row.row.extra.selectionEntry !== undefined) {
      this.$emit("select", row.row.extra.selectionEntry);
      return;
    }

    if (this.lastSelectedRow !== null && event.shiftKey) {
      const prevRow = this.allRows[this.lastSelectedRow];
      const prevSelected = prevRow.row.extra.selected;
      const [from, to] = this.lastSelectedRow <= pos ? [this.lastSelectedRow, pos] : [pos, this.lastSelectedRow];
      for (let i = from; i <= to; i++) {
        this.selectRow(this.allRows[i].ref, prevSelected);
      }
    } else {
      this.selectRow(row.ref, !row.row.extra.selected);
    }

    this.lastSelectedRow = pos;
  }

  private selectAllRows() {
    this.selectAll(!this.selectedAll);
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

    this.$emit("update:enableFilter", this.uv.rows !== null);

    this.updateRows();
  }

  private updateRows() {
    this.buildRowPositions();
    // this.initTree();
  }

  /*
    first sort
    bool:   descending
    number: descending
    string: ascending
  */
  private updateSort(sortColumn: number) {
    const type = this.uv.extra.columns[sortColumn].columnInfo.valueType.type;
    if (this.uv.extra.sortColumn !== sortColumn) {
      this.uv.extra.sortColumn = sortColumn;
      switch (type) {
        case "decimal":
          this.uv.extra.sortOptions = { numeric: true };
          this.uv.extra.sortAsc = false;
          break;
        case "int":
          this.uv.extra.sortOptions = { numeric: true };
          this.uv.extra.sortAsc = false;
          break;
        case "bool":
          this.uv.extra.sortAsc = false;
          this.uv.extra.sortOptions = {};
          break;
        case "string":
          this.uv.extra.sortAsc = true;
          this.uv.extra.sortOptions = { sensitivity: "accent" };
          break;
        default:
          this.uv.extra.sortAsc = true;
          this.uv.extra.sortOptions = {};
      }
    } else {
      this.uv.extra.sortAsc = !this.uv.extra.sortAsc;
    }
    this.sortRows();
  }

  private sortRows() {
    const rows = this.uv.rows!;

    if (this.uv.extra.sortColumn !== null) {
      const sortColumn = this.uv.extra.sortColumn;
      const collator = new Intl.Collator(["en", "ru"], this.uv.extra.sortOptions);
      const sortFunction: (a: number, b: number) => number =
        this.uv.extra.sortAsc ?
          (a, b) => rowIndicesCompare(a, b, rows, sortColumn, collator) :
          (a, b) => rowIndicesCompare(b, a, rows, sortColumn, collator);
      this.rowPositions.sort(sortFunction);
    }
  }

  get noMoreRows() {
    return this.showLength >= (this.uv.rows?.length ?? 0);
  }

  private updateShowLength(ev: StateChanger) {
    this.showLength = Math.min(this.showLength + showStep, this.uv.rows?.length ?? 0);
    if (this.noMoreRows) {
      ev.complete();
    } else {
      ev.loaded();
    }
  }

  get existingRows(): IShownRow[] {
    const rows = this.uv.rows;
    if (rows === null) {
      return [];
    } else {
      return mapMaybe(rowI => {
        const row = rows[rowI];
        if (row.deleted || row.extra.shownAsNewRow) {
          return undefined;
        }
        return {
          key: String(rowI),
          notExisting: false,
          row,
          ref: {
            type: "existing",
            position: rowI,
          },
        };
      }, this.rowPositions);
    }
  }

  private getNewRows(rowPositions: NewRowRef[]): IShownRow[] {
    return mapMaybe(ref => {
      const row = getNewRow(this.uv, ref);
      return row.row.deleted ? undefined : {
        key: `${ref.type}-${ref.type === "added" ? ref.addedId : ref.id}`,
        row: row.row,
        notExisting: true,
        ref: row.ref,
      };
    }, rowPositions);
  }

  get topRows(): IShownRow[] {
    return this.getNewRows(this.uv.extra.newRowTopSidePositions);
  }

  get bottomRows(): IShownRow[] {
    return this.getNewRows(this.uv.extra.newRowBottomSidePositions);
  }

  get statusLine() {
    const selectedCount = this.uv.extra.selectedRows.length;
    const selected = (selectedCount > 0) ? `${selectedCount}/` : "";
    const totalAdded = this.topRows.length + this.bottomRows.length;
    return `${selected}${totalAdded + this.existingRows.length}`;
  }

  @Watch("statusLine")
  private updateStatusLine() {
    this.$emit("update:statusLine", this.statusLine);
  }

  get allRows() {
    return [...this.topRows, ...this.existingRows, ...this.bottomRows];
  }

  get shownRows() {
    const totalAdded = this.topRows.length + this.bottomRows.length;
    return this.allRows.slice(0, totalAdded + this.showLength);
  }

  private async updateCurrentValue(rawValue: unknown) {
    const editing = this.editing!;
    const ref = editing.ref;
    const newRef = await this.updateValue(ref, rawValue);
    if (ref.type === "new") {
      editing.ref = newRef;
      this.selectCell(newRef);
      // FIXME: we shouldn't implement this logic purely for barcodes. Instead, react to keyboard <RET> event!
      if (this.uv.columnAttributes[newRef.column].text_type === "barcode") {
        void this.addNewRowOnPosition("bottom_back");
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "../../styles/mixins.scss";

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

    .button {
      @include material-button;

      width: max-content;
      position: sticky;
      left: 0;
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
    background: var(--MainBackgroundColor);
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
    box-shadow: 0 2px 0 var(--MainBorderColor);
    text-overflow: ellipsis;
    position: sticky; /* фиксация шапки при скроле */
    z-index: 20; /* при скроле таблицы чтобы шапка была видна */
    border-right: 1px solid var(--MainBorderColor);

    /* Instead of `0` to fix Safari's bug gap, doesn't needed in normal browsers, but easier to set same for all */
    top: -1px;
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
    position: sticky;

    &.checkbox-cells {
      box-shadow:
        0 2px 0 var(--MainBorderColor),
        1px 0 0 var(--MainBorderColor);
    }
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

  @media print {
    .tabl {
      height: 100%;
      float: none !important; /* при печати для правильной масштабируемости */
      overflow: visible !important; /* чтобы при печати была возможность видеть таблицу */
    }

    .custom-table {
      max-width: 100% !important;
      page-break-inside: auto;
      border-spacing: 0;
    }

    td ::v-deep a {
      text-decoration: none !important;
    }
  }

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
    transition: background 0.1s;

    &.table-th .material-icons {
      top: 9px;
      left: 5px;
    }

    .table-td_span .material-icons {
      position: relative;
      top: 3px;
    }

    &:hover {
      color: var(--MainTextColor);
      background-color: rgb(239, 239, 239);
      transition: background 0s;
    }
  }

  ::v-deep .openform-cells {
    position: relative;
    padding: 0;
    text-align: center;
    height: 100%;
    width: 100%;
    transition: background 0.1s;

    &.without-selection-cell {
      left: 0;
    }

    .add-in-modal-icon {
      position: relative;
      top: 3px;
      color: var(--MainTextColorLight);
    }

    &.table-th {
      padding: 0;

      .add-in-modal-icon {
        top: 2px;
      }
    }

    .edit-in-modal-icon {
      position: relative;
      top: 5px;
      color: var(--MainTextColorLight);
    }

    > a {
      display: block;
      text-decoration: none;

      &:hover {
        .add-in-modal-icon {
          color: var(--MainTextColor);
        }
      }
    }

    .icon-link {
      position: absolute;
      height: 100%;
      width: 100%;
      display: block;
      text-decoration: none;

      .material-icons {
        position: relative;
        top: 3px;
      }
    }

    > span > i {
      position: absolute;
      top: 5px;
      left: 5px;
    }

    &:hover {
      background-color: rgb(239, 239, 239);
      transition: background 0s;

      .edit-in-modal-icon {
        color: var(--MainTextColor);
      }
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
    user-select: none;
  }

  .fade-2-move {
    transition: transform 0.2s;
  }
</style>
