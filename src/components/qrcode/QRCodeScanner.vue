<i18n>
  {
    "en": {
        "input_placeholder": "Empty",
        "qrcode_scanner": "QR Code scanner",
        "new_scan": "Connecting to camera...",
        "scan_result": "Scan result",
        "clear": "Clear",
        "paste_data": "Paste data",
        "incorrect_format": "ERROR: Incorrect format.",
        "error_access_camera": "ERROR: you need to grant camera access permisson",
        "error_no_camera": "ERROR: no camera on this device",
        "error_secure_context": "ERROR: secure context required (HTTPS, localhost)",
        "error_camera_used": "ERROR: is the camera already in use?",
        "error_camera_not_suitable": "ERROR: installed cameras are not suitable",
        "error_stream_not_suppotred": "ERROR: Stream API is not supported in this browser"
    },
    "ru": {
        "input_placeholder": "Пусто",
        "qrcode_scanner": "QR Code сканер",
        "new_scan": "Подключение к камере...",
        "scan_result": "Результат сканирования",
        "clear": "Очистить",
        "paste_data": "Вставить данные",
        "incorrect_format": "ОШИБКА: Неправильный формат.",
        "error_access_camera": "ОШИБКА: вам необходимо предоставить разрешение на доступ к камере",
        "error_no_camera": "ОШИБКА: нет камеры на этом устройстве",
        "error_secure_context": "ОШИБКА: требуется безопасный контекст (HTTPS, localhost)",
        "error_camera_used": "ОШИБКА: камера уже используется?",
        "error_camera_not_suitable": "ОШИБКА: установленные камеры не подходят",
        "error_stream_not_suppotred": "ОШИБКА: Stream API не поддерживается в этом браузере"
    }
  }
</i18n>
<template>
  <b-modal
    id="qrcode-scanner-modal"
    v-model="modalShow"
    hide-footer
    :title="$t('qrcode_scanner')"
  >
    <qrcode-stream
      :camera="camera"
      @decode="onDecode"
      @init="onInit"
    >
      <div v-if="loading" class="loading-indicator">
        {{ $t('new_scan') }}
      </div>

      <div v-if="error" class="error">
        {{ error }}
      </div>
    </qrcode-stream>
    <div v-if="result.length > 0" class="decode-result">
      <strong>{{ $t('scan_result') }}:</strong>
      <ol>
        <li
          v-for="value in result"
          :key="value.i"
        >
          {{ value.v }}
        </li>
      </ol>
      <b-button
        v-if="multiScan"
        block
        variant="success"
        @click="sendList"
      >
        {{ $t('paste_data') }}
      </b-button>
    </div>
  </b-modal>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import BaseEntriesView from "@/components/BaseEntriesView";
import { IEntriesRef } from "@/state/user_view";
import { Link, linkHandler, attrToLinkRef } from "@/links";
import { saveAndRunAction } from "@/state/actions";
import { IQuery } from "@/state/query";
import { namespace } from "vuex-class";

export interface IQRContent {
  s: string; // Schema
  n: string; // Name
  i: number; // ID
}

export interface IQRResultContent extends IQRContent {
  v: string; // Value
}

const query = namespace("query");

@Component
export default class QRCodeScanner extends mixins(BaseEntriesView) {
  @Prop({ type: Boolean, default: false }) openScanner!: boolean;
  @Prop({ type: Boolean, default: false }) multiScan!: boolean;
  @Prop({ type: Object, default: null }) link!: Link;
  @query.Action("pushRoot") pushRoot!: (_: IQuery) => Promise<void>;

  modalShow = false;
  camera ="auto";
  result: Array<IQRResultContent> = [];
  error = "";
  loading = false;
  entry: IEntriesRef | null = null;
  entries: Record<string, string> = {};
  currentContent: IQRContent | null = null;

  @Watch("openScanner")
  private toggleOpenScanner() {
    this.modalShow = !this.modalShow;
    // this.currentContent = JSON.parse('{"n":"Ingredients","s":"user","i":407}');
    this.currentContent = null;
    this.result = [];
    this.entry = null;
    this.entries = {};
  }

  async onInit(promise: any) {
    this.loading = true;
    try {
      await promise;
    } catch (error) {
      this.error = error.name;
      if (error.name === "NotAllowedError") {
        this.error = this.$t("error_access_camera").toString();
      } else if (error.name === "NotFoundError") {
        this.error = this.$t("error_no_camera").toString();
      } else if (error.name === "NotSupportedError") {
        this.error = this.$t("error_secure_context").toString();
      } else if (error.name === "NotReadableError") {
        this.error = this.$t("error_camera_used").toString();
      } else if (error.name === "OverconstrainedError") {
        this.error = this.$t("error_camera_not_suitable").toString();
      } else if (error.name === "StreamApiNotSupportedError") {
        this.error = this.$t("error_stream_not_suppotred").toString();
      }
    } finally {
      this.loading = false;
    }
  }

  private async onDecode(content: string) {
    if (!this.multiScan) {
      this.$emit("update:scanResult", content);
      this.turnCameraOff();

      this.toggleOpenScanner();

      await this.timeout(1);
      this.turnCameraOn();
    } else {
      this.error = "";

      let parsedContent: IQRContent | null = null;

      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        this.error = this.$t("incorrect_format").toString() + " QR code: " + content;
        return;
      }
      if (parsedContent !== null) {
        this.currentContent = parsedContent;
      }
    }

    try {
      window.navigator.vibrate([100, 30, 200]);
    } catch (e) {
      console.error(e);
    }
  }

  private turnCameraOn() {
    this.camera = "auto";
  }

  private turnCameraOff() {
    this.camera = "off";
  }

  private timeout(ms: number) {
    return new Promise(resolve => {
      window.setTimeout(resolve, ms);
    });
  }

  private sendList() {
    this.$bvModal.hide("qrcode-scanner-modal");
    this.$emit("select", this.result);
    this.result = [];
  }

  get entriesEntity() {
    return this.entry;
  }

  @Watch("currentContent", { deep: true, immediate: true })
  private changeCurrentContent() {
    if (this.currentContent !== null && this.currentContent.n !== undefined && this.currentContent.s !== undefined && this.currentContent.i !== undefined) {
      if (this.entry !== null) {
        const rusultContent = { ...this.currentContent, v: this.entries[Number(this.currentContent.i)] };
        this.result.push(rusultContent);

        if (this.link) {
          if ("query" in this.link && this.link.query.args.args) {
            this.link.query.args.args.id = this.currentContent.i;
          }

          if ("action" in this.link) {
            this.link.args.id = this.currentContent.i;
          }

          const emit = (_: string, gotoquery: IQuery) => {
            this.pushRoot(gotoquery);
          };

          const { handler, href } = linkHandler(this.$store, emit, this.link);
          if (handler) {
            handler();
          }

          this.modalShow = false;
        }
      } else {
        this.entry = { entity: { name: this.currentContent.n, schema: this.currentContent.s } };
      }
    }
  }

  @Watch("currentEntries")
  private changeCurrentEntries() {
    if (this.currentEntries !== null) {
      Object.entries(this.currentEntries).forEach(([id, name]) => {
        this.entries[id] = name;
      });
    }
    this.changeCurrentContent();
  }
}
</script>

<style scoped>
  .error {
    font-weight: bold;
    color: red;
    background-color: white;
    border-bottom: 2px solid red;
  }

  .loading-indicator {
    height: 100%;
    padding-top: 25%;
    border: 1px solid #dee2e6;
    font-size: 1.3rem;
    font-weight: bold;
    text-align: center;
    background-color: white;
  }

  .decode-result {
    word-wrap: break-word;
  }
</style>
