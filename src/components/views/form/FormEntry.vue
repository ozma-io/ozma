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
  <b-container fluid>
    <b-row>
      <b-col size="12">
        <form class="form-entry">
          <FormGrid
            :grid-content="blocks"
            :grid-props="gridProps"
          />
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
            v-if="selectionMode && localRow.extra.selectionEntry !== undefined"
            class="delete-block"
          >
            <input
              type="button"
              :value="$t('select')"
              class="delete-block_delete-button"
              @click="$emit('select', localRow.extra.selectionEntry)"
            >
          </div>
        </form>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
/* eslint @typescript-eslint/unbound-method: "warn" */
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import FormGrid from "@/components/form/FormGrid.vue";
import { IGridProps } from "@/components/form/types";

@Component({ components: { FormGrid } })
export default class FormEntry extends Vue {
  // We don't bother to set types here properly, they matter no more than for TableRow.
  // The reason this is not a functional component is because of i18n.

  @Prop({ type: Object, required: true }) uv!: any;
  @Prop({ type: Array, required: true }) blocks!: any;
  @Prop({ type: Object, required: true }) row!: any;
  @Prop({ type: Object, required: true }) localRow!: any;
  @Prop({ type: Boolean, default: false }) locked!: boolean;
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
  @Prop({ type: String, required: true }) scope!: string;
  @Prop({ type: Number, required: true }) level!: number;
  @Prop({ type: Boolean, default: true }) showDelete!: number;

  public onGoto(event: any) {
    this.$emit("goto", event);
  }

  public onUpdate(event: any, fieldIndex: number) {
    this.$emit("update", fieldIndex, event);
  }

  get gridProps(): IGridProps {
    return {
      uv: this.uv,
      row: this.row,
      localRow: this.localRow,
      locked: this.locked,
      selectionMode: this.selectionMode,
      scope: this.scope,
      level: this.level,
      onUpdate: (event, fieldIndex) => this.onUpdate(event, fieldIndex),
      onGoto: event => this.onGoto(event),
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

      .form-entry {
        display: grid;
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
