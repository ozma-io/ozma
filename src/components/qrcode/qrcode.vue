<template>
  <div>
    <qrcode :value="content" :options="{ width: height }" />
    <span><b>{{ content }}</b></span>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

@Component
export default class QRCode extends Vue {
  @Prop({ type: String }) content!: string;
  @Prop({ type: Number, default: 200 }) height!: number;
}

</script>
