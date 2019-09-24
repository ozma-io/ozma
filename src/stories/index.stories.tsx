import { boolean, text, withKnobs } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/vue";

import Calendar from "../components/Calendar.vue";
import MultiSelect from "../components/multiselect/MultiSelect.vue";

import makeFormControl from "./utility/makeFormField";
import CustomSelect from "./components/CustomSelect.vue";

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

const testOptions = [
  {
    value: "fruit_lemon",
    label: "Lemon",
  },
  {
    value: "fruit_apple",
    label: "Apple",
  },
  {
    value: "vegetable_potato",
    label: "Potato",
  },
  {
    value: "fruit_tomato",
    label: "Tomato",
  },
  {
    value: "fruit_strawberry",
    label: "Strawberry",
  },
  {
    value: "fruit_blueberry",
    label: "Blueberry",
  },
  {
    value: "vegetable_carrot",
    label: "Carrot",
  },
  {
    value: "vegetable_cabbage",
    label: "Cabbage",
  },
  {
    value: "vegetable_radish",
    label: "Radish",
  },
];
storiesOf("MultiSelect", module)
  .addDecorator(withKnobs as any)
  .add("With multiple values", () => {
    const FormField = makeFormControl(MultiSelect, "MultiSelect");
    return {
      props: {
        value: {
          type: Array,
          default: ["fruit_lemon", "vegetable_potato"],
        },
        style: {
          type: Object,
          default: { width: text("Width of input field", "600px") },
        },
        bindProps: {
          type: Object,
          default: {
            options: testOptions,
            height:  text("Height (as passed in field options)", ""),
          },
        },
      },
      components: { FormField },
      template: "<div class=\"input_container\"><div :style=\"style\"><FormField :bindProps=\"bindProps\" :value=\"value\" /></div></div>",
    };
  })
  .add("With single value", () => {
    const FormField = makeFormControl(MultiSelect, "MultiSelect");
    return {
      props: {
        value: {
          type: String,
          default: "fruit_lemon",
        },
        style: {
          type: Object,
          default: { width: text("Width of input field", "600px") },
        },
        bindProps: {
          type: Object,
          default: {
            options: testOptions,
            single: true,
            height:  text("Height (as passed in field options)", ""),
          },
        },
      },
      components: { FormField },
      template: "<div class=\"input_container\"><div :style=\"style\"><FormField :bindProps=\"bindProps\" :value=\"value\" /></div></div>",
    };
  })
  .add("With Custom Option and Value (Single)", () => {
    const FormField = makeFormControl(CustomSelect, "CustomSelect");
    return {
      props: {
        value: {
          type: String,
          default: "user_a",
        },
        style: {
          type: Object,
          default: { width: text("Width of input field", "600px") },
        },
        bindProps: {
          type: Object,
          default: {
            options: testOptions,
            single: true,
            height:  text("Height (as passed in field options)", ""),
          },
        },
      },
      components: { FormField },
      template: "<div class=\"input_container\"><div :style=\"style\"><FormField :bindProps=\"bindProps\" :value=\"value\" /></div></div>",
    };
  })
  .add("With Custom Option and Value (Multiple)", () => {
    const FormField = makeFormControl(CustomSelect, "CustomSelect");
    return {
      props: {
        value: {
          type: Array,
          default: ["user_a", "user_f"],
        },
        style: {
          type: Object,
          default: { width: text("Width of input field", "600px") },
        },
        bindProps: {
          type: Object,
          default: {
            options: testOptions,
            height:  text("Height (as passed in field options)", ""),
          },
        },
      },
      components: { FormField },
      template: "<div class=\"input_container\"><div :style=\"style\"><FormField :bindProps=\"bindProps\" :value=\"value\" /></div></div>",
    };
  });
/*  */
