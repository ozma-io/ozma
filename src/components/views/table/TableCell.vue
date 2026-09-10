<i18n>
    {
        "en": {
            "add_child_tooplip": "Add child row"
        },
        "ru": {
            "add_child_tooplip": "Добавить подстроку"
        },
        "es": {
            "add_child_tooplip": "Agregar la  fila secundaria"
        }
    }
</i18n>

<template>
  <!-- FIXME: Pls solve these classes -->
  <!-- `.stop` in `@click` fixes calendar popup hiding -->
  <!-- TODO: `@contextmenu` doesn't work on IOS --->
  <td
    ref="cell"
    :style="style"
    :class="[
      'table-td',
      cellVariantClassName,
      'cell-local-variant',
      {
        'cell-alpha-blur': cellHasAlphaColor,
        'fixed-cell': column.fixed,
        'last-fixed-cell': lastFixed,
        select_fixed: value.extra.selected && column.fixed,
        selected: value.extra.selected && !value.extra.cursor,
        cursor: value.extra.cursor,
        'required-cell': requiredButEmpty,
        'disabled-cell': value.info === undefined && from !== 'existing',
      },
    ]"
    @click="$emit('cell-click', $refs.cell, $event)"
    @mousedown="$emit('cell-mousedown', $refs.cell, $event)"
    @mouseover="$emit('cell-mouseover', $refs.cell, $event)"
    @mouseup="$emit('cell-mouseup', $refs.cell, $event)"
    @contextmenu.prevent="$emit('cell-contextmenu', $refs.cell, $event)"
  >
    <div v-if="value.extra.selected" class="selection-overlay" />
    <div class="default-variant td-content">
      <template v-if="column.type == 'buttons'">
        <ButtonsPanel
          class="cell-buttons-panel"
          :buttons="buttons"
          @goto="$emit('goto', $event)"
        />
      </template>
      <template v-else-if="link !== null && valueHtml.length > 0">
        <div
          :class="[
            'option',
            'reference-option',
            optionVariantClassName,
            'option-local-variant',
          ]"
          :style="optionVariantVariables"
        >
          <OzmaLink
            class="option-link rounded-circle"
            :link="link"
            @goto="$emit('goto', $event)"
          >
            <span
              class="material-icons md-14 reference-open-modal rounded-circle"
            >
              open_in_new
            </span>
          </OzmaLink>
          <!-- eslint-disable vue/no-v-html -->
          <span class="reference-text" v-html="valueHtml || '&nbsp;'" />
          <!-- eslint-enable -->
        </div>
      </template>
      <template v-else>
        <template v-if="valueType.type === 'bool'">
          <Checkbox
            v-if="!isNull"
            class="checkbox_click-none"
            :checked="value.value"
          />
        </template>
        <div
          v-else
          :class="[
            'cell-text',
            optionVariantClassName,
            'option-local-variant',
            {
              option:
                ((fieldTypeName == 'enum' || fieldTypeName == 'reference') ||
                  optionColorVariantAttribute.type === 'inline' ||
                  (optionColorVariantAttribute.type === 'existing' && optionColorVariantAttribute.className !== 'option')) &&
                valueHtml.length > 0,
              tree: showTree && column.treeUnfoldColumn,
              'date-time': valueType.type === 'datetime',
            },
          ]"
          :style="optionVariantVariables"
        >
          <ButtonItem
            v-if="addChildButton"
            class="add-child"
            :button="addChildButton"
          />

          <div v-if="isTreeCell" class="tree-level-circles">
            <div
              v-for="index in treeLevel + (treeHasChildren ? 0 : 1)"
              :key="index"
              class="tree-level-circle"
            >
              <div class="tree-level-circle-inner"></div>
            </div>

            <div
              v-if="treeHasChildren"
              :class="['tree-toggle-expand', { down: tree.arrowDown }]"
              @click.stop="toggleChildren"
              @dblclick.stop
            >
              <span class="material-icons">arrow_forward_ios</span>
            </div>
          </div>

          <!-- eslint-disable vue/no-v-html -->
          <span class="text" v-html="valueHtml || '&nbsp;'" />
          <!-- eslint-enable -->
        </div>
      </template>
    </div>
  </td>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import { ValueType } from '@ozma-io/ozmadb-js/client'
import { parseToRgba } from 'color2k'

import { valueIsNull } from '@/values'
import Checkbox from '@/components/checkbox/Checkbox.vue'
import { attrToButtons, Button } from '@/components/buttons/buttons'
import ButtonItem from '@/components/buttons/ButtonItem.vue'
import type {
  IColumn,
  ITableCombinedUserView,
  ITableExtendedRow,
  ITableExtendedValue,
  ITableRowTree,
} from '@/components/views/Table.vue'
import {
  ColorVariantAttribute,
  colorVariantFromAttribute,
  colorVariantFromCellColor,
  defaultVariantAttribute,
  getColorVariantAttributeClassName,
  getColorVariantAttributeVariables,
  interfaceButtonVariant,
} from '@/utils_colors'
import { currentValue } from '@/user_views/combined'
import { attrToLinkRef } from '@/links'
import { formatValueToHtml } from '@/user_views/format'

@Component({
  components: {
    Checkbox,
    ButtonItem,
  },
})
export default class TableCell extends Vue {
  private cellHasAlphaColorByComputedStyle = false

  // We don't bother to set types here properly, they matter no more than for TableRow.
  // The reason this is not a functional component is because of performance.
  // See https://forum.vuejs.org/t/performance-for-large-numbers-of-components/13545/10
  @Prop({ type: Object, required: true }) uv!: ITableCombinedUserView
  @Prop({ type: Object, required: true }) row!: ITableExtendedRow
  @Prop({ type: Object, required: true }) value!: ITableExtendedValue
  @Prop({ type: Object, required: true }) column!: IColumn
  @Prop({ type: Number, required: true }) columnIndex!: number
  @Prop({ type: String, default: 'existing' }) from!: string
  @Prop({ type: Boolean, default: false }) lastFixed!: boolean
  @Prop({ type: Number }) fixedLeft!: number | undefined
  @Prop({ type: Object }) tree!: ITableRowTree | undefined
  @Prop({ type: Boolean, required: true }) showTree!: boolean
  @Prop({ type: Boolean, required: true }) showAddChild!: boolean
  @Prop({ type: Boolean, default: false }) notExisting!: boolean
  @Prop({ type: Number }) height!: number | undefined
  @Prop({ type: Number }) verticalPadding!: number | undefined
  @Prop({ type: Number }) minHeight!: number | undefined
  @Prop({ type: String }) verticalAlignment!: string | undefined

  get valueType(): ValueType {
    return this.uv.info.columns[this.columnIndex].valueType
  }

  get fieldTypeName(): string | null {
    return this.value.info?.field?.fieldType?.type ?? null
  }

  get requiredButEmpty() {
    return this.isNull && this.value.info?.field?.isNullable === false
  }

  get cellVariantClassName(): string | null {
    return getColorVariantAttributeClassName(this.cellColorVariantAttribute)
  }

  get cellColorVariantAttribute(): ColorVariantAttribute {
    const cellColorVariantAttribute = this.getCellAttr('cell_variant')
    const cellColor = this.getCellAttr('cell_color')
    const background = this.getCellAttr('background')
    const backgroundColor = this.getCellAttr('background_color')
    if (cellColorVariantAttribute) {
      return colorVariantFromAttribute(cellColorVariantAttribute)
    } else if (typeof cellColor === 'string') {
      return colorVariantFromCellColor(cellColor)
    } else if (typeof backgroundColor === 'string') {
      return colorVariantFromCellColor(backgroundColor)
    } else if (typeof backgroundColor === 'object' && backgroundColor !== null) {
      return colorVariantFromAttribute(backgroundColor)
    } else if (typeof background === 'string') {
      return colorVariantFromCellColor(background)
    } else if (typeof background === 'object' && background !== null) {
      return colorVariantFromAttribute(background)
    } else {
      return defaultVariantAttribute
    }
  }

  get optionVariantClassName() {
    return getColorVariantAttributeClassName(this.optionColorVariantAttribute)
  }

  get optionVariantVariables() {
    return getColorVariantAttributeVariables(this.optionColorVariantAttribute)
  }

  get optionColorVariantAttribute(): ColorVariantAttribute {
    return colorVariantFromAttribute(this.getCellAttr('option_variant'), {
      type: 'existing',
      className: 'option',
    })
  }

  get valueHtml() {
    return formatValueToHtml(this.valueType, this.value, {
      getCellAttr: (name) => this.getCellAttr(name),
      columnAttributeMappings:
        this.uv.columnAttributeMappings[this.columnIndex],
    })
  }

  get link() {
    const rawLink = this.getCellAttr('link')
    if (!rawLink) {
      return null
    }

    return attrToLinkRef(
      rawLink,
      currentValue(this.value),
      this.uv.extra.linkOpts,
    )
  }

  get treeLevel() {
    if (this.column.treeUnfoldColumn) {
      return this.tree!.level ?? 0
    } else {
      return 0
    }
  }

  get isTreeCell() {
    return this.showTree && this.column.treeUnfoldColumn
  }

  get treeHasChildren() {
    return (
      this.isTreeCell &&
      this.tree?.children !== undefined &&
      this.tree.children.length > 0
    )
  }

  get buttons() {
    if (this.column.type === 'buttons') {
      return attrToButtons(this.value.value)
    } else {
      return []
    }
  }

  get addChildButton(): Button | null {
    if (!this.isTreeCell || !this.showAddChild || this.notExisting) {
      return null
    } else {
      return {
        type: 'callback',
        icon: 'add',
        tooltip: this.$t('add_child_tooplip').toString(),
        variant: interfaceButtonVariant,
        callback: () => this.$emit('add-child'),
      }
    }
  }

  get isNull() {
    // We use `value.value` here to highlight unvalidated values.
    return valueIsNull(this.value.value)
  }

  toggleChildren() {
    this.$emit('toggle-children', !this.tree!.arrowDown)
  }

  private getCellAttr(name: string) {
    const valueAttr = this.value.attributes?.[name]
    if (valueAttr !== undefined) {
      return valueAttr
    }

    const columnAttr = this.uv.columnAttributes[this.columnIndex][name]
    if (columnAttr !== undefined) {
      return columnAttr
    }

    const rowAttr = this.row.attributes?.[name]
    if (rowAttr !== undefined) {
      return rowAttr
    }

    return this.uv.attributes[name]
  }

  get style() {
    const style = { ...this.column.style }

    if (this.height) {
      style['height'] = `${this.height}px`
    }

    if (this.verticalPadding != null) {
      style['--td-vertical-padding'] = `${this.verticalPadding}px`
    }

    if (this.minHeight != null) {
      const padding = this.verticalPadding ?? 16
      const contentMinHeight = Math.max(0, this.minHeight - padding * 2)
      style['--td-content-min-height'] = `${contentMinHeight}px`
    }

    if (this.verticalAlignment != null) {
      style['vertical-align'] = this.verticalAlignment === 'center' ? 'middle' : this.verticalAlignment
    }

    if (this.fixedLeft !== undefined) {
      style['left'] = `${this.fixedLeft}px`
    }

    if (this.getCellAttr('text_type') === 'codeeditor') {
      style['font-family'] = 'monospace'
    }

    const variantAttrs = getColorVariantAttributeVariables(
      this.cellColorVariantAttribute,
    )
    if (variantAttrs !== null) {
      Object.assign(style, variantAttrs)
    }

    return style
  }

  get cellHasAlphaColor(): boolean {
    const colorCandidates = [
      this.getCellAttr('cell_color'),
      this.getCellAttr('background_color'),
      this.getCellAttr('background'),
      getColorVariantAttributeVariables(this.cellColorVariantAttribute)?.[
        '--backgroundColor'
      ],
    ]
    const hasAlphaFromAttrs = colorCandidates.some(
      (color): color is string =>
        typeof color === 'string' && this.hasAlphaChannel(color),
    )
    return hasAlphaFromAttrs || this.cellHasAlphaColorByComputedStyle
  }

  private parseAlphaValue(rawAlpha: string): number | null {
    const normalized = rawAlpha.trim()
    if (!normalized) {
      return null
    }
    if (normalized.endsWith('%')) {
      const percent = Number(normalized.slice(0, -1))
      return Number.isFinite(percent) ? Math.max(0, Math.min(1, percent / 100)) : null
    }
    const value = Number(normalized)
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null
  }

  private getColorAlpha(color: string): number | null {
    const normalizedColor = color.trim()
    if (!normalizedColor) {
      return null
    }

    try {
      const rgba = parseToRgba(normalizedColor)
      return rgba[3]
    } catch {
      // Fallbacks for notations not fully supported by parser.
    }

    if (/^#[\da-f]{4}$/i.test(normalizedColor)) {
      return parseInt(normalizedColor[4], 16) / 15
    }

    if (/^#[\da-f]{8}$/i.test(normalizedColor)) {
      return parseInt(normalizedColor.slice(7), 16) / 255
    }

    const fnMatch = normalizedColor.match(/^(rgba?|hsla?)\((.+)\)$/i)
    if (fnMatch) {
      const fnName = fnMatch[1].toLowerCase()
      const fnArgs = fnMatch[2].trim()
      const slashIndex = fnArgs.lastIndexOf('/')
      if (slashIndex >= 0) {
        return this.parseAlphaValue(fnArgs.slice(slashIndex + 1))
      }
      const parts = fnArgs.split(',').map((part) => part.trim())
      if ((fnName === 'rgba' || fnName === 'hsla') && parts.length >= 4) {
        return this.parseAlphaValue(parts[3])
      }
      return 1
    }

    return null
  }

  private hasAlphaChannel(color: string): boolean {
    const alpha = this.getColorAlpha(color)
    return alpha !== null && alpha < 1
  }

  private isCssColor(color: string): boolean {
    return this.getColorAlpha(color) !== null
  }

  private resolveCssColor(
    value: string,
    computedStyle: CSSStyleDeclaration,
    depth = 0,
  ): string | null {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    if (this.isCssColor(trimmed)) {
      return trimmed
    }
    if (depth > 8 || !trimmed.startsWith('var(') || !trimmed.endsWith(')')) {
      return null
    }

    const inside = trimmed.slice(4, -1)
    const commaIndex = inside.indexOf(',')
    const varName =
      commaIndex >= 0 ? inside.slice(0, commaIndex).trim() : inside.trim()
    const fallback =
      commaIndex >= 0 ? inside.slice(commaIndex + 1).trim() : null

    if (!varName.startsWith('--')) {
      return null
    }

    const varValue = computedStyle.getPropertyValue(varName).trim()
    const resolvedVar = this.resolveCssColor(varValue, computedStyle, depth + 1)
    if (resolvedVar !== null) {
      return resolvedVar
    }

    if (fallback) {
      return this.resolveCssColor(fallback, computedStyle, depth + 1)
    }
    return null
  }

  mounted() {
    this.updateComputedBackgroundAlphaFlag()
  }

  updated() {
    this.updateComputedBackgroundAlphaFlag()
  }

  private updateComputedBackgroundAlphaFlag() {
    const cell = this.$refs.cell as HTMLElement | undefined
    if (!cell) {
      return
    }
    const computedStyle = getComputedStyle(cell)
    const hasAlpha = [
      computedStyle.backgroundColor,
      computedStyle.getPropertyValue('--backgroundColor'),
      computedStyle.getPropertyValue('--cell-backgroundColor'),
    ]
      .map((color) => this.resolveCssColor(color, computedStyle) ?? color.trim())
      .some((color) => this.hasAlphaChannel(color))
    if (hasAlpha !== this.cellHasAlphaColorByComputedStyle) {
      this.cellHasAlphaColorByComputedStyle = hasAlpha
    }
  }
}
</script>

<style lang="scss" scoped>
@include variant-to-local('cell');
@include variant-to-local('option');

.option {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--option-borderColor);
  border-radius: 0.5rem;
  background-color: var(--option-backgroundColor);
  padding: 0.35rem 0.6rem;
  max-width: 100%;
  max-height: 100%;
  color: var(--option-foregroundColor);

  .option-link {
    @include material-button('reference');

    & {
      display: flex;
      flex-shrink: 0;
      opacity: 0.5;
      border: none;
      overflow: visible;
    }
  }

  .option-link:hover {
    opacity: 1;
    text-decoration: none;
  }

  .text {
    color: var(--option-foregroundColor);
  }
}

.reference-option {
  padding: 0.24rem 0.55rem;
}

.add-child {
  position: absolute;
  right: 0;
  bottom: 0;
}

.tree-level-circles {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-start;
  align-items: center;
  gap: 0.3rem;
  padding-right: 0.5rem;
  height: 1rem;
}

.tree-level-circle {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 1rem;
  height: 1rem;
  font-size: icon-size();
}

.tree-level-circle-inner {
  border-radius: 50%;
  background-color: var(--icon-color);
  width: 0.1875rem;
  height: 0.1875rem;
}

.tree-toggle-expand {
  transform-origin: center;
  transition: transform 0.2s;
  cursor: pointer;
  width: 1rem;
  height: 1rem;
  pointer-events: auto !important;
  color: var(--icon-color);
  .material-icons {
    font-size: 1rem;
  }
  &:hover {
    color: #000;
  }
  &.down {
    transform: rotate(90deg);
  }
}

.table-td {
  position: relative;
  padding-top: var(--td-vertical-padding, 1rem);
  padding-bottom: var(--td-vertical-padding, 1rem);
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  touch-action: manipulation;
  font-size: 0.875rem;
  user-select: none;

  &.cursor {
    box-shadow:
      inset 2px 2px 0 var(--FocusBorderColor),
      inset -2px -2px 0 var(--FocusBorderColor);
  }
  &.cursor,
  &.selected {
    border-bottom-color: var(--FocusBorderColor);
  }
}

.table-td.cell-alpha-blur::before,
.table-td.fixed-cell::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background-color: var(--cell-backgroundColor, var(--table-backgroundColor));
  pointer-events: none;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.table-td.cell-alpha-blur,
.table-td.fixed-cell {
  isolation: isolate;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.table-td.cell-alpha-blur > .td-content,
.table-td.fixed-cell > .td-content {
  position: relative;
  z-index: 1;
}

.selection-overlay {
  position: absolute;
  top: -0.5rem;
  left: -1rem;
  opacity: 0.5;
  background-color: var(--FocusBorderColor);
  width: calc(100% + 2rem);
  height: calc(100% + 1rem);
  pointer-events: none;
}

.td-content {
  height: inherit;
  min-height: var(--td-content-min-height, 2rem);
  max-height: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;

  ::v-deep .checkbox {
    padding: 0;
    .material-icons {
      position: relative;
    }
  }

  ::v-deep button {
    cursor: pointer;
    pointer-events: all;
  }

  ::v-deep ul.actions {
    > span {
      cursor: pointer;
    }
  }

  ::v-deep a {
    cursor: pointer;

    &:link {
      color: inherit !important;
    }

    &:visited {
      color: inherit !important;
    }
  }

  .add-child {
    /* We use this instead of `visibility: hidden`, to be able expand by single tap on Iphones,
         see https://habr.com/en/post/212959/ for details */
    opacity: 0.0001;
  }

  &.selected .add-child,
  &:hover .add-child {
    opacity: 1;
  }
}

.checkbox_click-none {
  pointer-events: none;
}

.reference-open-modal {
  @include material-button('option');

  & {
    align-self: center;
    margin: 0;
    margin-right: 0.25rem;
    margin-left: -0.25rem;
    border: none;
    background: none;
    padding: 0;
    pointer-events: auto !important;
  }
}

span.reference-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}

.cell-text {
  overflow: hidden;
  line-height: 1rem;
  text-overflow: ellipsis;
  white-space: break-spaces;
  word-break: keep-all;
  &.date-time {
    white-space: pre;
  }
  &.tree {
    display: flex;
    justify-content: flex-begin;
    align-items: center;
    align-self: center;
  }
}

.text {
  overflow: hidden;
  color: var(--cell-foregroundColor);
  text-overflow: ellipsis;
}

.cell-buttons-panel {
  flex-wrap: wrap;
}
</style>
