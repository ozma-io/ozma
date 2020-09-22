<template>
  <div
    :class="['modal__tab_header', {'selected': isActive, 'only_tab': onlyTab}]"
    @click="$emit('tab-click')"
  >
    {{ title }}
    <input
      type="button"
      value="close"
      class="material-icons modal__tab_close_button"
      @click.stop="$emit('tab-close')"
    >
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
  .modal__tab_header {
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
  }

  .modal__tab_header.selected,
  .modal__tab_header:hover {
    color: var(--MainTextColor);
    border-color: var(--MainBorderColor);
    cursor: pointer;
  }

  .modal__tab_header.only_tab {
    border-color: transparent;
  }

  .modal__tab_close_button {
    visibility: hidden;
    line-height: 21px;
    font-size: 20px;
    background: none;
    border: none;
    cursor: pointer;
    float: right;
  }

  .modal__tab_header.selected > .modal__tab_close_button,
  .modal__tab_header:hover > .modal__tab_close_button {
    visibility: visible;
  }

  .modal__tab_header.only_tab > .modal__tab_close_button {
    visibility: hidden;
  }
</style>
