<template>
  <!-- <a> tags have special behaviour on Safari which breaks animation, hence no-href. -->
  <div
    ref="cardContainer"
    data-no-dragscroll
    class="card_container"
    :style="cardStyle"
  >
    <FunLink
      :link="data.cardLink"
      no-href
      data-no-dragscroll
      @goto="$emit('goto', $event)"
    >
      <b-row
        v-for="(row, rowIndex) in data.rows"
        :key="rowIndex"
        data-no-dragscroll
        class="card_row"
      >
        <b-col
          v-for="(col, colIndex) in row"
          :key="colIndex"
          :cols="col.size"
          data-no-dragscroll
          class="card_col"
        >
          <div
            v-if="col.type === 'image'"
            data-no-dragscroll
            class="card_avatar"
            :style="{ backgroundImage: `url('${col.value}')` }"
          />
          <span
            v-else
            data-no-dragscroll
            class="card_text"
            :title="col.value"
          >
            <span
              v-if="col.icon && col.value"
              data-no-dragscroll
              class="card_icon"
            >
              {{ col.icon }}
            </span>
            {{ col.value }}
          </span>
        </b-col>
      </b-row>
    </FunLink>
  </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Vue, Component, Prop } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { Moment } from "moment";
import { dragscroll } from "vue-dragscroll";

import { IExistingValueRef, ValueRef } from "@/local_user_view";
import { IFieldRef } from "@/api";
import { IQuery, queryLocation } from "@/state/query";
import { dateTimeFormat, dateFormat } from "@/values";
import { Link } from "@/links";

export type CardColType = "text" | "image";
export type CardTarget = "modal" | "top" | "blank";
export const allowedTargets: CardTarget[] = ["modal", "top", "blank"];

export interface ICardCol {
  fieldName?: string;
  fieldRef?: IFieldRef;
  icon?: string;
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
  cardLink?: Link;
  orderRef?: ValueRef;
  order?: number;
  rows: ICardRow[];
  style?: {
    color?: string;
  };
}

interface ICardStyle {
  width?: string;
  backgrondColor?: string;
}

const query = namespace("query");

@Component({ directives: { dragscroll } })
export class Card extends Vue {
  @query.Action("addWindow") addWindow!: (query: IQuery) => Promise<void>;
  @Prop({ type: Object, required: true }) data!: ICard;
  @Prop({ type: Boolean, required: false, default: false }) selected!: boolean;
  @Prop({ type: Boolean, required: false, default: false }) dragging!: boolean;
  @Prop({ type: Number, required: true }) width!: number;

  private get cardStyle() {
    const color: string | undefined = R.pathOr("white", ["style", "color"], this.data);
    return {
      backgroundColor: color,
      width: `${this.width - 20}px`,
    };
  }
}

export default Card;
</script>

<style scoped>
  .card_container {
    cursor: grab;
    border: 1px solid var(--MainBorderColor);
    border-radius: 3px;
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColor);
    padding: 10px;
    margin-bottom: 15px;
    user-select: none;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  }

  .card_row {
    margin: 0 0 2px 0;
    line-height: 1.1;
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

    /*
    white-space: nowrap;
    */
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
