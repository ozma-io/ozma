<i18n>
    {
        "en": {
            "dismiss_tooltip": "You will still be able to open hidden help pages using \"?\" button in the top-right corner",
            "dismiss_all": "Skip all",
            "dismiss": "Close"
        },
        "ru": {
            "dismiss_tooltip": "Скрытые страницы справки можно будет открыть с помощью кнопки с вопросительным знаком сверху справа",
            "dismiss_all": "Пропустить все",
            "dismiss": "Закрыть"
        }
    }
</i18n>

<template>
  <VueModal
    adaptive
    class="help-modal"
    :width="modalWidth"
    :height="modalHeight"
    :name="uid"
    transition="help-modal-transition"
    @closed="onClose"
  >
    <div class="help-container">
      <iframe
        ref="iframe"
        class="iframe"
        sandbox="allow-scripts allow-top-navigation"
        allowfullscreen
        :srcdoc="markup"
      />
      <div class="buttons-container">
        <b-button
          v-b-tooltip.hover.bottom.noninteractive="{
            title: $t('dismiss_tooltip').toString(),
            disabled: $isMobile,
          }"
          class="dismiss-all-button"
          variant="outline-secondary"
          @click="dismissAll"
        >
          {{ $t("dismiss_all") }}
        </b-button>

        <b-button
          v-b-tooltip.hover.bottom.noninteractive="{
            title: $t('dismiss_tooltip').toString(),
            disabled: $isMobile,
          }"
          class="ok-button"
          variant="primary"
          @click="dismiss"
        >
          {{ $t("dismiss") }}
        </b-button>
      </div>
    </div>
  </VueModal>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

@Component
export default class HelpModal extends Vue {
  @Prop({ type: String, required: true }) markup!: string;

  private get modalWidth() {
    return this.$isMobile ? "95%" : "800px";
  }

  private get modalHeight() {
    return this.$isMobile ? "95%" : "800px";
  }

  private mounted() {
    this.$modal.show(this.uid);
  }

  private dismissAll() {
    this.$emit("dismiss-all");
    this.close();
  }

  private dismiss() {
    this.$emit("dismiss");
    this.close();
  }

  private close() {
    this.$modal.hide(this.uid);
  }

  private onClose() {
    this.$emit("dismiss");
    this.$emit("closed");
  }
}
</script>

<style lang="scss" scoped>
  .help-modal ::v-deep > .vm--overlay {
    background: rgba(0, 0, 0, 0.8) !important;
  }

  .help-modal ::v-deep > .vm--modal {
    max-height: 95% !important;
  }

  ::v-deep {
    .help-modal-transition-enter-active,
    .help-modal-transition-leave-active {
      transition: all 1s ease-out;
    }

    .help-modal-transition-enter,
    .help-modal-transition-leave-to {
      transform: translateY(100%);
      opacity: 0;
    }

    .help-modal-transition-enter-to,
    .help-modal-transition-leave {
      opacity: 1;
    }
  }

  .help-container {
    height: 100%;
    padding: 1rem;
    display: flex;
    flex-flow: column;
    align-items: center;
    overflow-y: auto;
  }

  .iframe {
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    border: none;
    border-radius: 0.75rem;
    background-color: rgb(245, 245, 245); /* it's backgroundDarker1 color of light theme */
  }

  .buttons-container {
    width: 100%;
    padding-top: 0.5rem;
    border-top: 1px solid silver;
    display: flex;
    flex-flow: row;
    justify-content: space-between;
  }
</style>
