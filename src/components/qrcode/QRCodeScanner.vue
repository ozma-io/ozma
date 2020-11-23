<i18n>
  {
    "en": {
        "input_placeholder": "Empty",
        "qrcode_scanner": "QR Code scanner",
        "new_scan": "Connecting to camera...",
        "scan_result": "Scan result",
        "clear": "Clear",
        "paste_data": "Paste data",
        "incorrect_format": "ERROR: Incorrect format."
    },
    "ru": {
        "input_placeholder": "Пусто",
        "qrcode_scanner": "QR Code сканер",
        "new_scan": "Подключение к камере...",
        "scan_result": "Результат сканирования",
        "clear": "Очистить",
        "paste_data": "Вставить данные",
        "incorrect_format": "ОШИБКА: Неправильный формат."
    }
  }
</i18n>
<template>
  <b-modal 
    id='qrcode-scanner-modal'
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
import { Link } from "@/links";

@Component
export default class QRCodeScanner extends mixins(BaseEntriesView) {
  @Prop({ type: Object, default: false }) openScanner!: Link;
  @Prop({ type: Boolean, default: false }) closeAfterScan!: boolean;
  @Prop({ type: Boolean, default: false }) multiScan!: boolean;

  modalShow = false;
  camera ='auto';
  result: Array<any> = [];
  error = '';
  loading = false;
  entry: IEntriesRef | null = null;
  entries: Record<string, string> = {};
  currentContent: any | null = null;

  @Watch('openScanner')
  private toggleOpenScanner() {
    this.modalShow = !this.modalShow;
    this.currentContent = null;
    this.result = [];
    this.entry = null;
    this.entries = {};
  }

  async onInit (promise: any) {
    this.loading = true;
    try {
      await promise
    } catch (error) {
      this.error = error.name;
      if (error.name === 'NotAllowedError') {
        this.error = "ERROR: you need to grant camera access permisson"
      } else if (error.name === 'NotFoundError') {
        this.error = "ERROR: no camera on this device"
      } else if (error.name === 'NotSupportedError') {
        this.error = "ERROR: secure context required (HTTPS, localhost)"
      } else if (error.name === 'NotReadableError') {
        this.error = "ERROR: is the camera already in use?"
      } else if (error.name === 'OverconstrainedError') {
        this.error = "ERROR: installed cameras are not suitable"
      } else if (error.name === 'StreamApiNotSupportedError') {
        this.error = "ERROR: Stream API is not supported in this browser"
      }
    } finally {
      this.loading = false;
    }
  };

  private async onDecode (content: string) {
    this.error = "";
    
    if (!this.multiScan) {
      this.$emit('update:scanResult', content);
      this.turnCameraOff();
      
      if (this.closeAfterScan) {
        this.toggleOpenScanner();
        this.result = [];
      }

      await this.timeout(1);
      this.turnCameraOn();

    } else {
      try {
        content = JSON.parse(content);
      } catch(e) {
        this.error = this.$t('incorrect_format').toString() + " QR code: " + content;
        content = "";
      }
      if (content !== "")
        this.currentContent = content;
    }

    try {
      window.navigator.vibrate([100,30,200]);
    } catch (e) {
      console.error(e);
    }

  };

  private turnCameraOn () {
    this.camera = 'auto';
  };

  private turnCameraOff () {
    this.camera = 'off';
  };

  private timeout (ms: number) {
    return new Promise(resolve => {
      window.setTimeout(resolve, ms);
    })
  };

  private sendList() {
    this.$bvModal.hide('qrcode-scanner-modal');
    this.$emit("select", this.result);
    this.result = [];
  };

  get entriesEntity() {
    return this.entry;
  }

  @Watch('currentContent', { deep: true, immediate: true })
  private changeCurrentContent() {
    if (this.currentContent !== null && this.currentContent.n !== undefined &&  this.currentContent.s !== undefined && this.currentContent.i !== undefined ) {
      if (this.entry !== null) {
        this.currentContent.v = this.entries[Number(this.currentContent.i)]; 
        this.result.push(this.currentContent);
      } else {
        this.entry = {entity: {name: this.currentContent.n, schema: this.currentContent.s}};
      }
    }
  }

  @Watch('currentEntries')
  private changeCurrentEntries() {
    if (this.currentEntries !== null)
      Object.entries(this.currentEntries).forEach(([id, name]) => {this.entries[id] = name});
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