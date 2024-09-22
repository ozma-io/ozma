<i18n>
    {
        "en": {
            "delete": "Delete",
            "select": "Select"
        },
        "ru": {
            "delete": "Удалить",
            "select": "Выбрать"
        },
        "es": {
            "delete": "Eliminar",
            "select": "Seleccionar"
        }
    }
</i18n>

<template>
  <b-container :style="style" fluid class="p-0">
    <b-row class="no-gutters">
      <b-col size="12">
        <form class="form-entry">
          <FormGrid v-slot="{ element }" :grid-content="blocks">
            <!-- We pass `value` here and not calculate it in `FormField`; otherwise,
                 weirdly, it gets recomputed when any value in a row changes.
            -->
            <FormField
              v-if="element.type === 'field'"
              :element="element"
              :row="row"
              :value="row.values[element.index]"
              :uv="uv"
              :scope="scope"
              :level="level"
              :locked="locked"
              @goto="$emit('goto', $event)"
              @update="$emit('update', element.index, $event)"
            />
            <b-row v-else-if="element.type === 'buttons'">
              <b-col>
                <OzmaLink
                  v-for="(subBlock, subBlockI) in element.actions"
                  :key="subBlockI"
                  :link="subBlock.link"
                  @goto="$emit('goto', $event)"
                >
                  <b-button :key="subBlockI" block :variant="subBlock.variant">
                    {{ subBlock.name }}
                  </b-button>
                </OzmaLink>
              </b-col>
            </b-row>
          </FormGrid>
          <!-- FIXME FIXME FIXME look at permissions! -->
          <div
            v-if="showDelete && row.mainId !== undefined"
            class="delete-block"
          >
            <b-button variant="outline-danger" @click="$emit('delete')">
              {{ $t('delete') }}
            </b-button>
          </div>

          <div
            v-if="selectionMode && row.extra.selectionEntry !== undefined"
            class="delete-block"
          >
            <b-button
              variant="secondary"
              @click="$emit('select', row.extra.selectionEntry)"
            >
              {{ $t('select') }}
            </b-button>
          </div>
        </form>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import FormGrid from '@/components/form/FormGrid.vue'
import FormField from './FormField.vue'
import type {
  IFormCombinedUserView,
  FormGridElement,
  IFormExtendedRowCommon,
} from '@/components/views/Form.vue'

const isNumberWithSuffix = (str: string, suffix: string): boolean =>
  str.slice(-suffix.length) === suffix &&
  !Number.isNaN(Number(str.slice(0, suffix.length)))

@Component({ components: { FormGrid, FormField } })
export default class FormEntry extends Vue {
  @Prop({ type: Object, required: true }) uv!: IFormCombinedUserView
  @Prop({ type: Array, required: true }) blocks!: FormGridElement[]
  @Prop({ type: Object, required: true }) row!: IFormExtendedRowCommon
  @Prop({ type: Boolean, default: false }) locked!: boolean
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean
  @Prop({ type: String, required: true }) scope!: string
  @Prop({ type: Number, required: true }) level!: number
  @Prop({ type: Boolean, default: true }) isTopLevel!: boolean
  @Prop({ type: Boolean, default: true }) showDelete!: number

  get maxWidth(): string {
    if (!this.isTopLevel) return '100%'

    const defaultMaxWidth = '1140px'
    const maxWidth = this.uv.attributes['max_width']
    if (typeof maxWidth === 'number') return `${maxWidth}px`
    if (typeof maxWidth !== 'string') return defaultMaxWidth
    if (!Number.isNaN(Number(maxWidth))) return `${maxWidth}px`
    if (isNumberWithSuffix(maxWidth, 'px') || isNumberWithSuffix(maxWidth, '%'))
      return maxWidth
    return defaultMaxWidth
  }

  get style() {
    return {
      maxWidth: this.maxWidth,
    }
  }
}
</script>

<style scoped>
.form-entry {
  border-top: 0;
  border-bottom: 0;
}

.delete-block {
  display: inline-block;
  width: max-content;
}

@media screen and (aspect-ratio <= 13/9) {
  @media screen and (device-width <= 480px) {
    .delete-block {
      position: sticky;
      left: 0;
      margin-top: 10px;
    }
  }
}

@media screen and (orientation: portrait) {
  @media screen and (device-width <= 480px) {
    .form-entry {
      width: 100%;
    }
  }
}

@media print {
  .delete-block_delete-button {
    display: none !important;
  }
}
</style>
