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
          v-for="(argument, name, index) in argumentParams"
          :key="index"
          :sm="6"
          class="mt-2"
        >
          <FormControl
            :value="{ value: values[name] }"
            :type="argument.argType"
            :caption="name"
            :scope="mockScope"
            :uv-args="mockUvArgs"
            :level="0"
            :forced-field-type="argument.argType"
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
import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import moment, { MomentInput } from "moment";

import { ArgumentName, IArgument } from "ozma-api";
import { objectMap } from "@/utils";

@Component
export default class ArgumentEditor extends Vue {
  @Prop({ type: Object, required: true }) argumentParams!: Record<ArgumentName, IArgument>;
  @Prop({ type: Object, required: true }) argumentValues!: Record<string, unknown>;
  @Prop({ type: Boolean, default: true }) canBeClosed!: boolean;

  private values: Record<string, unknown> = {};

  @Watch("argumentValues", { immediate: true })
  private syncValues() {
    this.values = objectMap((value, key, index) => {
      if (this.argumentParams[key].argType.type === "date" || this.argumentParams[key].argType.type === "datetime") {
        return moment(value as MomentInput);
      }
      return value;
    }, this.argumentValues);
  }

  private mockScope = "mock_scope";

  private mockUvArgs = { source: { type: "named", ref: { schema: "mock_schema", name: "mock_name" } }, args: {} };

  private update(name: string, value: any) {
    this.values[name] = value;
  }

  private apply() {
    this.$emit("update", this.values);
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
