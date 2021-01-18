<template>
  <div class="fab-container">
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
    bottom: 30px;
    right: 30px;
    z-index: 700;
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .fab-container {
        bottom: 20px;
        right: 20px;
      }
    }
  }
</style>
