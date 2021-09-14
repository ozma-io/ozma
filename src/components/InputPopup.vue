<template>
  <fragment>
    <template v-if="mode === 'modal'">
      <fragment>
        <Modal
          :show="showContent"
          fullscreen
          @opened="onOpenModal"
          @close="closeModal"
        >
          <div class="modal-slots">
            <div class="header">
              <div class="label">
                {{ label }}
              </div>
            </div>

            <div class="modal-field-slot">
              <slot
                :mode="mode"
                :isOpen="true"
                location="in_popup"
              />
            </div>
            <div class="modal-inner-slot">
              <slot
                name="inner"
                modal
                location="in_popup"
                :autofocus="showContent"
              />
            </div>
          </div>
        </Modal>

        <div class="input-field-wrapper" @click="showContent = true">
          <slot
            :mode="mode"
            :isOpen="false"
            location="out_of_popup"
          />
        </div>
      </fragment>
    </template>

    <template v-else-if="mode === 'popup'">
      <popper
        ref="popup"
        trigger="clickToToggle"
        transition="fade"
        enter-active-class="fade-enter fade-enter-active"
        leave-active-class="fade-leave fade-leave-active"
        :disabled="disabled"
        :visible-arrow="false"
        :options="popperOptions"
        @show="onOpenPopup"
        @hide="onClosePopup"
      >
        <!-- eslint-disable vue/no-deprecated-slot-attribute -->
        <!-- TODO: Find or make not deprecated popper.js wrapper -->
        <div slot="reference" class="input-field-wrapper">
          <slot
            :mode="mode"
            :isOpen="showContent"
            location="out_of_popup"
          />
        </div>
        <!-- eslint-enable vue/no-deprecated-slot-attribute -->
        <div class="popper popup border rounded shadow">
          <div v-if="compactMode" class="popup-field-slot">
            <slot
              :mode="mode"
              :isOpen="true"
              location="in_popup"
            />
          </div>

          <div class="popup-inner-slot">
            <slot name="inner" />
          </div>
        </div>
      </popper>
    </template>
  </fragment>
</template>

<script lang="ts">
import Popper from "vue-popperjs";
import { Portal } from "portal-vue";

import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import Modal from "@/components/modal/Modal.vue";

type Mode = "popup" | "modal";

@Component({ components: { Popper, Modal, Portal } })
export default class InputPopup extends Vue {
  @Prop({ type: Boolean, default: false }) disabled!: boolean;
  @Prop({ type: String, default: null }) label!: string | null;
  @Prop({ type: Object, default: () => {} }) popperOptions!: any;
  @Prop({ type: Boolean, default: false }) compactMode!: boolean;
  private showContent = false;

  get mode(): Mode {
    return this.$isMobile ? "modal" : "popup";
  }

  @Watch("showContent")
  private updateShowContent() {
    this.$emit("update:showContent", this.showContent);
  }

  async openPopup() {
    if (this.disabled) return;

    await (this.$refs.popup as any)?.doShow();
  }

  async closePopup() {
    if (this.disabled) return;

    await (this.$refs.popup as any)?.doClose();
    this.showContent = false;
  }

  closeModal() {
    this.showContent = false;
  }

  onOpenModal() {
  }

  private onOpenPopup() {
    this.showContent = true;
    this.$emit("popup-opened");
  }

  private onClosePopup() {
    this.showContent = false;
    this.$emit("popup-closed");
  }

  updatePopper() {
    (this.$refs.popup as any)?.updatePopper();
  }
}
</script>

<style lang="scss" scoped>
  .modal-slots {
    position: relative;
    height: 100%;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background-color: var(--default-backgroundDarker1Color);
  }

  .header {
    margin-bottom: 0.5rem;
    flex: 0 0 0%;
  }

  .modal-field-slot {
    flex: 0 0 auto;
    max-height: 20%; /* Euristic number to fit everything on mobiles with opened keyboard */
  }

  .modal-inner-slot {
    flex: 1 1;
    height: 0;
  }

  .popup {
    max-width: 98%;
    width: 25rem;
    max-height: 15rem;
    display: flex;
    flex-direction: column;

    .popup-field-slot {
      height: 0;
      max-height: 5rem;
      overflow-y: auto;
      flex: 0 0;
    }

    .popup-inner-slot {
      flex: 1 1;
      height: 0;
    }
  }

  .label {
    font-size: 1.5rem;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .close-button-wrapper {
    padding: 0.5rem;
    display: flex;
    justify-content: flex-end;
  }
</style>
