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
    },
    "es": {
      "hide": "Ocultar",
      "reset": "Reinicear",
      "apply": " Aplicar"
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
import { fieldToValueType } from "@/values";
import FormControl from "@/components/FormControl.vue";
import { ConvertedBoundAttributesMap } from "@/user_views/combined";
import { UserString, rawToUserString } from "@/state/translations";

interface IArgumentInfo {
  name: ArgumentName;
  defaultValue: any;
  caption: UserString;
  fieldType: FieldType;
  valueType: ValueType;
  isOptional: boolean;
  attributes: AttributesMap;
  attributeMappings: ConvertedBoundAttributesMap;
}

@Component({ components: { FormControl } })
export default class ArgumentEditor extends Vue {
  @Prop({ type: Array, required: true }) params!: IArgument[];
  @Prop({ type: Object, required: true }) values!: Record<ArgumentName, unknown>;
  @Prop({ type: Object, required: true }) attributes!: Record<ArgumentName, AttributesMap>;
  @Prop({ type: Object, required: true }) attributeMappings!: Record<ArgumentName, ConvertedBoundAttributesMap>;
  @Prop({ type: String }) homeSchema!: string | undefined;

  private get args(): IArgumentInfo[] {
    return this.params.map(parameter => {
      const attributes = this.attributes[parameter.name] ?? {};
      const attributeMappings = this.attributeMappings[parameter.name] ?? {};
      const caption = rawToUserString(attributes["caption"]) ?? parameter.name;
      const type = parameter.argType;
      const isOptional = parameter.optional || parameter.defaultValue !== undefined;

      return {
        name: parameter.name,
        defaultValue: parameter.defaultValue,
        caption,
        fieldType: type,
        valueType: fieldToValueType(type),
        isOptional,
        attributes,
        attributeMappings,
      };
    });
  }

  private updateArgument(argument: IArgumentInfo, rawValue: unknown) {
    this.$emit("update", argument.name, rawValue);
  }
}
</script>

<style lang="scss" scoped>
.arguments-editor {
  min-height: 2rem;

  .arguments-editor-container {

    .container-fluid {
      padding: 0.5rem 0.5rem 0.5rem 0.5rem;
    }
  }
}
</style>
