<i18n>
  {
    "en": {
      "invalid_create_mode": "Menu doesn't support create mode",
      "invalid_new_menu_value": "Invalid array-style menu value",
      "invalid_menu": "Invalid data format for menu"
    },
    "ru": {
      "invalid_create_mode": "Меню не поддерживает режим создания",
      "invalid_new_menu_value": "Неверное значение меню-массива",
      "invalid_menu": "Неверный формат данных для меню"
    },
    "es": {
      "invalid_create_mode": "El menú no admite el modo de creación",
      "invalid_new_menu_value": "El valor de menú de estilo de matriz no está válido",
      "invalid_menu": "El formato de datos no está válido para el menú"
    }
  }
</i18n>

<template>
  <div :class="['menu_container', { 'menu_container__centered': isCentered, 'is-mobile': $isMobile }]">
    <b-container class="menu-b-container">
      <b-row :class="[{ 'justify-content-center': isCentered }]">
        <b-col v-if="typeof entriesOrError === 'string'" cols="12">
          <span>
            {{ entriesOrError }}
          </span>
        </b-col>
        <MenuEntry
          v-for="(entry, index) in entriesOrError"
          v-else
          :key="index"
          :entry="entry"
          @goto="$emit('goto', $event)"
        />
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import { Component } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import * as R from "ramda";

import { tryDicts, mapMaybe } from "@/utils";
import { colorVariantFromAttribute, bootstrapVariantAttribute } from "@/utils_colors";
import { UserView } from "@/components";
import BaseUserView, { EmptyBaseUserView } from "@/components/BaseUserView";
import MenuEntry, { MenuValue, IMenuLink, Badge } from "@/components/views/menu/MenuEntry.vue";
import { attrToLink, IAttrToLinkOpts } from "@/links";
import { currentValue, valueToPunnedText } from "@/user_views/combined";
import { rawToUserString, UserString } from "@/state/translations";

@UserView()
@Component({ components: { MenuEntry } })
export default class UserViewMenu extends mixins<EmptyBaseUserView>(BaseUserView) {
  get linkOpts(): IAttrToLinkOpts {
    return { homeSchema: this.uv.homeSchema ?? undefined, defaultTarget: "root" };
  }

  private get isCentered(): boolean {
    if (this.$isMobile) {
      return false;
    }
    const isCentered = R.pathOr(false, ["attributes", "menu_centered"], this.uv);
    if (typeof isCentered === "boolean") {
      return isCentered;
    }
    return false;
  }

  private convertNewMenuEntries(entries: unknown[]): MenuValue[] {
    return mapMaybe(entry => {
      if (typeof entry !== "object" || entry === null) {
        return undefined;
      }
      const ret = this.convertNewMenuEntry(entry as Record<string, unknown>);
      if (ret === null) {
        return undefined;
      } else {
        return ret;
      }
    }, entries);
  }

  private convertNewMenuEntry(entry: Record<string, unknown>): MenuValue | null {
    const name = rawToUserString(entry.name);
    if (name === null) {
      return null;
    }
    const base: { name: UserString; size?: number } = { name };
    if ("size" in entry) {
      const size = Number(entry.size);
      if (!Number.isNaN(size)) {
        base.size = size;
      }
    }

    if ("content" in entry) {
      if (!(entry.content instanceof Array)) {
        return null;
      }
      const content = this.convertNewMenuEntries(entry.content);
      return { ...base, content };
    } else {
      const ref = attrToLink(entry, this.linkOpts);
      if (ref === null) return null;

      let icon;
      if (typeof entry.icon === "string") {
        icon = entry.icon;
      }

      const hasBadge = typeof entry.badge === "object" && entry.badge !== null && "value" in entry.badge;
      let badge: Badge | undefined;
      if (hasBadge) {
        const badgeRaw = entry.badge as { value?: unknown; variant?: unknown };
        badge = {
          value: badgeRaw.value,
          variant: colorVariantFromAttribute(badgeRaw?.variant, bootstrapVariantAttribute("danger")),
        };
      }

      return { ...base, icon, badge, link: ref };
    }
  }

  private buildNewMenu(): MenuValue[] | string {
    if (this.uv.info.columns[0].valueType.type !== "json") {
      return this.$t("invalid_new_menu_value").toString();
    }
    return this.uv.mapVisibleRows(row => {
      const rawMenu = currentValue(row.values[0]);
      if (rawMenu instanceof Array) {
        return this.convertNewMenuEntries(rawMenu);
      } else if (typeof rawMenu === "object" && rawMenu !== null) {
        const ret = this.convertNewMenuEntry(rawMenu as Record<string, unknown>);
        if (ret === null) {
          return [];
        } else {
          return [ret];
        }
      } else {
        return [];
      }
    }).flat();
  }

  private buildOldMenu(): MenuValue[] | string {
    const viewAttrs = this.uv.attributes;

    const categoryColumnInfo = this.uv.info.columns[0];
    const categoriesAttrs = this.uv.columnAttributes[0];
    const buttonColumnInfo = this.uv.info.columns[1];
    const buttonsAttrs = this.uv.columnAttributes[1];

    const categories = new Map<string, { index: number; content: IMenuLink[] }>();
    this.uv.rows!.forEach((row, rowI) => {
      if (row.deleted) {
        return;
      }

      const rowAttrs = row.attributes === undefined ? {} : row.attributes;
      const getRowAttr = (name: string) => tryDicts(name, rowAttrs, viewAttrs);

      const categoryCell = row.values[0];
      const categoryName = valueToPunnedText(categoryColumnInfo.valueType, categoryCell);
      let category = categories.get(categoryName);
      if (category === undefined) {
        category = {
          index: rowI,
          content: [],
        };
        categories.set(categoryName, category);
      }

      const buttonCell = row.values[1];
      const buttonName = valueToPunnedText(buttonColumnInfo.valueType, buttonCell);
      const buttonAttrs = buttonCell.attributes || {};
      const getButtonAttr = (name: string) => tryDicts(name, buttonAttrs, buttonsAttrs, rowAttrs, viewAttrs);

      const toQuery = attrToLink(getButtonAttr("link"), this.linkOpts);
      if (toQuery === null) {
        return;
      }

      const button: IMenuLink = {
        name: buttonName,
        link: toQuery,
      };
      category.content.push(button);
    });
    return Array.from(categories.entries()).sort(([nameA, a], [nameB, b]) => a.index - b.index).map(([name, x]) => ({ name, content: x.content }));
  }

  get entriesOrError(): MenuValue[] | string {
    if (this.uv.rows === null) {
      return this.$t("invalid_create_mode").toString();
    } else if (this.uv.info.columns.length === 1) {
      return this.buildNewMenu();
    } else if (this.uv.info.columns.length === 2) {
      return this.buildOldMenu();
    } else {
      return this.$t("invalid_menu").toString();
    }
  }
}
</script>

<style lang="scss" scoped>
  .menu_container {
    padding: 3rem 4rem 0 4rem;
    max-height: 100%;
    overflow-y: auto;
    background-color: var(--userview-background-color);

    &.is-mobile {
    padding: 3rem 0.3rem 0 0.3rem;

      ::v-deep .row {
        margin: 0;
      }
    }
  }

  .menu_container__centered {
    width: 100%;
    height: 100%;
    padding-bottom: 39px; /* To compensate header's height */
    display: flex;
    justify-content: center;
    align-items: center;

    ::v-deep .container {
      margin: auto 0;
    }
  }

  .menu-b-container {
    max-width: 100%; /* `container fluid` work bad */
    padding: 0%;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
  }

  @media screen and (orientation: portrait) {
    @media screen and (max-width: 575px) {
      .menu_container {
        margin-top: 0;
      }
    }
  }
</style>
