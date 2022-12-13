<i18n>
    {
        "en": {
            "header_1": "Sign up",
            "header_2": "to continue",
            "description_1": "It's read-only example. To start making changes,",
            "description_2": "sign up and we will create personal instance for you.",
            "sign_up": "Sign up",
            "later": "Later"
        },
        "ru": {
            "header_1": "Зарегистрируйтесь",
            "header_2": "чтобы продолжить",
            "description_1": "Это демо-пример. Чтобы начать вносить изменения,",
            "description_2": "зарегистрируйтесь и мы создадим вам персональную копию.",
            "sign_up": "Зарегистрироваться",
            "later": "Посмотреть ещё"
        },
        "es": {
            "header_1": "Registrarse",
            "header_2": "A continuar",
            "description_1": "Es un ejemplo de solo lectura. Para comenzar, haga cambios,",
            "description_2": "Regístrese y crearemos una instancia personal para usted",
            "sign_up": "Registrarse",
            "later": "Ver más"
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
      <i class="material-icons demo-icon">waving_hand</i>
      <h1 class="demo-header">
        {{ $t("header_1") }}<br>{{ $t("header_2") }}
      </h1>
      <span class="demo-message">
        {{ $t("description_1") }}<br>{{ $t("description_2") }}
      </span>
      <div class="buttons-container">
        <b-button
          class="ok-button"
          variant="primary"
          :href="signUpLink"
          target="_blank"
        >
          {{ $t("sign_up") }}
        </b-button>

        <b-button
          class="cancel-button"
          variant="outline-secondary"
          @click="hide"
        >
          <a>
            {{ $t("later") }}
          </a>
        </b-button>
      </div>
    </div>
  </ModalWindow>
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { CurrentSettings } from "@/state/settings";
import ModalWindow from "@/components/modal/ModalWindow.vue";

const settings = namespace("settings");

@Component({ components: { ModalWindow } })
export default class ReadonlyDemoInstanceModal extends Vue {
  @settings.State("current") settings!: CurrentSettings;

  private showOverlay = false;
  private show() {
    this.$modal.show(this.uid);
  }

  private hide() {
    this.$modal.hide(this.uid);
  }

  private get signUpLink() {
    return this.settings.getEntry("read_only_demo_instance_sign_up_link", String, "https://onboard.ozma.io/register?locale=ru&lp=demo-x");
  }
}
</script>

<style lang="scss" scoped>
  .demo-modal ::v-deep > .vm--overlay {
    background: rgba(0, 0, 0, 0.8) !important;
  }

  .demo-modal ::v-deep > .vm--modal {
    max-height: 80% !important;
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
    padding: 1rem;
    display: flex;
    flex-flow: column;
    align-items: center;
    overflow-y: auto;
  }

  .demo-icon {
    margin-top: 1rem;
    margin-bottom: 2rem;
    font-size: 5rem;
    line-height: 6rem;
    color: var(--default-foregroundDarkerColor);
  }

  .demo-header {
    margin-bottom: 1rem;
    text-align: center;
    font-weight: bold;
  }

  .demo-message {
    text-align: center;
  }

  .buttons-container {
    margin-top: 2rem;
    margin-bottom: 1rem;
    display: flex;
    flex-flow: column;
  }

  .ok-button {
    margin-bottom: 1.5rem;
    font-weight: bold;
  }
</style>
