<i18n>
  {
    "en": {
      "scan_result": "Scan result",
      "barcode_scanner": "Bar code scanner",
      "clear": "Clear",
      "paste_data": "Paste data",
      "error": "Error",
      "no_record_found":"No record found with this id",
      "error_qrcode_is_inappropriate" : "ERROR: QRCode is inappropriate",
      "unknown_code": "Unknown code"
    },
    "ru": {
      "scan_result": "Результат сканирования",
      "barcode_scanner": "Сканер штрих-кодов",
      "clear": "Очистить",
      "paste_data": "Вставить данные",
      "error": "Ошибка",
      "no_record_found":"Не найдена запись с данным id",
      "error_qrcode_is_inappropriate" : "ОШИБКА: QRCode не соответствует назначению",
      "unknown_code": "Неизвестный код"
    }
  }
</i18n>

<template>
  <b-modal
    id="barcode-scanner-modal"
    v-model="modalShow"
    hide-footer
    :title="$t('barcode_scanner')"
  >
    <BarCode
      @scanned="onScanned"
    />
    <div v-if="result.length > 0" class="decode-result">
      <strong>{{ $t('scan_result') }}:</strong>
      <ol>
        <li
          v-for="(value, i) in result"
          :key="i"
        >
          {{ value.value }}
        </li>
      </ol>
      <b-button
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
import { Component, Prop, Watch } from "vue-property-decorator";
import BarCode from "@/components/barcode/BarCode.vue";
import { mixins } from "vue-class-component";
import BaseEntriesView from "@/components/BaseEntriesView";
import { IQRCode, parseQRCode } from "@/components/qrcode/QRCode.vue";
import { IEntriesRef } from "@/state/entries";
import { equalEntityRef } from "@/values";

export interface IQRResultContent extends IQRCode {
  value: string;
}

@Component({ components: { BarCode } })
export default class BarCodeScanner extends mixins(BaseEntriesView) {
  @Prop({ type: Boolean, default: false }) openScanner!: boolean;
  @Prop({ type: Object }) entity!: IEntriesRef | null;

  modalShow = false;
  result: Array<IQRResultContent> = [];

  get entriesEntity() {
    return this.entity;
  }

  @Watch("openScanner")
  private toggleOpenScanner() {
    this.modalShow = !this.modalShow;
  }

  private async onScanned(content: string) {
    if (this.entity === null) {
      return;
    }

    let currentCode: IQRCode | null = null;
    const parsedContent = parseQRCode(content);

    if (parsedContent) {
      currentCode = parsedContent;
    } else if (!isNaN(Number(content))) {
      currentCode = {
        entity: this.entity.entity,
        id: Number(content),
      };
    } else {
      this.makeToast(this.$t("unknown_code").toString());
      return;
    }

    if (!equalEntityRef(currentCode.entity, this.entity.entity)) {
      this.makeToast(this.$t("error_qrcode_is_inappropriate").toString());
      return;
    }

    const entry = await this.fetchOneEntry(currentCode.id);
    if (entry !== undefined) {
      this.result.push({ ...currentCode, value: entry });
    } else {
      this.makeToast(this.$t("no_record_found").toString());
    }
  }

  private sendList() {
    this.$bvModal.hide("barcode-scanner-modal");
    this.$emit("select", this.result, "scan_barcode");
    this.result = [];
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
  }
</style>
