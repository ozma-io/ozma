<template>
  <b-col
    cols="12"
    :lg="blockContent.size"
    class="form_grid_block__column"
  >
    <FormControl
      v-if="blockContent.type === 'input'"
      :caption="blockContent.field.caption"
      :value="gridProps.row.values[blockContent.field.index]"
      :attributes="gridProps.localRow.values[blockContent.field.index].attributes"
      :type="blockContent.field.columnInfo.valueType"
      :locked="gridProps.locked"
      :uv-args="gridProps.uv.args"
      :indirect-links="gridProps.indirectLinks"
      :scope="gridProps.scope"
      :level="gridProps.level"
      @goto="gridProps.onGoto"
      @update="gridProps.onUpdate($event, blockContent.field.index)"
    />
    <b-row v-if="blockContent.type === 'section'">
      <FormGridBlock
        v-for="(subBlock, subBlockI) in blockContent.content"
        :key="subBlockI"
        :block-content="subBlock"
        :grid-props="gridProps"
      />
    </b-row>
  </b-col>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import FormControl from "@/components/FormControl.vue";
import { IGridInputInfoTopLevel, IGridProps } from "@/components/form/types";

@Component({
  name: "FormGridBlock",
  components: { FormControl },
})
export default class FormGridBlock extends Vue {
  @Prop({ type: Object }) blockContent!: IGridInputInfoTopLevel;
  @Prop({ type: Object }) gridProps!: IGridProps;
}
</script>

<style scoped>
  .form_grid_block__sub_column {
    margin-top: 0;
    padding-left: 0;
    padding-right: 0;
  }
</style>
