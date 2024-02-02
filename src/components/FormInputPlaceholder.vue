<template>
  <b-skeleton class="placeholder" type="input" />
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component
export default class FormInputPlaceholder extends Vue {}
</script>

<style lang="scss" scoped>
.placeholder {
  border-color: var(--cell-borderColor);
  height: 100%;
  min-height: 30px;
}
</style>
