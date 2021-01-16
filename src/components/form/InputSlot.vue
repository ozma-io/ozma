<i18n>
    {
    "en": {
        "ok": "OK",
        "cancel": "Cancel"
        },
    "ru": {
        "ok": "ОК",
        "cancel": "Отмена"
        }
    }
</i18n>
<template>
  <b-row
    :class="{'input_slot__row': inline, 'input-slot_cell-edit': isCellEdit}"
  >
    <Modal
      v-if="modal"
      :show="isModalOpen"
      fullscreen
      @opened="onModalOpen"
      @close="onModalClose"
    >
      <template #content>
        <div class="input_modal__input_group">
          <div>
            <slot
              :onFocus="emptyHandler"
              modal
              :autofocus="isModalOpen"
            />
          </div>
          <div class="input_modal__button_container">
            <button
              type="button"
              class="input_modal__button__ok"
              @click="closeModal"
            >
              {{ $t('ok') }}
            </button>
          </div>
        </div>
      </template>
    </Modal>
    <template v-if="!(modalOnly && modal)">
      <b-col
        v-if="label"
        :cols="inline ? 4 : 12"
      >
        <div class="input_label__container">
          <label
            v-if="label"
            :class="['input_label', { 'input_label__focused': focused }]"
            :for="inputName"
            :title="label"
          >{{ label }}</label>
        </div>
      </b-col>
      <b-col
        :cols="(!!label && inline) ? 8 : 12"
        :class="['input_container', `text_align_${textAlign}`, {'input_container_cell-edit': isCellEdit}]"
      >
        <slot
          :onFocus="onNonmodalFocus"
        />
      </b-col>
    </template>
  </b-row>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import Modal from "@/components/modal/Modal.vue";
import Input from "@/components/form/Input.vue";

@Component({ components: { Modal, Input } })
export default class InputSlot extends Vue {
  @Prop({ type: String }) label!: string;
  @Prop({ type: Boolean, default: true }) inline!: boolean;
  // FIXME: remove this and style parent nodes instead.
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;
  @Prop({ type: String }) backgroundColor!: string;
  @Prop({ type: String, default: "left" }) textAlign!: string;
  @Prop({ type: Boolean, default: false }) modal!: boolean;
  @Prop({ type: Boolean, default: false }) modalOnly!: boolean;

  private focused = false;
  private isModalOpen = false;

  private created() {
    if (this.modalOnly && this.modal) {
      this.isModalOpen = true;
    }
  }

  private get inputName(): string {
    return `${this.uid}-input`;
  }

  private onModalOpen() {
    this.$nextTick(() => {
      if (this.$refs.controlModal) {
        const control = this.$refs.controlModal as HTMLElement;
        control.focus();
      }
    });
  }

  private emptyHandler() {
  }

  private onModalClose() {
    this.isModalOpen = false;
    this.$emit("close-modal-input");
  }

  private onNonmodalFocus() {
    if (this.modal) {
      this.isModalOpen = true;
    }
  }

  private closeModal() {
    this.focused = false;
    this.isModalOpen = false;
  }
}
</script>

<style lang="scss" scoped>
  .input_slot__row {
    flex-direction: row;
  }

  .input_label__container {
    padding: 0;
    display: flex;
    height: 2em;
  }

  .input_label {
    align-self: center;
    margin-bottom: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.7;
    white-space: pre;
    cursor: question;
    color: var(--MainTextColorLight);
  }

  .input_label__focused::after {
    content: "";
    position: absolute;
    width: 100%;
    bottom: 1px;
    z-index: -1;
    transform: scale(0.9);
    box-shadow: 0 0 8px 2px #000;
  }

  .input_container_cell-edit {
    padding: 0;
  }

  .input_modal_label {
    color: var(--MainTextColor);
    margin: 5px;
  }

  .input-slot_cell-edit {
    padding: 0;
    margin: 0;
  }

  .input_modal__input_group {
    display: flex;
    flex-direction: column;
    height: auto;
    position: relative;
    top: 40%;
    padding: 0 5%;
    background-color: var(--MainBackgroundColor);
  }

  .input_modal__button__ok,
  .input_modal__button__cancel {
    outline: none;
    border: 0;
    padding: 10px 18px;
    cursor: pointer;
    color: var(--MainTextColor);
    box-shadow: 0 4px 8px var(--MainBorderColor);
    background: var(--MainBackgroundColor);
    font-weight: 600;
    width: 100%;
    border-radius: 0;
    margin-top: 5px;
  }

  .input_modal__button__ok {
    background-color: var(--SuccessColor);
  }

  .input_modal__button__cancel {
    background-color: var(--FailColor);
  }

  .v--modal-overlay {
    z-index: 1000;
  }

  .text_align_right {
    text-align: right;
  }

  .text_align_left {
    text-align: left;
  }
</style>
