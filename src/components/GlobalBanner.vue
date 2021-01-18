<template>
  <b-alert
    v-model="show"
    class="mb-0"
    :style="styles"
    :variant="variant"
    dismissible
  >
    <!-- eslint-disable vue/no-v-html -->
    <span v-html="messageHtml" />
    <!-- eslint-enable vue/no-v-html -->
  </b-alert>
</template>

<script lang="ts">
import { Vue, Component, Watch } from "vue-property-decorator";
import { CurrentSettings } from "@/state/settings";
import { namespace } from "vuex-class";
import sanitizeHtml from "sanitize-html";

const settings = namespace("settings");

const sanitizeSettings = {
  allowedTags: ["b", "i", "em", "strong", "a"],
  allowedAttributes: {
    "a": ["href"],
  },
};

const sanitize = (message: string) => sanitizeHtml(message, sanitizeSettings);

const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1>(.*)<a>/;
// Adds Bootstrap's class on links.
const modifyLinks = (html: string) => html.replace(anchorRegex, "<a href='$2' class='alert-link'>$3</a>");

@Component
export default class GlobalBanner extends Vue {
  @settings.State("current") settings!: CurrentSettings;
  private show = false;
  private messageHtml = "";

  @Watch("settings")
  private watchSettings() {
    const message = this.settings.getEntry("banner_message", String, "");
    const viewedMessage = localStorage.getItem("viewed-banner-message");
    if (message.trim() === "" || message === viewedMessage) return;

    const messageHtml = modifyLinks(sanitize(message));

    if (messageHtml.trim() === "" || messageHtml === viewedMessage) return;

    this.messageHtml = messageHtml;
    this.show = true;
  }

  private get variant() {
    const validVariants = ["primary", "secondary", "success", "danger", "warning", "info", "light", "dark"];
    const variant = this.settings.getEntry("banner_variant", String, "info");
    return validVariants.includes(variant)
      ? variant
      : "info";
  }

  private get styles() {
    const background = this.settings.getEntry("banner_background_color", String, "");
    const color = this.settings.getEntry("banner_text_color", String, "");

    return {
      background,
      color,
    };
  }

  private useBootstrapLinkStyles() {
    return Object.entries(this.styles).every(([name, value]) => value !== "");
  }

  @Watch("show")
  private watchShow(newValue: boolean) {
    if (newValue !== false) return;
    localStorage.setItem("viewed-banner-message", this.messageHtml);
  }
}
</script>
