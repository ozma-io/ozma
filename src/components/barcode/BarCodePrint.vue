<template>
  <barcode class="barcode" :value="content" :format="format">
    Can not print Barcode!
  </barcode>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import VueBarcode from 'vue-barcode'

@Component({ components: { barcode: VueBarcode } })
export default class BarCodePrint extends Vue {
  @Prop({ type: String, default: '' }) content!: string
  @Prop({ type: String, default: 'CODE128' }) format!: string
}
</script>

<style lang="scss" scoped>
.barcode {
  border: 1px solid var(--cell-borderColor);
  border-radius: 0.5rem;
  overflow: hidden;
}
</style>
