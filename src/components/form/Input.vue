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
    <div
      v-if="!isCellEdit"
      ref="inputMaxWidthSizeMeter"
      class="input__max-width-size-meter"
    />
    <input
      v-if="!isCellEdit"
      :id="id"
      ref="control"
      :class="['input-field',
               {
                 'disabled': disabled,
                 'focused': focused,
                 'unfocused': !focused,
                 'error': error,
                 'required': required && isEmpty,
                 'cell-edit': isCellEdit,
                 'with-qr-code': qrcodeInput,
               }
      ]"
      autocomplete="off"
      :type="type"
      :value="value"
      :placeholder="$t('input_placeholder')"
      :disabled="disabled"
      @keydown.enter.prevent
      @input="updateInput"
      @focus="onFocus"
      @blur="onBlur"
    >
    <textarea-autosize
      v-if="isCellEdit"
      ref="controlTextarea"
      :placeholder="$t('input_placeholder')"
      :value="value"
      :readonly="disabled"
      rows="1"
      class="input-textarea"
      @keydown.enter.prevent
      @input="updateInputCellEdit"
      @focus="onFocus"
    />
    <span
      v-if="qrcodeInput"
      class="material-icons qr_code"
      @click="openQRCodeScanner = !openQRCodeScanner"
    >
      qr_code_2
    </span>
    <QRCodeScanner
      :open-scanner="openQRCodeScanner"
      @update:scanResult="updateInputCellEdit"
    />
  </fragment>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { valueIsNull } from "@/values";
import Textarea from "@/components/form/Textarea.vue";
import QRCodeScanner from "@/components/qrcode/QRCodeScanner.vue";

@Component({
  components: { Textarea, QRCodeScanner },
})
export default class Input extends Vue {
  @Prop({ type: String }) label!: string;
  @Prop() value!: any;
  @Prop({ type: Boolean }) error!: boolean;
  @Prop({ type: Boolean }) required!: boolean;
  @Prop({ type: String }) warning!: string;
  @Prop({ type: Number }) height!: number;
  @Prop({ type: Boolean }) disabled!: boolean;
  @Prop({ type: String }) id!: string;
  @Prop({ type: Boolean, default: true }) inline!: boolean;
  @Prop({ type: String, default: "text" }) type!: string;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  // FIXME: remove this and style parent nodes instead.
  // Perhaps we need "autosize" prop instead?
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;
  @Prop({ type: Boolean, default: false }) qrcodeInput!: boolean;

  private focused = false;
  private maxInputWidth = 0;
  private openQRCodeScanner = false;

  private get isEmpty(): boolean {
    return valueIsNull(this.value);
  }

  private mounted() {
    const controlElement = this.$refs.control as HTMLInputElement;
    if (this.autofocus) {
      void Vue.nextTick().then(() => {
        if (this.isCellEdit) {
          const controlTextareaElement = this.$refs.controlTextarea as any;
          controlTextareaElement.$el.focus();
          this.setCursorPositionEnd(controlTextareaElement.$el);
          this.setInputHeight();
        } else {
          controlElement.focus();
        }
      });
    }
  }

  @Watch("value")
  private onValueUpdate(value: string) {
    this.setInputHeight();
    if (!this.$isMobile && !this.isCellEdit) {
      this.updateWidth(value);
    }
  }

  @Watch("autofocus")
  private onAutofocus(autofocus: boolean) {
    if (autofocus) {
      const control = this.$refs.control as HTMLInputElement;
      if (control) {
        control.focus();
      }
    }
  }

  private get maxWidth(): number {
    const controlElement = this.$refs.control as HTMLInputElement;
    if (controlElement) {
      const leftPosition = controlElement.getBoundingClientRect().left;
      const screenWidth = document.documentElement.clientWidth - 15;
      const maxWidth = screenWidth - leftPosition;
      return this.maxWidth;
    }
    return 250;
  }

  private get hasContent(): boolean {
    if (typeof this.value === "string") {
      return this.value.length > 0;
    } else {
      return !!this.value;
    }
  }

  private onFocus(evt: Event) {
    this.$emit("focus", evt);
    this.focused = true;
    if (!this.$isMobile) {
      this.updateWidth(this.value);
    }
  }

  private onBlur(evt: Event) {
    this.focused = false;
    if (!this.$isMobile) {
      const control = this.$refs.control as HTMLInputElement;
      if (control !== undefined) {
        control.style.width = "100%";
      }
    }
  }

  private setCursorPositionEnd(controlElement: HTMLInputElement) {
    if (controlElement) {
      controlElement.selectionStart = this.value ? this.value.length : 0;
    }
  }

  private updateInput(value: MouseEvent | any) {
    this.$emit("input", value.target.value);
    this.setInputHeight();
  }

  private updateInputCellEdit(value: string) {
    this.$emit("input", value);
  }

  private setInputHeight() {
    if (this.$refs.controlTextarea) {
      const controlTextareaElement = this.$refs.controlTextarea as any;
      this.$emit("set-input-height", controlTextareaElement.$el.clientHeight);
    }
  }

  private updateWidth(text: string) {
    this.maxInputWidth = (this.$refs.inputMaxWidthSizeMeter as HTMLDivElement).offsetWidth;
    const value = text !== "" ? text : String(this.$t("input_placeholder"));
    const controlElement = this.$refs.control as HTMLInputElement;
    const autosizeMeter = this.$refs.autosizeMeter as HTMLSpanElement;
    const leftPos = controlElement.getBoundingClientRect().left;
    const newWidth = autosizeMeter.scrollWidth >= this.maxInputWidth
      ? autosizeMeter.scrollWidth
      : this.maxInputWidth;
    const rightPos = leftPos + newWidth;
    const viewportWidth = document.documentElement.clientWidth - 10;

    if (rightPos < (viewportWidth - 15)) {
      controlElement.style.width = `${newWidth + 10}px`;
    } else {
      controlElement.style.width = `${viewportWidth - leftPos + 10}px`;
    }
  }
}
</script>

<style lang="scss" scoped>
  .input-textarea {
    padding: 3px;
    border: none;
    resize: none;
    width: 100%;
    display: block;
    overflow: auto !important;
    max-height: 165px;
    background: white;
    text-align: inherit;
    line-height: 1rem;
  }

  .input-textarea-fake {
    opacity: 0;
    position: absolute;
    pointer-events: none;
    width: inherit;
    min-height: 24px;
    word-break: break-all;
  }

  .input-textarea:focus {
    outline: none;
  }

  .input_container {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    color: var(--MainTextColor);
    width: 100%;
    opacity: 0.7;
    padding-left: 15px;
  }

  .input-field {
    width: 100% !important;
    text-align: inherit;
    padding: 0 5px;
    background-color: rgba(0, 0, 0, 0);
    border: 0;
    z-index: 2;
    order: 2;
    flex: 2;
    height: 2em;
    color: var(--MainTextColor);
    cursor: pointer;
    border-bottom: 1px solid var(--MainBorderColor);
    text-overflow: ellipsis;
    transition: border-color 0.2s ease-in;

    &::placeholder {
      color: var(--MainTextColorLight);
    }

    &:hover,
    &:focus {
      background-color: var(--CellSelectColor);
      outline: none;
      color: var(--MainTextColor);
      cursor: text;
      z-index: 2000;
    }

    &.disabled {
      cursor: not-allowed;
    }

    &.required {
      background-color: var(--WarningColor) !important;

      &::placeholder {
        color: var(--WarningPlaceholderColor) !important;
      }
    }

    &.error {
      background-color: var(--FailColor) !important;

      &::placeholder {
        color: var(--FailPlaceholderColor) !important;
      }
    }

    &.cell-edit {
      width: auto;

      &:focus,
      &:hover {
        border-bottom: 1px solid transparent;
      }
    }

    &.with-qr-code {
      padding-right: 25px;
    }
  }

  // .input_field__focused {
  //   position: absolute;
  // }

  .input_container__row {
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

  .input_modal_field {
    color: var(--MainTextColor);
    background-color: var(--MainBackgroundColor);
    padding-right: 5px;
    padding-left: 5px;
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

  .input__max-width-size-meter {
    visibility: hidden;
  }

  .material-icons.qr_code {
    position: absolute;
    cursor: pointer;
    right: 0;

    &:hover {
      opacity: 0.7;
    }
  }
</style>
