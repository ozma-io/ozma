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
        <textarea :class="['textarea_field', {
                          'textarea_field__disabled': disabled,
                          'textarea_field__desktop': !this.isMobile,
                          }]"
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
        <div class="textarea_dummy_focus" :style="style" v-show="focused" ref="dummy">&nbsp;</div>
    </fragment>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";

import { isMobile } from "@/utils";

@Component
export default class Textarea extends Vue {
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

    private dummyHeight: number = 0;
    private dummyWidth: number = 0;

    private mounted() {
        const control = this.$refs.control as HTMLInputElement;
        this.dummyHeight = control.clientHeight;
        this.dummyWidth = control.clientWidth;
    }

    private get isMobile(): boolean {
        return isMobile();
    }

    private get inputName(): string {
        return `${this.uid}-input`;
    }

    private get hasContent(): boolean {
        if (typeof this.value === "string") {
            return this.value.length > 0;
        } else { return !!this.value; }
    }

    private get style() {
        return {
            height: `${this.dummyHeight}px`,
            width: `${this.dummyWidth}px`,
        };
    }

    private onFocus(evt: HTMLInputElement) {
        if (!this.isMobile) {
            this.positionField();
            this.focused = true;
        }
        this.$emit("focus", evt);
    }

    private onBlur(evt: HTMLInputElement) {
        this.focused = false;
    }

    private positionField() {
        const controlElement = this.$refs.control as HTMLElement;
        const dummyElement = this.$refs.dummy as HTMLElement;
        const leftPosition = controlElement.getBoundingClientRect().left;
        const rightPosition = controlElement.getBoundingClientRect().right;
        const maxWidth = 600;
        const maxHeight = 300;

        const screenWidth = document.documentElement.clientWidth - 15;
        // const screenHeight = document.documentElement.clientHeight - 15;

        const expandLeft = leftPosition + maxWidth + 15 < screenWidth;
        const expandRight = rightPosition - maxWidth + 15 < screenWidth;
        if (expandLeft) {
            controlElement.style.left = "0";
            controlElement.style.right = "initial";
        } else if (expandRight) {
            controlElement.style.right = "0";
            controlElement.style.left = "initial";
        }

        if (dummyElement) {
            dummyElement.style.height = `${this.dummyHeight}px`;
            dummyElement.style.width = `${this.dummyWidth}px`;
        }
    }
}
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
    border-bottom: 1px solid var(--MainBorderColor);
}
.textarea_field:focus {
    border-bottom: 2px solid var(--MainBorderColor);
    outline: none;
    padding: 5px;
    width: 600px !important;
}
.textarea_field__desktop:focus {
    outline: none;
    background-color: var(--MainBackgroundColor);
    border: 1px solid var(--MainBorderColor);
    padding: 5px;
    position: absolute;
    right: 0;
    width: 40vw;
    height: calc(100% + 100px);
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
.textarea_dummy_focus {
    padding: 5px 0 5px 0;
}
</style>
