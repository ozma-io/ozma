<template>
    <!-- <draggable tag="v-layout" v-model="columns" group="column"> -->
        <div class="board_container">
            <Column v-for="(column, columnIndex) in columns"
                :key="columnIndex"
                :title="column.title"
                :id="column.id"
                :fieldName="column.fieldName"
                :createView="column.createView"
                :cards="column.cards"
                :add="add" />
        </div>
    <!-- </draggable> -->
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import draggable from "vuedraggable";

import { ICard } from "@/components/kanban/Card.vue";
import Column, { IColumn } from "@/components/kanban/Column.vue";
import { ValueRef } from "../../local_user_view";

@Component({ components: { Column, draggable } })
export default class Board extends Vue {
    @Prop({ type: Array, required: true }) columns!: IColumn[];
    @Prop({ type: Function, required: false }) add!: (ref: ValueRef, value: any) => void;
}
</script>

<style scoped lang="css">
 .board_container {
     width: 100%;
     height: 100%;
     overflow-x: auto;
     display: flex;
     flex-direction: row;
     max-height: calc(100vh - 56px);
 }

 /deep/ .column_container {
     border-left: 0px;
     border-top: 0px;
     border-bottom: 0px;
 }
 
 /deep/ .column_container:last-of-type {
     border-right: 0px;
 }
</style>
