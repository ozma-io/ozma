import Vue from "vue";
import { Prop, Component } from "vue-property-decorator";

import { IModalTab } from "@/components/modal/types";
import Modal from "@/components/modal/Modal.vue";

@Component
export default class ModalWithTabs extends Vue {
  @Prop({ type: Boolean }) isOpen!: boolean;

  render(createElement: any) {
    const tabs = this.getModalTabs(createElement);
    return createElement(Modal,  { props: {
      isOpen: this.isOpen,
      modalTabs: tabs,
      on: { "modal:beforeClose": (evt: any) => console.log(evt) }, // eslint-disable-line
    } });
  }
  private getModalTabs(createElement: (...args: any) => any): IModalTab[] {
    return [
      { title: "Yes", content: createElement("div", "First Tab") },
      { title: "No", content: createElement("div", "Second Tab") },
    ];
  }
}
