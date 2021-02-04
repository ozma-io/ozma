<template>
  <div
    v-if="actions.length > 0"
    class="nested-menu"
  >
    <label class="input_label">{{ usedCaption }}</label>

    <ButtonsPanel
      :buttons="panelButtons"
      @goto="$emit('goto', $event)"
    >
      <template #search-panel>
        <SearchPanel
          v-if="enableFilter"
          @update:filterString="$emit('update:filterString', $event)"
        />
      </template>
      <template #actions-menu>
        <ActionsMenu
          :actions="actions"
          :buttons="panelButtons"
          menu-align="right"
          @goto="$emit('goto', $event)"
        />
        <i
          class="material-icons material-button fullscreen_button"
          @click.stop="openFullscreen(inputType)"
        >fullscreen</i>
      </template>
    </ButtonsPanel>
  </div>
  <div v-else-if="inputType.name == 'empty_userview'">
    <div class="nested-menu">
      <label class="input_label">{{ usedCaption }}</label>
      <ActionsMenu
        :actions="[]"
        menu-align="right"
      />
    </div>
    <div class="empty_userview_text">
      {{ inputType.text }}
    </div>
  </div>
  <div v-else class="input_label__container">
    <label class="input_label_single">{{ usedCaption }}</label>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Action } from "@/components/ActionsMenu.vue";
import type { IType, IUserViewType } from "@/components/FormControl.vue";
import { queryLocation } from "@/state/query";
import { router } from "@/modules";
import { PanelButton } from "@/components/ButtonsPanel.vue";

@Component({
  components: {
    SearchPanel: () => import("@/components/SearchPanel.vue"),
  },
})
export default class NestedUserViewPanel extends Vue {
  @Prop({ type: String, required: true }) usedCaption!: string;
  @Prop({ type: Array, required: true }) actions!: Action[];
  @Prop({ type: Boolean, required: true }) enableFilter!: boolean;
  @Prop({ type: Object, required: true }) inputType!: IType;
  @Prop({ type: Array, required: true }) panelButtons!: PanelButton[];

  private openFullscreen(view: IUserViewType) {
    void router.push(queryLocation(view));
  }
}

</script>

<style scoped>
  .nested-menu {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .input_label {
    margin-bottom: 3px;
    color: var(--MainTextColor);
    font-weight: 600;
    font-size: 1.25em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre;
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
