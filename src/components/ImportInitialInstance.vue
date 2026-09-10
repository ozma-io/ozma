<i18n>
    {
        "en": {
            "import_message": "Hi, this database doesn't have a main view yet. Do you want to import our admin panel?",
            "import_button": "Import"
        },
        "ru": {
            "import_message": "Привет, у этой базы ещё нет главного отображения. Хотите импортировать нашу панель администрирования?",
            "import_button": "Импортировать"
        }
    }
</i18n>

<template>
  <b-container v-if="!inProgress">
    <b-row class="mt-3 mb-3">
      <b-col>
        <h5>{{ $t('import_message') }}</h5>
      </b-col>
    </b-row>
    <b-row>
      <b-col>
        <b-button @click="importInitialInstance">{{
          $t('import_button')
        }}</b-button>
      </b-col>
    </b-row>
  </b-container>

  <LoadingIndicator v-else wide />
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { Action, namespace } from 'vuex-class'
import type FunDBAPI from '@ozma-io/ozmadb-js/client'
import type { IViewExprResult } from '@ozma-io/ozmadb-js/client'

import type { ICallApi } from '@/state/auth'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
import { ErrorKey } from '@/state/errors'
import {
  snapshotColorThemes,
  reinjectMissingColorThemes,
} from '@/utils_colors'

const errors = namespace('errors')

const initialInstance = 'https://x-admin.api.ozma.org'

@Component({ components: { LoadingIndicator } })
export default class ImportInitialInstance extends Vue {
  @Action('callApi') callApi!: ICallApi
  @Action('reload') reload!: () => Promise<void>
  @errors.Mutation('pushError') pushError!: ({
    key,
    error,
  }: {
    key: ErrorKey
    error: string
  }) => void

  inProgress = false

  async importInitialInstance() {
    this.inProgress = true
    try {
      // First, fetch a dump of the initial instance.
      const dumpResponse = await fetch(
        `${initialInstance}/layouts?skip_preloaded=true`,
      )
      if (dumpResponse.status !== 200) {
        throw new Error(
          `Failed to fetch initial instance dump: ${dumpResponse.statusText}`,
        )
      }
      const dump = await dumpResponse.blob()

      // Restoring the dump recreates the funapp schema and drops its color
      // themes — snapshot them first, then re-inject whatever the dump didn't
      // bring back so seeded themes (e.g. the glass ones) survive the import.
      const themesSnapshot = await snapshotColorThemes()

      await this.callApi({
        func: (api) => api.restoreSchemas(dump),
      })

      await reinjectMissingColorThemes(themesSnapshot)

      // The restore wipes the global font-size setting; set the project
      // default (14px) so a freshly-imported instance isn't 16px.
      await this.ensureDefaultFontSize()

      await this.reload()
      // Now, upload it to our instance.
    } catch (e) {
      this.pushError({ key: 'import_initial_instance', error: String(e) })
    } finally {
      this.inProgress = false
    }
  }

  // Force the project's default global font size (14px) into funapp.settings.
  // Best-effort: a failure just leaves the frontend fallback in place.
  private async ensureDefaultFontSize() {
    const entity = { schema: 'funapp', name: 'settings' }
    try {
      const res = (await this.callApi({
        func: (api: FunDBAPI) =>
          api.getAnonymousUserView(
            "SELECT id FROM funapp.settings WHERE name = 'font_size'",
          ),
      })) as IViewExprResult
      const idCol = res.info.columns.findIndex((c) => c.name === 'id')
      const row = res.result.rows[0]
      if (row) {
        const id = row.values[idCol].value as number
        await this.callApi({
          func: (api: FunDBAPI) =>
            api.runTransaction({
              operations: [{ type: 'update', entity, id, fields: { value: '14' } }],
            }),
        })
      } else {
        await this.callApi({
          func: (api: FunDBAPI) =>
            api.runTransaction({
              operations: [
                { type: 'insert', entity, fields: { name: 'font_size', value: '14' } },
              ],
            }),
        })
      }
    } catch {
      // Ignore — non-critical.
    }
  }
}
</script>
