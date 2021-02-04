<i18n>
  {
    "en": {
      "no_select_column": "Please identify selectable column using \"Select\" = True attribute on desired column."
    },
    "ru": {
      "no_select_column": "Пожалуйста, обозначьте колонку для выбора через аттрибут \"Select\" = True на желаемой колонке."
    }
  }
</i18n>

<template>
  <div
    fluid
    class="view-form"
  >
    <ReferenceMultiSelect
      v-if="referenceEntity"
      :value="selectedValues"
      :disabled="disabled"
      :background-color="backgroundColor"
      :link-attr="linkAttr"
      :reference-entity="referenceEntity"
      :uv-args="uv.args"
      @add-value="addValue"
      @remove-index="removeIndex"
      @goto="$emit('goto', $event)"
    />
    <div
      v-else
      class="no-select-error"
    >
      {{ $t('no_select_column') }}
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { RowId } from "ozma-api";

import { tryDicts, mapMaybe } from "@/utils";
import { UserView } from "@/components";
import BaseUserView, { EmptyBaseUserView } from "@/components/BaseUserView";
import ReferenceMultiSelect from "@/components/ReferenceMultiSelect.vue";
import { ICombinedValue } from "@/user_views/combined";
import { referenceEntriesRef } from "@/state/entries";
import { AddedRowId } from "@/state/staging_changes";

interface ISelectedValueBase {
  value: ICombinedValue;
}

interface IExistingSelectedValue extends ISelectedValueBase {
  type: "existing";
  id: RowId;
}

interface IAddedSelectedValue extends ISelectedValueBase {
  type: "added";
  addedId: AddedRowId;
}

interface IUnknownSelectedValue extends ISelectedValueBase {
  type: "unknown";
}

type SelectedValue = IExistingSelectedValue | IAddedSelectedValue | IUnknownSelectedValue;

@UserView()
@Component({
  components: { ReferenceMultiSelect },
})
export default class UserViewMultiSelect extends mixins<EmptyBaseUserView>(BaseUserView) {
  @Prop({ type: String }) backgroundColor!: string;

  get referenceEntity() {
    const fieldType = this.uv.info.columns[this.selectedValueColumn].mainField?.field.fieldType;
    if (fieldType?.type === "reference") {
      return referenceEntriesRef(fieldType);
    }
    return null;
  }

  get selectedValueColumn() {
    const ret = this.uv.columnAttributes.findIndex(attrs => attrs["select"]);
    return ret === -1 ? 0 : ret;
  }

  get linkAttr() {
    const getColumnAttr = (name: string) => tryDicts(name, this.uv.columnAttributes[this.selectedValueColumn], this.uv.attributes);
    return getColumnAttr("row_link");
  }

  get selectedValuesWithPosition(): SelectedValue[] {
    let existingRows: SelectedValue[];
    if (!this.uv.rows) {
      existingRows = [];
    } else {
      existingRows = mapMaybe(row => {
        if (row.deleted) {
          return undefined;
        }
        const value = row.values[this.selectedValueColumn];
        if (row.mainId) {
          return {
            type: "existing",
            id: row.mainId,
            value,
          };
        } else {
          return {
            type: "unknown",
            value,
          };
        }
      }, this.uv.rows);
    }
    const addedRows: SelectedValue[] = this.uv.newRowsOrder.map(id => {
      const row = this.uv.newRows[id];
      return {
        type: "added",
        addedId: id,
        value: row.values[this.selectedValueColumn],
      };
    });
    return [...existingRows, ...addedRows];
  }

  get selectedValues(): ICombinedValue[] {
    return this.selectedValuesWithPosition.map(row => row.value);
  }

  get disabled() {
    return !this.uv.info.mainEntity;
  }

  private async addValue(id: RowId) {
    await this.updateValue({ type: "new", column: this.selectedValueColumn }, id);
  }

  private async removeIndex(index: number) {
    const row = this.selectedValuesWithPosition[index];
    if (row.type === "existing") {
      await this.deleteEntry({
        entityRef: this.uv.info.mainEntity!,
        id: row.id,
      });
    } else if (row.type === "added") {
      await this.resetAddedEntry({
        entityRef: this.uv.info.mainEntity!,
        id: row.addedId,
      });
    } else {
      throw new Error("Impossible");
    }
  }
}
</script>

<style lang="scss" scoped>
  .view-form {
    border-radius: 0.2rem;
    background-color: var(--MainBackgroundColor);
  }

  .no-select-error {
    color: red;
  }
</style>
