<template>
  <b-container
    fluid
    class="form_container"
  >
    <b-row class="sm-gutters">
      <FormGridBlock
        v-for="(block, blockI) in gridContent"
        :key="blockI"
        :block-content="block"
        :grid-props="gridProps"
      />
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import FormGridBlock from "@/components/form/FormGridBlock.vue";
import type { IGridProps, GridElement } from "@/components/form/types";

@Component({ components: { FormGridBlock } })
export default class FormGrid extends Vue {
  @Prop({ type: Array }) gridContent!: GridElement[];
  @Prop({ type: Object }) gridProps!: IGridProps;
}
</script>

<style lang="scss" scoped>
  .form_container {
    padding: 0;
  }
</style>
