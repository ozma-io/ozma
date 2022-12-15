<template>
  <b-col
    cols="12"
    :lg="blockContent.size"
    class="form_grid_block__column"
  >
    <div
      :class="firstLevel ? 'first_level_grid_block' : ''"
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
    </div>
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
  @Prop({ type: Boolean, default: false }) firstLevel!: boolean;
}
</script>

<style lang="scss" scoped>
  .form_grid_block__column {
    padding: 0;

    &:not(:last-child):has(.row) {
      margin-bottom: 0.3rem;
    }
  }

  .form_grid_block__column:not(:only-child):not(:has(.form_grid_block__column)):has(.nested-userview) {
    margin-bottom: 0.25rem;
    border: 1px solid var(--default-borderColor);
    border-radius: 0.4rem;
    overflow: hidden;

    &:not(:last-child) {
      margin-bottom: 1rem;
    }
  }

  .first_level_grid_block {
    margin-bottom: 0.5rem!important;
    box-shadow: rgb(0 0 0 / 10%) 0 0 10px 5px;
    border-radius: 0.5rem;
    height: 98%;
    display: none;

    // Remove box shadow from nested .first_level_grid_block
    .first_level_grid_block {
      -webkit-box-shadow: none;
      -moz-box-shadow: none;
      box-shadow: none;
    }

    // Add paddings if not only nested-userview child
    &:not(:has(.form_grid_block__column:only-child)), &:not(:has(.nested-userview)) {
      padding: 1rem;
    }

    // For example nested form to another form
    .nested-userview {
      .first_level_grid_block {
        margin-bottom: 0.25rem;
        border: 1px solid var(--default-borderColor);
        border-radius: 0.4rem;
        overflow: hidden;
      }
    }
  }

  .first_level_grid_block:has(.form_grid_block__column) {
    display: block;
  }

  .row {
    margin: 0;
  }
</style>
