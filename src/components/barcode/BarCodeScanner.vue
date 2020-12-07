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
    <b-form-input
      ref="barCodeInput"
      v-model="currentCode"
      placeholder="Scan..."
      autofocus
      @change="onScanned"
    />
    <div v-if="result.length > 0" class="decode-result">
      <strong>{{ $t('scan_result') }}:</strong>
      <ol>
        <li
          v-for="value in result"
          :key="value"
        >
          {{ value }}
        </li>
      </ol>
      <b-button
        block
        variant="info"
        @click="clearList"
      >
        {{ $t('clear') }}
      </b-button>
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
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import BaseEntriesView from "@/components/BaseEntriesView";

@Component
export default class BarCodeScanner extends Vue {
  @Prop({ type: Boolean, default: false }) openScanner!: boolean;

  modalShow = false;
  currentCode = "";
  result: Array<string> = [];

  @Watch("openScanner")
  private toggleOpenScanner() {
    this.modalShow = !this.modalShow;
  }

  private onScanned(code: string) {
    this.result.push(code);
    this.currentCode = "";
  }

  private sendList() {
    this.$bvModal.hide("barcode-scanner-modal");
    this.$emit("select", this.result);
    this.result = [];
  }

  private clearList() {
    this.result = [];
  }
}
</script>


<style scoped>
  .decode-result {
    word-wrap: break-word;
  }
</style>
