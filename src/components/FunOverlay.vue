<template>
  <b-overlay
    ref="overlayRef"
    class="userview-overlay"
    :show="show"
    variant="dark"
    opacity="0.4"
    blur="5px"
    rounded="sm"
    :z-index="30"
    @shown="handleArgumentOverlayShown"
    @hidden="handleArgumentOverlayHidden"
  >
    <template #overlay>
      <slot name="overlay" />
    </template>
    <slot />
  </b-overlay>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class FunOverlay extends Vue {
  @Prop({ type: Boolean, required: true }) show!: boolean;

  private onOverlayScroll() {
    const overlayElement = (this.$refs.overlayRef as Vue)?.$el;
    const left = overlayElement?.scrollLeft ?? 0;
    const top = overlayElement?.scrollTop ?? 0;
    // `z-index: 30` to work well with popups from ArgumentEditor.
    (overlayElement.querySelector(".b-overlay") as HTMLElement).style.cssText =
      `width: 100%; height: 100%; left: ${left}px; top: ${top}px; z-index: 30;`;
  }

  private handleArgumentOverlayShown() {
    /* eslint-disable @typescript-eslint/unbound-method */
    const overlayElement = (this.$refs.overlayRef as Vue)?.$el;
    if (overlayElement) {
      overlayElement.addEventListener("scroll", this.onOverlayScroll);
      this.onOverlayScroll();
    }
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private handleArgumentOverlayHidden() {
    /* eslint-disable @typescript-eslint/unbound-method */
    const overlayElement = (this.$refs.overlayRef as Vue)?.$el;
    if (overlayElement) {
      overlayElement.removeEventListener("scroll", this.onOverlayScroll);
    }
    /* eslint-enable @typescript-eslint/unbound-method */
  }
}
</script>

<style lang="scss">
  .userview-overlay {
    flex: 1 1;
    width: 100%;
    overflow-x: auto;
  }
</style>
