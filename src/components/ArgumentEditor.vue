<i18n>
  {
    "en": {
      "filters": "Filters",
      "hide": "Hide",
      "reset": "Reset",
      "apply": "Apply"
    },
    "ru": {
      "filters": "Фильтры",
      "hide": "Скрыть",
      "reset": "Сбросить",
      "apply": "Применить"
    },
    "es": {
      "filters": "Filtros",
      "hide": "Ocultar",
      "reset": "Reinicear",
      "apply": " Aplicar"
    }
  }
</i18n>

// TODO: popper closes when "Clear" button in multiselect clicked.
<template>
  <fragment>
    <!-- eslint-disable vue/v-on-event-hyphenation -->
    <popper
      v-if="button"
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
          computeStyle: {
            // GPU Acceleration breaks inner modals we use for selects on small devices.
            gpuAcceleration: false,
          },
        },
      }"
      :disabled="!visible"
      :force-show="visible"
      @document-click="onPopupDocumentClick"
    >
      <div class="popper shadow">
        <div
          class="arguments-editor"
          @keyup.enter="apply"
          @keyup.escape="updatedArguments = {}"
        >
          <b-container fluid>
            <b-row class="no-gutters">
              <b-col v-for="argument in args" :key="argument.name" cols="12">
                <FormControl
                  :value="currentArguments?.[argument.name] ?? null"
                  :is-nullable="argument.isOptional"
                  :field-type="argument.fieldType"
                  :type="argument.valueType"
                  :attributes="argument.attributes"
                  :attribute-mappings="argument.attributeMappings"
                  :caption="argument.caption"
                  compact-mode
                  :home-schema="userView.homeSchema"
                  :level="0"
                  @update="updateArgument(argument, $event)"
                />
              </b-col>
            </b-row>
          </b-container>

          <div v-if="!autoApply || canReset" class="footer">
            <b-button
              v-if="canReset"
              block
              variant="outline-secondary"
              class="apply-button"
              @click="resetToInitial"
            >
              {{ $t('reset') }}
            </b-button>
            <b-button
              v-if="!autoApply"
              block
              variant="primary"
              class="apply-button"
              @click="apply"
            >
              {{ $t('apply') }}
            </b-button>
          </div>
        </div>
      </div>
      <!-- eslint-disable vue/no-deprecated-slot-attribute -->
      <ButtonItem slot="reference" class="filters-button" :button="button" />
    </popper>
  </fragment>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { Debounce } from 'vue-debounce-decorator'
import { namespace } from 'vuex-class'

import {
  ArgumentName,
  AttributesMap,
  FieldType,
  ValueType,
} from '@ozma-io/ozmadb-js/client'
import Popper from '@/components/common/OzmaPopper.vue'
import {
  deserializeValueFunction,
  fieldToValueType,
  valueEquals,
} from '@/values'
import FormControl from '@/components/FormControl.vue'
import type {
  ConvertedBoundAttributesMap,
  ICombinedUserViewAny,
} from '@/user_views/combined'
import { UserString, rawToUserString } from '@/state/translations'
import { outlinedInterfaceButtonVariant } from '@/utils_colors'
import { Button } from './buttons/buttons'
import ButtonItem from './buttons/ButtonItem.vue'
import { mapMaybe } from '@/utils'

interface IArgumentInfo {
  name: ArgumentName
  defaultValue: any
  caption: UserString
  fieldType: FieldType
  valueType: ValueType
  isOptional: boolean
  attributes: AttributesMap
  attributeMappings: ConvertedBoundAttributesMap
}

export interface IApplyArgumentsParams {
  defaultArguments: Record<string, any>
  currentArguments: Record<string, any>
}
export interface IArgumentEditorProps {
  userView: ICombinedUserViewAny
  applyArguments: (params: IApplyArgumentsParams) => void
  // Serialised args from the moment this user view was first opened.
  // `null` disables the Reset button.
  initialArgumentsSnapshot?: Record<ArgumentName, unknown> | null
}

const settings = namespace('settings')

@Component({ components: { FormControl, ButtonItem, Popper } })
export default class ArgumentEditor extends Vue {
  @Prop({ type: Object, required: true }) userView!: ICombinedUserViewAny
  @Prop({ type: Function, required: true }) applyArguments!: (
    params: IApplyArgumentsParams,
  ) => void
  @Prop({ default: null }) initialArgumentsSnapshot!: Record<
    ArgumentName,
    unknown
  > | null

  @settings.Getter('developmentModeEnabled') developmentModeEnabled!: boolean

  private visible = false
  private updatedArguments: Record<ArgumentName, unknown> = {}

  private onPopupDocumentClick(_popup: unknown, event?: MouseEvent) {
    if (this.isClickInsideCalendar(event)) {
      return
    }

    this.visible = false
  }

  private isClickInsideCalendar(event?: MouseEvent): boolean {
    const target = event?.target
    if (!(target instanceof Node)) {
      return false
    }

    return Array.from(document.querySelectorAll('.calendar-popper')).some(
      (el) => el.contains(target),
    )
  }

  @Watch('userView')
  propsChanged() {
    this.updatedArguments = {}
  }

  get defaultArguments() {
    if (this.userView.args.args === null) return null

    return Object.fromEntries(
      mapMaybe((argInfo) => {
        if (argInfo.defaultValue !== undefined) {
          const convertFunc = deserializeValueFunction(
            fieldToValueType(argInfo.argType),
          )
          const value =
            argInfo.defaultValue && convertFunc
              ? convertFunc(argInfo.defaultValue)
              : argInfo.defaultValue
          console.assert(value !== undefined)
          return [argInfo.name, value]
        } else if (argInfo.optional) {
          return [argInfo.name, null]
        } else {
          return [argInfo.name, undefined]
        }
      }, this.userView.info.arguments),
    )
  }

  get initialArguments() {
    if (this.userView.args.args === null) return null

    return Object.fromEntries(
      mapMaybe(([name, rawValue]) => {
        const argInfo = this.userView.argumentsMap[name]
        if (argInfo === undefined) {
          return undefined
        }
        const convertFunc = deserializeValueFunction(
          fieldToValueType(argInfo.argType),
        )
        const value = rawValue && convertFunc ? convertFunc(rawValue) : rawValue
        return [name, value]
      }, Object.entries(this.userView.args.args)),
    )
  }

  get currentArguments() {
    if (this.initialArguments === null) return null

    return {
      ...this.defaultArguments,
      ...this.initialArguments,
      ...this.updatedArguments,
    }
  }

  private get button(): Button | null {
    const visibleArgsCount = this.args.length
    if (visibleArgsCount === 0) {
      return null
    }
    if (
      this.userView.attributes['show_argument_editor'] ||
      this.userView.attributes['show_argument_button'] ||
      this.developmentModeEnabled
    ) {
      return {
        // TODO: Add 'expand' icon on the right to match design from Figma.
        type: 'callback',
        variant: outlinedInterfaceButtonVariant,
        icon: 'tune',
        caption: this.$t('filters').toString(),
        tooltip: '',
        callback: () => {
          this.visible = !this.visible
        },
      }
    }

    return null
  }

  apply() {
    if (this.defaultArguments === null || this.currentArguments === null) return

    this.applyArguments({
      defaultArguments: this.defaultArguments,
      currentArguments: this.currentArguments,
    })
  }

  // Args from `initialArguments` snapshot, deserialised the same way as
  // `defaultArguments` and `initialArguments` getters above.
  get initialSnapshotArguments() {
    if (
      this.initialArgumentsSnapshot === null ||
      this.defaultArguments === null
    ) {
      return null
    }
    const snapshot: Record<string, unknown> = { ...this.defaultArguments }
    for (const argInfo of this.userView.info.arguments) {
      const rawValue = this.initialArgumentsSnapshot[argInfo.name]
      if (rawValue === undefined) continue
      const convertFunc = deserializeValueFunction(
        fieldToValueType(argInfo.argType),
      )
      snapshot[argInfo.name] =
        rawValue && convertFunc ? convertFunc(rawValue) : rawValue
    }
    return snapshot
  }

  get canReset() {
    if (
      this.initialSnapshotArguments === null ||
      this.currentArguments === null
    ) {
      return false
    }
    return !this.argsEqual(this.currentArguments, this.initialSnapshotArguments)
  }

  private argsEqual(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
  ): boolean {
    for (const argInfo of this.userView.info.arguments) {
      const valueType = fieldToValueType(argInfo.argType)
      if (!valueEquals(valueType, a[argInfo.name], b[argInfo.name])) {
        return false
      }
    }
    return true
  }

  resetToInitial() {
    if (this.initialSnapshotArguments === null) return
    // Override every visible argument explicitly so currentArguments
    // recomputes to the snapshot.
    this.updatedArguments = { ...this.initialSnapshotArguments }
    if (this.autoApply) {
      this.debouncedApply()
    }
  }

  @Debounce(500)
  private debouncedApply() {
    this.apply()
  }

  private get autoApply() {
    return (
      this.userView.attributes['confirm_argument_changes'] === undefined ||
      !this.userView.attributes['confirm_argument_changes']
    )
  }

  private updateArgument(argument: IArgumentInfo, rawValue: unknown) {
    Vue.set(this.updatedArguments, argument.name, rawValue)

    if (this.autoApply) {
      this.debouncedApply()
    }
  }

  private get args(): IArgumentInfo[] {
    return mapMaybe((parameter) => {
      const attributes = this.userView.argumentAttributes[parameter.name] ?? {}
      if (attributes['visible'] === false) {
        return undefined
      }
      const attributeMappings =
        this.userView.argumentAttributeMappings[parameter.name] ?? {}
      const caption = rawToUserString(attributes['caption']) ?? parameter.name
      const type = parameter.argType
      const isOptional =
        parameter.optional || parameter.defaultValue !== undefined

      return {
        name: parameter.name,
        defaultValue: parameter.defaultValue,
        caption,
        fieldType: type,
        valueType: fieldToValueType(type),
        isOptional,
        attributes,
        attributeMappings,
      }
    }, this.userView.info.arguments)
  }
}
</script>

<style lang="scss" scoped>
.popper {
  border-radius: 1rem;
}

.arguments-editor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: min(30rem, 90vw);
  max-height: 30rem;
  text-align: left;

  .container-fluid {
    padding: 1.25rem 0.5rem;
    overflow: auto;

    ::v-deep .row > .col-12 {
      &:not(:last-child) {
        margin-bottom: 0.75rem;
      }
    }
  }
}

.footer {
  padding: 0 1rem 1rem 1rem;
}

.apply-button {
  border-radius: 1rem;
}

.filters-modal ::v-deep > .vm--modal {
  border-radius: 1.25rem;
}
</style>
