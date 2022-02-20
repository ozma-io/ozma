<i18n>
  {
    "en": {
      "cut": "Cut",
      "copy": "Copy",
      "paste": "Paste",
      "edit_error": "Editing error",
      "paste_error": "Pasting error",
      "copy_error": "Copying error",
      "clear_error": "Clearing error",
      "read_only_cell": "Read-only cell",
      "paste_no_referencefield_data": "Clipboard has no reference field data",
      "paste_error_too_many_columns": "Clipboard has too many columns",
      "non_rectangular_copy": "Only rectangular selections on copying are supported",
      "no_results": "Empty",
      "add_entry": "Add entry",
      "add_entry_in_modal": "Add new entry (in modal window)",
      "ok": "OK",
      "contextmenu_cut_tooltip": "Use Ctrl+X to cut selected cell",
      "contextmenu_copy_tooltip": "Use Ctrl+C to copy selected cell",
      "contextmenu_paste_tooltip": "Use Ctrl+V to paste to selected cell",
      "no_columns": "This query lacks visible columns"
    },
    "ru": {
      "cut": "Вырезать",
      "copy": "Копировать",
      "paste": "Вставить",
      "edit_error": "Ошибка при редактировании",
      "paste_error": "Ошибка при вставке",
      "copy_error": "Ошибка при копировании",
      "clear_error": "Ошибка при очистке поля",
      "read_only_cell": "Ячейка только для чтения",
      "paste_no_referencefield_data": "В буфере обмена неверная информация для вставки в данное поле",
      "paste_error_too_many_columns": "В буфере обмена слишком много столбцов",
      "non_rectangular_copy": "При копировании поддерживаются только прямоугольные выделения",
      "no_results": "Пусто",
      "add_entry": "Добавить запись",
      "add_entry_in_modal": "Добавить новую запись (в модальном окне)",
      "ok": "Продолжить",
      "contextmenu_cut_tooltip": "Нажмите Ctrl+X, чтобы вырезать выделенную ячейку",
      "contextmenu_copy_tooltip": "Нажмите Ctrl+C, чтобы скопировать выделенную ячейку",
      "contextmenu_paste_tooltip": "Нажмите Ctrl+V, чтобы вставить в выделенную ячейку",
      "no_columns": "В запросе отсутствуют видимые колонки"
    }
  }
</i18n>

<template>
  <div
    v-hotkey="keymap"
    :style="{
      /* In wide tables `table-block` had width of screen, while its parent and childs had correct bigger width.
         This behavior messed with 'Add new row' buttons and pagination, and I was unable to fix this in pure CSS, so JS solution here. */
      width: `${tableWidth}px`
    }"
    :class="[
      'table-block',
      'default-variant',
      'table-local-variant',
      {
        'nested': !isRoot,
        'active-editing': editingValue !== null,
        'mobile': $isMobile,
        'multiple-cells-selected': selectedCells.length > 1,

      }]"
  >
    <TableCellEdit
      v-if="editingValue"
      ref="tableCellEdit"
      v-click-outside="{ 'handler': removeCellEditing, 'middleware': checkWindow }"
      :width="editing.width"
      :min-height="editing.minHeight"
      :height="editing.height"
      :x="editing.x"
      :y="editing.y"
    >
      <FormValueControl
        :value="editingValue.value"
        :attributes="editingValue.attributes"
        :type="editingValue.type"
        :locked="editingLocked"
        :disable-color="editing.ref.type === 'new'"
        :home-schema="uv.homeSchema"
        :scope="scope"
        :level="level"
        caption=""
        force-caption
        is-cell-edit
        autofocus
        modal-only
        @blur="removeCellEditing"
        @update="updateCurrentValue"
        @close-modal-input="removeCellEditing"
      />
    </TableCellEdit>

    <!-- Don't know why there are one row in empty userview -->
    <div v-if="uv.info.columns.length === 0" class="empty-userview">
      {{ $t("empty_userview") }}
    </div>
    <template v-else>
      <popper
        v-if="cellContextMenu"
        ref="contextMenuPopup"
        v-click-outside="closeCellContextMenu"
        force-show
        :trigger="null"
        :reference="cellContextMenu.reference"
        transition="fade"
        enter-active-class="fade-enter fade-enter-active"
        leave-active-class="fade-leave fade-leave-active"
        :visible-arrow="false"
        :options="{
          placement: 'bottom-start',
          positionFixed: true,
          modifiers: { offset: { offset: 0 } },
        }"
      >
        <div class="popper border rounded overflow-hidden shadow">
          <div class="context-menu-wrapper">
            <ButtonList
              :buttons="cellContextMenu.buttons"
              @button-click="closeCellContextMenu"
              @goto="$emit('goto', $event)"
            />
          </div>
        </div>
      </popper>

      <div
        v-if="uv.extra.lazyLoad.type === 'pagination'"
        class="pagination-wrapper"
        :style="{
          // It's very bad, but I was unable to do this without JS.
          right: `${(tableWidth || 0) - (parentWidth || 0) - (parentScrollLeft || 0) + 5}px`,
        }"
      >
        <div
          :class="['pagination', { 'ml-auto': !uv.info.mainEntity }]"
          :style="{ top: `${parentScrollTop > 30 ? 2.5 : 0}rem` }"
        >
          <b-spinner
            v-if="uv.extra.lazyLoad.pagination.loading"
            class="mr-1"
            small
            label="Next page is loading"
          />
          <div class="select-wrapper">
            <b-select
              class="page-select"
              :value="uv.extra.lazyLoad.pagination.perPage"
              :options="pageSizes"
              size="sm"
              @input="updatePageSize"
            />
          </div>
          <ButtonItem :button="firstPageButton" />
          <ButtonItem :button="prevPageButton" />
          <div class="current-page-wrapper">
            <div class="current-page">
              {{ currentVisualPage }}
              <span v-if="pagesCount !== null" class="pages-count">{{ "/" + pagesCount }} </span>
            </div>
          </div>
          <ButtonItem :button="nextPageButton" />
        </div>
      </div>

      <div
        v-if="(showAddRowButtons && uv.rows.length > 5) || uv.extra.lazyLoad.type === 'pagination'"
        class="button-container"
        :style="{ width: `${parentWidth - 20}px`, minHeight: `25px` }"
      >
        <ButtonItem
          v-visible="showAddRowButtons && uv.rows.length > 5"
          :button="topAddButton"
          align-right
        />
      </div>

      <table
        ref="table"
        class="custom-table table table-sm"
      >
        <colgroup>
          <col
            v-if="showSelectionColumn"
            class="checkbox-col"
          >
          <col
            v-if="showLinkColumn"
            class="open-form-col"
          >
          <col
            v-for="i in columnIndexes"
            :key="i"
            class="data-col"
            :style="columns[i].style"
          >
        </colgroup>
        <thead
          class="table-head"
        >
          <tr>
            <th
              v-if="showSelectionColumn"
              class="fixed-column checkbox-cells table-th"
              @click="toggleAllRows"
            >
              <Checkbox
                :checked="selectedAll"
                :indeterminate="!selectedAll && selectedSome"
              />
            </th>
            <th
              v-if="showLinkColumn"
              :class="[
                'table-th',
                'fixed-column',
                'openform-cells',
                {
                  'without-selection-cell': !showSelectionColumn,
                }
              ]"
            >
              <ButtonGroup
                v-if="createEntryButtons && !softDisabled"
                :button="createEntryButtons"
                @goto="$emit('goto', $event)"
              />
              <ButtonItem
                v-if="createEntryButton && !softDisabled"
                :button="createEntryButton"
                @goto="$emit('goto', $event)"
              />
            </th>
            <th
              v-for="i in columnIndexes"
              :key="i"
              :class="['sorting', 'table-th', {
                'fixed-column' : columns[i].fixed,
              }]"
              :style="columns[i].style"
              :title="columns[i].caption"
              @click="loadAllRowsAndUpdateSort(i)"
            >
              <span class="table_header__content">
                {{ columns[i].caption }}
              </span>
              <span v-if="uv.extra.sortColumn === i">{{ uv.extra.sortAsc ? "▲" : "▼" }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- We use dynamic refs here because order of keyed items in ref array is not guaranteed:
               https://github.com/vuejs/vue/issues/4952
          -->
          <TableRow
            v-for="(row, rowIndex) in shownRows"
            :key="row.key"
            :ref="`row-${row.key}`"
            :class="{
              'last-top-new': row.notExisting && rowIndex + 1 < shownRows.length && !shownRows[rowIndex + 1].notExisting,
              'first-bottom-new': row.notExisting && rowIndex - 1 > 0 && !shownRows[rowIndex - 1].notExisting,
            }"
            :uv="uv"
            :row="row.row"
            :columns="columns"
            :column-indexes="columnIndexes"
            :fixed-column-positions="fixedColumnPositions"
            :fixed-columns-length="fixedColumnsLength"
            :show-tree="showTree"
            :not-existing="row.notExisting"
            :show-link-column="showLinkColumn"
            :show-selection-column="showSelectionColumn"
            @select="selectTableRow(rowIndex, $event)"
            @cell-click="clickCell({ row: rowIndex, column: arguments[0] }, arguments[1], arguments[2])"
            @cell-mousedown="cellMouseDown({ row: rowIndex, column: arguments[0] }, arguments[1], arguments[2])"
            @cell-mouseover="continueCellSelection({ row: rowIndex, column: arguments[0] }, arguments[1], arguments[2])"
            @cell-mouseup="endCellSelection({ row: rowIndex, column: arguments[0] }, arguments[1], arguments[2])"
            @cell-contextmenu="openCellContextMenu({ row: rowIndex, column: arguments[0] }, arguments[1], arguments[2])"
            @toggle-children="toggleChildren(row.ref, $event)"
            @add-child="addChild(row.ref)"
            @goto="$emit('goto', $event)"
          />
        </tbody>
      </table>
      <InfiniteLoading
        v-if="useInfiniteScrolling"
        ref="infiniteLoading"
        force-use-infinite-wrapper
        :identifier="infiniteIdentifier"
        spinner="spiral"
        :distance="500"
        @infinite="infiniteHandler"
      >
        <template #no-results>
          <div v-if="allRows.length === 0" class="no-results">
            {{ $t("no_results") }}
          </div>
          <span v-else />
        </template>
        <template #no-more>
          <span />
        </template>
        <template #error>
          <span />
        </template>
      </InfiniteLoading>
      <div
        v-if="showAddRowButtons"
        ref="bottomButtonContainer"
        class="button-container"
        :style="{ width: `${parentWidth - 20}px` }"
      >
        <ButtonItem
          :button="bottomAddButton"
          align-right
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { namespace } from "vuex-class";
import InfiniteLoading, { StateChanger } from "vue-infinite-loading";
import { Moment, default as moment } from "moment";
import * as R from "ramda";
import { z } from "zod";
import { IResultColumnInfo, ValueType, RowId, IFieldRef, IEntity, IEntityRef } from "ozma-api";
import Popper from "vue-popperjs";

import { eventBus } from "@/main";
import { deepEquals, mapMaybe, nextRender, ObjectSet, tryDicts, ReferenceName, NeverError, parseFromClipboard, waitTimeout, ClipboardParseValue } from "@/utils";
import { valueIsNull } from "@/values";
import { UserView } from "@/components";
import { maxPerFetch } from "@/components/UserView.vue";
import { AddedRowId } from "@/state/staging_changes";
import { IAttrToQueryOpts, ICurrentQueryHistory } from "@/state/query";
import BaseUserView, { IBaseRowExtra, IBaseValueExtra, IBaseViewExtra, baseUserViewHandler } from "@/components/BaseUserView";
import TableRow from "@/components/views/table/TableRow.vue";
import Checkbox from "@/components/checkbox/Checkbox.vue";
import TableCellEdit from "@/components/views/table/TableCellEdit.vue";
import { Link, attrToLinkSelf } from "@/links";
import {
  IAddedRow, IAddedRowRef, ICombinedRow, ICombinedUserView, ICombinedValue, IExistingRowRef, IExtendedAddedRow,
  IExtendedRow, IExtendedRowCommon, IExtendedRowInfo, IExtendedValue, IRowCommon, IUserViewHandler, RowRef, ValueRef,
  CommittedRowRef,
  valueToPunnedText,
  equalValueRef,
} from "@/user_views/combined";
import { interfaceButtonVariant, defaultVariantAttribute } from "@/utils_colors";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import ButtonList from "@/components/buttons/ButtonList.vue";
import { Button } from "@/components/buttons/buttons";
import FormValueControl from "@/components/FormValueControl";
import type TableCell from "./table/TableCell.vue";
import { elementWindow, WindowKey } from "@/state/windows";

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
  // If an extra value is only needed during render, define it as a computed property instead.
  selected: boolean;
  cursor: boolean;
}

export interface ITableRowTree {
  parent: number | null;
  level: number;
  arrowDown: boolean;
  children: CommittedRowRef[];
}

export interface ITableRowExtra extends IBaseRowExtra {
  searchText: string;
  shownAsNewRow: boolean;
  tree: ITableRowTree;
  link: Link | null;
}

export interface IAddedNewRowRef {
  type: "added";
  addedId: AddedRowId;
  parent?: number;
}

export interface ICommittedNewRowRef {
  type: "committed";
  id: RowId;
}

export type NewRowRef = IAddedNewRowRef | ICommittedNewRowRef;

export interface ITableViewExtra extends IBaseViewExtra {
  hasRowLinks: boolean;
  selectedValues: ObjectSet<ValueRef>;
  cursorValue: ValueRef | null;
  oldCursorValue: ValueRef | null;
  rowsParentPositions: Record<number, number>;
  treeParentColumnIndex: number;
  linkOpts?: IAttrToQueryOpts;
  lazyLoad: ITableLazyLoad;

  newRowTopSidePositions: NewRowRef[];
  newRowBottomSidePositions: NewRowRef[];
  addedRowRefs: NewRowRef[];

  sortColumn: number | null;
  sortAsc: boolean;
  sortOptions: Intl.CollatorOptions;
}

export interface IVisualPosition {
  column: number;
  row: number;
}

const equalVisualPosition = (a: IVisualPosition, b: IVisualPosition): boolean => {
  return a.column === b.column && a.row === b.row;
};

const showStep = 15;
const doubleClickTime = 700;
// FIXME: Use CSS variables to avoid this constant
const technicalFieldsWidth = 35; // checkbox's and openform's td width

export type ITableCombinedUserView = ICombinedUserView<ITableValueExtra, ITableRowExtra, ITableViewExtra>;
export type ITableExtendedValue = IExtendedValue<ITableValueExtra>;
export type ITableExtendedRowInfo = IExtendedRowInfo<ITableRowExtra>;
export type ITableExtendedRow = IExtendedRow<ITableValueExtra, ITableRowExtra>;
export type ITableExtendedRowCommon = IExtendedRowCommon<ITableValueExtra, ITableRowExtra>;
export type ITableExtendedAddedRow = IExtendedAddedRow<ITableValueExtra, ITableRowExtra>;

const createCommonLocalRow = (uv: ITableCombinedUserView, row: IRowCommon, oldLocal?: ITableRowExtra) => {
  const getRowAttr = (name: string) => tryDicts(name, row.attributes, uv.attributes);

  const defaultArrow = Boolean(getRowAttr("tree_all_open"));

  const tree: ITableRowTree = {
    children: [],
    level: 0,
    parent: null,
    arrowDown: oldLocal?.tree!.arrowDown ?? defaultArrow,
  };

  return {
    searchText: "",
    link: null,
    shownAsNewRow: false,
    tree,
  };
};

const postInitCommonRow = (uv: ITableCombinedUserView, row: ITableExtendedRowCommon) => {
  // Needs to be performant, hence this custom loop.
  let searchText = "";
  for (const value of row.values) {
    if (value.pun) {
      searchText += value.pun + "\0";
    } else if (typeof value.value === "string") {
      searchText += value.value + "\0";
    }
  }
  row.extra.searchText = searchText.toLocaleLowerCase();
};

const initTreeChildren = (uv: ITableCombinedUserView) => {
  uv.rows!.forEach((row, i) => {
    const addedChildRow = uv.extra.addedRowRefs.find(r => r.type === "added" && r.parent === i);
    if (addedChildRow && addedChildRow.type === "added") {
      const child: IAddedRowRef = {
        type: "added",
        id: addedChildRow.addedId,
      };
      uv.rows![i].extra.tree.children.push(child);
    }

    if (row.extra.tree.parent) {
      const parentIndex = uv.extra.rowsParentPositions[row.extra.tree.parent];
      if (!uv.rows![parentIndex]) return;

      const child: IExistingRowRef = {
        type: "existing",
        position: i,
      };
      uv.rows![parentIndex].extra.tree.children.push(child);

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

const equalNewRowRef = (a: NewRowRef, b: NewRowRef): boolean => {
  return a.type === b.type && (
    (a.type === "added" && a.addedId === (b as IAddedNewRowRef).addedId) ||
    (a.type === "committed" && a.id === (b as ICommittedNewRowRef).id));
};

const deleteFromPositions = (ref: NewRowRef, extra: ITableViewExtra) => {
  extra.newRowTopSidePositions = extra.newRowTopSidePositions.filter(r => !equalNewRowRef(ref, r));
  extra.newRowBottomSidePositions = extra.newRowBottomSidePositions.filter(r => !equalNewRowRef(ref, r));
  extra.addedRowRefs = extra.addedRowRefs.filter(r => !equalNewRowRef(ref, r));
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
  side: "top_front" | "top_back" | "bottom_back" | "position";
  parent?: number;
}

const isAddedValueMeta = (obj: unknown): obj is IAddedValueMeta => {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const side = (obj as any).side;
  return side === "top_front" || side === "top_back" || side === "bottom_back" || side === "position";
};

export const tableUserViewHandler: IUserViewHandler<ITableValueExtra, ITableRowExtra, ITableViewExtra> = {
  ...baseUserViewHandler,

  createLocalValue(
    uv: ITableCombinedUserView,
    rowIndex: number,
    row: ICombinedRow & ITableExtendedRowInfo,
    columnIndex: number,
    value: ICombinedValue,
    oldView?: ITableViewExtra,
    oldRow?: ITableRowExtra,
    oldValue?: ITableValueExtra,
  ): ITableValueExtra {
    const baseExtra = baseUserViewHandler.createLocalValue(uv, rowIndex, row, columnIndex, value, oldView, oldRow, oldValue);

    const columnAttrs = uv.columnAttributes[columnIndex];
    const getCellAttr = (name: string) => tryDicts(name, value.attributes, columnAttrs, row.attributes, uv.attributes);

    const currLinkForRow = attrToLinkSelf(getCellAttr("row_link"), value.info, uv.extra.linkOpts);
    const hasRowLinkWithId =
      (row.extra.link?.type === "query" && row.extra.link.query.args.args?.id !== undefined) ||
      (row.extra.link && "args" in row.extra.link && row.extra.link.args.id !== undefined);
    if (currLinkForRow && !hasRowLinkWithId) {
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

        uv.extra.treeParentColumnIndex = columnIndex;
      }
    }

    const valueRef: ValueRef = {
      type: "existing",
      position: rowIndex,
      column: columnIndex,
    };
    const selected = (oldValue?.selected ?? false) && !row.deleted;
    if (selected) {
      uv.extra.selectedValues.insert(valueRef);
    }
    return {
      ...baseExtra,
      selected,
      cursor: false,
    };
  },

  createAddedLocalValue(
    uv: ITableCombinedUserView,
    rowId: AddedRowId,
    row: IAddedRow & ITableExtendedRowInfo,
    columnIndex: number,
    value: ICombinedValue,
    oldView?: ITableViewExtra,
    oldRow?: ITableRowExtra,
    oldValue?: ITableValueExtra,
  ): ITableValueExtra {
    const baseExtra = baseUserViewHandler.createAddedLocalValue(uv, rowId, row, columnIndex, value, oldView, oldRow, oldValue);

    const valueRef: ValueRef = {
      type: "added",
      id: rowId,
      column: columnIndex,
    };
    const selected = oldValue?.selected ?? false;
    if (selected) {
      uv.extra.selectedValues.insert(valueRef);
    }
    return {
      ...baseExtra,
      selected,
      cursor: false,
    };
  },

  createEmptyLocalValue(
    uv: ITableCombinedUserView,
    row: IRowCommon & ITableExtendedRowInfo,
    columnIndex: number,
    value: ICombinedValue,
    oldView?: ITableViewExtra,
    oldRow?: ITableRowExtra,
    oldValue?: ITableValueExtra,
  ): ITableValueExtra {
    const baseExtra = baseUserViewHandler.createEmptyLocalValue(uv, row, columnIndex, value, oldView, oldRow, oldValue);

    const valueRef: ValueRef = {
      type: "new",
      column: columnIndex,
    };
    const selected = oldValue?.selected ?? false;
    if (selected) {
      uv.extra.selectedValues.insert(valueRef);
    }

    return {
      ...baseExtra,
      selected,
      cursor: false,
    };
  },

  updateValue(uv: ITableCombinedUserView, rowIndex: number, row: ITableExtendedRow, columnIndex: number, value: ITableExtendedValue) {
    baseUserViewHandler.updateValue(uv, rowIndex, row, columnIndex, value);
  },

  updateAddedValue(uv: ITableCombinedUserView, rowId: number, row: ITableExtendedAddedRow, columnIndex: number, value: ITableExtendedValue) {
    baseUserViewHandler.updateAddedValue(uv, rowId, row, columnIndex, value);
  },

  updateEmptyValue(uv: ITableCombinedUserView, columnIndex: number, value: ITableExtendedValue) {
    baseUserViewHandler.updateEmptyValue(uv, columnIndex, value);
  },

  createLocalRow(uv: ITableCombinedUserView, rowIndex: number, row: ICombinedRow, oldView?: ITableViewExtra, oldRow?: ITableRowExtra) {
    const baseExtra = baseUserViewHandler.createLocalRow(uv, rowIndex, row, oldView, oldRow);
    const commonExtra = createCommonLocalRow(uv, row, oldRow);
    return {
      ...commonExtra,
      ...baseExtra,
    };
  },

  createAddedLocalRow(uv: ITableCombinedUserView, rowId: AddedRowId, row: IAddedRow, oldView?: ITableViewExtra, oldRow?: ITableRowExtra, meta?: unknown) {
    const baseExtra = baseUserViewHandler.createAddedLocalRow(uv, rowId, row, oldView, oldRow);
    const commonExtra = createCommonLocalRow(uv, row, oldRow);

    const parent = isAddedValueMeta(meta) ? meta.parent : undefined;
    const newRef: NewRowRef = {
      type: "added",
      addedId: rowId,
      parent,
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
      } else if (side === "position") {
        uv.extra.addedRowRefs.push(newRef);
      }
    }

    return {
      ...commonExtra,
      ...baseExtra,
    };
  },

  createEmptyLocalRow(uv: ITableCombinedUserView, row: IRowCommon, oldView?: ITableViewExtra, oldRow?: ITableRowExtra) {
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

  createLocalUserView(uv: ITableCombinedUserView, oldView?: ITableViewExtra): ITableViewExtra {
    const baseExtra = baseUserViewHandler.createLocalUserView(uv, oldView);

    const lazyLoad = oldView?.lazyLoad ?? TableLazyLoad.parse(uv.attributes["lazy_load"]);

    const newRowTopSidePositions = oldView ? inheritOldRowsPositions(uv, oldView.newRowTopSidePositions) : [];
    const newRowBottomSidePositions = oldView ? inheritOldRowsPositions(uv, oldView.newRowBottomSidePositions) : [];
    const addedRowRefs = oldView ? inheritOldRowsPositions(uv, oldView.addedRowRefs) : [];

    return {
      ...baseExtra,
      hasRowLinks: false,
      selectedValues: new ObjectSet<ValueRef>(),
      cursorValue: null,
      oldCursorValue: null,
      rowsParentPositions: {},
      treeParentColumnIndex: 0,
      newRowTopSidePositions,
      newRowBottomSidePositions,
      linkOpts: uv.homeSchema ? { homeSchema: uv.homeSchema } : {},
      sortAsc: oldView?.sortAsc ?? true,
      sortColumn: oldView?.sortColumn ?? null,
      sortOptions: oldView?.sortOptions ?? {},
      addedRowRefs,
      lazyLoad,
    };
  },

  postInitUserView(uv: ITableCombinedUserView, oldView?: ITableViewExtra) {
    if (!R.isEmpty(uv.extra.rowsParentPositions)) {
      uv = initTreeChildren(uv);
    }

    for (const pos of [...uv.extra.newRowTopSidePositions, ...uv.extra.newRowBottomSidePositions]) {
      if (pos.type === "committed") {
        // `index.type === "existing"` here; "added" may only appear after a commit.
        const index = uv.mainRowMapping[pos.id][0] as IExistingRowRef;
        uv.rows![index.position].extra.shownAsNewRow = true;
      }
    }

    const cursorValue = oldView?.cursorValue ?? null;
    if (cursorValue) {
      const value = uv.getValueByRef(cursorValue);
      if (value) {
        uv.extra.cursorValue = cursorValue;
        value.value.extra.cursor = true;
      }
    }

    const oldCursorValue = oldView?.oldCursorValue ?? null;
    if (oldCursorValue) {
      const value = uv.getValueByRef(oldCursorValue);
      if (value) {
        uv.extra.oldCursorValue = oldCursorValue;
      }
    }
  },
};

const rowContains = (row: ITableExtendedRowCommon, searchWords: string[]) => {
  return searchWords.every(word => row.extra.searchText.includes(word));
};

const rowIndicesCompare = (aIndex: CommittedRowRef, bIndex: CommittedRowRef, uv: ITableCombinedUserView, sortColumn: number, collator: Intl.Collator) => {
  const a = uv.getRowByRef(aIndex);
  const b = uv.getRowByRef(bIndex);
  const aValue = a?.values[sortColumn].value;
  const bValue = b?.values[sortColumn].value;
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

const newRowIndicesCompare = (aIndex: NewRowRef, bIndex: NewRowRef, uv: ITableCombinedUserView, sortColumn: number, collator: Intl.Collator) => {
  const a = getNewRow(uv, aIndex);
  const b = getNewRow(uv, bIndex);
  const aValue = a?.row.values[sortColumn].value;
  const bValue = b?.row.values[sortColumn].value;
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
  return row.values.every(cell => valueIsNull(cell.rawValue) || cell.info === undefined);
};

interface ITableEditing {
  ref: ValueRef;
  x: number;
  y: number;
  height: number;
  width: number;
  minHeight: number;
}

interface IShownRow {
  key: string;
  row: ITableExtendedRowCommon;
  notExisting: boolean;
  ref: RowRef;
}

const defaultPageSize = 5;
// Just look at `ITableLazyLoad` to see which type this mess make.
export const TableLazyLoad =
  z.union([
    z.object({
      pagination: z.object({
        "per_page": z.number(),
      }),
    }).transform(obj => ({
      type: "pagination" as const,
      pagination: {
        perPage: R.clamp(0, maxPerFetch, obj.pagination["per_page"]),
        currentPage: 0,
        loading: false,
      },
    })),
    z.object({
      "infinite_scroll": z.literal(true),
    }).transform(obj => ({
      type: "infinite_scroll" as const,
      infiniteScroll: {
        shownRowsLength: 0,
      },
    })),
  ]).default({ infinite_scroll: true });

export type ITableLazyLoad = z.infer<typeof TableLazyLoad>;

type MoveDirection = "up" | "right" | "down" | "left";

type ReferenceForPopper = {
  clientWidth: number;
  clientHeight: number;
  getBoundingClientRect: () => DOMRect;
  /* Popper.js supports virtual refereneces,
   * but used wrapper tries to remove events even on them, which make no sence,
   * but it's easier to pass dummy method to it for now */
  removeEventListener: () => void;
};

type CellContextMenuData = {
  reference: ReferenceForPopper;
  buttons: Button[];
};

const plainTextCell = (str: string): string => {
  if (/\n|\t/.test(str)) {
    return `"${str.replace(/"/g, `""`)}"`;
  } else {
    return str;
  }
};

const plainTextStringify = (table: string[][]): string => {
  let output = "";

  table.forEach(row => {
    row.forEach((cell, colI) => {
      output += plainTextCell(cell);
      if (colI < row.length - 1) {
        output += "\t";
      }
    });
    output += "\n";
  });

  return output;
};

const entities = namespace("entities");
const entries = namespace("entries");
const query = namespace("query");
const windows = namespace("windows");

@UserView({
  handler: tableUserViewHandler,
  useLazyLoad: true,
})
@Component({
  components: {
    TableRow, Checkbox, TableCellEdit, InfiniteLoading, ButtonItem, ButtonList, Popper, FormValueControl,
  },
})
export default class UserViewTable extends mixins<BaseUserView<ITableValueExtra, ITableRowExtra, ITableViewExtra>>(BaseUserView) {
  @query.State("current") query!: ICurrentQueryHistory | null;
  @entries.Mutation("removeEntriesConsumer") removeEntriesConsumer!: (args: { ref: IFieldRef; reference: ReferenceName }) => void;
  @entries.Mutation("addEntriesConsumer") addEntriesConsumer!: (args: { ref: IFieldRef; reference: ReferenceName }) => void;
  @entities.Action("getEntity") getEntity!: (ref: IEntityRef) => Promise<IEntity>;
  @windows.Getter("active") activeWindow!: WindowKey | null;

  // These two aren't computed properties for performance. They are computed during `init()` and mutated when other values change.
  // If `init()` is called again, their values after recomputation should be equal to those before it.
  currentFilter: string[] = [];
  rowPositions: CommittedRowRef[] = [];
  lastSelectedRow: number | null = null;
  editing: ITableEditing | null = null;
  printListener: { query: MediaQueryList; queryCallback: (mql: MediaQueryListEvent) => void; printCallback: () => void } | null = null;
  clickTimeout: { id: NodeJS.Timeout; ref: ValueRef } | null = null;
  // Keep references to entries used for editing once, so we don't re-request them.
  keptEntries = new ObjectSet<IFieldRef>();
  showAddRowButtons = false;

  cellContextMenu: CellContextMenuData | null = null;

  get columns() {
    const viewAttrs = this.uv.attributes;
    let isTreeUnfoldColumnSet = false;

    const columns = this.uv.info.columns.map((columnInfo, i): IColumn => {
      const columnAttrs = this.uv.columnAttributes[i];
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

      // "column_type" is old version, but "control" is consistent with forms.
      const type = String(getColumnAttr("control") ?? getColumnAttr("column_type"));

      return {
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

    if (!isTreeUnfoldColumnSet && columns[0]) {
      columns[0].treeUnfoldColumn = true;
    }

    return columns;
  }

  get technicalWidth() {
    let left = 0;
    if (this.showSelectionColumn) {
      left += technicalFieldsWidth;
    }
    if (this.uv.extra.hasRowLinks) {
      left += technicalFieldsWidth;
    }
    return left;
  }

  get fixedColumnsLength(): number {
    return this.columns.filter(item => item.fixed).length;
  }

  get fixedColumnPositions() {
    let left = this.technicalWidth;
    const fixedColumnIndexes = mapMaybe((col, colI) => col.fixed ? colI : undefined, this.columns);
    const positions: Record<number, number> = {};
    for (const fixedColumnIndex of fixedColumnIndexes) {
      positions[fixedColumnIndex] = left;
      left += this.columns[fixedColumnIndex].width;
    }
    return positions;
  }

  get showSelectionColumn() {
    const disableSelectionColumn = this.uv.attributes["disable_selection_column"];
    return typeof disableSelectionColumn === "boolean"
      ? !disableSelectionColumn
      : true;
  }

  get useInfiniteScrolling() {
    return this.uv.extra.lazyLoad.type === "infinite_scroll";
  }

  get pageSizes() {
    if (this.uv.extra.lazyLoad.type !== "pagination") return [];

    const defaultSizes = [5, 10, 25, 50];
    if (!defaultSizes.includes(this.uv.extra.lazyLoad.pagination.perPage)) {
      return [this.uv.extra.lazyLoad.pagination.perPage, ...defaultSizes].map(num => ({ value: num, text: String(num) }));
    } else {
      return defaultSizes.map(num => ({ value: num, text: String(num) }));
    }
  }

  get keymap() {
    return {
      "enter": () => this.onPressEnter(),
      "esc": () => this.removeCellEditing(),
      "delete": () => this.clearSelectedCells(),
      "up": () => this.moveCursor("up"),
      "right": () => this.moveCursor("right"),
      "down": () => this.moveCursor("down"),
      "left": () => this.moveCursor("left"),
      "shift+up": () => this.expandSelection("up"),
      "shift+right": () => this.expandSelection("right"),
      "shift+down": () => this.expandSelection("down"),
      "shift+left": () => this.expandSelection("left"),
      // TODO: make pageup/pagedown movement depend on real page size, not just 5 rows.
      "pagedown": () => this.moveCursor("down", { step: 5 }),
      "pageup": () => this.moveCursor("up", { step: 5 }),
    };
  }

  get firstPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== "pagination") return null;

    return {
      type: "callback",
      icon: "skip_previous",
      variant: interfaceButtonVariant,
      disabled: this.uv.extra.lazyLoad.pagination.currentPage === 0,
      callback: () => this.goToFirstPage(),
    };
  }

  get prevPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== "pagination") return null;

    return {
      type: "callback",
      icon: "arrow_left",
      variant: interfaceButtonVariant,
      disabled: this.uv.extra.lazyLoad.pagination.currentPage === 0,
      callback: () => this.goToPrevPage(),
    };
  }

  get nextPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== "pagination") return null;

    return {
      type: "callback",
      icon: "arrow_right",
      variant: interfaceButtonVariant,
      disabled: (this.uv.rowLoadState.complete && this.onLastPage) || this.uv.extra.lazyLoad.pagination.loading,
      callback: () => this.goToNextPage(),
    };
  }

  get onLastPage() {
    if (!this.uv.rows || this.uv.extra.lazyLoad.type !== "pagination") return false;

    const shownRowCount = this.uv.extra.lazyLoad.pagination.perPage * (this.uv.extra.lazyLoad.pagination.currentPage + 1);
    return this.uv.rowLoadState.fetchedRowCount <= shownRowCount;
  }

  private pageRequiresLoading(page: number) {
    if (!this.uv.rows || this.uv.rowLoadState.complete || this.uv.extra.lazyLoad.type !== "pagination") return false;

    const shownRowCount = this.uv.extra.lazyLoad.pagination.perPage * (page + 2);
    return this.uv.rowLoadState.fetchedRowCount < shownRowCount;
  }

  private get nextPageRequiresLoading() {
    if (this.uv.extra.lazyLoad.type !== "pagination") return false;
    return this.pageRequiresLoading(this.uv.extra.lazyLoad.pagination.currentPage + 1);
  }

  private goToFirstPage() {
    if (this.uv.extra.lazyLoad.type !== "pagination") return;

    this.uv.extra.lazyLoad.pagination.currentPage = 0;
  }

  private goToPrevPage() {
    if (this.uv.extra.lazyLoad.type !== "pagination") return;

    if (this.uv.extra.lazyLoad.pagination.currentPage > 0) {
      this.uv.extra.lazyLoad.pagination.currentPage--;
    }
  }

  private goToNextPage() {
    if (this.uv.extra.lazyLoad.type !== "pagination") return;

    if (this.nextPageRequiresLoading) {
      this.uv.extra.lazyLoad.pagination.loading = true;
      this.$emit("load-next-chunk", () => {
        if (this.uv.extra.lazyLoad.type !== "pagination") return;

        this.uv.extra.lazyLoad.pagination.loading = false;
        this.uv.extra.lazyLoad.pagination.currentPage++;
      });
    } else {
      this.uv.extra.lazyLoad.pagination.currentPage++;
    }
  }

  private goToPage(page: number) {
    if (this.uv.extra.lazyLoad.type !== "pagination") return;
    const { pagination } = this.uv.extra.lazyLoad;
    const { rowLoadState } = this.uv;

    const requiredRowNumber = (page + 1) * pagination.perPage;

    if (requiredRowNumber <= rowLoadState.fetchedRowCount) {
      pagination.currentPage = page;
    } else if (this.uv.rowLoadState.complete) {
      pagination.currentPage = Math.floor(rowLoadState.fetchedRowCount / pagination.perPage);
    } else {
      pagination.loading = true;
      this.$emit("load-entries", requiredRowNumber, () => {
        this.$nextTick(() => {
          if (requiredRowNumber <= this.uv.rowLoadState.fetchedRowCount) {
            pagination.currentPage = page;
          } else {
            pagination.currentPage = Math.floor(this.uv.rowLoadState.fetchedRowCount / pagination.perPage);
          }
          pagination.loading = false;
        });
      });
    }
  }

  private get currentVisualPage() {
    if (this.uv.extra.lazyLoad.type !== "pagination") return "0";

    return String(this.uv.extra.lazyLoad.pagination.currentPage + 1);
  }

  @Watch("currentVisualPage")
  private updateCurrentPageToParent() {
    if (this.uv.extra.lazyLoad.type !== "pagination") return;
    if (!this.isTopLevel) return;

    this.$emit("update:current-page", this.uv.extra.lazyLoad.pagination.currentPage);
  }

  private get pagesCount(): number | null {
    if (this.uv.extra.lazyLoad.type !== "pagination" || !this.uv.rowLoadState.complete) return null;

    return Math.ceil(this.uv.rowLoadState.fetchedRowCount / this.uv.extra.lazyLoad.pagination.perPage);
  }

  private updatePageSize(newPageSize: number) {
    if (this.uv.extra.lazyLoad.type !== "pagination") return;

    this.uv.extra.lazyLoad.pagination.perPage = newPageSize;
    this.uv.rowLoadState.perFetch = newPageSize;
    this.goToFirstPage();

    if (newPageSize > this.uv.rowLoadState.fetchedRowCount && !this.uv.rowLoadState.complete) {
      this.uv.rowLoadState.fetchedRowCount = 0;
      this.$emit("load-next-chunk");
    }
  }

  // Fires only once (is it?), needed to sync `perFetch` with `perPage` from attribute. TODO: Refactor this?
  /*   @Watch("uv.extra.lazyLoad", { immediate: true, deep: true })
   *   private watchPageSize() {
   *     if (this.uv.extra.lazyLoad.type !== "pagination") return;
   *
   *     this.uv.rowLoadState.perFetch = this.uv.extra.lazyLoad.pagination.perPage;
   *   } */

  get infiniteIdentifier() {
    return `${this.uv.rows?.length}${this.existingRows}`;
  }

  get dirtyHackPreventEntireReloads() {
    const dirtyHackPreventEntireReloadsRaw = this.uv.attributes["dirty_hack_prevent_entire_reloads"];
    return typeof dirtyHackPreventEntireReloadsRaw === "boolean"
      ? dirtyHackPreventEntireReloadsRaw
      : false;
  }

  private async infiniteHandler(ev: StateChanger) {
    if (this.uv.extra.lazyLoad.type !== "infinite_scroll") return;

    this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength += showStep;

    // FIXME: Dirty hack.
    while (this.showTree && !this.uv.rowLoadState.complete) {
      // eslint-disable-next-line no-await-in-loop
      await waitTimeout(1000);
    }

    if (!this.uv.rowLoadState.complete
     && this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength > this.uv.rowLoadState.fetchedRowCount
    ) {
      this.$emit("load-next-chunk", (result: boolean) => {
        if (this.uv.rowLoadState.complete) {
          if (this.uv.rowLoadState.fetchedRowCount !== 0) {
            ev.loaded();
          }
          ev.complete();
        } else {
          ev.loaded();
        }

        if (this.uv.extra.lazyLoad.type !== "infinite_scroll") return;
        this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength = this.uv.rowLoadState.fetchedRowCount;
      });
    } else if (this.uv.rowLoadState.complete
      && this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength >= this.uv.rowLoadState.fetchedRowCount) {
      if (this.uv.rowLoadState.fetchedRowCount !== 0) {
        ev.loaded();
      }
      ev.complete();

      this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength = this.uv.rowLoadState.fetchedRowCount;
    } else {
      ev.loaded();
    }
  }

  private get topAddButton(): Button {
    return {
      type: "callback",
      icon: "add",
      variant: interfaceButtonVariant,
      caption: this.$t("add_entry").toString(),
      callback: () => this.loadAllRowsAndAddNewRowOnPosition("top_front"),
    };
  }

  private get bottomAddButton(): Button {
    return {
      type: "callback",
      icon: "add",
      variant: interfaceButtonVariant,
      caption: this.$t("add_entry").toString(),
      callback: () =>
        this.loadAllRowsAndAddNewRowOnPosition("bottom_back").then(() =>
          (this.$refs.bottomButtonContainer as Element | undefined)?.scrollIntoView({ block: "nearest" })),
    };
  }

  private getCellVisualPosition(ref: ValueRef): IVisualPosition | null {
    const rowWithCell = this.uv.getRowByRef(ref);
    if (!rowWithCell) return null;
    const rowI = this.shownRows.findIndex(row => row.row === rowWithCell);
    return { row: rowI, column: this.getVisualColumnIndex(ref.column) };
  }

  private get selectedCells(): ValueRef[] {
    const { cursorValue } = this.uv.extra;
    return cursorValue
      ? [cursorValue, ...this.uv.extra.selectedValues.keys().filter(ref => !deepEquals(ref, cursorValue))]
      : this.uv.extra.selectedValues.keys();
  }

  // `columnIndexes` is 'visual index -> state index' mapping, this function do opposite.
  // 'visual' indexes are as they look in table for a user.
  // 'state' indexes are as they described in userview query, including ones with `visible = false` and so on.
  private getVisualColumnIndex(stateIndex: number) {
    return this.columnIndexes.indexOf(stateIndex);
  }

  private getValueRefByVisualPosition(position: IVisualPosition): ValueRef {
    return {
      ...this.shownRows[position.row].ref,
      column: this.columnIndexes[position.column],
    };
  }

  private expandSelection(direction: MoveDirection) {
    const oldCursorValue = this.uv.extra.oldCursorValue;
    if (!oldCursorValue) {
      return;
    }
    const oldCursorPosition = this.getCellVisualPosition(oldCursorValue)!;
    if (!oldCursorPosition) {
      // Old cursor position got deleted.
      this.moveCursor(direction);
      return;
    }

    this.moveCursor(direction, { keepOldCursor: true });
    const cursorPosition = this.getCellVisualPosition(this.uv.extra.cursorValue!)!;

    for (const cellPos of this.getCellsInRectangle(oldCursorPosition, cursorPosition)) {
      const cellRef = this.getValueRefByVisualPosition(cellPos);
      this.selectValue(cellRef, true);
    }
  }

  private getMovedCell(
    ref: IVisualPosition,
    direction: MoveDirection,
    options?: { step?: number },
  ): IVisualPosition {
    const maxRow = this.shownRows.length - 1;
    const maxColumn = this.columnIndexes.length - 1;

    /* eslint-disable no-multi-spaces, comma-spacing, key-spacing, space-in-parens */
    const calcDelta = (decDirection: MoveDirection, incDirection: MoveDirection) =>
      (options?.step ?? 1) * ((direction === incDirection ? 1 : 0) - (direction === decDirection ? 1 : 0));
    const rowDelta    = calcDelta("up"  , "down" );
    const columnDelta = calcDelta("left", "right");

    const newPosition = {
      row   : R.clamp(0, maxRow   , ref.row    + rowDelta   ),
      column: R.clamp(0, maxColumn, ref.column + columnDelta),
    };
    /* eslint-enable no-multi-spaces, comma-spacing, key-spacing, space-in-parens */

    return newPosition;
  }

  private moveCursor(
    direction: MoveDirection,
    options?: { step?: number; keepOldCursor?: boolean },
  ): boolean {
    const { cursorValue } = this.uv.extra;
    if (!cursorValue) return false;

    this.deselectAllCells({ clearCursor: false });

    const cursorPosition = this.getCellVisualPosition(cursorValue);
    if (!cursorPosition) {
      throw new Error("Cursor is in invalid position");
    }
    const newCursorPosition = this.getMovedCell(cursorPosition, direction, options);
    const newCursorValue = this.getValueRefByVisualPosition(newCursorPosition);
    this.setCursorCell(newCursorValue, options);

    // TODO: fix scrolling to first row and to first non-fixed columns when there are fixed columns.
    this.getVisualCellElement(newCursorPosition)?.scrollIntoView({ block: "nearest" });

    return !deepEquals(cursorValue, newCursorValue);
  }

  private getVisualCellElement(ref: IVisualPosition): HTMLElement | null {
    const visualRow = this.shownRows[ref.row];
    const row = (this.$refs[`row-${visualRow.key}`] as TableRow[] | undefined)?.[0];
    if (!row) {
      return null;
    }
    console.assert(this.shownRows[ref.row].row === row.row, "shown row equal to ref row");
    const cell = (row.$refs["cells"] as TableCell[] | undefined)?.[ref.column];
    if (!cell) {
      return null;
    }
    return (cell.$refs["cell"] as HTMLElement | undefined) ?? null;
  }

  private editCellOnCursor() {
    const valueRef = this.uv.extra.cursorValue;
    if (!valueRef) return;
    this.setCellEditing(valueRef);
  }

  get columnIndexes() {
    const columns = this.columns.map((column, index) => ({
      index,
      fixed: column.fixed,
      visible: column.visible,
    })).filter(c => c.visible);
    const fixed = columns.filter(c => c.fixed);
    const nonFixed = columns.filter(c => !c.fixed);
    return fixed.concat(nonFixed).map(c => c.index);
  }

  get fixedColumnIndexes() {
    return mapMaybe((col, colI) => col.fixed ? colI : undefined, this.columns);
  }

  get editingLocked() {
    if (this.editing === null || this.editingValue === null) {
      return false;
    } else {
      return this.editing.ref.type !== "existing" && this.addedLocked;
    }
  }

  get showLinkColumn() {
    return Boolean(this.uv.extra.hasRowLinks || this.createEntryButton || this.createEntryButtons);
  }

  private get createEntryButtons(): Button | null {
    return this.creationButtons
      ? {
        type: "button-group",
        icon: "add_box",
        variant: interfaceButtonVariant,
        tooltip: this.$t("add_entry_in_modal").toString(),
        buttons: this.creationButtons,
      }
      : null;
  }

  private get createEntryButton(): Button | null {
    return this.creationLink && !this.createEntryButtons
      ? {
        type: "link",
        icon: "add_box",
        variant: interfaceButtonVariant,
        tooltip: this.$t("add_entry_in_modal").toString(),
        link: this.creationLink,
      }
      : null;
  }

  get editingValue() {
    if (this.editing === null
     || this.editingNonNullableBoolean // Bools are special case because they toggle on double click.
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
        const attributes = { ...this.uv.attributes, ...value.row.attributes, ...columnAttrs, ...value.value.attributes };
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

    if (this.initialPage !== null && this.uv.extra.lazyLoad.type === "pagination") {
      this.goToPage(this.initialPage);
    }

    /* if (this.isTopLevel) {
     *   const queryCallback = (mql: MediaQueryListEvent) => {
     *     if (mql.matches) {
     *       this.shownRowsLength = this.uv.rows?.length ?? 0;
     *     }
     *   };
     *   const query = window.matchMedia("print");
     *   query.addListener(queryCallback);
     *   const printCallback = () => {
     *     this.shownRowsLength = this.uv.rows?.length ?? 0;
     *   };
     *   window.addEventListener("beforeprint", printCallback);
     *   this.printListener = { query, queryCallback, printCallback };
     * } */
  }

  @Watch("uv")
  protected uvChanged() {
    this.init();
    this.updateRows();

    this.updateStatusLine();
    this.watchShowTree();

    (this.$refs["infiniteLoading"] as InfiniteLoading | undefined)?.stateChanger.reset();
  }

  private get initialPage() {
    return !this.isRoot || this.query === null || this.query.root.page === null || this.query.root.page < 1
      ? null
      : this.query.root.page;
  }

  get softDisabled() {
    return Boolean(this.uv.attributes["soft_disabled"]);
  }

  @Watch("uv.info.mainEntity", { immediate: true, deep: true })
  private async updateShowAddRowButtons() {
    // Don't reset it here to avoid button flickering.
    // this.showAddRowButtons = false;

    if (!this.uv.info.mainEntity) {
      this.showAddRowButtons = false;
      return;
    }

    const entity = await this.getEntity(this.uv.info.mainEntity);
    this.showAddRowButtons = entity?.access.insert ?? false;
  }

  private deselectAllCells(opts?: { clearCursor?: boolean }) {
    this.uv.extra.selectedValues.keys().forEach(key => {
      this.selectValue(key, false);
    });
    this.lastSelectedRow = null;

    if (opts?.clearCursor) {
      this.clearCursorCell();
    }
  }

  // Cell text intended for copy to clipboard.
  private getClipboardTextByVisualPosition(pos: IVisualPosition): string {
    const ref = this.getValueRefByVisualPosition(pos);
    const value = this.uv.getValueByRef(ref);
    console.assert(value);
    const info = this.uv.info.columns[ref.column];
    return valueToPunnedText(info.valueType, value!.value);
  }

  private cellTdByVisualPosition(pos: IVisualPosition): HTMLElement {
    const valueRef = this.getValueRefByVisualPosition(pos);
    const value = this.uv.getValueByRef(valueRef)!.value;
    const valueText = this.getClipboardTextByVisualPosition(pos);
    const td = document.createElement("td");
    td.textContent = valueText;

    const fieldType = value.info?.field?.fieldType;
    if (fieldType?.type === "reference") {
      const valueJson = JSON.stringify(value.value);
      td.setAttribute("data-ozma-reference-value", valueJson);
    }

    return td;
  }

  private cellVisualPositionsToSerializedTable(positions: IVisualPosition[][]): string {
    const cellTds = positions.map(row => row.map(cell => this.cellTdByVisualPosition(cell)));
    const trs = cellTds.map(row => {
      const tr = document.createElement("tr");
      for (const cell of row) {
        tr.appendChild(cell);
      }
      return tr;
    });
    const tbody = document.createElement("tbody");
    for (const tr of trs) {
      tbody.appendChild(tr);
    }
    const table = document.createElement("table");
    table.appendChild(tbody);

    return (new XMLSerializer()).serializeToString(table);
  }

  private copySelectedCells(event: ClipboardEvent) {
    if (this.editing) return;
    if (this.selectedCells.length === 0) return;
    event.preventDefault();

    const positions = this.selectedCells.map(cell => this.getCellVisualPosition(cell) as IVisualPosition);
    const positions2D = Object.values(R.groupBy(cell => String(cell.row), positions)).map(row => row.sort((c1, c2) => c1.column - c2.column));
    const isRectangular = positions2D.every(row => row.length === positions2D[0].length);

    if (isRectangular) {
      const cells = positions2D.map(row => row.map(vp => this.getClipboardTextByVisualPosition(vp)));
      event.clipboardData?.setData("text/plain", plainTextStringify(cells));

      const serialized = this.cellVisualPositionsToSerializedTable(positions2D);
      event.clipboardData?.setData("text/html", serialized);
    } else {
      this.$bvToast.toast(this.$t("non_rectangular_copy").toString(), {
        title: this.$t("copy_error").toString(),
        variant: "warning",
        solid: true,
      });
    }
  }

  private cutSelectedCell(event: ClipboardEvent) {
    if (this.editing) return;
    this.copySelectedCells(event);
    this.clearSelectedCells();
  }

  private valueIsReadOnly(valueRef: ValueRef, throwToastOnReadOnly = false): boolean {
    const value = this.uv.getValueByRef(valueRef)!;
    const rowSoftDisabled = Boolean(value.row.attributes?.["soft_disabled"]);
    const valueSoftDisabled = Boolean(value.value.attributes?.["soft_disabled"]);
    if (!value.value.info?.field || this.softDisabled || rowSoftDisabled || valueSoftDisabled) {
      if (throwToastOnReadOnly) {
        this.$bvToast.toast(this.$t("read_only_cell").toString(), {
          title: this.$t("edit_error").toString(),
          variant: "danger",
          solid: true,
        });
      }
      return true;
    }
    return false;
  }

  private async pasteClipboardToSelectedCells(event: ClipboardEvent) {
    if (this.editing) return;
    if (this.selectedCells.length === 0) return;
    event.preventDefault();

    const parseResult = parseFromClipboard(event);
    switch (parseResult.type) {
      case "error":
        return;
      case "values": {
        const { values } = parseResult;
        if (values.length === 1 && values[0].length === 1) {
          for (const cell of this.selectedCells) {
            // eslint-disable-next-line no-await-in-loop
            await this.updateValueWithParseValue(cell, values[0][0]);
          }
        } else {
          await this.pasteManyCellsToSelectedCell(event, values);
        }
      }
    }
  }

  private async updateValueWithParseValue(ref: ValueRef, parseValue: ClipboardParseValue) {
    const value = this.uv.getValueByRef(ref)!.value;
    const fieldType = value.info?.field?.fieldType.type;
    if (parseValue.type === "reference") {
      const punOrValue = fieldType === "reference" ? parseValue.value : parseValue.pun;
      // FIXME TODO: If `fieldType` is `reference`, how to pass pun? Otherwise it's asks backend for every pasting, which sucks.
      await this.updateValue(ref, punOrValue);
    } else if (fieldType === "reference") {
      this.$bvToast.toast(this.$t("paste_no_referencefield_data").toString(), {
        title: this.$t("paste_error").toString(),
        variant: "danger",
        solid: true,
      });
    } else {
      await this.updateValue(ref, parseValue.value);
    }
  }

  private async pasteManyCellsToSelectedCell(event: ClipboardEvent, values: ClipboardParseValue[][]) {
    if (this.editing) return;
    let valueRef = this.uv.extra.cursorValue;
    if (!valueRef) return;

    const changedValueRefs: ValueRef[] = [];
    for (const [rowIndex, row] of values.entries()) {
      let counter = 0;
      for (const [cellIndex, cell] of row.entries()) {
        valueRef = this.uv.extra.cursorValue as ValueRef;

        if (this.valueIsReadOnly(valueRef, true)) return;

        // eslint-disable-next-line no-await-in-loop
        await this.updateValueWithParseValue(valueRef, cell);
        changedValueRefs.push(valueRef);
        if (cellIndex < row.length - 1) {
          const edgeReached = !this.moveCursor("right");
          if (edgeReached) {
            this.$bvToast.toast(this.$t("paste_error_too_many_columns").toString(), {
              title: this.$t("paste_error").toString(),
              variant: "danger",
              solid: true,
            });
            return;
          }
          counter++;
        }
      }

      while (counter !== 0) {
        counter--;
        this.moveCursor("left");
      }

      if (rowIndex < values.length - 1) {
        const bottomReached = !this.moveCursor("down");
        if (bottomReached) {
          /* eslint-disable-next-line no-await-in-loop */
          await this.addNewRowOnPosition("bottom_back");
          this.moveCursor("down");
        }
      }
    }
    for (const cell of changedValueRefs) {
      this.selectValue(cell, true);
    }
  }

  private clearCell(ref: ValueRef) {
    if (!this.valueIsReadOnly(ref, true)) {
      void this.updateValue(ref, "");
    }
  }

  private clearSelectedCells() {
    const cells = this.selectedCells;
    for (const cell of cells) {
      this.clearCell(cell);
    }
  }

  private onPressEnter() {
    if (this.editing) {
      this.removeCellEditing();
    } else {
      this.editCellOnCursor();
    }
  }

  private onOtherTableClicked(uid: any) {
    if (this.uid !== uid) {
      this.deselectAllCells();
      this.removeCellEditing();
    }
  }

  private onRowInOtherTableSelected(uid: string) {
    if (this.uid !== uid) {
      this.selectAll(false);
    }
  }

  private get rootEvents(): [name: string, callback: (event: any) => void][] {
    /* eslint-disable @typescript-eslint/unbound-method */
    const handlers = [
      ["copy", this.copySelectedCells],
      ["cut", this.cutSelectedCell],
      ["paste", this.pasteClipboardToSelectedCells],
      ["cell-click", this.onOtherTableClicked],
      ["row-select", this.onRowInOtherTableSelected],
      ["form-input-focused", this.deselectAllCells],
    ] as [name: string, callback: (event: any) => void][];
    /* eslint-enable @typescript-eslint/unbound-method */

    return handlers.map(([name, callback]) => {
      const wrapper = (event: unknown) => {
        if (this.checkWindow()) {
          callback(event);
        }
      };
      return [name, wrapper];
    });
  }

  /* Actually table does't change its width for now,
   * but ResizeObserver rather than one-time-calculation seems like more robust solution.  */
  private tableWidthObserver: ResizeObserver | null = null;
  private tableWidth: number | null = null;

  private parentWidthObserver: ResizeObserver | null = null;
  private parentWidth: number | null = null;
  private parentScrollLeft: number | null = null;
  private parentScrollTop: number | null = null;

  private onTableResize() {
    this.tableWidth = (this.$refs["table"] as HTMLElement | undefined)?.offsetWidth ?? null;
  }

  private onParentResize() {
    const parentElement = this.$el.parentElement;
    this.parentWidth = parentElement?.offsetWidth ?? null;
  }

  private onParentScroll() {
    const parentElement = this.$el.parentElement;
    this.parentScrollLeft = parentElement?.scrollLeft ?? null;
    this.parentScrollTop = parentElement?.scrollTop ?? null;
  }

  protected mounted() {
    /* eslint-disable @typescript-eslint/unbound-method */
    (this.$el as HTMLElement).addEventListener("scroll", this.removeCellEditing);
    /* window.addEventListener("scroll", this.removeCellEditing, true); */
    this.rootEvents.forEach(([name, callback]) => this.$root.$on(name, callback));
    if (this.$refs["table"]) {
      this.tableWidthObserver = new ResizeObserver(this.onTableResize);
      this.tableWidthObserver.observe(this.$refs["table"] as HTMLElement);
      this.tableWidthObserver = new ResizeObserver(this.onTableResize);
    }
    const parentElement = this.$el.parentElement;
    if (parentElement) {
      parentElement.addEventListener("scroll", this.onParentScroll);
      this.onParentScroll();
      this.parentWidthObserver = new ResizeObserver(this.onParentResize);
      this.parentWidthObserver.observe(parentElement);
    }
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  @Watch("showTree", { immediate: true })
  private watchShowTree() {
    if (this.showTree && !this.uv.rowLoadState.complete) {
      this.$emit("load-all-chunks", () => {});
    }
  }

  protected beforeDestroy() {
    /* eslint-disable @typescript-eslint/unbound-method */
    (this.$el as HTMLElement).removeEventListener("scroll", this.removeCellEditing);
    /* window.removeEventListener("scroll", this.removeCellEditing); */
    this.rootEvents.forEach(([name, callback]) => this.$root.$off(name, callback));
    if (this.$refs["table"]) {
      this.tableWidthObserver?.unobserve(this.$refs["table"] as HTMLElement);
    }
    const parentElement = this.$el.parentElement;
    if (parentElement) {
      this.tableWidthObserver?.unobserve(parentElement);
      parentElement.removeEventListener("scroll", this.onParentScroll);
    }
    /* eslint-enable @typescript-eslint/unbound-method */

    if (this.uv.extra.lazyLoad.type === "pagination" && this.isTopLevel) {
      this.$emit("update:current-page", null);
    }

    if (this.printListener !== null) {
      window.removeEventListener("beforeprint", this.printListener.printCallback);
      this.printListener.query.removeListener(this.printListener.queryCallback);
    }
    if (this.clickTimeout !== null) {
      clearTimeout(this.clickTimeout.id);
    }
    this.releaseEntries();
  }

  @Watch("filter", { immediate: true })
  protected updateFilter() {
    if (this.dirtyHackPreventEntireReloads) return;

    if (this.filter.length !== 0 && this.uv.rowLoadState.complete === false) {
      this.$emit("load-all-chunks");
    }

    const oldFilter = this.currentFilter;
    this.currentFilter = this.filter;

    // Check if current filter contained this one
    const contained = oldFilter.every(oldWord => this.currentFilter.some(newWord => newWord.startsWith(oldWord)));

    if (!contained) {
      this.buildRowPositions();
    } else {
      // Filter existing rows when we filter a subset of already filtered ones.
      const newWords = this.currentFilter.filter(newWord => !oldFilter.some(oldWord => oldWord.startsWith(newWord)));
      this.rowPositions = this.rowPositions.filter(rowI => rowI.type === "existing" && rowContains(this.uv.rows![rowI.position], newWords));
    }
  }

  @Watch("editingValue")
  protected updateEditingValue() {
    if (this.editingValue !== null) {
      const info = this.editingValue.value.info;
      const fieldType = info?.field?.fieldType;
      if (fieldType?.type === "reference") {
        if (!this.keptEntries.exists(info!.fieldRef)) {
          void this.addEntriesConsumer({ ref: info!.fieldRef, reference: this.uid });
          this.keptEntries.insert(info!.fieldRef);
        }
      }
    }
  }

  private get autofocusColumnIndex(): number | null {
    if (this.columnIndexes.length === 0) return null;
    const values = this?.uv?.emptyRow?.values;
    if (!values) return null;

    let result = this.columnIndexes[0];
    for (const icol of this.columnIndexes) {
      const column = values[icol];
      if (
        column.rawValue === undefined
        && column?.info !== undefined
      ) {
        if (!column?.info?.field?.isNullable) {
          return icol;
        } else if (
          values[result].rawValue !== undefined
          && column.rawValue === undefined
        ) {
          result = icol;
        }
      }
    }
    return result;
  }

  // TODO: Load all rows is temporary until we can't load rows by ids.
  private async loadAllRowsAndAddNewRowOnPosition(side: IAddedValueMeta["side"]): Promise<void> {
    if (!this.uv.rowLoadState.complete) {
      this.$emit("load-all-chunks", () => this.addNewRowOnPosition(side));
      return Promise.resolve();
    } else {
      return this.addNewRowOnPosition(side);
    }
  }

  private async addNewRowOnPosition(side: IAddedValueMeta["side"]): Promise<void> {
    const rowId = await this.addNewRow({ side });

    void nextRender().then(() => {
      const row = this.getVisualIndexOfAddedRow(rowId);
      if (row === null || this.autofocusColumnIndex === null) {
        console.error("Unable to autofocus to new row");
        return;
      }
      const column = this.getVisualColumnIndex(this.autofocusColumnIndex);
      const cellToFocus = this.getValueRefByVisualPosition({ row, column });
      this.setCursorCell(cellToFocus);
      this.editCellOnCursor();
    });
  }

  private getVisualIndexOfAddedRow(id: number): number | null {
    const index = this.shownRows.findIndex(row => row.key === `added-${id}`);
    return index === -1 ? null : index;
  }

  private showTreeChildren(parentRef: CommittedRowRef) {
    if (parentRef.type !== "existing") return;
    const children = this.uv.rows![parentRef.position].extra.tree.children;

    this.uv.rows![parentRef.position].extra.tree.arrowDown = true;

    const parentPosition = this.rowPositions.indexOf(parentRef);
    const leftChunk = this.rowPositions.splice(0, parentPosition + 1);
    this.rowPositions = [...leftChunk, ...children, ...this.rowPositions];
  }

  private hideTreeChildren(parent: CommittedRowRef) {
    if (parent.type !== "existing") return;
    const children = this.uv.rows![parent.position].extra.tree.children;
    this.uv.rows![parent.position].extra.tree.arrowDown = false;

    children.forEach(child => {
      const childPosition = this.rowPositions.indexOf(child);
      this.rowPositions.splice(childPosition, 1);
      if (child.type === "existing" && this.uv.rows![child.position].extra.tree.arrowDown) {
        this.hideTreeChildren(child);
      }
    });
  }

  private async addChild(parentRef: CommittedRowRef) {
    if (parentRef.type !== "existing") return;

    if (!this.uv.rows![parentRef.position].extra.tree.arrowDown) {
      this.showTreeChildren(parentRef);
    }
    const rowId = await this.addNewRow({ side: "position", parent: parentRef.position });
    const columnIndex = this.uv.extra.treeParentColumnIndex;

    this.uv.newRows[rowId].extra.tree.level = this.uv.rows![parentRef.position].extra.tree.level + 1;
    this.uv.newRows[rowId].extra.tree.parent = parentRef.position;

    const newRef: IAddedRowRef = { type: "added", id: rowId };
    await this.updateValue({ type: "added", id: rowId, column: columnIndex }, this.uv.rows![parentRef.position].mainId);

    const parentPosition = this.rowPositions.indexOf(parentRef);
    const leftChunk = this.rowPositions.splice(0, parentPosition + 1);
    this.rowPositions = [...leftChunk, newRef, ...this.rowPositions];

    const children = this.uv.rows![parentRef.position].extra.tree.children;
    this.uv.rows![parentRef.position].extra.tree.children = [newRef, ...children];
  }

  private toggleChildren(ref: CommittedRowRef, visible: boolean) {
    if (visible) {
      this.showTreeChildren(ref);
    } else {
      this.hideTreeChildren(ref);
    }
  }

  get showTree() {
    return Object.keys(this.uv.extra.rowsParentPositions).length !== 0 && this.filter.length === 0;
  }

  private pushTreeChildrenPositions(parentRef: CommittedRowRef, children: CommittedRowRef[]) {
    let newRowPositions: CommittedRowRef[] = [parentRef];

    children.forEach(child => {
      if (child.type === "existing" && this.uv.rows![child.position].extra.tree.arrowDown) {
        const row = this.uv.rows![child.position].extra.tree;
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
    let newRowPositions: CommittedRowRef[] = [];
    topLevelRows.forEach(rowI => {
      const row = this.uv.rows![rowI].extra.tree;
      const rowRef: IExistingRowRef = { type: "existing", position: rowI };
      if (row.arrowDown) {
        newRowPositions = newRowPositions.concat(this.pushTreeChildrenPositions(rowRef, row.children));
      } else {
        newRowPositions.push(rowRef);
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
      this.rowPositions = rows.map((row, rowI) => {
        return {
          type: "existing",
          position: rowI,
        };
      });
      if (this.filter.length !== 0) {
        this.rowPositions = this.rowPositions.filter(rowI => rowI.type === "existing" && rowContains(rows[rowI.position], this.filter));
      } else if (this.showTree) {
        this.rowPositions = this.initialRowPositions;
      }
      this.sortRows();
    }
  }

  private removeCellEditing() {
    // return;
    this.editing = null;
  }

  // Value is not actually required to be editable - it can be opened in read-only mode too.
  private setCellEditing(ref: ValueRef) {
    if (!this.canEditCell(ref)) return;

    const refPos = this.getCellVisualPosition(ref);
    if (!refPos) {
      return;
    }

    const element = this.getVisualCellElement(refPos);
    if (!element) {
      return;
    }

    element.scrollIntoView({ block: "nearest" });
    const cellRect = element.getBoundingClientRect();
    this.editing = {
      ref,
      x: cellRect.x,
      y: cellRect.y,
      width: element.offsetWidth,
      height: element.offsetHeight,
      minHeight: element.offsetHeight,
    };
  }

  private canEditCell(ref: ValueRef) {
    return !(this.columns[ref.column].type === "buttons");
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

    if (this.editingNonNullableBoolean && !this.valueIsReadOnly(ref)) {
      const value = this.uv.getValueByRef(ref)!.value.value;
      await this.updateCurrentValue(!value);
      this.removeCellEditing();
    }
  }

  private updateClickTimer(ref: ValueRef) {
    if (this.clickTimeout === null || !equalValueRef(this.clickTimeout.ref, ref)) {
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout.id);
      }
      const id = setTimeout(() => {
        this.clickTimeout = null;
      }, doubleClickTime);
      this.clickTimeout = {
        id,
        ref,
      };
    } else {
      clearTimeout(this.clickTimeout.id);
      this.clickTimeout = null;
      this.setCellEditing(ref);
    }
  }

  get parentWindow() {
    return elementWindow(this.$el as HTMLElement);
  }

  private checkWindow() {
    return this.activeWindow === this.parentWindow;
  }

  private closeCellContextMenu() {
    this.cellContextMenu = null;
  }

  private openCellContextMenu(pos: IVisualPosition, element: HTMLElement, event: MouseEvent) {
    const ref = this.getValueRefByVisualPosition(pos);
    this.setCursorCell(ref);

    this.cellContextMenu = {
      reference: {
        clientWidth: 1,
        clientHeight: 1,
        getBoundingClientRect: () => new DOMRect(event.clientX, event.clientY, 1, 1),
        removeEventListener: () => {},
      },
      buttons: this.getButtonsForContextMenu(pos),
    };
  }

  private getButtonsForContextMenu(pos: IVisualPosition): Button[] {
    return [
      {
        type: "callback",
        icon: "content_cut",
        caption: this.$t("cut").toString() + " (Ctrl+X)",
        variant: defaultVariantAttribute,
        callback: () => {
          void this.$bvModal.msgBoxOk(this.$t("contextmenu_cut_tooltip").toString(), {
            okTitle: this.$t("ok").toString(),
            centered: true,
          });
        },
      },
      {
        type: "callback",
        icon: "content_copy",
        caption: this.$t("copy").toString() + " (Ctrl+C)",
        variant: defaultVariantAttribute,
        callback: () => {
          void this.$bvModal.msgBoxOk(this.$t("contextmenu_copy_tooltip").toString(), {
            okTitle: this.$t("ok").toString(),
            centered: true,
          });
        },
      },
      {
        type: "callback",
        icon: "content_paste",
        caption: this.$t("paste").toString() + " (Ctrl+V)",
        variant: defaultVariantAttribute,
        callback: () => {
          void this.$bvModal.msgBoxOk(this.$t("contextmenu_paste_tooltip").toString(), {
            okTitle: this.$t("ok").toString(),
            centered: true,
          });
        },
      },
    ];
  }

  private getCellsInRectangle(corner1: IVisualPosition, corner2: IVisualPosition): IVisualPosition[] {
    const top = Math.min(corner1.row, corner2.row);
    const bottom = Math.max(corner1.row, corner2.row);
    const left = Math.min(corner1.column, corner2.column);
    const right = Math.max(corner1.column, corner2.column);

    const range = (start: number, end: number) =>
      Array(end - start + 1).fill(0).map((_, idx) => start + idx);

    const rows = this.shownRows.slice(top, bottom + 1);
    return rows.flatMap(
      (_, rowI) => range(left, right).map(i => ({ column: i, row: top + rowI })),
    );
  }

  private cellMouseDown(pos: IVisualPosition, element: HTMLElement, event: MouseEvent) {
    if (event.shiftKey || event.ctrlKey) return;

    const ref = this.getValueRefByVisualPosition(pos);
    this.deselectAllCells();
    this.setCursorCell(ref);

    // FIXME: `v-click-outside` somehow doesn't trigger on cell clicks, so close context menu there too.
    this.removeCellEditing();
    this.closeCellContextMenu();

    // We capture click-events from cells so we need to manually close popups here.
    if (this.columns[pos.column].type !== "buttons") {
      eventBus.emit("close-all-button-groups");
    }
  }

  private continueCellSelection(cursorPosition: IVisualPosition, element: HTMLElement, event: MouseEvent) {
    if (!(event.buttons & 1) || !this.uv.extra.oldCursorValue) return;
    const oldCursorPosition = this.getCellVisualPosition(this.uv.extra.oldCursorValue);
    if (!oldCursorPosition) {
      this.uv.extra.oldCursorValue = null;
      return;
    }

    this.deselectAllCells({ clearCursor: false });
    const cursorValue = this.getValueRefByVisualPosition(cursorPosition);
    this.setCursorCell(cursorValue, { keepOldCursor: true });

    const positions = this.getCellsInRectangle(oldCursorPosition, cursorPosition);
    for (const pos of positions) {
      this.selectValue(this.getValueRefByVisualPosition(pos), true);
    }
  }

  private endCellSelection(ref: IVisualPosition, element: HTMLElement, event: MouseEvent) {
    this.uv.extra.oldCursorValue = this.uv.extra.cursorValue;
  }

  private shiftSelectCells(pos: IVisualPosition) {
    const ref = this.getValueRefByVisualPosition(pos);
    this.deselectAllCells({ clearCursor: false });
    this.setCursorCell(ref, { keepOldCursor: true });

    if (!this.uv.extra.oldCursorValue) {
      return;
    }
    const prevValue = this.getCellVisualPosition(this.uv.extra.oldCursorValue);
    if (!prevValue) {
      this.uv.extra.oldCursorValue = null;
      return;
    }

    const cells = this.getCellsInRectangle(prevValue, pos);
    for (const cell of cells) {
      this.selectValue(this.getValueRefByVisualPosition(cell), true);
    }
  }

  private clickCell(pos: IVisualPosition, element: HTMLElement, event: MouseEvent) {
    if (event.ctrlKey) {
      this.removeCellEditing();
      if (this.uv.extra.cursorValue) {
        this.selectValue(this.uv.extra.cursorValue, true);
      }
      const ref = this.getValueRefByVisualPosition(pos);
      this.setCursorCell(ref);
    } else if (event.shiftKey) {
      this.removeCellEditing();
      this.shiftSelectCells(pos);
    } else {
      const ref = this.getValueRefByVisualPosition(pos);
      this.updateClickTimer(ref);
    }
  }

  private selectValue(ref: ValueRef, selectedStatus: boolean) {
    const cell = this.uv.getValueByRef(ref);
    if (!cell) return;

    if (cell.value.extra.selected !== selectedStatus) {
      cell.value.extra.selected = selectedStatus;
      if (selectedStatus) {
        this.uv.extra.selectedValues.insert(ref);
      } else {
        this.uv.extra.selectedValues.delete(ref);
      }
    }

    // Deselect other cells.
    /* this.$root.$emit("cell-click", this.uid); */
  }

  private setCursorCell(ref: ValueRef, opts?: { keepOldCursor?: boolean }) {
    const cell = this.uv.getValueByRef(ref);
    if (!cell) return;

    this.clearCursorCell(opts);

    this.uv.extra.cursorValue = ref;
    cell.value.extra.cursor = true;

    if (!opts?.keepOldCursor) {
      this.uv.extra.oldCursorValue = ref;
    }

    this.$root.$emit("cell-click", this.uid);
  }

  private clearCursorCell(opts?: { keepOldCursor?: boolean }) {
    if (!this.uv.extra.cursorValue) return;

    const cell = this.uv.getValueByRef(this.uv.extra.cursorValue);
    if (cell) {
      cell.value.extra.cursor = false;
    }
    this.uv.extra.cursorValue = null;
    if (!opts?.keepOldCursor) {
      const oldCursorValue = this.uv.extra.oldCursorValue;
      this.uv.extra.oldCursorValue = null;

      if (oldCursorValue) {
        if (oldCursorValue.type === "added") {
          const row = this.uv.newRows[oldCursorValue.id];
          if (row && isEmptyRow(row)) {
            const entity = this.uv.info.mainEntity;
            if (!entity) {
              throw new Error("View doesn't have a main entity");
            }

            void this.resetAddedEntry({
              entityRef: entity,
              id: oldCursorValue.id,
            });
          }
        }
      }
    }
  }

  @Watch("allRows")
  private clearSelectedRow() {
    this.lastSelectedRow = null;
  }

  private selectTableRow(pos: number, event: MouseEvent) {
    const row = this.allRows[pos];

    // If we are in a selection mode, just emit selected row.
    if (this.selectionMode && row.ref.type === "existing" && row.row.extra.selectionEntry) {
      this.$emit("select", row.row.extra.selectionEntry);
      return;
    }

    if (this.lastSelectedRow !== null && event.shiftKey) {
      const prevRow = this.allRows[this.lastSelectedRow];
      const prevSelected = prevRow.row.extra.selected;
      const [from, to] = this.lastSelectedRow <= pos ? [this.lastSelectedRow, pos] : [pos, this.lastSelectedRow];
      for (let i = from; i <= to; i++) {
        this.selectRow(this.allRows[i].ref, prevSelected);
        this.selectChildrenRows(this.allRows[i].row, prevSelected);
      }
    } else {
      this.selectRow(row.ref, !row.row.extra.selected);
      this.selectChildrenRows(row.row, row.row.extra.selected);
    }

    this.lastSelectedRow = pos;
    this.$root.$emit("row-select", this.uid);
  }

  private selectChildrenRows(row: ITableExtendedRowCommon, selected: boolean) {
    row.extra.tree.children.forEach(child => {
      const childRow = this.uv.getRowByRef(child);
      if (childRow && childRow.extra.tree.children.length > 0) {
        this.selectChildrenRows(childRow, selected);
      }
      this.selectRow(child, selected);
    });
  }

  selectAll(selectedStatus: boolean) {
    if (selectedStatus) {
      this.allRows.forEach((localRow, rowI) => {
        const row = this.uv.getRowByRef(localRow.ref);
        row!.extra.selected = true;
        this.uv.extra.selectedRows.insert(localRow.ref);
      });
    } else {
      this.uv.extra.selectedRows.keys().forEach(ref => {
        if (ref.type === "existing") {
          this.uv.getRowByRef(ref)!.extra.selected = false;
        } else if (ref.type === "added") {
          this.uv.newRows[ref.id].extra.selected = false;
        } else {
          throw new Error("Impossible");
        }
      });
      this.uv.extra.selectedRows = new ObjectSet();
    }
  }

  private toggleAllRows() {
    this.selectAll(!this.selectedSome);
    this.$root.$emit("row-select", this.uid);
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
      this.$emit("update:body-style", `
                @media print {
                    @page {
                        size: landscape;
                    }
                }
            `);
    }

    this.$emit("update:enable-filter", this.uv.rows !== null && !this.dirtyHackPreventEntireReloads);

    this.updateRows();
  }

  private updateRows() {
    this.buildRowPositions();
  }

  private loadAllRowsAndUpdateSort(sortColumn: number) {
    if (this.dirtyHackPreventEntireReloads) return;

    if (!this.uv.rowLoadState.complete) {
      this.$emit("load-all-chunks", () => this.updateSort(sortColumn));
    } else {
      this.updateSort(sortColumn);
    }
  }

  /*
    first sort
    bool:   descending
    number: descending
    string: ascending
  */
  private updateSort(sortColumn: number) {
    const type = this.columns[sortColumn].columnInfo.valueType.type;
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
    if (this.uv.extra.sortColumn !== null) {
      const sortColumn = this.uv.extra.sortColumn;
      const collator = new Intl.Collator(["en", "ru"], this.uv.extra.sortOptions);
      const sortFunction: (a: CommittedRowRef, b: CommittedRowRef) => number =
        this.uv.extra.sortAsc ?
          (a, b) => rowIndicesCompare(a, b, this.uv, sortColumn, collator) :
          (a, b) => rowIndicesCompare(b, a, this.uv, sortColumn, collator);

      const sortNewFunction: (a: NewRowRef, b: NewRowRef) => number =
        this.uv.extra.sortAsc ?
          (a, b) => newRowIndicesCompare(a, b, this.uv, sortColumn, collator) :
          (a, b) => newRowIndicesCompare(b, a, this.uv, sortColumn, collator);

      this.rowPositions.sort(sortFunction);
      this.uv.extra.newRowTopSidePositions.sort(sortNewFunction);
      this.uv.extra.newRowBottomSidePositions.sort(sortNewFunction);
    }
  }

  get existingRows(): IShownRow[] {
    const rows = this.uv.rows;
    if (rows === null) {
      return [];
    } else {
      return mapMaybe(rowI => {
        if (rowI.type === "existing") {
          const row = rows[rowI.position];
          if (row.deleted || row.extra.shownAsNewRow) {
            return undefined;
          }
          return {
            key: String(rowI.position),
            notExisting: false,
            row,
            ref: rowI,
          };
        } else {
          const row = this.uv.newRows[rowI.id];
          return !row ? undefined : {
            key: `${rowI.type}-${rowI.id}`,
            row,
            notExisting: true,
            ref: rowI,
          };
        }
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

  // FIXME: Broken for trees.
  get statusLine() {
    const totalAdded = this.topRows.length + this.bottomRows.length;
    return this.uv.rowLoadState.complete ? `${totalAdded + this.existingRows.length}` : "";
  }

  @Watch("statusLine", { immediate: true })
  private updateStatusLine() {
    this.$emit("update:status-line", this.statusLine);
  }

  get allRows() {
    if (this.uv.extra.lazyLoad.type === "pagination") {
      const start = this.uv.extra.lazyLoad.pagination.currentPage * this.uv.extra.lazyLoad.pagination.perPage;
      const end = start + this.uv.extra.lazyLoad.pagination.perPage;
      const sliced = this.existingRows.slice(start, end);
      return [...this.topRows, ...sliced, ...this.bottomRows];
    } else {
      return [...this.topRows, ...this.existingRows, ...this.bottomRows];
    }
  }

  get shownRows() {
    switch (this.uv.extra.lazyLoad.type) {
      case "infinite_scroll": {
        const totalAdded = Object.keys(this.uv.newRows).length;
        return this.allRows.slice(0, totalAdded + this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength);
      }
      case "pagination":
        return this.allRows;
      default:
        throw new NeverError(this.uv.extra.lazyLoad);
    }
  }

  private async updateCurrentValue(rawValue: unknown) {
    const editing = this.editing!;
    const ref = editing.ref;
    const newRef = await this.updateValue(ref, rawValue);
    if (ref.type === "new") {
      editing.ref = newRef;
      this.setCursorCell(ref);
      // FIXME: we shouldn't implement this logic purely for barcodes. Instead, react to keyboard <RET> event!
      if (this.uv.columnAttributes[newRef.column].text_type === "barcode") {
        void this.addNewRowOnPosition("bottom_back");
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  @include variant-to-local("table");
  @include variant-to-local("default");

  table,
  th,
  td {
    border: 1px solid var(--table-borderColor);
  }

  ::v-deep .table-td {
    padding: 0.15rem;
  }

  .button-container {
    position: sticky;
    left: 0;
    display: flex;
    padding: 0.25rem;
    transition: opacity 0.2s;
  }

  .context-menu-wrapper {
    min-width: 10rem;
    background-color: var(--default-backgroundColor);
    z-index: 25;
  }

  .pagination-wrapper {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    width: fit-content;
    z-index: 30;
    pointer-events: none;
  }

  .pagination {
    position: sticky;
    top: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--default-backgroundDarker1Color);
    pointer-events: all;

    .current-page-wrapper {
      min-width: 3rem; /* To fit at least `99/99` without changing width */
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .select-wrapper {
      width: 4.5rem; /* To fit any option text */

      .page-select {
        background-color: var(--default-backgroundDarker1Color);
        border-color: var(--default-borderColor);
      }
    }

    .pages-count {
      color: var(--default-foregroundDarkerColor);
    }
  }

  .no-results {
    text-align: left;
    color: var(--default-foregroundDarkerColor);
    margin-left: 1rem;
  }

  .table {
    /* Bootstrap's colors was overrided in style.css and there they overrided again */
    --MainBorderColor: var(--table-backgroundDarker1Color);
  }

  .table-block {
    position: relative;
    background-color: var(--table-backgroundDarker1Color);
  }

  .data-col {
    max-width: 100vw !important;
  }

  .tabl {
    /* width: 100%; */
    padding: 0;
  }

  .custom-table {
    border-collapse: separate !important;
    border-spacing: 0;
    table-layout: fixed;
    width: 0;
    border: 1px solid var(--table-backgroundDarker2Color);
    border-left: none;
    background-color: var(--table-backgroundColor);
    margin: 0;
    border-radius: 0.2rem;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  .table-th {
    height: 2rem;
    border: 0;
    font-weight: normal;
    max-width: 50px !important;
    overflow: hidden;
    white-space: nowrap;
    box-shadow: 0 2px 0 var(--table-backgroundDarker1Color);
    text-overflow: ellipsis;
    position: sticky; /* фиксация шапки при скроле */
    z-index: 20; /* при скроле таблицы чтобы шапка была видна */
    border-right: 1px solid var(--table-backgroundDarker1Color);

    /* Instead of `0` to fix Safari's gap bug, not needed in normal browsers, but easier to set same for all. */
    top: -1px;
    cursor: pointer;
    color: var(--MainTextColorLight);
    background-color: var(--table-backgroundColor);
  }

  .table-th:last-child {
    border-right: none;
  }

  ::v-deep td > p {
    margin-bottom: 0;
  }

  tr {
    height: 2rem; /* Fix for Firefox */
  }

  th.fixed-column {
    z-index: 25; /* поверх обычных столбцов */
    position: sticky;

    &.checkbox-cells {
      ::v-deep .checkbox {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      ::v-deep .checkbox__input {
        display: block;
        line-height: 0;
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

    .active-editing {
      position: sticky !important;
      justify-content: flex-start;
      z-index: 100000; /* чтобы FormControl был поверх других таблиц, когда их несколько на странице */
    }
  }

  @media screen and (max-device-width: 768px), screen and (orientation: portrait) {
    ::v-deep {
      .fixed-column {
        left: auto !important;
      }
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
      /* max-width: 100% !important; */
      page-break-inside: auto;
      border-spacing: 0;
    }

    td ::v-deep a {
      text-decoration: none !important;
    }
  }

  ::v-deep .checkbox-cells {
    text-align: center;
    color: var(--cell-foregroundDarkerColor, var(--table-foregroundDarkerColor));
    padding: 0;
    transition: background 0.1s;

    &.table-th .material-icons {
      position: static;
    }

    .table-td_span .material-icons {
      position: relative;
      top: 3px;
    }

    &:hover {
      color: var(--cell-foregroundColor, var(--table-foregroundColor));
      background-color: var(--cell-backgroundDarker1Color, var(--table-backgroundDarker1Color));
      transition: background 0s;
    }
  }

  ::v-deep {
    /* Second selctor is for system columns */
    .table-tr.last-top-new td,
    .table-tr.last-top-new td ~ td {
      border-bottom: 2px solid var(--table-backgroundDarker2Color);
    }

    /* stylelint-disable no-descending-specificity */
    .table-tr.first-bottom-new td,
    .table-tr.first-bottom-new td ~ td {
      border-top: 2px solid var(--table-backgroundDarker2Color);
    }
    /* stylelint-enable no-descending-specificity */
  }

  ::v-deep .button-element > button {
    width: 100%;
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
      color: var(--cell-foregroundDarkerColor, var(--table-foregroundDarkerColor));
    }

    .edit-in-modal-icon {
      position: relative;
      top: 5px;
      color: var(--cell-foregroundDarkerColor, var(--table-foregroundDarkerColor));
    }

    a {
      display: block;
      text-decoration: none;

      &:hover {
        .add-in-modal-icon {
          color: var(--cell-foregroundColor, var(--table-foregroundColor));
        }
      }
    }

    &.table-th {
      padding: 0;
      height: 2rem;

      > span,
      > a {
        height: 100%;
        display: flex;

        button {
          color: var(--cell-foregroundDarkerColor, var(--table-foregroundDarkerColor));
          flex: 1;
        }

        &:hover {
          background-color: var(--cell-backgroundDarker1Color, var(--table-backgroundDarker1Color));

          button {
            color: var(--cell-foregroundColor, var(--table-foregroundColor));
          }
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
    }
  }

  .checkbox-col,
  .open-form-col {
    width: 35px;
  }

  thead {
    line-height: 2rem;
  }

  .table-block:not(.multiple-cells-selected) ::v-deep {
    .table-td.selected {
      box-shadow:
        inset 2px 2px 0 var(--FocusBorderColor),
        inset -2px -2px 0 var(--FocusBorderColor);
    }

    .selection-overlay {
      display: none;
    }
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

  .empty-userview {
    margin: 0.5rem;
    padding: 0.25rem 0.5rem;
    opacity: 0.7;
    border: 1px solid var(--MainBorderColor);
    border-radius: 0.2rem;
    color: var(--MainTextColor);
  }
</style>
