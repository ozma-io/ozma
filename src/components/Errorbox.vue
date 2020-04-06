<template>
  <div class="error_box_container">
    <span class="error_box_text">
      {{ message }}
    </span>
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
  .error_box_container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }

  .error_box_text {
    width: 60%;
    padding: 5px;
    background-color: var(--FailColor);
    color: white;
    font-size: 1.5rem;
    border: 1px solid black;
  }
</style>