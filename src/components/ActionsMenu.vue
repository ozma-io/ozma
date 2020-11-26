<i18n>
  {
    "en": {
      "empty": "(empty)"
    },
    "ru": {
      "empty": "(пусто)"
    }
  }
</i18n>

<template>
  <div
    :class="['actions-menu', {'actions-menu_active': showActions}]"
  >
    <input
      v-if="menuAlign == 'left'"
      type="button"
      class="actions-menu_actions-button material-icons"
      :value="titleIcon"
      @click="showActions = !showActions"
    >
    <i
      v-else
      class="material-icons right-actions-menu-button"
      @click="showActions = !showActions"
    >{{ titleIcon }}</i>
    <div
      v-if="showActions"
      class="black-block"
    >
      <button
        class="black-block_button "
        @click="showActions = false"
      />
    </div>
    <div
      v-show="showActions"
      :class="['div-with-actions', menuAlign]"
    >
      <template v-if="sortedActions.length == 0">
        <label class="div-with-actions_button">
          {{ $t('empty') }}
        </label>
      </template>
      <template v-for="(action, i) in sortedActions" v-else>
        <hr
          v-if="action === null"
          :key="i"
          class="div-with-actions_hr"
        >
        <!-- Passing v-on:click to v-bind doesn't seem to work, hence this ugly solution -->
        <router-link
          v-else-if="'location' in action"
          :key="action.name"
          class="div-with-actions_button"
          :to="action.location"
        >
          {{ action.name }}
        </router-link>
        <FunLink
          v-else-if="'link' in action"
          :key="action.name"
          :link="action.link"
          class="div-with-actions_button"
          @click="showActions = false"
          @goto="$emit('goto', $event)"
        >
          {{ action.name }}
        </FunLink>
        <input
          v-else-if="'callback' in action"
          :key="action.name"
          type="button"
          :value="action.name"
          class="div-with-actions_button"
          @click="showActions = false; action.callback()"
        >
        <label
          v-else-if="'uploadFile' in action"
          :key="action.name"
          class="div-with-actions_button"
        >
          {{ action.name }}
          <input
            type="file"
            @change="uploadFile($event.target, action.uploadFile)"
          >
        </label>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { RawLocation } from "vue-router";

import { Link } from "@/links";
import { IActionRef } from "ozma-api/src";

export interface IAction {
  icon?: string;
  name: string;
  order?: number;
};

export interface ILocationAction extends IAction {
  location: RawLocation;
}

export interface ILinkAction extends IAction {
  link: Link;
}

export interface ICallbackAction extends IAction {
  callback: () => void;
}

export interface IUploadFileAction extends IAction {
  uploadFile: (file: File) => void;
}

export type Action = ILocationAction | ILinkAction | ICallbackAction | IUploadFileAction;

@Component
export default class ActionsMenu extends Vue {
  @Prop({ type: Array, required: true }) actions!: Action[];
  /**
   * icon Material design icon item title.
   *   By default 'menu' for menuAlign=left and 'more_vert' for menuAlign=any.
   *   See computed `titleIcon`
   *   More icons - https://material.io/resources/icons
   */
  @Prop({ type: String, default: "" }) icon!: string;
  @Prop({ type: String, default: "left" }) menuAlign!: string;

  private showActions = false;

  private uploadFile(input: HTMLInputElement, next: (file: File) => void) {
    this.showActions = false;
    const files = input.files as FileList;
    next(files[0]);
  }

  /**
   * Return material design icon item title for this menu
   *
   * @return {String}
   */
  get titleIcon() {
    if (this.icon === "") {
      return this.menuAlign === "left" ? "menu" : "more_vert";
    }
    return this.icon;
  }

  get sortedActions() {
    const newActions = [...this.actions];
    newActions.sort((a, b) => (a.order || 0) - (b.order || 0));
    let oldOrder: number | null = null;
    for (let i = 0; i < newActions.length; i++) {
      const actionOrder = newActions[i].order || 0;
      if (oldOrder === null) {
        oldOrder = actionOrder;
      } else if (oldOrder !== actionOrder) {
        newActions.splice(i, 0, null as any);
        i++;
        oldOrder = actionOrder;
      }
    }
    return newActions as (Action | null)[];
  }

  @Watch('$route', { immediate: true, deep: true })
  onUrlChange(newVal: any) {
    this.showActions = false;
  }
}
</script>

<style scoped>
  /* Current Z layout:

   * Drop-down menu         (1200)
   * Button drop-down menu  (1000)
   * Div around button menu (900)
   * Black-block (for mob)  (700)
   */
  .actions-menu {
    margin: 0;
    z-index: 995;
    display: flex;
    align-items: center;
  }

  .modal__tab_header .actions-menu {
    display: inline-flex;
  }

  .actions-menu_active {
    position: relative;
    z-index: 1300;
  }

  .actions-menu__burger {
    border: none;
    background: transparent;
    width: 24px;
    height: 24px;
    outline: none;
    padding: 0;
    margin-right: 20px;
  }

  .div-with-actions {
    width: max-content;
    flex: 1;
    position: absolute;
    display: block;
    z-index: 1200; /* меню действий для подтаблиц поверх темного фона */
    background-color: var(--MainBackgroundColor);
    border: 1px solid var(--MainBorderColor);
    margin-top: 0;
    top: calc(100% + 5px);
    box-shadow: 0 5px 5px rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }

  .div-with-actions_hr {
    margin-top: 0;
    margin-bottom: 0;
  }

  .div-with-actions_button {
    cursor: pointer;
    display: block;
    background: hsla(0, 0%, 100%, 0.3) !important;
    padding: 5px;
    line-height: normal;
    padding-left: 20px;
    padding-right: 15px;
    color: var(--MainTextColor) !important;
    text-decoration: none;
    width: 100%;
    text-align: left;
    border: 0;
    font-size: 14px;
    margin-bottom: 0; /* override defaults for label from Bootstrap */
  }

  .div-with-actions_button input[type="file"] {
    display: none;
  }

  .div-with-actions_button:hover {
    background-color: var(--MainBorderColor) !important;
    color: var(--MainTextColor) !important;
  }

  .black-block {
    position: fixed;
    width: 150vw;
    height: 150vh;
    top: -50vh;
    left: -50vw;
  }

  .black-block_button {
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: auto !important;
  }

  .actions-menu_actions-button {
    color: var(--MainTextColor) !important;
    background: var(--MainBackgroundColor);
    border: none;
    text-align: left;
    padding: 0;
    line-height: normal;
    font-size: 20px;
    margin-right: 10px;
    vertical-align: bottom;
    height: 1.25em;
  }

  .actions-menu_actions-button:focus {
    outline: none;
  }

  .right {
    margin-left: -74vw;
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .div-with-actions {
        width: 100vw !important;
        position: fixed;
        left: 0;
        top: 54px;
      }

      .black-block {
        top: -50vh !important;
        right: 0;
        left: 0;
        position: fixed;
        width: 100vw;
        z-index: 700;
        opacity: 0.7;
        display: block !important;
        overflow: scroll;
        background-color: black !important;
        height: 200vh;
      }

      .actions-menu {
        display: inline-flex;
      }

      .actions-menu_actions-button {
        position: sticky;
      }

      .actions-menu_actions-button,
      .div-with-actions_button {
        width: 100%;
        text-align: left;
        z-index: 1000 !important; /* кнопка выбора действий выше темного блока */
      }
    }
  }

  @media print {
    .actions-menu {
      display: none !important;
    }
  }

  .right-actions-menu-button {
    line-height: 1.25em;
    font-size: 24px;
    background: none;
    border: none;
    cursor: pointer;
    float: right;
    color: var(--MainTextColor);
  }

</style>
