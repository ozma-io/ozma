<i18n>
    {
        "en": {
            "in_progress": "Authentication in progress. If this page is visible for too long it's most likely a problem on our side."
        },
        "ru": {
            "in_progress": "Производится аутентификация. Если вы видите эту страницу слишком долго - скорее всего на нашей стороне проблемы."
        }
    }
</i18n>

<template>
  <p>
    {{ $t('in_progress') }}
  </p>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class AuthResponse extends Vue {
}
</script>
