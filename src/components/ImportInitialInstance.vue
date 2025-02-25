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

import type { ICallApi } from '@/state/auth'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
import { ErrorKey } from '@/state/errors'

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

      await this.callApi({
        func: (api) => api.restoreSchemas(dump),
      })
      await this.reload()
      // Now, upload it to our instance.
    } catch (e) {
      this.pushError({ key: 'import_initial_instance', error: String(e) })
    } finally {
      this.inProgress = false
    }
  }
}
</script>
