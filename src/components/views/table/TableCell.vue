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
        // 'fixed-column': column.fixed,
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
          :class="['option', optionVariantClassName, 'option-local-variant']"
          :style="optionVariantVariables"
        >
          <FunLink
            class="option-link rounded-circle"
            :link="link"
            @goto="$emit('goto', $event)"
          >
            <span
              class="material-icons md-14 reference-open-modal rounded-circle"
            >
              open_in_new
            </span>
          </FunLink>
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
                (fieldTypeName == 'enum' || fieldTypeName == 'reference') &&
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
import { ValueType } from 'ozma-api'

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
  // We don't bother to set types here properly, they matter no more than for TableRow.
  // The reason this is not a functional component is because of performance.
  // See https://forum.vuejs.org/t/performance-for-large-numbers-of-components/13545/10
  @Prop({ type: Object, required: true }) uv!: ITableCombinedUserView
  @Prop({ type: Object, required: true }) row!: ITableExtendedRow
  @Prop({ type: Object, required: true }) value!: ITableExtendedValue
  @Prop({ type: Object, required: true }) column!: IColumn
  @Prop({ type: Number, required: true }) columnIndex!: number
  @Prop({ type: String, default: 'existing' }) from!: string
  @Prop({ type: Boolean, default: false }) firstNonFixed!: boolean
  @Prop({ type: Number }) fixedLeft!: number | undefined
  @Prop({ type: Object }) tree!: ITableRowTree | undefined
  @Prop({ type: Boolean, required: true }) showTree!: boolean
  @Prop({ type: Boolean, required: true }) showAddChild!: boolean
  @Prop({ type: Boolean, default: false }) notExisting!: boolean
  @Prop({ type: Number }) height!: number | undefined

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
    if (cellColorVariantAttribute) {
      return colorVariantFromAttribute(cellColorVariantAttribute)
    } else if (typeof cellColor === 'string') {
      return colorVariantFromAttribute({ background: cellColor })
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
    return this.value.info?.field?.fieldType.type === 'reference'
      ? attrToLinkRef(
          this.getCellAttr('link'),
          currentValue(this.value),
          this.uv.extra.linkOpts,
        )
      : null
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
    return (
      this.value.attributes?.[name] ||
      this.uv.columnAttributes[this.columnIndex][name] ||
      this.row.attributes?.[name] ||
      this.uv.attributes[name]
    )
  }

  get style() {
    const style = { ...this.column.style }

    if (this.height) {
      style['height'] = `${this.height}px`
    }

    // if (this.fixedLeft !== undefined) {
    // style['left'] = `${this.fixedLeft}px`
    // }

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
}
</script>

<style lang="scss" scoped>
@include variant-to-local('cell');
@include variant-to-local('option');

.option {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--option-borderColor);
  border-radius: 0.25rem;
  background-color: var(--option-backgroundColor);
  padding: 0.1rem 0.5rem;
  max-width: 100%;
  max-height: 100%;
  color: var(--option-foregroundColor);

  .option-link {
    @include material-button('reference');
    display: flex;

    flex-shrink: 0;
    opacity: 0.5;
    border: none;
    overflow: visible;
  }

  .option-link:hover {
    opacity: 1;
    text-decoration: none;
  }
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
  padding: 1rem 0.5rem;
  touch-action: manipulation;
  font-size: 0.875rem;
  user-select: none;

  &.cursor {
    box-shadow: inset 2px 2px 0 var(--FocusBorderColor),
      inset -2px -2px 0 var(--FocusBorderColor);
  }
  &.cursor,
  &.selected {
    border-bottom-color: var(--FocusBorderColor);
  }
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
  min-height: 2rem;
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
      color: rgb(0, 123, 255) !important;
    }

    &:visited {
      color: #551a8b !important;
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

  align-self: center;
  margin: 0;
  margin-right: 0.25rem;
  margin-left: -0.25rem;
  border: none;
  background: none;
  padding: 0;
  pointer-events: auto !important;
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
  color: var(--cell-foregroundColor);
}

.cell-buttons-panel {
  flex-wrap: wrap;
}
</style>
