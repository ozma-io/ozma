<template>
    <div fluid class="view_kanban">
        <Board :columns="boardData" :add="this.changeGroup" />
    </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { mixins } from "vue-class-component";

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

interface ICardExtra {
    groupRef: IExistingValueRef;
    orderRef: IExistingValueRef;
}

@UserView({
    localConstructor: LocalEmptyUserView,
})
@Component({ components: { Board } })
export default class UserViewBoard extends mixins<BaseUserView<LocalEmptyUserView, null, null, null>>(BaseUserView) {

    @Prop() uv!: CombinedUserView;

    boardData: IColumn[] = [];

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
        console.log(groupRef, value);
        this.updateValue(groupRef, value);
    }

    private makeCardObject(row: ICombinedRow, rowIndex: number): ICard {
        const groupByField = this.uv.attributes.Board.groupBy;
        const cardColumns: ICardCol[] = row.values.map(value => {
            const fieldRef = R.path<IFieldRef>(["info", "fieldRef"], value);
            return {
                fieldName: R.path<string>(["name"], fieldRef),
                fieldRef,
                type: "text",
                value: value.value,
                size: 12,
            };
        });
        const groupIndex = row.values.findIndex(value => {
            const fieldName = R.path<string>(["info", "fieldRef", "name"], value);
            return fieldName === groupByField;
        });
        const groupValue = row.values.find(value => {
            const fieldName = R.path<string>(["info", "fieldRef", "name"], value);
            return fieldName === groupByField;
        });

        const groupRef: ValueRef = {
            type: "existing",
            position: rowIndex,
            column: groupIndex,
        };

        return {
            groupRef,
            groupValue: R.pathOr<any>(null, ["value"], groupValue),
            rows: cardColumns.map(col => [col]),
        };
    }

    private makeBoardData(rows: ICombinedRow[]) {
        const cards = rows.map(this.makeCardObject);
        const columns = this.uv.attributes.Board.columns;
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
                title: column,
                cards: R.pathOr([], [column], groupedColumns),
            }));
        const orderedColumns: IColumn[] = R.sortBy(
            (column: IColumn) => columns.indexOf(column.title),
            allColumns,
        );
        console.log(orderedColumns);
        this.boardData = orderedColumns;
    }

}
</script>

<style scoped>
.view_kanban {
    height: 100%;
}
</style>