<i18n>
    {
        "en": {
            "schema_name": "Schema name",
            "view_name": "User view name",
            "explain": "Show plan"
        },
        "ru": {
            "schema_name": "Название схемы",
            "view_name": "Название отображения",
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
import { IUserViewRef, IViewExplainResult } from "ozma-api";

import Api from "@/api";

@Component
export default class ExplainQuery extends Vue {
  @Action("callProtectedApi") callProtectedApi!: (_: { func: ((_1: string, ..._2: any[]) => Promise<any>); args?: any[] }) => Promise<any>;

  schema = "";
  view = "";
  lastError = "";

  async explainView() {
    try {
      const ref: IUserViewRef = {
        schema: this.schema,
        name: this.view,
      };
      const res: IViewExplainResult = await this.callProtectedApi({
        func: Api.getNamedUserViewExplain,
        args: [ref],
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
