<i18n>
    {
        "en": {
            "view_error": "There are following errors in user view",
            "no_title": "No title",
            "no_columns": "This query lacks board_columns attribute",
            "no_group": "This query lacks board_group attribute on the grouping field"
        },
        "ru": {
            "view_error": "В отображении следующие ошибки",
            "no_title": "Без заголовка",
            "no_columns": "В запросе отсутствует атрибут board_columns",
            "no_group": "В запросе отсутствует атрибут board_group на поле, по которому идёт группировка"
        },
        "es": {
            "view_error": "Hay los siguientes errores en la vista de usuario",
            "no_title": "Sin título",
            "no_columns": "Esta consulta carece del atributo board_columns",
            "no_group": "Esta consulta carece del atributo board_group en el campo de agrupación"
        }
    }
</i18n>

<template>
  <div
    fluid
    :class="[
      'kanban-variant',
      'kanban-local-variant',
      'view_kanban',
      { nested: !isRoot },
    ]"
    :style="colorVariables"
  >
    <Errorbox v-if="errors" :message="errors" />
    <Board
      v-else
      :allow-dragging="!disabled"
      :column-width="columnWidth"
      :background-color="backgroundColor"
      :columns="columns"
      :create-button="!disabled && createView !== null"
      @add="changeGroup"
      @move="changeOrder"
      @create="createCard"
    >
      <template #card="{ card, dragged }">
        <RowCard
          :card="card"
          :dragged="dragged"
          @goto="$emit('goto', $event)"
        />
      </template>
    </Board>
  </div>
</template>

<script lang="ts">
import * as R from 'ramda'
import { Component } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'
import { namespace } from 'vuex-class'
import { RowId } from 'ozma-api'

import { mapMaybe, NeverError, tryDicts } from '@/utils'
import {
  serializeValue,
  tryDeserializeValueFunction,
  valueIsNull,
  valueToText,
} from '@/values'
import { UserView } from '@/components'
import BaseUserView, { EmptyBaseUserView } from '@/components/BaseUserView'
import Board, { IColumn } from '@/components/kanban/Board.vue'
import Errorbox from '@/components/Errorbox.vue'
import { attrToLinkSelf, Link } from '@/links'
import { currentValue, IRowCommon, rowKey, RowRef } from '@/user_views/combined'
import BaseEntriesView from '@/components/BaseEntriesView'
import { attrToQuery, IQuery } from '@/state/query'
import type { ICard } from '@/components/kanban/Column.vue'
import {
  IRowCard,
  default as RowCard,
  CardColumn,
} from '@/components/views/board/RowCard.vue'
import { EntriesRef } from '@/state/entries'
import {
  colorVariantFromAttribute,
  getColorVariantAttributeClassName,
  getColorVariantAttributeVariables,
} from '@/utils_colors'
import { formatValueToHtmlWithInfo } from '@/user_views/format'

interface IGroupColumn {
  group: unknown
}

interface IValueColumn {
  id: unknown
  idKey: string
  name: string
}

interface IEnumColumns {
  type: 'enum'
  values: IValueColumn[]
}

interface IReferenceColumn {
  id: RowId
  name: string | null
}

interface IReferenceColumns {
  type: 'reference'
  entries: EntriesRef
  columns: IReferenceColumn[]
}

type BoardColumnsType = IEnumColumns | IReferenceColumns

const query = namespace('query')

@UserView()
@Component({ components: { Board, Errorbox, RowCard } })
export default class UserViewBoard extends mixins<
  EmptyBaseUserView,
  BaseEntriesView
>(BaseUserView, BaseEntriesView) {
  @query.Action('addWindow') addWindow!: (queryObj: IQuery) => Promise<void>

  protected async mounted() {
    await this.fixEmptyOrders()
    await this.fixOrderUniqueness()
  }

  private async fixEmptyOrders() {
    if (this.orderIndex === null) return

    const allCards = Object.values(this.groupedCards).flat()
    const cardsWithEmptyOrder = allCards.filter((card) =>
      valueIsNull(card.card.order),
    )
    if (cardsWithEmptyOrder.length === 0) return

    const allOrders = allCards
      .filter((card) => typeof card.card.order === 'number')
      .map((card) => card.card.order as number)
    const minOrder = Math.min(...allOrders)
    for (const card of cardsWithEmptyOrder) {
      const ref = {
        ...card.card.ref,
        column: this.orderIndex,
      }
      // eslint-disable-next-line no-await-in-loop
      await this.updateValue(ref, Math.random() * minOrder)
    }
  }

  private async fixOrderUniqueness() {
    if (this.orderIndex === null) return

    const allCards = Object.values(this.groupedCards).flat()
    const ordersRaw = allCards.map((card) => card.card.order)
    if (ordersRaw.some((order) => order === null)) {
      throw new Error("Can't process null orders.")
    }
    const orders = ordersRaw as number[]

    const findDuplicates = (array: any[]) =>
      array.filter((item, index) => array.indexOf(item) !== index)
    const duplicateOrders = findDuplicates(orders)
    if (duplicateOrders.length === 0) return

    const cardsWithDuplicateOrder = allCards.filter((card) =>
      duplicateOrders.includes(card.card.order),
    )
    for (const card of cardsWithDuplicateOrder) {
      const ref = {
        ...card.card.ref,
        column: this.orderIndex,
      }
      // eslint-disable-next-line no-await-in-loop
      await this.updateValue(
        ref,
        (card.card.order as number) + 0.1 * Math.random(),
      )
    }
  }

  get disabled() {
    return Boolean(this.uv.attributes['soft_disabled'])
  }

  get columnsType(): BoardColumnsType | null {
    if (this.groupIndex === null) {
      return null
    }
    const groupColumn = this.uv.info.columns[this.groupIndex]
    const mainField = groupColumn.mainField
    const columnMappings = this.uv.columnAttributeMappings[this.groupIndex]
    const fieldType = mainField?.field.fieldType
    if (fieldType?.type === 'reference') {
      const rawColumns = this.uv.attributes['board_columns']
      if (!(rawColumns instanceof Array)) {
        return null
      }
      const entriesRef: EntriesRef = {
        fetchBy: 'domain',
        entity: fieldType.entity,
        referencedBy: {
          field: {
            entity: this.uv.info.mainEntity!.entity,
            name: mainField!.name,
          },
          rowId: null,
        },
      }
      const requestedColumns: RowId[] = []
      const columns = mapMaybe((col) => {
        if (typeof col === 'number') {
          const mainName = this.currentEntries?.getMainField(col)
          let name: string | null
          if (mainName === undefined) {
            requestedColumns.push(col)
            name = null
          } else if (mainName === null) {
            name = String(col)
          } else {
            name = mainName
          }
          return {
            id: col,
            name,
          }
        } else if (typeof col === 'object' && col !== null) {
          const id = col['id']
          const name = col['name']
          if (typeof id === 'number' && name) {
            return {
              id,
              name: String(name),
            }
          } else {
            return undefined
          }
        } else {
          return undefined
        }
      }, rawColumns)
      if (requestedColumns.length !== 0) {
        void this.fetchEntriesByIds(entriesRef, requestedColumns)
      }

      return {
        type: 'reference',
        entries: entriesRef,
        columns,
      }
    } else if (fieldType?.type === 'enum') {
      let ids: string[]
      const rawColumns = this.uv.attributes['board_columns']
      if (!(rawColumns instanceof Array)) {
        ids = fieldType.values
      } else {
        ids = mapMaybe((rawCol) => {
          const col = String(rawCol)
          return fieldType.values.includes(col) ? col : undefined
        }, rawColumns)
      }

      let values: IValueColumn[]
      const textMapping = columnMappings['text']
      if (textMapping) {
        values = ids.map((id) => {
          let name: string
          const rawName = textMapping.entries[id]
          if (rawName) {
            name = String(rawName)
          } else if (textMapping.default) {
            name = String(textMapping.default)
          } else {
            name = id
          }
          return { id, idKey: id, name }
        })
      } else {
        values = ids.map((id) => ({ id, idKey: id, name: id }))
      }

      return {
        type: 'enum',
        values,
      }
    } else {
      const rawColumns = this.uv.attributes['board_columns']
      if (
        groupColumn.valueType.type === 'array' ||
        !(rawColumns instanceof Array)
      ) {
        return null
      } else {
        // To support JSON arrays, which people use for some reason instead of regular arrays.
        const convertFunc =
          tryDeserializeValueFunction(groupColumn.valueType) ?? R.identity
        const values = mapMaybe((val) => {
          if (val === null) {
            return undefined
          } else if (typeof val === 'object') {
            const col = val as Record<string, unknown>
            const id = convertFunc(col['id'])
            const name = col['name']
            if (id !== undefined && name) {
              return {
                id,
                idKey: String(serializeValue(groupColumn.valueType, id)),
                name: String(name),
              }
            } else {
              return undefined
            }
          } else {
            const converted = convertFunc(val)
            if (converted !== undefined) {
              return {
                id: converted,
                idKey: String(serializeValue(groupColumn.valueType, converted)),
                name: valueToText(groupColumn.valueType, converted),
              }
            } else {
              return undefined
            }
          }
        }, rawColumns)
        return {
          type: 'enum',
          values,
        }
      }
    }
  }

  get columnWidth(): number | undefined {
    const width = Number(this.uv.attributes['board_column_width'])
    if (!isNaN(width)) {
      return width
    }
    return undefined
  }

  get backgroundColor(): string {
    return 'background_color' in this.uv.attributes
      ? String(this.uv.attributes['background_color'])
      : 'none'
  }

  get colorVariables() {
    const variant = this.uv.attributes['kanban_variant']
    if (variant) {
      return colorVariantFromAttribute(variant)
    } else if (this.backgroundColor !== 'none') {
      /* console.warn("`background_color` is deprecated, use `kanban_variant` instead."); */
      return colorVariantFromAttribute({ background: this.backgroundColor })
    } else {
      return colorVariantFromAttribute(null)
    }
  }

  get groupIndex() {
    const ret = this.uv.columnAttributes.findIndex(
      (attributes) => attributes['board_group'],
    )
    return ret === -1 ? null : ret
  }

  get orderIndex() {
    const ret = this.uv.columnAttributes.findIndex(
      (attributes) => attributes['board_order'],
    )
    if (ret === -1) {
      return null
    }
    const valueType = this.uv.info.columns[ret].valueType
    if (valueType.type !== 'decimal') {
      return null
    }
    return ret
  }

  get createView() {
    return (
      attrToQuery(this.uv.attributes['card_create_view'], {
        infoByDefault: true,
      }) || null
    )
  }

  get groupedCards(): Record<string, ICard<IRowCard>[]> {
    const cards = this.uv.mapVisibleRows((row, ref) => this.makeCard(row, ref))
    if (this.orderIndex !== null) {
      cards.sort((a, b) => a.card.order! - b.card.order!)
    }
    const type = this.uv.info.columns[this.groupIndex!].valueType
    const toGroupText = (card: ICard<IRowCard>) => {
      return String(serializeValue(type, card.card.group))
    }
    return R.groupBy(toGroupText, cards)
  }

  get columns(): IColumn<IRowCard, IGroupColumn>[] | null {
    if (!this.columnsType) return null

    switch (this.columnsType.type) {
      case 'enum':
        return this.columnsType.values.map((value) => ({
          title: value.name,
          key: value.idKey,
          column: {
            group: value.id,
          },
          cards: this.groupedCards[value.idKey] ?? [],
        }))
      case 'reference':
        return this.columnsType.columns.map((col) => ({
          title: col.name,
          key: col.id,
          column: {
            group: col.id,
          },
          cards: this.groupedCards[col.id] ?? [],
        }))
      default:
        throw new NeverError(this.columnsType)
    }
  }

  get errors() {
    const messagesArray = [
      !this.columnsType && this.$t('no_columns'),
      this.groupIndex === null && this.$t('no_group'),
    ].filter((v) => v)

    if (messagesArray.length === 0) {
      return null
    } else {
      const errorMessage = this.$t('view_error')
      return `${errorMessage}:\n${messagesArray.join('\n')}.`
    }
  }

  createCard(column: IGroupColumn, columnIndex: number) {
    const groupInfo = this.uv.info.columns[this.groupIndex!]
    const modalQuery: IQuery = {
      args: {
        ...this.createView!.args,
      },
      defaultValues: {
        ...this.createView!.defaultValues,
        [groupInfo.name]: serializeValue(groupInfo.valueType, column.group),
      },
      search: '',
      page: null,
    }

    if (this.orderIndex !== null) {
      const cards = this.columns![columnIndex].cards
      modalQuery.defaultValues[this.uv.info.columns[this.orderIndex].name] =
        cards.length > 0 ? cards[cards.length - 1].card.order! + 1 : 0
    }

    void this.addWindow(modalQuery)
  }

  private async moveCard(
    card: IRowCard,
    newColumnIndex: number,
    newIndex: number,
  ) {
    if (this.orderIndex === null) {
      return
    }

    const cards = this.columns![newColumnIndex].cards
    let order: number
    if (cards.length === 0) {
      order = 0
    } else if (newIndex === 0) {
      order = cards[0].card.order! - 1
    } else if (newIndex >= cards.length) {
      order = cards[cards.length - 1].card.order! + 1
    } else {
      const prevCard = cards[newIndex - 1]
      const nextCard = cards[newIndex]
      order = (prevCard.card.order! + nextCard.card.order!) / 2
    }

    const ref = {
      ...card.ref,
      column: this.orderIndex,
    }
    await this.updateValue(ref, order)
  }

  changeOrder(
    column: IGroupColumn,
    columnIndex: number,
    card: IRowCard,
    oldIndex: number,
    newIndex: number,
  ) {
    void this.moveCard(
      card,
      columnIndex,
      newIndex > oldIndex ? newIndex + 1 : newIndex,
    )
  }

  changeGroup(
    newColumn: IGroupColumn,
    newColumnIndex: number,
    card: IRowCard,
    newIndex: number,
  ) {
    const ref = {
      ...card.ref,
      column: this.groupIndex!,
    }
    void this.updateValue(ref, newColumn.group)
    void this.moveCard(card, newColumnIndex, newIndex)
  }

  private makeCard(row: IRowCommon, rowRef: RowRef): ICard<IRowCard> {
    const viewAttrs = this.uv.attributes
    const rowAttrs = row.attributes
    const getRowAttr = (name: string) => tryDicts(name, rowAttrs, viewAttrs)

    let link: Link | null = null

    const columns = mapMaybe((value, colI): CardColumn | undefined => {
      const info = this.uv.info.columns[colI]
      const columnAttrs = this.uv.columnAttributes[colI]
      const columnMappings = this.uv.columnAttributeMappings[colI]
      const cellAttrs = value.attributes
      const getCellAttr = (name: string) =>
        tryDicts(name, cellAttrs, columnAttrs, rowAttrs, viewAttrs)

      const rowLink = attrToLinkSelf(getCellAttr('row_link'), value.info)
      if (rowLink !== null) {
        link = rowLink
      }

      const visible =
        getCellAttr('visible') ??
        (colI !== this.orderIndex && colI !== this.groupIndex)
      if (!visible) {
        return undefined
      }

      const { result: textHtml, hasLinks } = formatValueToHtmlWithInfo(
        info.valueType,
        value,
        { columnAttributeMappings: columnMappings },
      )
      const icon = getCellAttr('icon')
      const colorCellVariant = colorVariantFromAttribute(
        getCellAttr('cell_variant'),
      )
      return {
        type: 'text',
        textHtml,
        hasLinks,
        size: 12,
        icon: icon ? String(icon) : null,
        cellVariantClass: getColorVariantAttributeClassName(colorCellVariant),
        cellVariantStyles: getColorVariantAttributeVariables(colorCellVariant),
      }
    }, row.values)

    const group = currentValue(row.values[this.groupIndex!])
    const currentRowOrder =
      this.orderIndex !== null
        ? currentValue(row.values[this.orderIndex])
        : null
    const order =
      this.orderIndex !== null && typeof currentRowOrder === 'number'
        ? currentRowOrder
        : null
    const color = getRowAttr('card_color')
    const variant = getRowAttr('card_variant')
    let colorVariant: any
    if (!valueIsNull(variant)) {
      colorVariant = colorVariantFromAttribute(variant)
    } else if (!valueIsNull(color)) {
      /* console.warn("`card_color` is deprecated, use `card_variant` instead."); */
      colorVariant = colorVariantFromAttribute({ background: color })
    } else {
      colorVariant = colorVariantFromAttribute(null)
    }

    const rowCard: IRowCard = {
      group,
      order,
      link,
      ref: rowRef,
      rows: columns.map((col) => [col]),
    }

    return {
      key: rowKey(rowRef),
      card: rowCard,
      backgroundColor: valueIsNull(color) ? undefined : String(color),
      colorVariant,
    }
  }
}
</script>

<style lang="scss" scoped>
@include variant-to-local('kanban');

.view_kanban {
  height: 100%;

  &.nested {
    border: 1px solid
      var(
        --cell-borderColor,
        var(--form-borderColor, var(--default-borderColor))
      );
    border-radius: 0.625rem;
    overflow: hidden;
  }
}
</style>
