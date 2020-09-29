<template>
  <!-- FIXME: Pls add yellow background on required -->
  <!-- When you change anything here, also make corresponding changes in TableFixedCell! -->
  <div
    :style="Object.assign({}, localValue.style, column.style)"
    @click="$emit('cell-click', columnPosition, $event)"
  >
    <p>
      <UserViewLink
        v-if="localValue.link !== undefined"
        :uv="localValue.link"
        @click="$emit('goto', $event)"
      >
        <checkbox
          v-if="typeof value.value === 'boolean'"
          :checked="value.value"
          disabled
        />
        <template v-else>
          {{ localValue.valueText }}
        </template>
      </UserViewLink>
      <template v-else>
        <checkbox
          v-if="typeof value.value === 'boolean'"
          :checked="value.value"
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

@Component({
  components: {
    Checkbox: () => import("@/components/checkbox/Checkbox.vue"),
  },
})
export default class TableFixedCell extends Vue {
  // We don't bother to set types here properly, they matter no more than for TableRow.
  // The reason this is not a functional component is because of performance.
  // See https://forum.vuejs.org/t/performance-for-large-numbers-of-components/13545/10
  @Prop({ type: Object, required: true }) value!: any;
  @Prop({ type: Object, required: true }) localValue!: any;
  @Prop({ type: Object, required: true }) column!: any;
  @Prop({ type: Number, required: true }) columnPosition!: number;
}
</script>
