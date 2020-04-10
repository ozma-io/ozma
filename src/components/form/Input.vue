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
    <span ref="autosizeMeter">
      {{ value || $t('input_placeholder') }}
    </span>
    <input
      :id="id"
      ref="control"
      :class="['input_field',
               {
                 'input_field__disabled': disabled,
                 'input_field__focused': focused,
                 'input_field__unfocused': !focused,
               }
      ]"
      autocomplete="off"
      :type="type"
      :value="value"
      :placeholder="$t('input_placeholder')"
      :disabled="disabled"
      @click.stop
      @input="updateInput"
      @focus="onFocus"
      @blur="onBlur"
    >
  </fragment>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { isMobile } from "@/utils";

@Component
export default class Input extends Vue {
  @Prop({ type: String }) label!: string;
  @Prop() value!: any;
  @Prop({ type: String }) error!: string;
  @Prop({ type: String }) warning!: string;
  @Prop({ type: Number }) height!: number;
  @Prop({ type: Boolean }) disabled!: boolean;
  @Prop({ type: String }) id!: string;
  @Prop({ type: Boolean, default: true }) inline!: boolean;
  @Prop({ type: Boolean, default: false }) dontFocus!: boolean;
  @Prop({ type: String, default: "text" }) type!: string;
  @Prop({ type: Boolean, default: false }) focus!: boolean;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;

  private focused = false;

  private mounted() {
    const controlElement = this.$refs.control as HTMLInputElement;
    const autosizeMeter = this.$refs.autosizeMeter as HTMLSpanElement;
    const styles = window.getComputedStyle(controlElement);
    if (this.autofocus) {
      Vue.nextTick().then(() => {
        controlElement.focus();
      });
    }

    Object.assign(autosizeMeter.style, {
      position: "absolute",
      top: "0",
      left: "0",
      visibility: "hidden",
      height: "0",
      overflow: "hidden",
      whiteSpace: "pre",
      fontSize: styles.fontSize,
      fontFamily: styles.fontFamily,
      fontWeight: styles.fontWeight,
      fontStyle: styles.fontStyle,
      letterSpacing: styles.letterSpacing,
      textTransform: styles.textTransform,
    });
  }

  @Watch("value")
  private onValueUpdate(value: string) {
    if (!this.isMobile) {
      this.updateWidth(value);
    }
  }

  @Watch("focus")
  private onFocusProp(focus: boolean) {
    if (focus) {
      const control = this.$refs.control as HTMLInputElement;
      this.$nextTick(() => control.focus());
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

  private get isMobile(): boolean {
    return isMobile();
  }

  private onFocus(evt: Event) {
    this.$emit("focus", evt);
    if (!this.dontFocus) {
      this.focused = true;
    }
    if (!this.isMobile) {
      this.updateWidth(this.value);
    }
  }

  private onBlur(evt: Event) {
    if (!this.dontFocus) {
      this.focused = false;
    }
    if (!this.isMobile) {
      const control = this.$refs.control as HTMLInputElement;
      control.style.width = "100%";
    }
  }

  private updateInput(value: string) {
    this.$emit("input", value);
  }

  private updateWidth(text: string) {
    const value = text !== "" ? text : String(this.$t("input_placeholder"));
    const controlElement = this.$refs.control as HTMLInputElement;
    const autosizeMeter = this.$refs.autosizeMeter as HTMLSpanElement;
    const leftPos = controlElement.getBoundingClientRect().left;
    const newWidth = autosizeMeter.scrollWidth;
    const rightPos = leftPos + newWidth;
    const viewportWidth = document.documentElement.clientWidth - 10;

    if (rightPos < (viewportWidth - 15)) {
      controlElement.style.width = `${newWidth}px`;
    } else {
      controlElement.style.width = `${viewportWidth - leftPos}px`;
    }
  }
}
</script>

<style lang="scss" scoped>
  .input_container {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    color: var(--MainTextColor);
    width: 100%;
    opacity: 0.7;
    padding-left: 15px;
  }

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

  .input_field {
    padding: 5px 2px 5px 0;
    background-color: rgba(0, 0, 0, 0);
    border: 0;
    z-index: 2;
    order: 2;
    flex: 2;
    height: 2em;
    color: var(--MainTextColor);
    cursor: pointer;
    border-bottom: 1px solid transparent;
    width: 100%;
    text-overflow: ellipsis;
  }

  .input_field::placeholder {
    color: var(--MainTextColorLight);
  }

  .input_field:hover,
  .input_field:focus {
    outline: none;
    color: var(--MainTextColor);
    border-bottom: 1px solid var(--MainBorderColor) !important;
    cursor: text;
    background-color: var(--MainBackgroundColor);
    z-index: 2000;
  }

  .input_field__disabled {
    cursor: not-allowed;
  }

  .input_field__unfocused {
    width: 100% !important;
  }

  .input_field__focused {
    position: absolute;
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
</style>
