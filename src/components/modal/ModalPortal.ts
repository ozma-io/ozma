import { mixins } from "vue-class-component";
import { Component, Prop } from "vue-property-decorator";
import { Portal } from "portal-vue";
import type { IQuery } from "@/state/query";

@Component
export default class ModalPortal extends mixins(Portal) {
  @Prop({ type: String }) tabName!: string;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Object, required: true }) view!: IQuery;
}
