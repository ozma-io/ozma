import Vue, { VNode } from "vue";

export default Vue.extend({
  name: "ModalContent",
  functional: true,
  props: {
    nodes: {},
  },
  render: (createElement, ctx) => {
    return ctx.props.nodes as VNode[];
  }
});
