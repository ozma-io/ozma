<template>
  <!-- FIXME: Pls solve these classes -->
  <td
    :style="value.extra.style"
    :class="['table-td', {'fixed-column': column.fixed,
                          'select_fixed': value.extra.selected && column.fixed,
                          'next-after-last-fixed': index === lastFixedColumnIndex,
                          'select': value.extra.selected && !column.fixed,
                          'selected': value.extra.selected,
                          'required_cell_style': isNull && value.info !== undefined && !value.info.field.isNullable,
                          'editing_style': value.extra.editing !== undefined,
                          'tree-branches': column.treeUnfoldColumn && children !== undefined && children.length > 0 && isTree,
                          'disable_cell': value.info === undefined && from !== 'existing'}]"
    @click.stop="$emit('cell-click', columnPosition, $event)"
  >
    <p>
      <template v-if="column.type == 'buttons'">
        <CellButtons
          :value="value"
        />
      </template>
      <template v-else-if="value.extra.link !== null && value.extra.valueText.length > 0">
        <div class="selectable">
          <FunLink
            :link="value.extra.link"
            @goto="$emit('goto', $event)"
          >
            <input
              type="button"
              class="material-icons reference-open-modal"
              :value="iconValue"
            >
          </FunLink>
          <!-- eslint-disable vue/no-v-html -->
          <span class="reference-text" v-html="localValueTextHtml" />
          <!-- eslint-enable -->
        </div>
      </template>
      <template v-else>
        <Checkbox
          v-if="valueType === 'bool'"
          class="checkbox_click-none"
          :checked="value.value"
        />
        <div v-else :class="['cell-text', {selectable: (fieldType == 'enum' || fieldType == 'reference') && value.extra.valueText.length > 0}]">
          <span
            :style="{'margin-left': treeLevel*25+'px'}"
            :class="['display-arrow material-icons', {'down': isArrowDown}]"
            @click.stop="toggleChildren"
            @dblclick.stop
          >
            arrow_forward_ios
          </span>
          <!-- This isTree need for hidden when table filtering from search panel -->
          <span
            v-if="isTree && treeLevel > 0"
            :style="{'margin-left': treeLevel*25 + 20 +'px'}"
            class="hidden-arrow-space"
          />
          <!-- eslint-disable vue/no-v-html -->
          <span v-html="localValueTextHtml" />
          <!-- eslint-enable -->
        </div>
      </template>
    </p>
  </td>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import { valueIsNull } from "@/values";
import { iconValue } from "@/links";
import { replaceHtmlLinks } from "@/utils";
import Checkbox from "@/components/checkbox/Checkbox.vue";
import CellButtons from "@/components/buttons/CellButtons.vue";
import type { IColumn, ITableExtendedValue } from "@/components/views/Table.vue";

@Component({
  components: {
    Checkbox,
    CellButtons,
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
  @Prop({ type: Array, default: [] }) children!: number[];
  @Prop({ type: Number, required: true }) level!: number;
  @Prop({ type: Boolean, required: true }) arrowDown!: boolean;
  @Prop({ type: Boolean, required: true }) isTree!: boolean;

  private isArrowDown = false;

  private get localValueTextHtml(): string {
    const text: string = typeof this.value.extra.valueText === "string"
      ? this.value.extra.valueText
      : "";
    return ((this.valueType === "string") || this.value.extra.link
      ? replaceHtmlLinks(text)
      : text) || "&nbsp;";
  }

  private get valueType(): string | null {
    return this.value.info?.field?.valueType.type ?? null;
  }

  private get fieldType(): string | null {
    return this.value.info?.field?.fieldType?.type ?? null;
  }

  private get treeLevel() {
    if (this.column.treeUnfoldColumn) {
      return this.level;
    } else {
      return 0;
    }
  }

  get isNull() {
    // We use `value.value` here to highlight unvalidated values.
    return valueIsNull(this.value.value);
  }

  private toggleChildren() {
    // FIXME: shouldn't be used like this! `arrowDown` should be fully controlled by a prop.
    // Remove `isArrowDown`.
    this.isArrowDown = !this.isArrowDown;
    this.$emit("update:visibleChildren", this.children, this.isArrowDown);
  }

  get iconValue() {
    return this.value.extra.link && "target" in this.value.extra.link ? iconValue(this.value.extra.link.target) : null;
  }

  mounted() {
    this.isArrowDown = this.arrowDown;
  }
}
</script>

<style lang="scss" scoped>
  .selectable {
    position: relative;
    float: left;
    padding: 0 5px;
    border: 1px solid var(--MainBorderColor);
    border-radius: 5px;
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColor);
    width: 100%;
    word-wrap: break-word;
  }

  .table-td {
    touch-action: manipulation;

    > p {
      height: inherit;
      pointer-events: none;

      ::v-deep .checkbox {
        .material-icons {
          position: relative;
          top: -3px;
        }
      }

      ::v-deep ul.actions {
        > span {
          pointer-events: all;
          cursor: pointer;
        }
      }

      ::v-deep a {
        pointer-events: all;
        cursor: pointer;

        &:link {
          color: rgb(0, 123, 255) !important;
        }

        &:visited {
          color: #551a8b !important;
        }
      }
    }
  }

  .table-td.selected {
    box-shadow:
      inset 2px 2px 0 rgb(14, 101, 235),
      inset -2px -2px 0 rgb(14, 101, 235);
  }

  .table-td.fixed-column.selected {
    box-shadow:
      inset 2px 2px 0 rgb(14, 101, 235),
      inset -2px -2px 0 rgb(14, 101, 235);
  }

  .checkbox_click-none {
    pointer-events: none;
  }

  .hidden-arrow-space {
    display: inline-block;
  }

  .tree-branches .hidden-arrow-space {
    display: none;
  }

  .display-arrow {
    display: none;
  }

  .tree-branches .display-arrow {
    display: inline-block;
  }

  .display-arrow.material-icons {
    cursor: pointer;
    pointer-events: auto !important;
    padding-right: 5px;
    font-size: inherit;
    transform-origin: 30% 50%;
    transition: transform 0.2s;
  }

  .display-arrow.material-icons:hover {
    opacity: 0.7;
    overflow: hidden;
  }

  .display-arrow.material-icons.down {
    transform: rotate(90deg);
  }

  .reference-open-modal {
    pointer-events: auto !important;
    left: 0;
    top: -3px;
    position: absolute;
    border: none;
    background: none;
    padding: 0;
    color: var(--MainBorderTextColor);
    cursor: pointer;
  }

  .reference-open-modal:hover {
    opacity: 0.7;
  }

  span.reference-text {
    padding-left: 20px;
    display: block;
    white-space: normal;
    line-height: 1rem;
  }

  .cell-text {
    overflow: hidden;
    white-space: break-spaces;
    line-height: 1rem;
  }
</style>
