<i18n>
  {
    "en": {
      "view_error": "There are following errors in user view",
      "markup_not_found": "Markup not found",
      "no_code_name": "`iframe_name` attribute required"
    },
    "ru": {
      "view_error": "В отображении следующие ошибки",
      "markup_not_found": "Разметка не найдена",
      "no_code_name": "Необходимо указать атрибут `iframe_name`"
    },
    "es": {
      "view_error": "Hay los siguientes errores en la vista de usuario",
      "markup_not_found": "La marca no está encontrada",
      "no_code_name": "El atributo `iframe_name` está requerido"
    }
  }
</i18n>

<template>
  <Errorbox v-if="markup === undefined" :message="$t('markup_not_found')" />
  <div v-else class="iframe-container" :style="style">
    <EmbeddedContainer
      :srcdoc="iframeRef ? markup : srcdoc"
      :src="src"
      :value="value"
      is-control
      @goto="$emit('goto', $event)"
      @update:height="updateHeight"
      @update:value="$emit('update:value', $event)"
    />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { Action } from 'vuex-class'
import { IViewExprResult } from 'ozma-api'

import { IIframeRef } from '@/api'
import Errorbox from '@/components/Errorbox.vue'
import EmbeddedContainer from './EmbeddedContainer.vue'
import type { ICallApi } from '@/state/auth'

@Component({ components: { Errorbox, EmbeddedContainer } })
export default class IframeControl extends Vue {
  @Prop({ type: String }) src!: string | undefined
  @Prop({ type: String }) srcdoc!: string | undefined
  @Prop({ type: Object }) iframeRef!: IIframeRef | undefined
  @Prop({ required: true }) value!: unknown
  @Prop({ type: Number }) height!: number

  @Action('callApi') callApi!: ICallApi

  private requestedHeight: number | null = null
  markup: string | null | undefined = null // `undefined` here means that markup is not found.

  @Watch('iframeRef', { immediate: true })
  private async loadMarkup() {
    if (this.iframeRef === undefined) return
    this.requestedHeight = null

    const uvRef = { schema: 'funapp', name: 'iframe_markup_by_name' }
    const res = (await this.callApi({
      func: (api) =>
        api.getNamedUserView(
          uvRef,
          this.iframeRef as Record<string, unknown> | undefined,
        ),
    })) as IViewExprResult
    this.markup = res.result.rows[0]?.values[0].value as string | undefined
  }

  updateHeight(newHeight: number) {
    this.requestedHeight = newHeight
  }

  @Watch('src')
  @Watch('srcdoc')
  private watchValue() {
    this.markup = null
    this.requestedHeight = null
  }

  get style() {
    if (this.height || this.requestedHeight) {
      return {
        height: `${this.requestedHeight ?? this.height}px`,
      }
    }
    return undefined
  }
}
</script>

<style lang="scss" scoped>
.iframe-container {
  border-radius: 0.5rem;
  overflow: hidden;
}

.iframe {
  margin: 0;
  border: none;
  padding: 0;
  width: 100%;
  height: 100%;
}
</style>
