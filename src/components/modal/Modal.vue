<template>
  <VueModal
    :width="modalWidth"
    :height="modalHeight"
    :name="uid"
    :classes="[
      'v--modal',
      { 'is-mobile': $isMobile }
    ]"
    @before-close="beforeClose"
    @opened="$emit('opened')"
  >
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
        <i
          class="material-icons material-button mobile_close_button"
          @click="$emit('close')"
        >close</i>
      </ModalTabHeader>
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
      <slot name="content" />
    </div>
  </VueModal>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

import ModalContent from "@/components/modal/ModalContent";
import ModalTabHeader from "@/components/modal/ModalTabHeader.vue";
import { IModalTab } from "@/components/modal/types";

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
  .modal__tab_headers {
    display: flex;
    flex-direction: row;
    padding: 0;

    &.is-mobile {
      overflow: auto;
    }
  }

  .modal__content {
    overflow: auto;
    height: 100%;
    border-top: 1px solid var(--MainBorderColor);
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

  .mobile_close_button {
    margin-left: 5px;
  }
</style>

<style lang="scss">
  /* styles for vue-js-modal.
    It's their naming so don't touch this
    if you refactor styles */
  .v--modal-box.v--modal {
    top: 5% !important;
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColor);
    border-radius: 3px;
    border: 1px solid var(--MainBorderColor);
    display: flex;
    flex-flow: column nowrap;
    flex-grow: 1;

    &.is-mobile {
      border: none;
      top: auto !important;

      /* VueModal writes :height prop in element's inline style,
        so !important is required */
      height: 100% !important;
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
</style>
