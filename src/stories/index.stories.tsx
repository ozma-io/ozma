import { storiesOf } from "@storybook/vue";
import { withKnobs, boolean, date } from "@storybook/addon-knobs";
import moment from "moment";

import {dateFormat, dateTimeFormat} from "@/values";
import makeFormControl from "./utility/makeFormField";
import Calendar from "../components/Calendar.vue";

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
      template: "<FormField :bindProps=\"bindProps\" :value=\"value\" />",
    } as any;
  });
