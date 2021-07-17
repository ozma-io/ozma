<i18n>
  {
    "en": {
      "no_select_column": "Please identify selectable column using `select = true` attribute on desired column."
    },
    "ru": {
      "no_select_column": "Пожалуйста, обозначьте колонку для выбора через атрибут `select = true` на желаемой колонке."
    }
  }
</i18n>

<template>
  <div class="view-wrapper">
    <ReferenceMultiSelect
      v-if="reference"
      :value="selectedValues"
      :disabled="disabled"
      :background-color="backgroundColor"
      :link-attr="linkAttr"
      :entries="entriesRef"
      :reference-entity="reference.referenceEntity"
      :uv-args="uv.args"
      @add-value="addValue"
      @remove-index="removeIndex"
      @goto="$emit('goto', $event)"
    />
    <Errorbox
      v-else
      :message="$t('no_select_column')"
    />
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
import { AddedRowId } from "@/state/staging_changes";
import { getReferenceInfo } from "@/state/entries";
import Errorbox from "@/components/Errorbox.vue";
import { attrObjectToQuery } from "@/state/query";

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
  components: { ReferenceMultiSelect, Errorbox },
})
export default class UserViewMultiSelect extends mixins<EmptyBaseUserView>(BaseUserView) {
  @Prop({ type: String }) backgroundColor!: string;

  get reference() {
    return getReferenceInfo(this.uv, this.selectedValueColumn, null);
  }

  get entriesRef() {
    const entriesRef = this.reference?.entries;
    if (!entriesRef) return undefined;

    const optionsView = attrObjectToQuery(this.uv.attributes["options_view"]);
    if (optionsView) {
      return { ...entriesRef, optionsView };
    } else {
      return entriesRef;
    }
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
  .view-wrapper {
    padding: 0.25rem;

    ::v-deep .select-container {
      border-radius: 0.3rem;
    }
  }
</style>
