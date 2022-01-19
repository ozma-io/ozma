<i18n>
    {
        "en": {
            "help": "Contacts"
        },
        "ru": {
            "help": "Контакты"
        }
    }
</i18n>

<template>
  <div
    v-if="hasLinks"
    class="comm_icon__container"
  >
    <div
      :class="['comm_icon__trigger', { 'is-open': isOpen }]"
      @click="onClick"
    >
      <i class="material-icons comm_icon">{{ isOpen ? "close" : "message" }}</i>
      <span class="comm-text">{{ $t("help") }}</span>
    </div>
    <ul
      :class="['comm_icon__menu', { 'comm_icon__menu_opened': isOpen }]"
    >
      <li v-if="links.email">
        <a
          :href="`mailto:${links.email}`"
          target="_blank"
        >
          <EmailIcon />
        </a>
      </li>
      <li v-if="links.whatsapp">
        <a
          :href="links.whatsapp"
          target="_blank"
        >
          <WhatsAppIcon />
        </a>
      </li>
      <li v-if="links.telegram">
        <a
          :href="links.telegram"
          target="_blank"
        >
          <TelegramIcon />
        </a>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">

import { Vue, Component } from "vue-property-decorator";
import { namespace } from "vuex-class";

import TelegramIcon from "@/components/SocialIcons/TelegramIcon.vue";
import WhatsAppIcon from "@/components/SocialIcons/WhatsAppIcon.vue";
import EmailIcon from "@/components/SocialIcons/EmailIcon.vue";

import { CurrentSettings } from "@/state/settings";

const buttonOrder = ["email", "whatsapp", "telegram"];

export interface ISocialLinks {
  telegram?: string;
  whatsapp?: string;
  email?: string;
  [index: string]: string | undefined;
}

const settings = namespace("settings");

@Component({ components: {
  TelegramIcon,
  EmailIcon,
  WhatsAppIcon,
} })
export default class CommunicationsButton extends Vue {
  @settings.State("current") settings!: CurrentSettings;
  private isOpen = false;

  private get links(): ISocialLinks {
    return {
      telegram: this.settings.getEntry("instance_help_telegram", String, undefined),
      whatsapp: this.settings.getEntry("instance_help_whatsapp", String, undefined),
      email: this.settings.getEntry("instance_help_email", String, undefined),
    };
  }

  private get hasLinks(): boolean {
    return Object.keys(this.links).filter(link => this.links[link] !== undefined).length > 0;
  }

  private onClick() {
    this.isOpen = !this.isOpen;
  }
}

</script>

<style lang="scss" scoped>
  .comm_icon__trigger {
    min-width: 10rem;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 0.1rem 1rem;
    border: 1px solid #17a2b8;
    background-color: transparent;
    color: #17a2b8;
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    cursor: pointer;
    transition: opacity 0.2s;

    &.is-open {
      background-color: #07828855;
      border-color: #07828855;
      color: white;
    }

    &:not(:hover) {
      opacity: 0.7;
    }
  }

  .comm_icon__menu {
    position: absolute;
    bottom: 1.5rem;
    width: 100%;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    opacity: 0;
    visibility: hidden;
    list-style: none;
    transition: opacity 0.2s;
  }

  .comm_icon__menu > li:not(:last-of-type) {
    margin-bottom: 0.5rem;
  }

  .comm_icon__menu_opened {
    opacity: 1;
    visibility: visible;
  }

  .comm_icon {
    display: flex;
    justify-content: center;
    align-items: center;
    visibility: visible;
    opacity: 1;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    transition: visibility 0s, opacity 0.5s;
  }

  .comm-text {
    margin-left: 0.25rem;
    font-weight: bold;
    user-select: none;
  }
</style>
