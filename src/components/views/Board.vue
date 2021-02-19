<i18n>
    {
        "en": {
            "view_error": "There are following errors in your view",
            "no_title": "No title",
            "no_columns": "This query is lacking board_columns attribute",
            "no_group": "This query is lacking board_group attribute on the grouping field"
        },
        "ru": {
            "view_error": "В вашем представлении следующие ошибки",
            "no_title": "Без заголовка",
            "no_columns": "В запросе отсутствует атрибут board_columns",
            "no_group": "В запросе отсутствует атрибут board_group на поле, по которому идёт группировка"
        }
    }
</i18n>

<template>
  <div
    fluid
    class="view_kanban"
  >
    <Errorbox
      v-if="errors"
      :message="errors"
    />
    <Board
      v-else
      allow-dragging
      :column-width="columnWidth"
      :column-header-color="columnHeaderColor"
      :background-color="backgroundColor"
      :columns="columns"
      :create-button="createView !== null"
      @add="changeGroup"
      @move="changeOrder"
      @create="createCard"
    >
      <template #card="{ card, dragging }">
        <!-- <a> tags have special behaviour on Safari which breaks animation, hence no-href. -->
        <!-- Ternary in `:link` for fix Firefox issue, see: https://github.com/SortableJS/Sortable/issues/1184 -->
        <FunLink
          class="card_link"
          no-href
          :link="card.link"
          :disabled="dragging"
          @goto="$emit('goto', $event)"
        >
          <b-row
            v-for="(row, rowIndex) in card.rows"
            :key="rowIndex"
            data-no-dragscroll
            class="card_row"
          >
            <b-col
              v-for="(col, colIndex) in row"
              :key="colIndex"
              :cols="col.size"
              data-no-dragscroll
              class="card_col"
            >
              <div
                v-if="col.type === 'image'"
                data-no-dragscroll
                class="card_avatar"
                :style="{ backgroundImage: `url('${col.url}')` }"
              />
              <span
                v-else
                data-no-dragscroll
                class="card_text"
                :title="col.value"
              >
                <span
                  v-if="col.icon && col.value"
                  data-no-dragscroll
                  class="card_icon"
                >
                  {{ col.icon }}
                </span>
                <!-- eslint-disable vue/no-v-html -->
                <!-- TODO: unable to click on string with link, but not on link -->
                <span
                  v-if="col.valueHtml !== col.value"
                  @click.stop
                  v-html="col.valueHtml"
                />
                <span v-else> {{ col.value }} </span>
                <!-- eslint-enable vue/no-v-html -->
              </span>
            </b-col>
          </b-row>
        </FunLink>
      </template>
    </Board>
  </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { namespace } from "vuex-class";
import { RowId } from "ozma-api";

import { mapMaybe, replaceHtmlLinks, tryDicts } from "@/utils";
import { valueIsNull } from "@/values";
import { UserView } from "@/components";
import BaseUserView, { EmptyBaseUserView } from "@/components/BaseUserView";
import Board, { IColumn } from "@/components/kanban/Board.vue";
import Errorbox from "@/components/Errorbox.vue";
import { attrToLinkSelf, Link } from "@/links";
import { currentValue, IRowCommon, rowKey, RowRef, valueToPunnedText } from "@/user_views/combined";
import { IEntriesRef, referenceEntriesRef } from "@/state/entries";
import BaseEntriesView from "@/components/BaseEntriesView";
import { attrToQuery, IQuery } from "@/state/query";
import type { ICard } from "@/components/kanban/Column.vue";

interface ICardColumnBase {
  size: number;
}

interface ITextCardColumn extends ICardColumnBase {
  type: "text";
  icon: string | null;
  value: string;
  valueHtml: string;
}

interface IImageCardColumn extends ICardColumnBase {
  type: "image";
  url: string;
}

type CardColumn = ITextCardColumn | IImageCardColumn;

type CardRow = CardColumn[];

interface IRowCard {
  group: unknown;
  order: number | null;
  ref: RowRef;
  link: Link | null;
  rows: CardRow[];
}

interface IGroupColumn {
  group: unknown;
}

interface IEnumColumns {
  type: "enum";
  values: string[];
}

interface IReferenceColumn {
  id: RowId;
  name: string;
}

interface IReferenceColumns {
  type: "reference";
  entity: IEntriesRef;
  columns: IReferenceColumn[];
}

type BoardColumnsType = IEnumColumns | IReferenceColumns;

const query = namespace("query");

@UserView()
@Component({ components: { Board, Errorbox } })
export default class UserViewBoard extends mixins<EmptyBaseUserView, BaseEntriesView>(BaseUserView, BaseEntriesView) {
  @query.Action("addWindow") addWindow!: (queryObj: IQuery) => Promise<void>;

  get columnsType(): BoardColumnsType | null {
    if (this.groupIndex === null) {
      return null;
    }
    const fieldType = this.uv.info.columns[this.groupIndex].mainField?.field.fieldType;
    if (fieldType?.type === "reference") {
      const rawColumns = this.uv.attributes["board_columns"];
      if (!rawColumns || !(rawColumns instanceof Array)) {
        return null;
      }
      const entityRef = referenceEntriesRef(fieldType);
      const requestedColumns: RowId[] = [];
      const columns = mapMaybe(col => {
        if (typeof col === "number") {
          let name = this.currentEntries?.[col];
          if (name === undefined) {
            requestedColumns.push(col);
            name = String(col);
          }
          return {
            id: col,
            name: String(name),
          };
        } else if (typeof col === "object" && col !== null) {
          const id = col["id"];
          const name = col["name"];
          if (typeof id === "number" && name) {
            return {
              id,
              name: String(name),
            };
          } else {
            return undefined;
          }
        } else {
          return undefined;
        }
      }, rawColumns);
      if (requestedColumns.length !== 0) {
        void this.fetchEntriesByIds(entityRef, requestedColumns);
      }

      return {
        type: "reference",
        entity: entityRef,
        columns,
      };
    } else if (fieldType?.type === "enum") {
      let values: string[];
      const rawColumns = this.uv.attributes["board_columns"];
      if (!rawColumns || !(rawColumns instanceof Array)) {
        values = fieldType.values;
      } else {
        values = mapMaybe(rawCol => {
          const col = String(rawCol);
          return fieldType.values.includes(col) ? col : undefined;
        }, rawColumns);
      }

      return {
        type: "enum",
        values,
      };
    } else {
      const rawColumns = this.uv.attributes["board_columns"];
      if (!rawColumns || !(rawColumns instanceof Array)) {
        return null;
      } else {
        return {
          type: "enum",
          values: rawColumns.map(String),
        };
      }
    }
  }

  get columnWidth(): number | undefined {
    const width = Number(this.uv.attributes["board_column_width"]);
    if (!isNaN(width)) {
      return width;
    }
    return undefined;
  }

  // Attribute
  // EXAMPLE @"header_color" = '#fff0f5'
  // Column header background color.
  get columnHeaderColor(): string {
    return "header_color" in this.uv.attributes ? String(this.uv.attributes["header_color"]) : "none";
  }

  get backgroundColor(): string {
    return "background_color" in this.uv.attributes ? String(this.uv.attributes["background_color"]) : "none";
  }

  get groupIndex() {
    const ret = this.uv.columnAttributes.findIndex(attributes => attributes["board_group"]);
    return ret === -1 ? null : ret;
  }

  get orderIndex() {
    const ret = this.uv.columnAttributes.findIndex(attributes => attributes["board_order"]);
    if (ret === -1) {
      return null;
    }
    const valueType = this.uv.info.columns[ret].valueType;
    if (valueType.type !== "decimal") {
      return null;
    }
    return ret;
  }

  get createView() {
    return attrToQuery(
      this.uv.attributes["card_create_view"],
      { infoByDefault: true },
    ) || undefined;
  }

  get groupedCards(): Record<string, ICard<IRowCard>[]> {
    const cards = this.uv.mapVisibleRows((row, ref) => this.makeCard(row, ref));
    if (this.orderIndex !== null) {
      cards.sort((a, b) => a.card.order! - b.card.order!);
    }
    return R.groupBy(card => String(card.card.group), cards);
  }

  get columns(): IColumn<IRowCard, IGroupColumn>[] | null {
    if (!this.columnsType) {
      return null;
    } else if (this.columnsType.type === "enum") {
      return this.columnsType.values.map(name => ({
        title: name,
        key: name,
        column: {
          group: name,
        },
        cards: this.groupedCards[name] ?? [],
      }));
    } else if (this.columnsType.type === "reference") {
      return this.columnsType.columns.map(col => ({
        title: col.name,
        key: col.id,
        column: {
          group: col.id,
        },
        cards: this.groupedCards[col.id] ?? [],
      }));
    } else {
      throw new Error("Impossible");
    }
  }

  get errors() {
    const messagesArray = [
      !this.columnsType && this.$t("no_columns"),
      this.groupIndex === null && this.$t("no_group"),
    ].filter(R.identity);

    const hasErrors = messagesArray.length > 0;

    const errorMessage = this.$t("view_error");
    const errorString = `${errorMessage}: ${messagesArray.join("; ")}.`;
    return hasErrors ? errorString : null;
  }

  createCard(column: IGroupColumn, columnIndex: number) {
    const modalQuery: IQuery = {
      args: {
        ...this.createView!.args,
      },
      defaultValues: {
        ...this.createView!.defaultValues,
        [this.uv.info.columns[this.groupIndex!].name]: column.group,
      },
      search: "",
    };

    if (this.orderIndex !== null) {
      const cards = this.columns![columnIndex].cards;
      modalQuery.defaultValues[this.uv.info.columns[this.orderIndex].name] = cards.length > 0 ? cards[cards.length - 1].card.order! + 1 : 0;
    }

    void this.addWindow(modalQuery);
  }

  private async moveCard(columnIndex: number, card: IRowCard, newIndex: number) {
    if (this.orderIndex === null) {
      return;
    }

    const cards = this.columns![columnIndex].cards;
    let order: number;
    if (cards.length === 0) {
      order = 0;
    } else if (newIndex === 0) {
      order = cards[0].card.order! - 1;
    } else if (newIndex >= cards.length) {
      order = cards[cards.length - 1].card.order! + 1;
    } else {
      const prevCard = cards[newIndex - 1];
      const nextCard = cards[newIndex];
      order = (prevCard.card.order! + nextCard.card.order!) / 2;
    }

    const ref = {
      ...card.ref,
      column: this.orderIndex,
    };
    await this.updateValue(ref, order);
  }

  changeOrder(column: IGroupColumn, columnIndex: number, card: IRowCard, oldIndex: number, newIndex: number) {
    void this.moveCard(columnIndex, card, newIndex > oldIndex ? newIndex + 1 : newIndex);
  }

  changeGroup(newColumn: IGroupColumn, newColumnIndex: number, card: IRowCard, newIndex: number) {
    const ref = {
      ...card.ref,
      column: this.groupIndex!,
    };
    void this.moveCard(newColumnIndex, card, newIndex);
    void this.updateValue(ref, newColumn.group);
  }

  private makeCard(row: IRowCommon, rowRef: RowRef): ICard<IRowCard> {
    const viewAttrs = this.uv.attributes;
    const rowAttrs = row.attributes;
    const getRowAttr = (name: string) => tryDicts(name, rowAttrs, viewAttrs);

    let link: Link | null = null;

    const columns = mapMaybe((value, colI): CardColumn | undefined => {
      const info = this.uv.info.columns[colI];
      const columnAttrs = this.uv.columnAttributes[colI];
      const cellAttrs = value.attributes;
      const getCellAttr = (name: string) => tryDicts(name, cellAttrs, rowAttrs, columnAttrs, viewAttrs);

      const rowLink = attrToLinkSelf(getCellAttr("row_link"), value.info);
      if (rowLink !== null) {
        link = rowLink;
      }

      const visible = getCellAttr("visible") ?? (colI !== this.orderIndex && colI !== this.groupIndex);
      if (!visible) {
        return undefined;
      }

      const punnedValue = valueToPunnedText(info.valueType, value);
      const icon = getCellAttr("icon");
      return {
        type: "text",
        value: punnedValue,
        valueHtml: replaceHtmlLinks(punnedValue),
        size: 12,
        icon: icon ? String(icon) : null,
      };
    }, row.values);

    const group = currentValue(row.values[this.groupIndex!]);
    const order = this.orderIndex !== null ? Number(currentValue(row.values[this.orderIndex])) : null;
    const color = getRowAttr("card_color");

    const rowCard: IRowCard = {
      group,
      order,
      link,
      ref: rowRef,
      rows: columns.map(col => [col]),
    };

    return {
      key: rowKey(rowRef),
      card: rowCard,
      backgroundColor: valueIsNull(color) ? undefined : String(color),
    };
  }
}
</script>

<style scoped>
  .view_kanban {
    height: 100%;
  }
</style>
