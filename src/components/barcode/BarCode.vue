<i18n>
    {
        "en": {
            "scan": "Scan..."
        },
        "ru": {
            "scan": "Сканируйте..."
        },
        "es": {
            "scan": "Escanear..."
        }
    }
</i18n>

<template>
  <b-form-input
    v-model="currentCode"
    :placeholder="$t('scan')"
    @change="onScanned"
  />
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

@Component
export default class BarCode extends Vue {
  @Prop({ type: String, default: "" }) content!: string;

  private currentCode = "";

  private created() {
    this.currentCode = this.content;
  }

  private onScanned(code: string) {
    this.$emit("scanned", code);
    this.currentCode = "";
  }
}
</script>
