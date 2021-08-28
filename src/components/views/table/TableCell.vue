<i18n>
    {
        "en": {
            "add_child_tooplip": "Add child row"
        },
        "ru": {
            "add_child_tooplip": "Добавить строку-потомка"
        }
    }
</i18n>

<template>
  <!-- FIXME: Pls solve these classes -->
  <!-- `.stop` in `@click` fixes calendar popup hiding -->
  <!-- TODO: `@contextmenu` doesn't work on IOS --->
  <td
    ref="cell"
    :style="[value.extra.style, variantVariables]"
    :class="[
      'table-td',
      variantClassName,
      'cell-local-variant',
      {
        'fixed-column': column.fixed,
        'select_fixed': value.extra.selected && column.fixed,
        'next-after-last-fixed': index === lastFixedColumnIndex,
        'select': value.extra.selected && !column.fixed,
        'selected': value.extra.selected,
        'required-cell': requiredButEmpty,
        'disable_cell': value.info === undefined && from !== 'existing'
      }
    ]"
    @click.stop="$emit('cell-click', columnPosition, $refs.cell, $event)"
    @mousedown.stop="$emit('cell-mousedown', columnPosition, $refs.cell, $event)"
    @mouseover.stop="$emit('cell-mouseover', columnPosition, $refs.cell, $event)"
    @mouseup.stop="$emit('cell-mouseup', columnPosition, $refs.cell, $event)"
    @contextmenu.prevent="$emit('cell-contextmenu', columnPosition, $refs.cell, $event)"
  >
    <div v-if="value.extra.selected" class="selection-overlay" />
    <p class="default-variant">
      <template v-if="column.type == 'buttons'">
        <ButtonsPanel
          class="cell-buttons-panel"
          :buttons="buttons"
          @goto="$emit('goto', $event)"
        />
      </template>
      <template v-else-if="value.extra.link !== null && value.extra.valueHtml.length > 0">
        <div class="option option-variant option-local-variant">
          <FunLink
            class="option-link rounded-circle"
            :link="value.extra.link"
            @goto="$emit('goto', $event)"
          >
            <input
              type="button"
              class="material-icons md-18 reference-open-modal rounded-circle"
              :value="iconValue"
            >
          </FunLink>
          <!-- eslint-disable vue/no-v-html -->
          <span class="reference-text" v-html="value.extra.valueHtml || '&nbsp;'" />
          <!-- eslint-enable -->
        </div>
      </template>
      <template v-else>
        <template v-if="valueType === 'bool'">
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
            'option-variant',
            'option-local-variant',
            {
              'option': (fieldType == 'enum' || fieldType == 'reference') && value.extra.valueHtml.length > 0,
              'tree': showTree && column.treeUnfoldColumn && !notExisting,
            }
          ]"
        >
          <ButtonItem
            v-if="isTreeCell && showAddChild"
            class="add-child"
            :button="addChildButton"
          />

          <span
            v-if="isTreeCell"
            class="tree-level-circles"
          >
            <span
              v-for="index in (treeLevel + (treeHasChildren ? 0 : 1))"
              :key="index"
              class="tree-level-circle"
            />

            <span
              v-if="treeHasChildren"
              :class="['tree-toggle-expand material-icons', { 'down': tree.arrowDown }]"
              @click.stop="toggleChildren"
              @dblclick.stop
            >
              chevron_right
            </span>
          </span>

          <!-- eslint-disable vue/no-v-html -->
          <span class="text" v-html="value.extra.valueHtml || '&nbsp;'" />
          <!-- eslint-enable -->
        </div>
      </template>
    </p>
  </td>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";

import { valueIsNull } from "@/values";
import { iconValue } from "@/links";
import Checkbox from "@/components/checkbox/Checkbox.vue";
import { attrToButtons, Button } from "@/components/buttons/buttons";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import type { IColumn, ITableExtendedValue, ITableRowTree } from "@/components/views/Table.vue";
import { getColorVariantAttributeClassName, getColorVariantAttributeVariables, interfaceButtonVariant } from "@/utils_colors";

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
  @Prop({ type: Object, required: true }) value!: ITableExtendedValue;
  @Prop({ type: Object, required: true }) column!: IColumn;
  @Prop({ type: Number, required: true }) columnPosition!: number;
  @Prop({ type: String, default: "existing" }) from!: string;
  @Prop({ type: Number, default: null }) lastFixedColumnIndex!: number;
  @Prop({ type: Number, default: null }) index!: number;
  @Prop({ type: Object, required: true }) tree!: ITableRowTree;
  @Prop({ type: Boolean, required: true }) showTree!: boolean;
  @Prop({ type: Boolean, required: true }) showAddChild!: boolean;
  @Prop({ type: Boolean, default: false }) notExisting!: boolean;

  private get valueType(): string | null {
    return this.value.info?.field?.valueType.type ?? null;
  }

  private get fieldType(): string | null {
    return this.value.info?.field?.fieldType?.type ?? null;
  }

  private get requiredButEmpty() {
    return this.isNull && this.value.info?.field?.isNullable === false;
  }

  private get variantClassName(): string | null {
    return getColorVariantAttributeClassName(this.value.extra.colorVariant);
  }

  private get variantVariables(): Record<string, string> | null {
    return getColorVariantAttributeVariables(this.value.extra.colorVariant);
  }

  private get treeLevel() {
    if (this.column.treeUnfoldColumn) {
      return this.tree.level;
    } else {
      return 0;
    }
  }

  private get isTreeCell() {
    return this.showTree
        && this.column.treeUnfoldColumn
        && !this.notExisting;
  }

  private get treeHasChildren() {
    return this.isTreeCell
        && this.tree.children !== undefined
        && this.tree.children.length > 0;
  }

  get buttons() {
    if (this.column.type === "buttons") {
      return attrToButtons(this.value.value);
    } else {
      return [];
    }
  }

  private get addChildButton(): Button {
    return {
      type: "callback",
      icon: "add",
      tooltip: this.$t("add_child_tooplip").toString(),
      variant: interfaceButtonVariant,
      callback: () => this.$emit("add-child"),
    };
  }

  get isNull() {
    // We use `value.value` here to highlight unvalidated values.
    return valueIsNull(this.value.value);
  }

  private toggleChildren() {
    this.$emit("toggle-children", !this.tree.arrowDown);
  }

  get iconValue() {
    return this.value.extra.link && "target" in this.value.extra.link ? iconValue(this.value.extra.link.target) : null;
  }

  @Watch("value", { immediate: true })
  private async updateHtmlElement() {
    await this.$nextTick();
    this.value.extra.htmlElement = this.$refs.cell as HTMLElement;
  }
}
</script>

<style lang="scss" scoped>
  @include variant-to-local("cell");
  @include variant-to-local("option");

  .option {
    padding: 0.1rem 0.5rem;
    display: inline-flex;
    align-items: center;
    background-color: var(--option-backgroundColor);
    border: 1px solid var(--option-borderColor);
    color: var(--option-foregroundColor);
    border-radius: 1rem;
    max-width: 100%;
    word-wrap: break-word;

    .option-link {
      @include material-button("reference");

      margin-right: 0.25rem;
      flex-shrink: 0;
      border: none;
      display: flex;
      opacity: 0.3;
    }

    &:hover .option-link {
      opacity: 1;
    }
  }

  .add-child {
    position: absolute;
    right: 0;
    bottom: 0;
  }

  .tree-level-circles {
    height: 1rem;
    display: flex;
    align-items: center;
  }

  .tree-level-circle {
    font-size: icon-size();
    display: inline-block;
    width: 0.333em;
    height: 0.333em;
    margin: 0.333em;
    border-radius: 0.333em;
    background-color: var(--cell-foregroundColor);
    opacity: 0.05;
  }

  .selection-overlay {
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: var(--FocusBorderColor);
    opacity: 0.5;
    pointer-events: none;
  }

  /* .table-td.selected {
   *   box-shadow:
   *     inset 2px 2px 0 var(--FocusBorderColor),
   *     inset -2px -2px 0 var(--FocusBorderColor);
   * } */

  .table-td {
    position: relative;
    touch-action: manipulation;

    > p {
      height: inherit;

      ::v-deep .checkbox {
        .material-icons {
          position: relative;
        }
      }

      ::v-deep button {
        pointer-events: all;
        cursor: pointer;
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

  .tree-toggle-expand.material-icons {
    cursor: pointer;
    pointer-events: auto !important;
    transition: transform 0.2s;
    line-height: 1rem;
    opacity: 0.3;
  }

  .tree-toggle-expand.material-icons:hover {
    opacity: 1;
  }

  .tree-toggle-expand.material-icons.down {
    transform: rotate(90deg);
  }

  .reference-open-modal {
    @include material-button("option");

    pointer-events: auto !important;
    border: none;
    background: none;
    padding: 0;
  }

  span.reference-text {
    margin: 0 0.25rem;
    display: block;
    line-height: 1rem;
    white-space: normal;
    word-break: break-word;
  }

  .cell-text {
    overflow: hidden;
    white-space: break-spaces;
    word-break: break-word;
    line-height: 1.3rem;
  }

  .text {
    width: 100%;
  }

  .cell-text.tree {
    display: flex;
    align-self: center;
    align-items: center;
    justify-content: flex-begin;
  }

  .cell-buttons-panel {
    flex-wrap: wrap;
  }
</style>
