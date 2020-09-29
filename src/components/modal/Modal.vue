<template>
  <VueModal
    :width="modalWidth"
    :height="modalHeight"
    :name="uid"
    @before-close="beforeClose"
    @opened="$emit('opened')"
  >
    <template #top-right>
      <input
        type="button"
        value="close"
        class="material-icons modal__close_button"
        @click="$emit('close')"
      >
    </template>
    <div
      v-if="hasTabs"
      class="modal__tab_headers"
    >
      <ModalTabHeader
        v-for="(tab, index) in modalTabs"
        :key="index"
        :is-active="index === selectedTab"
        :title="tab.title"
        :only-tab="modalTabs.length === 1"
        @tab-click="switchTab(index)"
        @tab-close="$emit('tab-close', index)"
        @tab-fullscreen="$emit('tab-fullscreen', index)"
      />
    </div>
    <div
      v-if="hasTabs"
      class="modal__content"
    >
      <div
        v-for="(tab, index) in modalTabs"
        v-show="index === selectedTab"
        :key="index"
        class="modal__tab-content"
      >
        <ModalContent :nodes="tab.content" />
      </div>
    </div>
    <div
      v-if="!hasTabs"
      :class="['modal__content', {'modal__content__fullscreen': fullscreen }]"
    >
      <slot name="content" />
    </div>
  </VueModal>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { valueIsNull } from "@/values";

import ModalContent from "@/components/modal/ModalContent";
import ModalTabHeader from "@/components/modal/ModalTabHeader.vue";
import { IModalTab } from "@/components/modal/types";
import { isMobile } from "../../utils";

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
    if (this.modalTabs && this.modalTabs.length > 0 && this.selectedTab >= this.modalTabs.length) {
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

  private get hasTabs(): boolean {
    return this.modalTabs !== undefined;
  }

  private get modalWidth(): string {
    if (this.fullscreen || isMobile) {
      return "100%";
    }
    return this.width;
  }

  private get modalHeight(): string {
    if (this.fullscreen) {
      return "100%";
    }
    if (isMobile) {
      return "95%";
    }
    return this.height;
  }

  private get currentTabContent(): Vue | string {
    return R.pathOr("No Content", [this.selectedTab, "content"], this.modalTabs);
  }
}
</script>

<style scoped>
  .modal__tab_headers {
    display: flex;
    flex-direction: row;
    padding: 5px 10px 0 10px;
  }

  .modal__close_button {
    border: none;
    right: 20px;
    top: 20px;
    position: absolute;
    background: white;
    border-radius: 50%;
    padding: 5px;
  }

  .modal__content {
    padding: 10px;
    overflow: auto;
    height: 80vh;
    border-top: 1px solid var(--MainBorderColor);
  }

  .modal__content >>> .view-form {
    width: 100%;
  }

  .modal__content__fullscreen {
    width: 100%;
    height: 100%;
    padding: 0;
    overflow: hidden;
  }
</style>

<style>
  /* styles for vue-js-modal.
    It's their naming so don't touch this
    if you refactor styles */
  .v--modal-box.v--modal {
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColor);
    border-radius: 3px;
    border: 1px solid var(--MainBorderColor);
    display: flex;
    flex-flow: column nowrap;
    flex-grow: 1;
  }

  @media screen and (max-width: 768px) {
    .v--modal-box.v--modal {
      height: 90vh;
    }

    .v--modal-background-click {
      display: flex;
      align-items: flex-end;
    }
  }

  .modal__tab-content {
    height: calc(100% - 45px);
  }
</style>

