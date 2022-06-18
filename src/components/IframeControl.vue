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
    }
  }
</i18n>

<template>
  <Errorbox
    v-if="markup === undefined"
    :message="$t('markup_not_found')"
  />
  <div
    v-else
    class="iframe-container"
    :style="style"
  >
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
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { Action } from "vuex-class";
import { IViewExprResult } from "ozma-api";

import Api, { IIframeRef } from "@/api";
import Errorbox from "@/components/Errorbox.vue";
import EmbeddedContainer from "./EmbeddedContainer.vue";

@Component({ components: { Errorbox, EmbeddedContainer } })
export default class IframeControl extends Vue {
  @Prop({ type: String }) src!: string | undefined;
  @Prop({ type: String }) srcdoc!: string | undefined;
  @Prop({ type: Object }) iframeRef!: IIframeRef | undefined;
  @Prop({ required: true }) value!: unknown;
  @Prop({ type: Number }) height!: number;

  @Action("callProtectedApi") callProtectedApi!: (_: { func: ((_1: string, ..._2: any[]) => Promise<any>); args?: any[] }) => Promise<any>;

  private requestedHeight: number | null = null;
  private markup: string | null | undefined = null; // `undefined` here means that markup is not found.

  @Watch("iframeRef", { immediate: true })
  private async loadMarkup() {
    if (this.iframeRef === undefined) return;
    this.requestedHeight = null;

    const uvRef = { schema: "funapp", name: "iframe_markup_by_name" };
    const res = await this.callProtectedApi({
      func: Api.getNamedUserView.bind(Api),
      args: [uvRef, this.iframeRef],
    }) as IViewExprResult;
    this.markup = res.result.rows[0]?.values[0].value as string | undefined;
  }

  private updateHeight(newHeight: number) {
    this.requestedHeight = newHeight;
  }

  @Watch("src")
  @Watch("srcdoc")
  private watchValue() {
    this.markup = null;
    this.requestedHeight = null;
  }

  private get style() {
    if (this.height || this.requestedHeight) {
      return {
        height: `${this.requestedHeight ?? this.height}px`,
      };
    }
    return null;
  }
}
</script>

<style lang="scss" scoped>
  .iframe-container {
    border: 1px solid var(--MainBorderColor);
    border-radius: 0.2rem;
    overflow: hidden;
  }

  .iframe {
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    border: none;
  }
</style>
