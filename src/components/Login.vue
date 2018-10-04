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
    import { Component, Vue } from 'vue-property-decorator'
    import { namespace } from 'vuex-class'

    const mainMenu = namespace('auth')

    @Component
    export default class Login extends Vue {
        @mainMenu.Mutation('clearError') clearError!: () => void
        @mainMenu.Action('requestAuth') requestAuth!: (_: { username: string, password: string }) => Promise<void>
        @mainMenu.State('lastError') lastError!: string | null

        username = ""
        password = ""

        async sendLogin(): Promise<void> {
            await this.requestAuth({ username: this.username, password: this.password })
            if (this.$store.state.auth.current !== null) {
                const nextUrl = (this.$route.query.redirect !== undefined) ? this.$route.query.redirect : "/"
                this.$router.replace(nextUrl)
            }
        }
    }
</script>