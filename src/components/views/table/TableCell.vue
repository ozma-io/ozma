<template>
  <!-- FIXME: Pls solve these classes -->
  <td
    ref="cell"
    :style="[value.extra.style, value.extra.colorVariables]"
    :class="['table-td', {'fixed-column': column.fixed,
                          'select_fixed': value.extra.selected && column.fixed,
                          'next-after-last-fixed': index === lastFixedColumnIndex,
                          'select': value.extra.selected && !column.fixed,
                          'selected': value.extra.selected,
                          'required_cell_style': isNull && value.info !== undefined && !value.info.field.isNullable,
                          'editing_style': value.extra.editing !== undefined,
                          'tree-branches': column.treeUnfoldColumn && tree.children !== undefined && tree.children.length > 0 && showTree,
                          'disable_cell': value.info === undefined && from !== 'existing'}]"
    @click.stop="$emit('cell-click', columnPosition, $refs.cell)"
  >
    <p>
      <template v-if="column.type == 'buttons' && buttons.length > 0">
        <ButtonsPanel
          :buttons="buttons"
          @goto="$emit('goto', $event)"
        />
      </template>
      <template v-else-if="value.extra.link !== null && value.extra.valueFormatted.length > 0">
        <div class="selectable">
          <FunLink
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
          <span class="reference-text" v-html="value.extra.valueFormatted || '&nbsp;'" />
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
        <div v-else :class="['cell-text', {selectable: (fieldType == 'enum' || fieldType == 'reference') && value.extra.valueFormatted.length > 0, 'tree': showTree}]">
          <b-btn
            v-if="showTree && column.treeUnfoldColumn && !notExisting"
            variant="light"
            class="add-child"
            size="sm"
            @click.stop="$emit('add-child')"
            @dblclick.stop
          >
            +
          </b-btn>
          <span
            :style="{'margin-left': treeLevel*25+'px'}"
            :class="['display-arrow material-icons', {'down': tree.arrowDown}]"
            @click.stop="toggleChildren"
            @dblclick.stop
          >
            arrow_forward_ios
          </span>
          <!-- This showTree need for hidden when table filtering from search panel -->
          <span
            v-if="showTree && treeLevel > 0"
            :style="{'margin-left': treeLevel*25 + 20 +'px'}"
            class="hidden-arrow-space"
          />
          <!-- eslint-disable vue/no-v-html -->
          <span class="text" v-html="value.extra.valueFormatted || '&nbsp;'" />
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
import { attrToButtons } from "@/components/buttons/buttons";
import type { IColumn, ITableExtendedValue, ITableRowTree } from "@/components/views/Table.vue";

@Component({
  components: {
    Checkbox,
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
  @Prop({ type: Boolean, default: false }) notExisting!: boolean;

  private get valueType(): string | null {
    return this.value.info?.field?.valueType.type ?? null;
  }

  private get fieldType(): string | null {
    return this.value.info?.field?.fieldType?.type ?? null;
  }

  private get treeLevel() {
    if (this.column.treeUnfoldColumn) {
      return this.tree.level;
    } else {
      return 0;
    }
  }

  get buttons() {
    if (this.column.type === "buttons") {
      return attrToButtons(this.value.value);
    } else {
      return [];
    }
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
  @import "../../../styles/mixins.scss";

  .selectable {
    position: relative;
    float: left;
    padding: 0 5px;
    background-color: var(--reference-backgroundColor);
    border: 1px solid var(--reference-backgroundDarker1Color);
    color: var(--reference-foregroundColor);
    border-radius: 0.6rem;
    max-width: 100%;
    word-wrap: break-word;
  }

  .add-child {
    position: absolute;
    right: 0;
    top: 0;
  }

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

    & .add-child {
      visibility: hidden;
    }

    &:hover .add-child {
      transition: 0.2s;
      visibility: visible;
    }
  }

  .table-td.selected {
    box-shadow:
      inset 2px 2px 0 var(--FocusBorderColor),
      inset -2px -2px 0 var(--FocusBorderColor);
  }

  .table-td.fixed-column.selected {
    box-shadow:
      inset 2px 2px 0 var(--FocusBorderColor),
      inset -2px -2px 0 var(--FocusBorderColor);
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
    overflow: hidden;
  }

  .display-arrow.material-icons:hover {
    opacity: 0.7;
  }

  .display-arrow.material-icons.down {
    transform: rotate(90deg);
  }

  .reference-open-modal {
    @include material-button("reference");

    pointer-events: auto !important;
    left: 2px;
    top: -1px;
    position: absolute;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
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

  .cell-text.tree {
    display: flex;
    align-self: center;
    align-items: center;
    justify-content: flex-begin;
  }

  .hidden-arrow-space + .text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
