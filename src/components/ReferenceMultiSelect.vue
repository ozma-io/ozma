<i18n>
  {
    "en": {
      "error": "Error",
      "error_qrcode_is_inappropriate" : "QRCode is inappropriate"
    },
    "ru": {
      "error": "Ошибка",
      "error_qrcode_is_inappropriate" : "QRCode не соответствует назначению"
    }
  }
</i18n>

<template>
  <span>
    <SelectUserView
      v-if="selectedView"
      :initial-view="selectedView"
      :select-entity="referenceEntity"
      autofocus
      @select="selectFromView"
      @close="selectedView = null"
    />
    <MultiSelect
      v-if="options !== null"
      :value="valueIndex"
      :options="options"
      :single="single"
      :required="required"
      :disabled="disabled"
      :height="height"
      :options-list-height="optionsListHeight"
      :autofocus="autofocus"
      show-filter
      :process-filter="f => processFilter(f)"
      @update:value="updateValue"
      @add-value="addValue"
      @remove-value="removeValue"
      @update:filter="updateFilter"
      @more-options="limit += 20"
      @focus="$emit('focus')"
    >
      <template #label="select">
        <span
          v-for="(option, index) in select.selectedOptions"
          :key="index"
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
            v-if="option.value.link"
            :link="option.value.link"
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
            v-if="select.showUnselectOption"
            type="button"
            class="material-icons material-button remove-value"
            value="close"
            @click="select.unselectOption(index)"
          >
        </span>
      </template>

      <template #singleValue="select">
        <span
          v-if="select.selectedOption.value.link"
          :style="select.listValueStyle"
          class="single-value"
        >
          <FunLink
            class="single-value__link"
            :link="select.selectedOption.value.link"
            @goto="$emit('goto', $event)"
          >
            <input
              type="button"
              class="material-icons reference__open_modal"
              :value="iconValue(select.selectedOption.value.link.target)"
            >
          </FunLink>
          <!-- eslint-disable vue/no-v-html -->
          <span v-html="select.selectedOption.labelHtml" />
          <!-- eslint-enable vue/no-v-html -->
        </span>
        <!-- eslint-disable vue/no-v-html -->
        <span
          v-else
          :style="select.listValueStyle"
          :class="[
            'single-value',
            {
              'has-links': select.selectedOption.label !== select.selectedOption.labelHtml,
            }
          ]"
          v-html="select.selectedOption.labelHtml"
        />
        <!-- eslint-enable vue/no-v-html -->
      </template>

      <template
        #actions
      >
        <button
          v-for="(action, index) in selectViews"
          :key="index"
          type="button"
          class="reference__new_modal__button"
          @click="selectedView = action.query"
        >
          <input
            type="button"
            class="material-icons reference__open_modal"
            value="add"
          >
          {{ action.name }}
        </button>
      </template>
    </MultiSelect>
    <div
      v-else
      class="loading-box h-100 p-1 d-flex justify-content-center align-items-center"
    >
      <div
        class="spinner-border spinner-border-sm"
        style="border-color: rgba(0, 0, 0, 0.5); border-right-color: transparent;"
      />
    </div>
  </span>
</template>

<script lang="ts">
import { Component, Prop } from "vue-property-decorator";
import { mixins } from "vue-class-component";

import { ISelectOption, default as MultiSelect } from "@/components/multiselect/MultiSelect.vue";
import { IEntriesRef } from "@/state/entries";
import { parseQRCode } from "@/components/qrcode/QRCode.vue";
import BaseEntriesView from "@/components/BaseEntriesView";
import SelectUserView from "@/components/SelectUserView.vue";
import { IQuery } from "@/state/query";
import { attrToLinkRef, IAttrToLinkOpts, Link } from "@/links";
import type { IUserViewArguments } from "@/user_views/combined";
import { currentValue, homeSchema, ICombinedValue, valueToPunnedText } from "@/user_views/combined";
import { mapMaybe } from "@/utils";
import { RowId, ValueType } from "ozma-api";
import { equalEntityRef } from "@/values";

export interface IReferenceValue {
  id: RowId;
  link: Link | null;
}

export interface IReferenceSelectAction {
  name: string;
  query: IQuery;
}

export type ReferenceSelectOption = ISelectOption<IReferenceValue>;

@Component({
  components: {
    MultiSelect,
    SelectUserView,
  },
})
export default class ReferenceMultiSelect extends mixins(BaseEntriesView) {
  @Prop({ required: true }) value!: ICombinedValue | ICombinedValue[] | null;
  @Prop({ type: Boolean, default: false }) single!: boolean;
  @Prop({ type: Boolean, default: false }) required!: boolean;
  @Prop({ type: Boolean, default: false }) disabled!: boolean;
  @Prop({ type: Number }) height!: number | undefined;
  @Prop({ type: Number }) optionsListHeight!: number | undefined;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Object }) referenceEntity!: IEntriesRef | null;
  @Prop({ type: Array, default: () => [] }) selectViews!: IReferenceSelectAction[];
  @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments;
  @Prop({ type: Object }) linkAttr!: unknown | undefined;

  private selectedView: IQuery | null = null;
  private limit = 20;
  private search = "";

  get entriesEntity() {
    return this.referenceEntity;
  }

  get entriesLimit() {
    return this.limit;
  }

  get entriesSearch() {
    return this.search;
  }

  private findValue(value: ICombinedValue): number | undefined {
    const currentId = currentValue(value) as number | null | undefined;
    const idx = this.options!.findIndex(opt => opt.value.id === currentId);
    return idx === -1 ? undefined : idx;
  }

  get valueIndex(): number | number[] | null {
    if (!this.options) {
      return null;
    }
    if (this.value === null) {
      return null;
    }

    if (this.single) {
      return this.findValue(this.value as ICombinedValue) ?? null;
    } else {
      return mapMaybe(value => this.findValue(value), this.value as ICombinedValue[]);
    }
  }

  get linkOpts(): IAttrToLinkOpts | undefined {
    const home = homeSchema(this.uvArgs);
    return home !== null ? { homeSchema: home } : undefined;
  }

  private makeOption(id: RowId, pun: string): ReferenceSelectOption {
    return {
      label: pun,
      value: {
        id,
        link: attrToLinkRef(this.linkAttr, id, this.linkOpts),
      },
    };
  }

  get valueOptions(): ReferenceSelectOption[] | null {
    const valueType: ValueType = { type: "int" };
    if (this.value === undefined) {
      return [];
    } else {
      const values = this.single ? [this.value as ICombinedValue] : (this.value as ICombinedValue[]);
      const ret: ReferenceSelectOption[] = [];
      for (const value of values) {
        const curValue = currentValue(value) as number | null | undefined;
        if (curValue === null || curValue === undefined) {
          continue;
        }
        if (this.currentEntries !== null && curValue in this.currentEntries) {
          continue;
        }
        if (value.pun === undefined) {
          // No pun for one of values -- wait till we finish loading.
          return null;
        } else {
          ret.push(this.makeOption(curValue, valueToPunnedText(valueType, value)));
        }
      }
      return ret;
    }
  }

  get entriesOptions(): ReferenceSelectOption[] | null {
    if (this.currentEntries === null) {
      return null;
    } else {
      return Object.entries(this.currentEntries).map(([rawId, name]) => this.makeOption(Number(rawId), name));
    }
  }

  get options(): ReferenceSelectOption[] | null {
    if (this.valueOptions && this.entriesOptions) {
      return [...this.valueOptions, ...this.entriesOptions];
    } else {
      return null;
    }
  }

  private setValue(id: number) {
    if (this.single) {
      this.$emit("update:value", id);
    } else {
      this.$emit("add-value", id);
    }
  }

  private async processId(id: number): Promise<boolean> {
    const pun = await this.fetchOneEntry(id);
    if (pun === undefined) {
      return false;
    }

    this.setValue(id);
    return true;
  }

  private async processQRCode(filterValue: string): Promise<boolean> {
    const qrcode = parseQRCode(filterValue);
    if (qrcode === null) {
      return false;
    }

    if (!equalEntityRef(qrcode.entity, this.referenceEntity!.entity)) {
      this.makeToast(this.$t("error_qrcode_is_inappropriate").toString());
      return false;
    }

    return this.processId(qrcode.id);
  }

  private async processRawId(filterValue: string): Promise<boolean> {
    const id = Number(filterValue);
    if (Number.isNaN(id)) {
      return false;
    }

    return this.processId(id);
  }

  private async processFilter(filterValue: string): Promise<boolean> {
    if (this.referenceEntity) {
      if (await this.processQRCode(filterValue)) {
        return true;
      }
    }

    return this.processRawId(filterValue);
  }

  private makeToast(message: string) {
    this.$bvToast.toast(message, {
      title: this.$t("error").toString(),
      variant: "danger",
      solid: true,
      noAutoHide: true,
    });
  }

  private iconValue(target: string) {
    if (target === "modal-auto" || target === "modal") {
      return "flip_to_front";
    } else {
      return "open_in_new";
    }
  }

  private selectFromView(id: number) {
    this.selectedView = null;
    this.setValue(id);
  }

  private updateValue(index: number | null) {
    if (index === null) {
      this.$emit("update:value", null);
    } else {
      this.$emit("update:value", this.options![index].value.id);
    }
  }

  private addValue(index: number) {
    this.$emit("add-value", this.options![index].value.id);
  }

  private removeValue(index: number) {
    // We pass `remove-value` as is to support repeating ids.
    this.$emit("remove-index", index);
  }

  private updateFilter(filter: string) {
    this.limit = 20;
    this.search = filter;
  }
}
</script>

<style lang="scss" scoped>
  .single-value {
    margin: 2px;
    line-height: 1rem;

    &.has-links {
      /* Otherwise it's sometimes tricky to click/tap inside. */
      padding-right: 5px;
    }
  }

  .single-value > a,
  .select-container__options_list__option > a {
    color: var(--MainTextColor);
    text-decoration: underline;
  }

  .single-value__link {
    display: flex;
  }

  .reference__open_modal {
    border: none;
    background: none;
    padding: 0;
    margin: 0 10px 0 0;
    color: var(--MainBorderTextColor);
  }

  .reference__new_modal__button {
    color: var(--MainBorderTextColor);
    display: flex;
    align-items: center;
    width: 100%;
    background: var(--MainBorderColor);
  }

  .loading-box {
    height: 2rem;
  }
</style>
