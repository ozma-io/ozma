import { boolean, text, withKnobs } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/vue";

import makeFormControl from "@/stories/utility/makeFormField";

import Input from "@/components/form/Input.vue";

storiesOf("Input", module)
  .addDecorator(withKnobs as any)
  .add("Default", () => {
    const FormField = makeFormControl(Input, "Input");
    return {
      props: {
        value: {
          type: Date,
          default: undefined,
        },
        bindProps: {
          type: Object,
          default: {
            label: text("Label", "Input Field"),
            disabled: boolean("Disable Input", false),
            inline: boolean("Inline Label", true),
          },
        },
      },
      components: { FormField },
      template: "<div style=\"padding: 50px; border: 1px solid red;\"><FormField :bindProps=\"bindProps\" :value=\"value\" /></div>",
    } as any;
  });
