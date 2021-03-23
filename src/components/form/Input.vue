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
        @blur="$emit('blur', $event)"
      />
      <!-- eslint-disable vue/no-deprecated-v-on-native-modifier -->
      <textarea-autosize
        v-if="isCellEdit"
        ref="controlTextarea"
        :placeholder="$t('input_placeholder')"
        :value="value"
        :readonly="disabled"
        rows="1"
        class="input-textarea"
        @input="updateInputCellEdit"
        @focus="onFocus"
        @blur.native="$emit('blur', $event)"
        @keydown.escape.native.prevent="$emit('blur', $event)"
        @keydown.enter.native.prevent.stop="onPressEnter"
        @keydown.tab.native.prevent.stop="onPressTab"
      />
      <b-input-group-append
        v-if="qrcodeInput"
      >
        <b-button
          variant="outline-info"
          class="with-material-icon"
        >
          <i
            class="material-icons qr_code"
            @click="openQRCodeScanner = !openQRCodeScanner"
          >
            qr_code_2
          </i>
        </b-button>
      </b-input-group-append>
    </b-input-group>
    <QRCodeScanner
      raw
      :open-scanner="openQRCodeScanner"
      @select="updateInputCellEdit"
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
  @Prop({ type: Boolean, default: false }) qrcodeInput!: boolean;
  // FIXME: remove this and style parent nodes instead.
  // Perhaps we need "autosize" prop instead?
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;
  @Prop({ type: String }) backgroundColor!: string;
  @Prop({ type: String, default: "left" }) textAlign!: string;

  private focused = false;
  private maxInputWidth = 0;
  private openQRCodeScanner = false;

  private get isEmpty(): boolean {
    return valueIsNull(this.value);
  }

  private onPressEnter(event: KeyboardEvent) {
    this.$emit("move-selection-next-row", event);
  }

  private onPressTab(event: KeyboardEvent) {
    this.$emit("move-selection-next-column", event);
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
  ::v-deep .form-control {
    background-color: transparent;
    color: var(--input-foregroundColor, --MainTextColor);

    &.disabled {
      background-color: rgba(0, 0, 0, 0.2);
      color: var(--input-foregroundDarkerColor, --MainTextColorLight);
    }
  }

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
