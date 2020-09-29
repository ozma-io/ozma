import { mixins } from "vue-class-component";
import { Component, Prop } from "vue-property-decorator";
import { Portal } from "portal-vue";

@Component
export default class ModalPortal extends mixins(Portal) {
  @Prop({ type: String }) tabName!: string;
  @Prop({ type: Number, default: 0 }) order!: number;
  @Prop({ type: Boolean, default: false }) selected!: boolean;
}
