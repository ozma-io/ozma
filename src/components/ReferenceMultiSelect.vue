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
      :parent-scope="scope"
      autofocus
      @select="selectFromView"
      @close="closeSelectView"
    />
    <MultiSelect
      v-if="valueOptions !== null"
      :value="valueIndex"
      :label="label"
      :options="options"
      :single="single"
      :required="required"
      :disabled="disabled"
      :height="height"
      :options-list-height="optionsListHeight"
      :autofocus="autofocus"
      show-filter
      :loading-state="loadingState"
      :process-filter="f => processFilter(f)"
      :compact-mode="compactMode"
      @update:value="updateValue"
      @add-value="addValue"
      @remove-value="removeValue"
      @clear-values="$emit('clear-values')"
      @update:filter="updateFilter"
      @load-more="loadMore"
      @popup-opened="$emit('popup-opened')"
      @popup-closed="onPopupClosed"
    >
      <template #option="select">
        <fragment>
          <FunLink
            v-if="select.option.value.link"
            class="single-value__link"
            :link="select.option.value.link"
            @goto="$emit('goto', $event)"
          >
            <i class="material-icons rounded-circle md-14 open-modal-button">
              {{ iconValue(select.option.value.link.target) }}
            </i>
          </FunLink>

          <!-- eslint-disable vue/no-v-html -->
          <span class="value-text" v-html="select.option.labelHtml" />
          <!-- eslint-enable vue/no-v-html -->
        </fragment>
      </template>
      <template
        #actions
      >
        <button
          v-for="(action, index) in selectViews"
          :key="index"
          type="button"
          class="material-button action-button"
          @click="beginSelect(action)"
        >
          <i class="material-icons md-18 rounded-circle open-modal-button">
            add
          </i>
          {{ action.name }}
        </button>
      </template>
      <template #qrcode-button>
        <b-input-group-append
          v-if="qrcodeInput"
        >
          <b-button
            variant="outline-info"
            class="with-material-icon"
          >
            <i
              class="material-icons qr_code"
              @click="openQRCodeScanner()"
            >
              qr_code_2
            </i>
          </b-button>
        </b-input-group-append>
      </template>
    </MultiSelect>
    <div
      v-else
      class="loading-box border rounded p-1 d-flex justify-content-center align-items-center"
    >
      <div
        class="spinner-border spinner-border-sm"
        style="border-color: var(--cell-foregroundDarkerColor); border-right-color: transparent;"
      />
    </div>
    <QRCodeScannerModal
      ref="scanner"
      :reference-entity="referenceEntity"
      :entries="entries"
      @select="selectFromScanner"
    />
  </span>
</template>

<script lang="ts">
import { Component, Prop, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";

import type { IEntityRef, RowId, ValueType } from "ozma-api";
import { Debounce } from "vue-debounce-decorator";
import { ISelectOption, default as MultiSelect, LoadingResult, LoadingState } from "@/components/multiselect/MultiSelect.vue";
import { IQRCode, parseQRCode } from "@/components/qrcode/QRCode.vue";
import BaseEntriesView from "@/components/BaseEntriesView";
import SelectUserView from "@/components/SelectUserView.vue";
import { IQuery } from "@/state/query";
import { attrToLinkRef, IAttrToLinkOpts, Link } from "@/links";
import type { IUserViewArguments } from "@/user_views/combined";
import { currentValue, homeSchema, ICombinedValue, valueToPunnedText } from "@/user_views/combined";
import { mapMaybe, NeverError } from "@/utils";
import { equalEntityRef, valueIsNull } from "@/values";
import { CancelledError } from "@/modules";
import type { EntriesRef } from "@/state/entries";
import type { ScopeName } from "@/state/staging_changes";
import QRCodeScannerModal from "./qrcode/QRCodeScannerModal.vue";

export interface IReferenceValue {
  id: RowId;
  link: Link | null;
}

export interface IReferenceSelectAction {
  name: string;
  query: IQuery;
}

export type ReferenceSelectOption = ISelectOption<IReferenceValue>;

const compareOptions = (a : ReferenceSelectOption, b : ReferenceSelectOption): number => {
  return a.label.localeCompare(b.label);
};

const valueIsSingle = (value: ICombinedValue | ICombinedValue[] | null): value is ICombinedValue => {
  return value !== null && "value" in value;
};

@Component({
  components: {
    MultiSelect,
    SelectUserView,
    QRCodeScannerModal,
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
  @Prop({ type: Object, required: true }) entries!: EntriesRef;
  @Prop({ type: Object, required: true }) referenceEntity!: IEntityRef;
  @Prop({ type: Array, default: () => [] }) selectViews!: IReferenceSelectAction[];
  @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments;
  @Prop({ type: Object }) linkAttr!: unknown | undefined;
  @Prop({ type: Boolean, default: false }) qrcodeInput!: boolean;
  @Prop({ type: Boolean, default: false }) loadPunOnMount!: boolean;
  @Prop({ type: String, default: "no_scope" }) scope!: ScopeName;
  @Prop({ type: String, default: null }) label!: string | null;
  @Prop({ type: Boolean, default: false }) compactMode!: boolean;

  private selectedView: IQuery | null = null;

  private openQRCodeScanner() {
    (this.$refs.scanner as QRCodeScannerModal).scan();
  }

  @Watch("value", { immediate: true })
  // TODO: Possible unnecessary requests there, check this.
  private loadPun() {
    if (!this.loadPunOnMount) return;

    if (this.single) {
      const value = this.value as ICombinedValue;
      if (value.pun || typeof value.value !== "number") return;

      void this.processId(value.value);
    } else {
      const values = this.value as ICombinedValue[];
      if (values.every(v => v.pun)) return;

      void this.processIds(values.map(v => v.value as number));
    }
  }

  /* @Watch("entries")
   * private entriesRefChanged(newValue: EntriesRef) {
   *   void this.fetchEntries(newValue, this.requestedSearch, this.requestedLimit);
   * } */

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
    if (valueIsNull(this.value) || (valueIsSingle(this.value) && valueIsNull(this.value.value))) {
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
    return [...this.valueOptions ?? [], ...this.entriesOptions ?? []].sort(compareOptions);
  }

  private setValue(id: number) {
    if (this.single) {
      this.$emit("update:value", id);
    } else {
      this.$emit("add-value", id);
    }
  }

  private async processId(id: number): Promise<boolean> {
    const puns = await this.fetchEntriesByIds(this.entries, [id]);
    if (!(id in puns)) {
      return false;
    }

    this.setValue(id);
    return true;
  }

  private async processIds(ids: number[]): Promise<void> {
    const puns = await this.fetchEntriesByIds(this.entries, ids);
  }

  private async selectFromScanner(content: IQRCode): Promise<boolean> {
    return this.processId(content.id);
  }

  private async processQRCode(filterValue: string): Promise<boolean> {
    const qrcode = parseQRCode(filterValue);
    if (qrcode === null) {
      return false;
    }

    if (!equalEntityRef(qrcode.entity, this.referenceEntity)) {
      this.makeToast(this.$t("error_qrcode_is_inappropriate").toString());
      return false;
    }

    return this.processId(qrcode.id);
  }

  private async processRawId(filterValue: string): Promise<boolean> {
    const id = Number(filterValue);
    if (filterValue === "" || Number.isNaN(id)) {
      return false;
    }

    return this.processId(id);
  }

  private async processFilter(filterValue: string): Promise<boolean> {
    if (await this.processQRCode(filterValue)) {
      return true;
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
    return "open_in_new";
  }

  private selectFromView(id: number) {
    this.selectedView = null;
    this.setValue(id);
  }

  private closeSelectView() {
    this.selectedView = null;
    this.$emit("popup-closed");
  }

  private onPopupClosed() {
    if (this.selectedView === null) {
      this.$emit("popup-closed");
    }
  }

  private beginSelect(action: IReferenceSelectAction) {
    this.selectedView = action.query;
  }

  get loadingState(): LoadingState {
    switch (this.entriesLoadingState.status) {
      case "not_asked":
        return { status: "ok", moreAvailable: true };
      case "pending":
        return { status: "pending" };
      case "ok":
        return { status: "ok", moreAvailable: this.entriesLoadingState.limit !== null };
      case "error":
        return { status: "error", message: String(this.entriesLoadingState.error) };
      default:
        throw new NeverError(this.entriesLoadingState);
    }
  }

  private updateValue(index: number | null) {
    this.$emit("update:value", index === null ? null : this.options![index].value.id);
  }

  private addValue(index: number) {
    this.$emit("add-value", this.options![index].value.id);
  }

  private removeValue(index: number) {
    // We pass `remove-value` as is to support repeating ids.
    this.$emit("remove-index", index);
  }

  private async loadMore(next: (_: LoadingResult) => void) {
    try {
      const moreAvailable = await this.fetchEntries(this.entries, this.requestedSearch, this.requestedLimit + 20);
      next({ status: "ok", moreAvailable });
    } catch (e) {
      if (!(e instanceof CancelledError)) {
        next({ status: "error", message: String(e) });
      }
    }
  }

  @Debounce(200)
  private updateFilter(filter: string) {
    void this.fetchEntries(this.entries, filter, 20);
  }
}
</script>

<style lang="scss" scoped>
  .single-value__link {
    display: flex;
  }

  .open-modal-button {
    @include material-button("option");

    margin: 0;
    margin-left: -0.25rem;
    margin-right: 0.25rem;
    border: none;
    padding: 0;

    &:not(:hover) {
      opacity: 0.3;
    }
  }

  .action-button {
    padding: 0.5rem 0.25rem;
    border-radius: 0;
    display: flex;
    align-items: center;
    width: 100%;
    background: var(--default-backgroundColor);
  }

  .loading-box {
    height: 2rem;
  }

  .value-text {
    text-align: left;
  }

  .compact-mode {
    .value-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
</style>
