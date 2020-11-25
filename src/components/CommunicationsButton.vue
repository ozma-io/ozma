<template>
  <div
    v-if="hasLinks"
    class="comm_icon__container"
  >
    <div
      :class="['comm_icon__trigger', {'comm_icon__trigger_opened': isOpen}]"
      @click="onClick"
    >
      <div class="comm_icon__open">
        <svg
          width="35"
          height="32"
          viewBox="0 0 35 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.2667 12.6981H23.3667M11.2667 16.4717H23.3667M4.8104 23.5777C2.4311 21.1909 1 18.1215 1 14.7736C1 7.16679 8.38723 1 17.5 1C26.6128 1 34 7.16679 34 14.7736C34 22.3804 26.6128 28.5472 17.5 28.5472C15.6278 28.5472 13.8286 28.2868 12.1511 27.8072L12 27.7925L5.03333 31V23.8219L4.8104 23.5777Z"
            stroke="#ffffff"
            stroke-width="2"
            stroke-miterlimit="10"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <div class="comm_icon__close">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 23 23"
        >
          <g fillrule="evenodd">
            <path
              d="M10.314 -3.686H12.314V26.314H10.314z"
              transform="rotate(-45 11.314 11.314)"
            />
            <path
              d="M10.314 -3.686H12.314V26.314H10.314z"
              transform="rotate(45 11.314 11.314)"
            />
          </g>
        </svg>
      </div>
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
    }
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
    box-shadow: 0 0 20px 0 rgba(0, 0, 0, 0.75);
    height: 60px;
    width: 60px;
    display: flex;
    justify-content: center;
    background-color: #08c;
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
    top: -200px;
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
