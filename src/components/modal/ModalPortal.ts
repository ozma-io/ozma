import { mixins } from "vue-class-component";
import { Component, Prop } from "vue-property-decorator";
import { Portal } from "portal-vue";

import { IModalTabsProp } from "@/components/modal/types";
import Modal from "@/components/modal/Modal.vue";

@Component
export default class ModalPortal extends mixins(Portal) {
    @Prop({ type: String }) tabName!: string;
    @Prop({ type: Function }) onModalClose!: () => void;
}
