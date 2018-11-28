<i18n>
    {
        "en-US": {
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
    <b-container class="main_aut">
        <b-alert variant="danger"
                 dismissible
                 :show="lastError !== null"
                 @dismissed="clearError">
            {{ $t('failed', { msg: lastError }) }}
        </b-alert>

        <b-form @submit.prevent="sendLogin" class="aut">
            <b-form-group id="usernameInputGroup"
                          :label="$t('username')"
                          label-for="usernameInput"
                          class="group">
                <b-form-input id="usernameInput"
                              class="text"
                              type="text"
                              v-model="username"
                              required />
            </b-form-group>

            <b-form-group id="passwordInputGroup"
                          :label="$t('password')"
                          label-for="passwordInput"
                          class="group">
                <b-form-input id="passwordInput"
                              class="text"
                              type="password"
                              v-model="password"
                              required />
            </b-form-group>

            <b-button type="submit" class="btnn" variant="primary">{{ $t('login') }}</b-button>
        </b-form>
    </b-container>
</template>

<script lang="ts">
    import { Component, Watch, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { CurrentAuth } from "@/state/auth"

    const auth = namespace("auth")

    @Component
    export default class Login extends Vue {
        @auth.Mutation("clearError") clearError!: () => void
        @auth.Action("requestAuth") requestAuth!: (_: { username: string, password: string }) => Promise<void>
        @auth.State("lastError") lastError!: string | null
        @auth.State("current") current!: CurrentAuth | null

        username = ""
        password = ""

        @Watch("current")
        onAuthChanged() {
            if (this.current !== null) {
                let nextUrl
                const redirect = this.$route.query.redirect
                if (redirect !== undefined) {
                    nextUrl = Array.isArray(redirect) ? redirect[0] : redirect
                } else {
                    nextUrl = "/"
                }
                this.$router.replace(nextUrl)
            }
        }

        async sendLogin() {
            await this.requestAuth({ username: this.username, password: this.password })
        }
    }
</script>
