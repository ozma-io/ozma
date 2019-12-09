import { boolean, withKnobs } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/vue";

import makeFormControl from "@/stories/utility/makeFormField";

import Calendar from "@/components/Calendar.vue";

storiesOf("Calendar", module)
  .addDecorator(withKnobs as any)
  .add("Default", () => {
    const FormField = makeFormControl(Calendar, "Calendar");
    return {
      props: {
        value: {
          type: Date,
          default: undefined,
        },
        bindProps: {
          type: Object,
          default: { showTime: boolean("Show Time", false)},
        },
      },
      components: { FormField },
      template: "<div class=\"input_container\"><FormField :bindProps=\"bindProps\" :value=\"value\" /></div>",
    } as any;
  });
