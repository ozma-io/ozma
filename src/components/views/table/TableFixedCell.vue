<template>
  <!-- FIXME: Pls add yellow background on required -->
  <!-- When you change anything here, also make corresponding changes in TableFixedCell! -->
  <div
    :style="Object.assign({}, localValue.style, column.style)"
    @click="$emit('cellClick', columnPosition, $event)"
  >
    <p>
      <UserViewLink
        v-if="localValue.link !== undefined"
        :uv="localValue.link"
        @[indirectLinks?`click`:null]="$emit('goto', $event)"
      >
        <b-checkbox
          v-if="typeof value.value === 'boolean'"
          :checked="value.value"
          class="div_checkbox"
          disabled
        />
        <template v-else>
          {{ localValue.valueText }}
        </template>
      </UserViewLink>
      <template v-else>
        <b-checkbox
          v-if="typeof value.value === 'boolean'"
          :checked="value.value"
          class="div_checkbox"
          disabled
        />
        <template v-else>
          {{ localValue.valueText }}
        </template>
      </template>
    </p>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";

@Component
export default class TableFixedCell extends Vue {
  // We don't bother to set types here properly, they matter no more than for TableRow.
  // The reason this is not a functional component is because of performance.
  // See https://forum.vuejs.org/t/performance-for-large-numbers-of-components/13545/10
  @Prop({ type: Object, required: true }) value!: any;
  @Prop({ type: Object, required: true }) localValue!: any;
  @Prop({ type: Object, required: true }) column!: any;
  @Prop({ type: Number, required: true }) columnPosition!: number;
  @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
}
</script>
