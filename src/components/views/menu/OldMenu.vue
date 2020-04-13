<template>
  <b-row>
    <b-col
      v-for="(category, index) in categories"
      :key="index"
      cols="12"
      :lg="getBlockSize(index)"
      class="menu_category_block"
    >
      <div class="menu_category_title">
        {{ category.name }}
      </div>
      <div
        v-for="(button, buttonI) in category.buttons"
        :key="buttonI"
        class="menu_entry"
      >
        <UserViewLink
          class="navigation-entry"
          :uv="button.uv"
          @[indirectLinks?`click`:null]="$emit('goto', $event)"
        >
          {{ button.name }}
        </UserViewLink>
      </div>
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { IQuery } from '@/state/query';

export interface IMainMenuButton {
  index: number;
  name: string;
  categoryName: string;
  uv: IQuery;
}

export interface IMainMenuCategory {
  index: number;
  name: string;
  buttons: IMainMenuButton[];
}

@Component
export default class OldMenu extends Vue {
  @Prop({ type: Array, required: true }) categories!: IMainMenuCategory[];
  @Prop({ type: Function, required: true }) getBlockSize!: (index: number) => number;
  @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
}
</script>

<style scoped>
  .menu_list {
    list-style: none;
    padding-left: 0;
  }

  /deep/ .menu_entry > a {
    color: var(--MainTextColor);
    text-decoration: underline;
    line-height: 2;
    text-decoration-color: var(--MainBorderColor);
    font-size: 24px !important;
  }

  .menu_entry {
    display: flex;
    align-items: center;
    color: var(--MainTextColor);
    padding-bottom: 5px;
    padding-left: 20px;
  }

  .menu_entry:first-child {
    padding-left: 0;
  }

  .menu_entry:last-child {
    border-right: 0;
  }

  .menu_category_block {
    margin-top: 75px;
  }

  .menu_category_title {
    line-height: 2;
    font-size: 60px !important;
    color: #000;
    font-weight: bold;
  }

  @media (max-width: 600px) {
    .menu_category_title {
      font-size: 30px !important;
    }

    .menu_entry > a {
      font-size: 20px !important;
    }

    .menu_category_block {
      margin-top: 30px;
    }
  }
</style>
