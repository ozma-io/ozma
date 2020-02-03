<template>
    <!-- <draggable tag="v-layout" v-model="columns" group="column"> -->
        <div class="board_container">
            <Column v-for="column in columns" :title="column.title" :cards="column.cards" />
        </div>
    <!-- </draggable> -->
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import draggable from "vuedraggable";

import { ICard } from "@/components/kanban/Card.vue";
import Column from "@/components/kanban/Column.vue";

export interface IColumn {
    title: string;
    cards: ICard[];
}

@Component({ components: { Column, draggable } })
export default class Board extends Vue {
    @Prop({ type: Array, required: true }) columns!: IColumn[];
}
</script>

<style scoped>
 .board_container {
     width: 100%;
     display: flex;
     flex-direction: row;
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
