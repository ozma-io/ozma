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
    }
  }
</i18n>

<template>
  <div :class="['menu_container', { 'menu_container__centered': isCentered }]">
    <b-container>
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
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { Location } from "vue-router";
import { namespace } from "vuex-class";
import { mixins } from "vue-class-component";

import { tryDicts, mapMaybe } from "@/utils";
import { CombinedUserView, valueToPunnedText, homeSchema, currentValue, ICombinedValue } from "@/state/user_view";
import { IQuery } from "@/state/query";
import { CurrentChanges, IEntityChanges } from "@/state/staging_changes";
import LocalEmptyUserView from "@/LocalEmptyUserView";
import { UserView } from "@/components";
import BaseUserView, { EmptyBaseUserView } from "@/components/BaseUserView";
import * as R from "ramda";

import MenuEntry, { MenuValue, IMenuLink } from "@/components/views/menu/MenuEntry.vue";
import { attrToLink, IAttrToLinkOpts } from "@/links";

@UserView({
  localConstructor: LocalEmptyUserView,
})
@Component({ components: { MenuEntry } })
export default class UserViewMenu extends mixins<EmptyBaseUserView>(BaseUserView) {
  @Prop() uv!: CombinedUserView;

  get linkOpts(): IAttrToLinkOpts {
    const home = homeSchema(this.uv.args) || undefined;
    return { homeSchema: home, defaultTarget: "root" };
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
    if (typeof entry.name !== "string") {
      return null;
    }
    const base: { name: string; size?: number } = { name: entry.name };
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
      let icon;
      if (typeof entry.icon === "string") {
        icon = entry.icon;
      }
      if (ref === null) {
        return null;
      }

      return { ...base, icon, link: ref };
    }
  }

  private buildNewMenu(): MenuValue[] | string {
    if (this.uv.info.columns[0].valueType.type !== "json") {
      return this.$t("invalid_new_menu_value").toString();
    }
    return this.uv.rows!.flatMap(row => {
      if (row.deleted) {
        return [];
      }
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
    });
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
      const getButtonAttr = (name: string) => tryDicts(name, buttonAttrs, rowAttrs, buttonsAttrs, viewAttrs);

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
    max-height: 100%;
    overflow-y: auto;
  }

  .menu_container__centered {
    width: 100%;
    height: 100%;
    padding-bottom: 50px; /* To compensate header's height */
    display: flex;
    justify-content: center;
    align-items: center;

    ::v-deep .container {
      margin: auto 0;
    }
  }

  .main-menu-block {
    width: 100%;
    height: 100%;
    position: fixed;
    top: 0;
    left: 0;
    display: flex;
    padding: 0;
    overflow: auto;
  }

  .row {
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -ms-flex-wrap: wrap;
    flex-wrap: wrap;
    margin-right: -15px;
    margin-left: -15px;
  }

  .submain-menu-block {
    max-width: 650px !important; /* 450px */
    display: block;
    margin: auto;
    padding: 0;
    padding-top: 35px;
    padding-bottom: 35px;
  }

  .subsubmain-menu-block {
    width: auto;
    height: 90%;
    display: flex;

    /* FIXME: something strange here. This line is superseded. */

    /* align-items: center; /* для разных браузеров */
    justify-content: center; /* для разных браузеров */
    flex-direction: column;
    align-items: flex-start;
    margin: auto;
    border: 0;
    padding: 0;
    background-color: transparent;
  }

  .filter-back {
    margin: 0;
    padding: 0;
    display: inline-block;
    background: var(--MenuColor);
    margin-right: 2px;
    margin-bottom: 2px;
  }

  .filter-back > * {
    padding-left: 30px;
  }

  .navigation-sector {
    margin-bottom: 20px;
    float: left;
    clear: left;
    padding: 0;
  }

  .navigation-sector-title {
    padding: 5px;
    padding-left: 1px;
    min-height: 18px;
    width: 100%;
    height: calc(1.5em + 4px) !important;
    white-space: nowrap;
  }

  .navigation-sector-title-head {
    color: var(--NavigationTextColor) !important;
    font-weight: bold;
  }

  @media screen and (orientation: portrait) {
    @media screen and (max-width: 575px) {
      .menu_container {
        margin-top: 0;
      }
    }

    @media screen and (max-device-width: 480px) {
      .main-menu-block {
        position: relative !important;
      }

      .submain-menu-block {
        width: 100% !important;
        margin-top: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }

      .subsubmain-menu-block {
        height: auto !important;
        margin: 0 !important;
        width: 100% !important;
      }

      .navigation-sector {
        margin: 0 !important;
        width: 100%;
      }

      .navigation-sector-title {
        height: 29px !important;
        margin: 0 !important;
        padding: 5px !important;
        background-color: var(--NavigationBackColor);
        overflow-x: scroll;
      }

      .navigation-sector-title-head {
        padding: 0 !important;
        line-height: normal;
        color: var(--NavigationTextColor) !important;
        font-weight: 700;
      }

      .navigation-sector-body {
        width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding: 0 !important;
        background-color: var(--MenuColor);
      }

      .filter-back {
        margin-bottom: 1px !important;
        width: 100%;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      .filter-back:first-child {
        margin-top: 1px !important;
      }

      .navigation-entry {
        background: hsla(0, 0%, 100%, 0.3);
        margin-right: 0 !important;
        margin-bottom: 1px;
        width: 100%;
        text-align: left;
        opacity: 1;
      }

      .navigation-entry:last-child {
        margin-bottom: 0;
      }
    }
  }
</style>
