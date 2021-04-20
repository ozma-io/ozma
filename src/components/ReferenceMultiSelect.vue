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
      :loading-state="loadingState"
      :process-filter="f => processFilter(f)"
      @update:value="updateValue"
      @add-value="addValue"
      @remove-value="removeValue"
      @update:filter="updateFilter"
      @load-more="loadMore"
      @focus="$emit('focus')"
    >
      <template #option="select">
        <fragment>
          <FunLink
            v-if="select.option.value.link"
            class="single-value__link"
            :link="select.option.value.link"
            @goto="$emit('goto', $event)"
          >
            <input
              type="button"
              class="material-icons rounded-circle md-18 open-modal-button"
              :value="iconValue(select.option.value.link.target)"
            >
          </FunLink>

          <!-- Hack to maintain min-heigth when there are no icons -->
          <span class="phantom-icon md-18">&#8203;</span>

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
          @click="selectedView = action.query"
        >
          <input
            type="button"
            class="material-icons md-18 open-modal-button rounded-circle"
            value="add"
          >
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
        style="border-color: rgba(0, 0, 0, 0.5); border-right-color: transparent;"
      />
    </div>
    <QRCodeScanner
      v-if="wasOpenedQRCodeScanner"
      :reference-entity="referenceEntity"
      :entries="entries"
      :open-scanner="isQRCodeScanner"
      @select="selectFromScanner"
    />
  </span>
</template>

<script lang="ts">
import { Component, Prop, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";

import { ISelectOption, default as MultiSelect, LoadingResult, LoadingState } from "@/components/multiselect/MultiSelect.vue";
import { IQRCode, parseQRCode } from "@/components/qrcode/QRCode.vue";
import BaseEntriesView from "@/components/BaseEntriesView";
import SelectUserView from "@/components/SelectUserView.vue";
import { IQuery } from "@/state/query";
import { attrToLinkRef, IAttrToLinkOpts, Link } from "@/links";
import type { IUserViewArguments } from "@/user_views/combined";
import { currentValue, homeSchema, ICombinedValue, valueToPunnedText } from "@/user_views/combined";
import { mapMaybe, nextRender } from "@/utils";
import type { IEntityRef, RowId, ValueType } from "ozma-api";
import { equalEntityRef } from "@/values";
import { CancelledError } from "@/modules";
import { Debounce } from "vue-debounce-decorator";
import type { IEntriesRef } from "@/state/entries";

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

@Component({
  components: {
    MultiSelect,
    SelectUserView,
    QRCodeScanner: () => import("@/components/qrcode/QRCodeScanner.vue"),
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
  @Prop({ type: Object, required: true }) entries!: IEntriesRef;
  @Prop({ type: Object, required: true }) referenceEntity!: IEntityRef;
  @Prop({ type: Array, default: () => [] }) selectViews!: IReferenceSelectAction[];
  @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments;
  @Prop({ type: Object }) linkAttr!: unknown | undefined;
  @Prop({ type: Boolean, default: false }) qrcodeInput!: boolean;

  private selectedView: IQuery | null = null;
  private wasOpenedQRCodeScanner = false;
  private isQRCodeScanner = false;

  private openQRCodeScanner() {
    this.wasOpenedQRCodeScanner = true;
    void nextRender().then(() => {
      this.isQRCodeScanner = !this.isQRCodeScanner;
    });
  }

  @Watch("entries", { immediate: true })
  private entriesRefChanged(newValue: IEntriesRef) {
    void this.fetchEntries(newValue, this.requestedSearch, this.requestedLimit);
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
      return [...this.valueOptions, ...this.entriesOptions].sort(compareOptions);
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
    const puns = await this.fetchEntriesByIds(this.entries, [id]);
    if (!(id in puns)) {
      return false;
    }

    this.setValue(id);
    return true;
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
    if (Number.isNaN(id)) {
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

  get loadingState(): LoadingState {
    if (this.entriesLoadingState.status === "ok") {
      return { status: "ok", moreAvailable: this.entriesLoadingState.limit !== null };
    } else if (this.entriesLoadingState.status === "pending") {
      return { status: "pending" };
    } else if (this.entriesLoadingState.status === "error") {
      return { status: "error", message: String(this.entriesLoadingState.error) };
    } else {
      throw new Error("Impossible");
    }
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
    text-decoration: underline;
    margin-right: 0.25rem;
  }

  .open-modal-button {
    @include material-button("reference");

    border: none;
    padding: 0;
    margin: 0;
    opacity: 0.3;
  }

  .phantom-icon {
    margin: 0 !important;
    line-height: 1;
  }

  .value-text {
    margin: 0 0.25rem;
  }

  .action-button {
    border-radius: 0;
    display: flex;
    align-items: center;
    width: 100%;
    background: var(--input-backgroundColor, var(--default-backgroundColor));
  }

  .loading-box {
    height: 2rem;
  }
</style>
