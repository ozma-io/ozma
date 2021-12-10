<i18n>
  {
    "en": {
      "clear": "Clear",
      "enter_value": "Enter value",
      "search_placeholder": "Search",
      "no_results": "No entries",
      "no_results_for_filter": "No entries for this filter",
      "trigram_tooltip": "Enter at least 3 characters to load more options",
      "values_error": "Error in select field",
      "not_all_values_found_in_options" : "Not all values found in options",
      "loading_error": "Error during loading more data: {msg}"
    },
    "ru": {
      "clear": "Очистить",
      "enter_value": "Введите значение",
      "search_placeholder": "Поиск",
      "no_results": "Нет записей",
      "no_results_for_filter": "Нет записей по этому фильтру",
      "trigram_tooltip": "Введите как минимум 3 символа, чтобы загрузить ещё опции",
      "values_error": "Ошибка в поле выбора",
      "not_all_values_found_in_options" : "Не все значения найдены в опциях",
      "loading_error": "Ошибка при загрузке новых данных: {msg}"
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
  >
    <InputPopup
      ref="popup"
      :label="label"
      trigger="clickToToggle"
      transition="fade"
      enter-active-class="fade-enter fade-enter-active"
      leave-active-class="fade-leave fade-leave-active"
      :disabled="disabled"
      :visible-arrow="false"
      :compact-mode="compactMode"
      :popper-options="{
        placement: 'bottom-start',
        positionFixed: true,
        modifiers: {
          preventOverflow: { enabled: true, boundariesElement: 'viewport' },
        },
      }"
      @update:showContent="isPopupOpen = $event"
      @popup-opened="onOpenPopup"
      @popup-closed="onClosePopup"
    >
      <template #default="{ mode, isOpen }">
        <div
          ref="selectContainer"
          :class="[
            'select-container',
            {
              'compact-mode': compactMode
            }
          ]"
          tabindex="0"
          @keydown.space.prevent="openPopup"
        >
          <div
            class="default-variant values-container"
          >
            <!-- eslint-disable vue/no-v-html -->
            <span
              v-if="valuesLength === 0"
              :style="listValueStyle"
              class="empty-message-text"
              v-html="'&nbsp;'"
            />
            <!-- eslint-enable vue/no-v-html -->

            <div
              v-else
              class="selected-values"
              :style="containerContentStyle"
            >
              <span
                v-for="(option, index) in selectedOptions"
                :key="index"
                :class="[
                  'option-variant',
                  'option-local-variant',
                  single ? 'single-value' : 'one-of-many-value',
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
                  v-if="showUnselectOption && !compactMode"
                  type="button"
                  class="material-icons md-14 material-button remove-value rounded-circle"
                  value="close"
                  @click.stop="unselectOption(index)"
                >
              </span>
            </div>
          </div>

          <b-input-group-append>
            <b-input-group-text
              v-if="!(mode === 'modal' && isOpen)"
              :class="['with-material-icon select-icon', { 'is-mobile': $isMobile }]"
            >
              <i class="material-icons">
                {{ isPopupOpen ? "expand_less" : "expand_more" }}
              </i>
            </b-input-group-text>
          </b-input-group-append>
        </div>
      </template>

      <template #inner>
        <div
          class="select-container__options_container"
        >
          <b-input-group
            v-if="!disabled && showFilter"
            size="sm"
            class="filter-group"
          >
            <b-input
              ref="filterInput"
              v-model="filterValue"
              size="sm"
              type="text"
              :style="listValueStyle"
              class="filter-input"
              :placeholder="$t('search_placeholder')"
              @keydown.backspace="onBackspace"
              @keydown.up="offsetHoveredOption(-1)"
              @keydown.down="offsetHoveredOption(1)"
              @keydown.enter.prevent.stop="filterInputFinished"
              @keydown.esc.prevent.stop="$emit('blur', $event)"
              @focus="onFilterInputFocus"
            />
            <b-input-group-append>
              <b-input-group-text
                class="with-material-icon filter-icon"
                variant="outline-secondary"
              >
                <i class="material-icons"> search </i>
              </b-input-group-text>
            </b-input-group-append>
            <slot name="qrcode-button" />
          </b-input-group>

          <div class="all-options-wrapper">
            <div
              v-if="single && !required && value !== null"
              class="clear-option-button-wrapper"
            >
              <button
                type="button"
                class="material-button clear-option-button"
                @click="unselectAll"
              >
                {{ $t("clear") }}
              </button>
            </div>

            <div
              v-if="compactMode && !single"
              class="selected-options-list"
            >
              <div
                v-for="(option, index) in selectedOptions"
                :key="index"
                class="option-variant option-local-variant option-wrapper"
                @click.stop="unselectOption(index, false)"
              >
                <button
                  v-if="showUnselectOption"
                  class="material-button remove-value d-flex align-items-center"
                >
                  <span class="material-icons md-14 remove-value">close</span>
                </button>

                <div
                  :style="listValueStyle"
                  :class="[
                    single ? 'single-value' : 'one-of-many-value',
                  ]"
                >
                  <slot
                    name="option"
                    :option="option"
                  >
                    <!-- eslint-disable vue/no-v-html -->
                    <span v-html="option.labelHtml" />
                    <!-- eslint-enable vue/no-v-html -->
                  </slot>
                </div>
              </div>
            </div>

            <div
              ref="optionsContainer"
              class="default-variant options-list"
              :style="optionsListStyle"
            >
              <div
                v-if="visibleOptions.length === 0 && options.length > 0 && loadingState.status === 'ok'"
                class="popup-message"
              >
                {{ $t("no_results_for_filter") }}
              </div>

              <div
                v-for="(option, index) in visibleOptions"
                :key="selectedOptions.length + index"
                :class="[
                  'option-wrapper',
                  'option-variant',
                  'option-local-variant',
                  {
                    'hovered-value': hoveredOptionIndex === index,
                  },
                ]"
                :style="listValueStyle"
                @mouseover="hoveredOptionIndex = index"
                @click.stop="selectOption(option.index)"
              >
                <div class="option-variant option-local-variant single-value">
                  <slot
                    name="option"
                    :option="option"
                  >
                    <!-- eslint-disable vue/no-v-html -->
                    <span v-html="option.labelHtml" />
                    <!-- eslint-enable vue/no-v-html -->
                  </slot>
                </div>
              </div>

              <infinite-loading
                v-if="useInfiniteScrolling"
                ref="infiniteLoading"
                spinner="spiral"
                @infinite="infiniteHandler"
              >
                <template #no-results>
                  {{ $t("no_results") }}
                </template>
                <template #no-more>
                  <span />
                </template>
                <template #error>
                  <template v-if="loadingState.status === 'error'">
                    {{ $t("loading_error", { msg: loadingState.message }) }}
                  </template>
                </template>
              </infinite-loading>
              <div v-else-if="!(loadingState.status === 'ok' && !loadingState.moreAvailable)" class="popup-message">
                {{ $t("trigram_tooltip") }}
              </div>
            </div>
          </div>

          <div
            v-if="$slots['actions']"
            class="select-container__options__actions"
            @click="closePopup"
          >
            <slot
              name="actions"
            />
          </div>
        </div>
      </template>
    </InputPopup>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import InfiniteLoading, { StateChanger } from "vue-infinite-loading";
import Popper from "vue-popperjs";

import { deepClone, deepEquals, NeverError, nextRender, replaceHtmlLinks } from "@/utils";
import InputPopup from "@/components/InputPopup.vue";

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
  components: { Popper, InfiniteLoading, InputPopup },
})
export default class MultiSelect extends Vue {
  @Prop({ required: true }) value!: number | number[] | null;
  @Prop({ type: Array, default: () => [] }) options!: ISelectOption<unknown>[];
  @Prop({ type: Boolean, default: false }) single!: boolean;
  @Prop({ type: Boolean, default: false }) required!: boolean;
  @Prop({ type: Boolean, default: false }) disabled!: boolean;
  @Prop({ type: Number }) height!: number | undefined;
  @Prop({ type: Number, default: 250 }) optionsListHeight!: number;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Boolean, default: false }) showFilter!: boolean;
  @Prop({ type: Object, default: (): LoadingState => ({ status: "ok", moreAvailable: false }) }) loadingState!: LoadingState;
  @Prop({ type: Function }) processFilter!: (_: string) => Promise<boolean> | undefined;
  @Prop({ type: String, default: null }) label!: string | null;
  @Prop({ type: Boolean, default: false }) compactMode!: boolean;

  private filterValue = "";
  private hoveredOptionIndex: number | null = null;
  private isPopupOpen = false;
  private oldLoadingState: LoadingState = { status: "ok", moreAvailable: false };

  // Due to trigram indexes require at least 3 symbols.
  private get useInfiniteScrolling() {
    return this.filterValue.length === 0 || this.filterValue.length >= 3;
  }

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

  get selectedOptions(): ISelectOptionHtml<unknown>[] {
    if (this.value === null) {
      return [];
    } else if (this.single) {
      return [this.htmlOptions[this.value as number]];
    } else {
      const values = this.value as number[];
      const options = values.map(i => this.htmlOptions[i]);
      if (options.some(option => option === undefined)) {
        this.$bvToast.toast(this.$t("not_all_values_found_in_options").toString(), {
          title: this.$t("values_error").toString(),
          variant: "danger",
          solid: true,
        });
        return options.filter(o => o !== undefined);
      } else {
        return options;
      }
    }
  }

  private mounted() {
    if (this.autofocus) {
      void this.$nextTick().then(() => this.openPopup());
    }
  }

  private loadMoreWithEvent(ev: StateChanger) {
    this.$emit("load-more", (state: LoadingResult) => {
      if (state.status === "error") {
        ev.error();
      } else if (state.status === "ok") {
        ev.loaded();
        if (!state.moreAvailable) {
          ev.complete();
        }
      } else {
        throw new NeverError(state);
      }
    });
  }

  private infiniteHandler(ev: StateChanger) {
    if (this.loadingState.status === "ok" && !this.loadingState.moreAvailable) {
      ev.loaded();
      ev.complete();
      return;
    }

    this.$emit("load-more", (state: LoadingResult) => {
      if (state.status === "error") {
        ev.error();
      } else if (state.status === "ok") {
        if (this.options.length > 0) {
          ev.loaded();
        }
        if (!state.moreAvailable) {
          ev.complete();
        }
        if (this.options.length === 0 && state.moreAvailable) {
          ev.loaded();
        }
      } else {
        throw new NeverError(state);
      }
    });
  }

  @Watch("visibleOptions")
  private updatePopupPosition() {
    void nextRender().then(() => (this.$refs.popup as InputPopup | undefined)?.updatePopper());
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

    if (this.loadingState.status === "ok") {
      (this.$refs["infiniteLoading"] as InfiniteLoading | undefined)?.stateChanger.reset();
    }
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
    if (this.filterValue === "" && !this.disabled && this.selectedOptions.length > 0) {
      const closePopup = this.selectedOptions.length === 1;
      this.unselectOption(this.selectedOptions[this.selectedOptions.length - 1].index, closePopup);
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
      /* maxHeight: `${this.optionsListHeight}px`, */
    };
  }

  get listValueStyle() {
    const height = this.height ? { maxHeight: `${this.height}px` } : {};
    return {
      ...height,
    };
  }

  private focusInput() {
    (this.$refs.filterInput as HTMLInputElement | undefined)?.focus();
  }

  private focusSelect() {
    (this.$refs.selectContainer as HTMLElement | undefined)?.focus();
  }

  private onFilterInputFocus() {
    this.$emit("focus");
  }

  private openPopup() {
    if (this.disabled) return;

    this.hoveredOptionIndex = null;
    void (this.$refs.popup as InputPopup | undefined)?.openPopup();
  }

  private async onOpenPopup() {
    if (this.disabled) return;

    this.isPopupOpen = true;
    this.$emit("focus");
    await nextRender();
    (this.$refs["infiniteLoading"] as InfiniteLoading | undefined)?.stateChanger.reset();

    // On-screen keyboard disturbs if there are not so many options to filter.
    if (!this.$isMobile) {
      this.focusInput();
    }
  }

  private async closePopup() {
    this.$emit("blur");
    if (this.disabled) return;

    await (this.$refs.popup as InputPopup | undefined)?.closePopup();
  }

  private onClosePopup() {
    this.$emit("blur");
    this.isPopupOpen = false;
    this.filterValue = "";
  }

  private togglePopup() {
    if (this.isPopupOpen) {
      void this.closePopup();
    } else {
      this.openPopup();
    }
  }

  @Watch("visibleOptions", { immediate: true })
  private visibleOptionsUpdated() {
    this.offsetHoveredOption(0);
  }

  private offsetHoveredOption(offset: number) {
    if (this.visibleOptions.length === 0) {
      this.hoveredOptionIndex = null;
    } else {
      this.hoveredOptionIndex = Math.max(0, Math.min(this.visibleOptions.length - 1, (this.hoveredOptionIndex ?? 0) + offset));
    }
  }

  @Watch("hoveredOptionIndex")
  private scrollToHoveredOption(hoveredOptionIndex: number | null) {
    if (hoveredOptionIndex === null) return;

    const container = this.$refs.optionsContainer as HTMLElement | undefined;
    const item = container?.children?.[hoveredOptionIndex];
    item?.scrollIntoView({ block: "nearest" });
  }

  private selectOption(index: number) {
    console.assert(!this.disabled);

    if (this.single) {
      this.$emit("update:value", index);
    } else {
      this.$emit("add-value", index);
    }
    this.filterValue = "";
    const filterInput = this.$refs.filterInput as HTMLInputElement | undefined;
    if (filterInput !== undefined) {
      filterInput.focus();
    }
    if (this.single) {
      void this.closePopup().then(() => this.focusSelect());
    }
  }

  private unselectOption(index: number, closePopup = true) {
    console.assert(!this.disabled);

    if (this.single) {
      if (this.selectedOptions.length > 0 && this.selectedOptions[0].index === index) {
        this.$emit("update:value", null);
      }
    } else {
      this.$emit("remove-value", index);
    }
    if (closePopup) {
      void this.closePopup().then(() => this.focusSelect());
    }
  }

  private unselectAll() {
    console.assert(!this.disabled);

    if (this.single) {
      this.$emit("update:value", null);
    } else {
      for (const [index, _] of this.selectedOptions.entries()) {
        // Because options are removed one-by-one we need to reverse indexes there.
        // Maybe we need to rewrite it to something index-independed.
        this.$emit("remove-value", this.selectedOptions.length - index - 1);
      }
    }

    // In theory we can remove all values one-by-one by code above,
    // but I faced some troubles with this approach in <ArrayReferenceField>, so for this case there are direct event.
    this.$emit("clear-values");
  }

  private async filterInputFinished() {
    if (this.processFilter && await this.processFilter(this.filterValue)) {
      this.filterValue = "";
    } else if (this.hoveredOptionIndex !== null) {
      this.selectOption(this.visibleOptions[this.hoveredOptionIndex].index);
      this.filterValue = "";
    }
  }
}
</script>

<style lang="scss" scoped>
  @include variant-to-local("option");

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

  .filter-icon {
    background-color: var(--default-backgroundColor);
    color: var(--default-foregroundColor);
    border-left-width: 0;
  }

  .empty-message-text {
    display: inline-flex;
    width: 100%;
    cursor: pointer;
    align-self: center;
    align-items: center;
    color: var(--cell-foregroundDarkerColor);
  }

  .popup-message {
    color: var(--cell-foregroundDarkerColor);
    padding: 1rem 0;
    text-align: center;
  }

  .select-container {
    height: auto;
    max-height: 100%;
    width: 100%;
    display: flex;
    flex-direction: row;
    border: 1px solid var(--cell-borderColor);
    background: var(--cell-backgroundColor);
    color: var(--cell-foregroundColor);
    border-radius: 0.2rem;
    cursor: pointer;

    &:focus-within,
    &:focus {
      /* Styles to match Bootstrap-inputs */
      border-color: #80bdff;
      box-shadow: 0 0 0 0.2rem rgb(0 123 255 / 25%);
      outline: none; /* Remove default outline */
    }

    .clear-options-button {
      border: none;
      border-radius: 0;
      border-width: 0;
      opacity: 0.5;

      &:hover {
        opacity: 1;
        background-color: var(--cell-backgroundDarker1Color);
        color: var(--cell-foregroundDarkerColor);
      }

      &:focus {
        /* Maybe bad for accessibily, but tried to mimic Bootstrap's "b-input-group-append" style here */
        box-shadow: none;
      }

      &:active {
        background-color: var(--cell-backgroundDarker2Color);
        color: var(--cell-foregroundDarkerColor);
      }
    }

    .select-icon {
      border: none;
      background-color: transparent;
      color: var(--cell-foregroundDarkerColor);
      border-right-width: 0;
      cursor: pointer;
      display: none;

      .select-container:hover &,
      .select-container:focus-within & {
        display: initial;
      }
    }
  }

  .values-container {
    min-width: 0;
    max-height: 11rem;
    display: flex;
    flex-direction: row;
    width: 100%;
    padding: 0.25rem 0.5rem;

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
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.25rem;
    overflow-y: auto;
    cursor: pointer;
  }

  .filter-group {
    padding: 0.25rem;
    width: auto;

    .filter-input {
      border-right-width: 0;
      background-color: var(--default-backgroundColor);
      color: var(--default-foregroundColor);
      border-color: var(--default-borderColor);

      &::placeholder {
        color: var(--default-foregroundDarkerColor);
      }

      &:focus {
        border-color: var(--default-borderColor);
        box-shadow: none;
        outline: none;
      }
    }

    &:focus-within {
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

  .select-container__options_container {
    height: 100%;
    display: flex;
    flex-direction: column;
    z-index: 1001;
    overflow: hidden;
  }

  .all-options-wrapper {
    overflow: auto;
  }

  .clear-option-button {
    padding: 0.5rem 0.75rem;
    border-radius: 0;
    display: flex;
    align-items: center;
    width: 100%;
    background: var(--default-backgroundColor);
  }

  .selected-options-list {
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;

    .remove-value {
      background-color: transparent;
    }
  }

  .options-list {
    display: flex;
    flex-direction: column;
  }

  .hovered-value {
    cursor: pointer !important;
    color: var(--option-foregroundColor) !important;
    background-color: var(--option-backgroundDarker1Color) !important;
  }

  div.select-container__options__actions {
    border-top: 1px solid var(--default-borderColor);
    bottom: 0;
    padding: 0;
    color: red;
  }

  .one-of-many-value {
    max-width: 95%;
  }

  .one-of-many-value,
  .single-value {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--option-borderColor);
    background-color: var(--option-backgroundColor);
    color: var(--option-foregroundColor);
    border-radius: 0.333rem;
    padding: 0.25rem 0.5rem;
    line-height: 1rem;
    word-break: break-word;

    > span {
      text-align: left;
    }

    .compact-mode & {
      height: 1.5rem; /* To match with usual inputs. */
    }
  }

  .option-wrapper {
    padding: 0.15rem 0.25rem;
    display: flex;
    flex-direction: row;
    cursor: pointer;

    &:hover {
      background-color: var(--option-backgroundDarker1Color) !important;
    }
  }

  .one-of-many-value > .remove-value {
    @include material-button("reference");

    margin: 0;
    margin-left: 0.25rem;
    margin-right: -0.25rem;
    padding: 0;
    background: none;
    border: none;

    &:not(:hover) {
      opacity: 0.3;
    }
  }

  .one-of-many-value:hover,
  .one-of-many-value:hover > .remove-value {
    cursor: pointer;
  }

  .compact-mode {
    .selected-values {
      flex-wrap: nowrap;
      overflow-x: hidden;
    }
  }
</style>
