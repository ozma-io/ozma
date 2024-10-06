<i18n>
  {
    "en": {
      "clear": "Clear",
      "enter_value": "Enter value",
      "search_placeholder": "Search",
      "no_results": "Empty",
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
      "no_results": "Пусто",
      "no_results_for_filter": "Нет записей по этому фильтру",
      "trigram_tooltip": "Введите как минимум 3 символа, чтобы загрузить ещё опции",
      "values_error": "Ошибка в поле выбора",
      "not_all_values_found_in_options" : "Не все значения найдены в опциях",
      "loading_error": "Ошибка при загрузке новых данных: {msg}"
    },
    "es": {
      "clear": "Eliminar",
      "enter_value": "Introduzca un valor",
      "search_placeholder": "La búsqueda",
      "no_results": "Vacio",
      "no_results_for_filter": "No hay entradas para este filtro",
      "trigram_tooltip": "Ingrese al menos 3 caracteres para cargar más opciones",
      "values_error": "El error en el campo de selección",
      "not_all_values_found_in_options" : "No todos los valores están encontrados en opciones",
      "loading_error": "El error al cargar más datos: {msg}"
    }
  }
</i18n>

<template>
  <div
    :class="[
      'popup-container',
      {
        'is-open': showPopup,
      },
    ]"
  >
    <InputPopup
      ref="popup"
      :label="label"
      :popper-options="{
        placement: 'bottom-start',
        positionFixed: true,
        modifiers: {
          preventOverflow: { enabled: true, boundariesElement: 'viewport' },
        },
      }"
      :show="showPopup"
      @update:show="setShowPopup"
    >
      <template #default="{ mode, isOpen }">
        <div
          ref="selectContainer"
          :class="[
            'select-container',
            {
              'compact-mode': compactMode,
            },
          ]"
          tabindex="0"
          @keydown.space.prevent="openPopup"
        >
          <div class="values-container">
            <!-- eslint-disable vue/no-v-html -->
            <span
              v-if="valuesLength === 0"
              :style="listValueStyle"
              class="empty-message-text"
              v-html="'&nbsp;'"
            />
            <!-- eslint-enable vue/no-v-html -->

            <div v-else class="selected-values" :style="containerContentStyle">
              <span
                v-for="(option, index) in selectedOptions"
                :key="index"
                :class="[
                  optionVariantClassName,
                  'option-local-variant',
                  single ? 'single-value' : 'one-of-many-value',
                ]"
                :style="{ ...listValueStyle, ...optionVariantVariables }"
              >
                <slot name="option" :option="option">
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
                />
              </span>
            </div>
          </div>

          <b-input-group-append>
            <b-input-group-text
              v-if="!(mode === 'modal' && isOpen)"
              :class="[
                'with-material-icon select-icon',
                { 'is-mobile': $isMobile },
              ]"
            >
              <i class="material-icons">
                {{ showPopup ? 'expand_less' : 'expand_more' }}
              </i>
            </b-input-group-text>
          </b-input-group-append>
        </div>
      </template>

      <template #inner>
        <div class="select-container__options_container">
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
              @keydown.esc.prevent.stop="showPopup = false"
              @focus="onFilterInputFocus"
            />
            <slot name="qrcode-button" />
          </b-input-group>

          <div class="all-options-wrapper">
            <div
              v-if="single && !required && value !== null"
              class="clear-option-button-wrapper"
              @mouseover="hoveredOptionIndex = null"
            >
              <button
                type="button"
                class="clear-option-button"
                @click="unselectAll"
              >
                <i class="material-icons"> highlight_off </i>
                {{ $t('clear') }}
              </button>
            </div>

            <div v-if="compactMode && !single" class="selected-options-list">
              <div
                v-for="(option, index) in selectedOptions"
                :key="index"
                :class="[
                  optionVariantClassName,
                  'option-local-variant',
                  'option-wrapper',
                ]"
                :style="optionVariantVariables"
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
                  :class="[single ? 'single-value' : 'one-of-many-value']"
                >
                  <slot name="option" :option="option">
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
                v-if="
                  visibleOptions.length === 0 &&
                  options.length > 0 &&
                  loadingState.status === 'ok'
                "
                class="popup-message"
              >
                {{ $t('no_results_for_filter') }}
              </div>

              <div
                v-for="(option, index) in visibleOptions"
                :key="selectedOptions.length + index"
                :class="[
                  'option-wrapper',
                  {
                    'hovered-value': hoveredOptionIndex === index,
                  },
                ]"
                :style="listValueStyle"
                @mouseover="hoveredOptionIndex = index"
                @click.stop="selectOption(option.index)"
              >
                <div class="option">
                  <slot name="option" :option="option">
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
                  {{ $t('no_results') }}
                </template>
                <template #no-more>
                  <span />
                </template>
                <template #error>
                  <template v-if="loadingState.status === 'error'">
                    {{ $t('loading_error', { msg: loadingState.message }) }}
                  </template>
                </template>
              </infinite-loading>
              <div
                v-else-if="
                  !(loadingState.status === 'ok' && !loadingState.moreAvailable)
                "
                class="popup-message"
              >
                {{ $t('trigram_tooltip') }}
              </div>
            </div>
          </div>

          <div
            v-if="$slots['actions']"
            class="select-container__options__actions"
            @mouseover="hoveredOptionIndex = null"
          >
            <slot name="actions" />
          </div>
        </div>
      </template>
    </InputPopup>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import InfiniteLoading, { StateChanger } from 'vue-infinite-loading'
import Popper from 'vue-popperjs'

import {
  deepClone,
  deepEquals,
  NeverError,
  nextRender,
  replaceHtmlLinks,
} from '@/utils'
import InputPopup from '@/components/InputPopup.vue'
import type { ColorVariantAttribute } from '@/utils_colors'
import {
  getColorVariantAttributeClassName,
  getColorVariantAttributeVariables,
} from '@/utils_colors'
import { UserString, isOptionalUserString } from '@/state/translations'

export interface ISelectOption<T> {
  label: string
  value: T
}

interface ISelectOptionHtml<T> {
  index: number
  label: string
  labelHtml: string // Stores label with links replaced with <a> tags.
  value: T
}

export interface IPendingOptions {
  status: 'pending'
}

export interface ILoadedOptions {
  status: 'ok'
  moreAvailable: boolean
}

export interface IErrorOptions {
  status: 'error'
  message: string
}

export type LoadingState = IPendingOptions | ILoadedOptions | IErrorOptions
export type LoadingResult = ILoadedOptions | IErrorOptions

@Component({
  components: { Popper, InfiniteLoading, InputPopup },
})
export default class MultiSelect extends Vue {
  @Prop({ required: true }) value!: number | number[] | null
  @Prop({ type: Array, default: () => [] }) options!: ISelectOption<unknown>[]
  @Prop({ type: Boolean, default: false }) single!: boolean
  @Prop({ type: Boolean, default: false }) required!: boolean
  @Prop({ type: Boolean, default: false }) disabled!: boolean
  @Prop({ type: Number }) height!: number | undefined
  @Prop({ type: Number, default: 250 }) optionsListHeight!: number
  @Prop({ type: Boolean, default: false }) autofocus!: boolean
  @Prop({ type: Boolean, default: false }) showFilter!: boolean
  @Prop({
    type: Object,
    default: (): LoadingState => ({ status: 'ok', moreAvailable: false }),
  })
  loadingState!: LoadingState
  @Prop({ type: Function }) processFilter!: (
    _: string,
  ) => Promise<boolean> | undefined
  @Prop({ validator: isOptionalUserString }) label!: UserString | undefined
  @Prop({ type: Boolean, default: false }) compactMode!: boolean
  @Prop({ type: Object }) optionColorVariantAttribute!: ColorVariantAttribute

  filterValue = ''
  hoveredOptionIndex: number | null = null
  showPopup = false
  oldLoadingState: LoadingState = {
    status: 'ok',
    moreAvailable: false,
  }

  // Due to trigram indexes require at least 3 symbols.
  get useInfiniteScrolling() {
    return this.filterValue.length === 0 || this.filterValue.length >= 3
  }

  get htmlOptions(): ISelectOptionHtml<unknown>[] {
    return this.options.map((option, index) => {
      return {
        index,
        label: option.label,
        labelHtml: replaceHtmlLinks(option.label),
        value: option.value,
      }
    })
  }

  get lowerFilterValue() {
    return this.filterValue.toLowerCase()
  }

  get visibleOptions() {
    let visible: ISelectOptionHtml<unknown>[]
    if (this.filterValue === '') {
      visible = this.htmlOptions
    } else {
      visible = this.htmlOptions.filter((option) =>
        option.label.toLowerCase().includes(this.lowerFilterValue),
      )
    }

    if (!this.single) {
      return visible.filter(
        (option) => (this.value as number[]).indexOf(option.index) === -1,
      )
    } else {
      return visible
    }
  }

  get optionVariantClassName(): string | null {
    return getColorVariantAttributeClassName(this.optionColorVariantAttribute)
  }

  get optionVariantVariables(): Record<string, string> | null {
    return getColorVariantAttributeVariables(this.optionColorVariantAttribute)
  }

  @Watch('loadingState', { immediate: true })
  loadingStateChanged(newValue: LoadingState) {
    const loader = this.$refs['infiniteLoading'] as InfiniteLoading | undefined
    if (!loader) return

    const oldValue = this.oldLoadingState
    this.oldLoadingState = deepClone(newValue)

    // If error or "all entries fetched" status has been reached before, reset the component.
    if (
      ((oldValue.status === 'ok' && !oldValue.moreAvailable) ||
        oldValue.status === 'error') &&
      !deepEquals(oldValue, newValue)
    ) {
      loader.stateChanger.reset()
    }
  }

  get selectedOptions(): ISelectOptionHtml<unknown>[] {
    if (this.value === null) {
      return []
    } else if (this.single) {
      return [this.htmlOptions[this.value as number]]
    } else {
      const values = this.value as number[]
      const options = values.map((i) => this.htmlOptions[i])
      if (options.some((option) => option === undefined)) {
        this.$bvToast.toast(
          this.$t('not_all_values_found_in_options').toString(),
          {
            title: this.$t('values_error').toString(),
            variant: 'danger',
            solid: true,
          },
        )
        return options.filter((o) => o !== undefined)
      } else {
        return options
      }
    }
  }

  loadMoreWithEvent(ev: StateChanger) {
    this.$emit('load-more', (state: LoadingResult) => {
      if (state.status === 'error') {
        ev.error()
      } else if (state.status === 'ok') {
        ev.loaded()
        if (!state.moreAvailable) {
          ev.complete()
        }
      } else {
        throw new NeverError(state)
      }
    })
  }

  infiniteHandler(ev: StateChanger) {
    if (this.loadingState.status === 'ok' && !this.loadingState.moreAvailable) {
      ev.loaded()
      ev.complete()
      return
    }

    this.$emit('load-more', (state: LoadingResult) => {
      if (state.status === 'error') {
        ev.error()
      } else if (state.status === 'ok') {
        if (this.options.length > 0) {
          ev.loaded()
        }
        if (!state.moreAvailable) {
          ev.complete()
        }
        if (this.options.length === 0 && state.moreAvailable) {
          ev.loaded()
        }
      } else {
        throw new NeverError(state)
      }
    })
  }

  @Watch('visibleOptions')
  updatePopupPosition() {
    void nextRender().then(() =>
      (this.$refs.popup as InputPopup | undefined)?.updatePopper(),
    )
  }

  @Watch('disabled')
  disabledChanged() {
    if (this.disabled) {
      this.showPopup = false
    }
  }

  @Watch('filterValue')
  emitFilterValue() {
    this.$emit('update:filter', this.filterValue)

    if (this.loadingState.status === 'ok') {
      ;(
        this.$refs['infiniteLoading'] as InfiniteLoading | undefined
      )?.stateChanger.reset()
    }
  }

  @Watch('autofocus', { immediate: true })
  onAutofocus() {
    if (this.autofocus && !this.disabled) {
      this.showPopup = true
    }
  }

  openPopup() {
    if (!this.disabled) {
      this.showPopup = true
    }
  }

  get valuesLength() {
    if (this.value === null) {
      return 0
    } else if (this.single) {
      return 1
    } else {
      return (this.value as number[]).length
    }
  }

  onBackspace() {
    if (
      this.filterValue === '' &&
      !this.disabled &&
      this.selectedOptions.length > 0
    ) {
      const closePopup = this.selectedOptions.length === 1
      this.unselectOption(
        this.selectedOptions[this.selectedOptions.length - 1].index,
        closePopup,
      )
    }
  }

  get showUnselectOption() {
    return !this.disabled && !this.single
  }

  get showClearOptions() {
    return (
      this.selectedOptions.length > 0 &&
      !this.disabled &&
      !(this.required && this.selectedOptions.length <= 1)
    )
  }

  get containerContentStyle() {
    const height =
      this.height && !this.showPopup
        ? { height: `${this.height}px`, minHeight: 'unset' }
        : {}
    return {
      ...height,
    }
  }

  get optionsListStyle() {
    return {
      /* maxHeight: `${this.optionsListHeight}px`, */
    }
  }

  get listValueStyle() {
    const height = this.height ? { maxHeight: `${this.height}px` } : {}
    return {
      ...height,
    }
  }

  focusInput() {
    ;(this.$refs.filterInput as HTMLInputElement | undefined)?.focus()
  }

  focusSelect() {
    ;(this.$refs.selectContainer as HTMLElement | undefined)?.focus()
  }

  onFilterInputFocus() {
    this.$emit('focus')
  }

  @Watch('showPopup', { immediate: true })
  async onPopupChanged(newValue: boolean, oldValue: boolean) {
    if (newValue === oldValue) {
      return
    }

    if (newValue) {
      this.hoveredOptionIndex = null
      this.$emit('popup-opened')
      await nextRender()
      ;(
        this.$refs['infiniteLoading'] as InfiniteLoading | undefined
      )?.stateChanger.reset()

      // On-screen keyboard disturbs if there are not so many options to filter.
      if (!this.$isMobile) {
        this.focusInput()
      }
    } else {
      this.filterValue = ''
      if (oldValue) {
        this.$emit('popup-closed')
      }
    }
  }

  setShowPopup(newValue: boolean) {
    if (!this.disabled) {
      this.showPopup = newValue
    }
  }

  @Watch('visibleOptions', { immediate: true })
  visibleOptionsUpdated() {
    this.offsetHoveredOption(0)
  }

  offsetHoveredOption(offset: number) {
    if (this.visibleOptions.length === 0) {
      this.hoveredOptionIndex = null
    } else {
      this.hoveredOptionIndex = Math.max(
        0,
        Math.min(
          this.visibleOptions.length - 1,
          (this.hoveredOptionIndex ?? 0) + offset,
        ),
      )
    }
  }

  @Watch('hoveredOptionIndex')
  scrollToHoveredOption(hoveredOptionIndex: number | null) {
    if (hoveredOptionIndex === null) return

    const container = this.$refs.optionsContainer as HTMLElement | undefined
    const item = container?.children?.[hoveredOptionIndex]
    item?.scrollIntoView({ block: 'nearest' })
  }

  selectOption(index: number) {
    console.assert(!this.disabled)

    if (this.single) {
      this.$emit('update:value', index)
    } else {
      this.$emit('add-value', index)
    }
    this.filterValue = ''
    const filterInput = this.$refs.filterInput as HTMLInputElement | undefined
    if (filterInput !== undefined) {
      filterInput.focus()
    }
    if (this.single) {
      this.showPopup = false
      this.focusSelect()
    }
  }

  unselectOption(index: number, closePopup = true) {
    console.assert(!this.disabled)

    if (this.single) {
      if (
        this.selectedOptions.length > 0 &&
        this.selectedOptions[0].index === index
      ) {
        this.$emit('update:value', null)
      }
    } else {
      this.$emit('remove-value', index)
    }
    if (closePopup) {
      this.showPopup = false
      this.focusSelect()
    }
  }

  unselectAll() {
    console.assert(!this.disabled)

    if (this.single) {
      this.$emit('update:value', null)
    }

    this.$emit('clear-values')
  }

  async filterInputFinished() {
    if (this.processFilter && (await this.processFilter(this.filterValue))) {
      this.filterValue = ''
    } else if (this.hoveredOptionIndex !== null) {
      this.selectOption(this.visibleOptions[this.hoveredOptionIndex].index)
      this.filterValue = ''
    }
  }
}
</script>

<style lang="scss" scoped>
@include variant-to-local('option');

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
  position: relative;
  z-index: 30;
  width: 100%;
  font-size: 0.875rem;

  &.is-open {
    position: relative;
    z-index: 41; /* To be above other components with popups */
  }
}

.filter-icon {
  border-left-width: 0;
  background-color: var(--default-backgroundColor);
  color: var(--default-foregroundColor);
}

.empty-message-text {
  display: inline-flex;
  align-items: center;
  align-self: center;
  cursor: pointer;
  width: 100%;
  height: 1.3rem;
  color: var(--cell-foregroundDarkerColor);
}

.popup-message {
  padding: 1rem 0;
  color: var(--cell-foregroundDarkerColor);
  text-align: center;
}

.select-container {
  display: flex;
  flex-direction: row;
  cursor: pointer;
  border: 1px solid var(--cell-borderColor);
  border-radius: 0.5rem;
  background: var(--cell-backgroundColor);
  width: 100%;
  height: auto;
  max-height: 100%;
  color: var(--cell-foregroundColor);

  &:focus-within,
  &:focus {
    outline: none; /* Remove default outline */
    box-shadow: 0 0 0 0.2rem rgb(0 123 255 / 25%);
    /* Styles to match Bootstrap-inputs */
    border-color: #80bdff;
  }

  .select-icon {
    display: none;
    cursor: pointer;
    border: none;
    border-right-width: 0;
    background-color: transparent;
    color: var(--cell-foregroundDarkerColor);

    .select-container:hover &,
    .select-container:focus-within & {
      display: initial;
    }
  }
}

.values-container {
  display: flex;
  flex-direction: row;
  padding: 0.55rem 0.5rem;
  width: 100%;
  min-width: 0;
  max-height: 11rem;

  &:focus-within {
    /* TODO: Move this to one file! */
    $input-focus-border-color: #80bdff;
    $input-focus-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    box-shadow: $input-focus-shadow !important;

    border-color: $input-focus-border-color !important;
    border-radius: 0.5rem;
  }
}

.selected-values {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.25rem;
  cursor: pointer;
  width: 100%;
  overflow-y: auto;
}

.filter-group {
  border-bottom: 1px solid var(--default-borderColor);
  padding: 0.5rem 1rem;
  text-align: start;

  .filter-input {
    border: none;
    border-color: var(--default-borderColor);
    background-color: var(--default-backgroundColor);
    padding: 0;
    color: #000;

    &::placeholder {
      color: #777c87;
    }

    &:focus {
      outline: none;
      box-shadow: none;
    }
  }

  &:focus-within {
    outline: none;
  }
}

.select-container__options_container {
  display: flex;
  flex-direction: column;
  z-index: 1001;
  height: 100%;
  overflow: hidden;
  font-size: 0.875rem;
}

.all-options-wrapper {
  overflow: auto;
}

.clear-option-button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 0;
  background: var(--default-backgroundColor);
  padding: 0.6rem 1rem;
  width: 100%;

  &:hover {
    background: #ffeeee;
  }
}

.selected-options-list {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.5rem;

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
  background-color: #eff6ff !important;
}

div.select-container__options__actions {
  bottom: 0;
  border-top: 1px solid var(--default-borderColor);
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
  border-radius: 0.25rem;
  padding: 0.125rem 0.5rem;
  height: 1.3rem;
  overflow: hidden;
  line-height: 0.9rem;
  white-space: pre;
  word-break: break-word;

  .selected-values > & {
    border: 1px solid var(--option-borderColor);
    background-color: var(--option-backgroundColor);
    color: var(--option-foregroundColor);
  }

  > span {
    text-align: left;
  }

  .compact-mode & {
    height: 1.5rem; /* To match with usual inputs. */
  }
}

.option-wrapper {
  display: flex;
  flex-direction: row;
  cursor: pointer;
  padding: 0.375rem 1rem;

  &:hover {
    background-color: #eff6ff !important;
  }

  .option {
    border-radius: 0.25rem;
    background: #f2f4f7;
    padding: 0.3125rem 0.75rem;
  }
}

.one-of-many-value > .remove-value {
  @include material-button('reference');

  & {
    margin: 0;
    margin-right: -0.25rem;
    margin-left: 0.25rem;
    border: none;
    background: none;
    padding: 0;
  }

  &:not(:hover) {
    opacity: 0.5;
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
