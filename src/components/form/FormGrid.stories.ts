
import { boolean, text, withKnobs } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/vue";

import makeFormControl from "@/stories/utility/makeFormField";

import FormGrid from "@/components/form/FormGrid.vue";
import { IGridInputInfoTopLevel } from "@/components/form/types";

const exampleFormGrid: IGridInputInfoTopLevel[] = [
  {
    type: "section",
    size: 4,
    content: [
      { type: "text", label: "Название", value: "", size: 12 },
      { type: "text", label: "Руководитель", value: "", size: 12 },
      { type: "textarea", label: "Люди", value: "", size: 12 },
    ],
  },
  {
    type: "section",
    size: 4,
    content: [
      { type: "text", label: "Веб-сайт", value: "", size: 12 },
      { type: "text", label: "Email", value: "", size: 12 },
      { type: "textarea", label: "Адрес", value: "", size: 12 },
    ],
  },
  { type: "textarea", label: "Заметки", value: "", size: 4 },
  { type: "text", label: "Очень длинное название поля чтобы не влезало", value: "", size: 4 },
  { type: "text", label: "Поле 1", value: "", size: 4 },
  { type: "text", label: "Поле 2", value: "", size: 4 },
  { type: "text", label: "Поле 3", value: "", size: 3 },
];

storiesOf("FormGrid", module)
  .addDecorator(withKnobs as any)
  .add("Default", () => {
    return {
      props: {
        gridContent: {
          type: Array,
          default: exampleFormGrid,
        },
        bindProps: {
          type: Object,
          default: {
            label: text("Label", "Textarea Field"),
            disabled: boolean("Disable Input", false),
          },
        },
      },
      components: { FormGrid },
      template: "<div style=\"width: 100%\"><FormGrid :gridContent=\"gridContent\" /></div>",
    } as any;
  });
