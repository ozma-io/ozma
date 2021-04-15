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
    <iframe
      ref="iframe"
      class="iframe"
      sandbox="allow-scripts allow-top-navigation"
      :srcdoc="markup !== null ? markup : srcdoc"
      :src="src"
    />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { Action } from "vuex-class";
import { IViewExprResult } from "ozma-api";

import Api from "@/api";
import Errorbox from "@/components/Errorbox.vue";

export type MessageFromIframe =
  | {
    name: "ready";
  }
  | {
    name: "changeHeight";
    payload: number;
  };

export type MessageToIframe =
  | {
    name: "updateValue";
    payload: any;
  };

@Component({ components: { Errorbox } })
export default class IframeControl extends Vue {
  @Prop({ type: String, default: null }) src!: string | null;
  @Prop({ type: String, default: null }) srcdoc!: string | null;
  @Prop({ type: String, default: null }) markupName!: string | null;
  @Prop({ required: true }) value!: unknown;
  @Prop({ type: Number }) height!: number;

  @Action("callProtectedApi") callProtectedApi!: (_: { func: ((_1: string, ..._2: any[]) => Promise<any>); args?: any[] }) => Promise<any>;

  private requestedHeight: number | null = null;
  private markup: string | null | undefined = null; // `undefined` here means that markup is not found.

  @Watch("markupName", { immediate: true })
  private async loadMarkup() {
    if (this.markupName === null) return;

    const query = `SELECT markup FROM "funapp"."iframe_markups" WHERE name = '${this.markupName}'`;
    const res = await this.callProtectedApi({
      func: Api.getAnonymousUserView.bind(Api),
      args: [query],
    }) as IViewExprResult;
    this.markup = res.result.rows[0]?.values[0].value as string | undefined;
  }

  @Watch("src")
  @Watch("srcdoc")
  private watchValue(newValue: string | null, oldValue: string | null) {
    if (newValue !== oldValue && newValue !== null) {
      this.markup = null;
    }
  }

  private iframeEventHandler(event: MessageEvent<any>) {
    if (event.source !== (this.$refs.iframe as HTMLIFrameElement)?.contentWindow) return;

    if (event.data.name === "ready") {
      this.sendValue();
    }

    if (event.data.name === "changeHeight" && typeof event.data?.payload === "number") {
      /* TODO FIXME: When height is set as iframe's `document.body.clientHeight`,
         there are overflow and scrollbar in Firefox but not in Chrome or Safari. */
      this.requestedHeight = event.data.payload;
    }
  }

  private created() {
    /* eslint-disable @typescript-eslint/unbound-method */
    window.addEventListener("message", this.iframeEventHandler);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private destroyed() {
    /* eslint-disable @typescript-eslint/unbound-method */
    window.removeEventListener("message", this.iframeEventHandler);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private sendMessage(message: MessageToIframe) {
    const ref = this.$refs.iframe as HTMLIFrameElement;
    ref?.contentWindow?.postMessage(message, "*");
  }

  @Watch("value")
  private sendValue() {
    this.sendMessage({ name: "updateValue", payload: this.value });
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
