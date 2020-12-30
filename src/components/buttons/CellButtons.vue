<template>
  <td>
    <ul class="actions">
      <FunLink
        v-for="(action, j) in actions"
        :key="j"
        :link="action.link"
        @goto="$emit('goto', $event)"
      >
        <li v-if="'link' in action" :key="action.name">
          <i v-if="action.icon" class="material-icons">{{ action.icon }}</i>
          <i v-else class="material-icons">arrow_right</i>
          <span>{{ action.name }}</span>
        </li>
      </FunLink>
    </ul>
  </td>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import type { ICombinedValue } from "@/state/user_view";
import { mapMaybe } from "@/utils";
import { attrToLinkSelf } from "@/links";
import { Action } from "@/components/ActionsMenu.vue";

@Component
export default class CellButtons extends Vue {
  @Prop({ type: Object, required: true }) value!: ICombinedValue;

  get actions(): Action[] {
    return mapMaybe((rawAction: unknown) => {
        const link = attrToLinkSelf(rawAction);
        if (link === null) {
          return undefined;
        }
        // `rawAction` at this point is guaranteed to be `Record<string, unknown>`,
        // but TypeScript doesn't support advanced type witnesses like that.
        const actionObj = rawAction as Record<string, unknown>;
        if (typeof actionObj.name !== "string") {
          return undefined;
        }
        const icon = typeof actionObj.icon === "string" ? actionObj.icon : undefined;

        return {
          icon,
          name: actionObj.name,
          link,
        };
      }, this.value.value);
  }
}
</script>