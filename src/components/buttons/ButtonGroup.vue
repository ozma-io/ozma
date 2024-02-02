<template>
  <!-- eslint-disable vue/v-on-event-hyphenation -->
  <popper
    ref="popup"
    trigger="clickToOpen"
    :visible-arrow="false"
    :options="{
      placement: listItem ? 'right-start' : 'bottom-end',
      positionFixed: true,
      modifiers: {
        offset: { offset: listItem ? '0, 5' : '0, 10' },
        // Nested poppers cannot appear outside the parent element if overflow is enabled.
        preventOverflow: { enabled: !listItem, boundariesElement: 'viewport' },
        hide: { enabled: !listItem },
      },
    }"
    :disabled="!show"
    :force-show="show"
    @documentClick="onDocumentClick"
  >
    <div class="popper shadow">
      <ButtonList
        :buttons="button.buttons"
        @button-click="onInnerButtonClick"
        @goto="$emit('goto', $event)"
      />
    </div>
    <!-- eslint-disable vue/no-deprecated-slot-attribute -->
    <ButtonView
      slot="reference"
      :list-item="listItem"
      :button="button"
      @click.capture="onReferenceClick"
    />
  </popper>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import Popper from 'vue-popperjs'

import type { IButton, IButtonGroup } from '@/components/buttons/buttons'
import ButtonView from '@/components/buttons/ButtonView.vue'
import ButtonList from '@/components/buttons/ButtonList.vue'

@Component({
  components: {
    ButtonView,
    ButtonList,
    Popper,
  },
})
export default class ButtonsPanel extends Vue {
  @Prop({ type: Object, required: true }) button!: IButtonGroup
  @Prop({ type: Boolean, default: false }) listItem!: boolean

  private show = false

  onReferenceClick() {
    this.show = !this.show
  }

  onDocumentClick() {
    this.show = false
  }

  onInnerButtonClick(button: IButton) {
    this.$emit('button-click', button)

    if (!button.keepButtonGroupOpened) {
      this.show = false
    }
  }
}
</script>

<style lang="scss" scoped>
.popper {
  border: none;
  border-radius: 0.5rem;
}

.list-group {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
