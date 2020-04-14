<i18n>
    {
        "en": {
            "input_placeholder": "Empty"
        },
        "ru": {
            "input_placeholder": "Пусто"
        }
    }
</i18n>
<template>
  <fragment>
    <textarea-autosize
      v-if="isCellEdit"
      ref="controlTextarea"
      :placeholder="$t('input_placeholder')"
      :value="value"
      rows="1"
      :min-height="144"
      :max-height="144"
      :class="['textarea_field', {
        'textarea_field__disabled': disabled,
        'textarea-field_cell-edit': isCellEdit,
        'textarea_field__desktop': !isMobile,
      }]"
      @keydown.enter.prevent
      @input="updateInput"
    />
    <textarea
      v-show="!isCellEdit"
      :id="inputName"
      ref="control"
      :class="['textarea_field', {
        'textarea_field__disabled': disabled,
        'textarea_field__desktop': !isMobile,
      }]"
      :type="type"
      :value="value"
      :placeholder="$t('input_placeholder')"
      :disabled="disabled"
      :rows="rows"
      @focus="onFocus"
      @blur="onBlur"
      @input="$emit('update:value', $event.target.value)"
    />
  </fragment>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import { isMobile } from "@/utils";

@Component
export default class Textarea extends Vue {
  @Prop({ type: String }) label!: string;
  @Prop({ type: String }) value!: string;
  @Prop({ type: String }) error!: string;
  @Prop({ type: String }) warning!: string;
  @Prop({ type: Number }) height!: number;
  @Prop({ type: Boolean }) disabled!: boolean;
  @Prop({ type: Number, default: 5 }) rows!: number;
  @Prop({ type: Boolean, default: true }) inline!: boolean;
  @Prop({ type: String, default: "text" }) type!: string;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({type: Boolean, default: false}) isCellEdit!: boolean;

  private focused = false;
  private modalValue: string = this.value;
  private isModalOpen = false;

  private dummyHeight = 0;
  private dummyWidth = 0;

  private mounted() {
    const control = this.$refs.control as HTMLInputElement;
    const controlTextareaElement = this.$refs.controlTextarea as any;
    this.dummyHeight = control.clientHeight;
    this.dummyWidth = control.clientWidth;

    if (this.autofocus) {
      Vue.nextTick().then(() => {
        if (this.isCellEdit) {
          controlTextareaElement.$el.focus();
        } else {
          control.focus();
        }
      });
    }
  }

  private get isMobile(): boolean {
    return isMobile();
  }

  private get inputName(): string {
    return `${this.uid}-input`;
  }

  private updateInput(value: string) {
    this.$emit('update:value', value);
    this.setInputHeight();
  }

  private setInputHeight() {
    const controlTextareaElement = this.$refs.controlTextarea as any;
    setTimeout(() => {
      this.$emit("setInputHeight", controlTextareaElement.$el.clientHeight);
    }, 0);
  }

  private get hasContent(): boolean {
    return this.value.length > 0;
  }

  private get style() {
    return {
      height: `${this.dummyHeight}px`,
      width: `${this.dummyWidth}px`,
    };
  }

  private onFocus(evt: HTMLInputElement) {
    const controlElement = this.$refs.control as HTMLTextAreaElement | undefined;
    if (controlElement) {
      controlElement.selectionStart = this.value ? this.value.length : 0;
    }
    if (!this.isMobile) {
      this.positionField();
      this.focused = true;
    }
    this.$emit("focus", evt);
  }

  private onBlur(evt: HTMLInputElement) {
    this.focused = false;
  }

  private positionField() {
    const controlElement = this.$refs.control as HTMLElement;
    const dummyElement = this.$refs.dummy as HTMLElement;
    const leftPosition = controlElement.getBoundingClientRect().left;
    const rightPosition = controlElement.getBoundingClientRect().right;
    const maxWidth = 600;
    const maxHeight = 300;

    const screenWidth = document.documentElement.clientWidth - 15;
    // const screenHeight = document.documentElement.clientHeight - 15;

    const expandLeft = leftPosition + maxWidth + 15 < screenWidth;
    const expandRight = rightPosition - maxWidth + 15 < screenWidth;
    if (expandLeft) {
      controlElement.style.left = "0";
      controlElement.style.right = "initial";
    } else if (expandRight) {
      controlElement.style.right = "0";
      controlElement.style.left = "initial";
    }

    if (dummyElement) {
      dummyElement.style.height = `${this.dummyHeight}px`;
      dummyElement.style.width = `${this.dummyWidth}px`;
    }
  }
}
</script>

<style lang="scss" scoped>
  .textarea_field_container {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    color: var(--MainTextColor);
    width: 100%;
    height: 100%;
  }

  .input_label {
    color: var(--MainTextColorLight);
    opacity: 0.7;
  }

  .textarea_label {
    align-self: flex-start;
    margin-right: 15px;
    opacity: 0.7;
  }

  .textarea_field {
    padding: 0;
    background-color: rgba(0, 0, 0, 0);
    z-index: 2;
    order: 2;
    flex: 2;
    width: 100%;
    resize: none;
    height: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre-wrap;
    border: 1px solid transparent;
    color: var(--MainTextColor);
    transition: all 300ms ease-in-out, height 300ms ease-in-out;
  }

  .textarea_field::placeholder {
    color: var(--MainTextColorLight);
  }

  .textarea_field:hover {
    overflow-y: auto;
  }

  .textarea_field:focus {
    outline: none;
    width: 100%;
  }

  .textarea_field__desktop {
    padding: 5px;
  }

  .textarea_field__desktop:focus {
    outline: none;
    background-color: var(--MainBackgroundColor);
    height: calc(100% + 100px);
    transition: all 300ms ease-in-out, height 300ms ease-in-out;
    overflow: auto;
    z-index: 10;
    border: 1px solid var(--MainBorderColor);
  }

  .textarea_field__desktop:hover {
    border: 1px solid var(--MainBorderColor);
  }

  .textarea-field_cell-edit {
    border: none;
  }

  .textarea-field_cell-edit:focus {
    border: none;
  }

  .textarea-field_cell-edit:hover {
    border: none;
  }

  .textarea_field__disabled {
    cursor: not-allowed;
  }

  .input_modal_field {
    color: var(--MainTextColor);
    background-color: var(--MainBackgroundColor);
  }

  .input_modal_label {
    color: var(--MainTextColor);
    margin: 5px;
  }

  .input_modal__input_group {
    display: flex;
    flex-direction: column;
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

  .modal_textarea_field {
    position: initial !important;
    width: 100% !important;
    border-left: none !important;
    border-right: none !important;
    box-sizing: content-box;
    padding: 5px;
  }

  .textarea_dummy_focus {
    padding: 5px 0 5px 0;
  }
</style>
