<i18n>
    {
        "en": {

            "failed": "Failed to fetch main menu: {msg}"
        },
        "ru-RU": {
            "failed": "Ошибка получения главного меню: {msg}"
        }
    }
</i18n>

<template>
    <b-container>
        <b-alert variant="danger"
                 dismissible
                 :show="lastError !== null"
                 @dismissed="clearError">
            {{ $t('failed', { msg: lastError }) }}
        </b-alert>

        <template v-if="currentMenu !== null">
            <b-row class="menu_category" v-for="category in currentMenu.categories" :key="category.name">
                <h5>{{ category.name }}</h5>
                <b-button-group>
                    <router-link :to="{ name: 'view', params: { name: button.name } }" v-for="button in category.buttons" :key="button.name">
                        <b-button>
                            {{ button.name }}
                        </b-button>
                    </router-link>
                </b-button-group>
            </b-row>
        </template>
    </b-container>
</template>

<script lang="ts">
    import { Component, Vue } from 'vue-property-decorator'
    import { namespace } from 'vuex-class'
    import { CurrentMainMenu } from '@/state/main_menu'

    const mainMenu = namespace('mainMenu')

    @Component
    export default class Navigator extends Vue {
        @mainMenu.Action('getMenu') getMenu!: () => Promise<void>
        @mainMenu.State('current') currentMenu!: CurrentMainMenu | null
        @mainMenu.Mutation('clearError') clearError!: () => void
        @mainMenu.State('lastError') lastError!: string | null

        created() {
            if (this.currentMenu === null) {
                this.getMenu()
            }
        }
    }
</script>

<style scoped lang="scss">
    .menu_category {
        padding-top: .75rem;
        padding-bottom: .75rem;
        background-color: rgba(86, 61, 124, .15);
        border: 1px solid rgba(86, 61, 124, .2);
    }
    .menu_category * {
        padding-left: 30px;
    }
</style>