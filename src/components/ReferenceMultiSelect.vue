<i18n>
  {
    "en": {
      "no_label": "No label",
      "error": "Error",
      "error_qrcode_is_inappropriate" : "QRCode is inappropriate"
    },
    "ru": {
      "no_label": "Без названия",
      "error": "Ошибка",
      "error_qrcode_is_inappropriate" : "QRCode не соответствует назначению"
    },
    "es": {
      "no_label": "Sin etiqueta",
      "error": "Error",
      "error_qrcode_is_inappropriate" : "El código QR es inapropiado"
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
      :process-filter="(f) => processFilter(f)"
      :compact-mode="compactMode"
      :option-color-variant-attribute="optionColorVariantAttribute"
      :option-variant-mapping="optionVariantMapping"
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
        <div class="option-wrapper">
          <OzmaLink
            v-if="select.option.value.link"
            class="option-link"
            :link="select.option.value.link"
            @goto="$emit('goto', $event)"
          >
            <i class="material-icons rounded-circle md-14 open-modal-button">
              {{ iconValue(select.option.value.link.target) }}
            </i>
          </OzmaLink>

          <!-- eslint-disable vue/no-v-html -->
          <span
            v-b-tooltip.hover.d1000.right.noninteractive="{
              title: select.option.label,
              disabled: $isMobile,
            }"
            class="option-text"
            :class="{ 'no-label': !select.option.labelHtml }"
            v-html="select.option.labelHtml || $t('no_label')"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
      </template>
      <template #actions>
        <button
          v-for="(action, index) in selectViews"
          :key="index"
          type="button"
          class="action-button"
          @click="beginSelect(action)"
        >
          <i class="material-icons md-18"> add </i>
          {{ action.name }}
        </button>
      </template>
      <template #qrcode-button>
        <b-input-group-append v-if="qrcodeInput">
          <b-button variant="outline-info" class="with-material-icon">
            <i class="material-icons qr_code" @click="openQRCodeScanner()">
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
        style="
          border-color: var(--cell-foregroundDarkerColor);
          border-right-color: transparent;
        "
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
import { Component, Prop, Watch } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'

import type {
  IFieldRef,
  IEntityRef,
  IViewExprResult,
  RowId,
  SchemaName,
  ValueType,
} from '@ozma-io/ozmadb-js/client'
import { Debounce } from 'vue-debounce-decorator'
import {
  ISelectOption,
  default as MultiSelect,
  LoadingResult,
  LoadingState,
} from '@/components/multiselect/MultiSelect.vue'
import { IQRCode, parseQRCode } from '@/components/qrcode/QRCode.vue'
import BaseEntriesView from '@/components/BaseEntriesView'
import SelectUserView from '@/components/SelectUserView.vue'
import { IQuery } from '@/state/query'
import { attrToLinkRef, IAttrToLinkOpts, Link } from '@/links'
import {
  currentValue,
  ICombinedValue,
  valueToPunnedText,
} from '@/user_views/combined'
import { mapMaybe, NeverError } from '@/utils'
import { equalEntityRef, valueIsNull } from '@/values'
import { CancelledError } from '@/modules'
import type { EntriesRef } from '@/state/entries'
import type { ScopeName } from '@/state/staging_changes'
import QRCodeScannerModal from '@/components/qrcode/QRCodeScannerModal.vue'
import type { ColorVariantAttribute } from '@/utils_colors'
import {
  colorVariantFromAttribute,
  extractOptionVariantCase,
} from '@/utils_colors'
import {
  getEntityFieldAttributes,
  getFieldAttributes,
} from '@/field_attributes'
import type { IConvertedBoundMapping } from '@/user_views/combined'
import { UserString, isOptionalUserString } from '@/state/translations'

export interface ICombinedReferenceValue {
  id: RowId
  link: Link | null
}

export interface IReferenceSelectAction {
  name: string
  query: IQuery
}

export type ReferenceSelectOption = ISelectOption<ICombinedReferenceValue>

const compareOptions = (
  a: ReferenceSelectOption,
  b: ReferenceSelectOption,
): number => {
  return a.label.localeCompare(b.label)
}

const valueIsSingle = (
  value: ICombinedValue | ICombinedValue[] | null,
): value is ICombinedValue => {
  return value !== null && 'value' in value
}

export interface IReferenceValue {
  value: number | null
  pun?: string | null
}

@Component({
  components: {
    MultiSelect,
    SelectUserView,
    QRCodeScannerModal,
  },
})
export default class ReferenceMultiSelect extends mixins(BaseEntriesView) {
  @Prop({ required: true }) value!: IReferenceValue | IReferenceValue[] | null
  @Prop({ type: Boolean, default: false }) single!: boolean
  @Prop({ type: Boolean, default: false }) required!: boolean
  @Prop({ type: Boolean, default: false }) disabled!: boolean
  @Prop({ type: Number }) height!: number | undefined
  @Prop({ type: Number }) optionsListHeight!: number | undefined
  @Prop({ type: Boolean, default: false }) autofocus!: boolean
  @Prop({ type: Object, required: true }) entries!: EntriesRef
  @Prop({ type: Object, required: true }) referenceEntity!: IEntityRef
  @Prop({ type: Array, default: () => [] })
  selectViews!: IReferenceSelectAction[]
  @Prop({ type: String }) homeSchema!: SchemaName | undefined
  @Prop({ type: Object }) linkAttr!: unknown | undefined
  @Prop({ type: Boolean, default: false }) qrcodeInput!: boolean
  @Prop({ type: String, default: 'no_scope' }) scope!: ScopeName
  @Prop({ validator: isOptionalUserString }) label!: UserString | undefined
  @Prop({ type: Boolean, default: false }) compactMode!: boolean
  @Prop({ type: Object }) optionColorVariantAttribute!: ColorVariantAttribute
  @Prop({ type: Object }) optionVariantMapping!: IConvertedBoundMapping | undefined
  @Prop({ type: Object }) referencingField!: IFieldRef | undefined

  selectedView: IQuery | null = null
  private fallbackVariantById: Record<number, unknown> = {}
  private fallbackVariantByPunExact: Record<string, unknown> = {}
  private fallbackVariantByPunContains: Array<{
    variant: unknown
    needles: string[]
  }> = []
  private fallbackVariantDefault: unknown = undefined
  private entityFallbackVariantById: Record<number, unknown> = {}
  private entityVariantCandidates:
    | Array<{ fieldName: string; expression: string }>
    | null = null
  private entityVariantIdsKey: string | null = null

  mounted() {
    void this.loadFallbackOptionVariantMapping()
    void this.loadEntityFallbackOptionVariants()
  }

  @Watch('referencingField', { immediate: true })
  onReferencingFieldChanged() {
    void this.loadFallbackOptionVariantMapping()
    void this.loadEntityFallbackOptionVariants()
  }

  @Watch('referenceEntity', { immediate: true, deep: true })
  onReferenceEntityChanged() {
    this.entityVariantCandidates = null
    this.entityFallbackVariantById = {}
    this.entityVariantIdsKey = null
    void this.loadEntityFallbackOptionVariants()
  }

  @Watch('currentEntries')
  onCurrentEntriesChanged() {
    void this.loadEntityFallbackOptionVariants()
  }

  @Watch('entriesOptions', { immediate: true, deep: true })
  onEntriesOptionsChanged() {
    void this.loadEntityFallbackOptionVariants()
  }

  private parseCaseOptionVariants(attributesText: string): void {
    this.fallbackVariantById = {}
    this.fallbackVariantByPunExact = {}
    this.fallbackVariantByPunContains = []
    this.fallbackVariantDefault = undefined

    const caseBody = extractOptionVariantCase(attributesText)
    if (caseBody === null) {
      const staticMatch = attributesText.match(/option_variant\s*=\s*'([^']+)'/im)
      if (staticMatch) {
        this.fallbackVariantDefault = staticMatch[1]
      }
      return
    }

    const inMatches = caseBody.matchAll(
      /WHEN[\s\S]*?\bIN\s*\(([^)]*)\)\s*THEN\s*'([^']+)'/gim,
    )
    for (const match of inMatches) {
      const idsRaw = match[1]
      const variant = match[2]
      const ids = idsRaw
        .split(',')
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((id) => Number.isFinite(id))
      for (const id of ids) {
        this.fallbackVariantById[id] = variant
      }
    }

    const equalsMatches = caseBody.matchAll(
      /WHEN[\s\S]*?=\s*(-?\d+)\s*THEN\s*'([^']+)'/gim,
    )
    for (const match of equalsMatches) {
      const id = Number.parseInt(match[1], 10)
      if (Number.isFinite(id)) {
        this.fallbackVariantById[id] = match[2]
      }
    }

    const equalsStringMatches = caseBody.matchAll(
      /WHEN[\s\S]*?=\s*'([^']+)'\s*THEN\s*'([^']+)'/gim,
    )
    for (const match of equalsStringMatches) {
      const value = match[1].toLowerCase()
      this.fallbackVariantByPunExact[value] = match[2]
    }

    const elseMatch = caseBody.match(/ELSE\s*'([^']+)'/im)
    if (elseMatch) {
      this.fallbackVariantDefault = elseMatch[1]
    }
    if (this.fallbackVariantDefault === undefined) {
      const isNotNullMatch = caseBody.match(
        /WHEN[\s\S]*?\bIS\s+NOT\s+NULL\s*THEN\s*'([^']+)'/im,
      )
      if (isNotNullMatch) {
        this.fallbackVariantDefault = isNotNullMatch[1]
      }
    }

    const whenThenMatches = caseBody.matchAll(
      /WHEN\s*([\s\S]*?)\s*THEN\s*'([^']+)'/gim,
    )
    for (const match of whenThenMatches) {
      const condition = match[1]
      const variant = match[2]
      const needles = Array.from(
        condition.matchAll(/like\s*'%([^%']+)%'/gim),
      )
        .map((m) => m[1].toLowerCase())
        .filter((s) => s.length > 0)

      if (needles.length > 0) {
        this.fallbackVariantByPunContains.push({ variant, needles })
      }
    }
  }

  private async loadFallbackOptionVariantMapping() {
    if (!this.referencingField) {
      this.fallbackVariantById = {}
      this.fallbackVariantDefault = undefined
      return
    }

    try {
      const attributesText = await getFieldAttributes(this.referencingField)
      if (attributesText !== null) {
        this.parseCaseOptionVariants(attributesText)
      }
    } catch (e) {
      // Best-effort fallback path; ignore and keep default option styling.
      console.warn('Failed to load fallback option variants', e)
      this.fallbackVariantById = {}
      this.fallbackVariantDefault = undefined
    }
  }

  private extractOptionVariantExpression(
    attributesText: string,
  ): string | null {
    const caseExpression = extractOptionVariantCase(attributesText)
    if (caseExpression !== null) {
      return caseExpression
    }

    const simpleStringMatch = attributesText.match(
      /option_variant\s*=\s*'([^']+)'/im,
    )
    if (simpleStringMatch) {
      return `'${simpleStringMatch[1]}'`
    }

    return null
  }

  private async loadEntityVariantCandidates(): Promise<
    Array<{ fieldName: string; expression: string }>
  > {
    if (this.entityVariantCandidates !== null) {
      return this.entityVariantCandidates
    }

    const { rows } = await getEntityFieldAttributes(this.referenceEntity)

    const candidates: Array<{ fieldName: string; expression: string }> = []
    for (const { fieldName, attributes } of rows) {
      // The shared loader fetches every attribute row for the entity; narrow it down
      // here instead of with an ILIKE in the query.
      if (!/option_variant/i.test(attributes)) {
        continue
      }
      const expression = this.extractOptionVariantExpression(attributes)
      if (expression) {
        candidates.push({ fieldName, expression })
      }
    }

    this.entityVariantCandidates = candidates
    return candidates
  }

  private getCurrentOptionIds(): number[] {
    if (!this.currentEntries) {
      return []
    }

    return Object.keys(this.currentEntries.entries)
      .map((rawId) => Number.parseInt(rawId, 10))
      .filter((id) => Number.isFinite(id))
  }

  private scoreCandidateFieldName(fieldName: string): number {
    const lower = fieldName.toLowerCase()
    if (lower === 'class_type') return 4
    if (lower.endsWith('_status') || lower === 'status') return 3
    if (lower.endsWith('_stage') || lower === 'stage') return 2
    if (lower.endsWith('_type') || lower === 'type') return 1
    return 0
  }

  private async loadEntityFallbackOptionVariants() {
    const ids = this.getCurrentOptionIds()
    if (ids.length === 0) {
      this.entityFallbackVariantById = {}
      this.entityVariantIdsKey = null
      return
    }

    const idsKey = ids.slice().sort((a, b) => a - b).join(',')
    if (this.entityVariantIdsKey === idsKey) {
      return
    }

    try {
      const candidates = await this.loadEntityVariantCandidates()
      if (candidates.length === 0) {
        this.entityFallbackVariantById = {}
        this.entityVariantIdsKey = idsKey
        return
      }

      const view = `"${this.referenceEntity.schema}"."${this.referenceEntity.name}"`
      const sortedCandidates = [...candidates].sort((a, b) => {
        return (
          this.scoreCandidateFieldName(b.fieldName) -
          this.scoreCandidateFieldName(a.fieldName)
        )
      })

      const evaluatedCandidates = await Promise.all(
        sortedCandidates.map(async (candidate, index) => {
          const query = `
{ $ids array(int) }:
SELECT id, (${candidate.expression}) AS variant
FROM ${view}
WHERE id = ANY($ids)
`

          try {
            const res = (await this.$store.dispatch(
              'callApi',
              {
                func: (api: any) => api.getAnonymousUserView(query, { ids }),
              },
              { root: true },
            )) as IViewExprResult

            const variantsById: Record<number, unknown> = {}
            let nonNullCount = 0
            const distinctValues = new Set<string>()

            for (const row of res.result.rows) {
              const id = Number(row.values[0]?.value)
              if (!Number.isFinite(id)) continue
              const value = row.values[1]?.value
              variantsById[id] = value
              if (value !== null && value !== undefined) {
                nonNullCount += 1
                distinctValues.add(String(value))
              }
            }

            return {
              index,
              score:
                nonNullCount * 1000 +
                distinctValues.size * 10 +
                this.scoreCandidateFieldName(candidate.fieldName),
              variantsById,
            }
          } catch (e) {
            console.warn(
              `Failed to evaluate entity option_variant candidate ${candidate.fieldName}`,
              e,
            )
            return null
          }
        }),
      )

      const validCandidates = evaluatedCandidates.filter(
        (x): x is { index: number; score: number; variantsById: Record<number, unknown> } => x !== null,
      )
      const bestCandidate = validCandidates.reduce<
        { index: number; score: number; variantsById: Record<number, unknown> } | null
      >((best, current) => {
        if (!best) return current
        if (current.score > best.score) return current
        if (current.score === best.score && current.index < best.index) return current
        return best
      }, null)

      this.entityFallbackVariantById = bestCandidate?.variantsById ?? {}
      this.entityVariantIdsKey = idsKey
    } catch (e) {
      console.warn('Failed to load entity fallback option variants', e)
      this.entityFallbackVariantById = {}
      this.entityVariantIdsKey = idsKey
    }
  }

  openQRCodeScanner() {
    ;(this.$refs.scanner as QRCodeScannerModal).scan()
  }

  @Watch('value', { immediate: true })
  // TODO: Possible unnecessary requests there, check this.
  loadPun() {
    if (this.single) {
      const value = this.value as ICombinedValue
      const rawValue = currentValue(value)
      if (value.pun || typeof rawValue !== 'number') return
      void this.fetchEntriesByIds(this.entries, [rawValue])
    } else {
      const values = this.value as ICombinedValue[]
      const neededValues = mapMaybe(
        (v) => (v.pun ? undefined : (currentValue(v) as number)),
        values,
      )
      if (neededValues.length === 0) return
      void this.fetchEntriesByIds(this.entries, neededValues)
    }
  }

  /* @Watch("entries")
   *  entriesRefChanged(newValue: EntriesRef) {
   *   void this.fetchEntries(newValue, this.requestedSearch, this.requestedLimit);
   * } */

  findValue(value: ICombinedValue): number | undefined {
    const currentId = currentValue(value) as number | null | undefined
    const idx = this.options!.findIndex((opt) => opt.value.id === currentId)
    return idx === -1 ? undefined : idx
  }

  get valueIndex(): number | number[] | null {
    if (!this.options) {
      return null
    }
    if (this.value === null) {
      return null
    }

    if (this.single) {
      return this.findValue(this.value as ICombinedValue) ?? null
    } else {
      return mapMaybe(
        (value) => this.findValue(value),
        this.value as ICombinedValue[],
      )
    }
  }

  get linkOpts(): IAttrToLinkOpts | undefined {
    return this.homeSchema ? { homeSchema: this.homeSchema } : undefined
  }

  private getVariantFromRawEntries(id: RowId, pun: string): unknown {
    const rawEntries = this.optionVariantMapping?.rawEntries
    if (!rawEntries) return undefined

    for (const entry of rawEntries) {
      const when = entry.when
      if (when === id || String(when) === String(id) || when === pun) {
        return entry.value
      }

      if (typeof when === 'object' && when !== null) {
        const whenObj = when as Record<string, unknown>
        const whenValue = whenObj['value'] ?? whenObj['id']
        const whenPun = whenObj['pun']

        if (
          whenValue === id ||
          String(whenValue) === String(id) ||
          whenValue === pun ||
          whenPun === pun
        ) {
          return entry.value
        }
      }
    }

    return undefined
  }

  private getVariantFromPunFallback(pun: string): unknown {
    const lowerPun = pun.toLowerCase()
    const exact = this.fallbackVariantByPunExact[lowerPun]
    if (exact !== undefined) {
      return exact
    }
    for (const rule of this.fallbackVariantByPunContains) {
      if (rule.needles.some((needle) => lowerPun.includes(needle))) {
        return rule.variant
      }
    }
    return undefined
  }

  private getHeuristicVariantByPun(pun: string): string | undefined {
    if (
      !this.referencingField ||
      this.referencingField.entity.schema !== 'crm' ||
      this.referencingField.entity.name !== 'actions_for_contacts' ||
      this.referencingField.name !== 'cancellation_status'
    ) {
      return undefined
    }

    const lowerPun = pun.toLowerCase()
    if (lowerPun.includes('произведен')) return 'request-status-done'
    if (
      lowerPun.includes('ожидание') ||
      lowerPun.includes('согласование') ||
      lowerPun.includes('подписание')
    ) {
      return 'request-status-progress'
    }
    if (
      lowerPun.includes('попросил') ||
      lowerPun.includes('передумал') ||
      lowerPun.includes('не оплатил') ||
      lowerPun.includes('мы отказали')
    ) {
      return 'request-status-cancel'
    }
    return 'request-status-neutral'
  }

  makeOption(id: RowId, pun: string): ReferenceSelectOption {
    const variantEntries = this.optionVariantMapping?.entries
    const numericId =
      typeof id === 'number' ? id : Number.parseInt(String(id), 10)
    const fallbackVariant =
      (Number.isFinite(numericId)
        ? this.fallbackVariantById[numericId]
        : undefined) ??
      this.getVariantFromPunFallback(pun) ??
      this.fallbackVariantDefault
    const rawVariant =
      variantEntries?.[id] ??
      variantEntries?.[String(id)] ??
      variantEntries?.[pun] ??
      this.getVariantFromRawEntries(id, pun) ??
      fallbackVariant ??
      (Number.isFinite(numericId)
        ? this.entityFallbackVariantById[numericId]
        : undefined) ??
      this.getHeuristicVariantByPun(pun) ??
      this.optionVariantMapping?.default
    const colorVariant = rawVariant !== undefined ? colorVariantFromAttribute(rawVariant) : undefined
    return {
      label: pun,
      value: {
        id,
        link: attrToLinkRef(this.linkAttr, id, this.linkOpts),
      },
      colorVariant,
    }
  }

  get valueOptions(): ReferenceSelectOption[] | null {
    const valueType: ValueType = { type: 'int' }
    if (
      valueIsNull(this.value) ||
      (valueIsSingle(this.value) && valueIsNull(this.value.value))
    ) {
      return []
    } else {
      const values = this.single
        ? [this.value as ICombinedValue]
        : (this.value as ICombinedValue[])
      const ret: ReferenceSelectOption[] = []
      for (const value of values) {
        const curValue = currentValue(value) as number | null | undefined
        if (
          curValue === null ||
          curValue === undefined ||
          // We skip entries that have already been properly loaded; they will appear in `entriesOptions`.
          (this.currentEntries !== null &&
            curValue in this.currentEntries.entries)
        ) {
          continue
        }

        if (
          value.pun === undefined &&
          // Value didn't fail to load (in that case, we want to show a numeric id instead)
          this.currentEntries?.pendingSingleEntries?.[curValue] !== null
        ) {
          // No pun for one of values -- wait till we finish loading.
          return null
        } else {
          ret.push(
            this.makeOption(curValue, valueToPunnedText(valueType, value)),
          )
        }
      }
      return ret
    }
  }

  get entriesOptions(): ReferenceSelectOption[] | null {
    if (this.currentEntries === null) {
      return null
    } else {
      return Object.entries(this.currentEntries.entries).map(([rawId, name]) =>
        this.makeOption(Number(rawId), name),
      )
    }
  }

  get options(): ReferenceSelectOption[] | null {
    return [...(this.valueOptions ?? []), ...(this.entriesOptions ?? [])].sort(
      compareOptions,
    )
  }

  setValue(id: number) {
    if (this.single) {
      this.$emit('update:value', id)
    } else {
      this.$emit('add-value', id)
    }
  }

  async setRawId(id: number): Promise<boolean> {
    const puns = await this.fetchEntriesByIds(this.entries, [id])
    if (!(id in puns)) {
      return false
    }

    this.setValue(id)
    return true
  }

  async selectFromScanner(content: IQRCode): Promise<boolean> {
    return this.setRawId(content.id)
  }

  async processQRCode(filterValue: string): Promise<boolean> {
    const qrcode = parseQRCode(filterValue)
    if (qrcode === null) {
      return false
    }

    if (!equalEntityRef(qrcode.entity, this.referenceEntity)) {
      this.makeToast(this.$t('error_qrcode_is_inappropriate').toString())
      return false
    }

    return this.setRawId(qrcode.id)
  }

  async processRawId(filterValue: string): Promise<boolean> {
    const id = Number(filterValue)
    if (filterValue === '' || Number.isNaN(id)) {
      return false
    }

    return this.setRawId(id)
  }

  async processFilter(filterValue: string): Promise<boolean> {
    if (await this.processQRCode(filterValue)) {
      return true
    }

    return this.processRawId(filterValue)
  }

  makeToast(message: string) {
    this.$bvToast.toast(message, {
      title: this.$t('error').toString(),
      variant: 'danger',
      solid: true,
      noAutoHide: true,
    })
  }

  iconValue(target: string) {
    return 'open_in_new'
  }

  selectFromView(id: number) {
    this.selectedView = null
    this.setValue(id)
  }

  closeSelectView() {
    this.selectedView = null
    this.$emit('popup-closed')
  }

  onPopupClosed() {
    if (this.selectedView === null) {
      this.$emit('popup-closed')
    }
  }

  beginSelect(action: IReferenceSelectAction) {
    this.selectedView = action.query
  }

  get loadingState(): LoadingState {
    switch (this.entriesLoadingState.status) {
      case 'not_asked':
        return { status: 'ok', moreAvailable: true }
      case 'pending':
        return { status: 'pending' }
      case 'ok':
        return {
          status: 'ok',
          moreAvailable: this.entriesLoadingState.limit !== null,
        }
      case 'error':
        return {
          status: 'error',
          message: String(this.entriesLoadingState.error),
        }
      default:
        throw new NeverError(this.entriesLoadingState)
    }
  }

  updateValue(index: number | null) {
    this.$emit(
      'update:value',
      index === null ? null : this.options![index].value.id,
    )
  }

  addValue(index: number) {
    this.$emit('add-value', this.options![index].value.id)
  }

  removeValue(index: number) {
    // We pass `remove-value` as is to support repeating ids.
    this.$emit('remove-index', index)
  }

  async loadMore(next: (_: LoadingResult) => void) {
    try {
      const moreAvailable = await this.fetchEntries(
        this.entries,
        this.requestedSearch,
        this.requestedLimit + 20,
      )
      next({ status: 'ok', moreAvailable })
    } catch (e) {
      if (!(e instanceof CancelledError)) {
        next({ status: 'error', message: String(e) })
      }
    }
  }

  @Debounce(200)
  updateFilter(filter: string) {
    void this.fetchEntries(this.entries, filter, 20)
  }
}
</script>

<style lang="scss" scoped>
.action-button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 0;
  background-color: var(--default-backgroundColor);
  padding: 0.6rem 1rem;
  width: 100%;
  color: #2361ff;
  &:hover {
    background-color: var(--default-backgroundDarker1Color);
  }
}

.loading-box {
  height: 2rem;
}

.option-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.option-link {
  display: flex;
  flex-shrink: 0;
  color: #000;
  &:hover {
    text-decoration: none;
  }
}

.open-modal-button {
  @include material-button('option');

  & {
    transition: box-shadow 0.1s;
  }
  &:hover {
    box-shadow:
      0 0 0rem 0.25rem rgba(0, 0, 0, 0.2),
      inset 0 1rem rgba(0, 0, 0, 0.2);
  }
}

.option-text {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  line-height: 1.1rem;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.no-label {
    opacity: 0.5;
  }
}

.compact-mode {
  .option-text {
    overflow: hidden;
    line-height: 1.1rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
