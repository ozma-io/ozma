<template>
  <b-col
    cols="12"
    :lg="blockContent.size"
    class="form_grid_block__column"
  >
    <div
      :class="[
        {
          'first_level_grid_block': firstLevel,
          'has-no-content': hasNoContent,
          'only-nested-userview': singleUservewSection,
        }
      ]"
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
  @Prop({ type: Boolean, default: false }) hasNoContent!: boolean;
  @Prop({ type: Boolean, default: false }) singleUservewSection!: boolean;
}
</script>

<style lang="scss" scoped>
  .form_grid_block__column {
    padding: 0;

    &:not(:last-child) {
      margin-bottom: 0.3rem;
    }
  }

  .first_level_grid_block {
    margin-bottom: 0.5rem!important;
    box-shadow: rgb(0 0 0 / 10%) 0 0 10px 5px;
    border-radius: 0.5rem;
    height: 98%;
    padding: 1rem;

    // Remove box shadow from nested .first_level_grid_block
    .first_level_grid_block {
      -webkit-box-shadow: none;
      -moz-box-shadow: none;
      box-shadow: none;
    }

    &:not(.only-nested-userview) {
      ::v-deep .nested-userview {
        margin-top: 0.5rem;
        margin-bottom: 0.25rem;
        border: 1px solid var(--default-borderColor);
        border-radius: 0.4rem;
        overflow: hidden;
      }
    }
  }

  .has-no-content {
    display: none;
  }

  .only-nested-userview {
    padding: 0;
  }

  .row {
    margin: 0;
  }
</style>
