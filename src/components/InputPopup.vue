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
        transition="fade"
        enter-active-class="fade-enter fade-enter-active"
        leave-active-class="fade-leave fade-leave-active"
        :visible-arrow="false"
        :options="popperOptions"
        :disabled="!show"
        :force-show="show"
        @documentClick="onDocumentClick"
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
        <div class="popper popup">
          <div class="popup-inner-slot">
            <slot name="inner" />
          </div>
        </div>
      </popper>
    </template>
  </fragment>
</template>

<script lang="ts">
import Popper from 'vue-popperjs'
import { Portal } from 'portal-vue'
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'

import TabbedModal from '@/components/modal/TabbedModal.vue'
import { nextRender } from '@/utils'
import { UserString, isOptionalUserString } from '@/state/translations'

type Mode = 'popup' | 'modal'

@Component({ components: { Popper, TabbedModal, Portal } })
export default class InputPopup extends Vue {
  @Prop({ validator: isOptionalUserString }) label!: UserString | undefined
  @Prop({ type: Boolean, default: false }) show!: boolean
  @Prop({ type: Object, default: () => {} }) popperOptions!: object

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
  display: flex;
  flex-direction: column;
  box-shadow: 0px 3px 12px 0px rgba(0, 0, 0, 0.08);
  border: 1px solid #efefef;
  border-radius: 0.5rem;
  width: 20rem;
  max-width: 98%;
  height: 19rem;
  max-height: 80vh;
  overflow: auto;
  resize: both;
  font-size: 1rem;

  .popup-inner-slot {
    flex: 1 1;
    height: 100%;
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
