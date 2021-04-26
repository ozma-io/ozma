<template>
  <div class="fab-container d-print-none">
    <CommsButton />
  </div>
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator";
import CommsButton from "@/components/CommunicationsButton.vue";

@Component({ components: { CommsButton } })
export default class FabCluster extends Vue {
}
</script>

<style scoped>
  .fab-container {
    position: fixed;
    bottom: 0;
    right: 2rem;
    z-index: 700;
  }
</style>
