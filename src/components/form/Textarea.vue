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
      :readonly="disabled"
      rows="1"
      :class="['textarea_field', {
        'textarea_field__disabled': disabled,
        'textarea-field_cell-edit': isCellEdit,
        'textarea_field__desktop': !$isMobile,
      }]"
      @keydown.enter.prevent
      @input="updateInput"
    />
    <div
      v-else
      :class="['textarea-container', {
        'required': required && isEmpty,
        'error': error,
        'custom-height': height !== null,
      }]"
    >
      <b-form-textarea
        :id="inputName"
        ref="control"
        class="textarea-field"
        size="sm"
        :type="type"
        :style="style"
        :value="value"
        :required="required"
        :placeholder="$t('input_placeholder')"
        :disabled="disabled"
        :rows="textareaRows"
        @focus="onFocus"
        @blur="onBlur"
        @input="$emit('update:value', $event)"
      />
    </div>
  </fragment>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";

import { valueIsNull } from "@/values";

@Component
export default class Textarea extends Vue {
  @Prop({ type: String }) label!: string;
  @Prop({ type: String }) value!: string;
  @Prop({ type: Boolean }) error!: boolean;
  @Prop({ type: Boolean }) required!: boolean;
  @Prop({ type: String }) warning!: string;
  @Prop({ type: Number }) height!: number;
  @Prop({ type: Boolean }) disabled!: boolean;
  @Prop({ type: Number, default: 5 }) rows!: number;
  @Prop({ type: Boolean, default: true }) inline!: boolean;
  @Prop({ type: String, default: "text" }) type!: string;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  // FIXME: remove this and style parent nodes instead.
  // Perhaps we need "autosize" prop instead?
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;

  private focused = false;
  private modalValue: string = this.value;
  private isModalOpen = false;

  private mounted() {
    const control = this.$refs.control as HTMLInputElement;

    void Vue.nextTick().then(() => this.updateAutofocus());
  }

  private updateAutofocus() {
    if (this.autofocus) {
      if (this.isCellEdit) {
        const controlTextareaElement = this.$refs.controlTextarea as any;
        if (!controlTextareaElement) return;
        controlTextareaElement.$el.focus();
        this.setCursorPositionEnd(controlTextareaElement.$el);
      } else {
        const control = this.$refs.control as HTMLInputElement;
        if (!control) return;
        control.focus();
      }
    }
  }

  @Watch("autofocus")
  private onAutofocus(focus: boolean) {
    this.updateAutofocus();
  }

  private get isEmpty(): boolean {
    return valueIsNull(this.value);
  }

  private get inputName(): string {
    return `${this.uid}-input`;
  }

  private updateInput(value: string) {
    this.$emit("update:value", value);
    this.setInputHeight();
  }

  private setInputHeight() {
    const controlTextareaElement = this.$refs.controlTextarea as any;
    setTimeout(() => {
      this.$emit("set-input-height", controlTextareaElement.$el.clientHeight);
    }, 0);
  }

  private get hasContent(): boolean {
    return this.value.length > 0;
  }

  private get textareaRows(): number | null {
    if (this.height) {
      return null;
    }

    return this.rows;
  }

  private get style() {
    if (this.height) {
      return {
        height: `${this.height}px`,
      };
    }
    return null;
  }

  private onFocus(evt: HTMLInputElement) {
    this.setCursorPositionEnd(evt);
    if (!this.$isMobile) {
      this.focused = true;
    }
    this.$emit("focus", evt);
  }

  private onBlur(evt: HTMLInputElement) {
    this.focused = false;
  }

  private setCursorPositionEnd(controlElement: HTMLInputElement) {
    if (controlElement) {
      controlElement.selectionStart = this.value ? this.value.length : 0;
    }
  }
}
</script>

<style lang="scss" scoped>
  .textarea_field {
    z-index: 2;
    order: 2;
    flex: 2;
  }

  .textarea-container {
    &.custom-height > textarea.form-control {
      max-height: 100%;
    }

    .textarea-field {
      background-color: rgba(0, 0, 0, 0);
    }
  }

  .textarea_field::placeholder {
    color: var(--MainTextColorLight);
  }

  .textarea_field:hover {
    overflow-y: auto;
    background-color: var(--CellSelectColor);
  }

  .textarea_field:focus {
    outline: none;
    width: 100%;
    background-color: var(--CellSelectColor);
  }

  .textarea_field__desktop {
    padding: 5px;
    border: 1px solid var(--MainBorderColor);
  }

  .textarea_field__desktop:focus {
    outline: none;
    overflow: auto;
    z-index: 10;
  }

  .textarea-field_cell-edit {
    border: none;
    text-align: inherit;
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

  .textarea_field__required {
    background: var(--WarningColor) !important;
  }

  .textarea_field__error {
    background: var(--FailColor) !important;
  }

</style>
