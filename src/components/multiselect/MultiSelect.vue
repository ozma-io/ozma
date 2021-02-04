<i18n>
    {
      "en": {
        "empty_message": "Empty",
        "clear_all": "Clear all",
        "enter_value": "Enter value",
        "error_qrcode_is_inappropriate" : "QRCode is inappropriate",
        "error": "Error",
        "search_placeholder": "Search"
      },
      "ru": {
        "empty_message": "Пусто",
        "clear_all": "Очистить",
        "enter_value": "Введите значение",
        "error_qrcode_is_inappropriate" : "QRCode не соответствует назначению",
        "error": "Ошибка",
        "search_placeholder": "Поиск"
      }
    }
</i18n>

<template>
  <div
    :class="[
      'popup-container',
      {
        'is-open': isPopupOpen,

      }
    ]"
    @keydown.tab="() => closePopup()"
  >
    <popper
      ref="popup"
      trigger="clickToToggle"
      transition="fade"
      enter-active-class="fade-enter fade-enter-active"
      leave-active-class="fade-leave fade-leave-active"
      :disabled="disabled"
      :visible-arrow="false"
      :options="{
        placement: 'bottom',
        modifiers: { offset: { offset: '0,0px' } },
      }"
      @show="onOpenPopup"
      @hide="onClosePopup"
    >
      <!-- eslint-disable vue/no-deprecated-slot-attribute -->
      <!-- TODO: Find or make not deprecated popper.js wrapper -->
      <div
        slot="reference"
        ref="selectContainer"
        :class="[
          'select-container',
          {
            'fixed-height': hasHeight && !isPopupOpen && !single,
          },
        ]"
      >
        <!-- eslint-enable vue/no-deprecated-slot-attribute -->
        <span
          v-if="isEmpty"
          :style="listValueStyle"
          class="empty-message-text"
        >
          {{ $t('empty_message') }}
        </span>

        <div
          v-else
          ref="valuesList"
          :class="[
            'selected-values',
            {
              'fixed-height': hasHeight,
            }
          ]"
          :style="containerContentStyle"
        >
          <slot
            v-if="single"
            name="singleValue"
            :listValueStyle="listValueStyle"
            :valueOption="valueOption"
          >
            <div
              :style="listValueStyle"
              class="single-value"
            >
              {{ valueOption.label }}
            </div>
          </slot>

          <slot
            v-else
            name="label"
            :valueOptions="valueOptions"
            :listValueStyle="listValueStyle"
            :removeValue="removeValue"
            :showValueRemove="showValueRemove"
          >
            <div
              v-for="(option, index) in valueOptions"
              :key="option.value"
              class="one-of-many-value single-value"
              :style="listValueStyle"
              @click.stop
            >
              {{ option.label }}
              <input
                v-if="showValueRemove"
                type="button"
                class="material-icons remove-value"
                value="close"
                @click="removeValue(index)"
                @blur="() => closePopup()"
              >
            </div>
          </slot>
        </div>

        <input
          v-if="!disabled && (required || isEmpty)"
          type="button"
          class="material-icons select-container__chevron"
          :value="isPopupOpen ? 'expand_less' : 'expand_more'"
        >
        <input
          v-if="!isEmpty && !required && !disabled"
          type="button"
          class="material-icons material-button close-button select-container__chevron"
          value="close"
          @click.stop="removeValue()"
        >
      </div>

      <div class="popper multiselect-popper border rounded overflow-hidden shadow">
        <div
          ref="selectedOptionsContainer"
          class="select-container__options_container overflow-hidden"
        >
          <b-input-group
            v-if="isNeedFilter"
            size="sm"
            class="focus-entire filter-group"
          >
            <b-input-group-prepend>
              <b-input-group-text
                class="with-material-icon prepend-icon"
                variant="outline-secondary"
              >
                <i class="material-icons"> search </i>
              </b-input-group-text>
            </b-input-group-prepend>
            <b-input
              ref="filterInput"
              v-model="filterValue"
              size="sm"
              type="text"
              :style="listValueStyle"
              class="filter-input"
              :placeholder="$t('search_placeholder')"
              @keydown.backspace="onBackspace"
              @keydown.up="offsetSelectedOption(-1)"
              @keydown.down="offsetSelectedOption(1)"
              @keydown.enter="addSelectedOptionToValue"
              @focus="onFilterInputFocus"
            />
          </b-input-group>

          <slot
            name="option"
            :selectedOptions="selectedOptions"
            :addOptionToValue="addOptionToValue"
            :selectedOption="selectedOption"
            :isEmpty="isEmpty"
          >
            <ul
              ref="optionsList"
              class="select-container__options_list"
              :style="optionsListStyle"
            >
              <li
                v-for="(option, index) in selectedOptions"
                :key="option.value"
                :class="[
                  'select-container__options_list__option',
                  'single-value',
                  {'select-container__options_list__option_active': selectedOption === index }
                ]"
                @click="addOptionToValue(option)"
              >
                {{ option.label }}
              </li>
            </ul>
            <div
              class="select-container__options__actions"
              @click="closePopup()"
            >
              <slot
                name="actions"
              />
            </div>
          </slot>
        </div>
      </div>
    </popper>
  </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { equalEntityRef, valueIsNull } from "@/values";
import { replaceHtmlLinks } from "@/utils";
import type { IEntriesRef } from "@/state/entries";
import { parseQRCode } from "@/components/qrcode/QRCode.vue";
import Popper from "vue-popperjs";
/* import "vue-popperjs/dist/vue-popper.css"; */

export interface ISelectOption {
  value: any;
  label: string;
  meta?: { [key: string]: any };
}

export interface ISelectOptionHtml extends ISelectOption {
  labelHtml: string; // Stores label with links replaced with <a> tags.
}

const defaultOptionFilter = (query: string) => (option: ISelectOption) =>
  R.contains(query.toLowerCase().trim(), R.pathOr("", ["label"], option).toLowerCase());

@Component({ components: { Popper } })
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
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Object, default: null }) entry!: IEntriesRef;

  private selectedOption = -1;
  private filterValue = "";
  private isNeedFilter = true;
  private isPopupOpen = false;

  private mounted() {
    if (this.selectedOptions.length < 3 && this.single) {
      this.isNeedFilter = false;
    }
    if (this.autofocus) {
      void this.onAutofocus(true);
    }
  }

  @Watch("autofocus")
  private async onAutofocus(autofocus: boolean) {
    if (autofocus) {
      await this.$nextTick();
      void this.openPopup();
    }
  }

  private onBackspace() {
    if (this.filterValue === "" && !this.single && !this.disabled && (!this.required || (this.required && this.currentValues.length > 1))) {
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
    const showIfEditing = !this.isPopupOpen || (this.isPopupOpen && this.filterValue === "");
    return this.single && !this.isEmpty && showIfEditing;
  }

  private get showValueRemove(): boolean {
    const isLastValueLeft = this.single ? true : this.currentValues.length <= 1;
    return (!this.disabled && !(isLastValueLeft && this.required));
  }

  /* private get valueOption(): ISelectOption | undefined {
   *   return this.getOption(this.currentValue);
   * } */

  private get valueOption(): ISelectOptionHtml | undefined {
    const option = this.getOption(this.currentValue);
    if (option === undefined) {
      return undefined;
    }
    const labelHtml = replaceHtmlLinks(option.label);
    return {
      ...option,
      labelHtml,
    };
  }

  private get valueOptions(): ISelectOptionHtml[] {
    if (this.value instanceof Array) {
      return (this.currentValues
        .map(x => this.getOption(x))
        .filter(R.identity) as ISelectOption[])
        .map(option => ({
          ...option,
          labelHtml: replaceHtmlLinks(option.label),
        }));
    }
    return [];
  }

  private get hasHeight(): boolean {
    return !!this.height;
  }

  private get containerContentStyle() {
    const height = this.height && !this.isPopupOpen ? { height: `${this.height}px`, minHeight: "unset" } : {};
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
    const height = this.height ? { maxHeight: `${this.height}px` } : {};
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

  private get selectedOptions(): ISelectOptionHtml[] {
    return this.options
      .filter(this.optionFilterFN(this.filterValue))
      .map(option => {
        const label = this.getLabel(option);
        const labelHtml = replaceHtmlLinks(label);
        return { ...option, label, labelHtml };
      });
  }

  private focusInput() {
    (this.$refs.filterInput as HTMLInputElement)?.focus();
  }

  private onFilterInputFocus() {
    this.$emit("focus", null);
  }

  private async openPopup() {
    if (this.disabled) return;
    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    await popupRef.doShow();
    this.selectedOption = -1;
  }

  private async onOpenPopup() {
    this.isPopupOpen = true;
    // On-screen keyboard disturbs if there are not so many options to filter.
    if (this.$isMobile) return;

    await Vue.nextTick();
    this.focusInput();
  }

  private async closePopup() {
    if (this.disabled) return;
    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    await popupRef.doClose();
    this.selectedOption = -1;
  }

  private onClosePopup() {
    this.isPopupOpen = false;
  }

  private togglePopup() {
    if (this.disabled) return;
    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    if (popupRef.showPopper) {
      void this.closePopup();
    } else {
      void this.openPopup();
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
      this.selectedOption += offset;
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
        this.$emit("update:value", option.value);
      } else {
        const newValue = R.uniq([...this.currentValues, option.value]);
        this.$emit("update:value", newValue);
      }
      this.filterValue = "";
      const filterInput = this.$refs.filterInput as HTMLInputElement;
      if (filterInput !== undefined) {
        filterInput.focus();
      }
      this.findNewSelected();
    }
    void this.closePopup();
  }

  // FIXME: keyboard selecting doesn's seems to work.
  private addSelectedOptionToValue() {
    const qrcode = parseQRCode(this.filterValue);
    if (qrcode !== null) {
      if (!equalEntityRef(qrcode.entity, this.entry.entity)) {
        this.makeToast(this.$t("error_qrcode_is_inappropriate").toString());
      } else {
        const option: ISelectOption | undefined = this.options.find(o => o.value === qrcode.id);
        if (option !== undefined) {
          this.addOptionToValue(option);
          return;
        }
      }
    }

    if (this.selectedOption > -1) {
      const option: ISelectOption | null = R.pathOr(null, [this.selectedOption], this.selectedOptions);
      if (option) {
        this.addOptionToValue(option);
        return;
      }
    }

    if (this.options.length) {
      const value = Number(this.filterValue);
      const option: ISelectOption | undefined = this.options.find(o => o.value === value);
      if (option !== undefined) {
        this.addOptionToValue(option);
        return;
      }
    }

    if (this.selectedOptions.length) {
      const option: ISelectOption = this.selectedOptions[0];
      if (option) {
        this.addOptionToValue(option);
      }
    }
  }

  private removeValue(index?: number) {
    if ((index !== undefined) && !this.single) {
      const newValue = this.currentValues.filter((_: any, i: number) => index !== i);
      this.$emit("update:value", newValue);
    } else {
      this.$emit("update:value", this.emptyValue);
    }
    void this.closePopup();
  }

  private clearValues() {
    if (!this.single) {
      this.$emit("update:value", this.emptyValue);
    }
  }

  private makeToast(message: string) {
    this.$bvToast.toast(message, {
      title: this.$t("error").toString(),
      variant: "danger",
      solid: true,
      noAutoHide: true,
    });
  }
}
</script>

// FIXME: This styles can not be `scoped` currently because it breaks MultiSelect userview and ReferenceField.
// Class renames also breaks them!
<style lang="scss">
  .fade-enter-active,
  .fade-leave-active {
    transition: all 0.1s;
  }

  .fade-enter,
  .fade-leave-to {
    opacity: 0;
  }

  .fade-enter-to,
  .fade-leave {
    opacity: 1;
  }

  .popup-container {
    width: 100%;
    position: relative;
    z-index: 30;

    &.is-open {
      z-index: 31; /* To be above other components with popups */
    }
  }

  .prepend-icon {
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColorLight);
    border-right-width: 0;
  }

  .empty-message-text {
    display: inline-flex;
    width: 100%;
    cursor: pointer;
    align-self: center;
    align-items: center;
    color: var(--MainTextColor);
  }

  .select-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    border: 1px solid #ced4da;
    border-radius: 0.2rem;
    padding: 0.15rem 0.5rem;
    padding-left: 4px;

    &.fixed-height {
      box-shadow: inset -5px -5px 8px 5px rgba(0, 0, 0, 0.25);
    }

    &:focus-within {
      /* TODO: Move this to one file! */
      $input-focus-border-color: #80bdff;
      $input-focus-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);

      border-color: $input-focus-border-color !important;
      box-shadow: $input-focus-shadow !important;
      border-radius: 0.2rem;
    }
  }

  .selected-values {
    width: 100%;
    cursor: pointer;
    align-content: center;
    overflow-x: auto;

    &.fixed-height {
      overflow: hidden;
    }
  }

  .filter-group {
    margin: 5px;
    width: auto;

    .filter-input {
      border-left-width: 0;
    }

    .filter-input:focus {
      outline: none;
    }
  }

  .select-container__chevron {
    display: flex;
    justify-content: center;
    margin-left: auto;
    border: 0;
    background: 0;
    padding: 0;
    cursor: pointer;
    z-index: 10;
    color: var(--MainTextColor);
    opacity: 0.2;
    transition: opacity 0.1s;

    .select-container:hover &,
    .select-container:focus-within & {
      opacity: 1;
    }
  }

  .multiselect-popper {
    max-width: calc(100% + 2px);
    width: calc(100% + 2px);

    .select-container__options_container {
      position: relative;
      z-index: 1001;
      width: 100%;
      background: white;
      list-style: none;
    }
  }

  .select-container__options_list {
    padding: 0;
    margin: 0;
    max-height: 250px;
    overflow-x: hidden;
    text-align: left;
    transition: all ease-in 0.2s;
  }

  .select-container__options_list > li.select-container__options_list__option {
    color: var(--MainTextColor);
    margin: 2px;
    padding: 4px 8px;
    cursor: pointer;
    line-height: 1rem;
    word-break: break-all;
  }

  .select-container__options_list > li.select-container__options_list__option:hover,
  .select-container__options_list__option_active {
    cursor: pointer;
    background-color: var(--MainBorderColor);
    color: var(--MainTextColor);
  }

  .select-container__options_list__option > span {
    margin: 0;
  }

  div.select-container__options__actions {
    bottom: 0;
    padding: 0;
    color: red;
  }

  .one-of-many-value {
    margin: 2px;
    border: 1px solid var(--MainBorderColor);
    background-color: var(--MainBackgroundColor);
    word-break: break-all;
    max-width: 95%;
  }

  .one-of-many-value,
  .single-value {
    display: inline-flex;
    align-items: center;
    color: var(--MainTextColor);
    border-radius: 1rem;
    box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    padding: 2px 5px;
    line-height: 1rem;
  }

  .single-value {
    align-self: center;
    border: 1px solid var(--MainBorderColor);
    background-color: var(--MainBackgroundColor);
  }

  .single-value_open {
    color: gray;
  }

  .one-of-many-value > input.remove-value {
    background: none;
    border: none;
    padding: 0;
    margin: 0 0 0 5px;
    font-size: inherit;
    color: var(--MainTextColor);
  }

  .one-of-many-value:hover,
  .one-of-many-value:hover > input.remove-value {
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
