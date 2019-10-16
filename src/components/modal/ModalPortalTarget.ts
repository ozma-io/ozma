import * as R from 'ramda';
import Vue, { VNode } from 'vue';
import { mixins } from "vue-class-component";
import { Component } from "vue-property-decorator";
import { PortalTarget, Wormhole } from "portal-vue";

import { IModalTabsProp } from "@/components/modal/types";
import Modal from "@/components/modal/Modal.vue";
import ModalPortal from "@/components/modal/ModalPortal.vue";

export const modalPortalBus = new Vue();

@Component
export default class ModalPortalTarget extends mixins(PortalTarget) {

  private get modalTabsObject(): IModalTabsProp {
    return this.passengers.reduce((acc, node, index) => {
      if (node !== undefined) {
        return { ...acc, [index]: {
          title: this.getTabName(node, String(index)),
          content: node,
          uid: this.getTabUid(node),
        }};
      }
      return acc;
    }, {});
  }

  private mounted() {
    modalPortalBus.$on("modalPortal:tabClose", this.onModalTabClose);
  }

  private onModalTabClose(uid: string) {
  }

  private get isModalOpen(): boolean {
    return this.passengers.length > 0;
  }

  private getTabUid(node: VNode): string | null {
    const modalPortal: ModalPortal | undefined = R.path<ModalPortal | undefined>(['context', '$children', '0'], node);
    if (modalPortal) {
      const uid: string | undefined = (modalPortal as any).uid;
      return uid || null;
    }
    return null;
  }

  private getTabName(node: VNode, fallback: string): string {
    const modalPortal: ModalPortal | undefined = R.path<ModalPortal | undefined>(['context', '$children', '0'], node);
    if (modalPortal) {
      const title: string | undefined = (modalPortal as any).tabName;
      return title || fallback;
    }
    return fallback;
  }

  render(createElement: any) {
    const props = {
      modalTabs: this.modalTabsObject,
      isOpen: this.isModalOpen,
      width: "85%",
      height: "85%",
      beforeClose: () => this.clearTransports(),
    };
    return createElement(Modal, { props });
  }

  private clearTransports() {
    this.passengers.forEach((node) => {
      const modalPortal: ModalPortal | undefined = R.path<ModalPortal | undefined>(['context', '$children', '0'], node);
      if (modalPortal) {
        const onModalClose: () => void = (modalPortal as any).onModalClose;
        if (onModalClose) {
          onModalClose();
        }
      }
    })
    Wormhole.close({ to: this.name }, true);
  }
}
