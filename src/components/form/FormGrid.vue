<template>
  <b-container
    fluid
    class="form_container"
  >
    <b-row>
      <template>
        <FormGridBlock
          v-for="(block, blockI) in gridContent"
          :key="blockI"
          :block-content="block"
          :grid-props="gridProps"
        />
      </template>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import FormGridBlock from "@/components/form/FormGridBlock.vue";
import { IGridInputInfoTopLevel, IGridProps } from "@/components/form/types";

@Component({ components: { FormGridBlock } })
export default class FormGrid extends Vue {
  @Prop({ type: Array }) gridContent!: IGridInputInfoTopLevel[];
  @Prop({ type: Object }) gridProps!: IGridProps;
}
</script>

<style scoped>
  .form_container {
    margin-top: 25px;
  }
</style>
