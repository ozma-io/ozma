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
    <MultiSelect
      v-if="selectedValueIndex"
      :options="options || []"
      :value="selectValues"
      :empty-value="[]"
      :disabled="disabled"
      :background-color="backgroundColor"
      @update:value="onSelectChange"
    >
      <template #label="select">
        <span
          v-for="(option, index) in select.valueOptions"
          :key="option.value"
          :class="[
            'one-of-many-value',
            {
              'has-links': option.label !== option.labelHtml,
            },
          ]"
          :style="select.listValueStyle"
          @click.stop
        >
          <FunLink
            v-if="option.meta && option.meta.link"
            :link="option.meta.link"
            @goto="$emit('goto', $event)"
          >
            <input
              type="button"
              class="material-icons reference__open_modal"
              value="open_in_new"
            >
          </FunLink>
          <!-- eslint-disable vue/no-v-html -->
          <span v-html="option.labelHtml" />
          <!-- eslint-enable vue/no-v-html -->
          <input
            v-if="select.showValueRemove"
            type="button"
            class="material-icons material-button remove-value"
            value="close"
            @click="select.removeValue(index)"
          >
        </span>
      </template>
      <template #option="select">
        <ul
          ref="optionsList"
          class="select-container__options_list"
          :style="select.optionsListStyle"
        >
          <li
            v-for="(option, index) in select.selectedOptions"
            :key="option.value"
            :class="[
              'single-value',
              'select-container__options_list__option',
              {
                'select-container__options_list__option_active': select.selectedOption === index,
              }
            ]"
            @click="select.addOptionToValue(option, $event)"
          >
            <!-- eslint-disable vue/no-v-html -->
            <span v-html="option.label" />
            <!-- eslint-enable vue/no-v-html -->
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
import { Component, Prop } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { namespace } from "vuex-class";

import { tryDicts, mapMaybe } from "@/utils";
import { IQuery } from "@/state/query";
import { UserView } from "@/components";
import BaseUserView, { EmptyBaseUserView } from "@/components/BaseUserView";
import BaseEntriesView from "@/components/BaseEntriesView";
import MultiSelect from "@/components/multiselect/MultiSelect.vue";
import { attrToLinkRef } from "@/links";
import { ICombinedRow, IRowCommon, RowRef, ValueRef } from "@/user_views/combined";
import { referenceEntriesRef } from "@/state/entries";

interface IValueDelta {
  rowsToRemove: RowRef[];
  rowsToAdd: IValueDeltaNew[];
}

interface IValueDeltaNew { ref: ValueRef; value: number }

const findValueDelta = (rows: ICombinedRow[], newRows: Record<number, IRowCommon>, value: any[], indexColumn: number): IValueDelta => {
  const storeValues: Record<string, RowRef> = {};
  rows.forEach((row, index) => {
    storeValues[row.values[indexColumn].value as string] = { type: "existing", position: index };
  });
  Object.entries(newRows).forEach(([rowId, row]) => {
    storeValues[row.values[indexColumn].value as string] = { type: "added", id: Number(rowId) };
  });
  const selectValues: Record<string, IValueDeltaNew> = value.reduce((acc, vl) => {
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

const query = namespace("query");

@UserView()
@Component({
  components: { MultiSelect },
})
export default class UserViewMultiSelect extends mixins<EmptyBaseUserView, BaseEntriesView>(BaseUserView, BaseEntriesView) {
  @query.Action("addWindow") addWindow!: (queryObj: IQuery) => Promise<void>;
  @Prop({ type: String }) backgroundColor!: string;

  get entriesEntity() {
    const fieldType = this.uv.info.columns[this.selectedValueIndex].mainField?.field.fieldType;
    if (fieldType?.type === "reference") {
      return referenceEntriesRef(fieldType);
    }
    return null;
  }

  private get selectedValueIndex() {
    const ret = this.uv.columnAttributes.findIndex(attrs => attrs["select"]);
    return ret === -1 ? 0 : ret;
  }

  private onSelectChange(value: any[]) {
    if (this.uv.rows) {
      const delta = findValueDelta(this.uv.rows, this.uv.newRows, value, this.selectedValueIndex);
      delta.rowsToRemove.forEach(row => {
        this.deleteRow(row);
      });
      delta.rowsToAdd.forEach(row => {
        void this.updateValue(row.ref, row.value);
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
    if (!this.entriesEntity) {
      return null;
    }

    const getColumnAttr = (name: string) => tryDicts(name, this.uv.columnAttributes[this.selectedValueIndex], this.uv.attributes);
    const linkedView = getColumnAttr("row_link");
    const entries = this.entriesMap.getEntries(this.entriesEntity);
    if (entries) {
      const options = Object.entries(entries).map(([key, value]) => ({
        value: Number(key),
        label: value,
        meta: {
          link: attrToLinkRef(linkedView, key),
        },
      }));
      return options;
    } else {
      return null;
    }
  }

  private get disabled() {
    return !this.uv.info.mainEntity || this.addedLocked || this.options === null;
  }
}
</script>
<style lang="scss" scoped>
  .view-form {
    border-radius: 0.2rem;
    background-color: var(--MainBackgroundColor);
  }

  .one-of-many-value > a,
  .select-container__options_list__option > a {
    color: var(--MainTextColor);
    text-decoration: underline;
  }

  .single-value,
  .one-of-many-value {
    &.has-links {
      // Otherwise it's sometimes tricky to click/tap inside.
      padding-right: 5px;
    }
  }

  .reference__open_modal {
    font-size: 20px;
    vertical-align: middle;
    border: none;
    background: none;
    padding: 0;
    margin: 2px 10px 2px 0;
    color: var(--MainTextColor);
  }
</style>
