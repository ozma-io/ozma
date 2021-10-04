<template>
  <fragment>
    <!-- eslint-disable vue/no-deprecated-v-on-native-modifier -->
    <textarea-autosize
      v-if="isCellEdit"
      ref="controlTextarea"
      :value="value"
      :readonly="disabled"
      rows="1"
      :class="['textarea_field', {
        'textarea_field__disabled': disabled,
        'textarea-field_cell-edit': isCellEdit,
        'textarea_field__desktop': !$isMobile,
      }]"
      @keydown.enter.prevent
      @keydown.escape.native.prevent="$emit('blur', $event)"
      @input="updateInput"
    />
    <div
      v-else
      :class="['textarea-container', {
        'required': required && isEmpty,
        'custom-height': height !== null,
      }]"
    >
      <b-form-textarea
        :id="inputName"
        ref="control"
        class="textarea-field"
        size="sm"
        :style="style"
        :value="value"
        :required="required"
        :disabled="disabled"
        :rows="textareaRows"
        @focus="onFocus"
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
  @Prop({ type: String }) value!: string;
  @Prop({ type: Boolean }) required!: boolean;
  @Prop({ type: Number }) height!: number;
  @Prop({ type: Boolean }) disabled!: boolean;
  @Prop({ type: Number, default: 5 }) rows!: number;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  // FIXME: remove this and style parent nodes instead.
  // Perhaps we need "autosize" prop instead?
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;

  private mounted() {
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
        const control = this.$refs.control as HTMLInputElement | undefined;
        control?.focus();
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
  }

  private get textareaRows(): number | null {
    if (this.height) return null;

    return this.rows;
  }

  private get style() {
    if (!this.height) return null;

    return {
      height: `${this.height}px`,
    };
  }

  private onFocus(evt: HTMLInputElement) {
    this.setCursorPositionEnd(evt);
    this.$emit("focus", evt);
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
    color: var(--cell-foregroundColor);
    background-color: var(--cell-backgroundColor);
    border-color: var(--cell-borderColor);
  }

  .textarea-container {
    &.custom-height > textarea.form-control {
      max-height: 100%;
    }

    .textarea-field {
      color: var(--cell-foregroundColor);
      background-color: var(--cell-backgroundColor);
      border-color: var(--cell-borderColor);
    }
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

  .textarea_field__desktop:focus {
    outline: none;
    overflow: auto;
    z-index: 10;
  }

  .textarea-field_cell-edit {
    border: none;
    text-align: inherit;

    &:focus {
      border: none;
    }

    &:hover {
      border: none;
    }
  }

  .textarea_field__disabled {
    cursor: not-allowed;
  }
</style>
