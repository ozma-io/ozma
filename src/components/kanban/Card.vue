<template>
    <div class="card_container">
        <b-row v-for="(row, rowIndex) in data.rows" :key="rowIndex" class="card_row">
            <b-col v-for="(col, colIndex) in row" :key="colIndex" :cols="col.size" class="card_col">
                <template v-if="rowIndex === 0 && colIndex === 0">
                    <input type="checkbox" class="card_select_checkbox">
                    <i class="material-icons card_open_icon">flip_to_front</i>
                </template>
                <span v-if="col.type === 'text'" class="card_text" :title="col.value">
                    {{col.value}}
                </span>
                <div v-if="col.type === 'image'" class="card_avatar"
                    :style="{ backgroundImage: `url('${col.value}')` }" />
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import { IExistingValueRef, ValueRef } from "../../local_user_view";
import { IFieldRef } from "../../api";

export interface ICardCol {
    fieldName?: string;
    fieldRef?: IFieldRef;
    type: "text" | "image";
    value: any;
    size: number;
}

export type ICardRow = ICardCol[];
export interface ICard {
    groupRef?: ValueRef;
    groupValue?: any;
    orderRef?: IFieldRef;
    rows: ICardRow[];
}

@Component
class Card extends Vue {
    @Prop({ type: Object, required: true }) data!: ICard;
}

export default Card;
</script>

<style scoped>
 .card_container {
     border: 1px solid var(--MainBorderColor);
     background-color: var(--MainBackgroundColor);
     color: var(--MainTextColor);
     max-width: 300px;
     padding: 10px;
     margin-bottom: 15px;
 }
 .card_row {
     margin: 0 0 10px 0;
 }
 .card_col {
     padding: 0;
 }
 .card_avatar {
     width: 100%;
     height: 45px;
     float: left;
     background-size: contain;
     background-repeat: no-repeat;
     background-position-x: right;
 }
 .card_open_icon {
     display: inline;
     margin-right: 5px;
     vertical-align: middle;
     cursor: pointer;
 }
 .card_select_checkbox {
     vertical-align: middle;
     margin-right: 5px;
 }

 .card_text {
     text-overflow: ellipsis;
     width: 100%;
     display: inline-block;
     white-space: nowrap;
     overflow: hidden;
 }

 @media screen and (max-width: 700px) {
     .card_container {
         width: unset;
         max-width: 50vw;
         user-select: none;
     }
 }

 @media screen and (max-width: 490px) {
     .card_container {
         max-width: 80vw;
     }
 }
</style>
