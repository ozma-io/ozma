<template>
  <b-col
    :sm="entry.size || 12"
  >
    <template v-if="entry.content">
      <div class="menu_category_block">
        <div
          class="menu_category_title"
          :style="titleStyle"
        >
          {{ entry.name }}
        </div>
        <b-row :class="['menu_entries', { 'first_level_entries': level === 0 }]">
          <MenuEntry
            v-for="(subEntry, index) in entry.content"
            :key="index"
            :entry="subEntry"
            :level="level + 1"
          />
        </b-row>
      </div>
    </template>
    <template v-else>
      <div class="menu_entry">
        <UserViewLink
          class="navigation-entry"
          :style="titleStyle"
          :uv="entry"
          @[indirectLinks?`click`:null]="$emit('goto', $event)"
        >
          {{ entry.name }}
        </UserViewLink>
      </div>
    </template>
  </b-col>
</template>



<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { IQuery, attrToQuery } from '@/state/query';

interface IMenuBase {
  name: string;
  size?: number;
}

export interface IMenuLink extends IMenuBase, IQuery { }

export interface IMenuCategory extends IMenuBase {
  content: MenuValue[];
}

export type MenuValue = IMenuLink | IMenuCategory;

const initialSize = 50;
const scaleFactor = 0.85;

@Component({ name: 'MenuEntry' })
export default class MenuEntry extends Vue {
  @Prop({ type: Number, required: false, default: 0 }) level!: number;
  @Prop({ type: Object, required: true }) entry!: MenuValue;
  @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;

  get titleStyle(): { fontSize: string } {
    if (this.level) {
      const divider = (this.level / scaleFactor);
      const fontSize = initialSize / divider;
      return { fontSize: `${fontSize}px` };
    } 
    const fontSize = initialSize;
    return { fontSize: `${fontSize}px` };
  }
}
</script>

<style scoped>
  .menu_list {
    list-style: none;
    padding-left: 0;
  }

  .menu_entry > a {
    color: var(--MainTextColor);
    text-decoration: underline;
    text-decoration-color: var(--MainBorderColor);
  }

  .first_level_entries {
    padding-left: 0 !important;
  }

  .menu_entry {
    display: flex;
    align-items: center;
    color: var(--MainTextColor);
    margin-bottom: 5px;
  }

  .menu_category_title {
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
  }
</style>
