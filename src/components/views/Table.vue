<i18n>
    {
      "en": {
        "not_all_entries_loaded": "Not all entries are loaded",
        "paste_error": "Pasting error",
        "clear_error": "Clearing error",
        "read_only_cell": "Read-only cell",
        "paste_no_referencefield_data": "Clipboard has no reference field data",
        "paste_error_too_many_columns": "Clipboard has too many columns",
        "no_results": "No entries",
        "add_entry": "Add entry",
        "add_entry_in_modal": "Add new entry (in modal window)"
      },
      "ru": {
        "not_all_entries_loaded": "Не все записи загружены",
        "paste_error": "Ошибка при вставке",
        "clear_error": "Ошибка при очистке поля",
        "read_only_cell": "Ячейка только для чтения",
        "paste_no_referencefield_data": "В буфере обмена неверная информация для вставки в данное поле",
        "paste_error_too_many_columns": "В буфере обмена слишком много столбцов",
        "no_results": "Нет записей",
        "add_entry": "Добавить запись",
        "add_entry_in_modal": "Добавить новую запись (в модальном окне)"
      }
    }
</i18n>

<template>
  <div
    v-hotkey="keymap"
    fluid
    infinite-wrapper
    :class="[
      'table-block',
      {
        'nested': !isRoot,
        'active-editing': editingValue !== null,
        'mobile': $isMobile,

      }]"
  >
    <TableCellEdit
      v-if="editingValue"
      v-click-outside="clickOutsideEdit"
      :width="editParams.width"
      :min-height="editParams.minHeight"
      :height="editParams.height"
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
    </TableCellEdit>

    <div
      ref="tableContainer"
      class="tabl"
    >
      <div
        v-if="uv.emptyRow !== null || uv.extra.lazyLoad.type === 'pagination'"
        class="button-container"
      >
        <ButtonItem
          v-if="uv.emptyRow !== null && !uv.extra.softDisabled && !uv.extra.dirtyHackPreventEntireReloads"
          :button="topAddButton"
        />
        <div
          v-if="uv.extra.lazyLoad.type === 'pagination'"
          :class="['pagination', { 'ml-auto': uv.emptyRow === null }]"
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

      <table
        class="custom-table table table-sm"
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
              @click="toggleAllRows"
            >
              <Checkbox
                :checked="selectedAll"
                :indeterminate="!selectedAll && selectedSome"
              />
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
                  v-b-tooltip.hover.right.noninteractive="{
                    title: $t('add_entry_in_modal').toString(),
                    disabled: $isMobile,
                  }"
                  class="material-icons add-in-modal-icon"
                >add_box</i>
              </FunLink>
            </th>
            <th
              v-for="i in columnIndexes"
              :key="i"
              :class="['sorting', 'table-th', {
                'fixed-column' : uv.extra.columns[i].fixed,
                'td-moz': isFirefoxBrowser
              }]"
              :style="uv.extra.columns[i].style"
              :title="uv.extra.columns[i].caption"
              @click="loadAllRowsAndUpdateSort(i)"
            >
              <span class="table_header__content">
                {{ uv.extra.columns[i].caption }}
              </span>
              <span v-if="uv.extra.sortColumn === i">{{ uv.extra.sortAsc ? "▲" : "▼" }}</span>
            </th>
          </tr>
        </thead>
        <!--
        <transition-group tag="tbody" name="fade-2">
        -->
        <tbody>
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
            @toggle-children="toggleChildren(row.ref, $event)"
            @add-child="addChild(row.ref)"
            @goto="$emit('goto', $event)"
          />
        </tbody>
        <!--
        </transition-group>
        -->
      </table>
      <InfiniteLoading
        v-if="useInfiniteScrolling"
        ref="infiniteLoading"
        :force-use-infinite-wrapper="isRoot ? '.tabl' : '.view-form'"
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
        v-if="uv.emptyRow !== null && !uv.extra.softDisabled && !uv.extra.dirtyHackPreventEntireReloads"
        ref="bottomButtonContainer"
        class="button-container"
      >
        <ButtonItem :button="bottomAddButton" />
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
import { z } from "zod";
import { IResultColumnInfo, ValueType, RowId, IFieldRef } from "ozma-api";
import sanitizeHtml from "sanitize-html";

import { deepEquals, isFirefox, mapMaybe, nextRender, ObjectSet, tryDicts, ReferenceName, replaceHtmlLinks, parseSpreadsheet, validNumberFormats, getNumberFormatter, NeverError } from "@/utils";
import { valueIsNull } from "@/values";
import { UserView } from "@/components";
import { maxPerFetch } from "@/components/UserView.vue";
import { AddedRowId, AutoSaveLock } from "@/state/staging_changes";
import { IAttrToQueryOpts, ICurrentQueryHistory } from "@/state/query";
import BaseUserView, { IBaseRowExtra, IBaseValueExtra, IBaseViewExtra, baseUserViewHandler } from "@/components/BaseUserView";
import TableRow from "@/components/views/table/TableRow.vue";
import Checkbox from "@/components/checkbox/Checkbox.vue";
import TableCellEdit, { ICellCoords, IEditParams } from "@/components/views/table/TableCellEdit.vue";
import { Link, attrToLinkRef, attrToLinkSelf } from "@/links";
import {
  currentValue, IAddedRow, IAddedRowRef, ICombinedRow, ICombinedUserView, ICombinedUserViewAny, ICombinedValue, IExistingRowRef, IExtendedAddedRow,
  IExtendedRow, IExtendedRowCommon, IExtendedRowInfo, IExtendedValue, IRowCommon, IUserViewHandler, RowRef, ValueRef,
  valueToPunnedText, CommittedRowRef,
} from "@/user_views/combined";
import { getColorVariables } from "@/utils_colors";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import { Button } from "../buttons/buttons";

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
  valueHtml: string; // Don't forget to sanitize!
  link: Link | null;
  style: Record<string, unknown> | null;
  colorVariables: Record<string, unknown> | null;
  selected: boolean;
  htmlElement: HTMLElement | null;
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
  style: Record<string, unknown> | null;
  colorVariables: Record<string, unknown> | null;
  height: number | null;
  link: Link | null;
  tree: ITableRowTree;
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
  isSelectionColumnEnabled: boolean;
  hasRowLinks: boolean;
  selectedValues: ObjectSet<ValueRef>;
  columns: IColumn[];
  fixedColumnPositions: Record<number, string>;
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

  dirtyHackPreventEntireReloads: boolean;
}

const showStep = 15;
const doubleClickTime = 700;
// FIXME: Use CSS variables to avoid this constant
const technicalFieldsWidth = 35; // checkbox's and openform's td width

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

  if (!isTreeUnfoldColumnSet && columns[0]) {
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

  let valueHtml = valueToPunnedText(columnInfo.valueType, value);
  const style: Record<string, unknown> = {};

  const punOrValueType: ValueType = columnInfo.punType ?? columnInfo.valueType;

  const numberTypes: (ValueType["type"])[] = ["int", "decimal"];
  if (numberTypes.includes(punOrValueType.type)) {
    style["text-align"] = "right";

    const numberFormat = getCellAttr("number_format");
    if (typeof numberFormat === "string" && validNumberFormats.includes(numberFormat.toLowerCase() as any)) {
      const fractionDigitsRaw = getCellAttr("fraction_digits");
      const fractionDigits = typeof fractionDigitsRaw === "number" ? fractionDigitsRaw : undefined;
      valueHtml = getNumberFormatter(numberFormat.toLowerCase() as any, fractionDigits).format(value.value as any);
    }
  } else if (punOrValueType.type === "string") {
    valueHtml = replaceHtmlLinks(valueHtml);
  }

  const cellColor = getCellAttr("cell_color");
  if (cellColor !== undefined && cellColor !== null) {
    style["background-color"] = String(cellColor);
  }

  const textAlignAttr = getCellAttr("text_align");
  if (textAlignAttr !== undefined) {
    style["text-align"] = String(textAlignAttr);
  }

  if (row.extra.height !== null) {
    style["height"] = `${row.extra.height}px`;
  }

  const fixedPosition = uv.extra.fixedColumnPositions[columnIndex];
  if (fixedPosition !== undefined) {
    style["left"] = fixedPosition;
  }

  if (getCellAttr("text_type") === "codeeditor") {
    style["font-family"] = "monospace";
  }

  if (columnInfo.valueType.type === "datetime"
   && moment.isMoment(value.value)
   && getCellAttr("show_seconds") === true) {
    valueHtml = value.value.local().format("L LTS");
  }

  const colorVariant = getCellAttr("cell_variant");
  let colorVariables = null;
  if (colorVariant) {
    colorVariables = getColorVariables("tableCell", colorVariant);
  // TODO: Not sure, but getting attribute by `getCellAttr` may have performance issues on big tables with uv-wide `cell_color`.
  /* } else if (cellColor) { */
  } else if (value.attributes?.["cell_color"]) {
    console.warn("`cell_color` attribute is deprecated, use `cell_variant` or `row_variant` instead.");
    colorVariables = getColorVariables("tableCell", { background: String(cellColor) });
  }

  const extra = {
    valueHtml,
    style: null as Record<string, unknown> | null,
    colorVariables,
  };
  if (Object.keys(style).length !== 0) {
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

  const colorVariant = getRowAttr("row_variant");
  let colorVariables = null;
  if (colorVariant) {
    colorVariables = getColorVariables("tableCell", colorVariant);
  }

  const extra = {
    searchText: "",
    height: null as number | null,
    style: null as Record<string, unknown> | null,
    colorVariables,
    link: null,
    shownAsNewRow: false,
    tree,
  };

  const height = Number(getRowAttr("row_height"));
  if (!Number.isNaN(height)) {
    style["white-space"] = "nowrap";
    extra.height = height;
  }

  if (Object.keys(style).length !== 0) {
    extra.style = style;
  }

  return extra;
};

const updateCommonValue = (uv: ITableCombinedUserView, row: ITableExtendedRowCommon, columnIndex: number, value: ITableExtendedValue) => {
  const columnInfo = uv.info.columns[columnIndex];

  const valueHtml = valueToPunnedText(columnInfo.valueType, value);
  const sanitized = sanitizeHtml(valueHtml, { allowedTags: [], disallowedTagsMode: "escape" });
  value.extra.valueHtml = sanitized;
};

const postInitCommonRow = (uv: ITableCombinedUserView, row: ITableExtendedRowCommon) => {
  const searchStrings = row.values.map(value => {
    return value.extra.valueHtml.toLocaleLowerCase();
  });
  row.extra.searchText = "\0".concat(...searchStrings);
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

    const lazyLoad = oldView?.lazyLoad ?? lazyLoadSchema.parse(uv.attributes["lazy_load"]);

    const newRowTopSidePositions = oldView ? inheritOldRowsPositions(uv, oldView.newRowTopSidePositions) : [];
    const newRowBottomSidePositions = oldView ? inheritOldRowsPositions(uv, oldView.newRowBottomSidePositions) : [];
    const addedRowRefs = oldView ? inheritOldRowsPositions(uv, oldView.addedRowRefs) : [];

    const dirtyHackPreventEntireReloadsRaw = uv.attributes["dirty_hack_prevent_entire_reloads"];
    const dirtyHackPreventEntireReloads = typeof dirtyHackPreventEntireReloadsRaw === "boolean"
      ? dirtyHackPreventEntireReloadsRaw
      : false;

    return {
      ...baseExtra,
      isSelectionColumnEnabled,
      hasRowLinks: false,
      selectedValues: new ObjectSet<ValueRef>(),
      columns,
      fixedColumnPositions: {},
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
      dirtyHackPreventEntireReloads,
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

const isEmptyRow = (row: IRowCommon) => {
  return row.values.every(cell => valueIsNull(cell.rawValue) || cell.info === undefined);
};

const parseFromClipboard = (event: ClipboardEvent): number | null | undefined => {
  const serialized = event.clipboardData?.getData("text/html");
  if (serialized === undefined) return undefined;

  const parsed = (new DOMParser()).parseFromString(serialized, "text/html");
  if (parsed.documentElement.nodeName !== "parsererror") {
    const valueJson = parsed.documentElement.querySelector("span")?.attributes.getNamedItem("data-ozma-value")?.value;
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
const query = namespace("query");

interface IShownRow {
  key: string;
  row: ITableExtendedRowCommon;
  notExisting: boolean;
  ref: RowRef;
}

const defaultPageSize = 5;
// Just look at `ITableLazyLoad` to see which type this mess make.
export const lazyLoadSchema =
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

type ITableLazyLoad = z.infer<typeof lazyLoadSchema>;

type MoveDirection = "up" | "right" | "down" | "left";

@UserView({
  handler: tableUserViewHandler,
  useLazyLoad: true,
})
@Component({
  components: {
    TableRow, Checkbox, TableCellEdit, InfiniteLoading, ButtonItem,
  },
})
export default class UserViewTable extends mixins<BaseUserView<ITableValueExtra, ITableRowExtra, ITableViewExtra>>(BaseUserView) {
  @query.State("current") query!: ICurrentQueryHistory | null;
  @staging.Action("addAutoSaveLock") addAutoSaveLock!: () => Promise<AutoSaveLock>;
  @staging.Action("removeAutoSaveLock") removeAutoSaveLock!: (id: AutoSaveLock) => Promise<void>;
  @entries.Mutation("removeEntriesConsumer") removeEntriesConsumer!: (args: { ref: IFieldRef; reference: ReferenceName }) => void;
  @entries.Mutation("addEntriesConsumer") addEntriesConsumer!: (args: { ref: IFieldRef; reference: ReferenceName }) => void;

  // These two aren't computed properties for performance. They are computed during `init()` and mutated when other values change.
  // If `init()` is called again, their values after recomputation should be equal to those before it.
  private currentFilter: string[] = [];
  private rowPositions: CommittedRowRef[] = [];
  private lastSelectedRow: number | null = null;
  private lastSelectedValue: ValueRef | null = null;
  private editing: ITableEditing | null = null;
  private printListener: { query: MediaQueryList; queryCallback: (mql: MediaQueryListEvent) => void; printCallback: () => void } | null = null;
  private clickTimeoutId: NodeJS.Timeout | null = null;
  private isFirefoxBrowser: boolean = isFirefox();
  // FIXME: we should get rid of this.
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
  private keptEntries = new ObjectSet<IFieldRef>();

  // FIXME: Delete this unused variable and `setInputHeight` function.
  private cellEditHeight = 0;

  private rowsState: Record<number, any> = {};

  // Used for Tab-Enter selection moving.
  // Probably need to move to extra.
  private columnDelta = 0;

  private get useInfiniteScrolling() {
    return this.uv.extra.lazyLoad.type === "infinite_scroll";
  }

  private get pageSizes() {
    if (this.uv.extra.lazyLoad.type !== "pagination") return [];

    const defaultSizes = [5, 10, 25, 50];
    if (!defaultSizes.includes(this.uv.extra.lazyLoad.pagination.perPage)) {
      return [this.uv.extra.lazyLoad.pagination.perPage, ...defaultSizes].map(num => ({ value: num, text: String(num) }));
    } else {
      return defaultSizes.map(num => ({ value: num, text: String(num) }));
    }
  }

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

  private get firstPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== "pagination") return null;

    return {
      type: "callback",
      icon: "skip_previous",
      variant: "interfaceButton",
      disabled: this.uv.extra.lazyLoad.pagination.currentPage === 0,
      colorVariables: getColorVariables("button", "interfaceButton"),
      callback: () => this.goToFirstPage(),
    };
  }

  private get prevPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== "pagination") return null;

    return {
      type: "callback",
      icon: "arrow_left",
      variant: "interfaceButton",
      disabled: this.uv.extra.lazyLoad.pagination.currentPage === 0,
      colorVariables: getColorVariables("button", "interfaceButton"),
      callback: () => this.goToPrevPage(),
    };
  }

  private get nextPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== "pagination") return null;

    return {
      type: "callback",
      icon: "arrow_right",
      variant: "interfaceButton",
      disabled: (this.uv.rowLoadState.complete && this.onLastPage) || this.uv.extra.lazyLoad.pagination.loading,
      colorVariables: getColorVariables("button", "interfaceButton"),
      callback: () => this.goToNextPage(),
    };
  }

  private get onLastPage() {
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

    this.$emit("update:currentPage", this.uv.extra.lazyLoad.pagination.currentPage);
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

  private get infiniteIdentifier() {
    return `${this.uv.rows?.length}${this.existingRows}`;
  }

  private infiniteHandler(ev: StateChanger) {
    if (this.uv.extra.lazyLoad.type !== "infinite_scroll") return;

    this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength += showStep;

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
      variant: "interfaceButton",
      colorVariables: getColorVariables("button", "interfaceButton"),
      caption: this.$t("add_entry").toString(),
      callback: () => this.loadAllRowsAndAddNewRowOnPosition("top_front"),
    };
  }

  private get bottomAddButton(): Button {
    return {
      type: "callback",
      icon: "add",
      variant: "interfaceButton",
      colorVariables: getColorVariables("button", "interfaceButton"),
      caption: this.$t("add_entry").toString(),
      callback: () =>
        this.loadAllRowsAndAddNewRowOnPosition("bottom_back").then(() =>
          (this.$refs.bottomButtonContainer as Element | undefined)?.scrollIntoView({ block: "nearest" })),
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
    if (options.resetColumnDelta ?? true) {
      this.columnDelta = 0;
    }
    const oldPosition = this.getSelectedCellPosition();
    if (!oldPosition) return false;
    const maxRow = this.shownRows.length - 1;
    const maxColumn = this.columnIndexes.length - 1;

    /* eslint-disable no-multi-spaces, comma-spacing, key-spacing, space-in-parens */
    const calcDelta = (decDirection: MoveDirection, incDirection: MoveDirection) =>
      (options.step ?? 1) * ((direction === incDirection ? 1 : 0) - (direction === decDirection ? 1 : 0));
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
    if (this.editing === null || this.editingValue === null) {
      return false;
    } else {
      return this.editingValue.value.extra.softDisabled || (this.editing.ref.type !== "existing" && this.addedLocked);
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

  @Watch("uv", { immediate: true })
  private uvInit(newUv: any, oldUv: any) {
    if (oldUv) return; // Fire method once.

    if (this.initialPage !== null && this.uv.extra.lazyLoad.type === "pagination") {
      this.goToPage(this.initialPage);
    }
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
    const valueText = value.extra.valueHtml;
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

  private valueIsReadOnly(valueRef: ValueRef, throwToastOnReadOnly = false): boolean {
    const value = this.uv.getValueByRef(valueRef)!.value;
    if (!value.info || !value.info.field || value.extra.softDisabled) {
      if (throwToastOnReadOnly) {
        this.$bvToast.toast(this.$t("read_only_cell").toString(), {
          title: this.$t("paste_error").toString(),
          variant: "danger",
          solid: true,
        });
      }
      return true;
    }
    return false;
  }

  private async pasteToSelectedCell(event: ClipboardEvent) {
    if (this.editing) return;
    let valueRef = this.getSelectedCell();
    if (!valueRef) return;

    if (this.valueIsReadOnly(valueRef, true)) return;

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
      if (typeof sourcePlain === "string") {
        const parsed = parseSpreadsheet(sourcePlain);
        const initialValueRef = valueRef;
        /* eslint-disable no-await-in-loop */
        for (const [rowIndex, row] of parsed.entries()) {
          let counter = 0;
          for (const [cellIndex, cell] of row.entries()) {
            valueRef = this.getSelectedCell() as ValueRef;

            if (this.valueIsReadOnly(valueRef, true)) return;

            await this.updateValue(valueRef, cell);
            if (cellIndex < row.length - 1) {
              const edgeReached = !this.moveSelection("right");
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
            this.moveSelection("left");
          }

          if (rowIndex < parsed.length - 1) {
            const bottomReached = !this.moveSelection("down");
            if (bottomReached) {
              await this.addNewRowOnPosition("bottom_back");
              this.moveSelection("down");
            }
          }
        }
        this.deselectAllCells();
        this.selectValue(initialValueRef);
      }
    }

    event.preventDefault();
  }

  private clearSelectedCell() {
    const valueRef = this.getSelectedCell();
    if (!valueRef) return;

    const value = this.uv.getValueByRef(valueRef)!.value;
    if (!value.info || !value.info.field) {
      this.$bvToast.toast(this.$t("read_only_cell").toString(), {
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

  private onRowInOtherTableSelected(uid: string) {
    if (this.uid !== uid) {
      this.selectAll(false);
    }
  }

  private get rootEvents(): [name: string, callback: (event: any) => void][] {
    /* eslint-disable @typescript-eslint/unbound-method */
    return [
      ["copy", this.copySelectedCell],
      ["cut", this.cutSelectedCell],
      ["paste", this.pasteToSelectedCell],
      ["cell-click", this.onOtherTableClicked],
      ["row-select", this.onRowInOtherTableSelected],
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

  @Watch("showTree", { immediate: true })
  private watchShowTree() {
    if (this.showTree && !this.uv.rowLoadState.complete) {
      this.$emit("load-all-chunks", () => {});
    }
  }

  protected beforeDestroy() {
    /* eslint-disable @typescript-eslint/unbound-method */
    (this.$refs.tableContainer as HTMLElement).removeEventListener("scroll", this.removeCellEditing);
    this.rootEvents.forEach(([name, callback]) => this.$root.$off(name, callback));
    /* eslint-enable @typescript-eslint/unbound-method */

    if (this.uv.extra.lazyLoad.type === "pagination" && this.isTopLevel) {
      this.$emit("update:currentPage", null);
    }

    if (this.printListener !== null) {
      window.removeEventListener("beforeprint", this.printListener.printCallback);
      this.printListener.query.removeListener(this.printListener.queryCallback);
    }
    if (this.clickTimeoutId !== null) {
      clearTimeout(this.clickTimeoutId);
    }
    this.releaseEntries();
  }

  @Watch("filter", { immediate: true })
  protected updateFilter() {
    if (this.uv.extra.dirtyHackPreventEntireReloads) return;

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
    if (this.editingValue === null) {
      this.removeCellEditing();
    } else {
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
    const firstNotDisabledColumn = this.uv.newRows[rowId].values.findIndex((value, i) => {
      return value.info !== undefined && this.uv.extra.columns[i].visible;
    });
    const firstNotDisabledDOMColumn = this.columnIndexes.indexOf(firstNotDisabledColumn);
    if (firstNotDisabledDOMColumn === -1) return;

    void nextRender().then(() => {
      const sideName = side === "bottom_back" ? "newRowsBottomSideRef" : "newRowsTopSideRef";
      const newRowsRef = this.$refs[sideName] as TableRow[] | undefined;
      if (newRowsRef === undefined) return;
      const childRef = newRowsRef[newRowsRef.length - 1]?.$children?.[1 + firstNotDisabledDOMColumn].$el;
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

  private clickOutsideEdit(event: Event) {
    const element = (event instanceof MouseEvent) ? document.elementFromPoint(event.x, event.y) : null;
    // Fix for case when some cell is being edited and modal opens,
    // otherwise any click on this modal will close the cell editing and modal too.
    // FIXME: rely on CSS-classes for logic is bad thing, fix it someone, please.
    if (element === null
     || (element.closest(".v--modal-box") && !this.$el.closest(".v--modal-box"))
     || (element.closest(".modal__tab-content") !== this.$el.closest(".modal__tab-content"))
    ) {
      return;
    }

    this.removeCellEditing();
  }

  private removeCellEditing() {
    if (this.editing === null) return;

    this.cellEditHeight = 0;
    void this.removeAutoSaveLock(this.editing.lock);
    this.editing = null;
  }

  // Value is not actually required to be editable - it can be opened in read-only mode too.
  private setCellEditing(ref: ValueRef) {
    this.removeCellEditing();

    if (!this.canEditCell(ref)) {
      return;
    }

    void this.addAutoSaveLock().then(async lock => {
      const value = this.uv.getValueByRef(ref);

      if (this.editing !== null // Lock already taken (somehow)
       || !value
      ) {
        await this.removeAutoSaveLock(lock);
        return;
      }
      this.getCellElement(ref)?.scrollIntoView({ block: "nearest" });
      await nextRender(); // `$nextTick` doesn't works fine there.
      this.setCoordsForEditCell(this.getCellElement(ref)!);

      this.editing = { ref, lock };
    });
  }

  private canEditCell(ref: ValueRef) {
    return !(this.uv.extra.columns[ref.column].type === "buttons");
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

    if (this.editingNonNullableBoolean && !this.uv.getValueByRef(this.editing.ref)?.value.extra.softDisabled) {
      const value = this.uv.getValueByRef(ref)!.value.value;
      await this.updateCurrentValue(!value);
      this.removeCellEditing();
    }
  }

  private setInputHeight(value: number) {
    this.cellEditHeight = value;
  }

  private setCoordsForEditCell(target: HTMLElement) {
    const bodyRect = document.body.getBoundingClientRect();
    const rect = target.getBoundingClientRect();

    this.editCoords.x = rect.x;
    this.editCoords.y = rect.y;
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

  private clickCell(ref: ValueRef, element: HTMLElement) {
    this.columnDelta = 0;
    this.removeCellEditing();
    this.updateClickTimer(ref);
    this.cellEditHandler(ref, element);
  }

  private cellEditByTarget(ref: ValueRef, target: HTMLElement) {
    this.setCellEditing(ref);
    this.cellEditHandler(ref, target);
  }

  private cellEditHandler(ref: ValueRef, target: HTMLElement) {
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

  private selectValue(ref: ValueRef, selectedStatus = true) {
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
      Object.entries(this.uv.newRows).forEach(([rowIdRaw, row]) => {
        const rowId = Number(rowIdRaw);
        row.extra.selected = true;
        this.uv.extra.selectedRows.insert({
          type: "added",
          id: rowId,
        });
      });

      this.existingRows.forEach((localRow, rowI) => {
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
      this.$emit("update:bodyStyle", `
                @media print {
                    @page {
                        size: landscape;
                    }
                }
            `);
    }

    this.$emit("update:enableFilter", this.uv.rows !== null && !this.uv.extra.dirtyHackPreventEntireReloads);

    this.updateRows();
  }

  private updateRows() {
    this.buildRowPositions();
  }

  private loadAllRowsAndUpdateSort(sortColumn: number) {
    if (this.uv.extra.dirtyHackPreventEntireReloads) return;

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
    if (this.uv.extra.sortColumn !== null) {
      const sortColumn = this.uv.extra.sortColumn;
      const collator = new Intl.Collator(["en", "ru"], this.uv.extra.sortOptions);
      const sortFunction: (a: CommittedRowRef, b: CommittedRowRef) => number =
        this.uv.extra.sortAsc ?
          (a, b) => rowIndicesCompare(a, b, this.uv, sortColumn, collator) :
          (a, b) => rowIndicesCompare(b, a, this.uv, sortColumn, collator);

      this.rowPositions.sort(sortFunction);
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
    this.$emit("update:statusLine", this.statusLine);
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
  table,
  th,
  td {
    border: 1px solid var(--table-borderColor);
  }

  ::v-deep .table-td {
    padding: 0.15rem;
  }

  .button-container {
    width: 100%;
    position: sticky;
    left: 0;
    display: flex;
    transition: opacity 0.2s;

    ::v-deep > button {
      width: 100%;
    }
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;

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
    width: 100%;
    margin: 0;
    position: relative;
    height: 100%;
    background-color: var(--table-backgroundDarker1Color);

    /* &.nested {
     *   border: 1px solid var(--input-borderColor, var(--form-borderColor, var(--default-borderColor)));
     *   border-radius: 0.2rem;
     *   overflow: hidden;
     * } */
  }

  .data-col {
    max-width: 100vw !important;
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

    /* Instead of `0` to fix Safari's bug gap, doesn't needed in normal browsers, but easier to set same for all */
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

  ::v-deep .checkbox-cells {
    text-align: center;
    color: var(--tableCell-foregroundDarkerColor, var(--table-foregroundDarkerColor));
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
      color: var(--tableCell-foregroundColor, var(--table-foregroundColor));
      background-color: var(--tableCell-backgroundDarker1Color, var(--table-backgroundDarker1Color));
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
      color: var(--tableCell-foregroundDarkerColor, var(--table-foregroundDarkerColor));
    }

    .edit-in-modal-icon {
      position: relative;
      top: 5px;
      color: var(--tableCell-foregroundDarkerColor, var(--table-foregroundDarkerColor));
    }

    &.table-th {
      padding: 0;
    }

    > a {
      display: block;
      text-decoration: none;

      &:hover {
        .add-in-modal-icon {
          color: var(--tableCell-foregroundColor, var(--table-foregroundColor));
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

  ::v-deep .button-element > button {
    width: 100%;
  }

  .checkbox-col,
  .open-form-col {
    width: 35px;
  }

  thead {
    line-height: 2rem;
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
