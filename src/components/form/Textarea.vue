<template>
  <fragment>
    <!-- eslint-disable vue/no-deprecated-v-on-native-modifier -->
    <textarea-autosize
      v-if="isCellEdit"
      ref="controlTextarea"
      :value="value"
      :readonly="disabled"
      rows="1"
      :max-height="maxHeight"
      :class="['textarea_field', {
        'textarea_field__disabled': disabled,
        'textarea-field_cell-edit': isCellEdit,
        'textarea_field__desktop': !$isMobile,
      }]"
      @keydown.enter.prevent
      @keydown.escape.native.prevent="$emit('blur', $event)"
      @input="updateInput"
      @focus.native="$emit('focus', $event)"
      @blur.native="$emit('blur', $event)"
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
        @blur="$emit('blur')"
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

  /* Used only for editing in tables, we need it to make content scrollable when it's can't fit to screen.
   * CSS-only solution doesn't work in Safari */
  private maxHeight = 0;

  private updateMaxHeight() {
    const viewportRect = document.querySelector(".userview-div")?.getBoundingClientRect();
    this.maxHeight = viewportRect?.height ?? this.height;
  }

  private mounted() {
    void Vue.nextTick().then(() => this.updateAutofocus());

    this.updateMaxHeight();

    /* eslint-disable @typescript-eslint/unbound-method */
    window.addEventListener("resize", this.updateMaxHeight);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private beforeDestroy() {
    /* eslint-disable @typescript-eslint/unbound-method */
    window.removeEventListener("resize", this.updateMaxHeight);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private updateAutofocus() {
    if (this.autofocus) {
      if (this.isCellEdit) {
        const controlTextareaElement = (this.$refs.controlTextarea as Vue | undefined)?.$el as HTMLInputElement | undefined;
        if (!controlTextareaElement) return;
        controlTextareaElement.focus();
        this.setCursorPositionEnd(controlTextareaElement);
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
    width: 100%;
    outline: none;
  }

  .textarea-field:focus {
    border-color: #80bdff !important;
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
