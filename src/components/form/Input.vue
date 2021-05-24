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
      v-if="!isCellEdit"
      size="sm"
    >
      <b-input
        :id="id"
        ref="control"
        :class="[
          'input-field',
          {
            'readonly': disabled,
            'focused': focused,
            'unfocused': !focused,
            'error': error,
            'cell-edit': isCellEdit,
          }
        ]"
        :style="{ textAlign }"
        autocomplete="off"
        :type="type"
        :value="value"
        :placeholder="$t('input_placeholder')"
        :readonly="disabled"
        @keydown.enter.prevent
        @input="updateInput"
        @focus="onFocus"
        @blur="$emit('blur', $event)"
      />
      <b-input-group-append
        v-if="qrcodeInput || textLink"
      >
        <ButtonItem v-if="textLink" :button="textLinkButton" />
        <ButtonItem v-if="qrcodeInput" :button="qrCodeButton" />
      </b-input-group-append>
    </b-input-group>
    <!-- eslint-disable vue/no-deprecated-v-on-native-modifier -->
    <div class="textarea-container">
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
      <ButtonItem v-if="isCellEdit && qrcodeInput" :button="qrCodeButton" />
    </div>
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
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import { Button } from "@/components/buttons/buttons";
import { getColorVariables } from "@/utils_colors";
import { findLink } from "@/utils";
import type { TextLink } from "@/utils";

@Component({
  components: { Textarea, QRCodeScanner, ButtonItem },
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

  private get qrCodeButton(): Button {
    return {
      type: "callback",
      icon: "qr_code_2",
      variant: "outline-info",
      colorVariables: getColorVariables("button", "outline-info"),
      callback: () => {
        this.openQRCodeScanner = !this.openQRCodeScanner;
      },
    };
  }

  private onPressEnter(event: KeyboardEvent) {
    this.$emit("move-selection-next-row", event);
  }

  private onPressTab(event: KeyboardEvent) {
    this.$emit("move-selection-next-column", event);
  }

  private get textLink(): TextLink | null {
    return this.isCellEdit ? null : findLink(this.value);
  }

  private get textLinkIcon(): string | null {
    if (this.textLink === null) return null;

    const type = this.textLink.type;
    /* eslint-disable */
    return type === "url"   ? "link"
         : type === "tel"   ? "call"
         : type === "email" ? "email"
         :                    "error";
    /* eslint-enable */
  }

  private get textLinkButton(): Button | null {
    if (this.textLink === null) return null;

    return {
      type: "link",
      icon: this.textLinkIcon!,
      link: {
        type: "href",
        href: this.textLink.href,
        target: "_blank",
      },
      variant: "outline-primary",
      colorVariables: getColorVariables("button", "outline-primary"),
    };
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
    color: var(--input-foregroundColor);

    &.readonly {
      cursor: not-allowed;
    }
  }

  .textarea-container {
    display: flex;
    flex-direction: row;
  }

  .input-textarea {
    padding: 0.15rem 0.1rem; /* Loosely matches .table-td padding */
    border: none;
    resize: none;
    width: 100%;
    display: block;
    overflow: auto !important;
    max-height: 165px;
    text-align: inherit;
    line-height: 1.2rem;
    color: var(--input-foregroundColor);
    background-color: var(--input-backgroundColor);
    border-color: var(--input-borderColor);
  }

  .input-textarea:focus {
    outline: none;
  }
</style>
