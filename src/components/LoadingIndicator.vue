<template>
  <div
    :class="[
      'loading-container',
      {
        nested,
      },
    ]"
  >
    <div class="loading-background">
      <div
        v-for="index in !$isMobile && wide ? 9 : 3"
        :key="index"
        class="loading-box"
      >
        <div class="loading-line" style="width: 30%" />
        <div class="loading-line" />
        <div class="loading-line" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

@Component
export default class LoadingIndicator extends Vue {
  @Prop({ type: Boolean, default: false }) nested!: boolean
  @Prop({ type: Boolean, default: false }) wide!: boolean
}
</script>

<style lang="scss" scoped>
.loading-container {
  width: 100%;
  height: 100%;
  min-height: 100px;

  .loading-background {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.625rem;
    cursor: wait;
    background-color: var(--userview-background-color);
    padding: 2.5rem 1.7rem;
    width: 100%;
    height: 100%;

    @include mobile {
      grid-template-columns: repeat(1, minmax(0, 1fr));
      padding: 1rem;
    }
  }
  &.nested .loading-background {
    grid-template-columns: repeat(1, minmax(0, 1fr));
    padding: 0;
  }

  .loading-box {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    border-radius: 0.625rem;
    background: #fff;
    padding: 2.5rem 1.7rem;

    @include mobile {
      // height: 30%;
    }
  }

  .loading-line {
    border-radius: 1.8125rem;
    background: #efefef;
    width: 100%;
    height: 0.6875rem;
  }

  &.fade-2-leave-active {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1000;
    width: 100%;
    min-height: 0;

    &.nested {
      padding: 0 15px !important; /* Mimic `.col` paddings */
    }

    .spinner-border {
      opacity: 0;
      transition: opacity 0.05s;
    }
  }
}
</style>
