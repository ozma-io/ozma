<template>
  <b-col
    :md="entry.size || 12"
  >
    <template v-if="entry.content">
      <div
        :class="[
          'menu_category_block',
          'menuEntry-variant',
          'menuEntry-local-variant',
          {
            'is-mobile': $isMobile,
          },
        ]"
      >
        <MenuHeading :level="level + 1">
          <span :title="entry.name">
            {{ entry.name }}
          </span>
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
      <FunLink
        class="menu-entry"
        :link="entry.link"
        @goto="$emit('goto', $event)"
      >
        <i
          :class="[
            'material-icons',
            'icon',
            {
              'no-icon': !entry.icon,
              'emoji-icon': getIconType(entry.icon) === 'emoji',
            }]"
        >
          {{ entry.icon || "chevron_right" }}
        </i>
        <span class="name" :title="entry.name">
          {{ entry.name }}
        </span>
        <b-badge
          v-if="entry.badge !== undefined && entry.badge.value !== undefined"
          :class="[badgeVariantClassName, 'badge-local-variant', $isMobile ? 'ml-auto' : 'ml-1']"
          :style="badgeVariantVariables"
          pill
          variant="light"
        >
          {{ entry.badge.value }}
        </b-badge>
      </FunLink>
    </template>
  </b-col>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import MenuHeading from "@/components/menu/MenuHeading.vue";
import { Link } from "@/links";
import { getIconType } from "@/utils";
import type { ColorVariantAttribute } from "@/utils_colors";
import { getColorVariantAttributeClassName, getColorVariantAttributeVariables } from "@/utils_colors";

export type Badge = {
  value: unknown;
  variant: ColorVariantAttribute;
};

interface IMenuBase {
  name: string;
  size?: number;
}

export interface IMenuLink extends IMenuBase {
  icon?: string;
  link: Link;
  badge?: Badge;
}

export interface IMenuCategory extends IMenuBase {
  content: MenuValue[];
}

export type MenuValue = IMenuLink | IMenuCategory;

const initialSize = 50;
const scaleFactor = 0.85;

@Component({ name: "MenuEntry", components: { MenuHeading } })
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

  private getIconType(str: string | undefined | null) {
    return getIconType(str);
  }

  private isMenuLink(entry: MenuValue): entry is IMenuLink {
    return "link" in entry;
  }

  private get badgeVariantClassName(): string | null {
    if (!this.isMenuLink(this.entry)) return null;
    if (!this.entry.badge) return null;

    return getColorVariantAttributeClassName(this.entry.badge.variant);
  }

  private get badgeVariantVariables(): Record<string, string> | null {
    if (!this.isMenuLink(this.entry)) return null;
    if (!this.entry.badge) return null;

    return getColorVariantAttributeVariables(this.entry.badge.variant);
  }
}
</script>

<style lang="scss" scoped>
  @include variant-to-local("menuEntry");
  @include variant-to-local("badge");

  .menu_category_block {
    margin-top: 1rem;

    &:not(:has(.first_level_entries)) {
      box-shadow: rgb(0 0 0 / 10%) 0 0 10px 5px;
      border-radius: 0.5rem;
      padding: 2rem;
      height: 90%;
    }

    &.is-mobile {
      margin: 0;
      margin-bottom: 1rem;
    }

    &:not(:has(.menu-entry)) {
      display: none;
    }

    @media (max-width: 575.98px) {
      margin: 0;
      margin-bottom: 1rem;
    }
  }

  .menu_category_block h1,
  .menu_category_block h2,
  .menu_category_block h3,
  .menu_category_block h4,
  .menu_category_block h5,
  .menu_category_block h6 {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .menu_list {
    list-style: none;
    padding-left: 0;
  }

  .menu-entry {
    @include material-button("menuEntry");

    width: 100%;
    max-width: 100%;
    border-radius: 0.25rem;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
    display: flex;
    align-items: center;
    color: var(--menuEntry-foregroundColor);
    margin-bottom: 0.25rem;
    text-decoration: none;
    background: transparent;
    border-color: transparent;

    .icon {
      user-select: none;

      &.no-icon {
        color: var(--menuEntry-foregroundDarkerColor);
      }

      &.emoji-icon {
        font-family: initial;
      }
    }

    .name {
      margin-left: 0.35rem;
      margin-right: 0.35rem;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 1rem;
    }
  }

  .first_level_entries {
    padding-left: 0 !important;
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

  ::v-deep {
    .badge {
      background: var(--badge-backgroundColor) !important;
      color: var(--badge-foregroundColor) !important;
    }
  }
</style>
