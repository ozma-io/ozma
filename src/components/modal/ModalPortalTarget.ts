import { mixins } from "vue-class-component";
import { Component, Vue } from "vue-property-decorator";
import { PortalTarget, Wormhole } from "portal-vue";

import { IModalTabsProp } from "@/components/modal/types";
import Modal from "@/components/modal/Modal.vue";

@Component
export default class ModalPortalTarget extends mixins(PortalTarget) {

  private get modalTabsObject(): IModalTabsProp {
    // return this.passengers.reduce((acc, node, index) => ({
    //   ...acc,
    //   [index]: { title: index, content: node }
    // }), {})
    console.log(this.passengers);
    return this.passengers.reduce((acc, node, index) => {
      return { ...acc, [index]: { title: index, content: node }};
    }, {});
  }

  private get isModalOpen(): boolean {
    return this.passengers.length > 0;
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
    Wormhole.close({ to: this.name }, true);
  }
}
