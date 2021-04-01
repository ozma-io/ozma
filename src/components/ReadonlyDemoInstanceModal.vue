<template>
  <VueModal
    adaptive
    :min-width="300"
    :min-height="200"
    height="auto"
    :name="uid"
    transition="modal"
    @opened="showOverlay = true"
    @closed="showOverlay = false"
  >
    <div class="demo-message-container">
      <i class="material-icons demo-icon">monetization_on</i>
      <h1 class="demo-header">
        Hello.
      </h1>
      <span class="demo-message">
        Buy Ozma, please.
      </span>
      <div class="buttons-container mt-5">
        <b-button
          class="mb-3"
          variant="success"
          href="http://google.com"
        >
          Let's do it!
        </b-button>

        <b-button
          variant="secondary"
          href="http://google.com"
        >
          <a>
            Hm, no
          </a>
        </b-button>
      </div>
    </div>
  </VueModal>
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator";

@Component
export default class ReadonlyDemoInstanceModal extends Vue {
  private showOverlay = false;
  show() {
    this.$modal.show(this.uid);
  }
}
</script>

<style lang="scss" scoped>
  .v--modal-overlay {
    background: rgba(0, 0, 0, 0.8) !important;
  }

  ::v-deep {
    .v--modal-box {
      max-height: 80% !important;
    }

    .modal-enter-active,
    .modal-leave-active {
      transition: all 0.8s cubic-bezier(0.68, -0.55, 0.26, 1.55);
    }

    .modal-enter,
    .modal-leave-to {
      transform: translateY(100%);
      opacity: 0;
    }

    .modal-enter-to,
    .modal-leave {
      opacity: 1;
    }
  }

  .demo-message-container {
    padding: 1rem;
    display: flex;
    flex-flow: column;
    align-items: center;
    overflow-y: auto;
  }

  .demo-icon {
    font-size: 5rem;
    line-height: 6rem;
  }

  .buttons-container {
    display: flex;
    flex-flow: column;
  }
</style>
