<i18n>
    {
      "en": {
        "empty_message": "Empty",
        "clear_all": "Clear all"
      },
      "ru": {
        "empty_message": "Пусто",
        "clear_all": "Удалить всё"
      }
    }
</i18n>

<template>
    <div style="width: 100%;"
        @keydown.tab="() => setIsOpen(false)">
        <div v-click-outside="() => setIsOpen(false)"
             :class="[
                'select_container',
                {
                    'select_container_fixed_height': hasHeight && !isOpen && !single,
                    'select_container__error': required && isEmpty,
                },
             ]">
            <span v-if="showSingleValue"
                  @click="setIsOpen(true)"
                  class="single_value_button">
                <slot name="singleValue"
                      :listValueStyle="listValueStyle"
                      :valueOption="valueOption">
                    <span :style="listValueStyle"
                          :class="[ 'single_value', { 'single_value_open': isOpen } ]">{{valueOption.label}}</span>
                </slot>
            </span>
            <span v-if="isEmpty && !isOpen"
                  @click="setIsOpen(true)"
                  :style="listValueStyle"
                  class="empty_message_text">{{ $t('empty_message') }}</span>
            <div v-if="(!single && !isEmpty) || isOpen"
                 :class="[
                      'select_container__content',
                      {
                        'select_container__content__single': showSingleValue,
                        'select_container__content_fixed_height': hasHeight && !isOpen,
                      }
                      ]"
                 @click="setIsOpen(true)"
                 :style="containerContentStyle"
                 ref="valuesList">
                <slot name="label"
                      v-if="!single"
                      :valueOptions="valueOptions"
                      :listValueStyle="listValueStyle"
                      :removeValue="removeValue"
                      :showValueRemove="showValueRemove">
                    <span v-for="(option, index) in valueOptions"
                          :key="option.value"
                          class="values_list__value"
                          :style="listValueStyle"
                          @click.stop>
                          {{option.label}}
                          <input v-if="showValueRemove"
                              @click="removeValue(index)"
                              @blur="() => setIsOpen(false)"
                              type="button"
                              class="material-icons values_list__value__close"
                              value="close">
                    </span>
                </slot>
                <input v-if="isOpen"
                       @keydown.backspace="onBackspace"
                       @keydown.up="offsetSelectedOption(-1)"
                       @keydown.down="offsetSelectedOption(1)"
                       @keydown.enter="addSelectedOptionToValue"
                       v-model="inputValue"
                       ref="controlInput"
                       type="text"
                       :style="listValueStyle"
                       class="select_container__input">
            </div>
            <div class="select_container__options_container">
                <slot name="option"
                    v-if="isOpen"
                    :selectedOptions="selectedOptions"
                    :addOptionToValue="addOptionToValue"
                    :selectedOption="selectedOption"
                    :isEmpty="isEmpty">
                        <ul class="select_container__options_list" :style="optionsListStyle" ref="optionsList">
                            <li v-for="(option, index) in selectedOptions"
                                    :key="option.value"
                                    @click="addOptionToValue(option, $event)"
                                    :class="[
                                        'select_container__options_list__option',
                                        {'select_container__options_list__option_active': selectedOption === index }
                                    ]">
                                {{option.label}}
                            </li>
                        </ul>
                        <div class="select_container__options__actions" @click="setIsOpen(false)">
                            <slot name="actions" v-if="isOpen">
                            </slot>
                        </div>
                </slot>
            </div>
            <input v-if="!disabled && ((single && required) || (single && isEmpty) || !single)"
                   type="button" class="material-icons select_container__chevron"
                   @click="isOpen ? setIsOpen(false) : setIsOpen(true)"
                   :value="isOpen ? 'arrow_drop_up' : 'arrow_drop_down'" />
            <input v-if="single && !isEmpty && !required && !disabled"
                   type="button" class="material-icons select_container__chevron"
                   @click.stop="removeValue()"
                   value="close" />
        </div>
        <div v-if="!single && !required && showValueRemove" @click="clearValues" class="clear_all_button">{{ $t('clear_all') }}</div>
    </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { valueIsNull } from "@/values";

export interface ISelectOption {
    value: any;
    label: string;
    meta?: { [key: string]: any };
}

const defaultOptionFilter = (query: string) => (option: ISelectOption) =>
    R.contains(query.toLowerCase(), R.pathOr("", ["label"], option).toLowerCase());

@Component({})
export default class MultiSelect extends Vue {
    @Prop({}) value!: any;
    @Prop({ type: Array, default: () => [] }) options!: ISelectOption[];
    @Prop({ type: Boolean, default: false }) single!: boolean;
    @Prop({ type: Boolean, default: false }) required!: boolean;
    @Prop({ type: Boolean, default: false }) disabled!: boolean;
    @Prop({ type: Function, default: defaultOptionFilter }) optionFilterFN!: (query: string) => (option: ISelectOption) => boolean;
    @Prop({ default: null }) emptyValue: any;
    @Prop({ type: Number, default: null }) height!: number;
    @Prop({ type: String, default: null }) optionsListHeight!: string;
    @Prop({ type: Boolean, default: false }) dontOpen!: boolean;
    @Prop({ type: Boolean, default: false }) autofocus!: boolean;

    private isOpen: boolean = false;
    private selectedOption: number = -1;
    private inputValue: string = "";

    private mounted() {
        if (this.autofocus) {
            Vue.nextTick().then(() => {
                this.setIsOpen(true);
            });
        }
    }

    private onBackspace() {
        if (this.inputValue === "" && !this.single && !this.disabled && (!this.required || (this.required && this.currentValues.length > 1))) {
            this.removeValue(this.currentValues.length - 1);
        }
    }

    private getOption(value: any): ISelectOption | undefined {
        const option = this.options.find(R.propEq("value", value)) || { value, label: value };
        return {
            ...option,
            label: this.getLabel(option),
        };
    }

    private getLabel(option: ISelectOption): string {
        const label = R.pathOr(option.value, ["label"], option);
        return label !== "" ? label : option.value;
    }

    private get showSingleValue() {
        const showIfEditing = !this.isOpen || (this.isOpen && this.inputValue === "");
        return this.single && !this.isEmpty && showIfEditing;
    }

    private get showValueRemove(): boolean {
        const isLastValueLeft = this.single ? true : this.currentValues.length <= 1;
        return (!this.disabled && !(isLastValueLeft && this.required));
    }

    private get valueOption(): ISelectOption | undefined {
        return this.getOption(this.currentValue);
    }

    private get valueOptions(): ISelectOption[] {
        if (this.value instanceof Array) {
            return this.currentValues
                .map(this.getOption)
                .filter(R.identity) as ISelectOption[];
        }
        return [];
    }

    private get hasHeight(): boolean {
        return !!this.height;
    }

    private get containerContentStyle() {
        const height = this.height && !this.isOpen ? { height: `${this.height}px`, minHeight: "unset" } : {};
        return {
            ...height,
        };
    }

    private get optionsListStyle() {
        const height = this.height ? { maxHeight: `${this.optionsListHeight}px` } : { maxHeight: "200px" };
        return {
            ...height,
        };
    }

    private get listValueStyle() {
        const height = this.height ? { maxHeight: `${this.height}px`} : {};
        return {
            ...height,
        };
    }

    private get currentValue(): any {
        if (this.single) {
            return this.value;
        }
        return null;
    }

    private get currentValues(): any[] {
        if (!this.single) {
            return this.value || [];
        }
        return [];
    }

    private get isEmpty(): boolean {
        if (this.single) {
            return valueIsNull(this.currentValue);
        }
        return !this.currentValues.length;
    }

    private get selectedOptions(): ISelectOption[] {
        if (this.single) {
            return this.options
                       .filter(this.optionFilterFN(this.inputValue))
                       .map(option => ({ ...option, label: this.getLabel(option) }));
        }
        return this.options
                   .filter(this.optionFilterFN(this.inputValue))
                   .map(option => ({ ...option, label: this.getLabel(option) }));
    }

    private focusInput() {
        if (this.$refs.controlInput) {
            (this.$refs.controlInput as HTMLInputElement).focus();
        }
    }

    private setIsOpen(val: boolean) {
        if (this.disabled) {
            return;
        }
        if (!this.dontOpen) {
            this.isOpen = val;
            this.selectedOption = -1;
            if (val) {
                // Using nextTick() to set focus because upon setting isOpen it's not present yet
                Vue.nextTick().then(() => {
                    this.focusInput();
                });
            }
        }
        if (val) {
            this.$emit("focus", null);
        }
    }

    private offsetSelectedOption(offset: number) {
        const selectedOptions = this.selectedOptions;
        const newSelectedOption = this.selectedOption + offset;
        if (newSelectedOption < 0) {
            this.selectedOption = selectedOptions.length - 1;
        } else if (newSelectedOption >= selectedOptions.length) {
            this.selectedOption = 0;
        } else {
            this.selectedOption = this.selectedOption + offset;
        }
    }

    private findNewSelected() {
        if (this.selectedOption >= this.selectedOptions.length - 1) {
            this.selectedOption = (this.selectedOptions.length - 2);
        }
    }

    private addOptionToValue(option: ISelectOption) {
        if (!this.disabled) {
            if (this.single) {
                this.setIsOpen(false);
                this.$emit("update:value", option.value);
            } else {
                const newValue = R.uniq([...this.currentValues, option.value]);
                this.$emit("update:value", newValue);
            }
            this.inputValue = "";
            (this.$refs.controlInput as HTMLInputElement).focus();
            this.findNewSelected();
        }
    }

    private addSelectedOptionToValue() {
        if (this.selectedOption > -1) {
            const option: ISelectOption | null = R.pathOr(null, [this.selectedOption], this.selectedOptions);
            if (option) {
                this.addOptionToValue(option);
            }
        } else if (this.selectedOptions.length) {
            const option: ISelectOption = this.selectedOptions[0];
            if (option) {
                this.addOptionToValue(option);
            }
        }
    }

    private removeValue(index?: number) {
        if ((index !== undefined) && !this.single)  {
            const newValue = this.currentValues.filter((_: any, i: number) => index !== i);
            this.$emit("update:value", newValue);
        } else {
            this.$emit("update:value", this.emptyValue);
        }
    }

    private clearValues() {
        if (!this.single) {
            this.$emit("update:value", this.emptyValue);
        }
    }
}
</script>

<style>
 .empty_message_text {
     display: inline-flex;
     width: 100%;
     cursor: pointer;
     align-self: center;
     align-items: center;
     color: var(--MainTextColorLight);
 }
 .select_container {
     display: flex;
     flex-direction: row;
     position: relative;
 }
 .select_container__error {
     border-bottom: 1px solid var(--FailColor);
 }
 .select_container_fixed_height {
     box-shadow: inset -5px -5px 8px 5px rgba(0,0,0,0.25);
 }
 .select_container__content {
     width: 100%;
     cursor: pointer;
     display: flex;
     flex-wrap: wrap;
     min-height: 40px;
     align-content: flex-start;
 }
 .select_container__content__single {
     position: absolute;
     left: 0;
 }
 .select_container__content_fixed_height {
     overflow: hidden;
 }
 .select_container__content_norwap {
     flex-wrap: nowrap;
     overflow-x: hidden;
     height: unset !important;
 }
 .select_container__input {
     border: 0;
     height: 30px;
     padding: 5px;
     margin: 0px 0 5px 0;
     flex: 1;
     box-sizing: border-box;
     color: var(--MainTextColor);
     background-color: var(--MainBackgroundColor);
 }
 .select_container__input:focus {
     outline: none;
 }
 .select_container__chevron {
     display: flex;
     justify-content: center;
     margin-left: auto;
     border: 0;
     background: 0;
     padding: 0;
     cursor: pointer;
     z-index: 10;
     color: var(--MainBorderColor);
 }
 .select_container__options_container {
     z-index: 1001;
     list-style: none;
     width: 100%;
     position: absolute;
     top: calc(100% + 2px);
     left: 0;
     padding: 0;
     margin: 0;
 }
 .select_container__options_list {
     padding: 0;
     margin: 0;
     box-sizing: border-box;
     max-height: 250px;
     overflow: auto;
     transition: all ease-in 0.3s;
     height: 100%;
     border-bottom: 1px solid var(--MainBorderColor);
     background-color: var(--MainBackgroundColor);
 }
 .select_container__options_list__open {
 }
 .select_container__options_list > li.select_container__options_list__option {
     color: var(--MainTextColor);
     padding: 10px;
     box-sizing: border-box;
     cursor: pointer;
 }
 .select_container__options_list > li.select_container__options_list__option:hover,
 .select_container__options_list__option_active {
     cursor: pointer;
     background-color: var(--MainBorderColor);
     color: var(--MainTextColor);
 }
 .select_container__options_list__option > span {
     margin: 0px;
 }
 div.select_container__options__actions {
     bottom: 0;
     padding: 0;
     color: red;
 }
 .values_list__value {
     margin: 5px;
     border: 1px solid var(--MainBorderColor);
 }
 .values_list__value,
 .single_value {
     display: inline-flex;
     align-items: center;
     color: var(--MainTextColor);
     border-radius: 15px;
     /* background-color: white; */
     padding: 10px;
     box-sizing: border-box;
}
.single_value {
     padding-left: 0px;
     align-self: center;
     border-radius: 15px;
     padding: 2px 10px 2px 10px;
     border: 1px solid var(--MainBorderColor);
     background-color: var(--MainBackgroundColor);
     color: var(--MainTextColor);
 }
 .single_value_open {
     color: gray;
 }
 .single_value_button {
     cursor: pointer;
     width: 100%;
 }
 .values_list__value:hover,
 .values_list__value:hover > input.values_list__value__close {
     cursor: pointer;
     background-color: var(--MainBorderColor);
 }
 .values_list__value > input.values_list__value__close {
     background: none;
     border: none;
     padding: 0;
     margin: 0px 0px 0px 5px;
     font-size: inherit;
     color: var(--FailColor);
 }
 .clear_all_button {
     color: var(--MainTextColor);
     padding: 5px;
     font-style: italic;
 }
 .clear_all_button:hover {
     text-decoration: underline;
     cursor: pointer;
 }
</style>
