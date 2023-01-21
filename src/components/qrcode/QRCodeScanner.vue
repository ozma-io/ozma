<i18n>
  {
    "en": {
        "scan_result": "Scan result",
        "clear": "Clear",
        "paste_data": "Paste data",
        "qrcode_from_different_entity" : "Error: QR code points to an inappropriate entity",
        "no_record_found":"No record found with this id",
        "unknown_code": "Unknown code",
        "error": "Error",
        "entity_not_initialized": "Entity not initialized"
    },
    "ru": {
        "scan_result": "Результат сканирования",
        "clear": "Очистить",
        "paste_data": "Вставить данные",
        "qrcode_from_different_entity" : "Ошибка: QR-код указывает на неподходящую сущность",
        "no_record_found":"Не найдена запись с данным id",
        "unknown_code": "Неизвестный код",
        "error": "Ошибка",
        "entity_not_initialized": "Сущность не задана"
    },
    "es": {
        "scan_result": "El resultado del escaneo",
        "clear": "Eliminar",
        "paste_data": "Pegar datos",
        "qrcode_from_different_entity" : "Error: el código QR apunta a una entidad inapropiada",
        "no_record_found": "No se encontró ningún registro con este ID",
        "unknown_code": "El código desconocido",
        "error": "El error",
        "entity_not_initialized": "La entidad no está inicializada"
    }
  }
</i18n>
<template>
  <span>
    <BarCode
      v-if="textInput"
      @scanned="onDecode"
    />
    <StreamBarcodeReader
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
  </span>
</template>

<script lang="ts">
import { Component, Prop } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { namespace } from "vuex-class";
import type { IEntity, IEntityRef } from "ozma-api";

import type { Link } from "@/links";
import { linkHandler } from "@/links";
import { inheritedFromEntity } from "@/values";
import { IQuery, QueryKey } from "@/state/query";
import BaseEntriesView from "@/components/BaseEntriesView";
import { IQRCode, parseQRCode } from "@/components/qrcode/QRCode.vue";
import { EntriesRef } from "@/state/entries";

const beepSrc = require("@/resources/beep.mp3") as string;

export interface IQRResultContent extends IQRCode {
  value: string;
}

const query = namespace("query");
const entities = namespace("entities");

@Component({
  components: {
    StreamBarcodeReader: async () => (await import("vue-barcode-reader")).StreamBarcodeReader,
    BarCode: () => import("@/components/barcode/BarCode.vue"),
  },
})
export default class QRCodeScanner extends mixins(BaseEntriesView) {
  @query.Action("push") push!: (_: { key?: QueryKey; query: IQuery; replace?: boolean }) => Promise<void>;
  @entities.Action("getEntity") getEntity!: (ref: IEntityRef) => Promise<IEntity>;

  @Prop({ type: Boolean, default: false }) multiScan!: boolean;
  @Prop({ type: Boolean, default: false }) textInput!: boolean;
  @Prop({ type: Boolean, default: false }) raw!: boolean;
  @Prop({ type: Object }) link!: Link | undefined;
  @Prop({ type: Object }) entries!: EntriesRef | undefined;
  @Prop({ type: Object }) referenceEntity!: IEntityRef | undefined;

  private audio = new Audio(beepSrc);
  private result: Array<IQRResultContent> = [];

  currentContent = "";
  timer = false;
  timerDuration = 3000;

  private clear() {
    this.result = [];
    this.timer = false;
    this.currentContent = "";
  }

  private async onDecode(content: string) {
    if (this.isScanned(content)) return;

    try {
      void this.audio.play();
    } catch (err) {
      console.error(err);
    }

    if (this.raw) {
      this.$emit("select", content);
      this.clear();
      return;
    }

    const parsedContent = parseQRCode(content);
    let currentContent = null;

    if (parsedContent) {
      currentContent = parsedContent;
    } else if (!isNaN(Number(content))) {
      if (this.referenceEntity === undefined) {
        this.makeToast(this.$t("entity_not_initialized").toString());
        return;
      }
      currentContent = {
        entity: this.referenceEntity,
        id: Number(content),
      };
    } else {
      this.makeToast(this.$t("unknown_code").toString());
      return;
    }

    if (this.link) {
      await this.dispatchByContent(currentContent);
      return;
    }

    let entry;

    try {
      if (this.referenceEntity === undefined || this.entries === undefined) {
        this.makeToast(this.$t("entity_not_initialized").toString());
        return;
      }
      const entries = await this.fetchEntriesByIds(this.entries, [currentContent.id]);
      entry = entries[currentContent.id];
    } catch (e) {
      this.makeToast(this.$t("unknown_code").toString());
      return;
    }

    if (entry === undefined) {
      this.makeToast(this.$t("no_record_found").toString());
      return;
    }

    const currentEntity = await this.getEntity(this.referenceEntity);
    if (!inheritedFromEntity(this.referenceEntity, currentEntity, currentContent.entity)) {
      this.makeToast(this.$t("qrcode_from_different_entity").toString());
      return;
    }

    if (this.multiScan) {
      const rusultContent = { ...currentContent, value: entry };
      this.result.push(rusultContent);
    } else {
      this.$emit("select", currentContent);
      this.clear();
    }
  }

  private sendList() {
    this.$emit("select", this.result);
    this.clear();
  }

  private async dispatchByContent(currentContent: IQRCode) {
    if (!this.link) {
      throw new Error("Impossible");
    }

    let link: Link | undefined;

    if ("links" in this.link) {
      link = this.link.links[currentContent.entity.schema]?.[currentContent.entity.name];
      if (link === undefined) {
        const currentEntity = await this.getEntity(currentContent.entity);
        for (const parentRef of currentEntity.parents) {
          link = this.link.links[parentRef.schema]?.[parentRef.name];
          if (link !== undefined) {
            break;
          }
        }
      }
    }

    if (!link) {
      this.makeToast(this.$t("qrcode_from_different_entity").toString());
      return;
    }

    if ("query" in link && link.query.args.args) {
      link.query.args.args.id = currentContent.id;
    }

    if ("action" in link) {
      link.args.id = currentContent.id;
    }

    const { handler, href } = linkHandler(link);
    if (handler) {
      this.$emit("before-handler");
      void handler();
    }

    this.clear();
  }

  private async startTimer() {
    await this.timeout(this.timerDuration);
    this.timer = false;
  }

  private timeout(ms: number) {
    return new Promise(resolve => {
      window.setTimeout(resolve, ms);
    });
  }

  private isScanned(content: string) {
    if (this.currentContent === content && this.timer) {
      return true;
    }
    this.currentContent = content;
    this.timer = true;
    void this.startTimer();
    return false;
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
