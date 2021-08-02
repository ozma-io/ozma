<template>
  <VueModal
    :width="modalWidth"
    :height="modalHeight"
    :min-width="200"
    :min-height="100"
    :pivot-y="0.8"
    :name="uid"
    :classes="[
      'v--modal',
      {
        'is-mobile': $isMobile,
        'is-nested': isNestedModal,
      }
    ]"
    transition="fade-move"
    :resizable="!$isMobile"
    :draggable="$isMobile ? false : '.modal__tab_headers'"
    @before-close="beforeClose"
    @opened="$emit('opened')"
  >
    <div v-if="$isMobile" class="close-button-wrapper">
      <span class="material-icons">close</span>
    </div>

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
          'modal__tab_headers',
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
        'modal__content',
        {
          'modal__content__fullscreen': fullscreen,
          'is-mobile': $isMobile,
        }
      ]"
    >
      <div
        v-for="(tab, index) in modalTabs"
        v-show="index === selectedTab"
        :key="index"
        :class="[
          'modal__tab-content',
          { 'is-mobile': $isMobile },
        ]"
      >
        <ModalContent :nodes="tab.content" />
      </div>
    </div>
    <div
      v-if="!hasTabs"
      :class="[
        'modal__content',
        {
          'modal__content__fullscreen': fullscreen,
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
import { Component, InjectReactive, Prop, ProvideReactive, Vue, Watch } from "vue-property-decorator";

import ModalContent from "@/components/modal/ModalContent";
import ModalTabHeader from "@/components/modal/ModalTabHeader.vue";
import { IModalTab } from "@/components/modal/types";
import { getColorVariables } from "@/utils_colors";
import { homeLink } from "@/utils";
import { Button } from "../buttons/buttons";

@Component({ components: { ModalContent, ModalTabHeader } })
export default class Modal extends Vue {
  @Prop({ type: Array }) modalTabs!: IModalTab[] | undefined;
  @Prop({ type: Boolean, default: true }) show!: boolean;
  @Prop({ type: Boolean, default: false }) fullscreen!: boolean;
  @Prop({ type: String }) width!: string;
  @Prop({ type: String }) height!: string;
  @Prop({ type: Number, default: 0 }) startingTab!: number;

  // `isNestedModal` is undefined in root modal and `true` in nested.
  @InjectReactive() isNestedModal!: true | undefined;
  @ProvideReactive("isNestedModal") provideIsNestedModal = true;

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
        variant: "interfaceButton",
        colorVariables: getColorVariables("button", "interfaceButton"),
        callback: () => this.$emit("go-back-window"),
      },
      {
        type: "link",
        icon: "home",
        variant: "interfaceButton",
        colorVariables: getColorVariables("button", "interfaceButton"),
        link: homeLink,
      },
    ];
  }

  // Event is not typed for vue-js-modal
  private beforeClose(ev: any) {
    if (this.show) {
      ev.stop();
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
    return (this.fullscreen || this.$isMobile)
      ? "100%"
      : this.width;
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

  .close-button-wrapper {
    position: fixed;
    top: 0.25rem;
    right: 0.25rem;
    padding: 0.15rem;
    background-color: var(--default-backgroundDarker1Color);
    line-height: 0;
    border-radius: 10rem;
    pointer-events: none;
  }

  .modal__tab_headers {
    width: 100%;
    display: flex;
    flex-direction: row;
    overflow-x: hidden;

    &.is-mobile {
      overflow: auto;
    }
  }

  .modal__content {
    overflow: auto;
    height: 100%;
  }

  .modal__content ::v-deep .view-form {
    width: 100%;
  }

  .modal__content__fullscreen {
    width: 100%;
    height: 100%;
    padding: 0;
    overflow: hidden;
  }
</style>

<style lang="scss">
  /* styles for vue-js-modal.
    It's their naming so don't touch this
    if you refactor styles */
  .v--modal-box.v--modal {
    background-color: var(--default-backgroundDarker1Color);
    color: var(--MainTextColor);
    border-radius: 1rem;
    display: flex;
    flex-flow: column nowrap;
    flex-grow: 1;

    &.is-mobile {
      position: absolute;

      /* VueModal writes these styles in element's inline style,
        so !important is required */
      top: auto !important;
      bottom: 0 !important;
      height: calc(100% - 3rem) !important;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;

      &.is-nested {
        height: calc(100% - 6rem) !important;
      }
    }
  }

  .v--modal-overlay {
    height: 100% !important;
  }

  .v--modal-background-click {
    &,
    .v--modal-overlay {
      height: 100% !important;
    }
  }

  .modal__tab-content {
    height: 100%;

    &.is-mobile {
      height: 100%;
    }
  }

  .fade-move-enter-active,
  .fade-move-leave-active {
    transition: opacity 0.4s, transform 0.4s;
  }

  .fade-move-enter,
  .fade-move-leave-to {
    opacity: 0;
    transform: translateY(5rem);
  }
</style>
