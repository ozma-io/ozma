<template>
  <barcode :value="content">
    Can not print Barcode!
  </barcode>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import VueBarcode from "vue-barcode";

@Component({ components: { "barcode": VueBarcode } })
export default class BarCodePrint extends Vue {
  @Prop({ type: String, default: "" }) content!: string;
}
</script>
