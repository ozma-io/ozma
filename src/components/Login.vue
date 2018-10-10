<i18n>
    {
        "en": {
        "username": "User name",
        "password": "Password",
        "login": "Log in",
        "failed": "Failed to log in: {msg}"
        },
        "ru-RU": {
        "username": "Имя пользователя",
        "password": "Пароль",
        "login": "Войти",
        "failed": "Ошибка авторизации: {msg}"
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

        <b-form @submit.prevent="sendLogin">
            <b-form-group id="usernameInputGroup"
                          :label="$t('username')"
                          label-for="usernameInput">
                <b-form-input id="usernameInput"
                              type="text"
                              v-model="username"
                              required />
            </b-form-group>

            <b-form-group id="passwordInputGroup"
                          :label="$t('password')"
                          label-for="passwordInput">
                <b-form-input id="passwordInput"
                              type="password"
                              v-model="password"
                              required />
            </b-form-group>

            <b-button type="submit" variant="primary">{{ $t('login') }}</b-button>
        </b-form>
    </b-container>
</template>

<script lang="ts">
    import { Component, Watch, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { CurrentAuth } from "../state/auth"

    const auth = namespace('auth')

    @Component
    export default class Login extends Vue {
        @auth.Mutation('clearError') clearError!: () => void
        @auth.Action('requestAuth') requestAuth!: (_: { username: string, password: string }) => Promise<void>
        @auth.State('lastError') lastError!: string | null
        @auth.State('current') current!: CurrentAuth | null

        username = ""
        password = ""

        @Watch('current')
        onAuthChanged() {
            if (this.current !== null) {
                const nextUrl = (this.$route.query.redirect !== undefined) ? this.$route.query.redirect : "/"
                this.$router.replace(nextUrl)
            }
        }

        async sendLogin() {
            await this.requestAuth({ username: this.username, password: this.password })
        }
    }
</script>