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
    @keyup.enter="applyIfChanged"
    @keyup.escape="close"
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
              :value="{ value: allValues[argument.name] }"
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
              @update="update(argument.name, $event)"
            />
          </b-col>
        </b-row>
      </b-container>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import moment, { MomentInput } from "moment";
import * as R from "ramda";

import { ArgumentName, AttributesMap, FieldType, IArgument } from "ozma-api";
import { valueIsNull, valueToText, valueFromRaw } from "@/values";

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
  @Prop({ type: Object, required: true }) argumentValues!: Record<string, unknown>;

  private changedValues: Record<string, unknown> = {};

  private get hasChanges() {
    return Object.keys(this.changedValues).length !== 0;
  }

  private get hasManyArguments() {
    return Object.keys(this.argumentParams).length > 3;
  }

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

  private get allValues() {
    const previousValues = Object.fromEntries(this.args.map(arg => [arg.name, arg.value]));
    return { ...previousValues, ...this.changedValues };
  }

  private get someRequiredFieldsAreEmpty() {
    return this.args.some(arg => !arg.isOptional && valueIsNull(this.allValues[arg.name]));
  }

  private mockScope = "mock_scope";

  private mockUvArgs = { source: { type: "named", ref: { schema: "mock_schema", name: "mock_name" } }, args: {} };

  // Use this instead of `Vue.set(this.changedValues, name, newValue)`
  private changeValue(name: string, newValue: any) {
    const oldValue = this.args.find(arg => arg.name === name)!.value;
    if (valueIsNull(oldValue) && valueIsNull(newValue)) {
      Vue.delete(this.changedValues, name);
    } else {
      const type = this.argumentParams[name].argType.type;
      switch (type) {
        case "date":
        case "datetime":
          if (moment.isMoment(oldValue) && moment.isMoment(newValue) && oldValue.isSame(newValue)) {
            Vue.delete(this.changedValues, name);
            return;
          }
          break;
        case "array":
          if (R.equals(newValue, oldValue)) {
            Vue.delete(this.changedValues, name);
            return;
          }
          break;
        default:
          if (newValue === oldValue) {
            Vue.delete(this.changedValues, name);
            return;
          }
      }
      Vue.set(this.changedValues, name, newValue);
    }
  }

  private update(name: string, value: any) {
    if (valueIsNull(value)) {
      this.changeValue(name, null);
    } else {
      const argumentParams = this.argumentParams[name];
      const fieldInfo = {
        fieldType: argumentParams.argType,
        isNullable: argumentParams.optional,
      };
      const transformed = valueFromRaw(fieldInfo, value);
      if (transformed !== undefined) {
        this.changeValue(name, valueFromRaw(fieldInfo, value));
      }
    }
  }

  // Must be also called outside after save!
  reset() {
    this.changedValues = {};
  }

  private setDefaults() {
    for (const arg of this.args) {
      if (valueIsNull(this.allValues[arg.name]) && !valueIsNull(arg.defaultValue)) {
        this.update(arg.name, arg.defaultValue);
      }
    }
  }

  private applyIfChanged() {
    if (this.hasChanges && !this.someRequiredFieldsAreEmpty) {
      this.apply();
    }
  }

  apply() {
    this.setDefaults();
    this.$emit("update", this.allValues);
  }

  private close() {
    this.reset();
    this.$emit("close");
  }

  @Watch("changedValues")
  private emitChangedValues() {
    this.$emit("update:hasChangedValues", this.hasChanges);
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
