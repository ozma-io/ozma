<template>
    <div class="card_container">
        <b-row v-for="row, rowIndex in data" class="card_row">
            <b-col v-for="col, colIndex in row" :cols="col.size" class="card_col">
                <template v-if="rowIndex === 0 && colIndex === 0">
                    <input type="checkbox" class="card_select_checkbox">
                    <i class="material-icons card_open_icon">flip_to_front</i>
                </template>
                <span v-if="col.type === "text"">
                    {{col.value}}
                </span>
                <div v-if="col.type === "image""
                    class="card_avatar"
                    :style="{ backgroundImage: `url("${col.value}")` }" />
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

export interface ICardCol {
    type: "text" | "image";
    value: any;
    size: number;
}

export type ICardRow = ICardCol[];
export type ICard = ICardRow[];

@Component
class Card extends Vue {
    @Prop({ type: Array, required: true }) data!: ICard;

    private mounted() {
        console.log(this.data);
    }
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

 @media screen and (max-width: 700px) {
     .card_container {
         width: unset;
         max-width: 50vw;
     }
 }

 @media screen and (max-width: 490px) {
     .card_container {
         max-width: 80vw;
     }
 }
</style>
