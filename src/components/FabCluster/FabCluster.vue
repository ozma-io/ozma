<template>
  <div class="fab_zone__container">
    <div class="fab_zone__cluster">
      <CommsButton />
    </div>
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
  .fab_zone__container {
    position: sticky;
    display: inline-flex;
    flex-direction: row-reverse;
    align-items: flex-end;
    bottom: 45px;
    right: 20px;
    float: right;
    width: auto;
    z-index: 700;
  }

  .fab_zone__cluster {
    position: relative;
    display: inline-block;
    height: 60px;
    width: auto;
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .fab_zone__container {
        bottom: 20px;
      }
    }
  }
</style>
