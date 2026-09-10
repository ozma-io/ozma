<i18n>
  {
    "en": {
      "sort": "Sort",
      "column": "Column",
      "direction": "Direction",
      "asc": "Ascending",
      "desc": "Descending",
      "no_sort": "No sort",
      "reset": "Reset"
    },
    "ru": {
      "sort": "Сортировка",
      "column": "Колонка",
      "direction": "Направление",
      "asc": "По возрастанию",
      "desc": "По убыванию",
      "no_sort": "Без сортировки",
      "reset": "Сбросить"
    },
    "es": {
      "sort": "Ordenar",
      "column": "Columna",
      "direction": "Dirección",
      "asc": "Ascendente",
      "desc": "Descendente",
      "no_sort": "Sin orden",
      "reset": "Restablecer"
    }
  }
</i18n>

<template>
  <fragment>
    <popper
      ref="popup"
      trigger="clickToOpen"
      transition="ozma-popover"
      enter-active-class="ozma-popover-enter-active"
      leave-active-class="ozma-popover-leave-active"
      :visible-arrow="false"
      :options="{
        placement: 'bottom-end',
        positionFixed: true,
        modifiers: {
          offset: { offset: '0, 10' },
          preventOverflow: { enabled: true, boundariesElement: 'viewport' },
          hide: { enabled: true },
          computeStyle: { gpuAcceleration: false },
        },
      }"
      :disabled="!visible"
      :force-show="visible"
      @document-click="visible = false"
    >
      <div class="popper shadow">
        <div class="sort-editor">
          <div class="sort-editor-body">
            <div class="sort-field">
              <label class="sort-label">{{ $t('column') }}</label>
              <select v-model="selectedColumn" class="sort-select form-control form-control-sm" @change="onColumnChange">
                <option :value="null">{{ $t('no_sort') }}</option>
                <option v-for="col in columns" :key="col.index" :value="col.index">
                  {{ $ustOrEmpty(col.caption) }}
                </option>
              </select>
            </div>
            <div v-if="selectedColumn !== null" class="sort-field">
              <label class="sort-label">{{ $t('direction') }}</label>
              <select v-model="selectedAsc" class="sort-select form-control form-control-sm" @change="onAscChange">
                <option :value="true">{{ $t('asc') }}</option>
                <option :value="false">{{ $t('desc') }}</option>
              </select>
            </div>
          </div>
          <div class="footer">
            <b-button variant="outline-secondary" size="sm" @click="reset">
              {{ $t('reset') }}
            </b-button>
          </div>
        </div>
      </div>
      <!-- eslint-disable vue/no-deprecated-slot-attribute -->
      <ButtonItem slot="reference" class="sort-button" :button="button" />
    </popper>
  </fragment>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import Popper from '@/components/common/OzmaPopper.vue'

import { outlinedInterfaceButtonVariant } from '@/utils_colors'
import { Button } from './buttons/buttons'
import ButtonItem from './buttons/ButtonItem.vue'
import { UserString } from '@/state/translations'

export interface ISortColumn {
  index: number
  caption: UserString
}

export interface ISortEditorProps {
  columns: ISortColumn[]
  sortColumn: number | null
  sortAsc: boolean
  onSort: (column: number | null, asc: boolean) => void
}

@Component({ components: { ButtonItem, Popper } })
export default class SortEditor extends Vue {
  @Prop({ type: Object, required: true }) sortEditorProps!: ISortEditorProps

  private visible = false
  private selectedColumn: number | null = null
  private selectedAsc = true

  get columns() {
    return this.sortEditorProps.columns
  }

  @Watch('sortEditorProps.sortColumn')
  onExternalSortColumnChanged() {
    this.selectedColumn = this.sortEditorProps.sortColumn
  }

  @Watch('sortEditorProps.sortAsc')
  onExternalSortAscChanged() {
    this.selectedAsc = this.sortEditorProps.sortAsc
  }

  mounted() {
    this.selectedColumn = this.sortEditorProps.sortColumn
    this.selectedAsc = this.sortEditorProps.sortAsc
  }

  onColumnChange() {
    if (this.selectedColumn === null) {
      this.sortEditorProps.onSort(null, true)
    } else {
      this.sortEditorProps.onSort(this.selectedColumn, this.selectedAsc)
    }
  }

  onAscChange() {
    if (this.selectedColumn !== null) {
      this.sortEditorProps.onSort(this.selectedColumn, this.selectedAsc)
    }
  }

  private get button(): Button {
    return {
      type: 'callback',
      variant: outlinedInterfaceButtonVariant,
      icon: 'swap_vert',
      caption: this.$t('sort').toString(),
      tooltip: '',
      callback: () => {
        this.visible = !this.visible
      },
    }
  }

  private reset() {
    this.selectedColumn = null
    this.selectedAsc = true
    this.sortEditorProps.onSort(null, true)
  }
}
</script>

<style lang="scss" scoped>
.popper {
  border-radius: 1rem;
}

.sort-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: min(20rem, 90vw);
  padding: 1.25rem 0.75rem 1rem;
}

.sort-editor-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sort-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sort-label {
  font-size: 0.8rem;
  color: var(--default-foregroundDarkerColor);
  margin: 0;
}

.sort-select {
  border-radius: 0.5rem;
}

.footer {
  display: flex;
  justify-content: flex-end;
}
</style>
