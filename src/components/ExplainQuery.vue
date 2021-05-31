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
  <div class="explain">
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

    <div v-if="attributesQuery !== ''">
      Attributes query:
      <div class="query">
        {{ attributesQuery }}
      </div>
      Attributes plan:
      <pre class="plan">
        {{ attributesPlan }}
      </pre>
    </div>

    <div v-if="rowsQuery !== ''">
      Rows query:
      <div class="query">
        {{ rowsQuery }}
      </div>
      Rows plan:
      <pre class="plan">
        {{ rowsPlan }}
      </pre>
    </div>
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
  attributesQuery = "";
  attributesPlan = "";
  rowsQuery = "";
  rowsPlan = "";

  async explainView() {
    this.attributesQuery = "";
    this.attributesPlan = "";
    this.rowsQuery = "";
    this.rowsPlan = "";
    this.lastError = "";

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

      if (res.attributes) {
        this.attributesQuery = res.attributes.query;
        this.attributesPlan = JSON.stringify(res.attributes.explanation, undefined, 2);
      }
      this.rowsQuery = res.rows.query;
      this.rowsPlan = JSON.stringify(res.rows.explanation, undefined, 2);
    } catch (e) {
      this.lastError = e.message;
      throw e;
    }
  }
}
</script>

<style scoped>
  .explain {
    overflow: auto;
  }

  .query {
    font-family: monospace;
  }

  .plan {
    font-size: 100%;
    display: inline-block;
  }
</style>
