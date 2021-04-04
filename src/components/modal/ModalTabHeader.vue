<template>
  <div
    :class="[
      'modal__tab_header align-items-center',
      {
        'selected': isActive,
        'only_tab': onlyTab,
        'is-mobile': $isMobile,
      }
    ]"
    @click="$emit('tab-click')"
  >
    <slot name="header" />
    <b-button
      variant="light"
      class="button-only-icon"
      @click.stop="$emit('tab-close')"
    >
      <span class="material-icons">close</span>
    </b-button>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

@Component
export default class ModalTabHeader extends Vue {
  @Prop({ type: Boolean, default: false }) isActive!: boolean;
  @Prop({ type: Boolean, default: false }) onlyTab!: boolean;
}
</script>

<style lang="scss" scoped>

  .nested-menu {
    width: 100%;
  }

  .modal__tab_header {
    width: 100%;
    display: flex;
    padding: 2px;
    flex: 1 1 auto;
    overflow-x: hidden;

    &.is-mobile {
      min-width: 80%;
    }
  }

  .modal__tab_header_title {
    font-weight: 600;
    font-size: 1.25em;
    margin-right: auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:focus {
      outline: none;
    }
  }

  .modal__tab_header.selected,
  .modal__tab_header:hover {
    border-color: var(--MainBorderColor);
    cursor: pointer;
  }

  .modal__tab_header.only_tab {
    border-color: transparent;
    cursor: grab;
  }

  .modal__tab_header:not(.only_tab) {
    border-left: 1px solid var(--MainBorderColor);
    cursor: grab;

    &:not(.selected) {
      background-color: var(--default-borderColor, #eaeaea);
      cursor: pointer;
    }
  }

  .modal__tab_close_button {
    visibility: hidden;
    line-height: 1.25em;
    background: none;
    border: none;
    cursor: pointer;
    float: right;
  }

  .modal__tab_header.selected > .modal__tab_close_button,
  .modal__tab_header:hover > .modal__tab_close_button {
    visibility: visible;
    cursor: pointer;
  }

  .modal__tab_header.only_tab > .modal__tab_close_button {
    display: none;
  }
</style>
