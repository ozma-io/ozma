<i18n>
    {
        "en": {
            "view_error": "There are following errors in your view",
            "no_title": "No title",
            "no_columns": "This query is lacking Columns property of Board attribute",
            "no_rows": "Board view doesn't support creation mode",
            "no_group": "This query is lacking BoardGroup attribute on the grouping field"
        },
        "ru": {
            "view_error": "В вашем представлении следующие ошибки",
            "no_title": "Без заголовка",
            "no_columns": "В запросе отсутствует параметр Columns у аттрибута Board",
            "no_rows": "Доска не поддерживает режим создания",
            "no_group": "В запросе отсутствует аттрибут BoardGroup на поле по которому идёт группировка"
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
      :column-width="columnWidth"
      :column-header-color="columnHeaderColor"
      :background-color="backgroundColor"
      :columns="columns"
      :titles="boardTitles"
      :add="changeGroup"
      :move="changeOrder"
      :card-target="cardTarget"
      @goto="$emit('goto', $event)"
    />
  </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component } from "vue-property-decorator";
import { mixins } from "vue-class-component";

import { mapMaybe, tryDicts } from "@/utils";
import { valueIsNull } from "@/values";
import { UserView } from "@/components";
import BaseUserView, { EmptyBaseUserView } from "@/components/BaseUserView";
import Board from "@/components/kanban/Board.vue";
import { ICard, ICardCol, isCardTarget } from "@/components/kanban/Card.vue";
import { IColumn } from "@/components/kanban/Column.vue";
import Errorbox from "@/components/Errorbox.vue";
import { attrToLinkSelf, Link } from "@/links";
import { currentValue, ICombinedRow, ICombinedValue, IExistingValueRef, ValueRef, valueToPunnedText } from "@/user_views/combined";
import { referenceEntriesRef } from "@/state/entries";
import BaseEntriesView from "@/components/BaseEntriesView";
import { attrToQuery } from "@/state/query";

interface ICardExtra {
  groupRef: IExistingValueRef;
  orderRef: IExistingValueRef;
}

type IColumnTitleMap = Record<string, string>;

@UserView()
@Component({ components: { Board, Errorbox } })
export default class UserViewBoard extends mixins<EmptyBaseUserView, BaseEntriesView>(BaseUserView, BaseEntriesView) {
  selectedCards: unknown[] = [];

  get entriesEntity() {
    const fieldType = this.uv.info.columns[this.groupIndex].mainField?.field.fieldType;
    if (fieldType && fieldType.type === "reference") {
      return referenceEntriesRef(fieldType);
    }
    return null;
  }

  get cardTarget(): string | undefined {
    const cardTarget = this.uv.attributes["card_target"];
    if (
      typeof cardTarget === "string"
        && isCardTarget(cardTarget)) {
      return cardTarget;
    }
    return undefined;
  }

  get columnWidth(): number | undefined {
    const width = Number(this.uv.attributes.board_column_width);
    if (!isNaN(width)) {
      return width;
    }
    return undefined;
  }

  // Attribute
  // EXAMPLE @"header_color" = '#fff0f5'
  // Column header background color.
  get columnHeaderColor(): string {
    return "header_color" in this.uv.attributes ? String(this.uv.attributes.header_color) : "none";
  }

  get backgroundColor(): string {
    return "background_color" in this.uv.attributes ? String(this.uv.attributes.background_color) : "none";
  }

  get groupIndex() {
    return this.uv.columnAttributes.findIndex(attributes => attributes["board_group"] === true);
  }

  get orderIndex() {
    return this.uv.columnAttributes.findIndex(attributes => attributes["board_order"] === true);
  }

  get columnNames(): string[] | null {
    const rawColumns = this.uv.attributes["board_columns"];
    if (!rawColumns || !(rawColumns instanceof Array)) {
      return null;
    }

    return rawColumns.map(i => String(i));
  }

  private get columns(): IColumn[] | null {
    if (!this.uv.rows || !this.columnNames) {
      return null;
    }
    // FIXME: this should also map new rows! Use `mapVisibleRows`; maybe we need to add a variant which passes `RowRef`s.
    const cards = this.uv.rows.map((x, i) => this.makeCardObject(x, i));
    const fieldName = this.uv.info.columns[this.groupIndex].name;
    const orderFieldName = this.orderIndex > 0 ? this.uv.info.columns[this.orderIndex].name : "";
    const createView = attrToQuery(
      this.uv.attributes["card_create_view"],
      { infoByDefault: true },
    ) || undefined;
    const groupedColumns = R.groupBy(card => String(card.groupValue), cards);

    const sortByOrder = R.sortBy(R.prop("order"));

    const allColumns: IColumn[] = this.columnNames
      .map((column: string) => ({
        id: column,
        title: this.boardTitles[column] ?? column,
        fieldName,
        orderFieldName,
        createView,
        cards: this.orderIndex > 0 ? sortByOrder(groupedColumns[column] ?? []) : (groupedColumns[column] ?? []),
      }));

    return R.sortBy(
      (column: IColumn) => this.columnNames!.indexOf(column.id),
      allColumns,
    );
  }

  private get errors() {
    const messagesArray = [
      !this.columnNames && this.$t("no_columns"),
      (this.groupIndex === -1) && this.$t("no_group"),
      !this.columns && this.$t("no_rows"),
    ].filter(R.identity);

    const hasErrors = messagesArray.length > 0;

    const errorMessage = this.$t("view_error");
    const errorString = `${errorMessage}: ${messagesArray.join("; ")}.`;
    return hasErrors ? errorString : null;
  }

  private get boardTitles(): IColumnTitleMap {
    if (!(this.currentEntries instanceof Error) && this.currentEntries) {
      return this.currentEntries;
    }
    return Object.fromEntries(this.columnNames!.map((column: string) => [column, String(column)]));
  }

  private changeOrder(orderRef: ValueRef, value: number) {
    void this.updateValue(orderRef, value);
  }

  private changeGroup(groupRef: ValueRef, value: any, orderRef: ValueRef, orderValue: number) {
    void this.updateValue(groupRef, value);
  }

  private getCardColumns(values: ICombinedValue[]): ICardCol[] {
    return mapMaybe<ICombinedValue, ICardCol>((value, index) => {
      const fieldRef = value.info?.fieldRef;
      const fieldType = this.uv.info.columns[index].valueType;
      const punnedValue = valueToPunnedText(fieldType, value);
      const isVisible = Boolean(this.uv.columnAttributes[index]?.["visible"] ?? true);
      const icon = this.uv.columnAttributes[index]?.["icon"];
      return isVisible ? {
        fieldName: fieldRef?.name,
        fieldRef,
        type: "text",
        value: punnedValue,
        size: 12,
        icon: icon !== undefined ? String(icon) : undefined,
      } : undefined;
    }, values);
  }

  private makeCardObject(row: ICombinedRow, rowIndex: number): ICard {
    const groupValue = row.values[this.groupIndex];
    const groupValueType = this.uv.info.columns[this.groupIndex].valueType;
    const cardColumns: ICardCol[] = this.getCardColumns(row.values);

    const groupRef: ValueRef = {
      type: "existing",
      position: rowIndex,
      column: this.groupIndex,
    };
    const orderRef: ValueRef | undefined = this.orderIndex > -1 ? {
      type: "existing",
      position: rowIndex,
      column: this.orderIndex,
    } : undefined;

    const punnedValue = valueToPunnedText(groupValueType, groupValue);
    // These two lines are necessary because user can omit BoardOrder attribute
    // To be replaced with a better ternary version later when we update TS
    // (should check if orderIndex > -1)
    let order: number | undefined;
    if (this.orderIndex !== -1) {
      order = Number(currentValue(row.values[this.orderIndex]));
    }
    const color = groupValue.attributes?.["cell_color"];
    const groupField = groupValue.info?.fieldRef.name;

    let cardLink: Link | undefined;
    row.values.forEach((value, colI) => {
      const columnAttrs = this.uv.columnAttributes[colI];
      const getCellAttr = (name: string) => tryDicts(name, value.attributes, row.attributes, columnAttrs, this.uv.attributes);
      const rowLink = attrToLinkSelf(getCellAttr("row_link"), value.info);
      if (rowLink !== null) {
        cardLink = rowLink;
      }
    });

    return {
      groupRef,
      groupLabel: punnedValue,
      groupValue: groupValue.value,
      groupField,
      orderRef,
      order,
      cardLink,
      rows: cardColumns.map(col => [col]),
      style: {
        color: valueIsNull(color) ? undefined : String(color),
      },
    };
  }
}
</script>

<style scoped>
  .view_kanban {
    height: 100%;
  }
</style>
