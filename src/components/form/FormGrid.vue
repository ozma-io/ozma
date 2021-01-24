<template>
  <b-container
    fluid
    class="form_container"
    :style="{ maxWidth }"
  >
    <b-row class="sm-gutters">
      <FormGridBlock
        v-for="(block, blockI) in gridContent"
        :key="blockI"
        v-slot="slotProps"
        :block-content="block"
      >
        <slot :element="slotProps.element" />
      </FormGridBlock>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import FormGridBlock from "@/components/form/FormGridBlock.vue";

export interface IGridBase {
  size: number;
}

export interface IGridInput<T> extends IGridBase {
  type: "element";
  element: T;
}

export interface IGridSection<T> extends IGridBase {
  type: "section";
  content: GridElement<T>[];
}

export type GridElement<T> = IGridInput<T> | IGridSection<T>;

@Component({ components: { FormGridBlock } })
export default class FormGrid extends Vue {
  @Prop({ type: Array }) gridContent!: GridElement<any>[];
  @Prop({ type: String }) maxWidth!: string;
}
</script>

<style lang="scss" scoped>
  .form_container {
    padding: 0;
  }
</style>
