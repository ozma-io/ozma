<template>
  <div v-if="content.length > 0">
    <qrcode :value="qrcodeContent" :options="{ width: height }" />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import VueQrcode from "@chenfengyuan/vue-qrcode";
import type { IEntriesRef } from "@/state/entries";

export interface IPrintQRCode {
  s: string; // Schema
  n: string; // Name
  i: string; // ID
}

@Component({
  components: {
    [VueQrcode.name]: VueQrcode,
  },
})
export default class QRCode extends Vue {
  @Prop({ type: String, default: "" }) content!: string;
  @Prop({ type: Number, default: 200 }) height!: number;
  @Prop({ type: Object }) entry!: IEntriesRef;

  get qrcodeContent() {
    const content: IPrintQRCode = { s: this.entry.entity.schema, n: this.entry.entity.name, i: this.content };
    return JSON.stringify(content);
  }
}

</script>
