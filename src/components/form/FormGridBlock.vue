<template>
  <b-col
    cols="12"
    :lg="blockContent.size"
    class="form_grid_block__column"
  >
    <slot
      v-if="blockContent.type === 'element'"
      :element="blockContent.element"
    />
    <b-row v-else-if="blockContent.type === 'section'">
      <FormGridBlock
        v-for="(subBlock, subBlockI) in blockContent.content"
        :key="subBlockI"
        v-slot="slotProps"
        :block-content="subBlock"
      >
        <slot :element="slotProps.element" />
      </FormGridBlock>
    </b-row>
  </b-col>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import type { GridElement } from "@/components/form/FormGrid.vue";

@Component({
  name: "FormGridBlock",
})
export default class FormGridBlock extends Vue {
  @Prop({ type: Object }) blockContent!: GridElement<any>;
}
</script>

<style lang="scss" scoped>
  .form_grid_block__column:not(:last-child) {
    margin-bottom: 5px;
  }

  .form_grid_block__sub_column {
    margin-top: 0;
    padding-left: 0;
    padding-right: 0;
  }
</style>
