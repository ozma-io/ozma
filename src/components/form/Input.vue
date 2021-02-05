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
    <b-input-group
      size="sm"
    >
      <b-input
        v-if="!isCellEdit"
        :id="id"
        ref="control"
        :class="[
          'input-field',
          {
            'disabled': disabled,
            'focused': focused,
            'unfocused': !focused,
            'error': error,
            'cell-edit': isCellEdit,
          }
        ]"
        :style="{ backgroundColor, textAlign }"
        autocomplete="off"
        :type="type"
        :value="value"
        :placeholder="$t('input_placeholder')"
        :disabled="disabled"
        @keydown.enter.prevent
        @input="updateInput"
        @focus="onFocus"
      />
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
    </b-input-group>
  </fragment>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { valueIsNull } from "@/values";
import Textarea from "@/components/form/Textarea.vue";

@Component({
  components: { Textarea },
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
  @Prop({ type: String }) backgroundColor!: string;
  @Prop({ type: String, default: "left" }) textAlign!: string;

  private focused = false;
  private maxInputWidth = 0;

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
  }

  @Watch("autofocus")
  private onAutofocus(autofocus: boolean) {
    if (autofocus) {
      const control = this.$refs.control as HTMLInputElement | undefined;
      control?.focus();
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
  }

  private setCursorPositionEnd(controlElement: HTMLInputElement) {
    if (controlElement) {
      controlElement.selectionStart = this.value ? this.value.length : 0;
    }
  }

  private updateInput(value: string) {
    this.$emit("input", value);
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

  .input-textarea:focus {
    outline: none;
  }
</style>
