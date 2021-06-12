<i18n>
    {
        "en": {
            "schema_name": "Schema name",
            "view_name": "User view name",
            "role_schema": "Role schema",
            "role_name": "Role name",
            "user_name": "User name",
            "arguments": "Arguments",
            "limit": "Limit",
            "explain": "Show plan"
        },
        "ru": {
            "schema_name": "Название схемы",
            "view_name": "Название отображения",
            "role_schema": "Схема роли",
            "role_name": "Название роли",
            "user_name": "Имя пользователя",
            "arguments": "Аргументы",
            "limit": "Количество записей",
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
        {{ $t('user_name') }}:
        <input
          v-model="userName"
          :placeholder="$t('user_name')"
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
      <label>
        {{ $t('arguments') }}:
        <input
          v-model="rawArguments"
          :placeholder="$t('arguments')"
        >
      </label>
    </p>
    <p>
      <label>
        {{ $t('limit') }}:
        <input
          v-model="limit"
          :placeholder="$t('limit')"
        >
      </label>
    </p>
    <p>
      <input
        v-model="analyze"
        type="checkbox"
      >
      <label>
        ANALYZE
      </label>
    </p>
    <p>
      <input
        v-model="verbose"
        type="checkbox"
      >
      <label>
        VERBOSE
      </label>
    </p>
    <p>
      <input
        v-model="costs"
        type="checkbox"
      >
      <label>
        COSTS
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
      <pre class="plan" @click="copyToClipboard(attributesPlan)">
        {{ attributesPlan }}
      </pre>
    </div>

    <div v-if="rowsQuery !== ''">
      Rows query:
      <div class="query">
        {{ rowsQuery }}
      </div>
      Rows plan:
      <pre class="plan" @click="copyToClipboard(rowsPlan)">
        {{ rowsPlan }}
      </pre>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action } from "vuex-class";
import { IEntityRef, IUserViewRef, IViewExplainResult, IUserViewExplainOpts, ArgumentName, IQueryChunk } from "ozma-api";

import Api from "@/api";

@Component
export default class ExplainQuery extends Vue {
  @Action("callProtectedApi") callProtectedApi!: (_: { func: ((_1: string, ..._2: any[]) => Promise<any>); args?: any[] }) => Promise<any>;

  schema = "";
  view = "";
  userName = "";
  roleSchema = "";
  roleName = "";
  analyze = false;
  verbose = false;
  costs = true;
  rawArguments = "";
  limit = "";

  lastError = "";
  attributesQuery = "";
  attributesPlan = "";
  rowsQuery = "";
  rowsPlan = "";

  async copyToClipboard(str: string) {
    await navigator.clipboard.writeText(str);
  }

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
      const args: Record<ArgumentName, any> | undefined = this.rawArguments === "" ? undefined : JSON.parse(this.rawArguments);
      const chunk: IQueryChunk | undefined = this.limit === "" ? undefined : { limit: Number(this.limit) };
      const opts: IUserViewExplainOpts = {
        chunk,
        pretendUser: this.userName === "" ? undefined : this.userName,
        pretendRole: roleRef,
        analyze: this.analyze,
        verbose: this.verbose,
        costs: this.costs,
      };
      const res: IViewExplainResult = await this.callProtectedApi({
        func: Api.getNamedUserViewExplain,
        args: [ref, args, opts],
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
