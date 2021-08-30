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
        class="card-col"
      >
        <div
          v-if="col.type === 'image'"
          class="card-avatar"
          :style="{ backgroundImage: `url('${col.url}')` }"
        />
        <span
          v-else
          class="card-text"
          :title="col.value"
        >
          <!-- TODO: Remove `getIconType` method call from template -->
          <span
            v-if="col.icon && col.value"
            :class="['card-icon', { 'material-icons md-18': getIconType(col.icon) === 'material' }]"
          >
            {{ col.icon }}
          </span>
          <!-- eslint-disable vue/no-v-html -->
          <span
            v-if="col.valueHtml !== col.value"
            class="card-text-text"
            @click.stop
            v-html="col.valueHtml"
          />
          <span v-else class="card-text-text"> {{ col.value }} </span>
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

export interface ICardColumnBase {
  size: number;
}

export interface ITextCardColumn extends ICardColumnBase {
  type: "text";
  icon: string | null;
  value: string;
  valueHtml: string;
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
}
</script>

<style lang="scss" scoped>
  .card-link {
    padding: 0.5rem;
    display: block;
    cursor: pointer;
    user-select: none;
  }

  .card-row {
    margin: 0;
  }

  .card-col {
    padding: 0;
  }

  .card-text {
    display: flex;
    flex-direction: row;
    align-items: center;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--kanbanCard-foregroundColor);
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
