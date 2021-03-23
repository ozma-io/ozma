<template>
  <b-skeleton class="placeholder" type="input" />
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class FormInputPlaceholder extends Vue {}
</script>

<style lang="scss" scoped>
  .placeholder {
    min-height: 30px;
    height: 100%;
    border-color: var(--input-borderColor);
  }
</style>
