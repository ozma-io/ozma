<template>
  <table 
    v-if="local.rows[parentRowI].extra.visible"
    :style="{padding: '15px 0 0 15px'}"
    ref="childTable"
  >
    <tbody v-for="rowI in local.rows[parentRowI].extra.children" :key="rowI"> 
      <TableRow
        v-if = "local.rows[rowI].extra.visible"
        :row="uv.rows[rowI]"
        :local-row="local.rows[rowI]"
        :base-local-row="baseLocal.rows[rowI]"
        :column-indexes="columnIndexes"
        :local-uv="local.extra"
        @update:visibleChids="$emit('update:visibleChids', arguments[0], arguments[1])"
        @goto="$emit('goto', $event)"
      />
      <TableRowChilds
        v-if="local.rows[rowI].extra.visible && local.rows[rowI].extra.children.length > 0"
        :parent-row-i="rowI"
        :local="local"
        :base-local="baseLocal"
        :uv="uv"
        :column-indexes="columnIndexes"
        :level="level+1"
        @update:visibleChids="$emit('update:visibleChids', arguments[0], arguments[1])"
      />
    </tbody>
  </table>
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