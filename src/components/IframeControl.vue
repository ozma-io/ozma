<i18n>
  {
    "en": {
      "view_error": "There are following errors in user view",
      "no_code_name": "`iframe_name` attribute required"
    },
    "ru": {
      "view_error": "В отображении следующие ошибки",
      "no_code_name": "Необходимо указать атрибут `iframe_name`"
    }
  }
</i18n>

<template>
  <div class="iframe-container">
    <iframe
      ref="iframe"
      class="iframe"
      :style="style"
      sandbox="allow-scripts allow-top-navigation"
      :srcdoc="srcdoc"
      :src="src"
    />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";

export type MessageFromIframe =
  | {
    name: "ready";
  }
  | {
    name: "resizeHeight";
    payload: number;
  };

export type MessageToIframe =
  | {
    name: "updateValue";
    payload: any;
  };

@Component
export default class IframeControl extends Vue {
  @Prop({ type: String, default: null }) src!: string | null;
  @Prop({ type: String, default: null }) srcdoc!: string | null;
  @Prop({ required: true }) value!: unknown;
  @Prop({ type: Number }) height!: number;

  private requestedHeight: number | null = null;

  private mounted() {
    window.addEventListener("message", event => {
      if (event.source !== (this.$refs.iframe as HTMLIFrameElement)?.contentWindow) return;

      if (event.data.name === "ready") {
        this.sendValue();
      }

      if (event.data.name === "resizeHeight" && typeof event.data?.payload === "number") {
        this.requestedHeight = event.data.payload;
      }

    })
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
    border: none;
  }
</style>
