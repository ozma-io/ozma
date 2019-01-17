<i18n>
    {
        "en-US": {
            "not_found": "Page not found"
        },
        "ru-RU": {
            "not_found": "Страница не найдена"
        }
    }
</i18n>

<template>
    <p>
        {{ $t('not_found') }}
    </p>
</template>

<script lang="ts">
    import { Component, Vue } from "vue-property-decorator"

    @Component
    export default class NotFound extends Vue {
    }
</script>
