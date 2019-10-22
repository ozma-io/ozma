import { mixins } from "vue-class-component";
import { Component, Watch } from "vue-property-decorator";
import { PortalTarget } from "portal-vue";

import { mapMaybe } from "@/utils";
import { IModalTab } from "@/components/modal/types";
import Modal from "@/components/modal/Modal.vue";

@Component
export default class ModalPortalTarget extends mixins(PortalTarget) {
  private startingTab = 0;

  render(createElement: any) {
    return createElement(Modal, {
      props: {
        modalTabs: this.modalTabs,
        show: this.showModal,
        width: "85%",
        height: "85%",
        startingTab: this.startingTab,
      },
      on: {
        close: this.closeAll,
        "tab:close": this.close,
      },
    });
  }

  private get modalTabs(): IModalTab[] {
    return mapMaybe((node, index) => {
      const modalPortal: any = node.context!.$children[0];
      const title: string | undefined = modalPortal.tabName;
      const order: number | undefined = modalPortal.order;
      return {
        title: title || String(index),
        content: node,
        order: order || -1,
      };
    }, this.passengers).sort((a, b) => b.order - a.order);
  }

  @Watch("modalTabs")
  private modalTabsChanged(tabs: IModalTab[], prevTabs: IModalTab[]) {
    if (prevTabs.length < tabs.length) {
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
    this.passengers.forEach(node => {
      const modalPortal = node.context!.$children[0];
      modalPortal.$emit("close");
    });
  }
}
