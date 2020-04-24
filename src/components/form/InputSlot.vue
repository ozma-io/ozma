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
    :class="[
      'input_slot',
      {'input_slot__row': inline, 'input-slot_cell-edit': isCellEdit}
    ]"
  >
    <Modal
      v-if="isMobile"
      :show="isModalOpen"
      :name="`${uid}-field-modal`"
      fullscreen
      @opened="onModalOpen"
      @close="onModalClose"
    >
      <template #content>
        <div class="input_modal__input_group">
          <div>
            <slot
              name="input-modal"
              :onChange="onChange"
              :value="modalValue"
            />
          </div>
          <div class="input_modal__button_container">
            <button
              type="button"
              class="input_modal__button__ok"
              @click="updateValueFromModal"
            >
              {{ $t('ok') }}
            </button>
            <button
              type="button"
              class="input_modal__button__cancel"
              @click="closeModal"
            >
              {{ $t('cancel') }}
            </button>
          </div>
        </div>
      </template>
    </Modal>
    <b-col
      v-if="label"
      :cols="inline ? 4 : 12"
      class="input_label__container"
    >
      <label
        v-if="label"
        :class="['input_label', { 'input_label__focused': focused }]"
        :for="inputName"
        :title="label"
      >{{ label }}</label>
    </b-col>
    <b-col
      :cols="(!!label && inline) ? 8 : 12"
      :class="['input_container', {'input_container_cell-edit': isCellEdit}]"
    >
      <slot
        name="input"
        :onFocus="onFocus"
      />
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { IAction } from "@/components/ActionsMenu.vue";
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";

import { isMobile, getTextWidth } from "@/utils";

import Modal from "@/components/modal/Modal.vue";
import Input from "@/components/form/Input.vue";

@Component({ components: { Modal, Input } })
export default class InputSlot extends Vue {
  @Prop({ type: String }) label!: string;
  @Prop() value!: any;
  @Prop({ type: String }) error!: string;
  @Prop({ type: String }) warning!: string;
  @Prop({ type: Number }) height!: number;
  @Prop({ type: Array }) actions!: IAction[];
  @Prop({ type: Boolean }) disabled!: boolean;
  @Prop({ type: Boolean, default: true }) inline!: boolean;
  @Prop({ type: String, default: "text" }) type!: string;
  @Prop({ type: Boolean, default: false }) autoOpen!: boolean;
  @Prop({type: Boolean, default: false}) isCellEdit!: boolean;

  private focused = false;
  private modalValue: any = this.value || null;
  private isModalOpen = false;

  private mounted() {
    if (this.autoOpen && this.isMobile) {
      this.isModalOpen = true;
    }
  }

  @Watch("value")
  private onValueUpdate(value: string) {
    this.modalValue = value;
  }

  private get inputName(): string {
    return `${this.uid}-input`;
  }

  private get hasContent(): boolean {
    if (typeof this.value === "string") {
      return this.value.length > 0;
    } else { return !!this.value; }
  }

  private get isMobile(): boolean {
    return isMobile();
  }

  private onModalOpen() {
    this.$nextTick(() => {
      if (this.$refs.controlModal) {
        const control = this.$refs.controlModal as HTMLElement;
        control.focus();
      }
    });
  }

  private onModalClose() {
    this.modalValue = this.value;
    this.isModalOpen = false;
    this.$emit("closeModalInput");
  }

  private onFocus() {
    if (this.isMobile) {
      this.isModalOpen = true;
    }
  }

  private onChange(value: string) {
    this.modalValue = value;
  }

  private updateValueFromModal() {
    this.$emit("update:value", this.modalValue);
    this.closeModal();
  }

  private closeModal() {
    this.focused = false;
    this.isModalOpen = false;
  }
}
</script>

<style lang="scss" scoped>
  .input_slot {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    color: var(--MainTextColor);
    width: 100%;
    padding-left: 15px;
  }

  .input_slot__row {
    flex-direction: row;
    margin-bottom: 10px;
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

  .input_container {
    padding-left: 0;
  }

  .input_container_cell-edit {
    padding-right: 0;
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
    padding-bottom: 50px;
    height: 100%;
    justify-content: space-between;
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

</style>
