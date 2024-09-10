<i18n>
    {
        "en": {
            "in_progress": "Authentication in progress. If this page is visible for too long, ask your administrator for help."
        },
        "ru": {
            "in_progress": "Производится аутентификация. Если вы видите эту страницу слишком долго - напишите системному администратору."
        },
        "es": {
            "in_progress": "Se realiza la autenticación .Si esta página está visible durante demasiado tiempo, solicite ayuda a su administrador"
        }
    }
</i18n>

<template>
  <div
    class="loading-container h-100 p-3 d-flex flex-column justify-content-center align-items-center"
    style="background-color: rgb(0 0 0 / 5%); cursor: wait"
  >
    <div
      class="spinner-border"
      style="
        width: 3em;
        height: 3em;
        border-color: rgb(0 0 0 / 50%);
        border-right-color: transparent;
      "
    />
    <p class="message">
      {{ $t('in_progress') }}
    </p>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component
export default class AuthResponse extends Vue {}
</script>

<style lang="scss" scoped>
@keyframes fade-in {
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.message {
  transform: translateY(10px);
  opacity: 0;
  animation: fade-in 0.5s 3s forwards;
  margin-top: 10px;
}
</style>
