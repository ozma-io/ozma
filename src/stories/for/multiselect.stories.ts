import { storiesOf } from "@storybook/vue";
import { boolean, text, number, withKnobs } from "@storybook/addon-knobs";

import makeFormControl from "../utility/makeFormField";

import CustomSelect from "../components/CustomSelect.vue";
import MultiSelect from "../../components/multiselect/MultiSelect.vue";
import testOptions from "./multiselectOptions";

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
            height:  number("Height (as passed in field options)", 0),
            disabled:  boolean("Disable", false),
            required:  boolean("Required", false),
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
            height:  number("Height (as passed in field options)", 0),
            disabled:  boolean("Disable", false),
            required:  boolean("Required", false),
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
            height:  number("Height (as passed in field options)", 0),
            disabled:  boolean("Disable", false),
            required:  boolean("Required", false),
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
            height:  number("Height (as passed in field options)", 0),
            disabled:  boolean("Disable", false),
            required:  boolean("Required", false),
          },
        },
      },
      components: { FormField },
      template: "<div class=\"input_container\"><div :style=\"style\"><FormField :bindProps=\"bindProps\" :value=\"value\" /></div></div>",
    };
  })
  .add("Single with boolean value", () => {
      const FormField = makeFormControl(MultiSelect, "MultiSelect");
      return {
          props: {
              value: {
                  type: Array,
                  default: false,
              },
              style: {
                  type: Object,
                  default: { width: text("Width of input field", "600px") },
              },
              bindProps: {
                  type: Object,
                  default: {
                      options: [{ value: false, label: "Нет" }, { value: true, label: "Да" }],
                      height:  number("Height (as passed in field options)", 0),
                      single: true,
                      disabled:  boolean("Disable", false),
                      required:  boolean("Required", false),
                  },
              },
          },
          components: { FormField },
          template: "<div class=\"input_container\"><div :style=\"style\"><FormField :bindProps=\"bindProps\" :value=\"value\" /></div></div>",
      };
  })
  .add("Empty Option", () => {
      const FormField = makeFormControl(MultiSelect, "MultiSelect");
      const noValueOptions = [{ value: "raw_value", label: "" }, { value: 6 }, { value: "has_label", label: "This one has label" }];
      return {
          props: {
              value: {
                  type: Array,
                  default: null,
              },
              style: {
                  type: Object,
                  default: { width: text("Width of input field", "600px") },
              },
              noValueOptions: {
                  type: Object,
                  default: JSON.stringify(noValueOptions),
              },
              bindProps: {
                  type: Object,
                  default: {
                      options: noValueOptions,
                      height:  number("Height (as passed in field options)", 0),
                      single: true,
                      disabled:  boolean("Disable", false),
                      required:  boolean("Required", false),
                  },
              },
          },
          components: { FormField },
        template: "<div><span>{{(noValueOptions)}}</span><div class=\"input_container\"><div :style=\"style\"><FormField :bindProps=\"bindProps\" :value=\"value\" /></div></div></div>",
      };
  });
