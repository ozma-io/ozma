<i18n>
  {
    "en": {
      "close": "Close",
      "reset": "Reset changes",
      "apply": "Apply"
    },
    "ru": {
      "close": "Закрыть",
      "reset": "Сбросить изменения",
      "apply": "Применить"
    }
  }
</i18n>

<template>
  <div
    class="arguments-editor"
    @keyup.enter="apply"
    @keyup.escape="close"
  >
    <b-container :fluid="hasManyArguments" class="arguments-editor-container pb-2">
      <b-row>
        <b-col
          v-for="(argument, name, index) in args"
          :key="index"
          :sm="hasManyArguments ? 4 : 6"
          class="mt-2"
        >
          <FormControl
            :value="{ value: allValues[name] }"
            :type="argument.type"
            :caption="argument.caption"
            :scope="mockScope"
            :uv-args="mockUvArgs"
            :level="0"
            :forced-field-type="argument.type"
            :forced-is-nullable="argument.isOptional"
            @update="update(name, $event)"
          />
        </b-col>
        <b-col>
          <b-row class="mt-2">
            <b-col>
              <div class="float-right">
                <b-button
                  v-if="canBeClosed"
                  class="mr-3"
                  variant="outline-secondary"
                  @click="close"
                >
                  {{ $t("close") }}
                </b-button>
                <b-button
                  variant="outline-danger"
                  class="mr-3"
                  :disabled="!hasChanges"
                  @click="reset"
                >
                  {{ $t("reset") }}
                </b-button>
                <b-button
                  variant="primary"
                  :disabled="!hasChanges || someRequiredFieldsAreEmpty"
                  @click="apply"
                >
                  {{ $t("apply") }}
                </b-button>
              </div>
            </b-col>
          </b-row>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import moment, { MomentInput } from "moment";

import { ArgumentName, IArgument } from "ozma-api";
import { objectMap } from "@/utils";
import { valueIsNull, valueToText } from "@/values";

const getValue = (parameter: IArgument, value: unknown) => {
  if (parameter.argType.type === "date" || parameter.argType.type === "datetime") {
    return moment(value as MomentInput);
  }
  return value;
};

@Component
export default class ArgumentEditor extends Vue {
  @Prop({ type: Object, required: true }) argumentParams!: Record<ArgumentName, IArgument>;
  @Prop({ type: Object, required: true }) argumentValues!: Record<string, unknown>;
  @Prop({ type: Boolean, default: true }) canBeClosed!: boolean;

  private changedValues: Record<string, unknown> = {};

  private get hasChanges() {
    return Object.keys(this.changedValues).length !== 0;
  }

  private get hasManyArguments() {
    return Object.keys(this.argumentParams).length > 3;
  }

  private get args() {
    return objectMap((parameter, name) => {
      const value = getValue(parameter, this.argumentValues[name]) ?? parameter.defaultValue;
      const hasCaption = parameter.attributes["caption"] !== undefined;
      const caption = hasCaption ? valueToText(parameter.attributeTypes["caption"], parameter.attributes["caption"]) : name;
      return {
        value,
        defaultValue: parameter.defaultValue,
        caption,
        type: parameter.argType,
        isOptional: parameter.optional || parameter.defaultValue !== undefined,
      };
    }, this.argumentParams);
  }

  private get allValues() {
    const previousValues = objectMap(arg => arg.value, this.args);
    return { ...previousValues, ...this.changedValues };
  }

  private get someRequiredFieldsAreEmpty() {
    return Object.entries(this.args).some(([name, arg]) => !arg.isOptional && valueIsNull(this.allValues[name]));
  }

  private mockScope = "mock_scope";

  private mockUvArgs = { source: { type: "named", ref: { schema: "mock_schema", name: "mock_name" } }, args: {} };

  private update(name: string, value: any) {
    const type = this.argumentParams[name].argType.type;
    const typedValue = (type === "int" || type === "decimal")
      ? Number(value)
      : value;
    Vue.set(this.changedValues, name, typedValue);
  }

  private reset() {
    this.changedValues = {};
  }

  private setDefaults() {
    for (const [name, arg] of Object.entries(this.args)) {
      if (valueIsNull(this.allValues[name]) && !valueIsNull(arg.defaultValue)) {
        this.update(name, arg.defaultValue);
      }
    }
  }

  private apply() {
    this.setDefaults();
    this.$emit("update", this.allValues);
    this.reset();
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
    padding: 0.5rem 0;
  }

  .arguments-editor-container {
    border-bottom: 1px solid var(--default-backgroundDarker2Color);
  }
</style>
