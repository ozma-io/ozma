import Vue from "vue";
import VueJSModal from "vue-js-modal";
import { storiesOf } from "@storybook/vue";
import { boolean, text, number, withKnobs } from "@storybook/addon-knobs";

import Modal from "@/components/modal/Modal.vue";
import ModalWithTabs from "@/stories/components/ModalWithTabs";

Vue.use(VueJSModal, { componentName: "VueModal" });

storiesOf("Modal", module)
  .addDecorator(withKnobs as any)
  .add("Simple modal", () => {
    return {
      props: {
        isOpen: {
          type: Boolean,
          default: boolean("Is this modal Open?", true),
        },
        beforeClose: {
          type: Function,
          default: (evt: any) => console.log(evt),
        },
      },
      components: { Modal },
      template: "<Modal @modal:beforeClose=\"beforeClose\" :isOpen=\"isOpen\"><template v-slot:content><div>I'm a teapot</div></template></Modal>",
    };
  })
  .add("Modal with tabs", () => {
    return {
      props: {
        isOpen: {
          type: Boolean,
          default: boolean("Is this modal Open?", true),
        },
      },
      components: { ModalWithTabs },
      template: "<ModalWithTabs :isOpen=\"isOpen\" />",
    };
  });
