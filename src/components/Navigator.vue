<i18n>
    {
        "en": {
            "logout": "Log out",
            "failed": "Failed to fetch main menu: {msg}"
        },
        "ru-RU": {
            "logout": "Выйти",
            "failed": "Ошибка получения главного меню: {msg}"
        }
    }
</i18n>

<template>
    <b-container class="main_nav">
        <b-alert variant="danger"
                 dismissible
                 :show="lastError !== null"
                 @dismissed="clearError">
            {{ $t('failed', { msg: lastError }) }}
        </b-alert>
        <b-container class="submain_nav" style="background:#F5C700">
            <b-row id="logout">
                <b-button @click="removeAuth()">{{ $t('logout') }}</b-button>
            </b-row>
            <template v-if="currentMenu !== null">
                <b-row class="menu_category subsubmain_nav" v-for="category in currentMenu.categories" :key="category.name">
                    <b-container class="nav_sec">
                        <b-row class="nav_sec_tit "><a>{{ $tm(category.name) }}</a></b-row>
                        <b-row>
                            <b-button class="nav_ent" :to="{ name: 'view', params: { name: button.name } }" v-for="button in category.buttons" :key="button.name">
                                {{ $tm(button.name) }}
                            </b-button>
                        </b-row>
                    </b-container>
                </b-row>
            </template>
        </b-container>
    </b-container>
</template>

<script lang="ts">
    import { Component, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { CurrentMainMenu } from "@/state/main_menu"

    const mainMenu = namespace("mainMenu")
    const auth = namespace("auth")

    @Component
    export default class Navigator extends Vue {
        @auth.Mutation("removeAuth") removeAuth!: (_?: string) => void
        @mainMenu.Action("getMenu") getMenu!: () => Promise<void>
        @mainMenu.State("current") currentMenu!: CurrentMainMenu | null
        @mainMenu.Mutation("clearError") clearError!: () => void
        @mainMenu.State("lastError") lastError!: string | null

        created() {
            if (this.currentMenu === null) {
                this.getMenu()
            }
        }
    }
</script>

<style scoped lang="scss">
    .menu_category {
        margin-top: 20px;
        padding-top: .75rem;
        padding-bottom: .75rem;
        background-color: rgba(86, 61, 124, .15);
        border: 1px solid rgba(86, 61, 124, .2);
    }
    .menu_category * {
        padding-left: 30px;
    }
</style>
