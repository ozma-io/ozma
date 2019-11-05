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
    <div class="textarea_field_container">
        <Modal v-show="isMobile"
            :show="isModalOpen"
            :name="`${uid}-field-modal`"
            @opened="onModalOpen"
            fullscreen>
            <template v-slot:content>
                <div class="input_modal__input_group">
                    <div>
                        <label v-if="label" class="input_modal_label">
                            {{ label }}
                        </label>
                        <textarea :class="['textarea_field', 'modal_textarea_field', {'textarea_field__disabled': disabled}]"
                            :id="inputName"
                            :type="type"
                            :placeholder="$t('input_placeholder')"
                            :disabled="disabled"
                            :rows="rows"
                            v-model="modalValue"
                            ref="controlModal"
                        />
                    </div>
                    <div class="input_modal__button_container">
                        <button type="button" class="input_modal__button__ok" @click="updateValueFromModal">
                            {{$t('ok')}}
                        </button>
                        <button type="button" class="input_modal__button__cancel" @click="closeModal">
                            {{$t('cancel')}}
                        </button>
                    </div>
                </div>
            </template>
        </Modal>
        <label class="input_label"
            :for="inputName"
            v-if="label"
        >
            {{ label }}
        </label>
        <textarea :class="['textarea_field', {'textarea_field__disabled': disabled}]"
            :id="inputName"
            :type="type"
            :value="value"
            :placeholder="$t('input_placeholder')"
            :disabled="disabled"
            :rows="rows"
            ref="control"
            @focus="onFocus"
            @blur="onBlur"
            @input="$emit('update:value', $event.target.value)"
        />
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";

import MobileMixin from "@/MobileMixin";
import Modal from "@/components/modal/Modal";

@Component({ components: { Modal } })
export default class Textarea extends MobileMixin {
    @Prop({ type: String }) label!: string;
    @Prop({ type: String }) value!: string;
    @Prop({ type: String }) error!: string;
    @Prop({ type: String }) warning!: string;
    @Prop({ type: Number }) height!: number;
    @Prop({ type: Boolean }) disabled!: boolean;
    @Prop({ type: Number, default: 5 }) rows!: number;
    @Prop({ type: Boolean, default: true }) inline!: boolean;
    @Prop({ type: String, default: "text" }) type!: string;

    private focused: boolean = false;
    private modalValue: string = this.value;
    private isModalOpen: boolean = false;

    private get inputName(): string {
        return `${this.uid}-input`;
    }

    private get hasContent(): boolean {
        if (typeof this.value === "string") {
            return this.value.length > 0;
        } else { return !!this.value; }
    }

    private onModalOpen() {
        this.$nextTick(() => {
            if (this.$refs.controlModal) {
                this.$refs.controlModal.focus();
                console.log(this.$refs.controlModal);
            }
        })
    }

    private onFocus(evt: Event<HTMLInputElement>) {
        this.focused = true;
        if (this.isMobile) {
            this.isModalOpen = true;
        } else {
            this.positionField();
        }
    }

    private onBlur(evt: Event<HTMLInputElement>) {
        this.focused = false;
    }

    private positionField() {
        const controlElement = this.$refs.control;
        const eWidth = controlElement.offsetWidth;
        const rightPosition = controlElement.getBoundingClientRect().right;
        const screenWidth = document.documentElement.clientWidth - 10;
        if (rightPosition + eWidth >= screenWidth) {
            controlElement.style.right = 0;
            controlElement.style.left = "initial";
        } else {
            controlElement.style.right = "initial";
            controlElement.style.left = 0;
        }
    }

    private updateValueFromModal() {
        this.$emit('update:value', this.modalValue);
        this.closeModal();
    }

    private closeModal() {
        this.focused = false;
        this.isModalOpen = false;
    }
}

// #292b2e
// #b1b1b2
</script>

<style lang="scss" scoped>
 .textarea_field_container {
     position: relative;
     display: inline-flex;
     flex-direction: column;
     color: var(--MainTextColor);
     width: 100%;
     height: 100%;
 }
 .input_label {
     color: var(--MainTextColorLight);
 }
 .textarea_label {
     align-self: flex-start;
     margin-right: 15px;
 }
 .textarea_field {
     padding: 5px 2px 5px 0;
     background-color: rgba(0, 0, 0, 0);
     border: 0px;
     z-index: 2;
     order: 2;
     flex: 2;
     cursor: pointer;
     width: 100%;
     border: none;
     resize: none;
     height: 100%;
     overflow: hidden;
     text-overflow: ellipsis;
     white-space: pre-wrap;
     border: 0px solid var(--MainBorderColor);
     color: var(--MainTextColor);
 }
 .textarea_field::placeholder {
     color: var(--MainTextColorLight);
 }
 .textarea_field:hover {
     overflow-y: auto;
 }
 .textarea_field:focus {
     outline: none;
     background-color: var(--MainBackgroundColor);
     border: 1px solid var(--MainBorderColor);
     padding: 5px;
     position: absolute;
     top: 2em;
     right: 0;
     width: 400px;
     height: 300px;
     transition: all 300ms ease-in-out, height 300ms ease-in-out;
     overflow: auto;
     z-index: 10;
 }
 .textarea_field__disabled {
     cursor: not-allowed;
 }
 .input_modal_field {
     color: var(--MainTextColor);
     background-color: var(--MainBackgroundColor);
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
 .modal_textarea_field {
     position: initial !important;
     width: 100% !important;
     border-left: none !important;
     border-right: none !important;
     box-sizing: content-box;
     padding: 5px;
 }
</style>
