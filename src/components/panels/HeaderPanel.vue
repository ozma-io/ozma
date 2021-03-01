<template>
  <div class="header-panel p-1">
    <div class="d-flex align-items-center">
      <slot name="main-buttons" />
      <label 
        class="input_label"
        v-b-tooltip.click.blur.bottom.noninteractive
        :title="title"
      >
        {{ title }}
      </label>
    </div>

    <ButtonsPanel
      :buttons="buttons"
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
          class="btn-sm lh-0-5 p-0-5"
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
  @Prop({ type: Array, required: true }) panelButtons!: Button[];
  @Prop({ type: Boolean, required: true }) isEnableFilter!: boolean;
  @Prop({ type: Object, default: null }) view!: IUserViewType;
  @Prop({ type: String, required: true }) filterString!: string;

  get buttons() {
    return buttonsToPanelButtons(this.panelButtons);
  }

  private openFullscreen() {
    if (this.view !== null) {
      void router.push(queryLocation(this.view));
    }
  }
}

</script>

<style scoped>
  .header-panel {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .input_label {
    margin: 1px 2px 0;
    margin-right: auto;
    font-weight: 600;
    font-size: 1.25em;
    color: var(--MainTextColor);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fullscreen_button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--MainTextColor);
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .input_label {
        max-width: 150px;
      }
    }
  }
</style>
