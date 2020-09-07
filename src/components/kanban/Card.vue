<template>
  <div
    class="card_container"
    :style="cardStyle"
    @click="openModal"
  >
    <template v-if="data.cardView">
      <ModalUserView
        v-if="modalView !== null"
        :initial-view="modalView"
        @close="modalView = null"
      />
    </template>
    <b-row
      v-for="(row, rowIndex) in data.rows"
      :key="rowIndex"
      class="card_row"
    >
      <b-col
        v-for="(col, colIndex) in row"
        :key="colIndex"
        :cols="col.size"
        class="card_col"
      >
        <div
          v-if="col.type === 'image'"
          class="card_avatar"
          :style="{ backgroundImage: `url('${col.value}')` }"
        />
        <span
          v-else
          class="card_text"
          :title="col.value"
        >
          <span
            v-if="col.icon && col.value"
            class="card_icon"
          >
            {{ col.icon }}
          </span>
          {{ col.value }}
        </span>
      </b-col>
    </b-row>
  </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Vue, Component, Prop } from "vue-property-decorator";
import { IExistingValueRef, ValueRef } from "../../local_user_view";
import { IFieldRef } from "../../api";
import { IQuery, queryLocation } from "../../state/query";

import ModalUserView from "@/components/ModalUserView.vue";
import { Moment } from "moment";
import { dateTimeFormat, dateFormat } from "../../values";

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
  cardView?: IQuery | null;
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


@Component({ components: { ModalUserView }})
export class Card extends Vue {
  @Prop({ type: Object, required: true }) data!: ICard;
  @Prop({ type: Boolean, required: false, default: false }) selected!: boolean;
  @Prop({ type: Number, required: true }) width!: number;
  @Prop({ type: String, required: false, default: () => 'top' }) target!: CardTarget;

  modalView: IQuery | null = null;

  private openModal() {
    if (this.data.cardView) {
      if (this.target === 'top') {
        const url = queryLocation(this.data.cardView);
        this.$router.push(url);
      } else if (this.target === 'blank') {
        const url = this.$router.resolve(
          queryLocation(this.data.cardView),
        );
        window.open(url.href, '_blank');
      } else if (this.target === 'modal') {
        this.modalView = this.data.cardView;
      }
    }
  }

  private get cardStyle() {
    const color: string | undefined = R.path(["style", "color"], this.data);
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
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColor);
    padding: 10px;
    margin-bottom: 15px;
    user-select: none;
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
