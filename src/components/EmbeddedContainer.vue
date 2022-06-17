<template>
  <iframe
    ref="iframe"
    class="iframe"
    sandbox="allow-scripts"
    allowfullscreen
    :srcdoc="srcdoc"
    :src="src"
  />
</template>

<script lang="ts">
import { Vue, Prop, Watch, Component } from "vue-property-decorator";

import { Embedded } from "ozma-api";
import { CommonError } from "ozma-api/dist/embedded/types";

type SupportedVecrsion = 0 | 1;

type Handlers<Requests extends { type: string }> = {
  [Data in Requests as Data["type"]]: (request: Data) => { result: unknown } | { error: unknown; message: string };
};

type API1ClientRequestData = Embedded.IChangeHeightRequestData | Embedded.IUpdateValueRequestData;

@Component
export default class EmbeddedContainer extends Vue {
  @Prop({ type: String }) src!: string | undefined;
  @Prop({ type: String }) srcdoc!: string | undefined;
  @Prop({ type: Boolean, default: false }) isControl!: boolean;
  @Prop({ required: true }) value!: unknown;

  private apiVersion: SupportedVecrsion | null = null;

  private iframeEventHandler(event: MessageEvent<unknown>) {
    if (event.source !== (this.$refs.iframe as HTMLIFrameElement | undefined)?.contentWindow) return;
    const msg = event.data;

    if (typeof msg === "object" && msg !== null) {
      // Check for (re-)initialization.
      if ((msg as any).name === "ready") {
        this.initialize(0);
        return;
      } else if ((msg as Embedded.AnyClientMessage).type === "request") {
        const reqMsg = msg as Embedded.IRequest<Embedded.IReadyRequestData>;
        if (typeof reqMsg.request === "object" && reqMsg.request?.type === "ready") {
          if (reqMsg.request.version === 1) {
            this.initialize(1);
            const response: Embedded.IResponseSuccess<undefined> = {
              type: "response",
              id: reqMsg.id,
              status: "ok",
              result: undefined,
            };
            this.sendMessage(response);
          } else {
            this.apiVersion = null;
            const response: Embedded.IResponseError<CommonError> = {
              type: "response",
              id: reqMsg.id,
              status: "error",
              error: "badRequest",
              message: "Unsupported API version",
            };
            this.sendMessage(response);
          }
          return;
        }
      }

      if (this.apiVersion === 0) {
        const legacyMsg = msg as Record<string, unknown>;
        if (legacyMsg.name === "changeHeight" && typeof legacyMsg.payload === "number" && legacyMsg.payload >= 0) {
          this.$emit("update:height", legacyMsg.payload);
          return;
        }
      } else if (this.apiVersion === 1) {
        const clientMsg = msg as Embedded.AnyClientMessage;
        if (clientMsg.type === "request") {
          const reqMsg = msg as Embedded.IRequest<API1ClientRequestData>;
          this.processRequest(reqMsg, {
            changeHeight: (request: Embedded.IChangeHeightRequestData) => {
              if (typeof request.height === "number" && request.height >= 0) {
                this.$emit("update:height", request.height);
                return { result: undefined };
              } else {
                return { error: "badRequest", message: "Invalid height" };
              }
            },
            updateValue: (request: Embedded.IUpdateValueRequestData) => {
              if (!this.isControl) {
                return { error: "unknownRequest", message: "Embedded container is not a control" };
              } else if (request.rawValue !== undefined) {
                this.$emit("update:value", request.rawValue);
                return { result: undefined };
              } else {
                return { error: "badRequest", message: "Invalid value" };
              }
            },
          });
          return;
        }
      } else {
        throw new Error("Impossible");
      }
    }

    console.error("Invalid message received from embedded container", msg);
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

  private sendMessage(message: unknown) {
    const ref = this.$refs.iframe as HTMLIFrameElement | undefined;
    ref?.contentWindow?.postMessage(message, "*");
  }

  private sendUpdateValue() {
    if (this.apiVersion === 0) {
      this.sendMessage({
        name: "updateValue",
        payload: this.value,
      });
    } else if (this.apiVersion === 1) {
      const msg: Embedded.IUpdateValuePush = {
        type: "updateValue",
        update: {
          value: this.value,
        },
      };
      this.sendMessage(msg);
    } else {
      throw new Error("Impossible");
    }
  }

  private initialize(version :SupportedVecrsion) {
    this.apiVersion = version;
    if (this.isControl) {
      this.sendUpdateValue();
    }
  }

  private processRequest<R extends { type: string }>(msg: Embedded.IRequest<R>, handlers: Handlers<R>) {
    const request = msg.request;
    if (typeof request === "object" && request !== null && request.type in handlers) {
      try {
        const result = handlers[request.type as R["type"]](request as any);
        if ("result" in result) {
          const response: Embedded.IResponseSuccess<typeof result> = {
            type: "response",
            id: msg.id,
            status: "ok",
            result,
          };
          this.sendMessage(response);
        } else {
          const response: Embedded.IResponseError<unknown> = {
            type: "response",
            id: msg.id,
            status: "error",
            error: result.error,
            message: result.message,
          };
          this.sendMessage(response);
          console.error(`Request from embedded container failed, id "${msg.id}", type "${request.type}": ${result.message}`);
        }
      } catch (e) {
        const response: Embedded.IResponseError<CommonError> = {
          type: "response",
          id: msg.id,
          status: "error",
          error: "internal",
          message: "Internal error",
        };
        this.sendMessage(response);
        console.error(`Request from embedded container failed, id "${msg.id}", type "${request.type}":`, e);
      }
    } else {
      const response: Embedded.IResponseError<CommonError> = {
        type: "response",
        id: msg.id,
        status: "error",
        error: "unknownRequest",
        message: `Unknown request: ${request.type}`,
      };
      this.sendMessage(response);
      console.error(`Unknown request type received from embedded container, id "${msg.id}", type "${request.type}"`);
    }
  }

  @Watch("value")
  private sendValue() {
    if (this.apiVersion !== null) {
      this.sendUpdateValue();
    }
  }
}
</script>

<style lang="scss" scoped>
  .iframe {
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    border: none;
  }
</style>
