<i18n>
  {
    "en": {
      "filters": "Filters"
    },
    "ru": {
      "filters": "Фильтры"
    },
    "es": {
      "filters": "Filtros"
    }
  }
</i18n>

<template>
  <div
    :class="[
      'header-panel',
      {
        'is-root': type === 'root',
      },
    ]"
  >
    <div
      class="left-part d-flex align-items-center"
    >
      <div v-if="$slots['main-buttons']" class="main-buttons">
        <slot name="main-buttons" />
      </div>
      <div v-if="title && type === 'root'" class="middle-part">
        <!-- `tabindex` is required for closing tooltip on blur -->
        <h1
          v-b-tooltip.click.blur.bottom.noninteractive.viewport
          tabindex="0"
          :class="[
            'userview-title',
            {
              'is-loading': isLoading,
            }
          ]"
        >
          {{ $ustOrEmpty(title) }}
        </h1>
        <ButtonItem
          v-if="filtersButton"
          class="filters-button"
          :button="filtersButton"
        />
      </div>
      <div
        v-else
        class="userview-title-wrapper"
      >
        <h2
          v-b-tooltip.click.blur.bottom.noninteractive.viewport
          tabindex="0"
          :title="$ustOrEmpty(title)"
          :class="[
            'userview-title',
            {
              'is-loading': isLoading,
            }
          ]"
        >
          {{ $ustOrEmpty(title) }}
        </h2>
        <ButtonItem
          v-if="filtersButton"
          class="filters-button"
          :button="filtersButton"
        />
      </div>
    </div>

    <div class="right-part">
      <ButtonsPanel
        :buttons="headerButtons"
        @goto="$emit('goto', $event)"
      >
        <template #search-panel>
          <SearchPanel
            v-if="isEnableFilter"
            class="search-panel"
            :filter-string="filterString"
            @update:filter-string="$emit('update:filter-string', $event)"
          />
        </template>
      </ButtonsPanel>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import type { IUserViewType } from "@/components/FormControl.vue";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import type { Button } from "@/components/buttons/buttons";
import { buttonsToPanelButtons } from "@/components/buttons/buttons";
import SearchPanel from "@/components/SearchPanel.vue";
import { interfaceButtonVariant, outlinedInterfaceButtonVariant } from "@/utils_colors";
import { UserString } from "@/state/translations";

@Component({
  components: {
    SearchPanel,
    ButtonItem,
  },
})
export default class HeaderPanel extends Vue {
  @Prop() title!: UserString | undefined;
  @Prop({ type: Array, required: true }) buttons!: Button[];
  @Prop({ type: Boolean, required: true }) isEnableFilter!: boolean;
  @Prop({ type: Object }) view!: IUserViewType | undefined;
  @Prop({ type: String, required: true }) filterString!: string;
  @Prop({ type: Boolean, default: false }) isLoading!: boolean;
  @Prop({ type: Boolean, default: false }) showFiltersButton!: boolean;
  // Is it TopLevelUserView's header or current tab of modal or component (sub UserView).
  // options: 'component', 'modal' ,'root', null
  @Prop({ type: String }) type!: string | undefined;

  get headerButtons() {
    const buttons = buttonsToPanelButtons(this.buttons);
    if (this.fullscreenButton) {
      buttons.push(this.fullscreenButton);
    }
    return buttons;
  }

  private get filtersButton(): Button | null {
    if (!this.showFiltersButton) {
      return null;
    }

    return {
      // TODO: Add 'expand' icon on the right to match design from Figma.
      type: "callback",
      variant: outlinedInterfaceButtonVariant,
      icon: "tune",
      caption: this.$t("filters").toString(),
      callback: () => this.$emit("filters-button-clicked"),
    };
  }

  private get fullscreenButton(): Button | null {
    if (!this.view) {
      return null;
    }
    return {
      type: "link",
      variant: interfaceButtonVariant,
      icon: "fullscreen",
      link: {
        type: "query",
        target: (this.type === "modal") ? "top" : "root",
        query: this.view,
      },
    };
  }
}

</script>

<style lang="scss" scoped>
  .header-panel {
    padding: 0.5rem;
    padding-top: 0.65rem;
    padding-right: 0.25rem; /* Other 0.25rem is from .buttons-panel margins, otherwise outline on click shows incorrectly */
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
    flex: 1 0 13rem;

    > .main-buttons {
      /* Looks like it should be a padding, but due to `overflow-hidden` mechanic it must be margin,
         see https://foobartel.com/tilrs/overflow-x-and-borders */
      margin: 0.25rem;
      flex-shrink: 0;
    }
  }

  .middle-part {
    padding: 0.25rem;

    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    overflow-x: hidden;

    .userview-title {
      flex: 0 1 auto;
    }

    .filters-button {
      flex: 0 0 auto;
    }
  }

  .right-part {
    overflow-x: auto;
    overflow-y: hidden;
    display: flex;

    ::v-deep .button-element {
      flex-shrink: 0;
    }
  }

  ::v-deep .buttons-panel {
    margin: 0 0.25rem;
    flex-shrink: 0;
  }

  .userview-title-wrapper {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    overflow-x: hidden;
  }

  .userview-title {
    margin: 0.5rem;
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
      padding-left: 0.7rem;
      white-space: nowrap;
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
