<i18n>
    {
        "en-US": {
            "failed": "Failed to fetch user view: {msg}",
            "goto_nav": "Back to the top"
        },
        "ru-RU": {
            "failed": "Ошибка получения пользовательского вида: {msg}",
            "goto_nav": "Вернуться на главную"
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

        <b-button :to="{ name: 'navigator' }" class="goto_nav">
            {{ $t('goto_nav') }}
        </b-button>

        <UserView v-if="currentUserView !== null" :uv="currentUserView.uv"></UserView>
    </b-container>
</template>

<script lang="ts">
    import { Route } from "vue-router"
    import { Component, Watch, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { CurrentUserView } from "@/state/user_view"
    import UserView from "@/components/UserView.vue"

    const userView = namespace("userView")

    @Component({
        components: {
            UserView,
        },
    })
    export default class RootUserView extends Vue {
        @userView.Action("getUserView") getUserView!: (_: { name: string, args: URLSearchParams }) => Promise<void>
        @userView.Action("getUserViewInfo") getUserViewInfo!: (_: string) => Promise<void>
        @userView.State("current") currentUserView!: CurrentUserView | null
        @userView.Mutation("clearError") clearError!: () => void
        @userView.State("lastError") lastError!: string | null

        @Watch("$route")
        onRouteChanged() {
            this.updateView()
        }

        created() {
            this.updateView()
        }

        private updateView() {
            if (this.$route.name === "view") {
                const query = Object.keys(this.$route.query).map(name => {
                    const values = this.$route.query[name]
                    const val = Array.isArray(values) ? values[0] : values
                    return [name, val]
                })
                this.getUserView({ name: this.$route.params.name, args: new URLSearchParams(query) })
            } else if (this.$route.name === "view_create") {
                this.getUserViewInfo(this.$route.params.name)
            } else {
                console.assert(false)
            }
        }
    }
</script>

<style scoped lang="scss">
    .goto_nav {
        margin-bottom: 20px;
    }
</style>