<i18n>
  {
    "en": {
      "empty_message": "Empty",
      "clear_all": "Clear all",
      "enter_value": "Enter value",
      "search_placeholder": "Search",
      "no_results": "No entries",
      "error": "Error during loading more data: {msg}"
    },
    "ru": {
      "empty_message": "Пусто",
      "clear_all": "Очистить",
      "enter_value": "Введите значение",
      "search_placeholder": "Поиск",
      "no_results": "Нет записей",
      "error": "Ошибка при загрузке новых данных: {msg}"
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
    @keydown.tab="closePopup"
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
        :class="[
          'select-container',
          {
            'fixed-height': height !== undefined && !isPopupOpen && !single,
          },
        ]"
      >
        <!-- eslint-enable vue/no-deprecated-slot-attribute -->
        <i class="material-icons select-prepend-icon">
          {{ isPopupOpen ? "expand_less" : "expand_more" }}
        </i>
        <div
          :class="[
            'values-container',
            {
              'fixed-height': height !== undefined && !isPopupOpen && !single,
            },
          ]"
        >
          <span
            v-if="valuesLength === 0"
            :style="listValueStyle"
            class="empty-message-text"
          >
            {{ $t('empty_message') }}
          </span>

          <div
            v-else
            :class="[
              'selected-values',
              {
                'fixed-height': height !== undefined,
              }
            ]"
            :style="containerContentStyle"
          >
            <span
              v-for="(option, index) in selectedOptions"
              :key="index"
              :class="[
                single ? 'single-value' : 'one-of-many-value',
                {
                  'has-links': option.label !== option.labelHtml,
                },
              ]"
              :style="listValueStyle"
            >
              <slot
                name="option"
                :option="option"
              >
                <!-- eslint-disable vue/no-v-html -->
                <span v-html="option.labelHtml" />
                <!-- eslint-enable vue/no-v-html -->
              </slot>
              <input
                v-if="showUnselectOption"
                type="button"
                class="material-icons material-button remove-value rounded-circle"
                value="close"
                @click="unselectOption(index)"
              >
            </span>
          </div>
        </div>

        <b-input-group-append v-if="showClearOptions">
          <b-button
            class="button with-material-icon clear-options-button"
            variant="outline-secondary"
            @click.stop="unselectAll"
          >
            <i
              class="material-icons"
            >clear</i>
          </b-button>
        </b-input-group-append>
      </div>

      <div class="popper multiselect-popper border rounded overflow-hidden shadow">
        <div
          class="select-container__options_container overflow-hidden"
        >
          <b-input-group
            v-if="!disabled && showFilter"
            size="sm"
            class="focus-entire filter-group"
          >
            <b-input-group-prepend>
              <b-input-group-text
                class="with-material-icon filter-prepend-icon"
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
              @keydown.up="offsetFocusedOption(-1)"
              @keydown.down="offsetFocusedOption(1)"
              @keydown.enter="filterInputFinished"
              @focus="onFilterInputFocus"
            />
            <slot name="qrcode-button" />
          </b-input-group>
          <div
            ref="optionsContainer"
            class="options-list"
            infinite-wrapper
            :style="optionsListStyle"
          >
            <span
              v-for="(option, index) in visibleOptions"
              :key="index"
              :class="[
                'single-value',
                {
                  'has-links': option.label !== option.labelHtml,
                  'value-focused': focusedOption === option.index,
                },
              ]"
              :style="listValueStyle"
              @mouseover="focusedOption = option.index"
              @click="selectOption(option.index)"
            >
              <slot
                name="option"
                :option="option"
              >
                <!-- eslint-disable vue/no-v-html -->
                <span v-html="option.labelHtml" />
                <!-- eslint-enable vue/no-v-html -->
              </slot>
            </span>
            <infinite-loading
              ref="infiniteLoading"
              spinner="spiral"
              @infinite="loadMore"
            >
              <template #no-results>
                {{ $t("no_results") }}
              </template>
              <template #no-more>
                <span />
              </template>
              <template #error>
                <template v-if="loadingState.status === 'error'">
                  {{ $t("error", { msg: loadingState.message }) }}
                </template>
              </template>
            </infinite-loading>
          </div>
          <div
            class="select-container__options__actions"
            @click="closePopup"
          >
            <slot
              name="actions"
            />
          </div>
        </div>
      </div>
    </popper>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { deepClone, deepEquals, nextRender, replaceHtmlLinks } from "@/utils";
import Popper from "vue-popperjs";
import InfiniteLoading, { StateChanger } from "vue-infinite-loading";

/* import "vue-popperjs/dist/vue-popper.css"; */

export interface ISelectOption<T> {
  label: string;
  value: T;
}

export interface ISelectOptionHtml<T> extends ISelectOption<T> {
  index: number;
  labelHtml: string; // Stores label with links replaced with <a> tags.
}

export interface IPendingOptions {
  status: "pending";
}

export interface ILoadedOptions {
  status: "ok";
  moreAvailable: boolean;
}

export interface IErrorOptions {
  status: "error";
  message: string;
}

export type LoadingState = IPendingOptions | ILoadedOptions | IErrorOptions;
export type LoadingResult = ILoadedOptions | IErrorOptions;

@Component({
  components: { Popper, InfiniteLoading },
})
export default class MultiSelect extends Vue {
  @Prop({ required: true }) value!: number | number[] | null;
  @Prop({ type: Array, default: () => [] }) options!: ISelectOption<unknown>[];
  @Prop({ type: Boolean, default: false }) single!: boolean;
  @Prop({ type: Boolean, default: false }) required!: boolean;
  @Prop({ type: Boolean, default: false }) disabled!: boolean;
  @Prop({ type: Number }) height!: number | undefined;
  @Prop({ type: Number, default: 200 }) optionsListHeight!: number;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Boolean, default: false }) showFilter!: boolean;
  @Prop({ type: Object, default: (): LoadingState => ({ status: "ok", moreAvailable: false }) }) loadingState!: LoadingState;
  @Prop({ type: Function }) processFilter!: (_: string) => Promise<boolean> | undefined;

  private filterValue = "";
  // Option, currently focused in a popup.
  private focusedOption: number | null = null;
  private isPopupOpen = false;
  private oldLoadingState: LoadingState = { status: "ok", moreAvailable: false };

  get htmlOptions(): ISelectOptionHtml<unknown>[] {
    return this.options.map((option, index) => ({
      ...option,
      index,
      labelHtml: replaceHtmlLinks(option.label),
    }));
  }

  get lowerFilterValue() {
    return this.filterValue.toLowerCase();
  }

  get visibleOptions() {
    let visible: ISelectOptionHtml<unknown>[];
    if (this.filterValue === "") {
      visible = this.htmlOptions;
    } else {
      visible = this.htmlOptions.filter(option => option.label.toLowerCase().includes(this.lowerFilterValue));
    }

    if (!this.single) {
      return visible.filter(option => (this.value as number[]).indexOf(option.index) === -1);
    } else {
      return visible;
    }
  }

  @Watch("loadingState", { immediate: true })
  private loadingStateChanged(newValue: LoadingState) {
    const loader = this.$refs["infiniteLoading"] as InfiniteLoading | undefined;
    if (!loader) return;

    const oldValue = this.oldLoadingState;
    this.oldLoadingState = deepClone(newValue);

    // If error or "all entries fetched" status has been reached before, reset the component.
    if (((oldValue.status === "ok" && !oldValue.moreAvailable) || oldValue.status === "error") && !deepEquals(oldValue, newValue)) {
      loader.stateChanger.reset();
    }
  }

  get selectedOptions() {
    if (this.value === null) {
      return [];
    } else if (this.single) {
      return [this.htmlOptions[this.value as number]];
    } else {
      return (this.value as number[]).map(i => this.htmlOptions[i]);
    }
  }

  get selectedOption() {
    if (this.selectedOptions.length > 0) {
      return this.selectedOptions[0];
    } else {
      return null;
    }
  }

  private mounted() {
    if (this.autofocus) {
      void this.$nextTick().then(() => this.openPopup());
    }
  }

  private loadMore(ev: StateChanger) {
    this.$emit("load-more", (state: LoadingResult) => {
      if (state.status === "error") {
        ev.error();
      } else {
        ev.loaded();
        if (!state.moreAvailable) {
          ev.complete();
        }
      }
    });
  }

  @Watch("disabled")
  private disabledChanged() {
    if (this.disabled) {
      void this.closePopup();
    }
  }

  @Watch("filterValue")
  private emitFilterValue() {
    this.$emit("update:filter", this.filterValue);
  }

  @Watch("autofocus")
  private onAutofocus(autofocus: boolean) {
    if (autofocus) {
      void this.openPopup();
    }
  }

  get valuesLength() {
    if (this.value === null) {
      return 0;
    } else if (this.single) {
      return 1;
    } else {
      return (this.value as number[]).length;
    }
  }

  private onBackspace() {
    if (this.filterValue === "" && this.showUnselectOption && this.selectedOptions.length > 0) {
      this.unselectOption(this.selectedOptions[this.selectedOptions.length - 1].index);
    }
  }

  get showUnselectOption() {
    return !this.disabled && !this.single;
  }

  get showClearOptions() {
    return this.selectedOptions.length > 0 && !this.disabled && !(this.required && this.selectedOptions.length <= 1);
  }

  get containerContentStyle() {
    const height = this.height && !this.isPopupOpen ? { height: `${this.height}px`, minHeight: "unset" } : {};
    return {
      ...height,
    };
  }

  get optionsListStyle() {
    return {
      maxHeight: `${this.optionsListHeight}px`,
    };
  }

  get listValueStyle() {
    const height = this.height ? { maxHeight: `${this.height}px` } : {};
    return {
      ...height,
    };
  }

  private focusInput() {
    (this.$refs.filterInput as HTMLInputElement)?.focus();
  }

  private onFilterInputFocus() {
    this.$emit("focus");
  }

  private async openPopup() {
    if (this.disabled) return;
    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    this.focusedOption = null;
    await popupRef.doShow();
  }

  private async onOpenPopup() {
    this.isPopupOpen = true;
    await nextRender();
    if (this.loadingState.status === "ok" && this.loadingState.moreAvailable) {
      this.loadMoreIfNeeded();
    }
    // On-screen keyboard disturbs if there are not so many options to filter.
    if (!this.$isMobile) {
      this.focusInput();
    }
  }

  private loadMoreIfNeeded() {
    const container = this.$refs.optionsContainer as HTMLElement | undefined;
    if (!container) {
      return;
    }
    if (container.clientHeight < this.optionsListHeight) {
      this.$emit("load-more", (ev: LoadingResult) => {
        if (ev.status === "ok" && ev.moreAvailable) {
          this.loadMoreIfNeeded();
        }
      });
    }
  }

  private async closePopup() {
    if (this.disabled) return;
    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    await popupRef.doClose();
  }

  private onClosePopup() {
    this.isPopupOpen = false;
    this.filterValue = "";
  }

  private async togglePopup() {
    if (this.isPopupOpen) {
      await this.closePopup();
    } else {
      await this.openPopup();
    }
  }

  @Watch("visibleOptions")
  private visibleOptionsUpdated() {
    this.offsetFocusedOption(0);
  }

  private offsetFocusedOption(offset: number) {
    if (this.visibleOptions.length === 0) {
      this.focusedOption = null;
    } else {
      this.focusedOption = Math.max(0, Math.min(this.visibleOptions.length - 1, (this.focusedOption ?? 0) + offset));
    }
  }

  @Watch("focusedOption")
  private scrollToFocusedOption(focusedOption: number | null) {
    if (focusedOption === null) {
      return;
    }
    const container = this.$refs.optionsContainer as HTMLElement | undefined;
    const item = container?.children?.[focusedOption];
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }

  private selectOption(index: number) {
    console.assert(!this.disabled);

    if (this.single) {
      this.$emit("update:value", index);
    } else {
      this.$emit("add-value", index);
    }
    this.filterValue = "";
    const filterInput = this.$refs.filterInput as HTMLInputElement;
    if (filterInput !== undefined) {
      filterInput.focus();
    }
    if (this.single) {
      void this.closePopup();
    }
  }

  private unselectOption(index: number) {
    console.assert(!this.disabled);

    if (this.single) {
      if (this.selectedOptions.length > 0 && this.selectedOptions[0].index === index) {
        this.$emit("update:value", null);
      }
    } else {
      this.$emit("remove-value", index);
    }
    void this.closePopup();
  }

  private unselectAll() {
    console.assert(!this.disabled);

    if (this.single) {
      this.$emit("update:value", null);
    } else {
      for (const index of this.value as number[]) {
        this.$emit("remove-value", index);
      }
    }
  }

  private async filterInputFinished() {
    if (this.processFilter && await this.processFilter(this.filterValue)) {
      this.filterValue = "";
    } else if (this.focusedOption !== null) {
      this.selectOption(this.focusedOption);
      this.filterValue = "";
    }
  }
}
</script>

<style lang="scss" scoped>
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

  .select-prepend-icon {
    color: var(--MainTextColorLight);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 4px;
    margin-right: -1px;
    cursor: pointer;
  }

  .filter-prepend-icon {
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
    color: var(--MainTextColorLight);
  }

  .select-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    border: 1px solid var(--MainBorderColor);
    border-radius: 0.2rem;
    cursor: pointer;

    .clear-options-button {
      border-bottom-left-radius: 0;
      border-top-left-radius: 0;
      opacity: 0.3;
      border: none;
    }

    &:hover .clear-options-button {
      opacity: 1;
    }
  }

  .values-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    padding: 0.25rem 0.5rem;

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

  .input-button {
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
    font-size: 21px;

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

  .value-focused {
    cursor: pointer !important;
    background-color: var(--MainBorderColor) !important;
    color: var(--MainTextColor) !important;
  }

  div.select-container__options__actions {
    bottom: 0;
    padding: 0;
    color: red;
  }

  .one-of-many-value {
    margin: 3px;
    border: 1px solid var(--MainBorderColor);
    background-color: var(--MainBackgroundColor);
    max-width: 95%;
  }

  .one-of-many-value,
  .single-value {
    display: inline-flex;
    align-items: center;
    color: var(--MainTextColor);
    border-radius: 1rem;
    padding: 2px 5px;
    line-height: 1rem;
    word-break: break-all;

    &:hover .remove-value,
    &:hover ::v-deep .open-modal-button {
      opacity: 1;
    }

    &.has-links {
      ::v-deep span {
        /* Otherwise it's sometimes tricky to click/tap inside if entire value is url/tel/mail. */
        margin-right: 2rem;
      }
    }
  }

  .single-value {
    align-self: center;
    border: 1px solid var(--MainBorderColor);
    background-color: var(--MainBackgroundColor);
    line-height: 1rem;
  }

  .options-list {
    padding: 0;
    margin: 0;
    overflow-x: hidden;
    text-align: left;
    transition: all ease-in 0.2s;

    .single-value {
      margin: 3px;
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    }
  }

  .append-button {
    padding: 0 4px;
  }

  .one-of-many-value > input.remove-value {
    background: none;
    border: none;
    padding: 0;
    margin: 0 0 0 5px;
    font-size: inherit;
    color: var(--MainTextColor);
    opacity: 0.3;
  }

  .one-of-many-value:hover,
  .one-of-many-value:hover > input.remove-value {
    cursor: pointer;
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
