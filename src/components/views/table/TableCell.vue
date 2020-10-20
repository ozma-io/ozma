<template>
  <!-- FIXME: Pls solve these classes -->
  <!-- When you change anything here, also make corresponding changes in TableFixedCell! -->
  <td
    :style="localValue.style"
    :class="['table-td', {'fixed-column': column.fixed,
                          'select_fixed': localValue.selected && column.fixed,
                          'next-after-last-fixed': index === lastFixedColumnIndex,
                          'select': localValue.selected && !column.fixed,
                          'table-td_selected': localValue.selected,
                          'error_style': value.erroredOnce,
                          'required_cell_style': isNull && value.info !== undefined && !value.info.field.isNullable,
                          'editing_style': localValue.editing !== undefined,
                          'disable_cell': value.info === undefined && from !== 'existing'}]"
    @click="$emit('cell-click', columnPosition, $event)"
  >
    <p>
      <template v-if="localValue.link !== undefined && fieldType == 'reference' && localValue.valueText.length > 0">
        <div class="selectable">
          <FunLink
            :link="localValue.link"
            @goto="$emit('goto', $event)"
          >
            <input
              type="button"
              class="material-icons reference__open_modal"
              :value="iconValue(localValue.link.target)"
            >
          </FunLink>
          <span class="reference-text">{{ localValue.valueText || '&nbsp;' }}</span>
        </div>
      </template>
      <FunLink
        v-else-if="localValue.link !== undefined"
        :link="localValue.link"
        @goto="$emit('goto', $event)"
      >
        <checkbox
          v-if="valueType === 'bool'"
          class="checkbox_click-none"
          :checked="value.value"
          disabled
        />
        <template v-else>
          {{ localValue.valueText || '&nbsp;' }}
        </template>
      </FunLink>
      <template v-else>
        <checkbox
          v-if="valueType === 'bool'"
          class="checkbox_click-none"
          :checked="value.value"
          disabled
        />
        <div v-else :class="{selectable : (fieldType == 'enum' || fieldType == 'reference') && localValue.valueText.length > 0}">
          {{ localValue.valueText || "" }}
        </div>
      </template>
    </p>
  </td>
</template>

<script lang="ts">
import * as R from 'ramda';
import { Component, Vue, Prop, Watch } from "vue-property-decorator";

import { valueIsNull } from "@/values";

@Component({
  components: {
    Checkbox: () => import("@/components/checkbox/Checkbox.vue"),
  },
})
export default class TableCell extends Vue {
  // We don't bother to set types here properly, they matter no more than for TableRow.
  // The reason this is not a functional component is because of performance.
  // See https://forum.vuejs.org/t/performance-for-large-numbers-of-components/13545/10
  @Prop({ type: Object, required: true }) value!: any;
  @Prop({ type: Object, required: true }) localValue!: any;
  @Prop({ type: Object, required: true }) column!: any;
  @Prop({ type: Number, required: true }) columnPosition!: number;
  @Prop({ type: String, default: "existing" }) from!: string;
  @Prop({ type: Number, default: null }) lastFixedColumnIndex!: number;
  @Prop({ type: Number, default: null }) index!: number;

  private get valueType(): string | undefined {
    return R.path(['info', 'field', 'valueType', 'type'], this.value);
  }

  private get fieldType(): string | undefined {
    return R.path(['info', 'field', 'fieldType', 'type'], this.value);
  }

  get isNull() {
    // We use `value.value` here to highlight unvalidated values.
    return valueIsNull(this.value.value);
  }
  
  private iconValue(target: string) {
    if (target === 'modal-auto' || target === 'modal')
      return 'flip_to_front';
    else
      return 'open_in_new';
  }

}
</script>

<style scoped>

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
  }

  .table-td > p {
    pointer-events: none;
    padding: 3px 7px 2px 7px;
  }

  .table-td_selected {
    border: 2px solid rgb(14, 101, 235);
    padding: 3px 0 0 1px !important;
  }

  .next-after-last-fixed.table-td_selected {
    padding: 3px 2px 0 3px !important;
  }

  .checkbox_click-none {
    pointer-events: none;
  }

  .reference__open_modal {
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

  .reference__open_modal:hover {
    opacity: 0.7;
  }

  a + span.reference-text {
    padding-left: 20px;
    display: block;
  }
</style>
