<template>
  <div
    v-if="hasLinks"
    class="comm_icon__container"
  >
    <div
      :class="['comm_icon__trigger', {'comm_icon__trigger_opened': isOpen}]"
      @click="onClick"
    >
      <i class="material-icons md-36 comm_icon__open">message</i>
      <i class="material-icons md-36 comm_icon__close">close</i>
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

import TelegramIcon from "@/components/SocialIcons/Telegram.vue";
import WhatsAppIcon from "@/components/SocialIcons/WhatsApp.vue";
import EmailIcon from "@/components/SocialIcons/Email.vue";

import { CurrentSettings } from "@/state/settings";

const buttonOrder = ["email", "whatsapp", "telegram"];

interface ISocialLinks {
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

<style scoped>
  .comm_icon__container {
    width: 60px;
    height: 60px;
  }

  .comm_icon__trigger {
    box-shadow: 0 5px 10px 0 rgba(0, 0, 0, 0.3);
    height: 60px;
    width: 60px;
    display: flex;
    justify-content: center;
    background-color: #17a2b8;
    align-items: center;
    position: relative;
    border-radius: 30px;
    cursor: pointer;
  }

  .comm_icon__trigger_opened {
    background-color: white;
  }

  .comm_icon__menu {
    opacity: 0;
    visibility: hidden;
    position: absolute;
    transition: visibility 0.7s, opacity 0.7s;
    top: -190px;
    padding: 5px;
    list-style: none;
  }

  .comm_icon__menu > li {
    margin-bottom: 10px;
  }

  .comm_icon__menu > li:last-of-type {
    margin-bottom: 0;
  }

  .comm_icon__menu_opened {
    opacity: 1;
    transition: visibility 0.7s, opacity 0.7s;
    visibility: visible;
  }

  .comm_icon__open {
    display: flex;
    justify-content: center;
    align-items: center;
    visibility: visible;
    opacity: 1;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    transition: visibility 0s, opacity 0.5s;
    color: white;
  }

  .comm_icon__close {
    position: absolute;
    opacity: 0;
    visibility: hidden;
    transition: visibility 0s, opacity 0.5s;
  }

  .comm_icon__trigger_opened > .comm_icon__open {
    visibility: hidden;
    opacity: 0;
  }

  .comm_icon__trigger_opened > .comm_icon__close {
    visibility: visible;
    opacity: 1;
  }

</style>
