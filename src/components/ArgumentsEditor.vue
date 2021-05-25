<i18n>
  {
    "en": {
      "close": "Close",
      "apply": "Apply"
    },
    "ru": {
      "close": "Закрыть",
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
    <b-container class="arguments-editor-container pb-2">
      <b-row>
        <b-col
          v-for="(argument, id) in argumentList"
          :key="id"
          :sm="6"
          class="mt-2"
        >
          <FormControl
            :value="{ value: argument.value, info: argument.info.type.type === 'reference' ? dummyReferenceValueInfo : dummyValueInfo }"
            :type="argument.info.type"
            :caption="argument.info.name"
            :scope="'no-scope'"
            :uv-args="dummyUvArgs"
            :level="0"
            @update="update(id, $event)"
          />
        </b-col>
        <b-col>
          <b-row class="mt-2">
            <b-col>
              <div class="float-right">
                <b-button
                  class="mr-3"
                  variant="outline-secondary"
                  @click="close"
                >
                  {{ $t("close") }}
                </b-button>
                <b-button
                  variant="primary"
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
import { Vue, Component } from "vue-property-decorator";

import { FieldType } from "ozma-api";

export type Parameter = {
  name: string;
  type: FieldType;
};

export type Argument = {
  value: any;
  info: Parameter;
};

const testArguments: Argument[] = [
  {
    value: 1,
    info: {
      name: "id",
      type: { type: "int" },
    },
  },
  {
    value: 2,
    info: {
      name: "id_2",
      type: { type: "int" },
    },
  },
  {
    value: "test",
    info: {
      name: "test_string",
      type: { type: "string" },
    },
  },
  /* {
   *   value: 0,
   *   info: {
   *     name: "reference",
   *     type: { type: "reference", entity: { schema: "IraTest", name: "organizations" } },
   *   },
   * }, */
];

@Component
export default class ArgumentsEditor extends Vue {
  private argumentList = testArguments;

  private get dummyUvArgs() {
    return { source: { type: "named", ref: { schema: "dummy", name: "dummy" } }, args: {} };
  }

  private get dummyValueInfo() {
    return { field: { type: "number" }, fieldRef: { name: "dummy", entity: { schema: "dummy", name: "dummy" } } };
  }

  private get dummyReferenceValueInfo() {
    return { id: 1, field: { fieldType: { type: "reference", entity: { schema: "IraTest", name: "organizations" } } }, fieldRef: { name: "id", entity: { schema: "IraTest", name: "organizations" } } };
  }

  private update(index: number, value: any) {
    this.argumentList[index].value = value;
  }

  private apply() {
    this.$emit("update", this.argumentList);
  }

  private close() {
    this.$emit("close");
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
