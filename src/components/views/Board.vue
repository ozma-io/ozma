<template>
    <div fluid class="view_kanban">
        <Board :columns="boardData" :add="this.changeGroup" />
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
import { CombinedUserView, IValueInfo, IUserViewValueRef, ICombinedValue, IRowCommon, ICombinedRow } from "@/state/user_view";

import Board from "@/components/kanban/Board.vue";
import { ICard, ICardCol, ICardRow } from "@/components/kanban/Card.vue";
import { IColumn } from "@/components/kanban/Column.vue";
import { IFieldRef } from "../../api";
import { Value } from "Misc/JSON/_api";
import { attrToQuery, attrToQueryRef } from "../../state/query";

interface ICardExtra {
    groupRef: IExistingValueRef;
    orderRef: IExistingValueRef;
}

type IColumnTitleMap = Record<any, { label: string, field: string }>;

@UserView({
    localConstructor: LocalEmptyUserView,
})
@Component({ components: { Board } })
export default class UserViewBoard extends mixins<BaseUserView<LocalEmptyUserView, null, null, null>>(BaseUserView) {

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

    private changeGroup(groupRef: ValueRef, value: any) {
        this.updateValue(groupRef, value);
    }

    private getCardColumns(values: ICombinedValue[]): ICardCol[] {
        return mapMaybe<ICombinedValue, ICardCol>((value, index) => {
            const fieldRef = R.path<IFieldRef>(["info", "fieldRef"], value);
            const pun = value.pun;
            const trueValue = value.value;
            const isVisible = R.pathOr<boolean>(
                true,
                ["columnAttributes", index, "Visible"],
                this.uv,
            );
            return isVisible ? {
                fieldName: R.path<string>(["name"], fieldRef),
                fieldRef,
                type: "text",
                value: pun !== undefined ? pun : trueValue,
                size: 12,
            } : undefined;
        }, values);
    }

    private makeCardObject(row: ICombinedRow, rowIndex: number): ICard {
        const groupIndex = this.uv.columnAttributes.findIndex(attributes => attributes["BoardGroup"] === true);
        const groupValue = row.values[groupIndex];
        const cardColumns: ICardCol[] = this.getCardColumns(row.values);

        const groupRef: ValueRef = {
            type: "existing",
            position: rowIndex,
            column: groupIndex,
        };

        const pun = R.path<any>(["pun"], groupValue);
        const value = R.path<any>(["value"], groupValue);
        const color = R.path<string>(["attributes", "CellColor"], groupValue);
        const groupField = R.path<string>(["info", "fieldRef", "name"], groupValue);

        const cardView = attrToQueryRef(this.uv.attributes.CreateView, row.mainId);

        return {
            groupRef,
            groupLabel: pun !== undefined ? pun : value,
            groupValue: value,
            groupField,
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
            (acc, element) => ({ ...acc, [element.value]: element }), {}
        );
    }

    private makeBoardData(rows: ICombinedRow[]) {
        const cards = rows.map(this.makeCardObject);
        const createView = attrToQuery(
            this.uv.attributes.CreateView,
            { infoByDefault: true },
        ) || undefined;
        const columns = this.uv.attributes.Board.columns;
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
            .map((column: string) => ({
                title: columnTitles[column].label,
                id: column,
                fieldName: columnTitles[column].field,
                createView,
                cards: R.pathOr([], [column], groupedColumns),
            }));
        const orderedColumns: IColumn[] = R.sortBy(
            (column: IColumn) => columns.indexOf(column.title),
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