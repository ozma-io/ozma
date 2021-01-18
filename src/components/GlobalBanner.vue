<template>
  <b-alert
    :show="messageHtml !== ''"
    class="mb-0"
    :style="styles"
    :variant="variant"
    dismissible
    @dismissed="$emit('banner-close')"
  >
    <!-- eslint-disable vue/no-v-html -->
    <span v-html="messageHtml" />
    <!-- eslint-enable vue/no-v-html -->
  </b-alert>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import sanitizeHtml from "sanitize-html";

const sanitizeSettings = {
  allowedTags: ["b", "i", "em", "strong", "a"],
  allowedAttributes: {
    "a": ["href"],
  },
};

const sanitize = (message: string) => sanitizeHtml(message, sanitizeSettings);

const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1>(.*)<\/a>/;
// Adds Bootstrap's class on links.
const modifyLinks = (html: string) => html.replace(anchorRegex, "<a href='$2' class='alert-link'>$3</a>");

@Component
export default class GlobalBanner extends Vue {
  @Prop({ type: String, required: true }) message!: string;
  @Prop({ type: String, required: true }) variant!: string;
  @Prop({ type: Object, required: true }) styles!: string;

  private useBootstrapLinkStyles() {
    return Object.entries(this.styles).every(([_, value]) => value === "");
  }

  private get messageHtml() {
    let messageHtml = sanitize(this.message);
    if (this.useBootstrapLinkStyles()) {
      messageHtml = modifyLinks(messageHtml);
    }

    return messageHtml;
  }
}
</script>
