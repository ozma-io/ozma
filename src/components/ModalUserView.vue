<i18n>
    {
        "en": {
            "new_entry": "New entry",
            "error": "Error",
            "saved": "All changes saved",
        "show_errors": "Show errors",
        "staging_error": "Error while submitting changes: {msg}",
        "save_scoped": "Save scoped",
        "save_and_select_scoped": "Save and select",
        "disable_background_blur": "Disable background blur",
        "enable_background_blur": "Enable background blur"
      },
      "ru": {
            "new_entry": "Новая запись",
            "error": "Ошибка",
            "saved": "Все изменения сохранены",
            "show_errors": "Показать ошибки",
            "staging_error": "Ошибка сохранения изменений: {msg}",
            "save_scoped": "Сохранить вложенное",
            "save_and_select_scoped": "Сохранить и выбрать",
            "disable_background_blur": "Выключить размытие фона",
            "enable_background_blur": "Включить размытие фона"
        },
        "es": {
            "new_entry": "La nueva entrada",
            "error": "El error",
            "saved": "Todos los cambios están guardados",
            "show_errors": "Mostrar  los errores",
            "staging_error": "El error al enviar cambios: {msg}",
            "save_scoped": "Guardar con el ámbito",
            "save_and_select_scoped": "Guardar y seleccionar",
            "disable_background_blur": "Desactivar desenfoque de fondo",
            "enable_background_blur": "Activar desenfoque de fondo"
        }
    }
</i18n>

<template>
  <ModalPortal
    to="tabbed-modal"
    :autofocus="autofocus"
    :view="view"
    :overlay-blur-enabled="overlayBlurEnabled"
    @close="$emit('close')"
    @go-back="$emit('go-back')"
  >
    <template #header>
      <HeaderPanel
        :type="'modal'"
        :title="titleOrNewEntry ?? undefined"
        :buttons="buttons"
        :is-enable-filter="enableFilter"
        :filter-string="filterString"
        :view="view"
        :is-loading="isUserViewLoading"
        :argument-editor-props="argumentEditorProps"
        :sort-editor-props="sortEditorProps"
        @goto="$emit('goto', $event)"
      >
        <template #left-slot>
          <ButtonsPanel
            v-if="!$isMobile"
            class="main-buttons"
            :buttons="mainButtons"
          />
        </template>
      </HeaderPanel>
    </template>

    <section class="section-modal">
      <div class="view-container">
        <UserView
          ref="userViewRef"
          is-root
          in-container
          :args="view.args"
          :default-values="view.defaultValues"
          :selection-mode="selectionMode"
          :scope="uid"
          :filter="filterWords"
          :filter-string="filterString"
          @update:buttons="buttons = $event"
          @update:enable-filter="enableFilter = $event"
          @update:is-loading="isUserViewLoading = $event"
          @update:title="title = $event"
          @goto="$emit('goto', $event)"
          @goto-previous="$emit('goto-previous')"
          @select="$emit('select', $event)"
          @update:argument-editor-props="argumentEditorProps = $event"
          @update:sort-editor-props="sortEditorProps = $event"
        />
      </div>
    </section>
  </ModalPortal>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import { namespace } from 'vuex-class'

import type { IQuery } from '@/state/query'
import { queryLocation } from '@/state/query'
import {
  CurrentChanges,
  ISubmitResult,
  ScopeName,
} from '@/state/staging_changes'
import ModalPortal from '@/components/modal/ModalPortal'
import { router } from '@/modules'
import type { Button } from '@/components/buttons/buttons'
import HeaderPanel from '@/components/panels/HeaderPanel.vue'
import ButtonsPanel from '@/components/panels/ButtonsPanel.vue'
import { interfaceButtonVariant } from '@/utils_colors'
import { convertToWords } from '@/utils'
import { ErrorKey } from '@/state/errors'
import { UserString } from '@/state/translations'
import { IArgumentEditorProps } from './ArgumentEditor.vue'
import type { ISortEditorProps } from './SortEditor.vue'

const staging = namespace('staging')
const errors = namespace('errors')
const auth = namespace('auth')

@Component({ components: { ModalPortal, HeaderPanel, ButtonsPanel } })
export default class ModalUserView extends Vue {
  @auth.State('protectedCalls') protectedCalls!: number
  @staging.State('current') changes!: CurrentChanges
  @staging.Action('submit') submitChanges!: (_: {
    scope?: ScopeName
    preReload?: () => Promise<void>
    errorOnIncomplete?: boolean
  }) => Promise<ISubmitResult>
  @staging.Action('clearAdded') clearAdded!: (_: {
    scope?: ScopeName
    onlyUntouched?: boolean
  }) => Promise<void>
  @errors.State('errors') rawErrors!: Record<ErrorKey, string[]>
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean
  @Prop({ type: Object, required: true }) view!: IQuery
  @Prop({ type: Boolean, default: false }) autofocus!: boolean

  private title: UserString | null = null
  private buttons: Button[] = []

  private enableFilter = false
  private filterString = ''
  private isUserViewLoading = false

  private argumentEditorProps: IArgumentEditorProps | null = null
  private sortEditorProps: ISortEditorProps | null = null
  private overlayBlurEnabled = true

  private savedRecently: { show: boolean; timeoutId: NodeJS.Timeout | null } = {
    show: false,
    timeoutId: null,
  }

  private get isSaving(): boolean {
    return this.protectedCalls > 0
  }

  get errors() {
    return Object.entries(this.rawErrors).flatMap(([key, keyErrors]) =>
      keyErrors.map((error) => {
        return this.$t(`${key}_error`, { msg: error })
      }),
    )
  }

  private makeErrorToast() {
    this.$bvToast.hide()
    this.errors.forEach((error) => {
      this.$bvToast.toast(error.toString(), {
        title: this.$t('error').toString(),
        variant: 'danger',
        solid: true,
        autoHideDelay: 10000,
      })
    })
  }

  get titleOrNewEntry(): string | null {
    if (this.view.args.args === null) {
      return this.$t('new_entry').toString()
    } else {
      return this.title ? this.$ustOrEmpty(this.title) : null
    }
  }

  get filterWords() {
    const value = this.filterString
    if (value !== '') {
      return Array.from(new Set(convertToWords(value.toString())))
    }
    return []
  }

  private get mainButtons(): Button[] {
    return [
      {
        type: 'callback',
        icon: 'arrow_back',
        variant: interfaceButtonVariant,
        callback: () => this.$emit('go-back'),
      },
      {
        type: 'callback',
        icon: this.overlayBlurEnabled ? 'blur_off' : 'blur_on',
        tooltip: this.overlayBlurEnabled
          ? this.$t('disable_background_blur').toString()
          : this.$t('enable_background_blur').toString(),
        variant: interfaceButtonVariant,
        callback: () => {
          this.overlayBlurEnabled = !this.overlayBlurEnabled
          this.applyCurrentOverlayBlurState()
        },
      },
    ]
  }

  private openFullscreen() {
    void router.push(queryLocation(this.view))
  }

  private get currentModalOverlayEl(): HTMLElement | null {
    const exact = document.body.querySelector(
      `.vm--overlay[data-modal="${this.uid}"]`,
    ) as HTMLElement | null
    if (exact) return exact

    const root = this.$el as HTMLElement | undefined
    const container = root?.closest('.vm--container')
    if (!container) return null

    return container.querySelector('.vm--overlay') as HTMLElement | null
  }

  private applyCurrentOverlayBlurState() {
    const overlayEl = this.currentModalOverlayEl
    if (!overlayEl) return

    if (this.overlayBlurEnabled) {
      overlayEl.style.removeProperty('backdrop-filter')
      overlayEl.style.removeProperty('-webkit-backdrop-filter')
      return
    }

    overlayEl.style.setProperty('backdrop-filter', 'none')
    overlayEl.style.setProperty('-webkit-backdrop-filter', 'none')
  }

  private mounted() {
    this.$nextTick(() => {
      this.applyCurrentOverlayBlurState()
    })
  }

  private destroyed() {
    this.overlayBlurEnabled = true
    this.applyCurrentOverlayBlurState()
    void this.clearAdded({ scope: this.uid })
  }
}
</script>

<style lang="scss" scoped>
.main-buttons {
  flex-shrink: 0;
  margin-right: 0.25rem;
  margin-left: 0.25rem;
}

.section-modal {
  display: flex;
  position: relative;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.view-container {
  height: 100%;
  overflow: auto;
}

.fullscreen-button {
  cursor: pointer;
}

.save-cluster {
  display: flex;
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  flex-direction: column;
  align-items: center;
  z-index: 1000;

  &.is-mobile {
    right: 1rem;
    bottom: 1rem;
  }
}

.save-cluster-button {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  width: 3rem;
  height: 3rem;
}

.save-cluster-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  width: 3rem;
  height: 3rem;
  color: var(--default-backgroundDarker2Color);

  .material-icons {
    font-size: 2rem;
  }
}

.show-errors-button {
  margin-bottom: 0.5rem;
  background-color: #df4151;
  width: 3rem;
  height: 3rem;
  color: #831721;
}

.save-button {
  color: var(--StateTextColor);

  &.save {
    background-color: #39ac00;
  }
}

.saving-spinner {
  opacity: 0.5;
  border-width: 0.5rem;
  border-color: #39ac00;
  border-right-color: transparent;
  width: 3rem;
  height: 3rem;
}
</style>
