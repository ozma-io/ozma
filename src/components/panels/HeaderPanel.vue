<template>
  <div
    :class="[
      'header-panel',
      {
        'is-root': type === 'root',
      },
    ]"
  >
    <div class="first-row">
      <div class="left-part d-flex align-items-center">
        <div v-if="$slots['left-slot']" class="left-slot">
          <slot name="left-slot" />
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
              },
            ]"
          >
            {{ $ustOrEmpty(title) }}
          </h2>
        </div>
      </div>

      <div class="right-part">
        <ButtonsPanel
          v-if="helpButtons.length > 0"
          :buttons="helpButtons"
          @goto="$emit('goto', $event)"
        />
        <SearchPanel
          v-if="isEnableFilter"
          class="search-panel"
          :filter-string="filterString"
          @update:filter-string="$emit('update:filter-string', $event)"
        />
        <ArgumentEditor
          v-if="!$isMobile && argumentEditorProps"
          :userView="argumentEditorProps.userView"
          :applyArguments="argumentEditorProps.applyArguments"
        />
        <ButtonsPanel
          v-if="!$isMobile && headerButtons.length > 0"
          :buttons="headerButtons"
          @goto="$emit('goto', $event)"
        />
        <ButtonsPanel
          v-if="fullscreenButtons.length > 0"
          :buttons="fullscreenButtons"
          @goto="$emit('goto', $event)"
        />
        <ButtonsPanel :buttons="extraButtons" @goto="$emit('goto', $event)" />
        <div v-if="$slots['right-slot']" class="right-slot">
          <slot name="right-slot" />
        </div>
      </div>
    </div>
    <div v-if="$isMobile && (headerButtons.length > 0 || Object.keys(argumentEditorProps?.userView.argumentsMap ?? {}).length > 0)" class="second-row">
      <ButtonsPanel
        class="second-row-button-panel"
        :buttons="headerButtons"
        @goto="$emit('goto', $event)"
      />
      <ArgumentEditor
        v-if="argumentEditorProps"
        :userView="argumentEditorProps.userView"
        :applyArguments="argumentEditorProps.applyArguments"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import Popper from "vue-popperjs";

import type { IUserViewType } from "@/components/FormControl.vue";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import type { Button } from "@/components/buttons/buttons";
import { buttonsToPanelButtons } from "@/components/buttons/buttons";
import SearchPanel from "@/components/SearchPanel.vue";
import { interfaceButtonVariant } from "@/utils_colors";
import { UserString } from "@/state/translations";
import ArgumentEditor, {
  IArgumentEditorProps,
} from "@/components/ArgumentEditor.vue";

const isHelpButton = (button: Button) => button.icon === "help_outline";

@Component({
  components: {
    SearchPanel,
    ButtonItem,
    Popper,
    ArgumentEditor,
  },
})
export default class HeaderPanel extends Vue {
  @Prop() title!: UserString | undefined;
  @Prop({ type: Array, required: true }) buttons!: Button[];
  @Prop({ type: Boolean, required: true }) isEnableFilter!: boolean;
  @Prop({ type: Object }) view!: IUserViewType | undefined;
  @Prop({ type: String, required: true }) filterString!: string;
  @Prop({ type: Boolean, default: false }) isLoading!: boolean;
  @Prop({ type: Object }) argumentEditorProps!: IArgumentEditorProps | null;
  @Prop({ type: String }) type!: "root" | "modal" | "nested" | undefined;

  get extraButtons() {
    return [buttonsToPanelButtons(this.buttons).extraButton];
  }
  get fullscreenButtons() {
    return this.fullscreenButton ? [this.fullscreenButton] : [];
  }
  // We want help button in a different place so we separate it from the rest.
  get helpButtons() {
    return buttonsToPanelButtons(this.buttons).panelButtons.filter(isHelpButton);
  }
  get headerButtons() {
    return buttonsToPanelButtons(this.buttons).panelButtons.filter(button => !isHelpButton(button));
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
        target: this.type === "modal" ? "top" : "root",
        query: this.view,
      },
    };
  }
}
</script>

<style lang="scss" scoped>
.header-panel {
  width: 100%;
  padding: 0.5rem;
  padding-top: 0.65rem;
  padding-right: 0.25rem; /* Other 0.25rem is from .buttons-panel margins, otherwise outline on click shows incorrectly */
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  @include mobile {
    padding: 0.5rem 0 0.5rem 0;
  }
}
.first-row {
  flex-grow: 1;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: stretch;
  overflow-x: hidden;
  color: var(--default-foregroundColor);
}
.second-row {
  padding: 0 0.75rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;

  .second-row-button-panel {
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;

    ::v-deep {
      .button-element {
        flex-shrink: 0;
        flex-grow: 0;

        &:first-child {
          margin-left: auto;
        }
      }
    }
  }
}

.left-part {
  overflow: hidden;
  flex: 1 0 13rem;
  @include mobile {
    flex: 1 0 0;
  }

  > .left-slot {
    /* Looks like it should be a padding, but due to `overflow-hidden` mechanic it must be margin,
         see https://foobartel.com/tilrs/overflow-x-and-borders */
    margin: 0.25rem;
    margin-left: 0.5rem;
    flex-shrink: 0;
  }
}

.middle-part {
  padding: 0.25rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  overflow-x: hidden;
  @include mobile {
    padding-left: 0;
  }

  .userview-title {
    flex: 0 1 auto;
  }
}

.right-part {
  padding-left: 0.25rem;
  padding-right: 0.75rem;
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @include mobile {
    overflow-x: hidden;
  }

  ::v-deep .button-element {
    flex-shrink: 0;
  }

  .search-panel {
    flex-shrink: 0;
  }

  /* ArgumentEditor's selector */
  ::v-deep > span {
    flex-shrink: 0;
  }
}

::v-deep .buttons-panel {
  flex-shrink: 0;
}

.userview-title-wrapper {
  padding-right: 0.25rem;
  display: flex;
  flex-direction: row;
  align-items: center;
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

.fullscreen_button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--MainTextColor);
}
</style>
