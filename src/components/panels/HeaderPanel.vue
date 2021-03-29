<template>
  <div class="header-panel">
    <div class="left-part d-flex align-items-center">
      <slot name="main-buttons" />
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
          :filter-string="filterString"
          @update:filterString="$emit('update:filterString', $event)"
        />
        <b-button
          v-if="view !== null"
          variant="light"
          class="button-only-icon"
          @click.stop="openFullscreen()"
        >
          <span class="material-icons">fullscreen</span>
        </b-button>
      </template>
    </ButtonsPanel>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import type { IUserViewType } from "@/components/FormControl.vue";
import { queryLocation } from "@/state/query";
import { router } from "@/modules";
import type { Button } from "@/components/buttons/buttons";
import { buttonsToPanelButtons } from "@/components/buttons/buttons";
import SearchPanel from "@/components/SearchPanel.vue";

@Component({
  components: {
    SearchPanel,
  },
})
export default class HeaderPanel extends Vue {
  @Prop({ type: String, required: true }) title!: string;
  @Prop({ type: Array, required: true }) buttons!: Button[];
  @Prop({ type: Boolean, required: true }) isEnableFilter!: boolean;
  @Prop({ type: Object, default: null }) view!: IUserViewType;
  @Prop({ type: String, required: true }) filterString!: string;
  @Prop({ type: Boolean, default: false }) isLoading!: boolean;

  get headerButtons() {
    return buttonsToPanelButtons(this.buttons);
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
    width: 100%;
    padding: 0.125rem;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: stretch;
  }

  .left-part {
    overflow: hidden;
  }

  .input_label {
    margin: 1px 2px 0;
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

  .fullscreen_button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--MainTextColor);
  }
</style>
