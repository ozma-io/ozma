<i18n>
    {
        "en": {
            "schema_name": "Schema name",
            "save": "Save",
            "restore": "Restore",
            "success": "Success",
            "drop_others": "Drop other schemas",
            "skip_preloaded": "Skip preloaded schemas"
        },
        "ru": {
            "schema_name": "Название схемы",
            "save": "Сохранить",
            "restore": "Восстановить",
            "success": "Успех",
            "drop_others": "Удалить другие схемы",
            "skip_preloaded": "Пропустить системные схемы"
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
      <button @click="saveSchema">
        {{ $t('save') }}
      </button>
    </p>
    <p>
      <label>
        {{ $t('restore') }}
        <input
          type="file"
          @change="restoreSchemas"
        >
      </label>
    </p>
    <p>
      <input
        v-model="dropOthers"
        type="checkbox"
      >
      <label>
        {{ $t('drop_others') }}
      </label>
    </p>
    <p>
      <input
        v-model="skipPreloaded"
        type="checkbox"
      >
      <label>
        {{ $t('skip_preloaded') }}
      </label>
    </p>
    <p>
      {{ lastError }}
    </p>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action } from "vuex-class";
import type { IRestoreSchemasOptions, ISaveSchemasOptions } from "ozma-api";

import Api from "@/api";

@Component
export default class SaveRestoreSchema extends Vue {
  @Action("callProtectedApi") callProtectedApi!: (_: { func: ((_1: string, ..._2: any[]) => Promise<any>); args?: any[] }) => Promise<any>;

  schema = "";
  lastError = "";
  dropOthers = false;
  skipPreloaded = false;

  async saveSchema() {
    try {
      const schemas = this.schema === "" ? "all" : [this.schema];
      const opts: ISaveSchemasOptions = {
        skipPreloaded: this.skipPreloaded,
      };
      const res: Blob = await this.callProtectedApi({
        func: Api.saveSchemas,
        args: [schemas, opts],
      });

      const url = URL.createObjectURL(res);
      try {
        const element = document.createElement("a");
        try {
          element.setAttribute("href", url);
          const name = this.schema === "" ? "schemas" : this.schema;
          element.setAttribute("download", `${name}.zip`);
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

  async restoreSchemas(event: Event) {
    const files = (event.target as HTMLInputElement).files as FileList;
    const content = files[0];
    const opts: IRestoreSchemasOptions = {
      dropOthers: this.dropOthers,
    };
    try {
      await this.callProtectedApi({
        func: Api.restoreSchemas,
        args: [content, opts],
      });

      this.lastError = this.$t("success").toString();
    } catch (e) {
      this.lastError = e.message;
      throw e;
    }
  }
}
</script>
