<i18n>
  {
    "en": {
      "empty_message": "Empty",
      "clear_all": "Clear all",
      "enter_value": "Enter value",
      "search_placeholder": "Search",
      "no_results": "No entries",
      "no_results_for_filter": "No entries for this filter",
      "trigram_tooltip": "Enter at least 3 characters to load more options",
      "error": "Error during loading more data: {msg}"
    },
    "ru": {
      "empty_message": "Пусто",
      "clear_all": "Очистить",
      "enter_value": "Введите значение",
      "search_placeholder": "Поиск",
      "no_results": "Нет записей",
      "no_results_for_filter": "Нет записей по этому фильтру",
      "trigram_tooltip": "Введите как минимум 3 символа, чтобы загрузить ещё опции",
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
        placement: 'bottom-start',
        positionFixed: true,
        modifiers: {
          offset: { offset: '0,0px' },
          preventOverflow: { escapeWithReference: true, boundariesElement: 'viewport' },
        },
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
                class="material-icons md-18 material-button remove-value rounded-circle"
                value="close"
                @click="unselectOption(index)"
              >
            </span>
          </div>
        </div>

        <b-input-group-append>
          <b-button
            v-if="showClearOptions"
            class="button with-material-icon clear-content-button clear-options-button"
            variant="outline-secondary"
            @click.stop="unselectAll"
          >
            <i
              class="material-icons"
            >clear</i>
          </b-button>

          <b-input-group-text
            :class="['with-material-icon select-icon', { 'is-mobile': $isMobile }]"
          >
            <i class="material-icons">
              {{ isPopupOpen ? "expand_less" : "expand_more" }}
            </i>
          </b-input-group-text>
        </b-input-group-append>
      </div>

      <div class="popper multiselect-popper border rounded overflow-hidden shadow">
        <div
          class="select-container__options_container overflow-hidden"
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
              @keydown.enter="filterInputFinished"
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
          <div
            ref="optionsContainer"
            class="options-list"
            data-infinite-wrapper
            infinite-wrapper
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
              :key="index"
              :class="[
                'option-wrapper',
                {
                  'has-links': option.label !== option.labelHtml,
                  'hovered-value': hoveredOpinionIndex === index,
                },
              ]"
              :style="listValueStyle"
              @mouseover="hoveredOpinionIndex = index"
              @click="selectOption(option.index)"
            >
              <div class="single-value">
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
              force-use-infinite-wrapper
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
                  {{ $t("error", { msg: loadingState.message }) }}
                </template>
              </template>
            </infinite-loading>
            <div v-else-if="!(loadingState.status === 'ok' && !loadingState.moreAvailable)" class="popup-message">
              {{ $t("trigram_tooltip") }}
            </div>
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
import { deepClone, deepEquals, NeverError, nextRender, replaceHtmlLinks } from "@/utils";
import Popper from "vue-popperjs";
import InfiniteLoading, { StateChanger } from "vue-infinite-loading";

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
  @Prop({ type: Number, default: 350 }) optionsListHeight!: number;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Boolean, default: false }) showFilter!: boolean;
  @Prop({ type: Object, default: (): LoadingState => ({ status: "ok", moreAvailable: false }) }) loadingState!: LoadingState;
  @Prop({ type: Function }) processFilter!: (_: string) => Promise<boolean> | undefined;

  private filterValue = "";
  private hoveredOpinionIndex: number | null = null;
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
    void nextRender().then(() => (this.$refs.popup as any)?.updatePopper());
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
    (this.$refs.filterInput as HTMLInputElement | undefined)?.focus();
  }

  private onFilterInputFocus() {
    this.$emit("focus");
  }

  private async openPopup() {
    if (this.disabled) return;
    const popupRef: any = this.$refs.popup;
    if (!popupRef) return;

    this.hoveredOpinionIndex = null;
    await popupRef.doShow();
  }

  private async onOpenPopup() {
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

  @Watch("visibleOptions", { immediate: true })
  private visibleOptionsUpdated() {
    this.offsetHoveredOption(0);
  }

  private offsetHoveredOption(offset: number) {
    if (this.visibleOptions.length === 0) {
      this.hoveredOpinionIndex = null;
    } else {
      this.hoveredOpinionIndex = Math.max(0, Math.min(this.visibleOptions.length - 1, (this.hoveredOpinionIndex ?? 0) + offset));
    }
  }

  @Watch("hoveredOpinionIndex")
  private scrollToHoveredOption(hoveredOpinionIndex: number | null) {
    if (hoveredOpinionIndex === null) return;

    const container = this.$refs.optionsContainer as HTMLElement | undefined;
    const item = container?.children?.[hoveredOpinionIndex];
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
      for (const [index, _] of this.selectedOptions.entries()) {
        // Because options are removed one-by-one we need to reverse indexes there.
        // Maybe we need to rewrite it to something index-independed.
        this.$emit("remove-value", this.selectedOptions.length - index - 1);
      }
    }
  }

  private async filterInputFinished() {
    if (this.processFilter && await this.processFilter(this.filterValue)) {
      this.filterValue = "";
    } else if (this.hoveredOpinionIndex !== null) {
      this.selectOption(this.hoveredOpinionIndex);
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
    color: var(--input-foregroundDarkerColor);
  }

  .popup-message {
    color: var(--input-foregroundDarkerColor);
    padding: 1rem 0;
    text-align: center;
  }

  .select-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    border: 1px solid var(--input-borderColor);
    background: var(--input-backgroundColor);
    color: var(--input-foregroundColor);
    border-radius: 0.2rem;
    cursor: pointer;

    .clear-options-button {
      border: none;
      border-radius: 0;
      border-width: 0;
      opacity: 0.5;

      &:hover {
        opacity: 1;
        background-color: var(--input-backgroundDarker1Color);
        color: var(--input-foregroundDarkerColor);
      }

      &:focus {
        /* Maybe bad for accessibily, but tried to mimic Bootstrap's "b-input-group-append" style here */
        box-shadow: none;
      }

      &:active {
        background-color: var(--input-backgroundDarker2Color);
        color: var(--input-foregroundDarkerColor);
      }
    }

    .select-icon {
      border: none;
      background-color: transparent;
      color: var(--input-foregroundDarkerColor);
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
    line-height: 1;

    &.fixed-height {
      overflow: hidden;
    }
  }

  .filter-group {
    margin: 5px;
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

  .multiselect-popper {
    max-width: 98%;
    width: 25rem;

    .select-container__options_container {
      position: relative;
      z-index: 1001;
      list-style: none;
    }
  }

  .hovered-value {
    cursor: pointer !important;
    color: var(--reference-foregroundColor) !important;
    background-color: var(--reference-backgroundDarker1Color) !important;
  }

  div.select-container__options__actions {
    bottom: 0;
    padding: 0;
    color: red;
    border-top: 1px solid var(--default-borderColor);
  }

  .one-of-many-value {
    margin: 3px;
    max-width: 95%;
  }

  .one-of-many-value,
  .single-value {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--reference-borderColor);
    background-color: var(--reference-backgroundColor);
    color: var(--reference-foregroundColor);
    border-radius: 1rem;
    padding: 0.25rem 0.5rem;
    line-height: 1rem;
    word-break: break-word;

    &:hover .remove-value,
    &:hover ::v-deep .open-modal-button {
      opacity: 1;
    }
  }

  .options-list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .option-wrapper {
    padding: 0.15rem 0.25rem;
    text-align: start;
  }

  .one-of-many-value > input.remove-value {
    @include material-button("reference");

    background: none;
    border: none;
    padding: 0;
    margin: 0;
    margin-left: 0.25rem;
    opacity: 0.3;
  }

  .one-of-many-value:hover,
  .one-of-many-value:hover > input.remove-value {
    cursor: pointer;
  }
</style>
