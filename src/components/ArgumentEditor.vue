<i18n>
  {
    "en": {
      "hide": "Hide",
      "reset": "Reset",
      "apply": "Apply"
    },
    "ru": {
      "hide": "Скрыть",
      "reset": "Сбросить",
      "apply": "Применить"
    }
  }
</i18n>

<template>
  <div
    class="arguments-editor"
    @keyup.enter="$emit('apply')"
    @keyup.escape="$emit('reset')"
  >
    <div class="arguments-editor-container">
      <b-container fluid>
        <b-row class="sm-gutters">
          <b-col
            v-for="argument in args"
            :key="argument.name"
            cols="12"
            sm="6"
            md="6"
            lg="4"
            xl="2"
          >
            <FormControl
              :value="{ value: argumentValues[argument.name] }"
              :type="argument.type"
              :attributes="argument.extra"
              :caption="argument.caption"
              force-multiline
              compact-mode
              :scope="mockScope"
              :uv-args="mockUvArgs"
              :level="0"
              :forced-field-type="argument.type"
              :forced-is-nullable="argument.isOptional"
              @update="$emit('update', argument.name, $event)"
            />
          </b-col>
        </b-row>
      </b-container>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import moment, { MomentInput } from "moment";

import { ArgumentName, AttributesMap, FieldType, IArgument } from "ozma-api";
import { valueIsNull, valueToText } from "@/values";

const getValue = (parameter: IArgument, value: unknown) => {
  if (!valueIsNull(value) && (parameter.argType.type === "date" || parameter.argType.type === "datetime")) {
    return moment(value as MomentInput);
  }
  return value;
};

interface ILocalArgument {
  name: string;
  value: any;
  defaultValue: any;
  caption: string;
  type: FieldType;
  isOptional: boolean;
  extra: AttributesMap;
  dirtyHackOrder: number; // Arguments come alphabet-sorted from backend.
}

@Component
export default class ArgumentEditor extends Vue {
  @Prop({ type: Object, required: true }) argumentParams!: Record<ArgumentName, IArgument>;
  @Prop({ type: Object, required: true }) argumentValues!: Record<ArgumentName, unknown>;

  private get args(): ILocalArgument[] {
    const unsortedArgs: ILocalArgument[] = Object.entries(this.argumentParams).map(([name, parameter]) => {
      const value = getValue(parameter, this.argumentValues[name]) ?? parameter.defaultValue;
      const hasCaption = parameter.attributes["caption"] !== undefined;
      const caption = hasCaption ? valueToText(parameter.attributeTypes["caption"], parameter.attributes["caption"]) : name;
      const type = parameter.argType;
      const isOptional = parameter.optional || parameter.defaultValue !== undefined;
      const dirtyHackOrderRaw = parameter.attributes["dirty_hack_order"];
      const dirtyHackOrder = typeof dirtyHackOrderRaw === "number" ? dirtyHackOrderRaw : 0;

      return {
        name,
        value,
        defaultValue: parameter.defaultValue,
        caption,
        type,
        isOptional,
        dirtyHackOrder,
        extra: parameter.attributes,
      };
    }, this.argumentParams);

    return unsortedArgs.sort((a, b) => a.dirtyHackOrder - b.dirtyHackOrder);
  }

  private mockScope = "mock_scope";

  private mockUvArgs = { source: { type: "named", ref: { schema: "mock_schema", name: "mock_name" } }, args: {} };
}
</script>

<style lang="scss" scoped>
  .arguments-editor {
    min-height: 2rem;
    background-color: var(--default-backgroundDarker1Color);
  }

  .arguments-editor-container {
    padding: 0.5rem 0 1rem 0;
    border-bottom: 1px solid var(--default-backgroundDarker2Color);
  }
</style>
