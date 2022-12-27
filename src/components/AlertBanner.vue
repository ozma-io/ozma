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
      <ButtonItem
        v-if="showContactButton"
        class="contact-button"
        :button="contactButton"
      />
      <ButtonItem
        v-if="showInviteButton"
        class="invite-button"
        :button="inviteButton"
      />
      <ButtonItem
        v-if="showSignUpButton"
        class="sign-up-button"
        :button="signUpButton"
      />
    </div>
  </b-alert>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import sanitizeHtml from "sanitize-html";

import { bootstrapVariantAttribute } from "@/utils_colors";
import { eventBus } from "@/main";
import ButtonItem from "@/components/buttons/ButtonItem.vue";

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
  @Prop({ type: String, required: false, default: "en" }) language!: string;
  @Prop({ type: Boolean, default: false }) showContactButton!: boolean;
  @Prop({ type: Boolean, default: false }) showInviteButton!: boolean;
  @Prop({ type: Boolean, default: false }) showSignUpButton!: boolean;

  private get messageHtml() {
    return sanitize(this.message);
  }

  private get langPartURL() {
    let urlPart = "";
    if (this.language === "ru") {
      urlPart = `/${this.language}`;
    } else if (this.language === "es") {
      urlPart = "";
    } else {
      urlPart = "";
    }
    return urlPart;
  }

  private get contactButton() {
    return {
      caption: this.$t("contact").toString(),
      variant: bootstrapVariantAttribute("info"),
      type: "link",
      link: { type: "href", href: `https://ozma.io${this.langPartURL}/get-started/`, target: "blank" },
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

  private get signUpButton() {
    return {
      icon: "waving_hand",
      caption: this.$t("sign_up").toString(),
      variant: bootstrapVariantAttribute("success"),
      type: "link",
      link: { type: "href", href: `https://onboard.ozma.io/pm${this.langPartURL}`, target: "blank" },
    };
  }
}
</script>

<style lang="scss" scoped>
  .custom-alert {
    background-color: var(--banner-backgroundColor, #bee5eb);
    color: var(--banner-foregroundColor, #0c5460);
    border-color: var(--banner-borderColor, #bee5eb);
    border-radius: 0;
  }

  .content-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .contact-button,
  .invite-button,
  .sign-up-button {
    margin: -1rem 0.5rem;
    padding: 0.25rem 1.25rem;
    align-self: center;

  }

  ::v-deep .contact-button .btn {
    padding: 0 0.5rem;
  }

  ::v-deep .sign-up-button .btn {
    padding: 0.25rem 1.25rem;
    margin: 0 0.5rem;
    font-size: 1rem;
    font-weight: normal;
  }
</style>
