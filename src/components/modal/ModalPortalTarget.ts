import { mixins } from "vue-class-component";
import { Component, Watch } from "vue-property-decorator";
import { PortalTarget } from "portal-vue";

import { IModalTab } from "@/components/modal/types";
import Modal from "@/components/modal/Modal.vue";
import type { Header } from "@/components/panels/HeaderPanel.vue";

interface IInternalModalTab extends IModalTab {
  tab: any;
  autofocus: boolean;
  header: Header;
}

@Component
export default class ModalPortalTarget extends mixins(PortalTarget) {
  private startingTab = 0;

  render(createElement: any) {
    return createElement(Modal, {
      props: {
        modalTabs: this.modalTabs,
        show: this.showModal,
        width: "85%",
        height: "95%",
        startingTab: this.startingTab,
      },
      on: {
        /* eslint-disable @typescript-eslint/unbound-method */
        close: this.closeAll,
        "tab-close": this.close,
        /* eslint-enable @typescript-eslint/unbound-method */
      },
    });
  }

  private get modalTabs(): IInternalModalTab[] {
    return this.passengers.map((node, index) => {
      const modalPortal: any = node.context!.$children[0];
      const modalHeader: any = ("header" in modalPortal.$slots)
        ? modalPortal.$slots["header"][0]
        : undefined;
      const order: number = modalPortal.order;
      const autofocus: boolean = modalPortal.autofocus;
      return {
        content: node,
        order,
        tab: modalPortal,
        autofocus,
        header: modalHeader,
      };
    }).sort((a, b) => a.order - b.order);
  }

  @Watch("modalTabs")
  private modalTabsChanged(tabs: IInternalModalTab[], prevTabs: IInternalModalTab[]) {
    const existingTabs = new Set(prevTabs.map(t => t.tab));
    this.startingTab = -1;
    tabs.forEach((t, i) => {
      if (!existingTabs.has(t.tab) && t.autofocus) {
        this.startingTab = i;
      }
    });
    if (this.startingTab < 0) {
      this.startingTab = tabs.length - 1;
    }
  }

  private get showModal(): boolean {
    return this.passengers.length > 0;
  }

  private close(index: number) {
    const modalPortal = this.passengers[index].context!.$children[0];
    modalPortal.$emit("close");
  }

  private closeAll() {
    this.passengers.slice().reverse().forEach(node => {
      const modalPortal = node.context!.$children[0];
      modalPortal.$emit("close");
    });
  }
}
