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
      :columns="columns"
      :titles="boardTitles"
      :add="changeGroup"
      :move="changeOrder"
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
import BaseUserView from "@/components/BaseUserView";
import LocalEmptyUserView from "@/LocalEmptyUserView";
import { LocalUserView, IExistingValueRef, ValueRef } from "@/local_user_view";
import { CombinedUserView, IValueInfo, IUserViewValueRef, ICombinedValue, IRowCommon, ICombinedRow, valueToPunnedText } from "@/state/user_view";

import Board from "@/components/kanban/Board.vue";
import { ICard, ICardCol, ICardRow, CardColType } from "@/components/kanban/Card.vue";
import { IColumn } from "@/components/kanban/Column.vue";
import { IFieldRef, IReferenceFieldType, ValueType } from "../../api";
import { attrToQuery, attrToQueryRef } from "../../state/query";
import BaseEntriesView from "../BaseEntriesView";
import { IFieldInfo } from "../../values";

import Errorbox from "@/components/Errorbox.vue";

interface ICardExtra {
  groupRef: IExistingValueRef;
  orderRef: IExistingValueRef;
}

type IColumnTitleMap = Record<number, string>;

@UserView({
  localConstructor: LocalEmptyUserView,
})
@Component({ components: { Board, Errorbox } })
export default class UserViewBoard extends mixins<BaseUserView<LocalEmptyUserView, null, null, null>, BaseEntriesView>(BaseUserView, BaseEntriesView) {

  @Prop() uv!: CombinedUserView;
  selectedCards: any[] = [];

  get entriesEntity() {
    const fieldTypePath = ["info", "columns", this.groupIndex, "mainField", "field", "fieldType"];
    const fieldType = R.path<IReferenceFieldType>(fieldTypePath, this.uv);
    if (fieldType && fieldType.type === "reference") {
      return { entity: fieldType.entity };
    }
    return null;
  }

  get groupIndex() {
    return this.uv.columnAttributes.findIndex(attributes => attributes["board_group"] === true);
  }

  get orderIndex() {
    return this.uv.columnAttributes.findIndex(attributes => attributes["board_order"] === true);
  }

  get columnNames(): string[] | null {
    const oldRawColumns = R.path(["board", "columns"], this.uv.attributes) || R.path(["board", "Columns"], this.uv.attributes);
    if (oldRawColumns) {
      console.error("Using deprecated attribute `board.columns`. Use `board_columns` instead.")
    }
    const newRawColumns = this.uv.attributes["board_columns"];
    if (!newRawColumns && !oldRawColumns) {
      return null;
    }
    
    const rawColumns = newRawColumns || oldRawColumns;
    if (!(rawColumns instanceof Array)) {
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
    const createView = attrToQuery(
      this.uv.attributes["create_view"],
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
    const allColumns: IColumn[] = Object.keys(filteredColumns)
      .map((column: string) => ({
        id: column,
        title: R.pathOr(column, [column], this.boardTitles),
        fieldName,
        createView,
        cards: R.pathOr([], [column], groupedColumns),
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
      return isVisible ? {
        fieldName: R.path<string>(["name"], fieldRef),
        fieldRef,
        type: "text",
        value: punnedValue,
        size: 12,
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

    const cardView = attrToQueryRef(this.uv.attributes["create_view"], row.mainId);

    return {
      groupRef,
      groupLabel: punnedValue,
      groupValue: groupValue.value,
      groupField,
      orderRef,
      order,
      cardView,
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
