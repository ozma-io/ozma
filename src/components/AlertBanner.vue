<i18n>
    {
        "en": {
            "invite_user": "Invite"
        },
        "ru": {
            "invite_user": "Пригласить"
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
        v-if="showInviteButton"
        class="invite-button"
        :button="inviteButton"
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
  @Prop({ type: Boolean, default: false }) showInviteButton!: boolean;

  private get messageHtml() {
    return sanitize(this.message);
  }

  private get inviteButton() {
    return {
      icon: "person_add",
      caption: this.$t("invite_user").toString(),
      variant: bootstrapVariantAttribute("success"),
      type: "callback",
      callback: () => eventBus.emit("showInviteUserModal"),
    };
  }
}
</script>

<style lang="scss" scoped>
  .custom-alert {
    background-color: var(--banner-backgroundColor, #bee5eb);
    color: var(--banner-foregroundColor, #0c5460);
    border-color: var(--banner-borderColor, #bee5eb);
  }

  .content-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .invite-button {
    margin: -1rem 0.5rem;
    padding: 0.25rem 1.25rem;
    align-self: center;
  }
</style>
