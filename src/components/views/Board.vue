<template>
    <div fluid class="view_kanban">
        <Board :columns="boardData"
            :titles="boardTitles"
            :add="this.changeGroup"
            :move="this.changeOrder" />
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

interface ICardExtra {
    groupRef: IExistingValueRef;
    orderRef: IExistingValueRef;
}

type IColumnTitleMap = Record<any, { label: string, field: string }>;

@UserView({
    localConstructor: LocalEmptyUserView,
})
@Component({ components: { Board } })
export default class UserViewBoard extends mixins<BaseUserView<LocalEmptyUserView, null, null, null>, BaseEntriesView>(BaseUserView, BaseEntriesView) {

    @Prop() uv!: CombinedUserView;

    boardData: IColumn[] = [];
    selectedCards: any[] = [];
    columnTitles: IColumnTitleMap = {};

    private mounted() {
        const rows = this.uv.rows;
        if (rows) {
            this.makeBoardData(rows);
        }
    }

    @Watch("uv")
    private watchUv(newUv: CombinedUserView) {
        if (R.equals(this.uv, newUv)) {
            if (newUv.rows) {
                this.makeBoardData(newUv.rows);
            }
        }
    }

    get entriesEntity() {
        const groupIndex = this.uv.columnAttributes.findIndex(attributes => attributes["BoardGroup"] === true);
        const fieldTypePath = ["info", "columns", groupIndex, "mainField", "field", "fieldType"];
        const fieldType = R.path<IReferenceFieldType>(fieldTypePath, this.uv);
        if (fieldType && fieldType.type === "reference") {
           return { entity: fieldType.entity, where: null };
        }
        return null;
    }

    private get boardTitles() {
        const groupIndex = this.uv.columnAttributes.findIndex(attributes => attributes["BoardGroup"] === true);
        const fieldTypePath = ["info", "columns", groupIndex, "mainField", "field", "fieldType"];
        const fieldType = R.path<IReferenceFieldType>(fieldTypePath, this.uv);
        if (fieldType && fieldType.type === "reference") {
            return this.currentEntries;
        }
        const columns = this.uv.attributes.Board.Columns;
        return columns.reduce((acc: { [key: string]: string }, column: string) => ({ ...acc, [column]: column }), {});
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
            const fieldType = R.pathOr<ValueType>({ type: "string" }, ["info", "field", "fieldType"], value);
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
        const orderValue = row.values[orderIndex];
        const groupType = R.pathOr<ValueType>({ type: "string" }, ["info", "field", "fieldType"], groupValue);
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

        const punnedValue = valueToPunnedText(groupType, groupValue);
        const { value: order } = orderValue || {};
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

    private getColumnTitles(cards: ICard[]): IColumnTitleMap {
        const onlyGroup = cards.map(card => ({
            value: card.groupValue,
            label: card.groupLabel,
            field: card.groupField,
        }));
        return onlyGroup.reduce(
            (acc, element) => ({ ...acc, [element.value]: element }), {},
        );
    }

    private getColumnTitle(id: number, defaultTitle = "NO TITLE"): string {
       const boardColumn: string = R.pathOr(defaultTitle, [id, "label"], this.columnTitles[id]);
       const entryColumn: string | null = this.currentEntries
           ? R.pathOr(null, [id], this.currentEntries)
           : null;

       return entryColumn || boardColumn;
    }

    private makeBoardData(rows: ICombinedRow[]) {
        console.log(this.uv);
        const cards = rows.map(this.makeCardObject);
        const createView = attrToQuery(
            this.uv.attributes.CreateView,
            { infoByDefault: true },
        ) || undefined;
        const columns = this.uv.attributes.Board.Columns.map((i: any) => String(i));
        const columnTitles = this.getColumnTitles(cards);
        const groupedColumns = R.groupBy(card => String(R.path(["groupValue"], card)),
            cards,
        );
        const filteredColumns = columns
            .reduce((acc: object, columTitle: string) => {
                const column: IColumn[] = R.pathOr([], [columTitle], groupedColumns);
                return { ...acc, [columTitle]: column };
            }, {});
        const allColumns: IColumn[] = Object.keys(filteredColumns)
            .map((column: any) => ({
                title: this.getColumnTitle(column),
                id: column,
                fieldName: R.pathOr("NO Title", [column, "field"], columnTitles),
                createView,
                cards: R.pathOr([], [column], groupedColumns),
            }));
        const orderedColumns: IColumn[] = R.sortBy(
            (column: IColumn) => columns.indexOf(column.id),
            allColumns,
        );
        this.boardData = orderedColumns;
        this.columnTitles = columnTitles;
    }

}
</script>

<style scoped>
.view_kanban {
    height: 100%;
}
</style>