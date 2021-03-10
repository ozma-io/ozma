<i18n>
  {
    "en": {
        "qrcode_scanner": "Code scanner",
        "scan_result": "Scan result",
        "clear": "Clear",
        "paste_data": "Paste data",
        "error_qrcode_is_inappropriate" : "ERROR: QRCode is inappropriate",
        "no_record_found":"No record found with this id",
        "unknown_code": "Unknown code",
        "error": "Error",
        "entity_not_initialized": "Entity not initialized"
    },
    "ru": {
        "qrcode_scanner": "Code сканер",
        "scan_result": "Результат сканирования",
        "clear": "Очистить",
        "paste_data": "Вставить данные",
        "error_qrcode_is_inappropriate" : "ОШИБКА: QRCode не соответствует назначению",
        "no_record_found":"Не найдена запись с данным id",
        "unknown_code": "Неизвестный код",
        "error": "Ошибка",
        "entity_not_initialized": "Сущность не задана"
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
    <bar-code
      v-if="textInput"
      @scanned="onDecode"
    />
    <stream-barcode-reader
      v-else
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
import BarCode from "@/components/barcode/BarCode.vue";

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
    BarCode,
  },
})
export default class QRCodeScanner extends mixins(BaseEntriesView) {
  @Prop({ type: Boolean, default: false }) openScanner!: boolean;
  @Prop({ type: Boolean, default: false }) multiScan!: boolean;
  @Prop({ type: Boolean, default: false }) textInput!: boolean;
  @Prop({ type: Object, default: null }) link!: Link;
  @Prop({ type: Object, default: undefined }) entity!: IEntriesRef | undefined;

  @query.Action("pushRoot") pushRoot!: (_: IQuery) => Promise<void>;

  modalShow = false;
  result: Array<IQRResultContent> = [];
  audio = new Audio(beep);

  @Watch("openScanner")
  private toggleOpenScanner() {
    this.modalShow = !this.modalShow;
    this.result = [];
  }

  private async onDecode(content: string) {
    await this.audio.play();

    const parsedContent = parseQRCode(content);
    let currentContent = null;

    if (parsedContent) {
      currentContent = parsedContent;
    } else if (!isNaN(Number(content))) {
      if (this.entity === undefined) {
        this.makeToast(this.$t("entity_not_initialized").toString());
        return;
      }
      currentContent = {
        entity: this.entity.entity,
        id: Number(content),
      };
    } else {
      this.makeToast(this.$t("unknown_code").toString());
      return;
    }

    if (this.link) {
      this.dispatching(currentContent);
      return;
    }

    let entry;

    try {
      if (this.entity === undefined) {
        this.makeToast(this.$t("entity_not_initialized").toString());
        return;
      }
      const entries = await this.fetchEntriesByIds(this.entity, [currentContent.id]);
      entry = entries[currentContent.id];
    } catch (e) {
      this.makeToast(this.$t("unknown_code").toString());
      return;
    }

    if (entry === undefined) {
      this.makeToast(this.$t("no_record_found").toString());
      return;
    }

    if (!equalEntityRef(currentContent.entity, this.entity.entity)) {
      this.makeToast(this.$t("error_qrcode_is_inappropriate").toString());
      return;
    }

    if (this.multiScan) {
      const rusultContent = { ...currentContent, value: entry };
      this.result.push(rusultContent);
    } else {
      this.$emit("select", currentContent);
      this.toggleOpenScanner();
    }
  }

  private sendList() {
    this.$emit("select", this.result);
    this.toggleOpenScanner();
  }

  private dispatching(currentContent: IQRCode) {
    let link: Link | null = null;

    if ("links" in this.link) {
      link = this.link.links[currentContent.entity.schema][currentContent.entity.name];
    }

    if (!link) {
      this.makeToast(this.$t("error_qrcode_is_inappropriate").toString());
      return;
    }

    if ("query" in link && link.query.args.args) {
      link.query.args.args.id = currentContent.id;
    }

    if ("action" in link) {
      link.args.id = currentContent.id;
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

    this.toggleOpenScanner();
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
  .decode-result {
    word-wrap: break-word;
    margin-top: 10px;
  }
</style>
