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
        "error_stream_not_suppotred": "ERROR: Stream API is not supported in this browser",
        "error_qrcode_is_inappropriate" : "ERROR: QRCode is inappropriate"
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
        "error_stream_not_suppotred": "ОШИБКА: Stream API не поддерживается в этом браузере",
        "error_qrcode_is_inappropriate" : "ОШИБКА: QRCode не соответствует назначению"
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
          :key="value.id"
        >
          {{ value.value }}
        </li>
      </ol>
      <b-button
        v-if="multiScan && error.length === 0"
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
import { QrcodeStream } from "vue-qrcode-reader";
import { mixins } from "vue-class-component";
import BaseEntriesView from "@/components/BaseEntriesView";
import { IEntriesRef } from "@/state/user_view";
import type { Link } from "@/links";
import { linkHandler, attrToLinkRef } from "@/links";
import { saveAndRunAction } from "@/state/actions";
import { IQuery } from "@/state/query";
import { namespace } from "vuex-class";
import { IPrintQRCode } from "@/components/qrcode/QRCode.vue";

const beep = require("@/resources/beep.mp3");

export interface IQRContent {
  schema: string;
  name: string;
  id: number;
}

export interface IQRResultContent extends IQRContent {
  value: string;
}

const query = namespace("query");

@Component({
  components: {
    QrcodeStream,
  },
})
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
  audio = new Audio(beep);

  @Watch("openScanner")
  private toggleOpenScanner() {
    this.modalShow = !this.modalShow;
    this.currentContent = null;
    this.result = [];
    this.entry = null;
    this.entries = {};
    this.error = "";
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
    await this.audio.play();

    try {
      window.navigator.vibrate([100, 30, 200]);
    } catch (e) {
      console.error(e);
    }

    if (!this.multiScan) {
      this.$emit("update:scanResult", content);
      this.turnCameraOff();

      this.toggleOpenScanner();

      await this.timeout(1);
      this.turnCameraOn();
    } else {
      this.error = "";

      let parsedContent: IPrintQRCode | null = null;

      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        this.error = this.$t("incorrect_format").toString() + " QR code: " + content;
        return;
      }
      if (parsedContent !== null) {
        this.currentContent = { schema: parsedContent.s, name: parsedContent.n, id: Number(parsedContent.i) };
      }
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
    if (this.currentContent !== null) {
      if (this.entry !== null) {
        if (this.link) {
          let ref = null;

          if ("query" in this.link && this.link.query.args.args) {
            ref = "ref" in this.link.query.args.source ? this.link.query.args.source.ref : null;
            this.link.query.args.args.id = this.currentContent.id;
          }

          if ("action" in this.link) {
            ref = this.link.action;
            this.link.args.id = this.currentContent.id;
          }

          if (ref === null || ref.name !== this.currentContent.name || ref.schema !== this.currentContent.schema) {
            this.error = this.$t("error_qrcode_is_inappropriate").toString();
            return;
          }

          const emit = (_: string, gotoquery: IQuery) => {
            void this.pushRoot(gotoquery);
          };

          const { handler, href } = linkHandler(this.$store, emit, this.link);
          if (handler) {
            handler();
          }

          this.modalShow = false;
        }

        const rusultContent = { ...this.currentContent, value: this.entries[Number(this.currentContent.id)] };
        this.result.push(rusultContent);
      } else {
        this.entry = { entity: { name: this.currentContent.name, schema: this.currentContent.schema } };
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
