import { storiesOf } from "@storybook/vue";
import { withKnobs } from "@storybook/addon-knobs";
import Checkbox from "@/components/checkbox/Checkbox.vue";

storiesOf("Checkbox Component", module)
  .addDecorator(withKnobs as any)
  .add("Simple checkbox", () => {
    return {
      components: { Checkbox },
      data: () => {
        return {
          checked: false,
        };
      },
      template: "<div style='padding: 20px; background: #fff'>" +
                "<checkbox v-model='checked' label='Label'/>" +
                "</div>",
    };
  })
  .add("Without label checkbox", () => {
    return {
      components: { Checkbox },
      data: () => {
        return {
          checked: false,
        };
      },
      template: "<div style='padding: 20px; background: #fff'>" +
                "<checkbox v-model='checked'/>" +
                "</div>",
    };
  });
