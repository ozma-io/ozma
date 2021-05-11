<i18n>
    {
        "en": {
            "schema_name": "Schema name",
            "view_name": "User view name",
            "role_schema": "Role schema",
            "role_name": "Role name",
            "explain": "Show plan"
        },
        "ru": {
            "schema_name": "Название схемы",
            "view_name": "Название отображения",
            "role_schema": "Схема роли",
            "role_name": "Название роли",
            "explain": "Показать план"
        }
    }
</i18n>

<template>
  <div>
    <p>
      <label>
        {{ $t('schema_name') }}:
        <input
          v-model="schema"
          :placeholder="$t('schema_name')"
        >
      </label>
    </p>
    <p>
      <label>
        {{ $t('view_name') }}:
        <input
          v-model="view"
          :placeholder="$t('view_name')"
        >
      </label>
    </p>
    <p>
      <label>
        {{ $t('role_schema') }}:
        <input
          v-model="roleSchema"
          :placeholder="$t('role_schema')"
        >
      </label>
    </p>
    <p>
      <label>
        {{ $t('role_name') }}:
        <input
          v-model="roleName"
          :placeholder="$t('role_name')"
        >
      </label>
    </p>
    <p>
      <button @click="explainView">
        {{ $t('explain') }}
      </button>
    </p>
    <pre>
      {{ lastError }}
    </pre>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action } from "vuex-class";
import { IEntityRef, IUserViewRef, IViewExplainResult, IUserViewOpts } from "ozma-api";

import Api from "@/api";

@Component
export default class ExplainQuery extends Vue {
  @Action("callProtectedApi") callProtectedApi!: (_: { func: ((_1: string, ..._2: any[]) => Promise<any>); args?: any[] }) => Promise<any>;

  schema = "";
  view = "";
  roleSchema = "";
  roleName = "";
  lastError = "";

  async explainView() {
    try {
      const ref: IUserViewRef = {
        schema: this.schema,
        name: this.view,
      };
      if ((this.roleSchema === "") !== (this.roleName === "")) {
        throw new Error("You should specify both role schema and role name, or none of them");
      }
      const roleRef: IEntityRef | undefined = this.roleSchema === "" ? undefined : { schema: this.roleSchema, name: this.roleName };
      const req: IUserViewOpts = {
        pretendRole: roleRef,
      };
      const res: IViewExplainResult = await this.callProtectedApi({
        func: Api.getNamedUserViewExplain,
        args: [ref, req],
      });

      let info = "";
      if (res.attributes) {
        info += `Attributes query:\n\n${res.attributes.query}\n\nAttributes plan:\n\n${res.attributes.explanation}\n\n\n\n`;
      }
      info += `Rows query:\n\n${res.rows.query}\n\nRows plan:\n\n${res.rows.explanation}`;
      this.lastError = info;
    } catch (e) {
      this.lastError = e.message;
      throw e;
    }
  }
}
</script>
