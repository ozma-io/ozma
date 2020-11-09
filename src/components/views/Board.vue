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
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { Value } from "Misc/JSON/_api";

import { mapMaybe } from "@/utils";
import { UserView } from "@/components";
import BaseUserView, { EmptyBaseUserView } from "@/components/BaseUserView";
import LocalEmptyUserView from "@/LocalEmptyUserView";
import { LocalUserView, IExistingValueRef, ValueRef } from "@/local_user_view";
import { CombinedUserView, IValueInfo, IUserViewValueRef, ICombinedValue, IRowCommon, ICombinedRow, valueToPunnedText, referenceEntriesRef } from "@/state/user_view";

import Board from "@/components/kanban/Board.vue";
import { ICard, ICardCol, ICardRow, CardColType, allowedTargets } from "@/components/kanban/Card.vue";
import { IColumn } from "@/components/kanban/Column.vue";
import { IFieldRef, IReferenceFieldType, ValueType, IEntityRef } from "../../api";
import { attrToQuery, attrToQueryRef } from "../../state/query";
import BaseEntriesView from "../BaseEntriesView";
import { IFieldInfo } from "../../values";

import Errorbox from "@/components/Errorbox.vue";
import { FieldType } from "ozma-api/src";
import { attrToLinkRef, attrToLinkSelf } from "@/links";

interface ICardExtra {
  groupRef: IExistingValueRef;
  orderRef: IExistingValueRef;
}

type IColumnTitleMap = Record<number, string>;

@UserView({
  localConstructor: LocalEmptyUserView,
})
@Component({ components: { Board, Errorbox } })
export default class UserViewBoard extends mixins<EmptyBaseUserView, BaseEntriesView>(BaseUserView, BaseEntriesView) {

  @Prop() uv!: CombinedUserView;
  selectedCards: any[] = [];

  get entriesEntity() {
    const fieldType = this.uv.info.columns[this.groupIndex].mainField?.field.fieldType;
    if (fieldType && fieldType.type === "reference") {
      return referenceEntriesRef(fieldType);
    }
    return null;
  }

  get cardTarget(): string | undefined {
    const cardTarget = this.uv.attributes.card_target;
    if (
      typeof cardTarget === 'string'
      || cardTarget instanceof String
      || allowedTargets.indexOf(cardTarget) !== -1) {
      return cardTarget
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

    return rawColumns.map((i: any) => String(i));
  }

  private get columns(): IColumn[] | null {
    if (!this.uv.rows || !this.columnNames) {
      return null;
    }
    const cards = this.uv.rows.map((x, i) => this.makeCardObject(x, i));
    const fieldName = this.uv.info.columns[this.groupIndex].name;
    const orderFieldName = this.orderIndex > 0 ? this.uv.info.columns[this.orderIndex].name : "";
    const getDeprecatedAttr = (name: string, oldName: string) => {
      const ret = this.uv.attributes[name];
      if (ret !== undefined) {
        return ret;
      }
      const oldRet = this.uv.attributes[oldName];
      if (oldRet !== undefined) {
        console.warn(`Old-style link attribute detected: "${oldName}"`);
        return oldRet;
      }
    };
    const createView = attrToQuery(
      getDeprecatedAttr("card_create_view", "create_view"),
      { infoByDefault: true },
    ) || undefined;
    const groupedColumns = R.groupBy(card => String(R.path(["groupValue"], card)),
      cards,
    );
    const filteredColumns = this.columnNames
      .reduce((acc: object, columTitle: string) => {
        const column: IColumn[] = R.pathOr([], [columTitle], groupedColumns);
        return { ...acc, [columTitle]: column };
      }, {});

    const sortByOrder = R.sortBy(R.prop("order"));

    const allColumns: IColumn[] = Object.keys(filteredColumns)
      .map((column: string) => ({
        id: column,
        title: R.pathOr(column, [column], this.boardTitles),
        fieldName,
        orderFieldName,
        createView,
        cards: this.orderIndex > 0 ? sortByOrder(R.pathOr([], [column], groupedColumns)) : R.pathOr([], [column], groupedColumns),
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
    return this.columnNames!.reduce((acc: { [key: string]: string }, column: string) => ({ ...acc, [column]: String(column) }), {});
  }

  private changeOrder(orderRef: ValueRef, value: number) {
    this.updateValue(orderRef, value);
  }

  private changeGroup(groupRef: ValueRef, value: any, orderRef: ValueRef, orderValue: number) {
    this.updateValue(groupRef, value);
  }

  private getCardColumns(values: ICombinedValue[]): ICardCol[] {
    return mapMaybe<ICombinedValue, ICardCol>((value, index) => {
      const fieldRef = R.path<IFieldRef>(["info", "fieldRef"], value);
      const fieldType = this.uv.info.columns[index].valueType;
      const punnedValue = valueToPunnedText(fieldType, value);
      const isVisible = R.pathOr<boolean>(
        true,
        ["columnAttributes", index, "visible"],
        this.uv,
      );
      const icon = R.path<string>(
        ["columnAttributes", index, "icon"],
        this.uv,
      );
      return isVisible ? {
        fieldName: R.path<string>(["name"], fieldRef),
        fieldRef,
        type: "text",
        value: punnedValue,
        size: 12,
        icon,
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
    const { value: order } = this.orderIndex === -1 ? { value: undefined } : row.values[this.orderIndex];
    const color = R.path<string>(["attributes", "cell_color"], groupValue);
    const groupField = R.path<string>(["info", "fieldRef", "name"], groupValue);

    const cardLink = attrToLinkSelf(this.uv.attributes["create_view"], groupValue.info) || undefined;
    
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
        color,
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
