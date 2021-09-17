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
    @keyup.enter="applyIfChanged"
    @keyup.escape="close"
  >
    <div class="arguments-editor-container">
      <div class="argument-fields">
        <div
          v-for="(argument, name) in args"
          :key="name"
          class="argument-field-wrapper"
        >
          <FormControl
            :value="{ value: allValues[name] }"
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
            @update="update(name, $event)"
          />
        </div>

        <div class="buttons">
          <b-button
            v-if="canBeClosed"
            variant="outline-secondary"
            @click="close"
          >
            {{ $t("close") }}
          </b-button>
          <b-button
            variant="outline-danger"
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
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import moment, { MomentInput } from "moment";
import * as R from "ramda";

import { ArgumentName, AttributesMap, FieldType, IArgument } from "ozma-api";
import { objectMap } from "@/utils";
import { valueIsNull, valueToText } from "@/values";
import { IQuery } from "@/state/query";

const getValue = (parameter: IArgument, value: unknown) => {
  if (!valueIsNull(value) && (parameter.argType.type === "date" || parameter.argType.type === "datetime")) {
    return moment(value as MomentInput);
  }
  return value;
};

interface IArgumentExtra {
  referenceEntriesView?: IQuery;
}

interface ILocalArgument {
  value: any;
  defaultValue: any;
  caption: string;
  type: FieldType;
  isOptional: boolean;
  extra: AttributesMap;

}

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

  private get args(): Record<string, ILocalArgument> {
    return objectMap((parameter, name) => {
      const value = getValue(parameter, this.argumentValues[name]) ?? parameter.defaultValue;
      const hasCaption = parameter.attributes["caption"] !== undefined;
      const caption = hasCaption ? valueToText(parameter.attributeTypes["caption"], parameter.attributes["caption"]) : name;
      const type = parameter.argType;
      const isOptional = parameter.optional || parameter.defaultValue !== undefined;

      return {
        value,
        defaultValue: parameter.defaultValue,
        caption,
        type,
        isOptional,
        extra: parameter.attributes,
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

  // Use this instead of `Vue.set(this.changedValues, namee, newValue)`
  private changeValue(name: string, newValue: any) {
    const oldValue = this.args[name].value;
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
      switch (this.argumentParams[name].argType.type) {
        case "int":
        case "decimal": {
          const maybeNumber = Number(value);
          if (Number.isFinite(maybeNumber)) {
            this.changeValue(name, maybeNumber);
          }
          break;
        }
        default:
          this.changeValue(name, value);
      }
    }
  }

  // Must be also called outside after save!
  reset() {
    this.changedValues = {};
  }

  private setDefaults() {
    for (const [name, arg] of Object.entries(this.args)) {
      if (valueIsNull(this.allValues[name]) && !valueIsNull(arg.defaultValue)) {
        this.update(name, arg.defaultValue);
      }
    }
  }

  private applyIfChanged() {
    if (this.hasChanges && !this.someRequiredFieldsAreEmpty) {
      this.apply();
    }
  }

  private apply() {
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
    padding: 0.5rem;
    border-bottom: 1px solid var(--default-backgroundDarker2Color);
  }

  .argument-fields {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .argument-field-wrapper {
    flex: 0 1 20rem; /* 11rem is just arbitrary fine-looking size */
    max-width: 20rem;
  }

  .buttons {
    height: fit-content;
    flex: 1 0;
    align-self: flex-end;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
</style>
