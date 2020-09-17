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
    <ModalUserView
      v-if="nestedView !== null"
      :initial-view="nestedView"
      @close="nestedView = null"
    />
    <MultiSelect
      v-if="selectedValueIndex"
      :options="options || []"
      :value="selectValues"
      :empty-value="[]"
      :disabled="disabled"
      :background-color= "cellColor"
      @update:value="onSelectChange"
    >
      <template #label="select">
        <span
          v-for="(option, index) in select.valueOptions"
          :key="option.value"
          class="values_list__value"
          :style="select.listValueStyle"
          @click.stop
        >
          <input
            type="button"
            class="material-icons reference__open_modal"
            value="flip_to_front"
            @click.stop="nestedView = option.meta.link"
          >
          <UserViewLink
            v-if="option.meta && option.meta.link"
            :uv="option.meta.link"
            @[indirectLinks?`click`:null]="$emit('goto', $event)"
          >
            {{ option.label }}
          </UserViewLink>
          <span v-else>
            {{ option.label }}
          </span>
          <input
            v-if="select.showValueRemove"
            type="button"
            class="material-icons values_list__value__close"
            value="close"
            @click="select.removeValue(index)"
          >
        </span>
      </template>
      <template #option="select">
        <ul
          ref="optionsList"
          class="select_container__options_list"
          :style="select.optionsListStyle"
        >
          <li
            v-for="(option, index) in select.selectedOptions"
            :key="option.value"
            :class="[
              'single_value',
              'select_container__options_list__option',
              {'select_container__options_list__option_active': select.selectedOption === index }
            ]"
            @click="select.addOptionToValue(option, $event)"
          >
            <UserViewLink
              v-if="option.meta && option.meta.link"
              :uv="option.meta.link"
              @[indirectLinks?`click`:null]="$emit('goto', $event)"
            >
              {{ option.label }}
            </UserViewLink>
            <span v-else>
              {{ option.label }}
            </span>
          </li>
        </ul>
      </template>
    </MultiSelect>
    <div
      v-if="!selectedValueIndex"
      style="color: red;"
    >
      {{ $t('no_select_column') }}
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import * as R from "ramda";
import { mixins } from "vue-class-component";

import { RecordSet, tryDicts, mapMaybe } from "@/utils";
import { AttributesMap, IResultColumnInfo, IReferenceFieldType, IMainFieldInfo, IEntityRef } from "@/api";
import { CurrentEntries, CombinedUserView, ICombinedValue, IRowCommon, ICombinedRow, IAddedRow, homeSchema } from "@/state/user_view";
import { RowRef, ValueRef } from "@/local_user_view";
import { AddedRowId } from "@/state/staging_changes";
import { IQuery, attrToQueryRef } from "@/state/query";
import LocalEmptyUserView from "@/LocalEmptyUserView";
import { UserView } from "@/components";
import BaseUserView, { ISelectionRef } from "@/components/BaseUserView";
import BaseEntriesView from "@/components/BaseEntriesView";
import FormEntry from "@/components/views/form/FormEntry.vue";
import MultiSelect from "@/components/multiselect/MultiSelect.vue";
import ModalUserView from "@/components/ModalUserView.vue";

const findSelectColumnIndex = (attrs: { [key: string]: any}) =>
  Number(Object.keys(attrs).filter(key => R.pathOr(false, [key, "select"], attrs))[0]);

interface IValueDelta {
  rowsToRemove: RowRef[];
  rowsToAdd: IValueDeltaNew[];
}

interface IValueDeltaNew { ref: ValueRef; value: number }

const findValueDelta = (rows: ICombinedRow[], newRows: Record<number, IRowCommon>, value: any[], indexColumn: number): IValueDelta => {
  const storeValues: Record<string, RowRef> = {};
  rows.forEach((row, index) => {
    storeValues[row.values[indexColumn].value] = { type: "existing", position: index };
  });
  Object.entries(newRows).forEach(([rowId, row]) => {
    storeValues[row.values[indexColumn].value] = { type: "added", id: Number(rowId) };
  });
  const selectValues: Record<string, IValueDeltaNew>  = value.reduce((acc, vl) => {
    return { ...acc, [vl]: { ref: { column: indexColumn, type: "new" }, value: vl } };
  }, {});

  const rowsToAdd = mapMaybe(([id, ref]) => {
    if (id in storeValues) {
      return undefined;
    }
    return ref;
  }, Object.entries(selectValues));
  const rowsToRemove = mapMaybe(([id, ref]) => {
    if (id in selectValues) {
      return undefined;
    }
    return ref;
  }, Object.entries(storeValues));
  return {
    rowsToAdd,
    rowsToRemove,
  };
};

@UserView({
  localConstructor: LocalEmptyUserView,
})
@Component({
  components: { MultiSelect, ModalUserView },
})
export default class UserViewMultiSelect extends mixins<BaseUserView<LocalEmptyUserView, null, null, null>, BaseEntriesView>(BaseUserView, BaseEntriesView) {
  @Prop({ type: String }) backgroundColor!: string;

  private nestedView: IQuery | null = null;

  get entriesEntity() {
    const mainField = this.uv.info.columns[this.selectedValueIndex].mainField;
    if (mainField) {
      const fieldType = mainField.field.fieldType;
      if (fieldType.type === "reference") {
        return fieldType;
      }
    }
    return null;
  }

  private get selectedValueIndex() {
    return findSelectColumnIndex(this.uv.columnAttributes);
  }

  private onSelectChange(value: any[]) {
    if (this.uv.rows) {
      const delta = findValueDelta(this.uv.rows, this.uv.newRows, value, this.selectedValueIndex);
      delta.rowsToRemove.forEach(row => {
        this.deleteRow(row);
      });
      delta.rowsToAdd.forEach(row => {
        this.updateValue(row.ref, row.value);
      });
    }
  }

  private get selectValues() {
    const existingValues = this.uv.rows ? this.uv.rows.filter(row => !row.deleted)
      .map(row => row.values[this.selectedValueIndex].value) : [];
    const addedValues = Object.values(this.uv.newRows)
      .map(row => row.values[this.selectedValueIndex].value);
    return [...existingValues, ...addedValues];
  }

  private get options() {
    const entity = this.entriesEntity;
    const linkedView = R.pathOr(
      null, [this.selectedValueIndex, "row_linked_view"], this.uv.columnAttributes,
    );
    if (entity) {
      const entries = this.entriesMap.getEntries(entity);
      if (entries) {
        const options = Object.entries(entries).map(([key, value]) => ({
          value: Number(key),
          label: value,
          meta: {
            link: attrToQueryRef(linkedView, Number(key)),
          },
        }));
        return options;
      }
    }
    return null;
  }

  private get disabled() {
    return !this.uv.info.mainEntity || this.addedLocked || this.options === null;
  }
}
</script>
<style scoped>  
  .values_list__value > a,
  .select_container__options_list__option > a {
    color: var(--MainTextColor);
    text-decoration: underline;
  }

  .reference__open_modal {
    border: none;
    background: none;
    padding: 0;
    margin: 0 10px 0 0;
    color: var(--MainTextColor);
  }
</style>
