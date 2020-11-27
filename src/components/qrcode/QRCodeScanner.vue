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
        "error_stream_not_suppotred": "ERROR: Stream API is not supported in this browser"
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
        "error_stream_not_suppotred": "ОШИБКА: Stream API не поддерживается в этом браузере"
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
import { saveAndRunAction } from "@/state/actions";
import { queryLocation, IQueryState } from "@/state/query";


interface ICurrentContent {
  s: ValueRef;
  n: IQuery;
  a: IEntityRef;
}

@Component
export default class QRCodeScanner extends mixins(BaseEntriesView) {
  @Prop({ type: Boolean, default: false }) openScanner!: boolean;
  @Prop({ type: Boolean, default: false }) closeAfterScan!: boolean;
  @Prop({ type: Boolean, default: false }) multiScan!: boolean;
  @Prop({ type: Object, default: null }) link!: Link;

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
    // this.currentContent = JSON.parse('{"n":"product","s":"s","a": {"id":3}}');
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
        this.error = this.$t('error_access_camera').toString();
      } else if (error.name === 'NotFoundError') {
        this.error = this.$t('error_no_camera').toString();
      } else if (error.name === 'NotSupportedError') {
        this.error = this.$t('error_secure_context').toString();
      } else if (error.name === 'NotReadableError') {
        this.error = this.$t('error_camera_used').toString();
      } else if (error.name === 'OverconstrainedError') {
        this.error = this.$t('error_camera_not_suitable').toString();
      } else if (error.name === 'StreamApiNotSupportedError') {
        this.error = this.$t('error_stream_not_suppotred').toString();
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
    if (this.currentContent !== null && this.currentContent.n !== undefined &&  this.currentContent.s !== undefined && this.currentContent.a !== undefined ) {
      if (this.entry !== null) {
        this.currentContent.v = this.entries[Number(this.currentContent.a.id)]; 
        this.result.push(this.currentContent);
        if (this.link !== null) {
          this.linkHandler(this.link);
        }
      } else {
        this.entry = {entity: {name: this.currentContent.n, schema: this.currentContent.s}};
      }
    }
  }

  @Watch('currentEntries')
  private changeCurrentEntries() {
    if (this.currentEntries !== null) {
      Object.entries(this.currentEntries).forEach(([id, name]) => {this.entries[id] = name});
    }
    this.changeCurrentContent();
  }

  private linkHandler(link: Link) {
    if ('query' in link) {
      link.query.args.args = this.currentContent.a;
      if (link.target === "modal") {
        this.$store.dispatch("query/addWindow", link.query);
      } else if (link.target === "root") {
        this.$emit("goto", link.query);
      } else if (link.target === "top") {
        this.$store.dispatch("query/pushRoot", link.query);
      } else if (link.target === "blank") {
        const href = this.$router.resolve( queryLocation(link.query) ).href;
        window.open(href, '_blank');
      } else if (link.target === "modal-auto") {
        const queryState = this.$store.state.query as IQueryState;
        if (queryState.current?.windows.length === 0) {
          this.$store.dispatch("query/addWindow", link.query);
        } else {
          this.$emit("goto", link.query);
        }
      } else {
        throw new Error("Impossible");
      }
    } else if ("action" in link) {
      saveAndRunAction(this.$store, link.action, this.currentContent.a);
    }
    this.modalShow = false; 
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