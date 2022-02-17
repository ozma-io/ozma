<i18n>
    {
        "en": {
            "click_anywhere": "You can click anywhere outside of modal window to close it"
        },
        "ru": {
            "click_anywhere": "Для закрытия модального окна можно нажать в любое место за его пределами"
        }
    }
</i18n>

<template>
  <!-- "window" class is used to detect active windows to limit v-click-outside. See also `Table.vue:isClickWithinThisWindow`. -->
  <VueModal
    adaptive
    class="tabbed-modal window"
    :width="modalWidth"
    :height="modalHeight"
    :min-width="200"
    :min-height="100"
    :pivot-y="0.8"
    :name="uid"
    transition="tabbed-modal-transiton"
    :resizable="!$isMobile"
    :draggable="$isMobile ? false : '.tab-headers'"
    @before-close="beforeClose"
    @opened="$emit('opened')"
  >
    <div v-if="$isMobile" class="mobile-close-button-wrapper">
      <span class="material-icons">close</span>
    </div>

    <!-- eslint-disable vue/no-deprecated-slot-attribute -->
    <div v-else slot="top-right">
      <div
        v-b-tooltip.hover.left.noninteractive="{
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
      <ButtonsPanel
        v-if="!$isMobile"
        class="main-buttons"
        :buttons="mainButtons"
        @goto="$emit('goto', $event)"
      />

      <div
        v-if="hasTabs"
        :class="[
          'tab-headers',
          { 'is-mobile': $isMobile },
        ]"
      >
        <ModalTabHeader
          v-for="(tab, index) in modalTabs"
          :key="index"
          :is-active="index === selectedTab"
          :title="tab.title"
          :only-tab="modalTabs.length === 1"
          @tab-click="switchTab(index)"
          @tab-close="$emit('tab-close', index)"
        >
          <template #header>
            <ModalContent :nodes="tab.header" />
          </template>
        </ModalTabHeader>
      </div>
    </div>

    <div
      v-if="hasTabs"
      :class="[
        'content',
        {
          'fullscreen': fullscreen || $isMobile,
          'is-mobile': $isMobile,
        }
      ]"
    >
      <div
        v-for="(tab, index) in modalTabs"
        v-show="index === selectedTab"
        :key="index"
        :class="[
          'tab-content',
          { 'is-mobile': $isMobile },
        ]"
      >
        <ModalContent :nodes="tab.content" />
      </div>
    </div>
    <div
      v-if="!hasTabs"
      :class="[
        'content',
        {
          'fullscreen': fullscreen || $isMobile,
          'is-mobile': $isMobile,
        }
      ]"
    >
      <slot />
    </div>
  </VueModal>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

import ModalContent from "@/components/modal/ModalContent";
import ModalTabHeader from "@/components/modal/ModalTabHeader.vue";
import { IModalTab } from "@/components/modal/types";
import { interfaceButtonVariant } from "@/utils_colors";
import { Button } from "../buttons/buttons";

@Component({ components: { ModalContent, ModalTabHeader } })
export default class Modal extends Vue {
  @Prop({ type: Array }) modalTabs!: IModalTab[] | undefined;
  @Prop({ type: Boolean, default: true }) show!: boolean;
  @Prop({ type: Boolean, default: false }) fullscreen!: boolean;
  @Prop({ type: String }) width!: string;
  @Prop({ type: String }) height!: string;
  @Prop({ type: Number, default: 0 }) startingTab!: number;

  private selectedTab = 0;

  private mounted() {
    this.watchIsOpen();
  }

  @Watch("show")
  private watchIsOpen() {
    if (this.show) {
      this.$modal.show(this.uid);
    } else {
      this.$modal.hide(this.uid);
    }
  }

  @Watch("startingTab", { immediate: true })
  private changeStartingTab() {
    this.selectedTab = this.startingTab;
    this.fixupTab();
  }

  @Watch("modalTabs")
  private changeModalTabs() {
    this.fixupTab();
  }

  private fixupTab() {
    if (this.modalTabs &&
        this.modalTabs.length > 0 &&
        this.selectedTab >= this.modalTabs.length) {
      this.selectedTab = this.modalTabs.length - 1;
    }
  }

  private get mainButtons(): Button[] {
    return [
      {
        type: "callback",
        icon: "arrow_back",
        variant: interfaceButtonVariant,
        callback: () => this.$emit("go-back-window"),
      },
    ];
  }

  // Event is not typed for vue-js-modal
  private beforeClose(ev: any) {
    if (this.show) {
      ev.cancel();
    }
    this.$emit("close");
  }

  private switchTab(index: number) {
    if (index < this.modalTabs!.length) {
      this.selectedTab = index;
    }
  }

  // Used on mobile to display editing inputs
  private get hasTabs(): boolean {
    return this.modalTabs !== undefined;
  }

  private get modalWidth(): string {
    return this.$isMobile && this.fullscreen
      ? window.innerWidth > 512 ? `512px` : "100%"
      : this.$isMobile
        ? "100%"
        : this.fullscreen ? "100%" : this.width;
  }

  private get modalHeight(): string {
    return (this.fullscreen || this.$isMobile)
      ? "100%"
      : this.height;
  }

  private get currentTabContent(): Vue | string {
    return R.pathOr("No Content", [this.selectedTab, "content"], this.modalTabs);
  }
}
</script>

<style lang="scss" scoped>
  .main-buttons {
    margin-left: 0.25rem;
    margin-right: 0.25rem;
    flex-shrink: 0;
  }

  .mobile-close-button-wrapper {
    position: fixed;
    top: 0.25rem;
    right: 0.25rem;
    padding: 0.15rem;
    background-color: var(--default-backgroundDarker1Color);
    line-height: 0;
    border-radius: 10rem;
    pointer-events: none;
  }

  .desktop-close-button-wrapper {
    background-color: var(--default-backgroundDarker1Color);
    padding: 0.5rem;
    line-height: 0;
    border-radius: 10rem;
  }

  .tab-headers {
    width: 100%;
    display: flex;
    flex-direction: row;
    overflow-x: hidden;

    &.is-mobile {
      overflow: auto;
    }
  }

  .content {
    overflow: auto;
    height: 100%;
  }

  .fullscreen {
    width: 100%;
    height: 100%;
    padding: 0;
    overflow: hidden;
  }

  .tabbed-modal ::v-deep > .vm--modal {
    background-color: var(--default-backgroundDarker1Color);
    color: var(--MainTextColor);
    border-radius: 1rem;
    display: flex;
    flex-flow: column nowrap;
    flex-grow: 1;
    margin-top: 38px;
    max-height: 95% !important;
  }

  .tab-content {
    height: 100%;

    &.is-mobile {
      height: 100%;
    }
  }

  ::v-deep {
    .tabbed-modal-transition-enter-active,
    .tabbed-modal-transition-leave-active {
      transition: opacity 0.4s, transform 0.4s;
    }

    .tabbed-modal-transition-enter,
    .tabbed-modal-transition-leave-to {
      opacity: 0;
      transform: translateY(5rem);
    }
  }
</style>
