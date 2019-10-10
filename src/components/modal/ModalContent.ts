import Vue from "vue";
import { Component, Prop } from "vue-property-decorator";

@Component({ functional: true } as any)
export default class ModalContent extends Vue {
  @Prop() nodes!: any;

  render(_: any, ctx: any) {
    return ctx.props.nodes;
  }
}
