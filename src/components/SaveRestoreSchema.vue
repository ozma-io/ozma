<i18n>
    {
        "en": {
            "schema_name": "Schema name:",
            "save": "Save",
            "restore": "Restore",
            "success": "Success"
        },
        "ru": {
            "schema_name": "Название схемы",
            "save": "Сохранить",
            "restore": "Восстановить",
            "success": "Успех"
        }
    }
</i18n>

<template>
  <div>
    <p>
      <label>
        {{ $t('schema_name') }}
        <input
          v-model="schema"
          :placeholder="$t('schema_name')"
        >
      </label>
    </p>
    <p>
      <button @click="saveSchema">
        {{ $t('save') }}
      </button>
    </p>
    <p>
      <label>
        {{ $t('restore') }}
        <input
          type="file"
          @change="restoreSchema"
        >
      </label>
    </p>
    <p>
      {{ lastError }}
    </p>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Action, namespace } from "vuex-class";

import * as Api from "@/api";

@Component
export default class SaveRestoreSchema extends Vue {
  @Action("callProtectedApi") callProtectedApi!: (_: { func: ((_1: string, ..._2: any[]) => Promise<any>); args?: any[] }) => Promise<any>;

  schema = "";
  lastError = "";

  async saveSchema() {
    try {
      const res: Blob = await this.callProtectedApi({
        func: Api.saveSchema,
        args: [this.schema],
      });

      const url = URL.createObjectURL(res);
      try {
        const element = document.createElement("a");
        try {
          element.setAttribute("href", url);
          element.setAttribute("download", `${this.schema}.zip`);
          element.style.display = "none";

          document.body.appendChild(element);
          element.click();
        } finally {
          document.body.removeChild(element);
        }
      } finally {
        URL.revokeObjectURL(url);
      }

      this.lastError = this.$t("success").toString();
    } catch (e) {
      this.lastError = e.message;
      throw e;
    }
  }

  async restoreSchema(event: Event) {
    const files = (event.target as HTMLInputElement).files as FileList;
    const content = files[0];
    try {
      await this.callProtectedApi({
        func: Api.restoreSchema,
        args: [this.schema, content],
      });

      this.lastError = this.$t("success").toString();
    } catch (e) {
      this.lastError = e.message;
      throw e;
    }
  }
}
</script>
