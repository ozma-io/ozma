<i18n>
    {
        "en": {
            "header_1": "Schedule a demo call",
            "header_2": "to continue",
            "description_1": "It's read-only example. To start making changes, contact our team, and we will create a personal demonstration instance just for you.",
            "get_started": "Demo call",
            "sign_up": "Sign up (only if you know SQL and JS)"
        },
        "ru": {
            "header_1": "Свяжитесь с ozma.io",
            "header_2": "чтобы продолжить",
            "description_1": "Это демо-пример. Чтобы начать вносить изменения,",
            "description_2": "свяжитесь с менеджером ozma.io.",
            "get_started": "Связаться с менеджером ozma.io",
            "sign_up": "Зарегистрироваться (только если вы знаете SQL и JS)"
        },
        "es": {
            "header_1": "Conéctate con ozma.io",
            "header_2": "a continuar",
            "description_1": "Es un ejemplo de solo lectura. Para comenzar, haga cambios,",
            "description_2": "haga una cita con un gerente y crearemos una instancia personal para usted.",
            "get_started": "Hacer una cita con el gerente",
            "sign_up": "Registrarse (solo si sabes SQL y JS)"
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
      <div
        class="material-button close-button"
        @click="hide"
      >
        <i class="material-icons">close</i>
      </div>
      <i class="material-icons demo-icon">error_outline</i>
      <div class="demo-message">
        <h5 class="demo-header">
          {{ $t("header_1") }} {{ $t("header_2") }}
        </h5>
        <span class="demo-body">
          {{ $t("description_1") }}
        </span>
      </div>
      <div class="buttons-container">
        <b-button
          class="ok-button"
          block
          variant="primary"
          :href="getStartedLink"
          target="_blank"
        >
          {{ $t("get_started") }}
        </b-button>

        <!--
        <b-button
          class="ok-button"
          variant="outline-primary"
          :href="signUpLink"
          target="_blank"
        >
          {{ $t("sign_up") }}
        </b-button>
        -->
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

  private get locale() {
    return this.$root.$i18n.locale;
  }

  private get getStartedLink() {
    let urlPart = "";
    if (this.locale === "ru") {
      urlPart = "ru/";
    } else if (this.locale === "es") {
      urlPart = "es/";
    } else {
      urlPart = "";
    }
    return this.settings.getEntry("read_only_demo_instance_get_started_link", String, `https://ozma.io/${urlPart}get-started/`);
  }

  private get signUpLink() {
    return this.settings.getEntry("read_only_demo_instance_sign_up_link", String, `https://onboard.ozma.io/register?locale=${this.locale}&lp=demo-x`);
  }
}
</script>

<style lang="scss" scoped>
  .demo-modal ::v-deep > .vm--overlay {
    background: #1E1E1E !important;
    opacity: 0.4;
  }

  .demo-modal ::v-deep > .vm--modal {
    max-height: 80%;
    max-width: min(90%, 28rem);
    margin: 0 5%;

    border-radius: 0.5rem;
    box-shadow: none;
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
    padding: 1.75rem 2rem;
    display: flex;
    gap: 1.5rem;
    flex-flow: column;
    align-items: center;
    overflow-y: auto;
  }
  @media screen and (max-width: 480px) {
    .demo-message-container {
      padding: 1.25rem 1rem;
    }
  }

  .close-button {
    position: absolute;
    top: 0.625rem;
    right: 0.625rem;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(229, 229, 229, 0.50);
    color: #777C87;
    border-radius: 50%;

    .material-icons {
      font-size: 1rem;
    }
  }

  .demo-icon {
    font-size: 3rem;
    line-height: 3rem;
    color: #777C87;
  }

  .demo-message {
    display: flex;
    flex-direction: column;
  }

  .demo-header {
    text-align: center;
    font-weight: 600;
    color: #1F1F1F;
  }

  .demo-body {
    font-size: 0.875rem;
    text-align: center;
    color: #3D3D3D;
    opacity: 0.8;
  }

  .buttons-container {
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .ok-button {
    padding: 1rem;
    background-color: #2361FF;
    border-radius: 0.5rem;
    &:hover {
      background-color: #163da3;
    }
  }
</style>
