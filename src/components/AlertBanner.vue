<template>
  <b-alert
    :show="messageHtml !== ''"
    class="custom-alert mb-0"
    :style="colorVariables"
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

@Component
export default class AlertBanner extends Vue {
  @Prop({ type: String, required: true }) message!: string;
  @Prop({ type: Object, required: true }) colorVariables!: Record<string, unknown> | null;

  private get messageHtml() {
    return sanitize(this.message);
  }
}
</script>

<style lang="scss" scoped>
  .custom-alert {
    background-color: var(--banner-backgroundColor, #bee5eb);
    color: var(--banner-foregroundColor, #0c5460);
    border-color: var(--banner-borderColor, #bee5eb);
  }
</style>
