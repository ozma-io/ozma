<i18n>
    {
        "en": {
            "data_will_load_after_save": "(Data will load after save)"
        },
        "ru": {
            "data_will_load_after_save": "(Данные загрузятся после сохранения)"
        }
    }
</i18n>

<template>
  <div v-if="header.name==='nested-empty'">
    <div class="nested-menu">
      <label
        v-b-tooltip.click.blur.bottom.noninteractive
        class="input_label"
        :title="title"
      >
        {{ title }}
      </label>
      <ActionsMenu
        menu-align="right"
        :actions="[]"
      />
    </div>
    <div class="empty_userview_text">
      {{ $t('data_will_load_after_save') }}
    </div>
  </div>
  <div
    v-else-if="header.name==='nested' || header.name==='modal'"
    class="nested-menu"
  >
    <label
      v-b-tooltip.click.blur.bottom.noninteractive
      class="input_label"
      :title="title"
    >
      {{ title }}
    </label>
    <ButtonsPanel
      :buttons="header.buttons"
      @goto="$emit('goto', $event)"
    >
      <template #search-panel>
        <SearchPanel
          v-if="header.isEnableFilter"
          @update:filterString="$emit('update:filterString', $event)"
        />
      </template>
      <template #actions-menu>
        <ActionsMenu
          :actions="header.actions"
          :buttons="header.buttons"
          menu-align="right"
          @goto="$emit('goto', $event)"
        />
        <i
          class="material-icons material-button fullscreen_button"
          @click.stop="openFullscreen()"
        >fullscreen</i>
      </template>
    </ButtonsPanel>
  </div>
  <div
    v-else
    class="input_label__container"
  >
    <label class="input_label_single">{{ title }}</label>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Action } from "@/components/ActionsMenu.vue";
import type { IUserViewType } from "@/components/FormControl.vue";
import { queryLocation } from "@/state/query";
import { router } from "@/modules";
import { PanelButton } from "@/components/ButtonsPanel.vue";
import SearchPanel from "@/components/SearchPanel.vue";

export interface INestedEmptyHeader {
  name: "nested-empty";
}

export interface INestedHeader {
  name: "nested";
  actions: Action[];
  buttons: PanelButton[];
  isEnableFilter: boolean;
}

export interface IModalHeader {
  name: "modal";
  actions: Action[];
  buttons: PanelButton[];
  isEnableFilter: boolean;
}

export type Header = INestedHeader | INestedEmptyHeader | IModalHeader;

@Component({
  components: {
    SearchPanel,
  },
})
export default class HeaderPanel extends Vue {
  @Prop({ type: String, required: true }) title!: string;
  @Prop({ type: Object, required: true }) header!: Header;
  @Prop({ type: Object, default: null }) view!: IUserViewType;

  private openFullscreen() {
    if (this.view !== null) {
      void router.push(queryLocation(this.view));
    }
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
    margin-bottom: 0;
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
