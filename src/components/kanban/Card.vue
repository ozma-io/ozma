<template>
  <!-- <a> tags have special behaviour on Safari which breaks animation, hence no-href. -->
  <div
    ref="cardContainer"
    class="card_container"
    data-no-dragscroll
  >
    <!-- FIXME: either move this to a slot (because this is not a generic kanban anymore),
         or bite the bullet and move kanban to `views/board`. -->
    <!-- Ternary in `:link` for fix Firefox issue, see: https://github.com/SortableJS/Sortable/issues/1184 -->
    <FunLink
      :class="['card_link', { 'dragging': dragging }]"
      :style="cardStyle"
      :link="dragging ? null : data.cardLink"
      no-href
      data-no-dragscroll
      @goto="$emit('goto', $event)"
    >
      <b-row
        v-for="(row, rowIndex) in dataHtml.rows"
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
            <!-- eslint-disable vue/no-v-html -->
            <!-- TODO: unable to click on string with link, but not on link -->
            <span
              v-if="col.valueHtml !== col.value"
              @click.stop
              v-html="col.valueHtml"
            />
            <span v-else> {{ col.value }} </span>
            <!-- eslint-enable vue/no-v-html -->
          </span>
        </b-col>
      </b-row>
    </FunLink>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { dragscroll } from "vue-dragscroll";
import { IFieldRef } from "ozma-api";

import { IQuery } from "@/state/query";
import { Link } from "@/links";
import { replaceHtmlLinks } from "@/utils";
import { IExistingValueRef, ValueRef } from "@/user_views/combined";

export type CardColType = "text" | "image";
export type CardTarget = "modal" | "top" | "blank";

export const isCardTarget = (name: string): name is CardTarget => {
  return ["modal", "top", "blank"].includes(name);
};

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

interface ICardColHtml extends ICardCol {
  valueHtml: string;
}
type ICardRowHtml = ICardColHtml[];
interface ICardHtml extends Omit<ICard, "rows"> {
  rows: ICardRowHtml[];
}

interface ICardStyle {
  backgrondColor?: string;
}

const query = namespace("query");

@Component({ directives: { dragscroll } })
export class Card extends Vue {
  // FIXME: Again, specific to our usage of kanban. Can we move this logic to a slot?
  @query.Action("addWindow") addWindow!: (queryObj: IQuery) => Promise<void>;
  @Prop({ type: Object, required: true }) data!: ICard;
  @Prop({ type: Boolean, required: false, default: false }) selected!: boolean;
  @Prop({ type: Boolean, required: false, default: false }) dragging!: boolean;

  private get dataHtml(): ICardHtml {
    return {
      ...this.data,
      rows: this.data.rows.map(row => row.map(col =>
        ({ ...col, valueHtml: col.type === "text" ? replaceHtmlLinks(col.value) : col.value }))),
    };
  }

  private get cardStyle() {
    const backgroundColor = this.data?.style?.color ?? "white";
    return {
      backgroundColor,
    };
  }
}

export default Card;
</script>

<style lang="scss" scoped>
  .card_link {
    display: block;
    border: 1px solid var(--MainBorderColor);
    border-radius: 0.25rem;
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColor);
    padding: 10px;
    margin-bottom: 15px;
    user-select: none;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);

    &:not(.dragging) {
      cursor: pointer;
    }
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

  .card_text {
    text-overflow: ellipsis;
    width: 100%;
    display: inline-block;
    overflow: hidden;
  }

  .card_icon {
    display: inline-block;
    padding: 3px;
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
