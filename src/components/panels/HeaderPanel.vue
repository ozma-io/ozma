<template>
  <div
    ref="headerPanel"
    :class="[
      'header-panel',
      {
        'is-root': type === 'root',
        compact: useCompactLayout,
      },
    ]"
  >
    <div class="first-row">
      <div class="left-part d-flex align-items-center">
        <div v-if="$slots['left-slot']" class="left-slot">
          <slot name="left-slot" />
        </div>
        <div v-if="title && type === 'root'" class="middle-part">
          <div v-if="isLoading" class="title-placeholder" />
          <!-- `tabindex` is required for closing tooltip on blur -->
          <h1
            v-else
            v-b-tooltip.click.blur.bottom.noninteractive.viewport
            tabindex="0"
            class="userview-title"
          >
            {{ $ustOrEmpty(title) }}
          </h1>
        </div>
        <div v-else class="userview-title-wrapper">
          <div v-if="isLoading" class="title-placeholder" />
          <h2
            v-else
            v-b-tooltip.click.blur.bottom.noninteractive.viewport
            tabindex="0"
            :title="$ustOrEmpty(title)"
            class="userview-title"
          >
            {{ $ustOrEmpty(title) }}
          </h2>
        </div>
      </div>

      <div class="right-part">
        <div v-if="isLoading && type === 'root'" class="placeholder-buttons">
          <div
            v-for="index in $isMobile ? 1 : 3"
            :key="index"
            class="placeholder-button"
          />
        </div>
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
          v-if="!useCompactLayout && argumentEditorProps"
          :userView="argumentEditorProps.userView"
          :applyArguments="argumentEditorProps.applyArguments"
        />
        <ButtonsPanel
          v-if="!useCompactLayout && headerButtons.length > 0"
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
    <div
      v-if="
        useCompactLayout &&
        (headerButtons.length > 0 ||
          Object.keys(argumentEditorProps?.userView.argumentsMap ?? {}).length >
            0)
      "
      class="second-row"
    >
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
import { Component, Vue, Prop } from 'vue-property-decorator'
import Popper from 'vue-popperjs'

import { debounceTillAnimationFrame } from '@/utils'
import type { IUserViewType } from '@/components/FormControl.vue'
import ButtonItem from '@/components/buttons/ButtonItem.vue'
import type { Button } from '@/components/buttons/buttons'
import { buttonsToPanelButtons } from '@/components/buttons/buttons'
import SearchPanel from '@/components/SearchPanel.vue'
import { interfaceButtonVariant } from '@/utils_colors'
import { UserString, isOptionalUserString } from '@/state/translations'
import ArgumentEditor, {
  IArgumentEditorProps,
} from '@/components/ArgumentEditor.vue'

const isHelpButton = (button: Button) => button.icon === 'help_outline'

@Component({
  components: {
    SearchPanel,
    ButtonItem,
    Popper,
    ArgumentEditor,
  },
})
export default class HeaderPanel extends Vue {
  @Prop({ validator: isOptionalUserString }) title!: UserString | undefined
  @Prop({ type: Array, required: true }) buttons!: Button[]
  @Prop({ type: Boolean, required: true }) isEnableFilter!: boolean
  @Prop({ type: Object }) view!: IUserViewType | undefined
  @Prop({ type: String, required: true }) filterString!: string
  @Prop({ type: Boolean, default: false }) isLoading!: boolean
  @Prop({ type: Object }) argumentEditorProps!: IArgumentEditorProps | null
  @Prop({ type: String }) type!: 'root' | 'modal' | 'nested' | undefined

  get extraButtons() {
    return [buttonsToPanelButtons(this.buttons).extraButton]
  }
  get fullscreenButtons() {
    return this.fullscreenButton ? [this.fullscreenButton] : []
  }
  // We want help button in a different place so we separate it from the rest.
  get helpButtons() {
    return buttonsToPanelButtons(this.buttons).panelButtons.filter(isHelpButton)
  }
  get headerButtons() {
    return buttonsToPanelButtons(this.buttons).panelButtons.filter(
      (button) => !isHelpButton(button),
    )
  }

  private get fullscreenButton(): Button | null {
    if (!this.view) {
      return null
    }
    return {
      type: 'link',
      variant: interfaceButtonVariant,
      icon: 'fullscreen',
      link: {
        type: 'query',
        target: this.type === 'modal' ? 'top' : 'root',
        query: this.view,
      },
    }
  }

  private useCompactLayout = false
  private panelResizeObserver: ResizeObserver | null = null
  private onPanelResize() {
    const breakpoint = 480
    const ref = this.$refs['headerPanel'] as HTMLElement | undefined
    const panelWidth = ref?.offsetWidth ?? breakpoint
    this.useCompactLayout = panelWidth < breakpoint
  }
  private mounted() {
    if (this.$refs['headerPanel']) {
      /* eslint-disable-next-line @typescript-eslint/unbound-method */
      this.panelResizeObserver = new ResizeObserver(
        debounceTillAnimationFrame(() => this.onPanelResize()),
      )
      this.panelResizeObserver.observe(this.$refs['headerPanel'] as HTMLElement)
    }
  }
}
</script>

<style lang="scss" scoped>
.header-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  padding-top: 0.65rem;
  padding-right: 0.25rem; /* Other 0.25rem is from .buttons-panel margins, otherwise outline on click shows incorrectly */
  width: 100%;
  &.compact {
    padding: 0.5rem 0 0.5rem 0;
  }
}
.first-row {
  display: flex;
  flex-grow: 1;
  flex-direction: row;
  justify-content: space-between;
  align-items: stretch;
  overflow-x: hidden;
  color: var(--default-foregroundColor);
}
.second-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0 0.75rem;

  .second-row-button-panel {
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;

    ::v-deep {
      .button-element {
        flex-grow: 0;
        flex-shrink: 0;

        &:first-child {
          margin-left: auto;
        }
      }
    }
  }
}

.left-part {
  flex: 1 0 13rem;
  overflow: hidden;
  .compact & {
    flex: 1 0 0;
  }

  > .left-slot {
    flex-shrink: 0;
    /* Looks like it should be a padding, but due to `overflow-hidden` mechanic it must be margin,
         see https://foobartel.com/tilrs/overflow-x-and-borders */
    margin: 0.25rem;
    margin-left: 0.5rem;
  }
}

.middle-part {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;
  overflow-x: hidden;
  .compact & {
    padding-left: 0;
  }

  .userview-title {
    flex: 0 1 auto;
  }
}

.right-part {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-right: 0.75rem;
  padding-left: 0.25rem;
  overflow-x: auto;
  overflow-y: hidden;

  .compact & {
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
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding-right: 0.25rem;
  overflow-x: hidden;
}

.title-placeholder {
  margin: 0.5rem;
  margin-right: auto;
  border-radius: 1.8125rem;
  background: #efefef;
  width: 15rem;
  max-width: 100%;
  height: 1.25rem;
}

.userview-title {
  margin: 0.5rem;
  margin-right: auto;
  margin-left: 0;
  overflow: hidden;
  color: var(--MainTextColor);
  font-weight: 600;
  font-size: 1.25rem;
  text-overflow: ellipsis;
  white-space: pre;

  .header-panel:not(.is-root) & {
    padding-left: 0.7rem;
    white-space: nowrap;
  }
}

.fullscreen_button {
  cursor: pointer;
  border: none;
  background: none;
  color: var(--MainTextColor);
}

.placeholder-buttons {
  display: flex;
  gap: 0.5rem;
}
.placeholder-button {
  border-radius: 0.5rem;
  background-color: #efefef;
  width: 5rem;
  height: 2rem;
}
</style>
