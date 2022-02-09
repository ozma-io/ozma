<i18n>
  {
    "en": {
        "qrcode_scanner": "Code scanner"
    },
    "ru": {
        "qrcode_scanner": "Сканер кодов"
    }
  }
</i18n>
<template>
  <b-modal
    ref="modal"
    hide-footer
    :title="$t('qrcode_scanner')"
  >
    <QRCodeScanner
      :multi-scan="multiScan"
      :text-input="textInput"
      :raw="raw"
      :link="link"
      :entries="entries"
      :reference-entity="referenceEntity"
      @select="onSelect"
      @before-push-root="onBeforePushRoot"
    />
  </b-modal>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import type { IEntityRef } from "ozma-api";

import type { Link } from "@/links";
import { IQRCode } from "@/components/qrcode/QRCode.vue";
import { EntriesRef } from "@/state/entries";
import { IQuery } from "@/state/query";

@Component({
  components: {
    QRCodeScanner: () => import("@/components/qrcode/QRCodeScanner.vue"),
  },
})
export default class QRCodeScannerModal extends Vue {
  @Prop({ type: Boolean, default: false }) multiScan!: boolean;
  @Prop({ type: Boolean, default: false }) textInput!: boolean;
  @Prop({ type: Boolean, default: false }) raw!: boolean;
  @Prop({ type: Object }) link!: Link | undefined;
  @Prop({ type: Object }) entries!: EntriesRef | undefined;
  @Prop({ type: Object }) referenceEntity!: IEntityRef | undefined;

  scan() {
    (this.$refs.modal as any).show();
  }

  private onSelect(result: IQRCode) {
    (this.$refs.modal as any).hide();
    this.$emit("select", result);
  }

  private onBeforePushRoot(result: IQuery) {
    (this.$refs.modal as any).hide();
    this.$emit("before-push-root", result);
  }
}
</script>
