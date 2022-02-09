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
              :value="argumentValues[argument.name]"
              :is-nullable="argument.isOptional"
              :field-type="argument.type"
              :type="argument.type"
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

import { ArgumentName, AttributesMap, FieldType, IArgument } from "ozma-api";
import { valueToText } from "@/values";
import FormControl from "@/components/FormControl.vue";

interface IArgumentInfo {
  name: string;
  defaultValue: any;
  caption: string;
  type: FieldType;
  isOptional: boolean;
  attributes: AttributesMap;
  dirtyHackOrder: number; // Arguments come alphabet-sorted from backend.
}

@Component({ components: { FormControl } })
export default class ArgumentEditor extends Vue {
  @Prop({ type: Object, required: true }) argumentParams!: Record<ArgumentName, IArgument>;
  @Prop({ type: Object, required: true }) argumentValues!: Record<ArgumentName, unknown>;
  @Prop({ type: String }) homeSchema!: string | undefined;

  private get args(): IArgumentInfo[] {
    const unsortedArgs: IArgumentInfo[] = Object.entries(this.argumentParams).map(([name, parameter]) => {
      const hasCaption = parameter.attributes["caption"] !== undefined;
      const caption = hasCaption ? valueToText(parameter.attributeTypes["caption"], parameter.attributes["caption"]) : name;
      const type = parameter.argType;
      const isOptional = parameter.optional || parameter.defaultValue !== undefined;
      const dirtyHackOrderRaw = parameter.attributes["dirty_hack_order"];
      const dirtyHackOrder = typeof dirtyHackOrderRaw === "number" ? dirtyHackOrderRaw : 0;

      return {
        name,
        defaultValue: parameter.defaultValue,
        caption,
        type,
        isOptional,
        dirtyHackOrder,
        attributes: parameter.attributes,
      };
    }, this.argumentParams);

    return unsortedArgs.sort((a, b) => a.dirtyHackOrder - b.dirtyHackOrder);
  }

  private updateArgument(argument: IArgumentInfo, value: unknown) {
    // Allow to reset arguments.
    const newValue = argument.isOptional && value === null ? undefined : value;
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
