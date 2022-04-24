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
              :value="argumentValues[argument.name] ?? null"
              :is-nullable="argument.isOptional"
              :field-type="argument.fieldType"
              :type="argument.valueType"
              :attributes="argument.attributes"
              :caption="argument.caption"
              force-multiline
              compact-mode
              :home-schema="homeSchema"
              :level="0"
              @update="updateArgument(argument, $event)"
            />
          </b-col>
        </b-row>
      </b-container>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import { ArgumentName, AttributesMap, FieldType, IArgument, ValueType } from "ozma-api";
import { fieldToValueType, valueFromRaw, valueIsNull, valueToText } from "@/values";
import FormControl from "@/components/FormControl.vue";

interface IArgumentInfo {
  name: ArgumentName;
  defaultValue: any;
  caption: string;
  fieldType: FieldType;
  valueType: ValueType;
  isOptional: boolean;
  attributes: AttributesMap;
  dirtyHackOrder: number;
}

@Component({ components: { FormControl } })
export default class ArgumentEditor extends Vue {
  @Prop({ type: Array, required: true }) argumentParams!: IArgument[];
  @Prop({ type: Object, required: true }) argumentValues!: Record<ArgumentName, unknown>;
  @Prop({ type: String }) homeSchema!: string | undefined;

  private get args(): IArgumentInfo[] {
    const unsortedArgs: IArgumentInfo[] = this.argumentParams.map((parameter, parI) => {
      const hasCaption = parameter.attributes["caption"] !== undefined;
      const caption = hasCaption ? valueToText(parameter.attributeTypes["caption"], parameter.attributes["caption"]) : parameter.name;
      const type = parameter.argType;
      const isOptional = parameter.optional || parameter.defaultValue !== undefined;

      let dirtyHackOrder = parI;
      const dirtyHackOrderRaw = parameter.attributes["dirty_hack_order"];
      if (typeof dirtyHackOrderRaw === "number") {
        console.error("Deprecated attribute `dirty_hack_order`. Arguments order is now preserved as-is.");
        dirtyHackOrder = dirtyHackOrderRaw;
      }

      return {
        name: parameter.name,
        defaultValue: parameter.defaultValue,
        caption,
        fieldType: type,
        valueType: fieldToValueType(type),
        isOptional,
        dirtyHackOrder,
        attributes: parameter.attributes,
      };
    });

    return unsortedArgs.sort((a, b) => a.dirtyHackOrder - b.dirtyHackOrder);
  }

  private updateArgument(argument: IArgumentInfo, rawValue: unknown) {
    const value = valueFromRaw({ fieldType: argument.fieldType, isNullable: argument.isOptional }, rawValue);
    if (value === undefined) {
      return;
    }
    // Allow to reset arguments.
    const newValue = argument.isOptional && valueIsNull(rawValue) ? undefined : rawValue;
    this.$emit("update", argument.name, newValue);
  }
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
