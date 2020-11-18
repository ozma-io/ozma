<i18n>
  {
    "en": {
        "input_placeholder": "Empty",
        "qrcode_scanner": "QR Code scanner",
        "new_scan": "Connecting to camera...",
        "scan_result": "Scan result",
        "clear": "Clear",
        "paste_data": "Paste data"
    },
    "ru": {
        "input_placeholder": "Пусто",
        "qrcode_scanner": "QR Code сканер",
        "new_scan": "Подключение к камере...",
        "scan_result": "Результат сканирования",
        "clear": "Очистить",
        "paste_data": "Вставить данные"
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
      v-if="!destroyed"
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
          :key="value"
        > 
          {{value[3]}}
        </li>
      </ol>
      <div v-if="multiScan">
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
    </div>
  </b-modal>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

@Component
export default class QRCodeScanner extends Vue {
  @Prop({ type: Boolean, default: false }) openScanner!: boolean;
  @Prop({ type: Boolean, default: false }) closeAfterScan!: boolean;
  @Prop({ type: Boolean, default: false }) multiScan!: boolean;

  modalShow = false;
  camera ='auto';
  result: Array<any> = [];
  error = '';
  loading = false;
  destroyed = false;

  @Watch('openScanner')
  private toggleOpenScanner() {
    this.modalShow = !this.modalShow;
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
    this.$emit('update:scanResult', content);
    this.result.push(content.split("&&"));

    try {
      window.navigator.vibrate([100,30,200]);
    } catch (e) {
      console.error(e);
    }

    if (!this.multiScan) {
      this.turnCameraOff();
      
      if (this.closeAfterScan) {
        this.toggleOpenScanner();
        this.result = [];
      }

      await this.timeout(1);
      this.turnCameraOn();
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

  async reload () {
    this.destroyed = true
    await this.$nextTick()
    this.destroyed = false
  };

  private sendList() {
    this.$bvModal.hide('qrcode-scanner-modal');
    this.$emit("select", this.result);
    this.result = [];
  };

  private clearList() {
    this.reload();
    this.result = [];
  };

}
</script> 

<style scoped>
  .error {
    font-weight: bold;
    color: red;
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