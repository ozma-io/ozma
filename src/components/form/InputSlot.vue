<template>
    <b-row :class="[
                 'input_slot',
                 {'input_slot__row': inline}
                 ]">
        <Modal v-if="isMobile"
            :show="isModalOpen"
            :name="`${uid}-field-modal`"
            @opened="onModalOpen"
            @close="onModalClose"
            fullscreen>
            <template v-slot:content>
                <div class="input_modal__input_group">
                    <div>
                        <slot name="input-modal" :onChange="onChange" :value="modalValue">
                        </slot>
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
        <b-col cols="4" class="input_label__container" v-if="label">
            <label :class="['input_label', { 'input_label__focused': focused }]"
                :for="inputName"
                v-if="label"
                :title="label"
            >{{ label }}</label>
        </b-col>
        <b-col :cols="!!label ? 8 : 12" class="input_container">
            <slot name="input" :onFocus="onFocus">
            </slot>
        </b-col>
    </b-row>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";

// 496264
// 628183

import { getTextWidth } from "@/utils";
import MobileMixin from "@/MobileMixin";

import Modal from "@/components/modal/Modal.vue";

@Component({ components: { Modal } })
export default class InputSlot extends MobileMixin {
    @Prop({ type: String }) label!: string;
    @Prop() value!: any;
    @Prop({ type: String }) error!: string;
    @Prop({ type: String }) warning!: string;
    @Prop({ type: Number }) height!: number;
    @Prop({ type: Boolean }) disabled!: boolean;
    @Prop({ type: Boolean, default: true }) inline!: boolean;
    @Prop({ type: String, default: "text" }) type!: string;

    private focused: boolean = false;
    private modalValue: any = this.value;
    private isModalOpen: boolean = false;

    private mounted() {
        console.log(this.value, this.modalValue);
    }

    @Watch("value")
    private onValueUpdate(value: string) {
        this.modalValue = value;
    }

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
                const control = this.$refs.controlModal as HTMLElement;
                control.focus();
            }
        });
    }

    private onModalClose() {
        this.modalValue = this.value;
    }

    private onFocus() {
        if (this.isMobile) {
            this.isModalOpen = true;
        }
    }

    private onChange(value: string) {
        this.modalValue = value;
    }

    private updateValueFromModal() {
        this.$emit("update:value", this.modalValue);
        this.closeModal();
    }

    private closeModal() {
        this.focused = false;
        this.isModalOpen = false;
    }
}
</script>

<style lang="scss" scoped>
 .input_slot {
     position: relative;
     display: inline-flex;
     flex-direction: column;
     color: var(--MainTextColor);
     width: 100%;
     padding-left: 15px;
 }
 .input_slot__row {
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
 .input_container {
     padding-left: 0;
 }
 .input_field__focused {
     position: absolute;
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
 .v--modal-overlay {
     z-index: 1000;
 }
</style>
