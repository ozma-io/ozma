<template>
  <div v-if="qrcodeContent !== null" class="rounded">
    <qrcode :value="qrcodeContent" :options="{ width: height }" />
  </div>
</template>

<script lang="ts">
import type { IEntityRef } from "ozma-api";
import { goodName } from "ozma-api";
import { Component, Prop, Vue } from "vue-property-decorator";

import VueQrcode from "@chenfengyuan/vue-qrcode";

export interface IQRCode {
  entity: IEntityRef;
  id: number;
}

const qrCodeVersion = 1;

export const parseQRCode = (str: string): IQRCode | null => {
  const parts = str.split("/");
  if (parts.length !== 4) {
    return null;
  }
  const version = Number(parts[0]);
  if (Number.isNaN(version) || version > qrCodeVersion) {
    return null;
  }

  const schema = parts[1];
  const entity = parts[2];
  const id = Number(parts[3]);
  if (!goodName(schema) || !goodName(entity) || Number.isNaN(id)) {
    return null;
  }
  return {
    entity: {
      schema,
      name: entity,
    },
    id,
  };
};

export const encodeQRCode = (qrCode: IQRCode): string => {
  return `${qrCodeVersion}/${qrCode.entity.schema}/${qrCode.entity.name}/${qrCode.id}`;
};

@Component({
  components: {
    [VueQrcode.name]: VueQrcode,
  },
})
export default class QRCode extends Vue {
  @Prop({ type: Number }) id!: number | undefined;
  @Prop({ type: Number, default: 200 }) height!: number;
  @Prop({ type: Object, required: true }) entity!: IEntityRef;

  get qrcodeContent(): string | null {
    if (this.id === undefined) {
      return null;
    } else {
      return encodeQRCode({
        entity: this.entity,
        id: this.id,
      });
    }
  }
}

</script>
