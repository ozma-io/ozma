<template>
    <div class="column_container">
        <div class="column_header">
            <input type="checkbox" class="column_select_checkbox">
            {{title}}
            <span class="column_controls">
                <i class="material-icons card_open_icon">add</i>
                <i class="material-icons card_open_icon">more_vert</i>
            </span>
        </div>
        <draggable
            class="column_body"
            group="cards"
            ghost-class="card_dragging"
            @add="onAdd"
            :options="{delayOnTouchOnly: true, delay: 400}"
            :list="cards">
            <Card v-for="(card, index) in cards" :key="index" :data="card" />
        </draggable>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import draggable from "vuedraggable";

import Card, { ICard } from "@/components/kanban/Card.vue";
import { ValueRef } from "../../local_user_view";

export interface IColumn {
    title: string;
    cards: ICard[];
}

@Component({ components: { Card, draggable } })
export default class Column extends Vue {
    @Prop({ type: Array, required: true }) cards!: ICard[];
    @Prop({ type: String, required: true }) title!: string;
    @Prop({ type: Function, required: false }) add!: (ref: ValueRef, value: any) => void;

    private onAdd(event: any) {
        const newCard = this.cards[event.newIndex];
        if (this.add && newCard.groupRef) {
            this.add(newCard.groupRef, this.title);
        }
    }
}
</script>

<style scoped>
 .column_container {
     color: var(--MainTextColor);
     border: 1px solid var(--MainBorderColor);
     width: 300px;
     box-sizing: content-box;
     display: flex;
     flex-direction: column;
 }
 .column_header {
     border-bottom: 1px solid var(--MainBorderColor);
     padding: 10px;
 }
 .column_select_checkbox {
     vertical-align: middle;
 }
 .column_body {
     padding: 15px 10px 0 10px;
     overflow-y: auto;
     height: 100%;
 }
 .column_controls {
     float: right;
 }
 .column_controls > i {
     vertical-align: middle;
 }

 @media screen and (max-width: 700px) {
     .column_container {
         width: unset;
         min-width: 50vw;
     }
 }

 @media screen and (max-width: 490px) {
     .column_container {
         min-width: 80vw;
     }
 }
 .card_dragging {
     background-color: var(--MainBorderColor);
     width: 100%;
     height: 15px;
 }

 /deep/ .card_dragging > .card_row {
     display: none;
 }
</style>
