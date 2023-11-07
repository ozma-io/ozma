<i18n>
  {
    "en": {
      "filters": "Filters",
      "hide": "Hide",
      "reset": "Reset",
      "apply": "Apply"
    },
    "ru": {
      "filters": "Фильтры",
      "hide": "Скрыть",
      "reset": "Сбросить",
      "apply": "Применить"
    },
    "es": {
      "filters": "Filtros",
      "hide": "Ocultar",
      "reset": "Reinicear",
      "apply": " Aplicar"
    }
  }
</i18n>

<template>
  <ModalWindow
    adaptive
    transition="none"
    height="auto"
    :shiftX="0.98"
    :shiftY="0.2"
    class="filters-modal"
    :width="modalWidth"
    :name="uid"
  >
    <div
      class="arguments-editor"
      @keyup.enter="apply"
      @keyup.escape="$emit('clear')"
    >
      <div class="header">
        <div class="left">
          <i class="material-icons">tune</i>
          <div class="title">
            {{ $t("filters").toString() }}
          </div>
        </div>
        <div class="right">
          <ButtonItem :button="closeButton" />
        </div>
      </div>

      <b-container fluid>
        <b-row class="no-gutters">
          <b-col
            v-for="argument in args"
            :key="argument.name"
            cols="12"
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

      <div class="footer">
        <b-button
          block
          variant="primary"
          class="apply-button"
          @click="apply"
        >
          {{ $t("apply") }}
        </b-button>
      </div>
    </div>
  </ModalWindow>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import { ArgumentName, AttributesMap, FieldType, IArgument, ValueType } from "ozma-api";
import { fieldToValueType } from "@/values";
import FormControl from "@/components/FormControl.vue";
import { ConvertedBoundAttributesMap } from "@/user_views/combined";
import { UserString, rawToUserString } from "@/state/translations";
import { interfaceButtonVariant } from "@/utils_colors";
import { Button } from "./buttons/buttons";
import ButtonItem from "./buttons/ButtonItem.vue";
import ModalWindow from "./modal/ModalWindow.vue";

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

@Component({ components: { FormControl, ButtonItem, ModalWindow } })
export default class ArgumentEditor extends Vue {
  @Prop({ type: Array, required: true }) params!: IArgument[];
  @Prop({ type: Object, required: true }) values!: Record<ArgumentName, unknown>;
  @Prop({ type: Object, required: true }) attributes!: Record<ArgumentName, AttributesMap>;
  @Prop({ type: Object, required: true }) attributeMappings!: Record<ArgumentName, ConvertedBoundAttributesMap>;
  @Prop({ type: String }) homeSchema!: string | undefined;

  show() {
    this.$modal.show(this.uid);
  }

  hide() {
    this.$modal.hide(this.uid);
  }

  apply() {
    this.hide();
    this.$emit("apply");
  }

  private get modalWidth() {
    return this.$isMobile ? "100%" : "300px";
  }

  private get modalHeight() {
    return this.$isMobile ? "95%" : "600px";
  }

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

  private get closeButton(): Button {
    return {
      type: "callback",
      icon: "close",
      variant: interfaceButtonVariant,
      callback: () => this.$emit("close"),
    };
  }
}
</script>

<style lang="scss" scoped>
.arguments-editor {
  height: 100%;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  .header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    .left {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.375rem;

      .title {
        font-weight: 600;
      }
    }
  }

  .container-fluid {
    padding: 0;
    overflow: auto;

    ::v-deep .col-12 {
      padding: 0;
    }
  }
}

.apply-button {
  border-radius: 1rem;
}

.filters-modal ::v-deep > .vm--modal {
  border-radius: 1.25rem;
}
</style>
