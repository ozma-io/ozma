<template>
  <b-col
    cols="12"
    :lg="blockContent.size"
    class="form_grid_block__column"
  >
    <FormControl
      v-if="blockContent.type === 'input' && gridProps.localRow.values[blockContent.field.index].visible"
      :caption="blockContent.field.caption"
      :column-info-name="blockContent.field.columnInfo.name"
      :value="gridProps.row.values[blockContent.field.index]"
      :attributes="gridProps.localRow.values[blockContent.field.index].attributes"
      :type="blockContent.field.columnInfo.valueType"
      :locked="gridProps.locked"
      :uv-args="gridProps.uv.args"
      :scope="gridProps.scope"
      :level="gridProps.level"
      @goto="gridProps.onGoto"
      @update="gridProps.onUpdate($event, blockContent.field.index)"
    />
    <b-row v-else-if="blockContent.type === 'section'">
      <FormGridBlock
        v-for="(subBlock, subBlockI) in blockContent.content"
        :key="subBlockI"
        :block-content="subBlock"
        :grid-props="gridProps"
      />
    </b-row>
    <b-row v-else-if="blockContent.type === 'buttons'">
      <b-col>
        <FunLink
          v-for="(subBlock, subBlockI) in blockContent.actions"
          :key="subBlockI"
          :link="subBlock.link"
          @goto="gridProps.goto"
        >
          <b-button
            :key="subBlockI"
            block
            :variant="subBlock.variant"
          >
            {{ subBlock.name }}
          </b-button>
        </FunLink>
      </b-col>
    </b-row>
  </b-col>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import FormControl from "@/components/FormControl.vue";
import { GridElement, IGridProps } from "@/components/form/types";

@Component({
  name: "FormGridBlock",
  components: { FormControl },
})
export default class FormGridBlock extends Vue {
  @Prop({ type: Object }) blockContent!: GridElement;
  @Prop({ type: Object }) gridProps!: IGridProps;
}
</script>

<style scoped>
  .form_grid_block__column {
    margin-bottom: 5px;
  }

  .form_grid_block__sub_column {
    margin-top: 0;
    padding-left: 0;
    padding-right: 0;
  }
</style>
