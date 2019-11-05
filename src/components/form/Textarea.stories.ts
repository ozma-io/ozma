import { boolean, text, withKnobs } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/vue";

import makeFormControl from "@/stories/utility/makeFormField";

import Textarea from "@/components/form/Textarea.vue";

storiesOf("Textarea", module)
  .addDecorator(withKnobs as any)
  .add("Default", () => {
    const FormField = makeFormControl(Textarea, "Textarea");
    return {
      props: {
        bindProps: {
          type: Object,
          default: {
            label: text("Label", "Textarea Field"),
            disabled: boolean("Disable Input", false),
          },
        },
      },
      components: { FormField },
      template: "<div style=\"width: 500px\"><FormField :bindProps=\"bindProps\" :value=\"value\" /></div>",
    } as any;
  });
