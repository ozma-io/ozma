<i18n>
    {
        "en": {
            "view_error": "There are following errors in your view",
            "no_title": "No title",
            "no_board": "This query is lacking Board attribute",
            "no_columns": "This query is lacking Columns property of Board attribute",
            "no_group": "This query is lacking BoardGroup attribute on the grouping field"
        },
        "ru": {
            "view_error": "В вашем представлении следующие ошибки",
            "no_title": "Без заголовка",
            "no_board": "В запросе отсутствет аттрибут Board",
            "no_columns": "В запросе отсутствует параметр Columns у аттрибута Board",
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
      v-if="!errors"
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
import { Value } from "Misc/JSON/_api";
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
    const groupIndex = this.uv.columnAttributes.findIndex(attributes => attributes["BoardGroup"] === true);
    const fieldTypePath = ["info", "columns", groupIndex, "mainField", "field", "fieldType"];
    const fieldType = R.path<IReferenceFieldType>(fieldTypePath, this.uv);
    if (fieldType && fieldType.type === "reference") {
      return { entity: fieldType.entity, where: null };
    }
    return null;
  }

  private get columns() {
    const rows = this.uv.rows || [];
    const cards = rows.map((x, i) => this.makeCardObject(x, i));
    const groupIndex = this.uv.columnAttributes.findIndex(attributes => attributes["BoardGroup"] === true);
    const fieldName = this.uv.info.columns[groupIndex].name;
    const createView = attrToQuery(
      this.uv.attributes.CreateView,
      { infoByDefault: true },
    ) || undefined;
    const columns = R.pathOr([], ["Board", "Columns"], this.uv.attributes)
      .map((i: any) => String(i));
    const groupedColumns = R.groupBy(card => String(R.path(["groupValue"], card)),
      cards,
    );
    const filteredColumns = columns
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
      (column: IColumn) => columns.indexOf(column.id),
      allColumns,
    );
  }

  private get errors() {
    const hasBoard = R.hasPath(["Board"], this.uv.attributes);
    const hasColumns = R.hasPath(["Board", "Columns"], this.uv.attributes);
    const hasGroup = this.uv.columnAttributes.findIndex(attributes => attributes["BoardGroup"] === true) !== -1;

    const messagesArray = [
      !hasBoard && this.$t("no_board"),
      !hasColumns && this.$t("no_columns"),
      !hasGroup && this.$t("no_group"),
    ].filter(R.identity);

    const hasErrors = messagesArray.length > 0;

    const errorMessage = this.$t("view_error");
    const errorString = `${errorMessage}: ${messagesArray.join("; ")}.`;
    return hasErrors ? errorString : null;
  }

  private get boardTitles(): IColumnTitleMap  {
    if (!(this.currentEntries instanceof Error) && this.currentEntries) {
      return this.currentEntries;
    }
    const columns = R.pathOr([], ["Board", "Columns"], this.uv.attributes);
    return columns.reduce((acc: { [key: string]: string }, column: string) => ({ ...acc, [column]: String(column) }), {});
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
        ["columnAttributes", index, "Visible"],
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
    const groupIndex = this.uv.columnAttributes.findIndex(attributes => attributes["BoardGroup"] === true);
    const orderIndex = this.uv.columnAttributes.findIndex(attributes => attributes["BoardOrder"] === true);
    const groupValue = row.values[groupIndex];
    const groupValueType = this.uv.info.columns[groupIndex].valueType;
    const cardColumns: ICardCol[] = this.getCardColumns(row.values);

    const groupRef: ValueRef = {
      type: "existing",
      position: rowIndex,
      column: groupIndex,
    };
    const orderRef: ValueRef | undefined = orderIndex > -1 ? {
      type: "existing",
      position: rowIndex,
      column: orderIndex,
    } : undefined;

    const punnedValue = valueToPunnedText(groupValueType, groupValue);
    // These two lines are necessary because user can omit BoardOrder attribute
    // To be replaced with a better ternary version later when we update TS
    // (should check if orderIndex > -1)
    const { value: order } = orderIndex === -1 ? { value: undefined } : row.values[orderIndex];
    const color = R.path<string>(["attributes", "CellColor"], groupValue);
    const groupField = R.path<string>(["info", "fieldRef", "name"], groupValue);

    const cardView = attrToQueryRef(this.uv.attributes.CreateView, row.mainId);

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
