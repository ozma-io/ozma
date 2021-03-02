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
        "error_qrcode_is_inappropriate" : "ERROR: QRCode is inappropriate",
        "no_record_found":"No record found with this id",
        "unknown_code": "Неизвестный код",
        "error": "Error"
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
        "error_qrcode_is_inappropriate" : "ОШИБКА: QRCode не соответствует назначению",
        "no_record_found":"Не найдена запись с данным id",
        "unknown_code": "Неизвестный код",
        "error": "Ошибка"
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
    <stream-barcode-reader
      @decode="onDecode"
    />

    <div v-if="result.length > 0" class="decode-result">
      <b-button
        block
        variant="success"
        @click="sendList"
      >
        {{ $t('paste_data') }}
      </b-button>
      <strong>{{ $t('scan_result') }}:</strong>
      <ol reversed>
        <li
          v-for="(value, i) in result.slice().reverse()"
          :key="i"
        >
          {{ value.value }}
        </li>
      </ol>
    </div>
  </b-modal>
</template>

<script lang="ts">
import { Component, Prop, Watch } from "vue-property-decorator";
import { StreamBarcodeReader } from "vue-barcode-reader";
import { mixins } from "vue-class-component";
import BaseEntriesView from "@/components/BaseEntriesView";
import type { Link } from "@/links";
import { linkHandler, ILinkHandlerParams } from "@/links";
import { IQuery } from "@/state/query";
import { namespace } from "vuex-class";
import { IQRCode, parseQRCode } from "@/components/qrcode/QRCode.vue";
import type { IEntriesRef } from "@/state/entries";
import { equalEntityRef } from "@/values";

const beep = require("@/resources/beep.mp3");

export interface IQRResultContent extends IQRCode {
  value: string;
}

const query = namespace("query");

@Component({
  components: {
    StreamBarcodeReader,
  },
})
export default class QRCodeScanner extends mixins(BaseEntriesView) {
  @Prop({ type: Boolean, default: false }) openScanner!: boolean;
  @Prop({ type: Boolean, default: false }) multiScan!: boolean;
  @Prop({ type: Object, default: null }) link!: Link;
  @Prop({ type: Object }) entity!: IEntriesRef;

  @query.Action("pushRoot") pushRoot!: (_: IQuery) => Promise<void>;

  modalShow = false;
  result: Array<IQRResultContent> = [];
  currentContent: IQRCode | null = null;
  audio = new Audio(beep);
  entries:Record<number, string> = [];

  @Watch("openScanner")
  private toggleOpenScanner() {
    this.modalShow = !this.modalShow;
    this.currentContent = null;
    this.result = [];
    this.entries = [];
  }

  private async onDecode(content: string) {
    await this.audio.play();

    if (this.multiScan) {
      const parsedContent = parseQRCode(content);
      let currentContent = null;

      if (parsedContent) {
        currentContent = parsedContent;
      } else if (!isNaN(Number(content))) {
        currentContent = {
          entity: this.entity.entity,
          id: Number(content),
        };
      } else {
        this.makeToast(this.$t("unknown_code").toString());
        return;
      }

      try {
        this.entries = await this.fetchEntriesByIds(this.entity, [currentContent.id]);
      } catch (e) {
        console.warn(e);
        this.makeToast(this.$t("unknown_code").toString());
        return;
      }

      if (this.entries[currentContent.id] !== undefined) {
        this.currentContent = currentContent;
      } else {
        this.makeToast(this.$t("no_record_found").toString());
      }
    } else {
      this.$emit("update:scanResult", content);
      this.toggleOpenScanner();
    }
  }

  private sendList() {
    this.$bvModal.hide("qrcode-scanner-modal");
    this.$emit("select", this.result);
    this.result = [];
  }

  @Watch("currentContent", { deep: true, immediate: true })
  private changeCurrentContent() {
    if (this.currentContent !== null) {
      // Dispatching
      if (this.link) {
        let link: Link | null = null;

        if ("links" in this.link) {
          link = this.link.links[this.currentContent.entity.schema][this.currentContent.entity.name];
        }

        if (!link) {
          this.makeToast(this.$t("error_qrcode_is_inappropriate").toString());
          return;
        }

        if ("query" in link && link.query.args.args) {
          link.query.args.args.id = this.currentContent.id;
        }

        if ("action" in link) {
          link.args.id = this.currentContent.id;
        }

        const emit = (target: IQuery) => {
          void this.pushRoot(target);
        };

        const openQRCodeScanner = (name:string, qrLink: Link) => {
          this.$root.$emit(name, qrLink);
        };

        const linkHandlerParams: ILinkHandlerParams = {
          store: this.$store,
          goto: emit,
          link,
          openQRCodeScanner,
        };

        const { handler, href } = linkHandler(linkHandlerParams);
        if (handler) {
          void handler();
        }

        this.modalShow = false;
      }

      // MultiInput
      if (this.entity) {
        if (!equalEntityRef(this.currentContent.entity, this.entity.entity)) {
          this.makeToast(this.$t("error_qrcode_is_inappropriate").toString());
          return;
        }

        const entry = this.entries[this.currentContent.id];
        if (entry !== undefined) {
          const rusultContent = { ...this.currentContent, value: entry };
          this.result.push(rusultContent);
        } else {
          this.makeToast(this.$t("no_record_found").toString());
        }
      }
    }
  }

  private makeToast(message: string) {
    this.$bvToast.toast(message, {
      title: this.$t("error").toString(),
      variant: "danger",
      solid: true,
    });
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
