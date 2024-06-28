<i18n>
    {
        "en": {
            "schema_name": "Schema name",
            "save": "Save",
            "restore": "Restore",
            "save_schema": "Save schema",
            "restore_schema": "Restore schema",
            "success": "Success",
            "error": "Error",
            "from_file": "From file",
            "drop_others": "Drop other schemas",
            "skip_preloaded": "Skip preloaded schemas",
            "force_allow_broken": "Mark broken objects as allow_broken"
        },
        "ru": {
            "schema_name": "Название схемы",
            "save": "Сохранить",
            "restore": "Восстановить",
            "save_schema": "Сохранить схему",
            "restore_schema": "Восстановить схему",
            "success": "Успех",
            "error": "Ошибка",
            "from_file": "Из файла",
            "drop_others": "Удалить другие схемы",
            "skip_preloaded": "Пропустить системные схемы",
            "force_allow_broken": "Помечать некорректные объекты как allow_broken"
        },
        "es": {
            "schema_name": "El nombre del esquema",
            "save": "Guardar",
            "restore": "Restablecer",
            "save_schema": "Guardar el esquema",
            "restore_schema": "Restablecer el esquema",
            "success": "El éxito",
            "error": "El error",
            "from_file": "Desde archivo",
            "drop_others": "Soltar otros esquemas",
            "skip_preloaded": "Omitir los  esquemas precargados",
            "force_allow_broken": "Marcar los objetos rotos como allow_broken"
        }
    }
</i18n>

<template>
  <b-container class="mt-5">
    <b-row>
      <b-col cols="12" md="6">
        <h4>{{ $t('save_schema') }}</h4>

        <b-form-group
          id="schema-name-group"
          :label="$t('schema_name').toString()"
          label-for="schema-name"
        >
          <b-input id="schema-name" v-model="schema" />
        </b-form-group>

        <b-form-checkbox
          id="skip-preloaded"
          v-model="skipPreloaded"
          name="skip-preloaded"
        >
          {{ $t('skip_preloaded') }}
        </b-form-checkbox>

        <div class="d-flex flex-row-reverse mb-3">
          <b-button variant="success" @click="saveSchema">
            {{ $t('save') }}
          </b-button>
        </div>
      </b-col>

      <b-col cols="12" md="6">
        <h4>{{ $t('restore_schema') }}</h4>

        <b-form-group :label="$t('from_file').toString()">
          <b-form-file v-model="fileForRestore" />
        </b-form-group>

        <b-form-checkbox
          id="drop-others"
          v-model="dropOthers"
          name="drop-others"
        >
          {{ $t('drop_others') }}
        </b-form-checkbox>

        <b-form-checkbox
          id="force-allow-broken"
          v-model="forceAllowBroken"
          name="force-allow-broken"
        >
          {{ $t('force_allow_broken') }}
        </b-form-checkbox>

        <div class="d-flex flex-row-reverse mb-3">
          <b-button variant="success" @click="restoreSchemas">
            {{ $t('restore') }}
          </b-button>
        </div>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { Action } from 'vuex-class'
import type { IRestoreSchemasOptions, ISaveSchemasOptions } from '@ozma-io/ozmadb-js/client'
import type { ICallApi } from '@/state/auth'

@Component
export default class SaveRestoreSchema extends Vue {
  @Action('callApi') callApi!: ICallApi

  schema = ''
  fileForRestore: File | null = null
  dropOthers = false
  skipPreloaded = true
  forceAllowBroken = false

  async saveSchema() {
    try {
      const schemas = this.schema === '' ? 'all' : [this.schema]
      const opts: ISaveSchemasOptions = {
        skipPreloaded: this.skipPreloaded,
      }
      const res: Blob = await this.callApi({
        func: (api) => api.saveSchemas(schemas, opts),
      })

      const url = URL.createObjectURL(res)
      try {
        const element = document.createElement('a')
        try {
          element.setAttribute('href', url)
          const name = this.schema === '' ? 'schemas' : this.schema
          element.setAttribute('download', `${name}.zip`)
          element.style.display = 'none'

          document.body.appendChild(element)
          element.click()
        } finally {
          document.body.removeChild(element)
        }
      } finally {
        URL.revokeObjectURL(url)
      }

      this.$bvToast.toast(this.$t('success').toString(), {
        variant: 'success',
        solid: true,
        autoHideDelay: 2500,
      })
    } catch (e) {
      this.$bvToast.toast(String(e), {
        title: this.$t('error').toString(),
        variant: 'danger',
        solid: true,
        autoHideDelay: 10000,
      })
      throw e
    }
  }

  async restoreSchemas() {
    if (!this.fileForRestore) return

    const opts: IRestoreSchemasOptions = {
      dropOthers: this.dropOthers,
      forceAllowBroken: this.forceAllowBroken,
    }
    try {
      await this.callApi({
        func: (api) => api.restoreSchemas(this.fileForRestore!, opts),
      })

      this.$bvToast.toast(this.$t('success').toString(), {
        variant: 'success',
        solid: true,
        autoHideDelay: 2500,
      })
    } catch (e) {
      this.$bvToast.toast(String(e), {
        title: this.$t('error').toString(),
        variant: 'danger',
        solid: true,
        autoHideDelay: 10000,
      })
      throw e
    }
  }
}
</script>

<style lang="scss" scoped>
@include variant-to-local('cell');
</style>
