import { mixins } from 'vue-class-component'
import { Component, Watch } from 'vue-property-decorator'
import { PortalTarget } from 'portal-vue'

import TabbedModal from '@/components/modal/TabbedModal.vue'
import ModalPortal from './ModalPortal'
import { IModalTab } from './types'
import { app } from '@/main'

@Component
export default class ModalPortalTarget extends mixins(PortalTarget) {
  private startingTab = 0

  render(createElement: any) {
    return createElement(TabbedModal, {
      props: {
        modalTabs: this.modalTabs,
        show: this.showModal,
        width: '1140px',
        height: '95%',
        startingTab: this.startingTab,
      },
      on: {
        /* eslint-disable @typescript-eslint/unbound-method */
        close: this.closeAll,
        'tab-close': this.close,
        'go-back': this.goBack,
        /* eslint-enable @typescript-eslint/unbound-method */
      },
    })
  }

  private get modalTabs(): IModalTab[] {
    return this.passengers
      .map((node) => {
        const modalPortal = node.context!.$children[0] as ModalPortal
        const order: number = modalPortal.order
        const autofocus: boolean = modalPortal.autofocus
        const modalHeader = modalPortal.$slots['header']?.[0] ?? null
        return {
          key: modalPortal.uid,
          order,
          header: modalHeader,
          content: node,
          autofocus,
        }
      })
      .sort((a, b) => a.order - b.order)
  }

  @Watch('modalTabs')
  private modalTabsChanged(tabs: IModalTab[], prevTabs: IModalTab[]) {
    const existingTabs = new Set(prevTabs.map((t) => t.key))
    tabs.forEach((t, i) => {
      if (!existingTabs.has(t.key) && t.autofocus) {
        this.startingTab = i
      }
    })
  }

  private get showModal(): boolean {
    return this.passengers.length > 0
  }

  private close(index: number) {
    const modalPortal = this.passengers[index].context!.$children[0]
    modalPortal.$emit('close')
  }

  private goBack() {
    const modalPortal = this.passengers[0].context!.$children[0]
    modalPortal.$emit('go-back')
  }

  private async closeAll() {
    // If several tabs are open and user closes the modal it calls "submit" several times,
    // which leads to double entry creation in some cases, this is the fix for this case.
    // TODO: Solve it better.
    await app.$store.dispatch(
      'staging/submitIfNeeded',
      { errorOnIncomplete: true },
      { root: true },
    )

    this.passengers
      .slice()
      .reverse()
      .forEach((node) => {
        const modalPortal = node.context!.$children[0]
        modalPortal.$emit('close')
      })
  }
}
