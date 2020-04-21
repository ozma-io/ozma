<template>
  <!-- FIXME: Pls solve these classes -->
  <!-- When you change anything here, also make corresponding changes in TableFixedCell! -->
  <td
    :style="localValue.style"
    :class="['table-td', {'fixed-column': column.fixed,
                          'select_fixed': localValue.selected && column.fixed,
                          'next-after-last-fixed': index === lastFixedColumnIndex,
                          'select': localValue.selected && !column.fixed,
                          'error_style': value.erroredOnce,
                          'required_cell_style': isNull && value.info !== undefined && !value.info.field.isNullable && from !== 'new',
                          'editing_style': localValue.editing !== undefined,
                          'disable_cell': value.info === undefined && from !== 'existing'}]"
    @click="$emit('cellClick', columnPosition, $event)"
  >
    <UserViewLink
      v-if="localValue.link !== undefined"
      :uv="localValue.link"
      @[indirectLinks?`click`:null]="$emit('goto', $event)"
    >
      <checkbox
        v-if="typeof value.value === 'boolean'"
        class="checkbox_click-none"
        :checked="value.value"
        disabled
      />
      <template v-else>
        {{ localValue.valueText || '&nbsp;' }}
      </template>
    </UserViewLink>
    <template v-else>
      <checkbox
        v-if="typeof value.value === 'boolean'"
        class="checkbox_click-none"
        :checked="value.value"
        disabled
      />
      <p v-else>
        {{ localValue.valueText || "" }}
      </p>
    </template>
  </td>
</template>

<script lang="ts">
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
  @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
  @Prop({ type: String, default: "existing" }) from!: string;
  @Prop({ type: Number, default: null }) lastFixedColumnIndex!: number;
  @Prop({ type: Number, default: null }) index!: number;

  get isNull() {
    // We use `value.value` here to highlight unvalidated values.
    return valueIsNull(this.value.value);
  }
}
</script>

<style scoped>
  .next-after-last-fixed {
    padding-left: 7px !important;
  }

  .checkbox_click-none {
    pointer-events: none;
  }
</style>
