import { boolean, withKnobs } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/vue";

import CardWrapper from "@/stories/components/kanban/CardWrapper.vue";
import ColumnWrapper from "@/stories/components/kanban/ColumnWrapper.vue";
import BoardWrapper from "@/stories/components/kanban/BoardWrapper.vue";

storiesOf("Kanban", module)
  .addDecorator(withKnobs as any)
  .add("Card", () => {
    return {
      components: { CardWrapper },
      template: "<div><CardWrapper /></div>",
    };
  })
  .add("Column", () => {
    return {
      components: { ColumnWrapper },
      template: "<div><ColumnWrapper /></div>",
    };
  })
  .add("Board", () => {
    return {
      components: { BoardWrapper },
      template: "<div><BoardWrapper /></div>",
    };
  });
