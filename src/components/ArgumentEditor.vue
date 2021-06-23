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
          v-for="(argument, name, index) in argumentsObj"
          :key="index"
          :sm="6"
          class="mt-2"
        >
          <FormControl
            :value="{ value: null }"
            :type="argument.argType"
            :caption="name"
            :scope="mockScope"
            :uv-args="mockUvArgs"
            :level="0"
            :forced-field-type="argument.argType"
            @update="update(index, $event)"
          />
        </b-col>
        <b-col>
          <b-row class="mt-2">
            <b-col>
              <div class="float-right">
                <b-button
                  class="mr-3"
                  size="sm"
                  variant="outline-secondary"
                  @click="close"
                >
                  {{ $t("close") }}
                </b-button>
                <b-button
                  size="sm"
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
import { Vue, Component, Prop } from "vue-property-decorator";

import { ArgumentName, FieldType, IArgument } from "ozma-api";
import { serializeValue } from "@/state/staging_changes";

/* export type Parameter = {
 *   name: string;
 *   type: FieldType;
 * };
 *
 * export type Argument = {
 *   value: any;
 *   info: Parameter;
 * };
 *
 * const testArguments: Argument[] = [
 *   {
 *     value: 1,
 *     info: {
 *       name: "test_int",
 *       type: { type: "int" },
 *     },
 *   },
 *   {
 *     value: 2,
 *     info: {
 *       name: "id_2",
 *       type: { type: "int" },
 *     },
 *   },
 *   {
 *     value: "test",
 *     info: {
 *       name: "test_string",
 *       type: { type: "string" },
 *     },
 *   },
 *   {
 *     value: 1,
 *     info: {
 *       name: "id",
 *       type: {
 *         type: "reference",
 *         entity: {
 *           schema: "IlyaTest",
 *           name: "Primary",
 *         },
 *       },
 *     },
 *   },
 *   {
 *     value: null,
 *     info: {
 *       name: "date",
 *       type: { type: "date" },
 *     },
 *   },
 * ]; */

@Component
export default class ArgumentEditor extends Vue {
  @Prop({ type: Object, required: true }) argumentsObj!: Record<ArgumentName, IArgument>;

  /* private argumentList = testArguments; */

  private mockScope = "mock_scope";

  private get mockUvArgs() {
    return { source: { type: "named", ref: { schema: "mock_schema", name: "mock_name" } }, args: {} };
  }

  private update(index: number, value: any) {
    /* this.argumentList[index].value = value; */
  }

  private apply() {
    /* const convertedArgs = this.argumentList.map(arg => ({ ...arg, value: serializeValue(arg.info.type, arg.value) })); */
    /* this.$emit("update", convertedArgs); */
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
