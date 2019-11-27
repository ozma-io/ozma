<i18n>
    {
        "en": {
            "input_placeholder": "Fill this value here"
        },
        "ru": {
            "input_placeholder": "Заполните здесь"
        }
    }
</i18n>
<template>
    <input :class="['input_field',
                        {
                            'input_field__disabled': disabled,
                            'input_field__focused': focused,
                        }
                ]"
        :id="id"
        v-on:click.stop
        autocomplete="off"
        :type="type"
        :value="value"
        :placeholder="$t('input_placeholder')"
        :disabled="disabled"
        ref="control"
        @input="updateInput"
        @focus="onFocus"
        @blur="onBlur"
    >
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";

// 496264
// 628183

import { getTextWidth } from "@/utils";
import MobileMixin from '@/MobileMixin';

import Modal from "@/components/modal/Modal";

@Component({ components: { Modal } })
export default class Input extends MobileMixin {
    @Prop({ type: String }) label!: string;
    @Prop({ type: String }) value!: string;
    @Prop({ type: String }) error!: string;
    @Prop({ type: String }) warning!: string;
    @Prop({ type: Number }) height!: number;
    @Prop({ type: Boolean }) disabled!: boolean;
    @Prop({ type: String }) id!: string;
    @Prop({ type: Boolean, default: true }) inline!: boolean;
    @Prop({ type: Boolean }) inline!: boolean;
    @Prop({ type: Boolean, default: false }) unfocusing!: boolean;
    @Prop({ type: String, default: "text" }) type!: string;

    private focused: boolean = false;

    @Watch("value")
    private onValueUpdate(value: string) {
        this.modalValue = value;
    }

    @Watch("focus")
    private onFocusProp(focus: boolean) {
        if (focus) {
            this.$nextTick(() => this.$refs.control.focus);
        }
    }

    private get hasContent(): boolean {
        if (typeof this.value === "string") {
            return this.value.length > 0;
        } else { return !!this.value; }
    }

    private onFocus(evt: Event<HTMLInputElement>) {
        if (!this.unfocusing) {
            this.focused = true;
        }
        if (!this.isMobile) {
            this.updateWidth(evt);
        }
    }

    private onBlur(evt: Event<HTMLInputElement>) {
        if (!this.unfocusing) {
            this.focused = false;
        }
        if (!this.isMobile) {
            this.$refs.control.style.width = "100%";
        }
    }

    private updateInput(value: string) {
        this.$emit("input", value);
        if (!this.isMobile) {
            this.updateWidth(value);
        }
    }

    private updateWidth(value: string) {
        const controlElement = this.$refs.control;
        const computed = window.getComputedStyle(controlElement);
        const font = computed.getPropertyValue("font-size");
        // Unfortunately, this will cause the text field to grow ever slightly as you type
        // However, the only other option is to have a portion of
        // the text go out of view to the left
        // This should pose no inconvinience to the end user
        const placeholderWidth = getTextWidth(this.$t("input_placeholder"), font) * 1.67;
        const textWidth = Math.ceil(getTextWidth(value, font)) * 1.67;
        const inputWidth = textWidth || placeholderWidth;
        const leftPos = controlElement.getBoundingClientRect().left;
        const viewportWidth = document.documentElement.clientWidth - 10;
        const rightPos = leftPos + inputWidth;

        if (rightPos < viewportWidth) {
            controlElement.style.width = `${inputWidth}px`;
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
     white-space: pre;
     cursor: question;
     color: var(--MainTextColorLight)
 }
 .input_label__focused::after {
    content:"";
    position:absolute;
    width:100%;
    bottom:1px;
    z-index:-1;
    transform:scale(.9);
    box-shadow: 0px 0px 8px 2px #000000;
 }
 .input_field {
     padding: 5px 2px 5px 0;
     background-color: rgba(0, 0, 0, 0);
     border: 0px;
     z-index: 2;
     order: 2;
     flex: 2;
     height: 2em;
     color: var(--MainTextColor);
     cursor: pointer;
     border-bottom: none;
     width: 100%;
     text-overflow: ellipsis;
 }
 .input_field::placeholder {
     color: var(--MainTextColorLight);
 }
 .input_field:focus {
     outline: none;
     color: var(--MainTextColor);
     border-bottom: 1px solid var(--MainBorderColor);
     cursor: text;
     /* max-width: 40vw; */
     background-color: var(--MainBackgroundColor);
 }
 .input_field__disabled {
     cursor: not-allowed;
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
