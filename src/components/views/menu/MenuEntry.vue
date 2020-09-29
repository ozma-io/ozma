<template>
  <b-col
    :sm="entry.size || 12"
  >
    <template v-if="entry.content">
      <div class="menu_category_block">
        <MenuHeading :level="level + 1">
          {{ entry.name }}
        </MenuHeading>
        <b-row :class="['menu_entries', { 'first_level_entries': level === 0 }]">
          <MenuEntry
            v-for="(subEntry, index) in entry.content"
            :key="index"
            :entry="subEntry"
            :level="level + 1"
            @goto="$emit('goto', $event)"
          />
        </b-row>
      </div>
    </template>
    <template v-else>
      <div class="menu_entry">
        <input
          v-if="!entry.icon"
          type="button"
          class="material-icons menu_entry_icon"
          value="chevron_right"
        >
        <div
          v-else
          class="menu_entry_icon menu_entry_icon__text"
        >
          {{ entry.icon }}
        </div>
        <UserViewLink
          class="navigation-entry"
          :uv="entry"
          @click="$emit('goto', $event)"
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

import MenuHeading from '@/components/menu/MenuHeading.vue';

interface IMenuBase {
  name: string;
  size?: number;
}

export interface IMenuLink extends IMenuBase, IQuery { 
  icon?: string;
}

export interface IMenuCategory extends IMenuBase {
  content: MenuValue[];
}

export type MenuValue = IMenuLink | IMenuCategory;

const initialSize = 50;
const scaleFactor = 0.85;

@Component({ name: 'MenuEntry', components: { MenuHeading } })
export default class MenuEntry extends Vue {
  @Prop({ type: Number, required: false, default: 0 }) level!: number;
  @Prop({ type: Object, required: true }) entry!: MenuValue;

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

  .menu_category_block {
    margin-top: 10px;
  }

  .menu_category_block h1,
  .menu_category_block h2,
  .menu_category_block h3,
  .menu_category_block h4,
  .menu_category_block h5,
  .menu_category_block h6 {
    font-weight: 600;
  }

  .menu_list {
    list-style: none;
    padding-left: 0;
  }

  .menu_entry > a {
    color: var(--MainTextColor);
    text-decoration: underline;
    text-decoration-color: var(--MainBorderColor);
    margin-left: 5px;
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

  .menu_entry_icon {
    background: none;
    color: var(--MainBorderColor);
    border: none;
    padding: 0;
  }

  .menu_entry_icon__text {
    color: var(--MainTextColor);
    width: 24px;
    font-size: 20px;
    line-height: 24px;
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
