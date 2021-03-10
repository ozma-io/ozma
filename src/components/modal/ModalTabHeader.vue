<template>
  <div
    :class="['modal__tab_header', {'selected': isActive, 'only_tab': onlyTab}]"
    @click="$emit('tab-click')"
  >
    <b-button
      variant="light"
      class="btn-sm lh-0-5 p-0-5"
      @click="$router.go(-1)"
    >
      <span class="material-icons">arrow_back</span>
    </b-button>
    <router-link
      :to="{ name: 'main' }"
    >
      <b-button
        variant="light"
        class="btn-sm lh-0-5 p-0-5"
      >
        <span class="material-icons">home</span>
      </b-button>
    </router-link>
    <slot name="header" />
    <b-button
      variant="light"
      class="btn-sm lh-0-5 p-0-5"
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
    cursor: pointer;
    border-top: 1px solid;
    border-left: 1px solid;
    border-right: 1px solid;
    border-color: transparent;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    align-items: center;
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

    &:not(.selected) {
      /* TODO: remove hardcoded color */
      background-color: #eaeaea;
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
