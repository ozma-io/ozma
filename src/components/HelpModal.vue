<i18n>
    {
        "en": {
            "dismiss_tooltip": "You will still be able to open hidden help pages using \"?\" button in the top-right corner",
            "dismiss_all": "Disable hints",
            "dismiss": "Close"
        },
        "ru": {
            "dismiss_tooltip": "Скрытые страницы справки можно будет открыть с помощью кнопки с вопросительным знаком сверху справа",
            "dismiss_all": "Отключить подсказки",
            "dismiss": "Закрыть"
        },
        "es": {
            "dismiss_tooltip": "Aún podrá abrir páginas de ayuda ocultas usando \"?\" botón en la esquina superior derecha",
            "dismiss_all": "Deshabilitar sugerencias",
            "dismiss": "Cerrar"
        }
    }
</i18n>

<template>
  <ModalWindow
    adaptive
    class="help-modal"
    :width="modalWidth"
    :height="modalHeight"
    :name="uid"
    transition="help-modal-transition"
    @closed="onClose"
  >
    <div class="help-container">
      <EmbeddedContainer :srcdoc="markup" @goto="$emit('goto', $event)" />
      <div class="buttons-container">
        <b-button
          v-b-tooltip.hover.d1000.bottom.noninteractive="{
            title: $t('dismiss_tooltip').toString(),
            disabled: $isMobile,
          }"
          class="dismiss-all-button"
          variant="outline-secondary"
          @click="dismissAll"
        >
          {{ $t('dismiss_all') }}
        </b-button>

        <b-button
          v-b-tooltip.hover.d1000.bottom.noninteractive="{
            title: $t('dismiss_tooltip').toString(),
            disabled: $isMobile,
          }"
          class="ok-button"
          variant="primary"
          @click="dismiss"
        >
          {{ $t('dismiss') }}
        </b-button>
      </div>
    </div>
  </ModalWindow>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import ModalWindow from './modal/ModalWindow.vue'
import EmbeddedContainer from './EmbeddedContainer.vue'

@Component({ components: { ModalWindow, EmbeddedContainer } })
export default class HelpModal extends Vue {
  @Prop({ type: String, required: true }) markup!: string

  private get modalWidth() {
    return this.$isMobile ? '95%' : '800px'
  }

  private get modalHeight() {
    return this.$isMobile ? '95%' : '800px'
  }

  private mounted() {
    this.$modal.show(this.uid)
  }

  private dismissAll() {
    this.$emit('dismiss-all')
    this.close()
  }

  private dismiss() {
    this.$emit('dismiss')
    this.close()
  }

  private close() {
    this.$modal.hide(this.uid)
  }

  private onClose() {
    this.$emit('dismiss')
    this.$emit('closed')
  }
}
</script>

<style lang="scss" scoped>
.help-modal ::v-deep > .vm--overlay {
  background: rgba(0, 0, 0, 0.8) !important;
}

.help-modal ::v-deep > .vm--modal {
  max-height: 95% !important;
}

::v-deep {
  .help-modal-transition-enter-active,
  .help-modal-transition-leave-active {
    transition: all 1s ease-out;
  }

  .help-modal-transition-enter,
  .help-modal-transition-leave-to {
    transform: translateY(100%);
    opacity: 0;
  }

  .help-modal-transition-enter-to,
  .help-modal-transition-leave {
    opacity: 1;
  }
}

.help-container {
  display: flex;
  flex-flow: column;
  align-items: center;
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.buttons-container {
  display: flex;
  flex-flow: row;
  justify-content: space-between;
  border-top: 1px solid silver;
  padding-top: 0.5rem;
  width: 100%;
}
</style>
