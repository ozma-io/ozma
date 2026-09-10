<i18n>
  {
    "en": {
      "click_anywhere": "You can click anywhere outside of modal window to close it"
    },
    "ru": {
      "click_anywhere": "Для закрытия модального окна можно нажать в любое место за его пределами"
    },
    "es": {
      "click_anywhere": "Puede hacer clic en cualquier lugar fuera de la ventana modal para cerrarla"
    }
  }
</i18n>

<template>
  <VueModal
    :adaptive="false"
    class="tabbed-modal"
    :width="modalWidth"
    :height="modalHeight"
    :min-width="minWidth"
    :min-height="100"
    :pivot-y="0.8"
    :name="uid"
    :transition="modalTransition"
    :overlay-transition="modalOverlayTransition"
    :resizable="!$isMobile"
    :draggable="$isMobile ? false : '.tab-headers'"
    @before-close="beforeClose"
    @opened="onOpened"
    @closed="onClosed"
  >
    <div v-if="$isMobile" class="mobile-close-button-wrapper">
      <span class="material-icons">close</span>
    </div>

    <!-- eslint-disable vue/no-deprecated-slot-attribute -->
    <div v-else slot="top-right">
      <div
        v-b-tooltip.hover.d1000.left.noninteractive="{
          title: $t('click_anywhere').toString(),
        }"
        class="desktop-close-button-wrapper"
        @click="$emit('close')"
      >
        <span class="material-icons">close</span>
      </div>
    </div>
    <!-- eslint-enable vue/no-deprecated-slot-attribute -->

    <div class="header d-flex align-items-center">
      <div v-if="hasTabs" :class="['tab-headers', { 'is-mobile': $isMobile }]">
        <ModalTabHeader
          v-for="(tab, index) in displayedTabs"
          :key="tab.key"
          :is-active="index === selectedTab"
          :window-key="tab.key"
          :only-tab="displayedTabs.length === 1"
          @tab-click="switchTab(index)"
          @tab-close="$emit('tab-close', index)"
        >
          <template #header>
            <ModalContent v-if="tab.header" :content="tab.header" />
          </template>
        </ModalTabHeader>
      </div>
    </div>

    <div
      v-if="hasTabs"
      :class="[
        'content',
        {
          fullscreen: fullscreen || $isMobile,
          'is-mobile': $isMobile,
        },
      ]"
    >
      <div
        v-for="(tab, index) in displayedTabs"
        v-show="index === selectedTab"
        :key="tab.key"
        :data-window="tab.key"
        :class="['tab-content', { 'is-mobile': $isMobile }]"
      >
        <ModalContent :content="tab.content" />
      </div>
    </div>
    <div
      v-else
      :data-window="uid"
      :class="[
        'content',
        {
          fullscreen: fullscreen || $isMobile,
          'is-mobile': $isMobile,
        },
      ]"
    >
      <slot />
    </div>
  </VueModal>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { namespace } from 'vuex-class'

import { WindowKey } from '@/state/windows'
import { CurrentSettings } from '@/state/settings'
import ModalContent from '@/components/modal/ModalContent'
import ModalTabHeader from '@/components/modal/ModalTabHeader.vue'
import { IModalTab } from './types'

const windows = namespace('windows')
const settings = namespace('settings')

@Component({ components: { ModalContent, ModalTabHeader } })
export default class TabbedModal extends Vue {
  @windows.Mutation('createWindow') createWindow!: (_: WindowKey) => void
  @windows.Mutation('destroyWindow') destroyWindow!: (_: WindowKey) => void
  @windows.Mutation('activateWindow') activateWindow!: (_: WindowKey) => void
  @settings.State('current') currentSettings!: CurrentSettings

  @Prop({ type: Array }) modalTabs!: IModalTab[] | undefined
  @Prop({ type: Boolean, default: true }) show!: boolean
  @Prop({ type: Boolean, default: false }) fullscreen!: boolean
  @Prop({ type: Boolean, default: true }) overlayBlurEnabled!: boolean
  @Prop({ type: String }) width!: string
  @Prop({ type: Number, default: 200 }) minWidth!: number
  @Prop({ type: String }) height!: string
  @Prop({ type: Number, default: 0 }) startingTab!: number

  private selectedTab = 0
  private frozenModalTabs: IModalTab[] | undefined | null = null
  private closeLockedModalEl: HTMLElement | null = null

  private mounted() {
    if (this.show) {
      this.$modal.show(this.uid)
    }
  }

  @Watch('show')
  private watchShow(show: boolean, oldShow: boolean) {
    if (show === oldShow) return

    if (show) {
      this.frozenModalTabs = null
      this.unlockModalSizeAfterClose()
      this.$modal.show(this.uid)
    } else {
      this.lockModalSizeForClose()
      this.frozenModalTabs = this.modalTabs
      this.$modal.hide(this.uid)
    }
  }

  @Watch('startingTab', { immediate: true })
  private watchStartingTab() {
    this.selectedTab = this.startingTab
    this.fixSelectedTab()
  }

  @Watch('modalTabs')
  private watchModalTabs() {
    this.fixSelectedTab()
  }

  private fixSelectedTab() {
    const tabsCount = this.displayedTabs?.length ?? 0
    if (tabsCount === 0 || this.selectedTab < 0) {
      this.selectedTab = 0
    } else if (this.selectedTab >= tabsCount) {
      this.selectedTab = tabsCount - 1
    }
  }

  @Watch('overlayBlurEnabled')
  private watchOverlayBlurEnabled() {
    this.applyOverlayBlurState()
  }

  @Watch('modalTabs', { deep: true })
  private watchModalTabsForOverlay() {
    this.applyOverlayBlurState()
  }

  @Watch('selectedTab')
  private watchSelectedTabForOverlay() {
    this.applyOverlayBlurState()
  }

  private get displayedTabs(): IModalTab[] | undefined {
    return this.frozenModalTabs === null ? this.modalTabs : this.frozenModalTabs
  }

  get hasTabs() {
    return this.displayedTabs !== undefined
  }

  @Watch('selectedTab', { immediate: true })
  private watchSelectedTab() {
    if (!this.displayedTabs) return

    if (this.displayedTabs.length > 0) {
      const tab = this.displayedTabs[this.selectedTab]
      this.activateWindow(tab.key) // TODO: This activation happens before window creation.
    }
  }

  // Event is not typed for vue-js-modal
  private beforeClose(ev: any) {
    if (this.show) {
      ev.cancel()
      this.lockModalSizeForClose()
      this.$emit('close')
    }
  }

  private get currentModalEl(): HTMLElement | null {
    const root = this.$el as HTMLElement | undefined
    return root?.closest('.vm--modal') as HTMLElement | null
  }

  private get currentOverlayEl(): HTMLElement | null {
    const root = document.body
    const exact = root.querySelector(
      `.vm--overlay[data-modal="${this.uid}"]`,
    ) as HTMLElement | null
    if (exact) return exact

    const modalEl = this.currentModalEl
    if (!modalEl) return null

    const container = modalEl.parentElement
    if (!container) return null

    return container.querySelector('.vm--overlay') as HTMLElement | null
  }

  private get shouldBlurOverlay(): boolean {
    const tabs = this.displayedTabs
    if (tabs && tabs.length > 0) {
      return tabs[this.selectedTab]?.overlayBlurEnabled ?? true
    }
    return this.overlayBlurEnabled
  }

  private applyOverlayBlurState() {
    if (!this.show) return

    const overlayEl = this.currentOverlayEl
    if (!overlayEl) return

    if (this.shouldBlurOverlay) {
      overlayEl.style.removeProperty('backdrop-filter')
      overlayEl.style.removeProperty('-webkit-backdrop-filter')
      return
    }

    overlayEl.style.setProperty('backdrop-filter', 'none')
    overlayEl.style.setProperty('-webkit-backdrop-filter', 'none')
  }

  private resetOverlayBlurState() {
    const overlayEl = this.currentOverlayEl
    if (!overlayEl) return

    overlayEl.style.removeProperty('backdrop-filter')
    overlayEl.style.removeProperty('-webkit-backdrop-filter')
  }

  private lockModalSizeForClose() {
    if (this.closeLockedModalEl) return

    const modalEl = this.currentModalEl
    if (!modalEl) return

    const rect = modalEl.getBoundingClientRect()
    modalEl.style.width = `${rect.width}px`
    modalEl.style.height = `${rect.height}px`
    modalEl.style.maxHeight = `${rect.height}px`
    this.closeLockedModalEl = modalEl
  }

  private unlockModalSizeAfterClose() {
    if (!this.closeLockedModalEl) return

    const modalEl = this.closeLockedModalEl
    modalEl.style.removeProperty('width')
    modalEl.style.removeProperty('height')
    modalEl.style.removeProperty('max-height')
    this.closeLockedModalEl = null
  }

  private switchTab(index: number) {
    this.selectedTab = index
  }

  private get modalWidth(): string {
    return this.$isMobile && this.fullscreen
      ? window.innerWidth > 512
        ? `512px`
        : '100%'
      : this.$isMobile
        ? '100%'
        : this.fullscreen
          ? '100%'
          : this.width
  }

  private get modalHeight(): string {
    return this.fullscreen || this.$isMobile ? '100%' : this.height
  }

  private get uiAnimationsEnabled(): boolean {
    return this.currentSettings.getEntry('ui_animations_enabled', Boolean, true)
  }

  private get modalTransition(): string {
    return this.uiAnimationsEnabled
      ? 'tabbed-modal-transition'
      : 'tabbed-modal-transition-noop'
  }

  private get modalOverlayTransition(): string {
    return this.uiAnimationsEnabled
      ? 'tabbed-modal-overlay-transition'
      : 'tabbed-modal-overlay-transition-noop'
  }

  private onOpened() {
    this.applyOverlayBlurState()
    if (!this.modalTabs) {
      this.createWindow(this.uid)
    }
  }

  private onClosed() {
    this.resetOverlayBlurState()
    this.unlockModalSizeAfterClose()
    this.frozenModalTabs = null
    if (!this.modalTabs) {
      this.destroyWindow(this.uid)
    }
  }

  private beforeDestroy() {
    this.resetOverlayBlurState()
  }
}
</script>

<style lang="scss" scoped>
.mobile-close-button-wrapper {
  position: fixed;
  top: 0.25rem;
  right: 0.25rem;
  border-radius: 10rem;
  background-color: var(--default-backgroundDarker1Color);
  padding: 0.15rem;
  pointer-events: none;
  line-height: 0;
}

.desktop-close-button-wrapper {
  cursor: pointer;
  margin: 0.5rem;
  border-radius: 10rem;
  background-color: var(--default-backgroundDarker1Color);
  padding: 0.5rem;
  line-height: 0;
}

.header {
  border-bottom: 1px solid var(--userview-background-color);
  overflow: hidden;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}

.tab-headers {
  display: flex;
  flex-direction: row;
  width: 100%;
  overflow-x: hidden;

  &.is-mobile {
    overflow: auto;
  }
}

.content {
  height: 100%;
  overflow: auto;
}

.fullscreen {
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.tabbed-modal ::v-deep > .vm--modal {
  display: flex;
  flex-grow: 1;
  flex-flow: column nowrap;
  animation: none !important;
  margin-top: 38px;
  border-radius: 1rem;
  background-color: var(--default-backgroundColor);
  max-height: calc(100% - 38px - 2rem);
  color: var(--MainTextColor);
  box-shadow: 0 20px 60px -2px var(--default-shadowColor);
  backface-visibility: hidden;
  will-change: opacity, transform;

  @include mobile {
    max-height: calc(100% - 38px);
  }
}

.tabbed-modal ::v-deep .modal-content {
  animation: none !important;
}

.tab-content {
  height: 100%;

  &.is-mobile {
    height: 100%;
  }
}

::v-deep {
  .tabbed-modal-overlay-transition-enter-active {
    transition: opacity 0.22s ease-out;
  }

  .tabbed-modal-overlay-transition-leave-active {
    transition: opacity 0.2s ease-in;
  }

  .tabbed-modal-overlay-transition-enter,
  .tabbed-modal-overlay-transition-leave-to {
    opacity: 0;
  }

  .tabbed-modal-transition-enter-active {
    transition:
      opacity 0.24s ease,
      transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: center top;
  }

  .tabbed-modal-transition-leave-active {
    transition: opacity 0.2s ease-in;
    transform-origin: center top;
  }

  .tabbed-modal-transition-enter {
    transform: translateY(0.5rem) scale(0.992);
    opacity: 0;
  }

  .tabbed-modal-transition-leave {
    opacity: 1;
  }

  .tabbed-modal-transition-leave-to {
    opacity: 0;
  }

  .tabbed-modal-transition-leave-active > .vm--modal,
  .tabbed-modal-transition-leave > .vm--modal,
  .tabbed-modal-transition-leave-to > .vm--modal {
    animation: none !important;
    transform: none !important;
    filter: none !important;
  }

  .tabbed-modal-transition-leave-active > .vm--modal {
    transition: opacity 0.2s ease-in !important;
  }

  .tabbed-modal-transition-leave > .vm--modal {
    opacity: 1 !important;
  }

  .tabbed-modal-transition-leave-to > .vm--modal {
    opacity: 0 !important;
  }

  .tabbed-modal-transition-noop-enter-active,
  .tabbed-modal-transition-noop-leave-active,
  .tabbed-modal-overlay-transition-noop-enter-active,
  .tabbed-modal-overlay-transition-noop-leave-active {
    transition: none !important;
  }
}

</style>
