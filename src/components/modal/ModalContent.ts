import Vue, { VNode } from "vue";

export default Vue.extend({
  name: "ModalContent",
  functional: true,
  props: {
    // eslint-disable-next-line vue/require-prop-types
    content: { },
  },
  render: (createElement, ctx) => {
    return ctx.props.content as VNode | VNode[];
  },
});
