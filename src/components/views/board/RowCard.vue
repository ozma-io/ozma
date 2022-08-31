<template>
  <!-- <a> tags have special behaviour on Safari which breaks animation, hence no-href. -->
  <!-- Ternary in `:link` for fix Firefox issue, see: https://github.com/SortableJS/Sortable/issues/1184 -->
  <FunLink
    class="card-link"
    no-href
    :link="card.link"
    :disabled="dragged"
    @goto="$emit('goto', $event)"
  >
    <b-row
      v-for="(row, rowIndex) in card.rows"
      :key="rowIndex"
      class="card-row"
    >
      <b-col
        v-for="(col, colIndex) in row"
        :key="colIndex"
        :cols="col.size"
        :class="[
          'card-col',
          col.cellVariantClass
        ]"
        :styles="col.cellVariantStyles"
      >
        <div
          v-if="col.type === 'image'"
          class="card-avatar"
          :style="{ backgroundImage: `url('${col.url}')` }"
        />
        <span
          v-else
          class="card-text"
        >
          <!-- TODO: Remove `getIconType` method call from template -->
          <span
            v-if="col.icon && col.textHtml"
            :class="['card-icon', { 'material-icons md-18': getIconType(col.icon) === 'material' }]"
          >
            {{ col.icon }}
          </span>
          <!-- eslint-disable vue/no-v-html -->
          <span
            class="card-text-text"
            @click="handleClick($event, col.hasLinks)"
            v-html="col.textHtml"
          />
          <!-- eslint-enable vue/no-v-html -->
        </span>
      </b-col>
    </b-row>
  </FunLink>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import { Link } from "@/links";
import { RowRef } from "@/user_views/combined";
import { getIconType } from "@/utils";
import { ColorVariantFullClassName, ColorVariantCssVariables } from "@/utils_colors";

export interface ICardColumnBase {
  size: number;
}

export interface ITextCardColumn extends ICardColumnBase {
  type: "text";
  icon: string | null;
  textHtml: string;
  hasLinks: boolean;
  cellVariantClass: ColorVariantFullClassName | null;
  cellVariantStyles: ColorVariantCssVariables | null;
}

export interface IImageCardColumn extends ICardColumnBase {
  type: "image";
  url: string;
}

export type CardColumn = ITextCardColumn | IImageCardColumn;

export type CardRow = CardColumn[];

export interface IRowCard {
  group: unknown;
  order: number | null;
  ref: RowRef;
  link: Link | null;
  rows: CardRow[];
}

@Component
export default class RowCard extends Vue {
  @Prop({ type: Object, required: true }) card!: IRowCard;
  @Prop({ type: Boolean, default: false }) dragged!: boolean;

  private getIconType(icon: string) {
    return getIconType(icon);
  }

  // We need to prevent clicks if row has links, otherwise click on link opens a card also.
  private handleClick(event: MouseEvent, stopPropagation: boolean) {
    if (stopPropagation) {
      event.stopPropagation();
    }
  }
}
</script>

<style lang="scss" scoped>
  .card-link {
    padding: 0.25rem;
    display: block;
    cursor: pointer;
    user-select: none;
  }

  .card-row {
    margin: 0;
  }

  .card-col {
    padding: 0 0.25rem 0 0.25rem;
    background-color: var(--backgroundColor);
    border-radius: 0.2rem;
  }

  .card-text {
    display: flex;
    flex-direction: row;
    align-items: center;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--foregroundColor, --kanbanCard-foregroundColor);
  }

  .card-icon {
    margin-right: 0.25rem;
  }

  .card-text-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
