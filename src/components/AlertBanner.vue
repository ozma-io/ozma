<i18n>
    {
        "en": {
            "contact": "Request a demo call",
            "sign_up": "Sign Up",
            "invite_user": "Invite"
        },
        "ru": {
            "contact": "Заказать внедрение",
            "sign_up": "Зарегистрироваться",
            "invite_user": "Пригласить"
        },
        "es": {
            "contact": "Llamada de demostración",
            "sign_up": "Registrarse",
            "invite_user": "Invitar"
        }
    }
</i18n>

<template>
  <b-alert
    :show="messageHtml !== ''"
    class="custom-alert mb-0"
    :style="colorVariables"
    dismissible
    @dismissed="$emit('banner-close')"
  >
    <div class="content-wrapper">
      <!-- eslint-disable vue/no-v-html -->
      <span v-html="messageHtml" />
      <!-- eslint-enable vue/no-v-html -->
      <div class="buttons-wrapper">
        <ButtonItem
          v-if="showContactButton"
          class="contact-button"
          :button="contactButton"
        />
        <ButtonItem
          v-if="showSignUpButton"
          class="sign-up-button"
          :button="signUpButton"
        />
        <ButtonItem
          v-if="showInviteButton"
          class="invite-button"
          :button="inviteButton"
        />
      </div>
    </div>

    <template #dismiss>
      <div class="dismiss-button material-button">
        <i class="material-icons">close</i>
      </div>
    </template>
  </b-alert>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import sanitizeHtml from "sanitize-html";

import { bootstrapVariantAttribute } from "@/utils_colors";
import { eventBus } from "@/main";
import ButtonItem from "@/components/buttons/ButtonItem.vue";
import { Button } from "./buttons/buttons";

const sanitizeSettings = {
  allowedTags: ["b", "i", "em", "strong", "a"],
  allowedAttributes: {
    "a": ["href", "target"],
  },
};

const sanitize = (message: string) => sanitizeHtml(message, sanitizeSettings);

@Component({ components: { ButtonItem } })
export default class AlertBanner extends Vue {
  @Prop({ type: String, required: true }) message!: string;
  @Prop({ type: Object }) colorVariables!: Record<string, unknown> | null;
  @Prop({ type: Boolean, default: false }) showContactButton!: boolean;
  @Prop({ type: Boolean, default: false }) showSignUpButton!: boolean;
  @Prop({ type: Boolean, default: false }) showInviteButton!: boolean;

  private get messageHtml() {
    return sanitize(this.message);
  }

  private get contactButton(): Button {
    const language = this.$i18n.locale;
    let url = "https://ozma.io/get-started/";
    if (["ru"].includes(language)) {
      url = `https://ozma.io/${language}/get-started/`;
    }
    return {
      caption: this.$t("contact").toString(),
      variant: { type: "existing", className: "ctaButton" },
      type: "link",
      link: { type: "href", href: url, target: "blank" },
    };
  }

  private get inviteButton() {
    return {
      icon: "person_add",
      caption: this.$t("invite_user").toString(),
      variant: bootstrapVariantAttribute("success"),
      type: "callback",
      callback: () => eventBus.emit("show-invite-user-modal"),
    };
  }

  // TODO: add other options for sign up button, not only /crm
  private get signUpButton() {
    const language = this.$i18n.locale;
    let url = "https://onboard.ozma.io/crm";
    if (["ru"].includes(language)) {
      url = `https://onboard.ozma.io/crm/${language}`;
    }
    return {
      caption: this.$t("sign_up").toString(),
      variant: bootstrapVariantAttribute("info"),
      type: "link",
      link: { type: "href", href: url, target: "blank" },
    };
  }
}
</script>

<style lang="scss" scoped>
  .custom-alert {
    padding: 1rem 3.75rem;
    padding-right: 6.75rem;
    background-color: var(--banner-backgroundColor, #dde5f8);
    color: var(--banner-foregroundColor, black);
    border-color: var(--banner-borderColor, #dde5f8);
    border-radius: 0;

    @include mobile {
      padding: 1.25rem 1rem;
      padding-right: 3rem;
    }

    ::v-deep {
      .close {
        padding: 1rem 3rem;
        opacity: 1;

        @include mobile {
          padding: 0.75rem;
        }
      }
    }
  }

  .dismiss-button {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #eef2fb;
    color: #777C87;
    border-radius: 50%;
    opacity: 1;
  }

  .content-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    font-size: 0.9375rem;

    @include mobile {
      flex-direction: column;
    }
  }

  .buttons-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .contact-button,
  .invite-button,
  .sign-up-button {

    &:hover {
      text-decoration: none;
    }

    ::v-deep {
      .btn {
        padding: 0.5rem 1rem;
        font-size: 0.75rem;
      }
    }
  }
</style>
