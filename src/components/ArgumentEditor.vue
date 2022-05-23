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
    @keyup.escape="$emit('clear')"
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
              :value="values[argument.name] ?? null"
              :is-nullable="argument.isOptional"
              :field-type="argument.fieldType"
              :type="argument.valueType"
              :attributes="argument.attributes"
              :attribute-mappings="argument.attributeMappings"
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
import { fieldToValueType, valueIsNull, valueToText } from "@/values";
import FormControl from "@/components/FormControl.vue";
import { ConvertedBoundAttributesMap } from "@/user_views/combined";

interface IArgumentInfo {
  name: ArgumentName;
  defaultValue: any;
  caption: string;
  fieldType: FieldType;
  valueType: ValueType;
  isOptional: boolean;
  attributes: AttributesMap;
  attributeMappings: ConvertedBoundAttributesMap;
  dirtyHackOrder: number;
}

@Component({ components: { FormControl } })
export default class ArgumentEditor extends Vue {
  @Prop({ type: Array, required: true }) params!: IArgument[];
  @Prop({ type: Object, required: true }) values!: Record<ArgumentName, unknown>;
  @Prop({ type: Object, required: true }) attributes!: Record<ArgumentName, AttributesMap>;
  @Prop({ type: Object, required: true }) attributeMappings!: Record<ArgumentName, ConvertedBoundAttributesMap>;
  @Prop({ type: String }) homeSchema!: string | undefined;

  private get args(): IArgumentInfo[] {
    const unsortedArgs: IArgumentInfo[] = this.params.map((parameter, parI) => {
      const attributes = this.attributes[parameter.name] ?? {};
      const attributeMappings = this.attributeMappings[parameter.name] ?? {};
      const rawCaption = attributes["caption"];
      const caption = rawCaption ? valueToText(parameter.attributeTypes["caption"].type, rawCaption) : parameter.name;
      const type = parameter.argType;
      const isOptional = parameter.optional || parameter.defaultValue !== undefined;

      let dirtyHackOrder = parI;
      const dirtyHackOrderRaw = attributes["dirty_hack_order"];
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
        attributes,
        attributeMappings,
      };
    });

    return unsortedArgs.sort((a, b) => a.dirtyHackOrder - b.dirtyHackOrder);
  }

  private updateArgument(argument: IArgumentInfo, rawValue: unknown) {
    if (argument.isOptional && valueIsNull(rawValue)) {
      this.$emit("reset", argument.name);
    } else {
      this.$emit("update", argument.name, rawValue);
    }
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
