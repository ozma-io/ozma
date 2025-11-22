<i18n>
    {
        "en": {
            "item_not_found": "Record not found",
            "delete": "Delete record",
            "delete_confirmation": "Are you sure want to delete this record?",
            "ok": "OK",
            "cancel": "Cancel",
            "yes": "Yes",
            "no": "No"
        },
        "ru": {
            "item_not_found": "Запись не найдена",
            "delete": "Удалить запись",
            "delete_confirmation": "Вы действительно хотите удалить эту запись?",
            "ok": "ОК",
            "cancel": "Отмена",
            "yes": "Да",
            "no": "Нет"
        },
        "es": {
            "item_not_found": "El registro no está encontrado",
            "delete": "Eliminar el registro",
            "delete_confirmation": "¿Está seguro de que desea eliminar este registro?",
            "ok": "OK",
            "cancel": "Cancelar",
            "yes": "Sí",
            "no": "No"
        }
    }
</i18n>

<template>
  <div
    :class="[
      'view-form',
      { 'contains-only-one-iframe': containsOnlyOneIframe },
    ]"
  >
    <Errorbox
      v-if="rowPositions.length === 0 && firstRow === null"
      :message="$t('item_not_found')"
    />
    <template v-else>
      <b-modal
        :id="$id('confirmDelete')"
        lazy
        centered
        ok-variant="danger"
        :ok-title="$t('ok')"
        :cancel-title="$t('cancel')"
        @ok="deleteRowAndSignal"
        @hidden="toBeDeletedRef = null"
      >
        {{ $t('delete_confirmation') }}
      </b-modal>

      <div v-if="showPagination" class="pagination-wrapper">
        <div class="pagination">
          <b-spinner
            v-if="uv.extra.lazyLoad.pagination.loading"
            class="mr-1"
            small
            label="Next page is loading"
          />
          <ButtonItem :button="firstPageButton" />
          <ButtonItem :button="prevPageButton" />
          <div class="current-page-wrapper">
            <div class="current-page">
              {{ currentVisualPage
              }}<span v-if="pagesCount !== null" class="pages-count">{{
                '/' + pagesCount
              }}</span>
            </div>
          </div>
          <ButtonItem :button="nextPageButton" />
        </div>
      </div>

      <!-- The first form control is special, it points either to the empty row or to the first added row
           dynamically_. This is as to not lose focus when user starts editing empty row. -->
      <FormEntry
        v-if="firstRow !== null"
        ref="firstFormEntry"
        :uv="uv"
        :blocks="gridBlocks"
        :row="firstRow.row"
        :locked="addedLocked"
        :scope="scope"
        :level="level"
        :is-top-level="isTopLevel"
        :show-delete="useDeleteAction.type === 'show'"
        @update="
          updateValue({ ...firstRow.ref, column: arguments[0] }, arguments[1])
        "
        @delete="confirmDelete(firstRow.ref)"
        @goto="$emit('goto', $event)"
      />
      <FormEntry
        v-for="rowId in newRowsPositions"
        :key="`added-${rowId}`"
        :uv="uv"
        :blocks="gridBlocks"
        :row="uv.newRows[rowId]"
        :locked="addedLocked"
        :scope="scope"
        :level="level"
        :is-top-level="isTopLevel"
        :show-delete="useDeleteAction.type === 'show'"
        @update="
          updateValue(
            { type: 'added', id: rowId, column: arguments[0] },
            arguments[1],
          )
        "
        @delete="confirmDelete({ type: 'added', id: rowId })"
        @goto="$emit('goto', $event)"
      />
      <FormEntry
        v-for="rowI in shownRowPositions"
        :key="rowI"
        :class="shownRowPositions.length > 1 ? 'border-bottom p-3' : ''"
        :uv="uv"
        :blocks="gridBlocks"
        :row="uv.rows[rowI]"
        :scope="scope"
        :level="level"
        :is-top-level="isTopLevel"
        :selection-mode="selectionMode"
        :show-delete="useDeleteAction.type === 'show'"
        @update="
          updateValue(
            { type: 'existing', position: rowI, column: arguments[0] },
            arguments[1],
          )
        "
        @delete="confirmDelete({ type: 'existing', position: rowI })"
        @goto="$emit('goto', $event)"
        @select="$emit('select', $event)"
      />

      <infinite-loading
        v-if="useInfiniteScrolling"
        force-use-infinite-wrapper
        spinner="spiral"
        @infinite="infiniteHandler"
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
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Watch } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'
import { IResultColumnInfo, ValueType } from '@ozma-io/ozmadb-js/client'
import { namespace } from 'vuex-class'
import InfiniteLoading, { StateChanger } from 'vue-infinite-loading'

import { tryDicts, mapMaybe } from '@/utils'
import {
  interfaceButtonVariant,
  bootstrapVariantAttribute,
} from '@/utils_colors'
import { UserView } from '@/components'
import Errorbox from '@/components/Errorbox.vue'
import BaseUserView, {
  baseUserViewHandler,
  IBaseRowExtra,
  IBaseValueExtra,
  IBaseViewExtra,
} from '@/components/BaseUserView'
import FormEntry from '@/components/views/form/FormEntry.vue'
import { attrToLink, Link } from '@/links'
import { ICurrentQueryHistory } from '@/state/query'
import {
  ICombinedUserView,
  IExtendedRowCommon,
  IExtendedRowInfo,
  IUserViewHandler,
  RowRef,
} from '@/user_views/combined'
import {
  GridElement,
  IGridInput,
  IGridSection,
} from '@/components/form/FormGrid.vue'
import type { Button } from '@/components/buttons/buttons'
import ButtonItem from '@/components/buttons/ButtonItem.vue'
import { ITableLazyLoad, TableLazyLoad } from './Table.vue'
import { UserString, rawToUserString } from '@/state/translations'

export interface IButtonAction {
  name: UserString
  variant: string
  link: Link
}

export interface IElementField {
  type: 'field'
  index: number
  columnInfo: IResultColumnInfo
  caption: UserString
  forceCaption: boolean
  autofocus: boolean
}

export interface IElementButtons {
  type: 'buttons'
  actions: IButtonAction[]
}

export type FormElement = IElementField | IElementButtons

export type FormGridElement = GridElement<FormElement>

export interface IFormValueExtra extends IBaseValueExtra {
  valueFormatted?: string // Used at least for read-only number inputs.
}

export type IFormRowExtra = IBaseRowExtra

export const FormLazyLoad = TableLazyLoad
type IFormLazyLoad = ITableLazyLoad

const showStep = 3

export interface IFormViewExtra extends IBaseViewExtra {
  lazyLoad: IFormLazyLoad
}

export type IFormCombinedUserView = ICombinedUserView<
  IFormValueExtra,
  IFormRowExtra,
  IFormViewExtra
>
export type IFormExtendedRowInfo = IExtendedRowInfo<IFormRowExtra>
export type IFormExtendedRowCommon = IExtendedRowCommon<
  IFormValueExtra,
  IFormRowExtra
>
export const numberTypes: ValueType['type'][] = ['int', 'decimal']

export const formUserViewHandler: IUserViewHandler<
  IFormValueExtra,
  IFormRowExtra,
  IFormViewExtra
> = {
  ...baseUserViewHandler,

  createLocalUserView(uv: IFormCombinedUserView, oldView?: IFormViewExtra) {
    const baseExtra = baseUserViewHandler.createLocalUserView(uv, oldView)

    const lazyLoad =
      oldView?.lazyLoad ?? FormLazyLoad.parse(uv.attributes['lazy_load'])

    return {
      ...baseExtra,
      lazyLoad,
    }
  },
}

const query = namespace('query')
const settings = namespace('settings')

@UserView({
  handler: formUserViewHandler,
  useLazyLoad: true,
})
@Component({
  components: {
    FormEntry,
    Errorbox,
    ButtonItem,
    InfiniteLoading,
  },
})
export default class UserViewForm extends mixins<
  BaseUserView<IFormValueExtra, IFormRowExtra, IFormViewExtra>
>(BaseUserView) {
  @query.State('current') query!: ICurrentQueryHistory | null
  @settings.Getter('businessModeEnabled') businessModeEnabled!: boolean
  private deletedOne = false
  private toBeDeletedRef: RowRef | null = null

  private autoscrollTimer: number | null = null
  private autoscrollForward = true

  private get showPagination() {
    return (
      this.uv.extra.lazyLoad.type === 'pagination' &&
      this.uv.rowLoadState.fetchedRowCount >=
        this.uv.extra.lazyLoad.pagination.perPage
    )
  }

  private get useInfiniteScrolling() {
    return (
      this.uv.extra.lazyLoad.type === 'infinite_scroll' &&
      (!this.uv.rowLoadState.complete ||
        this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength <
          this.uv.rowLoadState.fetchedRowCount)
    )
  }

  private get nextPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return null

    return {
      type: 'callback',
      icon: 'navigate_next',
      variant: interfaceButtonVariant,
      disabled:
        (this.uv.rowLoadState.complete && this.onLastPage) ||
        (this.uv.extra.lazyLoad.type === 'pagination' &&
          this.uv.extra.lazyLoad.pagination.loading),
      callback: () => this.goToNextPage(),
    }
  }

  private get prevPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return null

    return {
      type: 'callback',
      icon: 'navigate_before',
      variant: interfaceButtonVariant,
      disabled: this.uv.extra.lazyLoad.pagination.currentPage === 0,
      callback: () => this.goToPrevPage(),
    }
  }

  private get firstPageButton(): Button | null {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return null
    return {
      type: 'callback',
      icon: 'first_page',
      variant: interfaceButtonVariant,
      disabled: this.uv.extra.lazyLoad.pagination.currentPage === 0,
      callback: () => this.goToPage(0),
    }
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
      pagination.currentPage =
        Math.floor(rowLoadState.fetchedRowCount / pagination.perPage) - 1
    } else {
      pagination.loading = true
      this.$emit('load-entries', requiredRowNumber, () => {
        this.$nextTick(() => {
          if (requiredRowNumber <= this.uv.rowLoadState.fetchedRowCount) {
            pagination.currentPage = page
          } else {
            // Not sure why do we need `- 1` here but doesn't need it in tables.
            pagination.currentPage =
              Math.floor(
                this.uv.rowLoadState.fetchedRowCount / pagination.perPage,
              ) - 1
          }
          pagination.loading = false
        })
      })
    }
  }

  private navigateToPage(page: number) {
    const params = new URLSearchParams(window.location.search)
    params.set('__p', String(page + 1))
    const url = `${window.location.pathname}?${params.toString()}`
    window.location.replace(url)
  }

  private handleAutoscroll() {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return
    const pagination = this.uv.extra.lazyLoad.pagination
    const isComplete = this.uv.rowLoadState.complete
    const fetchedRowCount = this.uv.rowLoadState.fetchedRowCount
    const knownPages = this.pagesCount
    const effectivePages =
      knownPages !== null
        ? knownPages
        : isComplete
          ? Math.max(
              Math.ceil(fetchedRowCount / pagination.perPage),
              0,
            )
          : null
    const hasKnownPages = effectivePages !== null
    const lastPageIndex =
      hasKnownPages && effectivePages! > 0 ? effectivePages! - 1 : 0
    const canStepForward =
      !isComplete ||
      !hasKnownPages ||
      pagination.currentPage < lastPageIndex
    const hasMultiplePages =
      hasKnownPages && effectivePages! > 1
    const hasLastPage = hasKnownPages && effectivePages! > 0

    switch (pagination.autoscrollDirection) {
      case 'backward':
        if (pagination.currentPage > 0) {
          this.goToPrevPage()
        } else if (hasLastPage) {
          if (pagination.autoscrollRefresh) this.navigateToPage(lastPageIndex)
          else this.goToPage(lastPageIndex)
        } else if (pagination.autoscrollRefresh) {
          this.navigateToPage(0)
        }
        break

      case 'alternate':
        if (this.autoscrollForward) {
          if (!canStepForward) {
            this.autoscrollForward = false
            if (pagination.autoscrollRefresh) this.navigateToPage(0)
            else if (hasMultiplePages) this.goToPrevPage()
          } else {
            this.goToNextPage()
          }
        } else if (pagination.currentPage <= 0) {
          this.autoscrollForward = true
          if (pagination.autoscrollRefresh) {
            if (hasLastPage) this.navigateToPage(lastPageIndex)
            else this.navigateToPage(0)
          } else if (hasMultiplePages) {
            this.goToNextPage()
          }
        } else {
          this.goToPrevPage()
        }
        break

      default:
        if (!canStepForward) {
          if (pagination.autoscrollRefresh) this.navigateToPage(0)
          else this.goToPage(0)
        } else {
          this.goToNextPage()
        }
    }
  }


  private setupAutoscroll() {
    if (this.autoscrollTimer !== null) {
      clearInterval(this.autoscrollTimer)
      this.autoscrollTimer = null
    }
    if (this.uv.extra.lazyLoad.type !== 'pagination') return
    const seconds = this.uv.extra.lazyLoad.pagination.autoscrollSeconds
    if (!seconds || seconds <= 0) return
    this.autoscrollForward =
      this.uv.extra.lazyLoad.pagination.autoscrollDirection !== 'backward'
    this.autoscrollTimer = window.setInterval(
      () => this.handleAutoscroll(),
      seconds * 1000,
    )
  }

  private get currentVisualPage() {
    if (this.uv.extra.lazyLoad.type !== 'pagination') return '0'

    return String((this.uv.extra.lazyLoad.pagination?.currentPage ?? 0) + 1)
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

  private get onLastPage() {
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

  private infiniteHandler(ev: StateChanger) {
    if (this.uv.extra.lazyLoad.type !== 'infinite_scroll') return

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

  get firstRow(): { row: IFormExtendedRowCommon; ref: RowRef } | null {
    if (
      this.uv.newRowsOrder.length === 0 &&
      !this.uv.rows &&
      this.uv.emptyRow
    ) {
      return {
        row: this.uv.emptyRow,
        ref: { type: 'new' },
      }
    } else if (this.uv.newRowsOrder.length > 0) {
      return {
        row: this.uv.newRows[this.uv.newRowsOrder[0]],
        ref: { type: 'added', id: this.uv.newRowsOrder[0] },
      }
    } else {
      return null
    }
  }

  // Because we treat the first added row specially we use only second+ new rows here.
  get newRowsPositions() {
    return this.uv.newRowsOrder.slice(1)
  }

  // When we only have one record displayed, we hide "Delete" button and add is an an action to menu instead.
  get useDeleteAction():
    | { type: 'show_with_ref'; ref: RowRef }
    | { type: 'show' }
    | { type: 'hide' } {
    if (
      this.businessModeEnabled &&
      this.uv.attributes['business_mode_disable_delete']
    ) {
      return { type: 'hide' }
    } else if (
      this.rowPositions.length === 0 &&
      this.newRowsPositions.length === 1
    ) {
      return {
        type: 'show_with_ref',
        ref: { type: 'added', id: this.newRowsPositions[0] },
      }
    } else if (
      this.rowPositions.length === 1 &&
      this.newRowsPositions.length === 0
    ) {
      return {
        type: 'show_with_ref',
        ref: { type: 'existing', position: this.rowPositions[0] },
      }
    } else {
      return { type: 'show' }
    }
  }

  get blockSizes(): number[] | null {
    const rawBlockSizes = this.uv.attributes['block_sizes']
    if (!(rawBlockSizes instanceof Array)) {
      return null
    }
    const blockSizes = rawBlockSizes.map((x) => {
      const n = Math.round(Number(x))
      return Number.isInteger(n) ? Math.max(0, Math.min(n, 12)) : undefined
    })
    return blockSizes.every((x) => x !== undefined)
      ? (blockSizes as number[])
      : null
  }

  get gridBlocks(): FormGridElement[] {
    const viewAttrs = this.uv.attributes
    const blocks: IGridSection<FormElement>[] = (this.blockSizes ?? [12]).map(
      (size) => ({
        type: 'section',
        size,
        content: [],
        singleUserViewSection: false,
        hasNoContent: true,
      }),
    )
    // If 'block_sizes' attribute is not used or invalid,
    // then two-column layout is used.
    const inputWidth = this.blockSizes === null ? 6 : 12

    // Add columns to blocks
    this.uv.info.columns.forEach((columnInfo, i) => {
      const columnAttrs = this.uv.columnAttributes[i]
      const getColumnAttr = (name: string) =>
        tryDicts(name, columnAttrs, viewAttrs)
      const isUserView =
        Boolean(getColumnAttr('control') === 'user_view') ?? false

      const visible = Boolean(getColumnAttr('visible') ?? true)
      if (!visible) {
        return
      }

      const blockAttr = Number(getColumnAttr('form_block'))
      const blockNumber = Number.isNaN(blockAttr) ? 0 : blockAttr
      const block = Math.max(0, Math.min(blockNumber, blocks.length - 1))

      const captionAttr = rawToUserString(getColumnAttr('caption'))
      const caption = captionAttr ?? columnInfo.name

      const autofocus = columnInfo?.name === this.autofocusElementName

      const element: IGridInput<IElementField> = {
        type: 'element',
        size: inputWidth,
        element: {
          type: 'field',
          index: i,
          columnInfo,
          caption,
          forceCaption: Boolean(captionAttr),
          autofocus,
        },
      }
      blocks[block].content.push(element)

      if (blocks[block].content.length === 1 && isUserView) {
        blocks[block].singleUserViewSection = true
      } else {
        blocks[block].singleUserViewSection = false
      }

      if (blocks[block].content.length === 0) {
        blocks[block].hasNoContent = true
      } else {
        blocks[block].hasNoContent = false
      }
    })

    const formButtons = this.uv.attributes['form_buttons']
    if (formButtons !== undefined && Array.isArray(formButtons)) {
      console.warn(
        '@form_buttons attribute deprecated,  will be deleted future.',
      )

      formButtons.forEach((buttons, i) => {
        const blockAttr = Number(buttons['form_block'])
        const blockNumber = Number.isNaN(blockAttr) ? 0 : blockAttr
        const block = Math.max(0, Math.min(blockNumber, blocks.length - 1))

        const actions: IButtonAction[] = []
        if (Array.isArray(buttons['actions'])) {
          buttons['actions'].forEach((action) => {
            const name = rawToUserString(action.name)
            if (name === null) {
              return
            }
            if (typeof action.variant !== 'string') {
              return
            }
            const link = attrToLink(action)
            if (link === null) {
              return
            }
            actions.push({ name: action.name, variant: action.variant, link })
          })
        }

        if (actions.length > 0) {
          const element: IGridInput<IElementButtons> = {
            type: 'element',
            size: 12,
            element: {
              type: 'buttons',
              actions,
            },
          }
          blocks[block].content.push(element)
        }
      })
    }
    return blocks
  }

  private async init() {
    if (this.isTopLevel) {
      this.$emit(
        'update:body-style',
        `
        @media print {
            @page {
                size: portrait;
            }
        }
      `,
      )
    }

    // Almost dirty hack for saving forms for new entries which has no (required && empty) fields.
    if (this.firstRow) {
      const isNewEntry = this.uv.args.args === null
      if (isNewEntry) {
        const columnNotRequired = (column: IResultColumnInfo) =>
          !column.mainField ||
          column.mainField.field.isNullable ||
          column.mainField.field.defaultValue !== undefined
        const canBeSavedImmediately =
          this.uv.info.columns.every(columnNotRequired)
        if (canBeSavedImmediately) {
          const firstColumnIndex = this.uv.info.columns.findIndex(
            (c) => c.mainField,
          )
          if (firstColumnIndex !== -1) {
            await this.updateValue(
              { ...this.firstRow.ref, column: firstColumnIndex },
              this.firstRow.row.values[firstColumnIndex].value ?? '',
            )
          }
        }
      }
    }
  }

  private get autofocusElementName(): string | null {
    if (!this.firstRow) return null
    const isNewEntry = this.uv.args.args === null
    if (!isNewEntry) return null

    const columnRequiredAndEmpty = (column: IResultColumnInfo) =>
      column.mainField &&
      !column.mainField.field.isNullable &&
      column.mainField.field.defaultValue === undefined &&
      !(column.name in this.defaultValues)
    const columnNotRequiredAndEmpty = (column: IResultColumnInfo) =>
      column.mainField &&
      column.mainField.field.defaultValue === undefined &&
      !(column.name in this.defaultValues)
    const firstRequiredColumn = this.uv.info.columns.find(
      columnRequiredAndEmpty,
    )
    const columnToFocus =
      firstRequiredColumn ??
      this.uv.info.columns.find(columnNotRequiredAndEmpty)
    return columnToFocus?.name ?? null
  }

  get buttons() {
    const buttons: Button[] = []
    const deleteRef = this.useDeleteAction
    if (deleteRef.type === 'show_with_ref') {
      buttons.push({
        icon: 'delete_outline',
        caption: this.$t('delete').toString(),
        callback: () => this.confirmDelete(deleteRef.ref),
        variant: bootstrapVariantAttribute('danger'),
        type: 'callback',
      })
    }
    return buttons
  }

  private confirmDelete(ref: RowRef) {
    this.toBeDeletedRef = ref
    this.$bvModal.show(this.$id('confirmDelete'))
  }

  private deleteRowAndSignal() {
    this.deleteRow(this.toBeDeletedRef!)
    this.deletedOne = true
  }

  @Watch('buttons', { deep: true, immediate: true })
  private updateButtons() {
    this.$emit('update:buttons', this.buttons)
  }

  private created() {
    void this.init()
  }

  @Watch('uv')
  private uvChanged() {
    void this.init()

    // Select row automatically if saved with a button.
    if (this.selectionMode && !this.autoSaved && this.uv.rows?.length === 1) {
      const row = this.uv.rows[0]
      if (row.oldAddedId !== undefined) {
        this.$emit('select', this.uv.rows[0].extra.selectionEntry)
      }
    }
  }

  private get initialPage() {
    return !this.isRoot ||
      this.query === null ||
      this.query.root.page === null ||
      this.query.root.page < 1
      ? null
      : this.query.root.page
  }

  @Watch('uv', { immediate: true })
  private uvInit(newUv: any, oldUv: any) {
    if (oldUv) return // Fire method once.

    if (
      this.initialPage !== null &&
      this.uv.extra.lazyLoad.type === 'pagination'
    ) {
      this.goToPage(this.initialPage)
    }
  }

  @Watch('rowPositions')
  private returnIfEmpty() {
    // Go back if we removed all entries.
    if (
      this.isRoot &&
      this.deletedOne &&
      this.rowPositions.length === 0 &&
      this.uv.newRowsOrder.length === 0
    ) {
      this.deletedOne = false // In case we end up in the same uv.
      this.$emit('goto-previous')
    }
  }

  protected mounted() {
    this.setupAutoscroll()
  }

  protected beforeDestroy() {
    if (this.autoscrollTimer !== null) {
      clearInterval(this.autoscrollTimer)
    }
  }

  get rowPositions() {
    if (this.uv.rows === null) {
      return []
    } else {
      return mapMaybe(
        (row, rowI) => (row.deleted ? undefined : rowI),
        this.uv.rows,
      )
    }
  }

  get shownRowPositions() {
    if (this.uv.extra.lazyLoad.type === 'pagination') {
      const start =
        this.uv.extra.lazyLoad.pagination.currentPage *
        this.uv.extra.lazyLoad.pagination.perPage
      const end = start + this.uv.extra.lazyLoad.pagination.perPage
      return this.rowPositions.slice(start, end)
    } else if (this.uv.extra.lazyLoad.type === 'infinite_scroll') {
      return this.rowPositions.slice(
        0,
        this.uv.extra.lazyLoad.infiniteScroll.shownRowsLength,
      )
    } else {
      throw new Error('Wrong lazyLoad type')
    }
  }

  get containsOnlyOneIframe() {
    return (
      this.uv.columnAttributes.length === 1 &&
      this.uv.columnAttributes[0].control === 'iframe'
    )
  }
}
</script>

<style lang="scss" scoped>
.view-form {
  background-color: var(--userview-background-color);
  /* Don't use `height: 100%` here! It breaks table lazy-loading */
  padding: 1.875rem 2.25rem !important;
  overflow-x: hidden;
  overflow-y: auto;
  color: var(--form-foregroundColor);

  @include mobile {
    padding: 1rem !important;
  }

  &.contains-only-one-iframe {
    padding: 0 !important;

    ::v-deep .first_level_grid_block {
      margin-bottom: 0 !important;
    }
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.7rem;

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;

    .current-page-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-width: 3rem; /* To fit at least `99/99` without changing width */
    }

    .pages-count {
      color: var(--default-foregroundDarkerColor);
    }
  }
}

@media print {
  .view-form {
    background-color: white;
  }
}
</style>
