<template>
  <fragment>
    <b-input-group
      v-if="!isCellEdit"
    >
      <b-input
        :id="inputId"
        ref="control"
        :class="[
          'input-field',
          {
            'readonly': disabled,
          }
        ]"
        :style="{ textAlign }"
        autocomplete="off"
        :type="type"
        :value="value"
        :readonly="disabled"
        @keydown.enter.prevent
        @input="updateInput"
        @focus="onFocus"
        @blur="$emit('blur', $event)"
      />
      <b-input-group-append
        v-if="qrcodeInput || textLink"
        class="append-button"
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
        :value="value"
        :readonly="disabled"
        rows="1"
        class="input-textarea"
        @input="updateInput"
        @focus.native="onFocus"
        @blur.native="$emit('blur', $event)"
        @keydown.escape.native.prevent="$emit('blur', $event)"
        @keydown.enter.native.prevent.stop="onPressEnter"
        @keydown.tab.native.prevent.stop="onPressTab"
      />
      <ButtonItem v-if="isCellEdit && qrcodeInput" :button="qrCodeButton" />
    </div>
    <QRCodeScannerModal
      ref="scanner"
      raw
      @select="updateInput"
    />
  </fragment>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { Debounce } from "vue-debounce-decorator";
import Textarea from "@/components/form/Textarea.vue";
import QRCodeScannerModal from "@/components/qrcode/QRCodeScannerModal.vue";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import { Button } from "@/components/buttons/buttons";
import { findLink } from "@/utils";
import type { TextLink } from "@/utils";
import { bootstrapVariantAttribute } from "@/utils_colors";

@Component({
  components: {
    Textarea,
    QRCodeScannerModal,
    ButtonItem,
  },
})
export default class Input extends Vue {
  @Prop() value!: unknown;
  @Prop({ type: Boolean }) disabled!: boolean;
  @Prop({ type: String, default: "text" }) type!: string;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Boolean, default: false }) qrcodeInput!: boolean;
  // FIXME: remove this and style parent nodes instead.
  // Perhaps we need "autosize" prop instead?
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;
  @Prop({ type: String }) backgroundColor!: string;
  @Prop({ type: String, default: "left" }) textAlign!: string;

  private textLink: TextLink | null = null;

  private get qrCodeButton(): Button {
    return {
      type: "callback",
      icon: "qr_code_2",
      variant: bootstrapVariantAttribute("outline-info"),
      callback: () => (this.$refs.scanner as QRCodeScannerModal).scan(),
    };
  }

  private get inputId(): string {
    return `${this.uid}-input`;
  }

  private onPressEnter(event: KeyboardEvent) {
    this.$emit("enter-pressed", event);
  }

  private onPressTab(event: KeyboardEvent) {
    this.$emit("tab-pressed", event);
  }

  @Debounce(1000)
  private debouncedRecalculateTextLink() {
    this.recalculateTextLink();
  }

  private recalculateTextLink() {
    this.textLink = this.isCellEdit ? null : findLink(String(this.value));
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
        target: "blank",
      },
      variant: bootstrapVariantAttribute("outline-primary"),
    };
  }

  private mounted() {
    if (this.autofocus) {
      void Vue.nextTick().then(() => {
        if (this.isCellEdit) {
          const controlTextareaElement = (this.$refs.controlTextarea as Vue).$el as HTMLInputElement;
          controlTextareaElement.focus();
          this.setCursorPositionEnd(controlTextareaElement);
        } else {
          (this.$refs.control as any)?.focus();
        }
      });
    }

    this.recalculateTextLink();
  }

  @Watch("value")
  private onValueUpdate(value: string) {
    this.debouncedRecalculateTextLink();
  }

  @Watch("autofocus")
  private onAutofocus(autofocus: boolean) {
    if (autofocus) {
      (this.$refs.control as HTMLInputElement | undefined)?.focus();
    }
  }

  private onFocus(evt: Event) {
    this.$emit("focus", evt);
  }

  private setCursorPositionEnd(controlElement: HTMLInputElement) {
    if (!controlElement) return;

    let selectionStart = 0;
    if (typeof this.value === "string") {
      selectionStart = this.value.length;
    }
    if (typeof this.value === "number") {
      selectionStart = String(this.value).length;
    }
    controlElement.selectionStart = selectionStart;
  }

  private updateInput(value: string) {
    if (this.value !== value) {
      this.$emit("input", value);
    }
  }
}
</script>

<style lang="scss" scoped>
  ::v-deep .form-control {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background-color: transparent;
    color: var(--cell-foregroundColor);

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
    color: var(--cell-foregroundColor);
    background-color: var(--cell-backgroundColor);
    border-color: var(--cell-borderColor);
  }

  .input-textarea:focus {
    outline: none;
  }

  .append-button ::v-deep .btn {
    padding: 0.4rem 0.3rem;
    border-radius: 0 0.5rem 0.5rem 0;
  }
</style>
