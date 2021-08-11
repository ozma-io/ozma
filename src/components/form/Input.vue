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
        @input="updateInput"
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
      @select="updateInput"
    />
  </fragment>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import Textarea from "@/components/form/Textarea.vue";
import QRCodeScanner from "@/components/qrcode/QRCodeScanner.vue";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import { Button } from "@/components/buttons/buttons";
import { findLink } from "@/utils";
import type { TextLink } from "@/utils";
import { bootstrapVariantAttribute } from "@/utils_colors";
import { Debounce } from "vue-debounce-decorator";

@Component({
  components: { Textarea, QRCodeScanner, ButtonItem },
})
export default class Input extends Vue {
  @Prop() value!: any;
  @Prop({ type: Boolean }) disabled!: boolean;
  @Prop({ type: String, default: "text" }) type!: string;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Boolean, default: false }) qrcodeInput!: boolean;
  // FIXME: remove this and style parent nodes instead.
  // Perhaps we need "autosize" prop instead?
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;
  @Prop({ type: String }) backgroundColor!: string;
  @Prop({ type: String, default: "left" }) textAlign!: string;

  private openQRCodeScanner = false;
  private textLink: TextLink | null = null;

  private get qrCodeButton(): Button {
    return {
      type: "callback",
      icon: "qr_code_2",
      variant: bootstrapVariantAttribute("outline-info"),
      callback: () => {
        this.openQRCodeScanner = !this.openQRCodeScanner;
      },
    };
  }

  private get inputId(): string {
    return `${this.uid}-input`;
  }

  private onPressEnter(event: KeyboardEvent) {
    this.$emit("move-selection-next-row", event);
  }

  private onPressTab(event: KeyboardEvent) {
    this.$emit("move-selection-next-column", event);
  }

  @Debounce(1000)
  private debouncedRecalculateTextLink() {
    this.recalculateTextLink();
  }

  private recalculateTextLink() {
    this.textLink = this.isCellEdit ? null : findLink(this.value);
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
      variant: bootstrapVariantAttribute("outline-primary"),
    };
  }

  private mounted() {
    if (this.autofocus) {
      void Vue.nextTick().then(() => {
        if (this.isCellEdit) {
          const controlTextareaElement = this.$refs.controlTextarea as any;
          controlTextareaElement.$el.focus();
          this.setCursorPositionEnd(controlTextareaElement.$el);
        } else {
          (this.$refs.control as HTMLInputElement | undefined)?.focus();
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
</style>
