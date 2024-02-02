<i18n>
    {
        "en": {
            "not_found": "Page not found"
        },
        "ru": {
            "not_found": "Страница не найдена"
        },
        "es": {
            "not_found": "La página no está encontrada"
        }
    }
</i18n>

<template>
  <p>
    {{ $t('not_found') }}
  </p>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component
export default class NotFound extends Vue {}
</script>
