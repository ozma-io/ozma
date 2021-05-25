<template>
  <!-- eslint-disable vue/multiline-html-element-content-newline -->
  <!-- eslint formatting messes with message formatting by `white-space: pre-wrap` -->
  <div class="errorbox-container">
    <b-alert
      show
      class="errorbox mb-0"
      variant="danger"
    >{{ message }}</b-alert>
    <!-- eslint-enable vue/multiline-html-element-content-newline -->
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

@Component
export default class Errorbox extends Vue {
  @Prop({ type: String, required: true }) message!: string;
}
</script>

<style scoped>
  .errorbox-container {
    width: 100%;
  }

  .errorbox {
    white-space: pre-wrap;
  }
</style>
