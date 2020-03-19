<template>
    <div class="card_container" :style="cardStyle">
        <b-row v-for="(row, rowIndex) in data.rows" :key="rowIndex" class="card_row">
            <b-col v-for="(col, colIndex) in row" :key="colIndex" :cols="col.size" class="card_col">
                <template v-if="rowIndex === 0 && colIndex === 0">
                    <!-- input type="checkbox" class="card_select_checkbox" :selected="selected" -->
                    <template v-if="data.cardView">
                        <i class="material-icons card_open_icon"
                            @click="openModal">flip_to_front</i>
                        <ModalUserView v-if="modalView !== null"
                            :initialView="modalView"
                            @close="modalView = null" />
                    </template>
                </template>
                <span v-if="col.type === 'text'" class="card_text" :title="col.value">
                    {{col.value}}
                </span>
                <span v-if="col.type === 'datetime'" class="card_text" :title="col.value">
                    {{formatDateTime(col.value)}}
                </span>
                <span v-if="col.type === 'datetime'" class="card_text" :title="col.value">
                    {{formatDate(col.value)}}
                </span>
                <div v-if="col.type === 'image'" class="card_avatar"
                    :style="{ backgroundImage: `url('${col.value}')` }" />
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Vue, Component, Prop } from "vue-property-decorator";
import { IExistingValueRef, ValueRef } from "../../local_user_view";
import { IFieldRef } from "../../api";
import { IQuery } from "../../state/query";

import ModalUserView from "@/components/ModalUserView.vue";
import { Moment } from "moment";
import { dateTimeFormat, dateFormat } from "../../values";

export type CardColType = "text" | "date" | "datetime" | "image";

export interface ICardCol {
    fieldName?: string;
    fieldRef?: IFieldRef;
    type: CardColType;
    value: any;
    size: number;
}

export type ICardRow = ICardCol[];
export interface ICard {
    groupRef?: IExistingValueRef;
    groupLabel?: any;
    groupValue?: any;
    groupField?: string;
    cardView?: IQuery | null;
    orderRef?: ValueRef;
    order?: number;
    rows: ICardRow[];
    style?: {
        color?: string;
    };
}

@Component({ components: { ModalUserView }})
class Card extends Vue {
    @Prop({ type: Object, required: true }) data!: ICard;
    @Prop({ type: Boolean, required: false, default: false }) selected!: boolean;

    modalView: IQuery | null = null;

    private openModal() {
        if (this.data.cardView) {
            this.modalView = this.data.cardView;
        }
    }

    private get cardStyle() {
        const color = R.path(["style", "color"], this.data);
        return {
            backgroundColor: color,
        };
    }

    private formatDate(date: Moment) {
        if (date) {
            return date.local().format(dateFormat);
        }
        return "";
    }

    private formatDateTime(date: Moment) {
        if (date) {
            return date.local().format(dateTimeFormat);
        }
        return "";
    }
}

export default Card;
</script>

<style scoped>
 .card_container {
     cursor: grab;
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
