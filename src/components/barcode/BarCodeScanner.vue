<i18n>
  {
    "en": {
      "scan_result": "Scan result",
      "barcode_scanner": "Bar code scanner",
      "clear": "Clear",
      "paste_data": "Paste data"
    },
    "ru": {
      "scan_result": "Результат сканирования",
      "barcode_scanner": "Сканер штрих-кодов",
      "clear": "Очистить",
      "paste_data": "Вставить данные"
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
    <div v-if="barCodeResult.length > 0 || qrCodeResult.length > 0" class="decode-result">
      <strong>{{ $t('scan_result') }}:</strong>
      <ol>
        <li
          v-for="(value, i) in barCodeResult"
          :key="i"
        >
          {{ value }}
        </li>
      </ol>

      <ol>
        <li
          v-for="(value, i) in qrCodeResult"
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
import { IEntriesRef } from "@/state/entries";
import { IQRCode, parseQRCode } from "@/components/qrcode/QRCode.vue";

export interface IQRResultContent extends IQRCode {
  value: string;
}

@Component({ components: { BarCode } })
export default class BarCodeScanner extends mixins(BaseEntriesView) {
  @Prop({ type: Boolean, default: false }) openScanner!: boolean;

  modalShow = false;
  barCodeResult: Array<string> = [];
  qrCodeResult: Array<IQRResultContent> = [];
  entry: IEntriesRef | null = null;
  currentQRCode: IQRCode | null = null;
  entries: Record<string, string> = {};

  get entriesEntity() {
    return this.entry;
  }

  @Watch("currentEntries")
  private changeCurrentEntries() {
    if (this.currentEntries !== null) {
      Object.entries(this.currentEntries).forEach(([id, name]) => {
        this.entries[id] = name;
      });
    }
    this.changeCurrentQRCodeContent();
  }

  @Watch("currentQRCode", { deep: true, immediate: true })
  private changeCurrentQRCodeContent() {
    if (this.currentQRCode !== null) {
      if (this.entry !== null) {
        if (this.entries[Number(this.currentQRCode.id)] !== undefined) {
          const rusultContent = { ...this.currentQRCode, value: this.entries[Number(this.currentQRCode.id)] };
          this.qrCodeResult.push(rusultContent);
        }
      } else {
        this.entry = { entity: this.currentQRCode.entity };
      }
    }
  }

  @Watch("openScanner")
  private toggleOpenScanner() {
    this.modalShow = !this.modalShow;
  }

  private onScanned(content: string) {
    const parsedContent = parseQRCode(content);
    if (parsedContent) {
      this.currentQRCode = parsedContent;
    } else {
      this.barCodeResult.push(content);
    }
  }

  private sendList() {
    this.$bvModal.hide("barcode-scanner-modal");
    this.$emit("select-qrcode", this.qrCodeResult);
    this.$emit("select-barcode", this.barCodeResult);
    this.clearList();
  }

  private clearList() {
    this.barCodeResult = [];
    this.qrCodeResult = [];
  }
}
</script>

<style scoped>
  .decode-result {
    word-wrap: break-word;
  }
</style>
