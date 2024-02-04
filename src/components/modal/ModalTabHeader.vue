<template>
  <div
    :class="[
      'modal__tab_header align-items-center',
      {
        selected: isActive,
        only_tab: onlyTab,
        'is-mobile': $isMobile,
      },
    ]"
    :data-window="windowKey"
    @click="$emit('tab-click')"
  >
    <slot name="header" />
    <ButtonItem v-if="!onlyTab" :button="closeButton" />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { namespace } from 'vuex-class'

import ButtonItem from '@/components/buttons/ButtonItem.vue'
import { Button } from '@/components/buttons/buttons'
import { interfaceButtonVariant } from '@/utils_colors'
import { WindowKey } from '@/state/windows'

const windows = namespace('windows')

@Component({ components: { ButtonItem } })
export default class ModalTabHeader extends Vue {
  @windows.Mutation('createWindow') createWindow!: (_: WindowKey) => void
  @windows.Mutation('destroyWindow') destroyWindow!: (_: WindowKey) => void
  @windows.Mutation('activateWindow') activateWindow!: (_: WindowKey) => void

  @Prop({ type: Boolean, default: false }) isActive!: boolean
  @Prop({ type: Boolean, default: false }) onlyTab!: boolean
  @Prop({ type: String, required: true }) windowKey!: string

  @Watch('windowKey', { immediate: true })
  private createWindowByKey(
    windowKey: string,
    oldWindowKey: string | undefined,
  ) {
    if (windowKey === oldWindowKey) return

    if (oldWindowKey) {
      throw new Error('Changing window key is not supported')
    }
    this.createWindow(windowKey)
  }

  mounted() {
    if (this.isActive) {
      this.activateWindow(this.windowKey)
    }
  }

  destroyed() {
    this.destroyWindow(this.windowKey)
  }

  @Watch('isActive')
  private setActive() {
    if (this.isActive) {
      this.activateWindow(this.windowKey)
    }
  }

  private get closeButton(): Button {
    return {
      type: 'callback',
      icon: 'close',
      variant: interfaceButtonVariant,
      callback: () => this.$emit('tab-close'),
    }
  }
}
</script>

<style lang="scss" scoped>
.nested-menu {
  width: 100%;
}

.modal__tab_header {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  overflow-x: hidden;

  &.is-mobile {
    min-width: 80%;
  }
}

.modal__tab_header_title {
  margin-right: auto;
  overflow: hidden;
  font-weight: 600;
  font-size: 1.25em;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:focus {
    outline: none;
  }
}

.modal__tab_header.selected,
.modal__tab_header:hover {
  cursor: pointer;
  border-color: var(--MainBorderColor);
}

.modal__tab_header.only_tab {
  cursor: grab;
  border-color: transparent;
  background-color: var(--default-backgroundColor);
}

.modal__tab_header:not(.only_tab) {
  cursor: grab;

  &:not(.selected) {
    cursor: pointer;
    background-color: var(--default-backgroundDarker1Color, #eaeaea);

    ::v-deep {
      .button-element,
      .filters-button,
      .search-wrapper {
        display: none !important;
      }
    }
  }

  &:not(:first-child):not(.selected) {
    border-left: 1px solid var(--MainBorderColor);
  }
}

.modal__tab_close_button {
  float: right;
  visibility: hidden;
  cursor: pointer;
  border: none;
  background: none;
  line-height: 1.25em;
}

.modal__tab_header.selected > .modal__tab_close_button,
.modal__tab_header:hover > .modal__tab_close_button {
  visibility: visible;
  cursor: pointer;
}

.modal__tab_header.only_tab > .modal__tab_close_button {
  display: none;
}
</style>
