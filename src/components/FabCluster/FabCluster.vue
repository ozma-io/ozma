<template>
  <div class="fab_zone__container">
    <div class="fab_zone__cluster">
      <CommsButton />
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import CommsButton from '@/components/CommunicationsButton.vue';

@Component({ components: { CommsButton } })
export default class FabCluster extends Vue { 
}
</script>

<style scoped>
  .fab_zone__container {
    position: sticky;
    display: flex;
    flex-direction: row-reverse;
    align-items: flex-end;
    bottom: 0;
    right: 0;
    height: 120px;
    padding-right: 50px;
    padding-bottom: 50px;
    margin-top: 25px;
  }

  .fab_zone__cluster {
    position: relative;
    display: inline-block;
    height: 60px;
    width: auto;
  }
</style>