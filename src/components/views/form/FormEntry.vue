<i18n>
    {
        "en": {
            "delete": "Delete",
            "select": "Select"
        },
        "ru": {
            "delete": "Удалить",
            "select": "Выбрать"
        }
    }
</i18n>

<template>
  <b-container :style="style" fluid class="p-0">
    <b-row class="no-gutters">
      <b-col size="12">
        <form class="form-entry">
          <FormGrid
            v-slot="{ element }"
            :grid-content="blocks"
          >
            <FormControl
              v-if="element.type === 'field' && row.values[element.index].extra.visible"
              :caption="element.caption"
              :force-caption="element.forceCaption"
              :column-info-name="element.columnInfo.name"
              :value="row.values[element.index]"
              :attributes="row.values[element.index].extra.attributes"
              :type="element.columnInfo.valueType"
              :locked="locked"
              :uv-args="uv.args"
              :scope="scope"
              :level="level"
              @goto="$emit('goto', $event)"
              @update="$emit('update', element.index, $event)"
            />
            <b-row v-else-if="element.type === 'buttons'">
              <b-col>
                <FunLink
                  v-for="(subBlock, subBlockI) in element.actions"
                  :key="subBlockI"
                  :link="subBlock.link"
                  @goto="$emit('goto', $event)"
                >
                  <b-button
                    :key="subBlockI"
                    block
                    :variant="subBlock.variant"
                  >
                    {{ subBlock.name }}
                  </b-button>
                </FunLink>
              </b-col>
            </b-row>
          </FormGrid>
          <!-- FIXME FIXME FIXME look at permissions! -->
          <div
            v-if="showDelete && row.mainId !== undefined"
            class="delete-block"
          >
            <input
              type="button"
              :value="$t('delete')"
              class="delete-block_delete-button"
              @click="$emit('delete')"
            >
          </div>

          <div
            v-if="selectionMode && row.extra.selectionEntry !== undefined"
            class="delete-block"
          >
            <input
              type="button"
              :value="$t('select')"
              class="delete-block_delete-button"
              @click="$emit('select', row.extra.selectionEntry)"
            >
          </div>
        </form>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
/* eslint @typescript-eslint/unbound-method: "warn" */
import { Component, Vue, Prop } from "vue-property-decorator";
import FormGrid from "@/components/form/FormGrid.vue";
import type { IFormCombinedUserView, FormGridElement, IFormExtendedRowCommon } from "@/components/views/Form.vue";

const isNumberWithSuffix = (str: string, suffix: string): boolean =>
  str.slice(-suffix.length) === suffix && !Number.isNaN(Number(str.slice(0, suffix.length)));

@Component({ components: { FormGrid } })
export default class FormEntry extends Vue {
  // The reason this is not a functional component is because of i18n.
  @Prop({ type: Object, required: true }) uv!: IFormCombinedUserView;
  @Prop({ type: Array, required: true }) blocks!: FormGridElement[];
  @Prop({ type: Object, required: true }) row!: IFormExtendedRowCommon;
  @Prop({ type: Boolean, default: false }) locked!: boolean;
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
  @Prop({ type: String, required: true }) scope!: string;
  @Prop({ type: Number, required: true }) level!: number;
  @Prop({ type: Boolean, default: true }) showDelete!: number;

  private get maxWidth(): string {
    const defaultMaxWidth = "1140px";
    const maxWidth = this.uv.attributes["max_width"];
    if (typeof maxWidth === "number") return `${maxWidth}px`;
    if (typeof maxWidth !== "string") return defaultMaxWidth;
    if (!Number.isNaN(Number(maxWidth))) return `${maxWidth}px`;
    if (isNumberWithSuffix(maxWidth, "px")
     || isNumberWithSuffix(maxWidth, "%")) return maxWidth;
    return defaultMaxWidth;
  }

  private get style() {
    return {
      maxWidth: this.maxWidth,
    };
  }
}
</script>

<style scoped>
  .form-entry {
    border-bottom: 0;
    border-top: 0;
  }

  .form-block {
    display: inline-block;
    vertical-align: top;
    margin: 0 1px;
  }

  .form-data {
    margin-top: 7px;
    color: var(--NavigationTextColor);
  }

  .delete-block {
    background: var(--MainBorderColor);
    width: max-content;
    display: inline-block;
    margin-right: 15px;
    margin-left: 15px;
  }

  .delete-block_delete-button {
    background: hsla(0, 0%, 100%, 0.3) !important;
    padding: 0;
    padding-left: 7px;
    padding-right: 7px;
    line-height: normal;
    height: calc(1.5em + 4px);
    border: 0;
    box-shadow: none;
    outline: none;
    color: var(--MainTextColor);
    border-radius: 0;
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .form-block {
        width: 100% !important;
        display: block;
      }

      .delete-block {
        position: sticky;
        left: 0;
        margin-top: 10px;
      }
    }
  }

  @media screen and (orientation: portrait) {
    @media screen and (max-device-width: 480px) {
      .form-entry {
        width: 100%;
      }

      .form-data {
        margin-top: 0 !important;
        margin-bottom: 15px;
      }

      .form-block {
        display: grid;
      }
    }
  }

  @media print {
    .delete-block_delete-button {
      display: none !important;
    }
  }
</style>
