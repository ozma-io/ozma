<i18n>
    {
        "en": {
            "in_progress": "Authentication in progress. If this page is visible for too long, ask your administrator for help."
        },
        "ru": {
            "in_progress": "Производится аутентификация. Если вы видите эту страницу слишком долго - напишите системному администратору."
        }
    }
</i18n>

<template>
  <div
    class="loading-container h-100 p-3 d-flex flex-column justify-content-center align-items-center"
    style="background-color: rgba(0, 0, 0, 0.05); cursor: wait;"
  >
    <div
      class="spinner-border"
      style="width: 3em; height: 3em; border-color: rgba(0, 0, 0, 0.5); border-right-color: transparent;"
    />
    <p class="message">
      {{ $t('in_progress') }}
    </p>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class AuthResponse extends Vue {
}
</script>

<style lang="scss" scoped>
  @keyframes fade-in {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message {
    margin-top: 10px;
    opacity: 0;
    transform: translateY(10px);
    animation: fade-in 0.5s 3s forwards;
  }
</style>
