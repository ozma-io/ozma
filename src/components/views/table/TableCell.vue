<template>
  <!-- FIXME: Pls solve these classes -->
  <td
    :style="localValue.style"
    :class="['table-td', {'fixed-column': column.fixed,
                          'select_fixed': localValue.selected && column.fixed,
                          'next-after-last-fixed': index === lastFixedColumnIndex,
                          'select': localValue.selected && !column.fixed,
                          'table-td_selected': localValue.selected,
                          'required_cell_style': isNull && value.info !== undefined && !value.info.field.isNullable,
                          'editing_style': localValue.editing !== undefined,
                          'tree-branches': column.treeUnfoldColumn && children !== undefined && children.length > 0 && isTree,
                          'disable_cell': value.info === undefined && from !== 'existing'}]"
    @click="$emit('cell-click', columnPosition, $event)"
  >
    <p>
      <template v-if="column.type == 'buttons'">
        <CellButtons
          :value="value"
        />
      </template>
      <template v-else-if="localValue.link !== undefined && localValue.valueText.length > 0">
        <div class="selectable">
          <FunLink
            :link="localValue.link"
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
      <template v-else-if="column.scannable">
        <div class="selectable">
          <input
            type="button"
            class="material-icons reference-open-modal"
            value="qr_code_scanner"
          >
          <!-- eslint-disable vue/no-v-html -->
          <span class="reference-text" v-html="localValueTextHtml" />
          <!-- eslint-enable -->
        </div>
      </template>
      <template v-else>
        <checkbox
          v-if="valueType === 'bool'"
          class="checkbox_click-none"
          :checked="value.value"
          disabled
        />
        <div v-else :class="['cell-text', {selectable: (fieldType == 'enum' || fieldType == 'reference') && localValue.valueText.length > 0}]">
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

import type { ICombinedValue } from "@/state/user_view";
import { valueIsNull } from "@/values";
import { iconValue } from "@/links";
import { replaceHtmlLinks } from "@/utils";
import Checkbox from "@/components/checkbox/Checkbox.vue";
import CellButtons from "@/components/buttons/CellButtons.vue";

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
  @Prop({ type: Object, required: true }) value!: ICombinedValue;
  @Prop({ type: Object, required: true }) localValue!: any;
  @Prop({ type: Object, required: true }) column!: any;
  @Prop({ type: Number, required: true }) columnPosition!: number;
  @Prop({ type: String, default: "existing" }) from!: string;
  @Prop({ type: Number, default: null }) lastFixedColumnIndex!: number;
  @Prop({ type: Number, default: null }) index!: number;
  @Prop({ type: Array, default: [] }) children!: any;
  @Prop({ type: Number, required: true }) level!: number;
  @Prop({ type: Boolean, required: true }) arrowDown!: boolean;
  @Prop({ type: Boolean, required: true }) isTree!: boolean;

  private isArrowDown = false;

  private get localValueTextHtml(): string {
    const text: string = typeof this.localValue.valueText === "string"
      ? this.localValue.valueText
      : "";
    return ((this.valueType === "string") || this.localValue.link
      ? replaceHtmlLinks(text)
      : text) || "&nbsp;";
  }

  private get valueType(): string | undefined {
    return this.value.info?.field?.valueType.type;
  }

  private get fieldType(): string | undefined {
    return this.value.info?.field?.fieldType?.type;
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
    this.isArrowDown = !this.isArrowDown;
    this.$emit("update:visibleChildren", this.children, this.isArrowDown);
  }

  get iconValue() {
    return iconValue(this.localValue.link.target);
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
    margin-top: -2px;
    border-radius: 5px;
    padding: 3px 8px;
    border: 1px solid var(--MainBorderColor);
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColor);
    width: 100%;
    word-wrap: break-word;
  }

  .next-after-last-fixed {
    padding: 4px 3px 0 5px !important;
  }

  .table-td {
    touch-action: manipulation;

    > p {
      height: inherit;
      pointer-events: none;
      padding: 3px 7px 2px 7px;
      max-height: 150px;

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

  .table-td_selected {
    border: 2px solid rgb(14, 101, 235);
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

  .display-arrow.material-icons.click-stop {
    pointer-events: none !important;
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
    top: 0;
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
