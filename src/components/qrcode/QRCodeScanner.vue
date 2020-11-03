<i18n>
  {
    "en": {
        "input_placeholder": "Empty",
        "qrcode_scanner": "QR Code scanner",
        "new_scan": "New scan...",
        "last_result": "Last result"
    },
    "ru": {
        "input_placeholder": "Пусто",
        "qrcode_scanner": "QR Code сканер",
        "new_scan": "Новое сканирование...",
        "last_result": "Последний результат"
    }
  }
</i18n>
<template>
  <b-modal 
    v-model="modalShow"
    hide-footer 
    :title="$t('qrcode_scanner')">
    <qrcode-stream 
      :camera="camera" 
      @decode="onDecode" 
      @init="onInit"
    >
      <div class="loading-indicator" v-if="loading">
        {{ $t('new_scan') }}
      </div>

      <div v-if="error" class="error">
        {{ error }}
      </div>
    </qrcode-stream>
    <div v-if="result.length > 0" class="decode-result">{{ $t('last_result') }}:<br/> <b>{{ result }}</b></div>
  </b-modal>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

@Component
export default class QRCodeScanner extends Vue {
  @Prop({ type: Boolean, default: false }) openScanner!: boolean;

  modalShow = false;
  camera ='auto';
  result = '';
  error = '';
  loading = false;

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
    this.result = content;
    this.turnCameraOff();
    window.navigator.vibrate(100); // vibrate for 200ms
    // some more delay, so users have time to read the message
    await this.timeout(1);
    this.turnCameraOn();
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