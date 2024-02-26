<i18n>
    {
        "en": {
            "header_1": "Create your own app",
            "header_2": "to continue",
            "description_1": "This is a read-only example. To start making changes, set up a personalized demo instance exclusively for yourself. Or contact our team to determine if ozma is the right fit for your needs.",
            "get_started": "Demo call",
            "sign_up": "Start your app with this demo"
        },
        "ru": {
            "header_1": "Создайте собственное приложение,",
            "header_2": "чтобы продолжить",
            "description_1": "Это демо-пример. Чтобы начать вносить изменения, создайте вашу собственную копию",
            "description_2": "или свяжитесь с менеджером ozma.io.",
            "get_started": "Связаться с менеджером ozma.io",
            "sign_up": "Начать ваше приложение с этим демо"
        },
        "es": {
            "header_1": "Crea tu propia aplicación",
            "header_2": "para continuar",
            "description_1": "Este es un ejemplo de solo lectura. Para continuar, crea tu propia aplicación",
            "description_2": "o ponte en contacto con el equipo de ozma.io.",
            "get_started": "Hacer una cita con el gerente",
            "sign_up": "Comience su aplicación con este demo"
        }
    }
</i18n>

<template>
  <ModalWindow
    adaptive
    class="demo-modal"
    :min-width="300"
    :min-height="200"
    height="auto"
    :name="uid"
    transition="demo-modal-transition"
    @opened="showOverlay = true"
    @closed="showOverlay = false"
  >
    <div class="demo-message-container">
      <div class="material-button close-button" @click="hide">
        <i class="material-icons">close</i>
      </div>
      <i class="material-icons demo-icon">error_outline</i>
      <div class="demo-message">
        <h5 class="demo-header">{{ $t('header_1') }} {{ $t('header_2') }}</h5>
        <span class="demo-body">
          {{ $t('description_1') }}
        </span>
      </div>
      <div class="buttons-container">
        <b-button
          class="button primary-button"
          block
          variant="primary"
          :href="signUpLink"
          target="_blank"
        >
          {{ $t('sign_up') }}
        </b-button>

        <b-button
          class="button secondary-button"
          variant="outline-primary"
          :href="getStartedLink"
          target="_blank"
        >
          {{ $t('get_started') }}
        </b-button>
      </div>
    </div>
  </ModalWindow>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { namespace } from 'vuex-class'

import { CurrentSettings } from '@/state/settings'
import ModalWindow from '@/components/modal/ModalWindow.vue'

import { instanceName } from '@/api'

const settings = namespace('settings')

@Component({ components: { ModalWindow } })
export default class ReadonlyDemoInstanceModal extends Vue {
  @settings.State('current') settings!: CurrentSettings

  private showOverlay = false
  private show() {
    this.$modal.show(this.uid)
  }

  private hide() {
    this.$modal.hide(this.uid)
  }

  private get locale() {
    return this.$root.$i18n.locale
  }

  private get getStartedLink() {
    let urlPart = ''
    if (this.locale === 'ru') {
      urlPart = 'ru/'
    } else if (this.locale === 'es') {
      urlPart = 'es/'
    } else {
      urlPart = ''
    }
    return this.settings.getEntry(
      'read_only_demo_instance_get_started_link',
      String,
      `https://ozma.io/${urlPart}get-started/`,
    )
  }

  private get signUpLink() {
    return this.settings.getEntry(
      'read_only_demo_instance_sign_up_link',
      String,
      `https://onboard.ozma.io/${instanceName}/${this.locale}`,
    )
  }
}
</script>

<style lang="scss" scoped>
.demo-modal ::v-deep > .vm--overlay {
  opacity: 0.4;
  background: #1e1e1e !important;
}

.demo-modal ::v-deep > .vm--modal {
  margin: 0 5%;
  box-shadow: none;

  border-radius: 0.5rem;
  max-width: min(90%, 28rem);
  max-height: 80%;
}

::v-deep {
  .demo-modal-transition-enter-active,
  .demo-modal-transition-leave-active {
    transition: all 0.8s cubic-bezier(0.68, -0.55, 0.26, 1.55);
  }

  .demo-modal-transition-enter,
  .demo-modal-transition-leave-to {
    transform: translateY(100%);
    opacity: 0;
  }

  .demo-modal-transition-enter-to,
  .demo-modal-transition-leave {
    opacity: 1;
  }
}

.demo-message-container {
  display: flex;
  flex-flow: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1.75rem 2rem;
  overflow-y: auto;
}
@include mobile {
  .demo-message-container {
    padding: 1.25rem 1rem;
  }
}

.close-button {
  display: flex;
  position: absolute;
  top: 0.625rem;
  right: 0.625rem;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background-color: rgba(229, 229, 229, 0.5);
  width: 1.5rem;
  height: 1.5rem;
  color: #777c87;

  .material-icons {
    font-size: 1rem;
  }
}

.demo-icon {
  color: #777c87;
  font-size: 3rem;
  line-height: 3rem;
}

.demo-message {
  display: flex;
  flex-direction: column;
}

.demo-header {
  color: #1f1f1f;
  font-weight: 600;
  text-align: center;
}

.demo-body {
  opacity: 0.8;
  color: #3d3d3d;
  font-size: 0.875rem;
  text-align: center;
}

.buttons-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.button {
  border-radius: 0.5rem;
  padding: 1rem;
}

.primary-button {
  background-color: #2361ff;
  &:hover {
    background-color: #163da3;
  }
}

.secondary-button {
  border-color: #e5edff;
  background-color: #e5edff;
  color: #2361ff;
  &:hover {
    background-color: #b8becc;
  }
}
</style>
