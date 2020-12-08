<template>
  <b-form-input
    v-model="content"
    placeholder="Scan..."
    autofocus
    @change="onScanned"
  />
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

@Component
export default class BarCode extends Vue {
  @Prop({ type: String, default: "" }) content!: string;

  currentCode = "";

  private onScanned(code: string) {
    this.$emit("scanned", code);
    this.content = "";
  }
}
</script>
