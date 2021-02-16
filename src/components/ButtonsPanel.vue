<template>
  <div class="buttons_panel">
    <ul class="buttons">
      <template v-for="(button, i) in buttons">
        <span
          v-if="'callback' in button && button.position == 'left'"
          :key="i"
          @click="button.callback()"
        >
          <li>
            <i :class="['material-icons',{'emoji': getIconType(button.icon) == 'emoji' }]">{{ button.icon || "arrow_right" }}</i>
            <span>{{ button.name }}</span>
          </li>
        </span>

        <FunLink
          v-else-if="'link' in button && button.position == 'left'"
          :key="i"
          :link="button.link"
          @goto="$emit('goto', $event)"
        >
          <li>
            <i :class="['material-icons',{'emoji': getIconType(button.icon) == 'emoji' }]">{{ button.icon || "arrow_right" }}</i>
            <span>{{ button.name }}</span>
          </li>
        </FunLink>

        <span v-else-if="'actions' in button" :key="i">
          <li>
            <i :class="['material-icons',{'emoji': getIconType(button.icon) == 'emoji' }]">{{ button.icon || "arrow_right" }}</i>
            <span>{{ button.name }}</span>
            <ul class="actions">
              <FunLink
                v-for="(action, j) in button.actions"
                :key="j"
                :link="action.link"
                @goto="$emit('goto', $event)"
              >
                <li v-if="'link' in action" :key="action.name">
                  <i :class="['material-icons',{'emoji': getIconType(action.icon) == 'emoji' }]">{{ action.icon || "arrow_right" }}</i>
                  <span>{{ action.name }}</span>
                </li>
              </FunLink>
            </ul>
          </li>
        </span>
      </template>
    </ul>
    <slot name="search-panel" />
    <ul class="right-buttons">
      <template v-for="(button, i) in buttons">
        <span
          v-if="'callback' in button && button.position == 'right'"
          :key="i"
          @click="button.callback()"
        >
          <li
            v-b-tooltip.hover.d50
            :title="button.name"
          >
            <i :class="['material-icons',{'emoji': getIconType(button.icon) == 'emoji' }]">{{ button.icon || "arrow_right" }}</i>
          </li>
        </span>

        <FunLink
          v-else-if="'link' in button && button.position == 'right'"
          :key="i"
          :link="button.link"
          @goto="$emit('goto', $event)"
        >
          <li
            v-b-tooltip.hover.d50
            :title="button.name"
          >
            <i :class="['material-icons',{'emoji': getIconType(button.icon) == 'emoji' }]">{{ button.icon || "arrow_right" }}</i>
          </li>
        </FunLink>
      </template>
    </ul>
    <slot name="actions-menu" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Action } from "@/components/ActionsMenu.vue";
import { getIconType } from "@/utils";

export interface IPanelButton { // Default for buttons panel
  icon?: string;
  name: string;
  actions: Action[];
}

export interface IActionPanelButton {
  position: string; // left(default) | right
}

export type PanelButton = IPanelButton | IActionPanelButton & Action;

@Component
export default class ButtonsPanel extends Vue {
  @Prop({ type: Array, required: true }) buttons!: PanelButton[];

  private getIconType(str: string | undefined | null) {
    return getIconType(str);
  }
}
</script>

<style scoped>
  .buttons_panel {
    display: flex;
    align-items: center;
  }

  ul {
    margin: 0;
    padding: 0;
  }

  li {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  ul.buttons a {
    text-decoration: none;
    color: var(--MainTextColor);
  }

  ul.buttons > a > li,
  ul.buttons > span > li {
    position: relative;
    display: flex;
    float: left;
    border: 1px solid var(--MainBackgroundColor);
    border-radius: 3px;
    padding: 3px 5px;
    margin-top: -3px;
    margin-right: 10px;
    cursor: pointer;
    transition: 0.2s background-color ease-in-out, 0.2s box-shadow ease-in-out, 0.2s border-color ease-in-out;
  }

  ul.buttons > a > li > span,
  ul.buttons > span > li > span {
    line-height: 1.5rem;
    margin-left: 5px;
  }

  .search-show + ul.buttons {
    display: none;
  }

  ul.actions > span > li,
  ul.actions > a > li {
    display: flex;
    padding: 5px 15px;
  }

  ul.actions > a > li > span,
  ul.actions > span > li > span {
    line-height: 1.5rem;
    margin-left: 10px;
    white-space: nowrap;
    overflow: hidden !important;
    text-overflow: ellipsis;
  }

  ul.actions {
    visibility: hidden;
    position: absolute;
    opacity: 0;
    border: 1px solid var(--MainBorderColor);
    border-radius: 3px;
    background-color: var(--MainBackgroundColor);
    box-shadow: 0 5px 5px rgba(0, 0, 0, 0.3);
    top: calc(100% + 5px);
    right: 0;
    z-index: 1200;
    transition: 0.2s visibility ease-in-out, 0.2s opacity ease-in-out;
  }

  ul.right-buttons {
    display: flex;
  }

  ul.right-buttons a {
    color: var(--MainTextColor);
  }

  ul.right-buttons > a > li,
  ul.right-buttons > span > li {
    line-height: 1rem;
    margin: 0 1px;
    padding: 0;
    position: relative;
    display: block;
    float: left;
    cursor: pointer;
    border: 1px solid var(--MainBackgroundColor);
    border-radius: 3px;
    transition: 0.2s background-color ease-in-out, 0.2s box-shadow ease-in-out, 0.2s border-color ease-in-out;
  }

  ul.right-buttons > a > li:hover,
  ul.right-buttons > span > li:hover {
    border: 1px solid var(--MainBorderColor);
    background-color: #f9f9fb;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  ul.buttons > a > li:hover,
  ul.buttons > span > li:hover {
    border: 1px solid var(--MainBorderColor);
    background-color: #f9f9fb;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  ul.buttons > span > li:hover ul.actions {
    opacity: 1;
    visibility: visible;
  }

  ul.actions > span > li:hover,
  ul.actions > a > li:hover {
    background-color: var(--MainBorderColor);
  }

  .emoji {
    font-size: 20px;
  }

  ul.right-buttons .emoji {
    padding: 0 2px 6px 2px;
  }

  @media only screen and (max-width: 900px) {
    ul.buttons {
      display: none;
    }
  }
</style>
