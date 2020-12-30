<template>
  <div
    :class="['modal__tab_header', {'selected': isActive, 'only_tab': onlyTab}]"
    @click="$emit('tab-click')"
  >
    <input
      type="button"
      value="arrow_back"
      class="head-menu_back-button material-icons md-14"
      @click="$router.go(-1)"
    >
    <router-link
      :to="{ name: 'main' }"
      class="head-menu_main-menu-button material-icons"
    >
      home
    </router-link>
    <span class="modal__tab_header_title">{{ title }}</span>
    <slot name="actions-menu" />
    <input
      type="button"
      value="close"
      class="material-icons modal__tab_close_button"
      @click.stop="$emit('tab-close')"
    >
    <slot name="actions-right" />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";

@Component
export default class ModalTabHeader extends Vue {
  @Prop({ type: String, required: true }) title!: string;
  @Prop({ type: Boolean, default: false }) isActive!: boolean;
  @Prop({ type: Boolean, default: false }) onlyTab!: boolean;
}
</script>

<style scoped>
  .head-menu_back-button {
    padding-top: 3px;
    padding-bottom: 3px;
    margin-left: 0 !important;
  }

  .head-menu_back-button,
  .head-menu_main-menu-button {
    color: var(--MainTextColor) !important;
    background: hsla(0, 0%, 100%, 0.3);
    border: none;
    text-decoration: none;
    font-size: 20px;
    padding: 0;
    margin-right: 10px;
    z-index: 1000;
  }

  .modal__tab_header {
    display: flex;
    padding: 5px;
    flex: 1 1 auto;
    cursor: pointer;
    border-top: 1px solid;
    border-left: 1px solid;
    border-right: 1px solid;
    border-color: transparent;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    margin-left: 5px;
    margin-right: 5px;
    align-items: center;
  }

  .modal__tab_header_title {
    font-weight: 600;
    font-size: 1.25em;
    margin-right: auto;
  }

  .modal__tab_header.selected,
  .modal__tab_header:hover {
    color: var(--MainTextColor);
    border-color: var(--MainBorderColor);
    cursor: pointer;
  }

  .modal__tab_header.only_tab {
    border-color: transparent;
    cursor: initial;
  }

  .modal__tab_close_button {
    visibility: hidden;
    line-height: 1.25em;
    font-size: 20px;
    background: none;
    border: none;
    cursor: pointer;
    float: right;
  }

  .modal__tab_header.selected > .modal__tab_close_button,
  .modal__tab_header:hover > .modal__tab_close_button,
  .modal__tab_header.selected > .modal__tab_fullscreen_button,
  .modal__tab_header:hover > .modal__tab_fullscreen_button {
    visibility: visible;
  }

  .modal__tab_header.only_tab > .modal__tab_close_button {
    display: none;
  }

  .modal__tab_header.only_tab > .modal__tab_fullscreen_button {
    visibility: visible;
  }
</style>
