<i18n>
    {
        "en": {
            "schema_name": "Schema name",
            "entity_name": "Entity name",
            "field_name": "Field name",
            "role_schema": "Role schema",
            "role_name": "Role name",
            "user_name": "User name",
            "row_id": "Row ID",
            "limit": "Limit",
            "explain": "Show plan"
        },
        "ru": {
            "schema_name": "Название схемы",
            "entity_name": "Название сущности",
            "field_name": "Название поля",
            "role_schema": "Схема роли",
            "role_name": "Название роли",
            "user_name": "Имя пользователя",
            "row_id": "ID записи",
            "limit": "Количество записей",
            "explain": "Показать план"
        },
        "es": {
            "schema_name": "El nombre del esquema",
            "entity_name": "El nombre de la entidad",
            "field_name": "El nombre del campo",
            "role_schema": "El esquema de roles",
            "role_name": "El nombre del rol",
            "user_name": "El nombre del usuario",
            "row_id": "ID de fila",
            "limit": "El limite",
            "explain": "Mostrar el plan"
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
          :placeholder="$tc('schema_name')"
        >
      </label>
    </p>
    <p>
      <label>
        {{ $t('entity_name') }}:
        <input
          v-model="entity"
          :placeholder="$tc('entity_name')"
        >
      </label>
    </p>
    <p>
      <label>
        {{ $t('field_name') }}:
        <input
          v-model="field"
          :placeholder="$tc('field_name')"
        >
      </label>
    </p>
    <p>
      <label>
        {{ $t('user_name') }}:
        <input
          v-model="userName"
          :placeholder="$tc('user_name')"
        >
      </label>
    </p>
    <p>
      <label>
        {{ $t('role_schema') }}:
        <input
          v-model="roleSchema"
          :placeholder="$tc('role_schema')"
        >
      </label>
    </p>
    <p>
      <label>
        {{ $t('role_name') }}:
        <input
          v-model="roleName"
          :placeholder="$tc('role_name')"
        >
      </label>
    </p>
    <p>
      <label>
        {{ $t('row_id') }}:
        <input
          v-model="rowId"
          :placeholder="$tc('row_id')"
        >
      </label>
    </p>
    <p>
      <label>
        {{ $t('limit') }}:
        <input
          v-model="limit"
          :placeholder="$tc('limit')"
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

    <div v-if="rowsQuery !== ''">
      Rows query:
      <div class="query" @click="copyToClipboard(rowsQuery)">
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
import { IEntityRef, IEntriesExplainOpts, IQueryChunk, IFieldRef, IExplainedQuery } from "ozma-api";

import type { ICallApi } from "@/state/auth";

@Component
export default class ExplainDomains extends Vue {
  @Action("callApi") callApi!: ICallApi;

  schema = "";
  entity = "";
  field = "";
  rowId = "";
  userName = "";
  roleSchema = "";
  roleName = "";
  analyze = false;
  verbose = false;
  costs = true;
  limit = "";

  lastError = "";
  rowsQuery = "";
  rowsPlan = "";

  async copyToClipboard(str: string) {
    await navigator.clipboard.writeText(str);
  }

  async explainView() {
    this.rowsQuery = "";
    this.rowsPlan = "";
    this.lastError = "";

    try {
      const ref: IFieldRef = {
        entity: {
          schema: this.schema,
          name: this.entity,
        },
        name: this.field,
      };
      if ((this.roleSchema === "") !== (this.roleName === "")) {
        throw new Error("You should specify both role schema and role name, or none of them");
      }
      const roleRef: IEntityRef | undefined = this.roleSchema === "" ? undefined : { schema: this.roleSchema, name: this.roleName };
      const rowId: number | undefined = this.rowId === "" ? undefined : Number(this.rowId);
      const chunk: IQueryChunk | undefined = this.limit === "" ? undefined : { limit: Number(this.limit) };
      const opts: IEntriesExplainOpts = {
        chunk,
        pretendUser: this.userName === "" ? undefined : this.userName,
        pretendRole: roleRef,
        analyze: this.analyze,
        verbose: this.verbose,
        costs: this.costs,
      };
      const res: IExplainedQuery = await this.callApi({
        func: api => api.getDomainExplain(ref, rowId, opts),
      });

      this.rowsQuery = res.query;
      this.rowsPlan = JSON.stringify(res.explanation, undefined, 2);
    } catch (e) {
      this.lastError = String(e);
      throw e;
    }
  }
}
</script>

<style scoped>
  .explain {
    height: 100%;
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
