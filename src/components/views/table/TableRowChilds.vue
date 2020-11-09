<template>
  <fragment> 
    <TableRow
      v-if = "local.rows[parentRowI].extra.visible"
      :row="uv.rows[parentRowI]"
      :local-row="local.rows[parentRowI]"
      :base-local-row="baseLocal.rows[parentRowI]"
      :column-indexes="columnIndexes"
      :local-uv="local.extra"
      @update:visibleChids="$emit('update:visibleChids', arguments[0], arguments[1])"
      @goto="$emit('goto', $event)"
    />
    <TableRowChilds
      v-for="rowI in local.rows[parentRowI].extra.children"
      :key="rowI"
      :parent-row-i="rowI"
      :local="local"
      :base-local="baseLocal"
      :uv="uv"
      :column-indexes="columnIndexes"
      :level="level+1"
      @update:visibleChids="$emit('update:visibleChids', arguments[0], arguments[1])"
    />
  </fragment>
</template>
<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";

import { LocalUserView } from "@/local_user_view";
import { LocalBaseUserView } from "@/components/BaseUserView";
import { CombinedUserView } from "@/state/user_view";

@Component({
  components: {
    TableRow: () => import("@/components/views/table/TableRow.vue"),
    TableRowChilds: () => import("@/components/views/table/TableRowChilds.vue"),
  },
})
export default class TableRowChilds extends Vue {  
  @Prop({ type: Number, required: true }) parentRowI!: number;
  @Prop({ type: Object, required: true }) local!: LocalUserView<undefined, undefined, undefined>;
  @Prop({ type: Object, required: true }) baseLocal!: LocalBaseUserView;
  @Prop({ type: Object, required: true }) uv!: CombinedUserView;
  @Prop({ type: Array, required: true }) columnIndexes!: any[];
  @Prop({ type: Number, required: true }) level!: number;
}

</script>