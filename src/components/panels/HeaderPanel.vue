<template>
  <div
    :class="[
      'header-panel',
      {
        'is-root': isRoot,
      },
    ]"
  >
    <div
      class="left-part d-flex align-items-center"
    >
      <div v-if="$slots['main-buttons']" class="main-buttons">
        <slot name="main-buttons" />
      </div>
      <label
        v-b-tooltip.click.blur.bottom.noninteractive
        :class="[
          'input_label',
          {
            'is-loading': isLoading,
          }
        ]"
        :title="title"
      >{{ title }}</label>
    </div>

    <ButtonsPanel
      :buttons="headerButtons"
      @goto="$emit('goto', $event)"
    >
      <template #search-panel>
        <SearchPanel
          v-if="isEnableFilter"
          class="search-panel"
          :filter-string="filterString"
          @update:filterString="$emit('update:filterString', $event)"
        />
        <!--
        <ButtonItem :button="fullscreenButton" />
        <b-button
          v-if="view !== null"
          variant="light"
          class="button-only-icon"
          :style="buttonVariables"
          @click.stop="openFullscreen()"
        >
          <span class="material-icons">fullscreen</span>
        </b-button>
        -->
      </template>
    </ButtonsPanel>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import type { IUserViewType } from "@/components/FormControl.vue";
import { queryLocation } from "@/state/query";
import { router } from "@/modules";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import type { Button } from "@/components/buttons/buttons";
import { buttonsToPanelButtons } from "@/components/buttons/buttons";
import SearchPanel from "@/components/SearchPanel.vue";
import { getColorVariables } from "@/utils_colors";

@Component({
  components: {
    SearchPanel,
    ButtonItem,
  },
})
export default class HeaderPanel extends Vue {
  @Prop({ type: String, required: true }) title!: string;
  @Prop({ type: Array, required: true }) buttons!: Button[];
  @Prop({ type: Boolean, required: true }) isEnableFilter!: boolean;
  @Prop({ type: Object, default: null }) view!: IUserViewType;
  @Prop({ type: String, required: true }) filterString!: string;
  @Prop({ type: Boolean, default: false }) isLoading!: boolean;
  @Prop({ type: Boolean, default: false }) isRoot!: boolean; // Is it TopLevelUserView's header or current tab of modal.

  get headerButtons() {
    const buttons = buttonsToPanelButtons(this.buttons);
    if (this.fullscreenButton) {
      buttons.push(this.fullscreenButton);
    }
    return buttons;
  }

  private get fullscreenButton(): Button | null {
    return this.view === null
      ? null
      : {
        type: "callback",
        variant: "interfaceButton",
        colorVariables: getColorVariables("button", "interfaceButton"),
        icon: "fullscreen",
        callback: () => this.openFullscreen(),
      };
  }

  private openFullscreen() {
    if (this.view !== null) {
      void router.push(queryLocation(this.view));
    }
  }
}

</script>

<style lang="scss" scoped>
  .header-panel {
    flex-grow: 1;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: stretch;
    overflow-x: hidden;

    &.is-root {
      padding: 0 0.25rem;
      background-color: var(--interface-backgroundColor);
      color: var(--interface-foregroundColor);
      border-bottom: 1px solid var(--interface-borderColor);
    }
  }

  .left-part {
    overflow-x: hidden;

    > .main-buttons {
      /* Looks like it should be a padding, but due to `overflow-hidden` mechanic it must be margin,
         see https://foobartel.com/tilrs/overflow-x-and-borders */
      margin: 0.25rem;
      margin-left: 0;
      flex-shrink: 0;
    }
  }

  ::v-deep .buttons-panel {
    flex-shrink: 0;
  }

  .input_label {
    margin: 0.25rem;
    margin-left: 0;
    margin-right: auto;
    font-weight: 600;
    font-size: 1.25em;
    color: var(--MainTextColor);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre;

    &.is-loading {
      color: var(--MainTextColorLight);
      opacity: 0.6;
    }
  }

  .search-panel {
    margin-right: 0.25rem;
  }

  .fullscreen_button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--MainTextColor);
  }
</style>
