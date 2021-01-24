<template>
  <barcode class="barcode" :value="content">
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

<style lang="scss" scoped>
  .barcode {
    /* TODO: remove hardcoded color, */
    border: 1px solid #ced4da;
    border-radius: 0.2rem;
    overflow: hidden;
  }
</style>
