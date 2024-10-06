<i18n>
  {
    "en": {
      "pagination_select": "Rows per page",
      "total_rows": "Total rows",
      "of": "of",
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
      "no_results": "No entries to show",
      "add_entry": "Add entry",
      "add_entry_in_modal": "Add new entry (in modal window)",
      "ok": "OK",
      "contextmenu_cut_tooltip": "Use Ctrl+X to cut selected cell",
      "contextmenu_copy_tooltip": "Use Ctrl+C to copy selected cell",
      "contextmenu_paste_tooltip": "Use Ctrl+V to paste to selected cell",
      "no_columns": "This query lacks visible columns"
    },
    "ru": {
      "pagination_select": "Строк на странице",
      "total_rows": "Всего строк",
      "of": "из",
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
    },
    "es": {
      "cut": "Cortar",
      "copy": "Copiar",
      "paste": "Pegar",
      "edit_error": "El error de edición",
      "paste_error": "El error de pegado",
      "copy_error": "El error de copia",
      "clear_error": "El error de borrado",
      "read_only_cell": "Leer solo la celda",
      "paste_no_referencefield_data": "El portapapeles no tiene datos de campo de referencia",
      "paste_error_too_many_columns": "El portapapeles tiene demasiadas columnas",
      "non_rectangular_copy": "Solo se admiten selecciones rectangulares al copiar",
      "no_results": "Vacio",
      "add_entry": "Añadir la entrada",
      "add_entry_in_modal": "Añadir la nueva entrada (en la ventana modal)",
      "ok": "OK",
      "contextmenu_cut_tooltip": "Usar Ctrl + X para cortar la celda seleccionada",
      "contextmenu_copy_tooltip": "Usar Ctrl + C para copiar la celda seleccionada",
      "contextmenu_paste_tooltip": "Usar Ctrl + V para pegar en la celda seleccionada",
      "no_columns": "Esta consulta carece de columnas visibles"
    }
  }
</i18n>

<template>
  <wrapped-component :wrap="isRoot">
    <template #wrapper>
      <div class="root-wrapper" />
    </template>

    <div
      ref="tableWrapper"
      v-hotkey="keymap"
      :class="[
        'table-wrapper',
        'default-variant',
        'table-local-variant',
        {
          root: isRoot,
          'active-editing': editingValue !== null,
          mobile: $isMobile,
          'multiple-cells-selected': selectedCells.length > 1,
          'show-fixed-column-border':
            showFixedColumnBorder && stickFixedColumns,
          'stick-fixed-columns': stickFixedColumns,
          'selection-column-enabled': showSelectionColumn,
        },
      ]"
      :infinite-wrapper="isRoot"
    >
      <TableCellEdit
        v-if="editingValue"
        ref="tableCellEdit"
        v-click-outside="{
          handler: removeCellEditing,
          middleware: checkWindow,
        }"
        :width="editing.width"
        :min-height="editing.minHeight"
        :height="editing.height"
        :x="editing.x"
        :y="editing.y"
      >
        <FormValueControl
          :value="editingValue.value"
          :attributes="editingValue.attributes"
          :attribute-mappings="uv.columnAttributeMappings[editing.ref.column]"
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

      <div v-if="uv.info.columns.length === 0" class="empty-userview">
        {{ $t('empty_userview') }}
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
          v-if="showAddRowButtons && uv.rows.length > 5"
          class="button-container"
        >
          <ButtonItem
            v-visible="showAddRowButtons && uv.rows.length > 5"
            class="add-row-button"
            :button="topAddButton"
            align-right
          />
        </div>

        <table ref="table" class="custom-table">
          <colgroup>
            <col v-if="showSelectionColumn" class="select-row-col" />
            <col v-if="showLinkColumn" class="open-form-col" />
            <col
              v-for="i in columnIndexes"
              :key="i"
              class="data-col"
              :style="columns[i].style"
            />
          </colgroup>
          <thead class="table-head">
            <tr>
              <th
                v-if="showSelectionColumn"
                class="fixed-cell select-row-cell"
                :class="{
                  'last-fixed-cell':
                    !showLinkColumn && fixedColumnsLength === 0,
                }"
                @click="toggleAllRows"
              >
                <div class="table-th">
                  <Checkbox
                    :checked="selectedAll"
                    :indeterminate="!selectedAll && selectedSome"
                  />
                </div>
              </th>
              <th
                v-if="showLinkColumn"
                class="fixed-cell add-entry-cell"
                :class="{
                  'without-selection-cell': !showSelectionColumn,
                  'last-fixed-cell': fixedColumnsLength === 0,
                }"
              >
                <div class="table-th">
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
                </div>
              </th>
              <th
                v-for="(i, index) in columnIndexes"
                :key="i"
                :class="{
                  'fixed-cell': columns[i].fixed,
                  'last-fixed-cell': index === fixedColumnsLength - 1,
                }"
                :style="{
                  ...columns[i].style,
                  left:
                    stickFixedColumns && fixedColumnPositions[i]
                      ? `${fixedColumnPositions[i]}px`
                      : undefined,
                }"
                :title="$ustOrEmpty(columns[i].caption)"
                @click="loadAllRowsAndUpdateSort(i)"
              >
                <div class="table-th">
                  <span class="column-capture">
                    {{ $ustOrEmpty(columns[i].caption) }}
                  </span>
                  <div v-if="uv.extra.sortColumn === i" class="sorting-wrapper">
                    <i class="material-icons sorting-icon">{{
                      uv.extra.sortAsc ? 'expand_more' : 'expand_less'
                    }}</i>
                  </div>
                  <div
                    class="resize-column-thumb"
                    @mousedown="
                      (event) => handleColumnResizeMouseDown(i, event)
                    "
                    @click.stop
                  >
                    <i class="material-icons">drag_indicator</i>
                  </div>
                </div>
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
                'last-top-new':
                  row.notExisting &&
                  rowIndex + 1 < shownRows.length &&
                  !shownRows[rowIndex + 1].notExisting,
                'first-bottom-new':
                  row.notExisting &&
                  rowIndex - 1 > 0 &&
                  !shownRows[rowIndex - 1].notExisting,
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
              @cell-click="
                clickCell(
                  { row: rowIndex, column: arguments[0] },
                  arguments[1],
                  arguments[2],
                )
              "
              @cell-mousedown="
                cellMouseDown(
                  { row: rowIndex, column: arguments[0] },
                  arguments[1],
                  arguments[2],
                )
              "
              @cell-mouseover="
                continueCellSelection(
                  { row: rowIndex, column: arguments[0] },
                  arguments[1],
                  arguments[2],
                )
              "
              @cell-mouseup="
                endCellSelection(
                  { row: rowIndex, column: arguments[0] },
                  arguments[1],
                  arguments[2],
                )
              "
              @cell-contextmenu="
                openCellContextMenu(
                  { row: rowIndex, column: arguments[0] },
                  arguments[1],
                  arguments[2],
                )
              "
              @toggle-children="toggleChildren(row.ref, $event)"
              @add-child="addChild(row.ref)"
              @goto="$emit('goto', $event)"
            />
          </tbody>
        </table>

        <div
          v-if="
            uv.extra.lazyLoad.type === 'pagination' &&
            !uv.extra.lazyLoad.pagination.loading &&
            allRows.length === 0
          "
          class="no-results"
        >
          {{ $t('no_results') }}
        </div>

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
              {{ $t('no_results') }}
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
          v-if="
            uv.extra.lazyLoad.type === 'pagination' ||
            statusLine ||
            showBottomAddButton
          "
          class="footer"
          :style="{
            justifyContent: showBottomAddButton ? 'space-between' : 'flex-end',
          }"
        >
          <ButtonItem
            v-if="showBottomAddButton"
            class="add-row-button"
            :button="bottomAddButton"
            align-right
          />
          <div
            v-if="uv.extra.lazyLoad.type === 'pagination'"
            class="pagination-wrapper"
          >
            <div class="pagination">
              <b-spinner
                v-if="uv.extra.lazyLoad.pagination.loading"
                class="mr-1"
                small
                label="Next page is loading"
              />
              <div class="current-rows">
                {{ currentRows }}
              </div>
              <div class="select-wrapper">
                <div class="select-label">
                  {{ $t('pagination_select').toString() }}:
                </div>
                <b-select
                  class="page-select"
                  :value="uv.extra.lazyLoad.pagination.perPage"
                  :options="pageSizes"
                  size="sm"
                  @input="updatePageSize"
                />
              </div>
              <ButtonItem
                class="pagination-arrow-button"
                :button="firstPageButton"
              />
              <ButtonItem
                class="pagination-arrow-button"
                :button="prevPageButton"
              />
              <div class="current-page-wrapper">
                <div class="current-page">
                  {{ currentVisualPage }}
                </div>
              </div>
              <ButtonItem
                class="pagination-arrow-button"
                :button="nextPageButton"
              />
            </div>
          </div>
          <div v-else class="total-rows">
            {{ statusLine }}
          </div>
        </div>
      </template>
    </div>
  </wrapped-component>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'
import { namespace } from 'vuex-class'
import InfiniteLoading, { StateChanger } from 'vue-infinite-loading'
import { Moment, default as moment } from 'moment'
import * as R from 'ramda'
import { z } from 'zod'
import {
  IResultColumnInfo,
  ValueType,
  RowId,
  IFieldRef,
  IEntity,
  IEntityRef,
  AttributeName,
} from '@ozma-io/ozmadb-js/client'
import Popper from 'vue-popperjs'

import {
  deepEquals,
  mapMaybe,
  nextRender,
  ObjectSet,
  tryDicts,
  ReferenceName,
  NeverError,
  parseFromClipboard,
  waitTimeout,
  ClipboardParseValue,
  debounceTillAnimationFrame,
} from '@/utils'
import { valueIsNull } from '@/values'
import { UserView } from '@/components'
import { maxPerFetch } from '@/components/UserView.vue'
import { AddedRowId } from '@/state/staging_changes'
import { IAttrToQueryOpts, ICurrentQueryHistory } from '@/state/query'
import BaseUserView, {
  IBaseRowExtra,
  IBaseValueExtra,
  IBaseViewExtra,
  baseUserViewHandler,
} from '@/components/BaseUserView'
import TableRow from '@/components/views/table/TableRow.vue'
import Checkbox from '@/components/checkbox/Checkbox.vue'
import TableCellEdit from '@/components/views/table/TableCellEdit.vue'
import { Link, attrToLinkSelf } from '@/links'
import {
  IAddedRow,
  IAddedRowRef,
  ICombinedRow,
  ICombinedUserView,
  ICombinedValue,
  IExistingRowRef,
  IExtendedAddedRow,
  IExtendedRow,
  IExtendedRowCommon,
  IExtendedRowInfo,
  IExtendedValue,
  IRowCommon,
  IUserViewHandler,
  RowRef,
  ValueRef,
  CommittedRowRef,
  ValueUpdate,
  valueToPunnedText,
  equalValueRef,
  currentValue,
  equalRowRef,
} from '@/user_views/combined'
import {
  interfaceButtonVariant,
  defaultVariantAttribute,
  outlinedInterfaceButtonVariant,
} from '@/utils_colors'
import ButtonItem from '@/components/buttons/ButtonItem.vue'
import ButtonList from '@/components/buttons/ButtonList.vue'
import { Button } from '@/components/buttons/buttons'
import FormValueControl from '@/components/FormValueControl'
import type TableCell from './table/TableCell.vue'
import { elementWindow, WindowKey } from '@/state/windows'
import { formatValue } from '@/user_views/format'
import { rawToUserString, UserString } from '@/state/translations'

export interface IColumn {
  caption: UserString
  style: Record<string, unknown>
  visible: boolean
  fixed: boolean
  columnInfo: IResultColumnInfo
  width: number // in px
  treeUnfoldColumn: boolean
  type: string
}

export interface ITableValueExtra extends IBaseValueExtra {
  // If an extra value is only needed during render, define it as a computed property instead.
  selected: boolean
  cursor: boolean
}

export interface ITableRowTree {
  level: number
  arrowDown: boolean
  addedChildren: NewRowRef[]
  children: CommittedRowRef[]
}

export interface ITableRowExtra extends IBaseRowExtra {
  searchText: string
  shownAsNewRow: boolean
  tree: ITableRowTree | null
  link: Link | null
}

export interface IAddedNewRowRef {
  type: 'added'
  id: AddedRowId
}

export interface ICommittedNewRowRef {
  type: 'committed'
  id: RowId
}

export type NewRowRef = IAddedNewRowRef | ICommittedNewRowRef

type TreeId = number

export interface ITableViewExtra extends IBaseViewExtra {
  hasRowLinks: boolean
  selectedValues: ObjectSet<ValueRef>
  cursorValue: ValueRef | null
  oldCursorValue: ValueRef | null
  linkOpts?: IAttrToQueryOpts
  lazyLoad: ITableLazyLoad

  treeParentColumnIndex: number | null
  treeIdColumnIndex: number | null
  treeRowMapping: Record<TreeId, CommittedRowRef>

  newRowTopSidePositions: NewRowRef[]
  newRowBottomSidePositions: NewRowRef[]

  sortColumn: number | null
  sortAsc: boolean
  sortOptions: Intl.CollatorOptions
}

export interface IVisualPosition {
  column: number
  row: number
}

const showStep = 15
const doubleClickTime = 700

export type ITableCombinedUserView = ICombinedUserView<
  ITableValueExtra,
  ITableRowExtra,
  ITableViewExtra
>
export type ITableExtendedValue = IExtendedValue<ITableValueExtra>
export type ITableExtendedRowInfo = IExtendedRowInfo<ITableRowExtra>
export type ITableExtendedRow = IExtendedRow<ITableValueExtra, ITableRowExtra>
export type ITableExtendedRowCommon = IExtendedRowCommon<
  ITableValueExtra,
  ITableRowExtra
>
export type ITableExtendedAddedRow = IExtendedAddedRow<
  ITableValueExtra,
  ITableRowExtra
>

const inheritOldRowsPosition = (
  uv: ITableCombinedUserView,
  pos: NewRowRef,
): NewRowRef | null => {
  if (pos.type === 'added') {
    const newRow = uv.newRows[pos.id]
    if (newRow) {
      return pos
    } else {
      const rowIndices = uv.oldCommittedRows[pos.id]
      if (!rowIndices) {
        return null
      }
      let id: number | undefined
      for (const rowI of rowIndices) {
        const row = uv.rows![rowI]
        id = row.mainId!
      }
      if (id === undefined) {
        return null
      }
      return { type: 'committed', id }
    }
  } else if (pos.type === 'committed') {
    if (pos.id in uv.mainRowMapping) {
      return { type: 'committed', id: pos.id }
    } else {
      return null
    }
  } else {
    throw new Error('Impossible')
  }
}

const inheritOldRowsPositions = (
  uv: ITableCombinedUserView,
  positions: NewRowRef[],
): NewRowRef[] => {
  const ret = mapMaybe(
    (pos) => inheritOldRowsPosition(uv, pos) ?? undefined,
    positions,
  )
  return ret
}

const getRowTreeId = (
  uv: ITableCombinedUserView,
  row: IRowCommon,
): TreeId | null => {
  if (uv.extra.treeParentColumnIndex === null) return null

  const rawValue =
    uv.extra.treeIdColumnIndex !== null
      ? (currentValue(row.values[uv.extra.treeIdColumnIndex]) as
          | TreeId
          | null
          | undefined)
      : row.values[uv.extra.treeParentColumnIndex].info?.id
  return rawValue ?? null
}

const createCommonLocalRow = (
  uv: ITableCombinedUserView,
  row: IRowCommon,
  rowRef?: CommittedRowRef,
  oldLocal?: ITableRowExtra,
) => {
  const getRowAttr = (name: string) =>
    tryDicts(name, row.attributes, uv.attributes)

  const defaultArrow = Boolean(
    getRowAttr('tree_expand_children') || getRowAttr('tree_all_open'),
  )

  const tree: ITableRowTree | null =
    uv.extra.treeParentColumnIndex === null
      ? null
      : {
          addedChildren: oldLocal?.tree?.addedChildren
            ? inheritOldRowsPositions(uv, oldLocal.tree.addedChildren)
            : [],
          children: [],
          level: 0,
          arrowDown: oldLocal?.tree?.arrowDown ?? defaultArrow,
        }

  const rowTreeId = getRowTreeId(uv, row)
  if (rowRef && rowTreeId !== null) {
    uv.extra.treeRowMapping[rowTreeId] = rowRef
  }

  return {
    searchText: '',
    link: null,
    tree,
  }
}

const postInitCommonRow = (
  uv: ITableCombinedUserView,
  row: ITableExtendedRowCommon,
) => {
  // Needs to be performant, hence this custom loop.
  let searchText = ''
  row.values.forEach((value, i) => {
    const column = uv.info.columns[i]
    if (value.pun) {
      searchText += value.pun + '\0'
    } else {
      searchText += formatValue(column.valueType, value) + '\0'
    }
  })
  row.extra.searchText = searchText.toLocaleLowerCase()
}

const updateCommittedValue = (
  uv: ITableCombinedUserView,
  rowRef: CommittedRowRef,
  row: ITableExtendedRowCommon,
  columnIndex: number,
  value: ITableExtendedValue,
  update: ValueUpdate,
) => {
  if (
    uv.extra.treeParentColumnIndex === columnIndex &&
    update.type === 'value'
  ) {
    const current = currentValue(value) as number | null | undefined
    if (current !== update.previous) {
      let newRef: NewRowRef | undefined
      if (row.extra.shownAsNewRow) {
        newRef =
          rowRef.type === 'existing'
            ? { type: 'committed', id: (row as ITableExtendedRow).mainId! }
            : { type: 'added', id: rowRef.id }
      }
      const previousParentRef = uv.extra.treeRowMapping[update.previous as any]
      const previousParent = previousParentRef
        ? uv.getRowByRef(previousParentRef)
        : undefined
      if (previousParent) {
        if (row.extra.shownAsNewRow) {
          previousParent.extra.tree!.addedChildren =
            previousParent.extra.tree!.addedChildren.filter((ref) =>
              equalNewRowRef(ref, newRef!),
            )
        } else {
          previousParent.extra.tree!.children =
            previousParent.extra.tree!.children.filter((ref) =>
              equalRowRef(ref, rowRef),
            )
        }
      }

      const newParentRef = uv.extra.treeRowMapping[current as any]
      const newParent = newParentRef ? uv.getRowByRef(newParentRef) : undefined
      if (newParent) {
        if (row.extra.shownAsNewRow) {
          newParent.extra.tree!.addedChildren.push(newRef!)
        } else {
          newParent.extra.tree!.children.push(rowRef)
        }
        row.extra.tree!.level = newParent.extra.tree!.level + 1
      }
    }
  }
}

const getRowParentRef = (
  uv: ITableCombinedUserView,
  row: ITableExtendedRowCommon,
): CommittedRowRef | undefined => {
  if (uv.extra.treeParentColumnIndex === null) {
    return undefined
  }
  const parentId = currentValue(row.values[uv.extra.treeParentColumnIndex]) as
    | number
    | null
    | undefined
  if (typeof parentId !== 'number') {
    return undefined
  }
  return uv.extra.treeRowMapping[parentId]
}

const getRowParent = (
  uv: ITableCombinedUserView,
  row: ITableExtendedRowCommon,
): ITableExtendedRowCommon | undefined => {
  const parentRef = getRowParentRef(uv, row)
  return parentRef === undefined ? undefined : uv.getRowByRef(parentRef)
}

const markNewRows = (uv: ITableCombinedUserView, rows: NewRowRef[]) => {
  for (const addedRef of rows) {
    const addedRow = getNewRow(uv, addedRef)
    addedRow.row.extra.shownAsNewRow = true
  }
}

const initTreeChildren = (uv: ITableCombinedUserView) => {
  uv.forEachCommittedRow((row) => {
    markNewRows(uv, row.extra.tree!.addedChildren)
  })

  uv.forEachCommittedRow((row, rowRef) => {
    const parentRef = getRowParentRef(uv, row)
    const parent =
      parentRef === undefined ? undefined : uv.getRowByRef(parentRef)
    if (parent !== undefined) {
      let level = 0
      let currentRow: ITableExtendedRowCommon | undefined = parent
      do {
        level++
        const currentParentRef = getRowParentRef(uv, currentRow)
        if (!currentParentRef) {
          break
        }
        if (equalRowRef(currentParentRef, parentRef!)) {
          // Cycle detected; break it by exiting.
          return
        }
        currentRow = uv.getRowByRef(currentParentRef)
      } while (currentRow !== undefined)

      row.extra.tree!.level = level
      if (!row.extra.shownAsNewRow) {
        parent.extra.tree!.children.push(rowRef)
      }
    }
  })
}

const equalNewRowRef = (a: NewRowRef, b: NewRowRef): boolean => {
  return a.type === b.type && a.id === b.id
}

const deleteFromPositions = (
  uv: ITableCombinedUserView,
  ref: NewRowRef,
  row: ITableExtendedRowCommon,
) => {
  uv.extra.newRowTopSidePositions = uv.extra.newRowTopSidePositions.filter(
    (r) => !equalNewRowRef(ref, r),
  )
  uv.extra.newRowBottomSidePositions =
    uv.extra.newRowBottomSidePositions.filter((r) => !equalNewRowRef(ref, r))
  const parent = getRowParent(uv, row)
  if (parent !== undefined) {
    parent.extra.tree?.addedChildren.filter((r) => !equalNewRowRef(ref, r))
  }
}

interface INewRow {
  row: ITableExtendedRow | ITableExtendedAddedRow
  ref: IExistingRowRef | IAddedRowRef
}

const getNewRow = (uv: ITableCombinedUserView, pos: NewRowRef): INewRow => {
  if (pos.type === 'added') {
    return {
      ref: {
        type: 'added',
        id: pos.id,
      },
      row: uv.newRows[pos.id],
    }
  } else {
    // We are sure this row ref is to an existing value.
    const ref = uv.mainRowMapping[pos.id][0] as IExistingRowRef
    return {
      ref,
      row: uv.rows![ref.position],
    }
  }
}

interface IAddedRowMeta {
  side: 'top_front' | 'top_back' | 'bottom_back' | 'hidden'
}

const isAddedValueMeta = (obj: unknown): obj is IAddedRowMeta => {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }
  const side = (obj as any).side
  return (
    side === 'top_front' ||
    side === 'top_back' ||
    side === 'bottom_back' ||
    side === 'hidden'
  )
}

export const tableUserViewHandler: IUserViewHandler<
  ITableValueExtra,
  ITableRowExtra,
  ITableViewExtra
> = {
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
    const baseExtra = baseUserViewHandler.createLocalValue(
      uv,
      rowIndex,
      row,
      columnIndex,
      value,
      oldView,
      oldRow,
      oldValue,
    )

    const columnAttrs = uv.columnAttributes[columnIndex]
    const getCellAttr = (name: string) =>
      tryDicts(
        name,
        value.attributes,
        columnAttrs,
        row.attributes,
        uv.attributes,
      )

    const currLinkForRow = attrToLinkSelf(
      getCellAttr('row_link'),
      value.info,
      uv.extra.linkOpts,
    )
    const hasRowLinkWithId =
      (row.extra.link?.type === 'query' &&
        row.extra.link.query.args.args?.id !== undefined) ||
      (row.extra.link &&
        'args' in row.extra.link &&
        row.extra.link.args.id !== undefined)
    if (currLinkForRow && !hasRowLinkWithId) {
      row.extra.link = currLinkForRow
      uv.extra.hasRowLinks = true
    }

    const valueRef: ValueRef = {
      type: 'existing',
      position: rowIndex,
      column: columnIndex,
    }
    const selected = (oldValue?.selected ?? false) && !row.deleted
    if (selected) {
      uv.extra.selectedValues.insert(valueRef)
    }
    return {
      ...baseExtra,
      selected,
      cursor: false,
    }
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
    const baseExtra = baseUserViewHandler.createAddedLocalValue(
      uv,
      rowId,
      row,
      columnIndex,
      value,
      oldView,
      oldRow,
      oldValue,
    )

    const valueRef: ValueRef = {
      type: 'added',
      id: rowId,
      column: columnIndex,
    }
    const selected = oldValue?.selected ?? false
    if (selected) {
      uv.extra.selectedValues.insert(valueRef)
    }
    return {
      ...baseExtra,
      selected,
      cursor: false,
    }
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
    const baseExtra = baseUserViewHandler.createEmptyLocalValue(
      uv,
      row,
      columnIndex,
      value,
      oldView,
      oldRow,
      oldValue,
    )

    const valueRef: ValueRef = {
      type: 'new',
      column: columnIndex,
    }
    const selected = oldValue?.selected ?? false
    if (selected) {
      uv.extra.selectedValues.insert(valueRef)
    }

    return {
      ...baseExtra,
      selected,
      cursor: false,
    }
  },

  updateValue(
    uv: ITableCombinedUserView,
    rowIndex: number,
    row: ITableExtendedRow,
    columnIndex: number,
    value: ITableExtendedValue,
    update: ValueUpdate,
  ) {
    baseUserViewHandler.updateValue(
      uv,
      rowIndex,
      row,
      columnIndex,
      value,
      update,
    )
    const rowRef: IExistingRowRef = {
      type: 'existing',
      position: rowIndex,
    }
    updateCommittedValue(uv, rowRef, row, columnIndex, value, update)
  },

  updateAddedValue(
    uv: ITableCombinedUserView,
    rowId: number,
    row: ITableExtendedAddedRow,
    columnIndex: number,
    value: ITableExtendedValue,
    update: ValueUpdate,
  ) {
    baseUserViewHandler.updateAddedValue(
      uv,
      rowId,
      row,
      columnIndex,
      value,
      update,
    )
    const rowRef: IAddedRowRef = {
      type: 'added',
      id: rowId,
    }
    updateCommittedValue(uv, rowRef, row, columnIndex, value, update)
  },

  updateEmptyValue(
    uv: ITableCombinedUserView,
    columnIndex: number,
    value: ITableExtendedValue,
    update: ValueUpdate,
  ) {
    baseUserViewHandler.updateEmptyValue(uv, columnIndex, value, update)
  },

  createLocalRow(
    uv: ITableCombinedUserView,
    rowIndex: number,
    row: ICombinedRow,
    oldView?: ITableViewExtra,
    oldRow?: ITableRowExtra,
  ) {
    const baseExtra = baseUserViewHandler.createLocalRow(
      uv,
      rowIndex,
      row,
      oldView,
      oldRow,
    )
    const rowRef: IExistingRowRef = {
      type: 'existing',
      position: rowIndex,
    }
    const commonExtra = createCommonLocalRow(uv, row, rowRef, oldRow)
    return {
      ...commonExtra,
      ...baseExtra,
      shownAsNewRow: false,
    }
  },

  createAddedLocalRow(
    uv: ITableCombinedUserView,
    rowId: AddedRowId,
    row: IAddedRow,
    oldView?: ITableViewExtra,
    oldRow?: ITableRowExtra,
    meta?: unknown,
  ) {
    const baseExtra = baseUserViewHandler.createAddedLocalRow(
      uv,
      rowId,
      row,
      oldView,
      oldRow,
    )
    const rowRef: IAddedRowRef = {
      type: 'added',
      id: rowId,
    }
    const commonExtra = createCommonLocalRow(uv, row, rowRef, oldRow)

    const newRef: NewRowRef = {
      type: 'added',
      id: rowId,
    }

    if (
      !uv.extra.newRowTopSidePositions.find((ref) =>
        equalNewRowRef(newRef, ref),
      ) &&
      !uv.extra.newRowBottomSidePositions.find((ref) =>
        equalNewRowRef(newRef, ref),
      )
    ) {
      const side = isAddedValueMeta(meta) ? meta.side : 'top_back'
      if (side === 'top_front') {
        uv.extra.newRowTopSidePositions.splice(0, 0, newRef)
      } else if (side === 'top_back') {
        uv.extra.newRowTopSidePositions.push(newRef)
      } else if (side === 'bottom_back') {
        uv.extra.newRowBottomSidePositions.push(newRef)
      }
    }

    return {
      ...commonExtra,
      ...baseExtra,
      shownAsNewRow: true,
    }
  },

  createEmptyLocalRow(
    uv: ITableCombinedUserView,
    row: IRowCommon,
    oldView?: ITableViewExtra,
    oldRow?: ITableRowExtra,
  ) {
    const baseExtra = baseUserViewHandler.createEmptyLocalRow(
      uv,
      row,
      oldView,
      oldRow,
    )
    const commonExtra = createCommonLocalRow(uv, row, undefined, oldRow)
    return {
      ...commonExtra,
      ...baseExtra,
      shownAsNewRow: true,
    }
  },

  postInitRow(
    uv: ITableCombinedUserView,
    rowIndex: number,
    row: ITableExtendedRow,
  ) {
    baseUserViewHandler.postInitRow(uv, rowIndex, row)
    postInitCommonRow(uv, row)
  },

  postInitAddedRow(
    uv: ITableCombinedUserView,
    rowId: AddedRowId,
    row: ITableExtendedAddedRow,
  ) {
    baseUserViewHandler.postInitAddedRow(uv, rowId, row)
    postInitCommonRow(uv, row)
  },

  deleteRow(
    uv: ITableCombinedUserView,
    rowIndex: number,
    row: ITableExtendedRow,
  ) {
    baseUserViewHandler.deleteRow(uv, rowIndex, row)
    row.values.forEach((value, colI) => {
      if (value.extra.selected) {
        value.extra.selected = false
        uv.extra.selectedValues.delete({
          type: 'existing',
          position: rowIndex,
          column: colI,
        })
      }
    })
  },

  deleteAddedRow(
    uv: ITableCombinedUserView,
    rowId: AddedRowId,
    row: ITableExtendedAddedRow,
  ) {
    baseUserViewHandler.deleteAddedRow(uv, rowId, row)
    row.values.forEach((value, colI) => {
      if (value.extra.selected) {
        value.extra.selected = false
        uv.extra.selectedValues.delete({
          type: 'added',
          id: rowId,
          column: colI,
        })
      }
    })
    if (row.newId === undefined) {
      deleteFromPositions(uv, { type: 'added', id: rowId }, row)
    }
  },

  createLocalUserView(
    uv: ITableCombinedUserView,
    oldView?: ITableViewExtra,
  ): ITableViewExtra {
    const baseExtra = baseUserViewHandler.createLocalUserView(uv, oldView)

    const newRowTopSidePositions = oldView
      ? inheritOldRowsPositions(uv, oldView.newRowTopSidePositions)
      : []
    const newRowBottomSidePositions = oldView
      ? inheritOldRowsPositions(uv, oldView.newRowBottomSidePositions)
      : []

    const rawTreeParentIds = uv.columnAttributes.findIndex(
      (attrs) => attrs['tree_parent_ids'],
    )
    const hasTree =
      rawTreeParentIds >= 0 &&
      uv.info.columns[rawTreeParentIds].valueType.type === 'int'

    const rawTreeIds = uv.columnAttributes.findIndex(
      (attrs) => attrs['tree_ids'],
    )

    let lazyLoad =
      oldView?.lazyLoad ?? TableLazyLoad.parse(uv.attributes['lazy_load'])
    if (hasTree) {
      lazyLoad = {
        type: 'infinite_scroll',
        infiniteScroll: {
          shownRowsLength:
            oldView?.lazyLoad.type === 'infinite_scroll'
              ? oldView?.lazyLoad.infiniteScroll.shownRowsLength
              : 0,
        },
      }
    }

    return {
      ...baseExtra,
      hasRowLinks: false,
      selectedValues: new ObjectSet<ValueRef>(),
      cursorValue: null,
      oldCursorValue: null,
      treeParentColumnIndex: hasTree ? rawTreeParentIds : null,
      treeIdColumnIndex: hasTree && rawTreeIds >= 0 ? rawTreeIds : null,
      treeRowMapping: {},
      newRowTopSidePositions,
      newRowBottomSidePositions,
      linkOpts: uv.homeSchema ? { homeSchema: uv.homeSchema } : {},
      sortAsc: oldView?.sortAsc ?? true,
      sortColumn: oldView?.sortColumn ?? null,
      sortOptions: oldView?.sortOptions ?? {},
      lazyLoad,
    }
  },

  postInitUserView(uv: ITableCombinedUserView, oldView?: ITableViewExtra) {
    markNewRows(uv, uv.extra.newRowTopSidePositions)
    markNewRows(uv, uv.extra.newRowBottomSidePositions)

    if (uv.extra.treeParentColumnIndex !== null) {
      initTreeChildren(uv)
    }

    const cursorValue = oldView?.cursorValue ?? null
    if (cursorValue) {
      const value = uv.getValueByRef(cursorValue)
      if (value) {
        uv.extra.cursorValue = cursorValue
        value.value.extra.cursor = true
      }
    }

    const oldCursorValue = oldView?.oldCursorValue ?? null
    if (oldCursorValue) {
      const value = uv.getValueByRef(oldCursorValue)
      if (value) {
        uv.extra.oldCursorValue = oldCursorValue
      }
    }
  },
}

const rowContains = (row: ITableExtendedRowCommon, searchWords: string[]) => {
  return searchWords.every((word) => row.extra.searchText.includes(word))
}

const rowIndicesCompare = (
  aIndex: CommittedRowRef,
  bIndex: CommittedRowRef,
  uv: ITableCombinedUserView,
  sortColumn: number,
  collator: Intl.Collator,
) => {
  const a = uv.getRowByRef(aIndex)
  const b = uv.getRowByRef(bIndex)
  const aValue = a?.values[sortColumn].value
  const bValue = b?.values[sortColumn].value
  if (aValue === null) {
    return 1
  } else if (bValue === null) {
    return -1
  } else if (aValue instanceof moment) {
    return (aValue as Moment).unix() - (bValue as Moment).unix()
  } else if (typeof aValue === 'number') {
    return aValue - (bValue as number)
  } else {
    return collator.compare(String(aValue), String(bValue))
  }
}

const newRowIndicesCompare = (
  aIndex: NewRowRef,
  bIndex: NewRowRef,
  uv: ITableCombinedUserView,
  sortColumn: number,
  collator: Intl.Collator,
) => {
  const a = getNewRow(uv, aIndex)
  const b = getNewRow(uv, bIndex)
  const aValue = a?.row.values[sortColumn].value
  const bValue = b?.row.values[sortColumn].value
  if (aValue === null) {
    return 1
  } else if (bValue === null) {
    return -1
  } else if (aValue instanceof moment) {
    return (aValue as Moment).unix() - (bValue as Moment).unix()
  } else if (typeof aValue === 'number') {
    return aValue - (bValue as number)
  } else {
    return collator.compare(String(aValue), String(bValue))
  }
}

const isEmptyRow = (row: IRowCommon) => {
  return row.values.every(
    (cell) => valueIsNull(cell.rawValue) || cell.info === undefined,
  )
}

interface ITableEditing {
  ref: ValueRef
  x: number
  y: number
  height: number
  width: number
  minHeight: number
}

interface IShownRow {
  key: string
  row: ITableExtendedRowCommon
  notExisting: boolean
  ref: RowRef
}

const defaultPageSize = 5
// Just look at `ITableLazyLoad` to see which type this mess makes.
export const TableLazyLoad = z
  .union([
    z
      .object({
        pagination: z.object({
          per_page: z.number(),
        }),
      })
      .transform((obj) => ({
        type: 'pagination' as const,
        pagination: {
          perPage: R.clamp(0, maxPerFetch, obj.pagination['per_page']),
          currentPage: 0,
          loading: false,
        },
      })),
    z
      .object({
        infinite_scroll: z.literal(true),
      })
      .transform((obj) => ({
        type: 'infinite_scroll' as const,
        infiniteScroll: {
          shownRowsLength: 0,
        },
      })),
  ])
  .default({ infinite_scroll: true })

export type ITableLazyLoad = z.infer<typeof TableLazyLoad>

const stringArraySchema = z.array(z.string())

type MoveDirection = 'up' | 'right' | 'down' | 'left'

type ReferenceForPopper = {
  clientWidth: number
  clientHeight: number
  getBoundingClientRect: () => DOMRect
  /* Popper.js supports virtual refereneces,
   * but used wrapper tries to remove events even on them, which make no sence,
   * but it's easier to pass dummy method to it for now */
  removeEventListener: () => void
}

type CellContextMenuData = {
  reference: ReferenceForPopper
  buttons: Button[]
}

const plainTextCell = (str: string): string => {
  if (/\n|\t/.test(str)) {
    return `"${str.replace(/"/g, `""`)}"`
  } else {
    return str
  }
}

const plainTextStringify = (table: string[][]): string => {
  let output = ''

  table.forEach((row) => {
    row.forEach((cell, colI) => {
      output += plainTextCell(cell)
      if (colI < row.length - 1) {
        output += '\t'
      }
    })
    output += '\n'
  })

  return output
}

const refToShownRow = (
  ref: CommittedRowRef,
  row: ITableExtendedRowCommon,
): IShownRow => {
  if (ref.type === 'existing') {
    return {
      key: String(ref.position),
      notExisting: false,
      row,
      ref,
    }
  } else {
    return {
      key: `${ref.type}-${ref.id}`,
      row,
      notExisting: true,
      ref,
    }
  }
}

const entities = namespace('entities')
const entries = namespace('entries')
const query = namespace('query')
const windows = namespace('windows')

@UserView({
  handler: tableUserViewHandler,
  useLazyLoad: true,
})
@Component({
  components: {
    TableRow,
    Checkbox,
    TableCellEdit,
    InfiniteLoading,
    ButtonItem,
    ButtonList,
    Popper,
    FormValueControl,
  },
})
export default class UserViewTable extends mixins<
  BaseUserView<ITableValueExtra, ITableRowExtra, ITableViewExtra>
>(BaseUserView) {
  @query.State('current') query!: ICurrentQueryHistory | null
  @entries.Mutation('removeEntriesConsumer') removeEntriesConsumer!: (args: {
    ref: IFieldRef
    reference: ReferenceName
  }) => void
  @entries.Mutation('addEntriesConsumer') addEntriesConsumer!: (args: {
    ref: IFieldRef
    reference: ReferenceName
  }) => void
  @entities.Action('getEntity') getEntity!: (
    ref: IEntityRef,
  ) => Promise<IEntity>
  @windows.Getter('active') activeWindow!: WindowKey | null

  // These two aren't computed properties for performance. They are computed during `init()` and mutated when other values change.
  // If `init()` is called again, their values after recomputation should be equal to those before it.
  currentFilter: string[] = []
  rowPositions: CommittedRowRef[] = []
  lastSelectedRow: number | null = null
  editing: ITableEditing | null = null
  printListener: {
    query: MediaQueryList
    queryCallback: (mql: MediaQueryListEvent) => void
    printCallback: () => void
  } | null = null
  clickTimeout: { id: NodeJS.Timeout; ref: ValueRef } | null = null
  // Keep references to entries used for editing once, so we don't re-request them.
  keptEntries = new ObjectSet<IFieldRef>()
  showAddRowButtons = false

  cellContextMenu: CellContextMenuData | null = null

  get columns() {
    const viewAttrs = this.uv.attributes
    let isTreeUnfoldColumnSet = false

    const columns = this.uv.info.columns.map((columnInfo, i): IColumn => {
      const columnAttrs = this.uv.columnAttributes[i]
      const getColumnAttr = (name: string) =>
        tryDicts(name, columnAttrs, viewAttrs)

      const captionAttr = rawToUserString(getColumnAttr('caption'))
      const caption = captionAttr ?? columnInfo.name

      const style: Record<string, unknown> = {}

      const minColumnWidth = 50
      const initialColumnWidth = z.coerce
        .number()
        .default(200)
        .catch(200)
        .parse(getColumnAttr('column_width'))
      const resizedColumnWidth =
        initialColumnWidth + (this.resizedColumnDeltaXs[i] ?? 0)
      const columnWidth = Math.max(minColumnWidth, resizedColumnWidth)
      style['width'] = `${columnWidth}px`

      const textAlignResult = z
        .enum(['left', 'center', 'right'])
        .safeParse(getColumnAttr('text_align'))
      if (textAlignResult.success) {
        style['text-align'] = textAlignResult.data
      } else {
        const textAlignRightTypes: ValueType['type'][] = ['int', 'decimal']
        const punOrValue: ValueType = columnInfo.punType ?? columnInfo.valueType
        if (textAlignRightTypes.includes(punOrValue.type)) {
          style['text-align'] = 'right'
        }
      }

      const fixedColumn = z.coerce.boolean().parse(getColumnAttr('fixed'))

      const visibleColumn = z.coerce
        .boolean()
        .default(true)
        .parse(getColumnAttr('visible'))

      const treeUnfoldColumn = z.coerce
        .boolean()
        .parse(getColumnAttr('tree_unfold_column'))
      if (treeUnfoldColumn) {
        isTreeUnfoldColumnSet = true
      }

      // "column_type" is old version, but "control" is consistent with forms.
      const type = String(
        getColumnAttr('control') ?? getColumnAttr('column_type'),
      )

      return {
        caption,
        style,
        visible: visibleColumn,
        fixed: fixedColumn,
        columnInfo,
        width: columnWidth,
        treeUnfoldColumn,
        type,
      }
    })

    if (!isTreeUnfoldColumnSet && columns[0]) {
      columns[0].treeUnfoldColumn = true
    }

    return columns
  }

  get technicalColumnWidth() {
    // FIXME It's  already calculated in App.vue but I don' want to pass it here.
    const defaultSize = 16
    const normalSize = this.settings.getEntry('font_size', Number, defaultSize)
    const mobileSize = this.settings.getEntry('font_size_mobile', Number, 14)
    const fontSize =
      this.$isMobile && mobileSize !== 0 ? mobileSize : normalSize
    return 4 * fontSize
  }
  get technicalColumnsWidth() {
    const first = this.showSelectionColumn ? this.technicalColumnWidth : 0
    const second = this.uv.extra.hasRowLinks ? this.technicalColumnWidth : 0
    return first + second
  }

  get fixedColumnsLength(): number {
    return this.columns.filter((item) => item.fixed).length
  }

  get fixedColumnPositions() {
    let left = this.technicalColumnsWidth
    const fixedColumnIndexes = mapMaybe(
      (col, colI) => (col.fixed ? colI : undefined),
      this.columns,
    )
    const positions: Record<number, number> = {}
    for (const fixedColumnIndex of fixedColumnIndexes) {
      positions[fixedColumnIndex] = left
      left += this.columns[fixedColumnIndex].width
    }
    return positions
  }

  get showSelectionColumn() {
    const disableSelectionColumn =
      this.uv.attributes['disable_selection_column']
    return typeof disableSelectionColumn === 'boolean'
      ? !disableSelectionColumn
      : true
  }

  get useInfiniteScrolling() {
    // If search is used we load all rows so no need for infinite scrolling.
    return (
      this.uv.extra.lazyLoad.type === 'infinite_scroll' &&
      this.currentFilter.length === 0
    )
  }

  get pageSizes() {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return []

    const defaultSizes = [5, 10, 25, 50]
    if (!defaultSizes.includes(this.uv.extra.lazyLoad.pagination.perPage)) {
      return [this.uv.extra.lazyLoad.pagination.perPage, ...defaultSizes].map(
        (num) => ({ value: num, text: String(num) }),
      )
    } else {
      return defaultSizes.map((num) => ({ value: num, text: String(num) }))
    }
  }

  get keymap() {
    return {
      enter: () => this.onPressEnter(),
      esc: () => this.removeCellEditing(),
      delete: () => this.clearSelectedCells(),
      up: () => this.moveCursor('up'),
      right: () => this.moveCursor('right'),
      down: () => this.moveCursor('down'),
      left: () => this.moveCursor('left'),
      'shift+up': () => this.expandSelection('up'),
      'shift+right': () => this.expandSelection('right'),
      'shift+down': () => this.expandSelection('down'),
      'shift+left': () => this.expandSelection('left'),
      // TODO: make pageup/pagedown movement depend on real page size, not just 5 rows.
      pagedown: () => this.moveCursor('down', { step: 5 }),
      pageup: () => this.moveCursor('up', { step: 5 }),
    }
  }

  get firstPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return null

    return {
      type: 'callback',
      icon: 'first_page',
      variant: outlinedInterfaceButtonVariant,
      disabled: this.uv.extra.lazyLoad.pagination.currentPage === 0,
      callback: () => this.goToFirstPage(),
    }
  }

  get prevPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return null

    return {
      type: 'callback',
      icon: 'navigate_before',
      variant: outlinedInterfaceButtonVariant,
      disabled: this.uv.extra.lazyLoad.pagination.currentPage === 0,
      callback: () => this.goToPrevPage(),
    }
  }

  get nextPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return null

    return {
      type: 'callback',
      icon: 'navigate_next',
      variant: outlinedInterfaceButtonVariant,
      disabled:
        (this.uv.rowLoadState.complete && this.onLastPage) ||
        this.uv.extra.lazyLoad.pagination.loading,
      callback: () => this.goToNextPage(),
    }
  }

  get onLastPage() {
    if (!this.uv.rows || this.uv.extra.lazyLoad.type !== 'pagination')
      return false

    const shownRowCount =
      this.uv.extra.lazyLoad.pagination.perPage *
      (this.uv.extra.lazyLoad.pagination.currentPage + 1)
    return this.uv.rowLoadState.fetchedRowCount <= shownRowCount
  }

  private pageRequiresLoading(page: number) {
    if (
      !this.uv.rows ||
      this.uv.rowLoadState.complete ||
      this.uv.extra.lazyLoad.type !== 'pagination'
    )
      return false

    const shownRowCount = this.uv.extra.lazyLoad.pagination.perPage * (page + 2)
    return this.uv.rowLoadState.fetchedRowCount < shownRowCount
  }

  private get nextPageRequiresLoading() {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return false
    return this.pageRequiresLoading(
      this.uv.extra.lazyLoad.pagination.currentPage + 1,
    )
  }

  private goToFirstPage() {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return

    this.uv.extra.lazyLoad.pagination.currentPage = 0
  }

  private goToPrevPage() {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return

    if (this.uv.extra.lazyLoad.pagination.currentPage > 0) {
      this.uv.extra.lazyLoad.pagination.currentPage--
    }
  }

  private goToNextPage() {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return

    if (this.nextPageRequiresLoading) {
      this.uv.extra.lazyLoad.pagination.loading = true
      this.$emit('load-next-chunk', () => {
        if (this.uv.extra.lazyLoad.type !== 'pagination') return

        this.uv.extra.lazyLoad.pagination.loading = false
        this.uv.extra.lazyLoad.pagination.currentPage++
      })
    } else {
      this.uv.extra.lazyLoad.pagination.currentPage++
    }
  }

  private goToPage(page: number) {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return
    const { pagination } = this.uv.extra.lazyLoad
    const { rowLoadState } = this.uv

    const requiredRowNumber = (page + 1) * pagination.perPage

    if (requiredRowNumber <= rowLoadState.fetchedRowCount) {
      pagination.currentPage = page
    } else if (this.uv.rowLoadState.complete) {
      pagination.currentPage = Math.floor(
        rowLoadState.fetchedRowCount / pagination.perPage,
      )
    } else {
      pagination.loading = true
      this.$emit('load-entries', requiredRowNumber, () => {
        this.$nextTick(() => {
          if (requiredRowNumber <= this.uv.rowLoadState.fetchedRowCount) {
            pagination.currentPage = page
          } else {
            pagination.currentPage = Math.floor(
              this.uv.rowLoadState.fetchedRowCount / pagination.perPage,
            )
          }
          pagination.loading = false
        })
      })
    }
  }

  private get currentRows() {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return ''

    const fromRow =
      this.uv.extra.lazyLoad.pagination.currentPage *
        this.uv.extra.lazyLoad.pagination.perPage +
      1
    const toRow =
      (this.uv.extra.lazyLoad.pagination.currentPage + 1) *
      this.uv.extra.lazyLoad.pagination.perPage
    const rowCount = this.uv.rowLoadState.complete
      ? ` ${this.$t('of').toString()} ${this.uv.rowLoadState.fetchedRowCount}`
      : ''
    return `${fromRow}-${toRow}${rowCount}`
  }

  private get currentVisualPage() {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return '0'

    const allPages = this.pagesCount ? `/${this.pagesCount}` : ''
    return `${this.uv.extra.lazyLoad.pagination.currentPage + 1}${allPages}`
  }

  @Watch('currentVisualPage')
  private updateCurrentPageToParent() {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return
    if (!this.isTopLevel) return

    this.$emit(
      'update:current-page',
      this.uv.extra.lazyLoad.pagination.currentPage,
    )
  }

  private get pagesCount(): number | null {
    if (
      this.uv.extra.lazyLoad.type !== 'pagination' ||
      !this.uv.rowLoadState.complete
    )
      return null

    return Math.ceil(
      this.uv.rowLoadState.fetchedRowCount /
        this.uv.extra.lazyLoad.pagination.perPage,
    )
  }

  private updatePageSize(newPageSize: number) {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return

    this.uv.extra.lazyLoad.pagination.perPage = newPageSize
    this.uv.rowLoadState.perFetch = newPageSize
    this.goToFirstPage()

    if (
      newPageSize > this.uv.rowLoadState.fetchedRowCount &&
      !this.uv.rowLoadState.complete
    ) {
      this.uv.rowLoadState.fetchedRowCount = 0
      this.$emit('load-next-chunk')
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
    return `${this.uv.rows?.length}${this.middleRows.length}`
  }

  get dirtyHackPreventEntireReloads() {
    const dirtyHackPreventEntireReloadsRaw =
      this.uv.attributes['dirty_hack_prevent_entire_reloads']
    return typeof dirtyHackPreventEntireReloadsRaw === 'boolean'
      ? dirtyHackPreventEntireReloadsRaw
      : false
  }

  private async infiniteHandler(ev: StateChanger) {
    if (this.uv.extra.lazyLoad.type !== 'infinite_scroll') return

    // FIXME: Dirty hack.
    while (this.showTree && !this.uv.rowLoadState.complete) {
      // eslint-disable-next-line no-await-in-loop
      await waitTimeout(1000)
    }

    this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength += showStep

    if (
      !this.uv.rowLoadState.complete &&
      this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength >
        this.uv.rowLoadState.fetchedRowCount
    ) {
      this.$emit('load-next-chunk', (result: boolean) => {
        if (this.uv.rowLoadState.complete) {
          if (this.uv.rowLoadState.fetchedRowCount !== 0) {
            ev.loaded()
          }
          ev.complete()
        } else {
          ev.loaded()
        }

        if (this.uv.extra.lazyLoad.type !== 'infinite_scroll') return
        this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength =
          this.uv.rowLoadState.fetchedRowCount
      })
    } else if (
      this.uv.rowLoadState.complete &&
      this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength >=
        this.uv.rowLoadState.fetchedRowCount
    ) {
      if (this.uv.rowLoadState.fetchedRowCount !== 0) {
        ev.loaded()
      }
      ev.complete()

      this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength =
        this.uv.rowLoadState.fetchedRowCount
    } else {
      ev.loaded()
    }
  }

  private get topAddButton(): Button {
    return {
      type: 'callback',
      icon: 'add',
      variant: outlinedInterfaceButtonVariant,
      caption: this.$t('add_entry').toString(),
      callback: () => void this.loadAllRowsAndAddNewRowOnPosition('top_front'),
    }
  }

  private get showBottomAddButton() {
    return (
      this.showAddRowButtons &&
      (this.uv.extra.lazyLoad.type === 'pagination' ||
        (this.uv.extra.lazyLoad.infiniteScroll &&
          this.uv.rowLoadState.complete))
    )
  }
  private get bottomAddButton(): Button {
    return {
      type: 'callback',
      icon: 'add',
      variant: outlinedInterfaceButtonVariant,
      caption: this.$t('add_entry').toString(),
      callback: () =>
        void this.loadAllRowsAndAddNewRowOnPosition('bottom_back'),
    }
  }

  private getCellVisualPosition(ref: ValueRef): IVisualPosition | null {
    const rowWithCell = this.uv.getRowByRef(ref)
    if (!rowWithCell) return null
    const rowI = this.shownRows.findIndex((row) => row.row === rowWithCell)
    return { row: rowI, column: this.getVisualColumnIndex(ref.column) }
  }

  private get selectedCells(): ValueRef[] {
    const { cursorValue } = this.uv.extra
    return cursorValue
      ? [
          cursorValue,
          ...this.uv.extra.selectedValues
            .keys()
            .filter((ref) => !deepEquals(ref, cursorValue)),
        ]
      : this.uv.extra.selectedValues.keys()
  }

  // `columnIndexes` is 'visual index -> state index' mapping, this function do opposite.
  // 'visual' indexes are as they look in table for a user.
  // 'state' indexes are as they described in userview query, including ones with `visible = false` and so on.
  private getVisualColumnIndex(stateIndex: number) {
    return this.columnIndexes.indexOf(stateIndex)
  }

  private getValueRefByVisualPosition(position: IVisualPosition): ValueRef {
    return {
      ...this.shownRows[position.row].ref,
      column: this.columnIndexes[position.column],
    }
  }

  private expandSelection(direction: MoveDirection) {
    const oldCursorValue = this.uv.extra.oldCursorValue
    if (!oldCursorValue) {
      return
    }
    const oldCursorPosition = this.getCellVisualPosition(oldCursorValue)!
    if (!oldCursorPosition) {
      // Old cursor position got deleted.
      this.moveCursor(direction)
      return
    }

    this.moveCursor(direction, { keepOldCursor: true })
    const cursorPosition = this.getCellVisualPosition(
      this.uv.extra.cursorValue!,
    )!

    for (const cellPos of this.getCellsInRectangle(
      oldCursorPosition,
      cursorPosition,
    )) {
      const cellRef = this.getValueRefByVisualPosition(cellPos)
      this.selectValue(cellRef, true)
    }
  }

  private getMovedCell(
    ref: IVisualPosition,
    direction: MoveDirection,
    options?: { step?: number },
  ): IVisualPosition {
    const maxRow = this.shownRows.length - 1
    const maxColumn = this.columnIndexes.length - 1

    /* eslint-disable no-multi-spaces, comma-spacing, key-spacing, space-in-parens */
    const calcDelta = (
      decDirection: MoveDirection,
      incDirection: MoveDirection,
    ) =>
      (options?.step ?? 1) *
      ((direction === incDirection ? 1 : 0) -
        (direction === decDirection ? 1 : 0))
    const rowDelta = calcDelta('up', 'down')
    const columnDelta = calcDelta('left', 'right')

    const newPosition = {
      row: R.clamp(0, maxRow, ref.row + rowDelta),
      column: R.clamp(0, maxColumn, ref.column + columnDelta),
    }
    /* eslint-enable no-multi-spaces, comma-spacing, key-spacing, space-in-parens */

    return newPosition
  }

  private moveCursor(
    direction: MoveDirection,
    options?: { step?: number; keepOldCursor?: boolean },
  ): boolean {
    const { cursorValue } = this.uv.extra
    if (!cursorValue) return false

    this.deselectAllCells({ clearCursor: false })

    const cursorPosition = this.getCellVisualPosition(cursorValue)
    if (!cursorPosition) {
      throw new Error('Cursor is in invalid position')
    }
    const newCursorPosition = this.getMovedCell(
      cursorPosition,
      direction,
      options,
    )
    const newCursorValue = this.getValueRefByVisualPosition(newCursorPosition)
    this.setCursorCell(newCursorValue, options)

    // TODO: fix scrolling to first row and to first non-fixed columns when there are fixed columns.
    this.getVisualCellElement(newCursorPosition)?.scrollIntoView({
      block: 'nearest',
    })

    return !deepEquals(cursorValue, newCursorValue)
  }

  private getVisualCellElement(ref: IVisualPosition): HTMLElement | null {
    const visualRow = this.shownRows[ref.row]
    const row = (
      this.$refs[`row-${visualRow.key}`] as TableRow[] | undefined
    )?.[0]
    if (!row) {
      return null
    }
    console.assert(
      this.shownRows[ref.row].row === row.row,
      'shown row equal to ref row',
    )
    const cell = (row.$refs['cells'] as TableCell[] | undefined)?.[ref.column]
    if (!cell) {
      return null
    }
    return (cell.$refs['cell'] as HTMLElement | undefined) ?? null
  }

  private editCellOnCursor() {
    const valueRef = this.uv.extra.cursorValue
    if (!valueRef) return
    this.setCellEditing(valueRef)
  }

  get columnIndexes() {
    const columns = this.columns
      .map((column, index) => ({
        index,
        fixed: column.fixed,
        visible: column.visible,
      }))
      .filter((c) => c.visible)
    const fixed = columns.filter((c) => c.fixed)
    const nonFixed = columns.filter((c) => !c.fixed)
    return [...fixed, ...nonFixed].map((c) => c.index)
  }

  get fixedColumnIndexes() {
    return mapMaybe((col, colI) => (col.fixed ? colI : undefined), this.columns)
  }

  get editingLocked() {
    if (this.editing === null || this.editingValue === null) {
      return false
    } else {
      return this.editing.ref.type !== 'existing' && this.addedLocked
    }
  }

  get showLinkColumn() {
    return Boolean(
      this.uv.extra.hasRowLinks ||
        this.createEntryButton ||
        this.createEntryButtons,
    )
  }

  private get createEntryButtons(): Button | null {
    return this.creationButtons
      ? {
          type: 'button-group',
          icon: 'add',
          variant: interfaceButtonVariant,
          tooltip: this.$t('add_entry_in_modal').toString(),
          buttons: this.creationButtons,
        }
      : null
  }

  private get createEntryButton(): Button | null {
    return this.creationLink && !this.createEntryButtons
      ? {
          type: 'link',
          icon: 'add',
          variant: interfaceButtonVariant,
          tooltip: this.$t('add_entry_in_modal').toString(),
          link: this.creationLink,
        }
      : null
  }

  get editingValue() {
    if (
      this.editing === null ||
      this.editingNonNullableBoolean // Bools are special case because they toggle on double click.
    ) {
      return null
    } else {
      const value = this.uv.getValueByRef(this.editing.ref)
      if (!value) {
        return null
      } else {
        const columnInfo = this.uv.info.columns[this.editing.ref.column]
        const columnAttrs = this.uv.columnAttributes[this.editing.ref.column]
        const type = columnInfo.valueType
        const attributes = {
          ...this.uv.attributes,
          ...value.row.attributes,
          ...columnAttrs,
          ...value.value.attributes,
        }
        return {
          value: value.value,
          attributes,
          type,
        }
      }
    }
  }

  protected created() {
    this.currentFilter = this.filter
    this.init()

    if (
      this.initialPage !== null &&
      this.uv.extra.lazyLoad.type === 'pagination'
    ) {
      this.goToPage(this.initialPage)
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

  @Watch('uv')
  protected uvChanged() {
    this.init()
    this.updateRows()

    this.watchShowTree()
    ;(
      this.$refs['infiniteLoading'] as InfiniteLoading | undefined
    )?.stateChanger.reset()
  }

  private get initialPage() {
    return !this.isRoot ||
      this.query === null ||
      this.query.root.page === null ||
      this.query.root.page < 1
      ? null
      : this.query.root.page
  }

  get softDisabled() {
    return Boolean(this.uv.attributes['soft_disabled'])
  }

  @Watch('uv.info.mainEntity', { immediate: true, deep: true })
  private async updateShowAddRowButtons() {
    // Don't reset it here to avoid button flickering.
    // this.showAddRowButtons = false;

    if (!this.uv.info.mainEntity || !this.uv.info.mainEntity.forInsert) {
      this.showAddRowButtons = false
      return
    }

    const entity = await this.getEntity(this.uv.info.mainEntity.entity)
    this.showAddRowButtons = entity?.access.insert ?? false
  }

  private deselectAllCells(opts?: { clearCursor?: boolean }) {
    this.uv.extra.selectedValues.keys().forEach((key) => {
      this.selectValue(key, false)
    })
    this.lastSelectedRow = null

    if (opts?.clearCursor) {
      this.clearCursorCell()
    }
  }

  // Cell text intended for copy to clipboard.
  private getClipboardTextByVisualPosition(pos: IVisualPosition): string {
    const ref = this.getValueRefByVisualPosition(pos)
    const value = this.uv.getValueByRef(ref)
    console.assert(value)
    const info = this.uv.info.columns[ref.column]
    return valueToPunnedText(info.valueType, value!.value)
  }

  private cellTdByVisualPosition(pos: IVisualPosition): HTMLElement {
    const valueRef = this.getValueRefByVisualPosition(pos)
    const value = this.uv.getValueByRef(valueRef)!.value
    const valueText = this.getClipboardTextByVisualPosition(pos)
    const td = document.createElement('td')
    td.textContent = valueText

    const fieldType = value.info?.field?.fieldType
    if (fieldType?.type === 'reference') {
      const valueJson = JSON.stringify(value.value)
      td.setAttribute('data-ozma-reference-value', valueJson)
    }

    return td
  }

  private cellVisualPositionsToSerializedTable(
    positions: IVisualPosition[][],
  ): string {
    const cellTds = positions.map((row) =>
      row.map((cell) => this.cellTdByVisualPosition(cell)),
    )
    const trs = cellTds.map((row) => {
      const tr = document.createElement('tr')
      for (const cell of row) {
        tr.appendChild(cell)
      }
      return tr
    })
    const tbody = document.createElement('tbody')
    for (const tr of trs) {
      tbody.appendChild(tr)
    }
    const table = document.createElement('table')
    table.appendChild(tbody)

    return new XMLSerializer().serializeToString(table)
  }

  private copySelectedCells(event: ClipboardEvent) {
    if (this.editing) return
    if (this.selectedCells.length === 0) return
    event.preventDefault()

    const positions = this.selectedCells.map(
      (cell) => this.getCellVisualPosition(cell) as IVisualPosition,
    )
    const positions2D = Object.values(
      R.groupBy((cell) => String(cell.row), positions) as Record<
        string,
        IVisualPosition[]
      >,
    ).map((row) => row.sort((c1, c2) => c1.column - c2.column))
    const isRectangular = positions2D.every(
      (row) => row.length === positions2D[0].length,
    )

    if (isRectangular) {
      const cells = positions2D.map((row) =>
        row.map((vp) => this.getClipboardTextByVisualPosition(vp)),
      )
      event.clipboardData?.setData('text/plain', plainTextStringify(cells))

      const serialized = this.cellVisualPositionsToSerializedTable(positions2D)
      event.clipboardData?.setData('text/html', serialized)
    } else {
      this.$bvToast.toast(this.$t('non_rectangular_copy').toString(), {
        title: this.$t('copy_error').toString(),
        variant: 'warning',
        solid: true,
      })
    }
  }

  private cutSelectedCell(event: ClipboardEvent) {
    if (this.editing) return
    this.copySelectedCells(event)
    this.clearSelectedCells()
  }

  private valueIsReadOnly(
    valueRef: ValueRef,
    throwToastOnReadOnly = false,
  ): boolean {
    const value = this.uv.getValueByRef(valueRef)!
    const columnAttrs = this.uv.columnAttributes[valueRef.column]
    const getCellAttr = (name: AttributeName) =>
      value.value.attributes?.[name] ||
      value.row.attributes?.[name] ||
      columnAttrs[name] ||
      this.uv.attributes[name]
    if (!value.value.info?.field || getCellAttr('soft_disabled')) {
      if (throwToastOnReadOnly) {
        this.$bvToast.toast(this.$t('read_only_cell').toString(), {
          title: this.$t('edit_error').toString(),
          variant: 'danger',
          solid: true,
        })
      }
      return true
    }
    return false
  }

  private async pasteClipboardToSelectedCells(event: ClipboardEvent) {
    if (this.editing) return
    if (this.selectedCells.length === 0) return
    event.preventDefault()

    const parseResult = parseFromClipboard(event)
    switch (parseResult.type) {
      case 'error':
        return
      case 'values': {
        const { values } = parseResult
        if (values.length === 1 && values[0].length === 1) {
          for (const cell of this.selectedCells) {
            // eslint-disable-next-line no-await-in-loop
            await this.updateValueWithParseValue(cell, values[0][0])
          }
        } else {
          await this.pasteManyCellsToSelectedCell(event, values)
        }
      }
    }
  }

  private async updateValueWithParseValue(
    ref: ValueRef,
    parseValue: ClipboardParseValue,
  ) {
    if (this.valueIsReadOnly(ref, true)) {
      return false
    }

    const value = this.uv.getValueByRef(ref)!.value
    const fieldType = value.info?.field?.fieldType.type
    if (parseValue.type === 'reference') {
      const punOrValue =
        fieldType === 'reference' ? parseValue.value : parseValue.pun
      // FIXME TODO: If `fieldType` is `reference`, how to pass pun? Otherwise it's asks backend for every pasting, which sucks.
      await this.updateValue(ref, punOrValue)
    } else if (fieldType === 'reference') {
      this.$bvToast.toast(this.$t('paste_no_referencefield_data').toString(), {
        title: this.$t('paste_error').toString(),
        variant: 'danger',
        solid: true,
      })
    } else {
      await this.updateValue(ref, parseValue.value)
    }
    return true
  }

  private async pasteManyCellsToSelectedCell(
    event: ClipboardEvent,
    values: ClipboardParseValue[][],
  ) {
    if (this.editing) return
    let valueRef = this.uv.extra.cursorValue
    if (!valueRef) return

    const changedValueRefs: ValueRef[] = []
    for (const [rowIndex, row] of values.entries()) {
      let counter = 0
      for (const [cellIndex, cell] of row.entries()) {
        valueRef = this.uv.extra.cursorValue as ValueRef

        // eslint-disable-next-line no-await-in-loop
        await this.updateValueWithParseValue(valueRef, cell)
        changedValueRefs.push(valueRef)
        if (cellIndex < row.length - 1) {
          const edgeReached = !this.moveCursor('right')
          if (edgeReached) {
            this.$bvToast.toast(
              this.$t('paste_error_too_many_columns').toString(),
              {
                title: this.$t('paste_error').toString(),
                variant: 'danger',
                solid: true,
              },
            )
            return
          }
          counter++
        }
      }

      while (counter !== 0) {
        counter--
        this.moveCursor('left')
      }

      if (rowIndex < values.length - 1) {
        const bottomReached = !this.moveCursor('down')
        if (bottomReached) {
          /* eslint-disable-next-line no-await-in-loop */
          await this.addNewRowOnPosition('bottom_back')
          this.moveCursor('down')
        }
      }
    }
    for (const cell of changedValueRefs) {
      this.selectValue(cell, true)
    }
  }

  private clearCell(ref: ValueRef) {
    if (!this.valueIsReadOnly(ref, true)) {
      void this.updateValue(ref, '')
    }
  }

  private clearSelectedCells() {
    const cells = this.selectedCells
    for (const cell of cells) {
      this.clearCell(cell)
    }
  }

  private onPressEnter() {
    if (this.editing) {
      this.removeCellEditing()
    } else {
      this.editCellOnCursor()
    }
  }

  private onOtherTableClicked(uid: any) {
    if (this.uid !== uid) {
      this.deselectAllCells({ clearCursor: true })
      this.removeCellEditing()
    }
  }

  private onRowInOtherTableSelected(uid: string) {
    if (this.uid !== uid) {
      this.selectAll(false)
    }
  }

  private onFormInputFocused() {
    this.deselectAllCells({ clearCursor: true })
  }

  private get rootEvents(): [name: string, callback: (event: any) => void][] {
    /* eslint-disable @typescript-eslint/unbound-method */
    const handlers = [
      ['copy', this.copySelectedCells],
      ['cut', this.cutSelectedCell],
      ['paste', this.pasteClipboardToSelectedCells],
      ['cell-click', this.onOtherTableClicked],
      ['row-select', this.onRowInOtherTableSelected],
      ['form-input-focused', this.onFormInputFocused],
    ] as [name: string, callback: (event: any) => void][]
    /* eslint-enable @typescript-eslint/unbound-method */

    return handlers.map(([name, callback]) => {
      const wrapper = (event: unknown) => {
        if (this.checkWindow()) {
          callback(event)
        }
      }
      return [name, wrapper]
    })
  }

  private resizedColumnDeltaXs: Record<number, number> = {}
  private columnResizeState:
    | { type: 'idle' }
    | {
        type: 'resizing'
        columnIndex: number
        startX: number
        oldDeltaX: number
      } = { type: 'idle' }
  private handleColumnResizeMouseDown(columnIndex: number, event: MouseEvent) {
    const oldDeltaX = this.resizedColumnDeltaXs[columnIndex] ?? 0
    this.columnResizeState = {
      type: 'resizing',
      columnIndex,
      startX: event.pageX,
      oldDeltaX,
    }
  }
  private handleColumnResizeMouseMove(event: MouseEvent) {
    if (this.columnResizeState.type === 'idle') return

    const deltaX =
      this.columnResizeState.oldDeltaX +
      event.pageX -
      this.columnResizeState.startX
    Vue.set(
      this.resizedColumnDeltaXs,
      this.columnResizeState.columnIndex,
      deltaX,
    )
  }

  private handleColumnResizeMouseUp() {
    if (this.columnResizeState.type === 'idle') return

    this.columnResizeState = { type: 'idle' }
  }

  private showFixedColumnBorder = false

  private stickFixedColumns = true
  private tableResizeObserver: ResizeObserver | null = null
  private onTableResize() {
    const breakpoint = 1000
    const ref = this.$refs['tableWrapper'] as HTMLElement | undefined
    const tableWidth = ref?.offsetWidth ?? breakpoint
    this.stickFixedColumns = tableWidth > breakpoint
  }

  protected mounted() {
    /* eslint-disable @typescript-eslint/unbound-method */
    ;(this.$el as HTMLElement).addEventListener(
      'scroll',
      this.removeCellEditing,
    )
    document.addEventListener('mousemove', this.handleColumnResizeMouseMove)
    document.addEventListener('mouseup', this.handleColumnResizeMouseUp)
    ;(this.$refs['tableWrapper'] as HTMLElement)?.addEventListener(
      'scroll',
      () => {
        this.showFixedColumnBorder = Boolean(
          (this.$refs['tableWrapper'] as HTMLElement | undefined)?.scrollLeft,
        )
      },
    )
    if (this.$refs['tableWrapper']) {
      this.tableResizeObserver = new ResizeObserver(
        debounceTillAnimationFrame(this.onTableResize),
      )
      this.tableResizeObserver.observe(
        this.$refs['tableWrapper'] as HTMLElement,
      )
    }
    this.rootEvents.forEach(([name, callback]) =>
      this.$root.$on(name, callback),
    )
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  @Watch('showTree', { immediate: true })
  private watchShowTree() {
    if (this.showTree && !this.uv.rowLoadState.complete) {
      this.$emit('load-all-chunks', () => {})
    }
  }

  protected beforeDestroy() {
    /* eslint-disable @typescript-eslint/unbound-method */
    ;(this.$el as HTMLElement).removeEventListener(
      'scroll',
      this.removeCellEditing,
    )
    document.removeEventListener('mousemove', this.handleColumnResizeMouseMove)
    document.removeEventListener('mouseup', this.handleColumnResizeMouseUp)
    /* window.removeEventListener("scroll", this.removeCellEditing); */
    this.rootEvents.forEach(([name, callback]) =>
      this.$root.$off(name, callback),
    )
    if (this.$refs['tableWrapper']) {
      this.tableResizeObserver?.unobserve(
        this.$refs['tableWrapper'] as HTMLElement,
      )
    }
    /* eslint-enable @typescript-eslint/unbound-method */

    if (this.uv.extra.lazyLoad.type === 'pagination' && this.isTopLevel) {
      this.$emit('update:current-page', null)
    }

    if (this.printListener !== null) {
      window.removeEventListener(
        'beforeprint',
        this.printListener.printCallback,
      )
      this.printListener.query.removeListener(this.printListener.queryCallback)
    }
    if (this.clickTimeout !== null) {
      clearTimeout(this.clickTimeout.id)
    }
    this.releaseEntries()
  }

  private get filterType(): 'local' | 'remote' {
    return 'remote' // TODO: Make it `"local"` on some conditions.
  }

  @Watch('filter', { immediate: true })
  protected updateFilter() {
    if (this.filterType === 'remote') {
      // const columns = this.uv.info.columns.map(column => column.name);
      // const searchInColumnsParsed = stringArraySchema.safeParse(this.uv.attributes["search_in_columns"]);
      // const rawSearchInColumns = searchInColumnsParsed.success ? searchInColumnsParsed.data : [];
      // const searchInColumns = R.intersection(columns, rawSearchInColumns);

      if (!deepEquals(this.currentFilter, this.filter)) {
        const search =
          this.filter.length === 0 ? undefined : this.filter.join(' ')
        this.$emit('load-entries-with-remote-search', search)
      }
      this.currentFilter = this.filter
    } else if (this.filterType === 'local') {
      if (this.dirtyHackPreventEntireReloads) return

      if (this.filter.length !== 0 && this.uv.rowLoadState.complete === false) {
        this.$emit('load-all-chunks')
      }

      // Check if current filter contained this one
      const contained =
        !this.showTree &&
        this.currentFilter.every((oldWord) =>
          this.filter.some((newWord) => newWord.startsWith(oldWord)),
        )

      const oldFilter = this.currentFilter
      this.currentFilter = this.filter

      if (!contained) {
        this.buildRowPositions()
      } else {
        // Filter existing rows when we filter a subset of already filtered ones.
        const newWords = this.currentFilter.filter(
          (newWord) =>
            !oldFilter.some((oldWord) => oldWord.startsWith(newWord)),
        )
        this.rowPositions = this.rowPositions.filter(
          (rowI) =>
            rowI.type === 'existing' &&
            rowContains(this.uv.rows![rowI.position], newWords),
        )
      }
    } else {
      throw new NeverError(this.filterType)
    }
  }

  @Watch('editingValue')
  protected updateEditingValue() {
    if (this.editingValue !== null) {
      const info = this.editingValue.value.info
      const fieldType = info?.field?.fieldType
      if (fieldType?.type === 'reference') {
        if (!this.keptEntries.exists(info!.fieldRef)) {
          void this.addEntriesConsumer({
            ref: info!.fieldRef,
            reference: this.uid,
          })
          this.keptEntries.insert(info!.fieldRef)
        }
      }
    }
  }

  private get autofocusColumnIndex(): number | null {
    if (this.columnIndexes.length === 0) return null
    const values = this?.uv?.emptyRow?.values
    if (!values) return null

    let result = this.columnIndexes[0]
    for (const icol of this.columnIndexes) {
      const column = values[icol]
      if (column.rawValue === undefined && column?.info !== undefined) {
        if (!column?.info?.field?.isNullable) {
          return icol
        } else if (
          values[result].rawValue !== undefined &&
          column.rawValue === undefined
        ) {
          result = icol
        }
      }
    }
    return result
  }

  // TODO: Load all rows is temporary until we can't load rows by ids.
  private async loadAllRowsAndAddNewRowOnPosition(
    side: IAddedRowMeta['side'],
  ): Promise<void> {
    if (!this.uv.rowLoadState.complete) {
      this.$emit('load-all-chunks', () => this.addNewRowOnPosition(side))
      return Promise.resolve()
    } else {
      return this.addNewRowOnPosition(side)
    }
  }

  private async addNewRowOnPosition(
    side: IAddedRowMeta['side'],
  ): Promise<void> {
    const meta: IAddedRowMeta = { side }
    const rowId = await this.addNewRow(meta)

    void nextRender().then(() => {
      const row = this.getVisualIndexOfAddedRow(rowId)
      if (row === null || this.autofocusColumnIndex === null) {
        console.error('Unable to autofocus to new row')
        return
      }
      if (side === 'bottom_back') {
        const ref = this.$refs['tableWrapper'] as HTMLElement | undefined
        ref?.scrollTo({
          top: ref.scrollHeight,
          behavior: 'instant',
        })
      }
      const column = this.getVisualColumnIndex(this.autofocusColumnIndex)
      const cellToFocus = this.getValueRefByVisualPosition({ row, column })
      this.setCursorCell(cellToFocus)
      this.editCellOnCursor()
    })
  }

  private getVisualIndexOfAddedRow(id: number): number | null {
    const index = this.shownRows.findIndex((row) => row.key === `added-${id}`)
    return index === -1 ? null : index
  }

  private showTreeChildren(parentRef: CommittedRowRef) {
    if (parentRef.type !== 'existing') return
    const row = this.uv.rows![parentRef.position]
    if (row.extra.tree!.arrowDown) return

    row.extra.tree!.arrowDown = true
  }

  private hideTreeChildren(parentRef: CommittedRowRef) {
    if (parentRef.type !== 'existing') return
    const row = this.uv.rows![parentRef.position]
    if (!row.extra.tree!.arrowDown) return

    row.extra.tree!.arrowDown = false

    row.extra.tree!.children.forEach((ref) => this.hideTreeChildren(ref))
  }

  private async addChild(parentRef: CommittedRowRef) {
    if (this.uv.extra.treeParentColumnIndex === null) {
      throw new Error('Impossible')
    }
    if (parentRef.type !== 'existing') return
    this.showTreeChildren(parentRef)

    const row = this.uv.rows![parentRef.position]
    const meta: IAddedRowMeta = { side: 'hidden' }
    const rowId = await this.addNewRow(meta)
    const newRow = this.uv.newRows[rowId]

    const newRef: IAddedRowRef = { type: 'added', id: rowId }
    await this.updateValue(
      { ...newRef, column: this.uv.extra.treeParentColumnIndex },
      this.uv.rows![parentRef.position].mainId,
    )
  }

  private toggleChildren(ref: CommittedRowRef, visible: boolean) {
    if (visible) {
      this.showTreeChildren(ref)
    } else {
      this.hideTreeChildren(ref)
    }
  }

  get showTree() {
    return (
      this.uv.extra.treeParentColumnIndex !== null &&
      this.currentFilter.length === 0
    )
  }

  // Update `this.rowsPositions` when `this.uv.rows` has changed.
  private buildRowPositions() {
    const rows = this.uv.rows
    let rowPositions: CommittedRowRef[]
    if (rows === null) {
      rowPositions = []
    } else if (this.showTree) {
      rowPositions = mapMaybe((row, rowI) => {
        if (row.extra.tree!.level !== 0 || row.extra.shownAsNewRow) {
          return undefined
        } else {
          return {
            type: 'existing',
            position: rowI,
          }
        }
      }, rows)
    } else if (this.filter.length !== 0) {
      rowPositions = mapMaybe((row, rowI) => {
        if (row.extra.shownAsNewRow || !rowContains(row, this.filter)) {
          return undefined
        } else {
          return {
            type: 'existing',
            position: rowI,
          }
        }
      }, rows)
    } else {
      rowPositions = rows.map((row, rowI) => ({
        type: 'existing',
        position: rowI,
      }))
    }

    this.rowPositions = rowPositions
    this.sortRows()
  }

  private removeCellEditing() {
    this.editing = null
  }

  // Value is not actually required to be editable - it can be opened in read-only mode too.
  private setCellEditing(ref: ValueRef) {
    if (!this.canEditCell(ref)) return

    const refPos = this.getCellVisualPosition(ref)
    if (!refPos) {
      return
    }

    const element = this.getVisualCellElement(refPos)
    if (!element) {
      return
    }

    element.scrollIntoView({ block: 'nearest' })
    const cellRect = element.getBoundingClientRect()
    this.editing = {
      ref,
      x: cellRect.x,
      y: cellRect.y,
      width: element.offsetWidth,
      height: element.offsetHeight,
      minHeight: element.offsetHeight,
    }
  }

  private canEditCell(ref: ValueRef) {
    return !(this.columns[ref.column].type === 'buttons')
  }

  private get editingNonNullableBoolean(): boolean {
    if (this.editing === null) return false
    const valueField = this.uv.getValueByRef(this.editing.ref)?.value.info
      ?.field
    if (valueField === null || valueField === undefined) return false
    return (
      valueField.valueType.type === 'bool' && valueField.isNullable === false
    )
  }

  @Watch('editing')
  private async watchEditingForBool() {
    if (this.editing === null) return
    const ref = this.editing.ref
    if (ref.type === 'new') return

    if (this.editingNonNullableBoolean && !this.valueIsReadOnly(ref)) {
      const value = this.uv.getValueByRef(ref)!.value.value
      await this.updateCurrentValue(!value)
      this.removeCellEditing()
    }
  }

  private updateClickTimer(ref: ValueRef) {
    if (
      this.clickTimeout === null ||
      !equalValueRef(this.clickTimeout.ref, ref)
    ) {
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout.id)
      }
      const id = setTimeout(() => {
        this.clickTimeout = null
      }, doubleClickTime)
      this.clickTimeout = {
        id,
        ref,
      }
    } else {
      clearTimeout(this.clickTimeout.id)
      this.clickTimeout = null
      this.setCellEditing(ref)
    }
  }

  get parentWindow() {
    return elementWindow(this.$el as HTMLElement)
  }

  private checkWindow() {
    return this.activeWindow === this.parentWindow
  }

  private closeCellContextMenu() {
    this.cellContextMenu = null
  }

  private openCellContextMenu(
    pos: IVisualPosition,
    element: HTMLElement,
    event: MouseEvent,
  ) {
    const ref = this.getValueRefByVisualPosition(pos)
    this.setCursorCell(ref)

    this.cellContextMenu = {
      reference: {
        clientWidth: 1,
        clientHeight: 1,
        getBoundingClientRect: () =>
          new DOMRect(event.clientX, event.clientY, 1, 1),
        removeEventListener: () => {},
      },
      buttons: this.getButtonsForContextMenu(pos),
    }
  }

  private getButtonsForContextMenu(pos: IVisualPosition): Button[] {
    return [
      {
        type: 'callback',
        icon: 'content_cut',
        caption: this.$t('cut').toString() + ' (Ctrl+X)',
        variant: defaultVariantAttribute,
        callback: () => {
          void this.$bvModal.msgBoxOk(
            this.$t('contextmenu_cut_tooltip').toString(),
            {
              okTitle: this.$t('ok').toString(),
              centered: true,
            },
          )
        },
      },
      {
        type: 'callback',
        icon: 'content_copy',
        caption: this.$t('copy').toString() + ' (Ctrl+C)',
        variant: defaultVariantAttribute,
        callback: () => {
          void this.$bvModal.msgBoxOk(
            this.$t('contextmenu_copy_tooltip').toString(),
            {
              okTitle: this.$t('ok').toString(),
              centered: true,
            },
          )
        },
      },
      {
        type: 'callback',
        icon: 'content_paste',
        caption: this.$t('paste').toString() + ' (Ctrl+V)',
        variant: defaultVariantAttribute,
        callback: () => {
          void this.$bvModal.msgBoxOk(
            this.$t('contextmenu_paste_tooltip').toString(),
            {
              okTitle: this.$t('ok').toString(),
              centered: true,
            },
          )
        },
      },
    ]
  }

  private getCellsInRectangle(
    corner1: IVisualPosition,
    corner2: IVisualPosition,
  ): IVisualPosition[] {
    const top = Math.min(corner1.row, corner2.row)
    const bottom = Math.max(corner1.row, corner2.row)
    const left = Math.min(corner1.column, corner2.column)
    const right = Math.max(corner1.column, corner2.column)

    const range = (start: number, end: number) =>
      Array(end - start + 1)
        .fill(0)
        .map((_, idx) => start + idx)

    const rows = this.shownRows.slice(top, bottom + 1)
    return rows.flatMap((_, rowI) =>
      range(left, right).map((i) => ({ column: i, row: top + rowI })),
    )
  }

  private cellMouseDown(
    pos: IVisualPosition,
    element: HTMLElement,
    event: MouseEvent,
  ) {
    if (event.shiftKey || event.ctrlKey) return

    const ref = this.getValueRefByVisualPosition(pos)
    this.deselectAllCells()
    this.setCursorCell(ref)

    // FIXME: `v-click-outside` somehow doesn't trigger on cell clicks, so close context menu there too.
    this.removeCellEditing()
    this.closeCellContextMenu()
  }

  private continueCellSelection(
    cursorPosition: IVisualPosition,
    element: HTMLElement,
    event: MouseEvent,
  ) {
    if (!(event.buttons & 1) || !this.uv.extra.oldCursorValue) return
    const oldCursorPosition = this.getCellVisualPosition(
      this.uv.extra.oldCursorValue,
    )
    if (!oldCursorPosition) {
      this.uv.extra.oldCursorValue = null
      return
    }

    this.deselectAllCells({ clearCursor: false })
    const cursorValue = this.getValueRefByVisualPosition(cursorPosition)
    this.setCursorCell(cursorValue, { keepOldCursor: true })

    const positions = this.getCellsInRectangle(
      oldCursorPosition,
      cursorPosition,
    )
    for (const pos of positions) {
      this.selectValue(this.getValueRefByVisualPosition(pos), true)
    }
  }

  private endCellSelection(
    ref: IVisualPosition,
    element: HTMLElement,
    event: MouseEvent,
  ) {
    this.uv.extra.oldCursorValue = this.uv.extra.cursorValue
  }

  private shiftSelectCells(pos: IVisualPosition) {
    const ref = this.getValueRefByVisualPosition(pos)
    this.deselectAllCells({ clearCursor: false })
    this.setCursorCell(ref, { keepOldCursor: true })

    if (!this.uv.extra.oldCursorValue) {
      return
    }
    const prevValue = this.getCellVisualPosition(this.uv.extra.oldCursorValue)
    if (!prevValue) {
      this.uv.extra.oldCursorValue = null
      return
    }

    const cells = this.getCellsInRectangle(prevValue, pos)
    for (const cell of cells) {
      this.selectValue(this.getValueRefByVisualPosition(cell), true)
    }
  }

  private clickCell(
    pos: IVisualPosition,
    element: HTMLElement,
    event: MouseEvent,
  ) {
    if (event.ctrlKey) {
      this.removeCellEditing()
      if (this.uv.extra.cursorValue) {
        this.selectValue(this.uv.extra.cursorValue, true)
      }
      const ref = this.getValueRefByVisualPosition(pos)
      this.setCursorCell(ref)
    } else if (event.shiftKey) {
      this.removeCellEditing()
      this.shiftSelectCells(pos)
    } else {
      const ref = this.getValueRefByVisualPosition(pos)
      this.updateClickTimer(ref)
    }
  }

  private selectValue(ref: ValueRef, selectedStatus: boolean) {
    const cell = this.uv.getValueByRef(ref)
    if (!cell) return

    if (cell.value.extra.selected !== selectedStatus) {
      cell.value.extra.selected = selectedStatus
      if (selectedStatus) {
        this.uv.extra.selectedValues.insert(ref)
      } else {
        this.uv.extra.selectedValues.delete(ref)
      }
    }

    // Deselect other cells.
    /* this.$root.$emit("cell-click", this.uid); */
  }

  private setCursorCell(ref: ValueRef, opts?: { keepOldCursor?: boolean }) {
    const cell = this.uv.getValueByRef(ref)
    if (!cell) return

    this.clearCursorCell(opts)

    this.uv.extra.cursorValue = ref
    cell.value.extra.cursor = true

    if (!opts?.keepOldCursor) {
      this.uv.extra.oldCursorValue = ref
    }

    this.$root.$emit('cell-click', this.uid)
  }

  private clearCursorCell(opts?: { keepOldCursor?: boolean }) {
    if (!this.uv.extra.cursorValue) return

    const cell = this.uv.getValueByRef(this.uv.extra.cursorValue)
    if (cell) {
      cell.value.extra.cursor = false
    }
    this.uv.extra.cursorValue = null
    if (!opts?.keepOldCursor) {
      this.uv.extra.oldCursorValue = null
    }
  }

  @Watch('allRows')
  private clearSelectedRow() {
    this.lastSelectedRow = null
  }

  private selectTableRow(pos: number, event: MouseEvent) {
    const row = this.allRows[pos]

    // If we are in a selection mode, just emit selected row.
    if (
      this.selectionMode &&
      row.ref.type === 'existing' &&
      row.row.extra.selectionEntry
    ) {
      this.$emit('select', row.row.extra.selectionEntry)
      return
    }

    if (this.lastSelectedRow !== null && event.shiftKey) {
      const prevRow = this.allRows[this.lastSelectedRow]
      const prevSelected = prevRow.row.extra.selected
      const [from, to] =
        this.lastSelectedRow <= pos
          ? [this.lastSelectedRow, pos]
          : [pos, this.lastSelectedRow]
      for (let i = from; i <= to; i++) {
        this.selectRow(this.allRows[i].ref, prevSelected)
        this.selectChildrenRows(this.allRows[i].row, prevSelected)
      }
    } else {
      this.selectRow(row.ref, !row.row.extra.selected)
      this.selectChildrenRows(row.row, row.row.extra.selected)
    }

    this.lastSelectedRow = pos
    this.$root.$emit('row-select', this.uid)
  }

  private selectChildrenRows(row: ITableExtendedRowCommon, selected: boolean) {
    row.extra.tree?.children.forEach((child) => {
      const childRow = this.uv.getRowByRef(child)
      if (childRow && childRow.extra.tree!.children.length > 0) {
        this.selectChildrenRows(childRow, selected)
      }
      this.selectRow(child, selected)
    })
  }

  selectAll(selectedStatus: boolean) {
    if (selectedStatus) {
      this.allRows.forEach((localRow, rowI) => {
        const row = this.uv.getRowByRef(localRow.ref)
        row!.extra.selected = true
        this.uv.extra.selectedRows.insert(localRow.ref)
      })
    } else {
      this.uv.extra.selectedRows.keys().forEach((ref) => {
        if (ref.type === 'existing') {
          this.uv.getRowByRef(ref)!.extra.selected = false
        } else if (ref.type === 'added') {
          this.uv.newRows[ref.id].extra.selected = false
        } else {
          throw new Error('Impossible')
        }
      })
      this.uv.extra.selectedRows = new ObjectSet()
    }
  }

  private toggleAllRows() {
    this.selectAll(!this.selectedSome)
    this.$root.$emit('row-select', this.uid)
  }

  private releaseEntries() {
    this.keptEntries.keys().forEach((ref) => {
      this.removeEntriesConsumer({ ref, reference: this.uid })
    })
    this.keptEntries = new ObjectSet()
  }

  private init() {
    this.releaseEntries()

    if (this.isTopLevel) {
      this.$emit(
        'update:body-style',
        `
                @media print {
                    @page {
                        size: landscape;
                    }
                }
            `,
      )
    }

    this.$emit('update:enable-filter', this.uv.rows !== null)

    this.updateRows()
  }

  private updateRows() {
    this.buildRowPositions()
  }

  private loadAllRowsAndUpdateSort(sortColumn: number) {
    if (this.dirtyHackPreventEntireReloads) return

    if (!this.uv.rowLoadState.complete) {
      this.$emit('load-all-chunks', () => this.updateSort(sortColumn))
    } else {
      this.updateSort(sortColumn)
    }
  }

  /*
    first sort
    bool:   descending
    number: descending
    string: ascending
  */
  private updateSort(sortColumn: number) {
    const type = this.columns[sortColumn].columnInfo.valueType.type
    if (this.uv.extra.sortColumn !== sortColumn) {
      this.uv.extra.sortColumn = sortColumn
      switch (type) {
        case 'decimal':
          this.uv.extra.sortOptions = { numeric: true }
          this.uv.extra.sortAsc = false
          break
        case 'int':
          this.uv.extra.sortOptions = { numeric: true }
          this.uv.extra.sortAsc = false
          break
        case 'bool':
          this.uv.extra.sortAsc = false
          this.uv.extra.sortOptions = {}
          break
        case 'string':
          this.uv.extra.sortAsc = true
          this.uv.extra.sortOptions = { sensitivity: 'accent' }
          break
        default:
          this.uv.extra.sortAsc = true
          this.uv.extra.sortOptions = {}
      }
    } else {
      this.uv.extra.sortAsc = !this.uv.extra.sortAsc
    }
    this.sortRows()
  }

  private sortRows() {
    if (this.uv.extra.sortColumn === null) return

    const sortColumn = this.uv.extra.sortColumn
    const collator = new Intl.Collator(['en', 'ru'], this.uv.extra.sortOptions)
    const sortFunction: (a: CommittedRowRef, b: CommittedRowRef) => number =
      this.uv.extra.sortAsc
        ? (a, b) => rowIndicesCompare(a, b, this.uv, sortColumn, collator)
        : (a, b) => rowIndicesCompare(b, a, this.uv, sortColumn, collator)

    const sortNewFunction: (a: NewRowRef, b: NewRowRef) => number = this.uv
      .extra.sortAsc
      ? (a, b) => newRowIndicesCompare(a, b, this.uv, sortColumn, collator)
      : (a, b) => newRowIndicesCompare(b, a, this.uv, sortColumn, collator)

    this.rowPositions.sort(sortFunction)
    this.uv.extra.newRowTopSidePositions.sort(sortNewFunction)
    this.uv.extra.newRowBottomSidePositions.sort(sortNewFunction)
    if (this.showTree && this.uv.rows) {
      for (const row of this.uv.rows) {
        row.extra.tree!.addedChildren.sort(sortNewFunction)
        row.extra.tree!.children.sort(sortFunction)
      }
    }
  }

  get middleRows(): IShownRow[] {
    if (this.showTree) {
      const rowPositions: IShownRow[] = []
      const addRowAndChildren = (rowRef: CommittedRowRef) => {
        let row: ITableExtendedRowCommon
        if (rowRef.type === 'existing') {
          const existingRow = this.uv.rows![rowRef.position]
          if (existingRow.deleted) {
            return
          }
          row = existingRow
        } else if (rowRef.type === 'added') {
          const addedRow = this.uv.newRows[rowRef.id]
          if (!addedRow) {
            return
          }
          row = addedRow
        } else {
          throw new Error('Impossible')
        }

        rowPositions.push(refToShownRow(rowRef, row))

        if (row.extra.tree!.arrowDown) {
          for (const ref of row.extra.tree!.addedChildren) {
            addRowAndChildren(getNewRow(this.uv, ref).ref)
          }
          for (const ref of row.extra.tree!.children) {
            addRowAndChildren(ref)
          }
        }
      }
      for (const ref of this.rowPositions) {
        addRowAndChildren(ref)
      }
      return rowPositions
    } else {
      return mapMaybe((rowRef) => {
        let row: ITableExtendedRowCommon
        if (rowRef.type === 'existing') {
          const existingRow = this.uv.rows![rowRef.position]
          if (existingRow.deleted || existingRow.extra.shownAsNewRow) {
            return undefined
          }
          row = existingRow
        } else {
          const addedRow = this.uv.newRows[rowRef.id]
          if (!addedRow) {
            return undefined
          }
          row = addedRow
        }
        return refToShownRow(rowRef, row)
      }, this.rowPositions)
    }
  }

  private getNewRows(rowPositions: NewRowRef[]): IShownRow[] {
    return mapMaybe((ref) => {
      const row = getNewRow(this.uv, ref)
      return row.row.deleted
        ? undefined
        : {
            key: `${ref.type}-${ref.id}`,
            row: row.row,
            notExisting: true,
            ref: row.ref,
          }
    }, rowPositions)
  }

  get topRows(): IShownRow[] {
    return this.getNewRows(this.uv.extra.newRowTopSidePositions)
  }

  get bottomRows(): IShownRow[] {
    return this.getNewRows(this.uv.extra.newRowBottomSidePositions)
  }

  get statusLine() {
    const totalAdded = this.uv.newRowsOrder.length
    let middleRowsLength: number
    if (!this.showTree) {
      middleRowsLength = this.middleRows.length
    } else {
      middleRowsLength = this.uv.rowsCount
    }
    return this.uv.rowLoadState.complete
      ? `${this.$t('total_rows')}: ${totalAdded + middleRowsLength}`
      : null
  }

  get allRows() {
    if (this.uv.extra.lazyLoad.type === 'pagination') {
      const start =
        this.uv.extra.lazyLoad.pagination.currentPage *
        this.uv.extra.lazyLoad.pagination.perPage
      const end = start + this.uv.extra.lazyLoad.pagination.perPage
      const sliced = this.middleRows.slice(start, end)
      return [...this.topRows, ...sliced, ...this.bottomRows]
    } else {
      return [...this.topRows, ...this.middleRows, ...this.bottomRows]
    }
  }

  get shownRows() {
    switch (this.uv.extra.lazyLoad.type) {
      case 'infinite_scroll': {
        const totalAdded = Object.keys(this.uv.newRows).length
        if (this.currentFilter.length > 0) {
          // If we use search we load all rows and then no infinite scroll.
          return this.allRows
        }
        return this.allRows.slice(
          0,
          totalAdded + this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength,
        )
      }
      case 'pagination':
        return this.allRows
      default:
        throw new NeverError(this.uv.extra.lazyLoad)
    }
  }

  private async updateCurrentValue(rawValue: unknown) {
    const editing = this.editing!
    const ref = editing.ref
    const newRef = await this.updateValue(ref, rawValue)
    if (ref.type === 'new') {
      editing.ref = newRef
      this.setCursorCell(ref)
      // FIXME: we shouldn't implement this logic purely for barcodes. Instead, react to keyboard <RET> event!
      if (this.uv.columnAttributes[newRef.column].text_type === 'barcode') {
        void this.addNewRowOnPosition('bottom_back')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@include variant-to-local('table');
@include variant-to-local('default');

.root-wrapper {
  background-color: var(--userview-background-color);
  padding: 1.875rem 2.25rem;
  height: 100%;

  @include mobile {
    padding: 1rem;
  }

  th {
    border-top: none;
  }
}

th,
::v-deep td {
  border-bottom: 1px solid #efefef;
}

.button-container {
  display: flex;
  position: sticky;
  left: 0;
  flex-direction: column;
  align-items: flex-start;
  transition: opacity 0.2s;
  padding: 0.75rem 0;

  .add-row-button {
    position: sticky;
    left: 0.75rem;
  }
}

.add-row-button {
  font-size: 0.875rem;
}

.context-menu-wrapper {
  z-index: 25;
  background-color: var(--default-backgroundColor);
  min-width: 10rem;
}

.footer {
  display: flex;
  position: sticky;
  bottom: 0;
  left: 0;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  z-index: 30;
  margin-top: revert; // Fix for Safari, huge margin otherwise. Caused by `reset.css`.
  margin-top: auto;
  border-top: 1px solid #efefef;
  background-color: var(--table-backgroundColor);
  padding: 0.75rem;

  @include mobile-landscape {
    position: static;
  }

  .pagination-wrapper {
    margin-left: auto;
  }
}

.total-rows {
  position: sticky;
  right: 1.25rem;
  z-index: 30;
  margin-left: auto;
  font-size: 0.75rem;
}

.pagination-wrapper {
  position: sticky;
  right: 1.25rem;
  z-index: 30;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;

  .current-rows {
    margin-right: 1.25rem;
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .current-page-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 3rem; /* To fit at least `99/99` without changing width */
    font-size: 0.75rem;
  }

  .pagination-arrow-button {
    border: none;
    padding: 0;
    width: 1.5rem;
    height: 1.25rem;
  }

  .select-wrapper {
    display: flex;
    align-items: center;
    font-size: 0.75rem;

    .page-select {
      border-color: var(--default-backgroundColor);
      background-color: var(--default-backgroundColor);
      width: 3.5rem; /* To fit any option text */
      font-size: 0.75rem;

      ::v-deep select {
        padding-right: 1rem;
      }
    }
  }
}

.no-results {
  padding: 1rem;
  color: #bfbfbf;
  text-align: left;
}

.table-wrapper {
  --technical-column-width: 4rem;
  --icon-color: #777c87;
  --button-hover-background: #efefef;

  display: flex;
  position: relative;
  flex-direction: column;
  background-color: var(--table-backgroundColor);
  overflow-x: auto;

  &.root {
    border-radius: 0.625rem;
    max-height: 100%;
    overflow-y: auto;
  }
}

.data-col {
  max-width: 100vw !important;
}

.custom-table {
  margin: 0;
  border-left: none;
  border-radius: 0.2rem;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-collapse: separate;
  border-spacing: 0;
  background-color: var(--table-backgroundColor);
  width: 0;
  height: 0; /* Fix for `height: 100%` in cells for Chrome/Safari, https://stackoverflow.com/questions/22220698 */
  table-layout: fixed;
}

th {
  position: sticky;
  top: -1px; /* Instead of `0` to fix Safari's gap bug, not needed in normal browsers, but easier to set same for all. */
  vertical-align: middle;
  z-index: 20;
  border-top: 1px solid #efefef;
  height: 4rem;
  user-select: none;

  @include mobile-landscape {
    position: static;
  }

  &:not(.select-row-cell):not(.add-entry-cell) .table-th {
    padding: 0 0.5rem;
  }

  &.select-row-cell ::v-deep {
    .checkbox {
      justify-content: center;
      padding: 0;
    }
  }
  &.add-entry-cell ::v-deep {
    a {
      width: 100%;
      height: 100%;
    }
    .table-th > span {
      display: block;
      width: 100%;
      height: 100%;
    }
    button {
      border-radius: 0;
      width: 100%;
      height: 100%;
    }
    .material-icons {
      color: var(--icon-color);
    }
  }
}

.table-th {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 0.2rem;
  cursor: pointer;
  background-color: var(--table-backgroundColor);
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: #1f1f1f;
  font-weight: 500;
  font-size: 0.875rem;
  text-overflow: ellipsis;
  white-space: nowrap;

  .material-icons {
    color: var(--icon-color);
  }
}

.column-capture {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sorting-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-right: 1rem;
}

.resize-column-thumb {
  display: flex;
  position: absolute;
  top: 0;
  right: 0;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: all 0.2s;
  cursor: col-resize;
  background-color: #efefef;
  width: 1rem;
  height: 100%;

  .material-icons {
    color: #444;
    font-size: 0.75rem;
  }

  thead:hover & {
    opacity: 1;
  }
}

.show-fixed-column-border ::v-deep .last-fixed-cell {
  border-right: 1px solid #efefef;
}

::v-deep td > p {
  margin-bottom: 0;
}

tr {
  height: 4rem;
}

.stick-fixed-columns ::v-deep {
  .fixed-cell {
    position: sticky;
    &.add-entry-cell,
    &.select-row-cell {
      left: 0;
    }
  }
  &.selection-column-enabled .fixed-cell.add-entry-cell {
    left: var(--technical-column-width);
  }
  th.fixed-cell {
    z-index: 31; // Should be bigger than footer's z-index for dropdown overlap
  }
  td.fixed-cell {
    z-index: 24;
  }
}

.table-wrapper:not(.stick-fixed-columns) ::v-deep {
  td.fixed-cell {
    position: static;
    left: 0 !important;
  }
}

@media screen and (max-device-width: 650px) {
  .table-wrapper {
    height: 100%;
  }

  .active-editing {
    justify-content: flex-start;
    z-index: 100000; /* чтобы FormControl был поверх других таблиц, когда их несколько на странице */
  }
}

@media print {
  .custom-table {
    page-break-inside: auto;
    border-spacing: 0;
  }

  td ::v-deep a {
    text-decoration: none !important;
  }
}

/* Second selctor is for system columns */
::v-deep .table-tr.last-top-new td,
.table-tr.last-top-new td ~ td {
  border-bottom: 2px solid var(--table-backgroundDarker2Color);
}

/* stylelint-disable no-descending-specificity */
::v-deep .table-tr.first-bottom-new td,
.table-tr.first-bottom-new td ~ td {
  border-top: 2px solid var(--table-backgroundDarker2Color);
}
/* stylelint-enable no-descending-specificity */

::v-deep .button-element > button {
  width: 100%;
}

.select-row-col,
.open-form-col {
  width: var(--technical-column-width);
}

.table-wrapper:not(.multiple-cells-selected) ::v-deep {
  .table-td.selected {
    box-shadow:
      inset 2px 2px 0 var(--FocusBorderColor),
      inset -2px -2px 0 var(--FocusBorderColor);
  }

  .selection-overlay {
    display: none;
  }
}

.fade-2-move {
  transition: transform 0.2s;
}

.empty-userview {
  opacity: 0.7;
  margin: 0.5rem;
  border: 1px solid var(--MainBorderColor);
  border-radius: 0.625rem;
  padding: 0.25rem 0.5rem;
  color: var(--MainTextColor);
}
</style>
