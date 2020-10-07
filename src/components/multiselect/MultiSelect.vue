<i18n>
    {
      "en": {
        "empty_message": "Empty",
        "clear_all": "Clear all",
        "enter_value": "Enter value"
      },
      "ru": {
        "empty_message": "Пусто",
        "clear_all": "Очистить",
        "enter_value": "Введите значение"
      }
    }
</i18n>

<template>
  <div
    @keydown.tab="() => setIsOpen(false)"
  >
    <div
      ref="selectContainer"
      v-click-outside="() => setIsOpen(false)"
      :style="{'background': backgroundColor}"
      :class="[
        'select_container',
        {
          'select_container_hover': !isOpen,
          'select_container_fixed_height': hasHeight && !isOpen && !single,
          'select_container__required': required && isEmpty,
        },
      ]"
    >
      <div
        v-if="single && !isEmpty"
        class="single_value_button"
        @click="setIsOpen(true)"
      >
        <slot
          name="singleValue"
          :listValueStyle="listValueStyle"
          :valueOption="valueOption"
        >
          <div
            :style="listValueStyle"
            :class="[ 'single_value' ]"
          >
            {{ valueOption.label }}
          </div>
        </slot>
      </div>
      <span
        v-if="isEmpty && !isOpen"
        :style="listValueStyle"
        class="empty_message_text"
        @click="setIsOpen(true)"
      >{{ $t('empty_message') }}</span>
      <div
        v-if="(!single && !isEmpty)"
        ref="valuesList"
        :class="[
          'select_container__content',
          {
            'select_container__content__single': showSingleValue,
            'select_container__content_fixed_height': hasHeight && !isOpen,
          }
        ]"
        :style="containerContentStyle"
        @click="setIsOpen(true)"
      >
        <slot
          v-if="!single"
          name="label"
          :valueOptions="valueOptions"
          :listValueStyle="listValueStyle"
          :removeValue="removeValue"
          :showValueRemove="showValueRemove"
        >
          <div
            v-for="(option, index) in valueOptions"
            :key="option.value"
            class="values_list__value single_value"
            :style="listValueStyle"
            @click.stop
          >
            {{ option.label }}
            <input
              v-if="showValueRemove"
              type="button"
              class="material-icons values_list__value__close"
              value="close"
              @click="removeValue(index)"
              @blur="() => setIsOpen(false)"
            >
          </div>
        </slot>
      </div>
      <div 
        class="select_container__options_container"
        :style="{
          top: optionsContainerCoords.top ?`${optionsContainerCoords.top}px` : 'auto',
          bottom: optionsContainerCoords.bottom ? `${optionsContainerCoords.bottom}px` : 'auto'
        }"
      >        
        <input
          v-if="isOpen && isNeedFilter && isTopFilter"
          ref="controlInput"
          v-model="inputValue"
          type="text"
          :style="listValueStyle"
          class="select_container__input"
          :placeholder="$t('enter_value')"
          @keydown.backspace="onBackspace"
          @keydown.up="offsetSelectedOption(-1)"
          @keydown.down="offsetSelectedOption(1)"
          @keydown.enter="addSelectedOptionToValue"
        >
        <slot
          v-if="isOpen"
          name="option"
          :selectedOptions="selectedOptions"
          :addOptionToValue="addOptionToValue"
          :selectedOption="selectedOption"
          :isEmpty="isEmpty"
        >
          <ul
            ref="optionsList"
            class="select_container__options_list"
            :style="optionsListStyle"
          >
            <li
              v-for="(option, index) in selectedOptions"
              :key="option.value"
              :class="[
                'select_container__options_list__option',
                'single_value',
                {'select_container__options_list__option_active': selectedOption === index }
              ]"
              @click="addOptionToValue(option, $event)"
            >
              {{ option.label }}
            </li>
          </ul>
          <div
            class="select_container__options__actions"
            @click="setIsOpen(false)"
          >
            <slot
              v-if="isOpen"
              name="actions"
            />
          </div>
        </slot>
        
        <input
          v-if="isOpen && isNeedFilter && !isTopFilter"
          ref="controlInput"
          v-model="inputValue"
          type="text"
          :style="listValueStyle"
          class="select_container__input"
          :placeholder="$t('enter_value')"
          @keydown.backspace="onBackspace"
          @keydown.up="offsetSelectedOption(-1)"
          @keydown.down="offsetSelectedOption(1)"
          @keydown.enter="addSelectedOptionToValue"
        >
      </div>
      <input
        v-if="!disabled && ((single && required) || (single && isEmpty) || !single)"
        type="button"
        class="material-icons select_container__chevron"
        :value="isOpen ? 'arrow_drop_up' : 'arrow_drop_down'"
        @click="setIsOpen(!isOpen)"
      >
      <input
        v-if="single && !isEmpty && !required && !disabled"
        type="button"
        class="material-icons select_container__chevron"
        value="close"
        @click.stop="removeValue()"
      >
    </div>
    <span
      v-if="!single && !required && showValueRemove"
      class="clear_all_button"
      @click="clearValues"
    >
      {{ $t('clear_all') }}
    </span>
  </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { valueIsNull } from "@/values";
import { nextRender } from "@/utils";

export interface ISelectOption {
  value: any;
  label: string;
  meta?: { [key: string]: any };
}

const defaultOptionFilter = (query: string) => (option: ISelectOption) =>
  R.contains(query.toLowerCase().trim(), R.pathOr("", ["label"], option).toLowerCase());

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
  @Prop({ type: String }) backgroundColor!: string;

  private isOpen = false;
  private selectedOption = -1;
  private inputValue = "";
  private isNeedFilter = true;
  private isTopFilter = true;
  private optionsContainerCoords = {top: 0, bottom: 0};

  private mounted() {

    if (this.selectedOptions.length < 3 && this.single)
      this.isNeedFilter = false;

    //nextRender need for set coordinates selectedContainer after load cell data. 
    nextRender().then(() => {
      const bodyRect = document.body.getBoundingClientRect();
      const selectContainerElement = this.$refs.selectContainer as HTMLInputElement;
      const selectContainerRect = selectContainerElement !== undefined ? selectContainerElement.getBoundingClientRect() : null;

      if (selectContainerRect !== null)
        //There we check cell position for open selectContainer up or down.
        if (selectContainerRect.top > (bodyRect.bottom - selectContainerRect.bottom)){
          this.isTopFilter = !this.isTopFilter;
          this.optionsContainerCoords.bottom = selectContainerRect.height;
          // It is need for set focus to search input if options opened. 
          if(this.isOpen)
            this.setIsOpen(true);
        } else {
          this.optionsContainerCoords.top = selectContainerRect.height;
        }
    });

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
        .map(x => this.getOption(x))
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
      const controlInput = this.$refs.controlInput as HTMLInputElement;
      if(controlInput !== undefined)
        controlInput.focus();
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
    position: absolute;
    padding: 2px 5px;
    box-sizing: border-box;
    width: 100%;
    margin: 0 0 0 -5px;
  }

  .table-cell-edit .select_container {
    margin: 0 0 0 -2px;
  }

  .input_modal__input_group .select_container {
    padding: 2px;
  }

  .input_container > div > div > .select_container {
    padding: 2px 5px;
  }

  .form_grid_block__column > div > div > span > div > div > .select_container {
    padding: 2px 5px;
  }

  .select_container__error {
    background: var(--FailColor) !important;
  }

  .select_container__required {
    background: var(--WarningColor) !important;
  }

  .select_container_fixed_height {
    box-shadow: inset -5px -5px 8px 5px rgba(0, 0, 0, 0.25);
  }

  .select_container__content {
    width: 100%;
    cursor: pointer;
    align-content: center;
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
    width: 100%;
    border: 0;
    padding: 5px;
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
    margin: 0;
    background: white;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    border-radius: 1px;
  }

  .select_container__options_list {
    padding: 0 0 5px 2px;
    margin: 0;
    box-sizing: border-box;
    max-height: 250px;
    overflow: auto;
    transition: all ease-in 0.3s;
    height: 100%;
    border-bottom: 1px solid var(--MainBorderColor);
    background-color: var(--MainBackgroundColor);
    border-top: 1px solid #ccc;
  }

  .select_container__options_list > li.select_container__options_list__option {
    color: var(--MainTextColor);
    padding-left: 10px;
    margin-right: 10px;
    margin-top: 5px;
    padding-right: 10px;
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
    margin: 0;
  }

  div.select_container__options__actions {
    bottom: 0;
    padding: 0;
    color: red;
  }

  .values_list__value {
    margin: 5px;
    border: 1px solid var(--MainBorderColor);
    background-color: var(--MainBackgroundColor);
  }

  .values_list__value,
  .single_value {
    display: inline-flex;
    align-items: center;
    color: var(--MainTextColor);
    border-radius: 5px;

    /* background-color: white; */
    padding: 0 5px;
    box-sizing: border-box;
  }

  .single_value {
    align-self: center;
    border-radius: 5px;
    padding: 1px 5px;
    border: 1px solid var(--MainBorderColor);
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColor);
  }

  .single_value_open {
    color: gray;
  }

  .single_value_button {
    cursor: pointer;
    display: flex;
    width: 100%;
  }

  .values_list__value > input.values_list__value__close {
    background: none;
    border: none;
    padding: 0;
    margin: 0 0 0 5px;
    font-size: inherit;
    color: var(--FailColor);
  }

  .values_list__value:hover,
  .values_list__value:hover > input.values_list__value__close {
    cursor: pointer;
    background-color: var(--MainBorderColor);
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
