import * as R from "ramda";
import { mixins } from "vue-class-component";
import { Component } from "vue-property-decorator";
import { PortalTarget } from "portal-vue";

import { mapMaybe } from "@/utils";
import { IModalTab } from "@/components/modal/types";
import Modal from "@/components/modal/Modal.vue";
import ModalPortal from "@/components/modal/ModalPortal.vue";

@Component
export default class ModalPortalTarget extends mixins(PortalTarget) {
  render(createElement: any) {
    return createElement(Modal, {
      props: {
        modalTabs: this.modalTabs,
        show: this.showModal,
        width: "85%",
        height: "85%",
      },
      on: {
        close: () => this.closeAll(),
        "tab:close": (index: number) => this.close(index),
      },
    });
  }

  private get modalTabs(): IModalTab[] {
    return mapMaybe((node, index) => {
      if (node !== undefined) {
        const modalPortal: ModalPortal | undefined = R.path(["context", "$children", "0"], node);
        if (!modalPortal) {
          return undefined;
        }
        const title: string | undefined = (modalPortal as any).tabName;
        const order: number | undefined = (modalPortal as any).order;
        return {
          title: title || String(index),
          content: node,
          order: order || -1,
        };
      }
    }, this.passengers).sort((a, b) => b.order - a.order);
  }

  private get showModal(): boolean {
    return this.passengers.length > 0;
  }

  private close(index: number) {
    const modalPortal: ModalPortal | undefined = R.path([index, "context", "$children", "0"], this.passengers);
    modalPortal!.$emit("close");
  }

  private closeAll() {
    this.passengers.forEach(node => {
      const modalPortal: ModalPortal | undefined = R.path<ModalPortal | undefined>(["context", "$children", "0"], node);
      modalPortal!.$emit("close");
    });
  }
}
