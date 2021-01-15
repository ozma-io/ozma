<template>
  <ul class="actions">
    <FunLink
      v-for="(action, j) in actions"
      :key="j"
      :link="action.link"
      @goto="$emit('goto', $event)"
    >
      <li>
        <div>
          <i :class="['material-icons', {'font-size-20': action.icon && action.icon.length < 3}]">{{ action.icon || "arrow_right" }}</i>
          <span>{{ action.name }}</span>
        </div>
      </li>
    </FunLink>
  </ul>
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
    if (!Array.isArray(this.value.value)) {
      return [];
    }

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

<style scoped>

  ul.actions {
    padding: 0;
    margin: 0;
  }

  ul.actions > a {
    text-decoration: none;
    color: var(--MainTextColor);
  }

  ul.actions > span > li,
  ul.actions > a > li {
    background-color: white;
    list-style: none;
    cursor: pointer;
    border-radius: 3px;
    padding: 2px;
    margin-bottom: 1px;
    border: 1px solid var(--MainBorderColor);
    color: var(--MainTextColor);
  }

  ul.actions > span > li:hover,
  ul.actions > a > li:hover {
    background-color: #f9f9fb;
    border: 1px solid var(--MainBorderColor);
    color: var(--MainTextColor);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  ul.actions > span > li > div,
  ul.actions > a > li > div {
    display: flex;
    padding: 1px 5px;
  }

  ul.actions > span > li > div > span,
  ul.actions > a > li > div > span {
    padding-top: 2px;
    padding-left: 2px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }

  .font-size-20 {
    font-size: 20px;
    margin-right: 5px;
  }
</style>
