<template>
  <fragment>
    <template v-if="mode === 'modal'">
      <fragment>
        <portal to="input-popup-portal">
          <TabbedModal :show="show" fullscreen @close="onClose">
            <div class="modal-slots">
              <div class="header">
                <div class="label">
                  {{ $ustOrEmpty(label) }}
                </div>
              </div>

              <div class="modal-field-slot">
                <slot :mode="mode" :isOpen="true" />
              </div>
              <div class="modal-inner-slot">
                <slot name="inner" modal :autofocus="show" />
              </div>
            </div>
          </TabbedModal>
        </portal>

        <div class="input-field-wrapper" @click="$emit('update:show', true)">
          <slot :mode="mode" :isOpen="false" />
        </div>
      </fragment>
    </template>

    <template v-else-if="mode === 'popup'">
      <!-- eslint-disable vue/v-on-event-hyphenation -->
      <popper
        ref="popup"
        trigger="clickToToggle"
        transition="ozma-popover"
        enter-active-class="ozma-popover-enter-active"
        leave-active-class="ozma-popover-leave-active"
        :visible-arrow="false"
        :options="popperOptions"
        :disabled="!show"
        :force-show="show"
        @document-click="onDocumentClick"
      >
        <!-- eslint-disable vue/no-deprecated-slot-attribute -->
        <!-- TODO: Find or make not deprecated popper.js wrapper -->
        <div
          slot="reference"
          class="input-field-wrapper"
          @click="$emit('update:show', !show)"
        >
          <slot :mode="mode" :isOpen="show" />
        </div>
        <!-- eslint-enable vue/no-deprecated-slot-attribute -->
        <div ref="popupEl" class="popper popup" :style="popupStyle">
          <div class="popup-inner-slot">
            <slot name="inner" />
          </div>
          <div class="resize-handle" @mousedown.prevent.stop="onResizeStart" />
        </div>
      </popper>
    </template>
  </fragment>
</template>

<script lang="ts">
import { Portal } from 'portal-vue'
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'

import Popper from '@/components/common/OzmaPopper.vue'
import TabbedModal from '@/components/modal/TabbedModal.vue'
import { nextRender } from '@/utils'
import { UserString, isOptionalUserString } from '@/state/translations'

type Mode = 'popup' | 'modal'

@Component({ components: { Popper, TabbedModal, Portal } })
export default class InputPopup extends Vue {
  @Prop({ validator: isOptionalUserString }) label!: UserString | undefined
  @Prop({ type: Boolean, default: false }) show!: boolean
  @Prop({ type: Object, default: () => {} }) popperOptions!: object
  @Prop({ type: String, default: '20rem' }) popupMinWidth!: string
  @Prop({ type: String, default: '40rem' }) popupMaxWidth!: string
  @Prop({ type: String, default: '19rem' }) popupHeight!: string

  private resizedWidth: string | null = null
  private resizedHeight: string | null = null

  get popupStyle(): Record<string, string> {
    const style: Record<string, string> = {
      height: this.resizedHeight ?? this.popupHeight,
      'min-width': this.popupMinWidth,
      'max-width': this.popupMaxWidth,
    }
    if (this.resizedWidth) {
      style.width = this.resizedWidth
    }
    return style
  }

  onResizeStart(e: MouseEvent) {
    const el = this.$refs.popupEl as HTMLElement | undefined
    if (!el) return

    const startX = e.clientX
    const startY = e.clientY
    const startW = el.offsetWidth
    const startH = el.offsetHeight

    const onMouseMove = (ev: MouseEvent) => {
      this.resizedWidth = `${startW + (ev.clientX - startX)}px`
      this.resizedHeight = `${startH + (ev.clientY - startY)}px`
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  get mode(): Mode {
    return this.$isMobile ? 'modal' : 'popup'
  }

  updatePopper() {
    if (this.mode === 'popup') {
      ;(this.$refs.popup as any).updatePopper()
    }
  }

  // FIXME: ugly fix for Popper emitting a document click event at the same time `show` is set.
  // Upgrade to Popper 2.x and drop this.
  private isVisible = false

  @Watch('show', { immediate: true })
  async onShow(newValue: boolean) {
    if (newValue === this.isVisible) {
      return
    }

    if (!newValue) {
      this.resizedWidth = null
      this.resizedHeight = null
    }

    await nextRender()
    this.isVisible = newValue
  }

  onDocumentClick() {
    if (this.isVisible) {
      this.$emit('update:show', false)
    }
  }

  onClose() {
    this.$emit('update:show', false)
  }
}
</script>

<style lang="scss" scoped>
.modal-slots {
  display: flex;
  position: relative;
  flex-direction: column;
  justify-content: center;
  background-color: var(--default-backgroundColor);
  padding: 0.5rem;
  height: 100%;
}

.header {
  flex: 0 0 0%;
  margin-bottom: 0.5rem;
}

.modal-field-slot {
  flex: 0 0 auto;
  max-height: 20%; /* Euristic number to fit everything on mobiles with opened keyboard */
}

.modal-inner-slot {
  flex: 1 1;
  height: 0;
}

.popup {
  position: relative;
  display: flex;
  flex-direction: column;
  z-index: 1002;
  box-shadow: 0px 3px 12px 0px rgba(0, 0, 0, 0.08);
  border: 1px solid #efefef;
  border-radius: 0.5rem;
  width: max-content;
  max-height: 80vh;
  overflow: hidden;
  font-size: 1rem;

  .popup-inner-slot {
    flex: 1 1;
    min-height: 0;
    overflow: auto;
  }

  .resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;

    &::after {
      content: '';
      position: absolute;
      right: 3px;
      bottom: 3px;
      width: 8px;
      height: 8px;
      border-right: 2px solid rgba(0, 0, 0, 0.2);
      border-bottom: 2px solid rgba(0, 0, 0, 0.2);
    }
  }
}

.label {
  overflow: hidden;
  font-size: 1.5rem;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-button-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem;
}
</style>
