<template>
  <VueModal
    :name="name"
    :resizable="resizable"
    :adaptive="adaptive"
    :draggable="draggable"
    :scrollable="scrollable"
    :focus-trap="focusTrap"
    :reset="reset"
    :click-to-close="clickToClose"
    :transition="transition"
    :overlay-transition="overlayTransition"
    :classes="classes"
    :styles="styles"
    :width="width"
    :height="height"
    :min-width="minWidth"
    :min-height="minHeight"
    :max-width="maxWidth"
    :max-height="maxHeight"
    :shift-x="shiftX"
    :shift-y="shiftY"
    @before-open="$emit('before-open', ...arguments)"
    @opened="onOpened"
    @before-close="$emit('before-close', ...arguments)"
    @closed="onClosed"
  >
    <template #top-right>
      <slot name="top-right" />
    </template>

    <slot />
  </VueModal>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-property-decorator'
import Vue from 'vue'
import { namespace } from 'vuex-class'
import { WindowKey } from '@/state/windows'

const windows = namespace('windows')

@Component
export default class ModalWindow extends Vue {
  @windows.Mutation('createWindow') createWindow!: (_: WindowKey) => void
  @windows.Mutation('destroyWindow') destroyWindow!: (_: WindowKey) => void

  @Prop() name!: any
  @Prop() resizable!: any
  @Prop() adaptive!: any
  @Prop() draggable!: any
  @Prop() scrollable!: any
  @Prop() focusTrap!: any
  @Prop() reset!: any
  @Prop() clickToClose!: any
  @Prop() transition!: any
  @Prop() overlayTransition!: any
  @Prop() classes!: any
  @Prop() styles!: any
  @Prop() width!: any
  @Prop() height!: any
  @Prop() minWidth!: any
  @Prop() minHeight!: any
  @Prop() maxWidth!: any
  @Prop() maxHeight!: any
  @Prop() shiftX!: any
  @Prop() shiftY!: any

  onOpened() {
    this.createWindow(this.uid)
    this.$emit('opened')
  }

  onClosed() {
    this.destroyWindow(this.uid)
    this.$emit('closed')
  }
}
</script>
