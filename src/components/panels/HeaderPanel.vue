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
      <!-- `tabindex` is required for closing tooltip on blur -->
      <label
        v-b-tooltip.click.blur.bottom.noninteractive.viewport
        tabindex="0"
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
      </template>
    </ButtonsPanel>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import type { IUserViewType } from "@/components/FormControl.vue";
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
        type: "link",
        variant: "interfaceButton",
        colorVariables: getColorVariables("button", "interfaceButton"),
        icon: "fullscreen",
        link: {
          type: "query",
          target: "top",
          query: this.view,
        },
      };
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
    color: var(--default-foregroundColor);
  }

  .left-part {
    overflow: hidden;

    > .main-buttons {
      /* Looks like it should be a padding, but due to `overflow-hidden` mechanic it must be margin,
         see https://foobartel.com/tilrs/overflow-x-and-borders */
      margin: 0.25rem;
      flex-shrink: 0;
    }
  }

  ::v-deep .buttons-panel {
    margin-right: 0.25rem;
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

    .header-panel:not(.is-root) & {
      padding-left: 0.25rem;
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
