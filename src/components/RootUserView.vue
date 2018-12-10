<i18n>
    {
        "en-US": {
            "fetch_error": "Failed to fetch user view: {msg}",
            "goto_nav": "Back to the top",
            "pending_changes": "Pending changes exist",
            "submit_error": "Error while submitting changes: {msg}",
            "save": "Save",
            "revert_changes": "Revert changes",
            "confirm_close": "You have unsaved changes, do you want to discard them?"
        },
        "ru-RU": {
            "fetch_error": "Ошибка получения пользовательского вида: {msg}",
            "goto_nav": "Вернуться на главную",
            "pending_changes": "Есть несохранённые изменения",
            "submit_error": "Ошибка сохранения изменений: {msg}",
            "save": "Сохранить",
            "revert_changes": "Откатить изменения",
            "confirm_close": "У вас есть несохранённые изменения, отбросить их?"
        }
    }
</i18n>

<template>
    <b-container>
        <b-alert variant="danger"
                 dismissible
                 :show="uvLastError !== null"
                 @dismissed="uvClearError">
            {{ $t('fetch_error', { msg: uvLastError }) }}
        </b-alert>

        <b-alert variant="danger"
                 dismissible
                 :show="stagingLastError !== null"
                 @dismissed="stagingClearError">
            {{ $t('submit_error', { msg: stagingLastError }) }}
        </b-alert>

        <b-alert variant="danger" :show="!changesAreEmpty">
            {{ $t('pending_changes') }}

            <b-button @click="submitChanges" variant="primary">{{ $t('save') }}</b-button>
            <b-button @click="clearChanges" variant="secondary">{{ $t('revert_changes') }}</b-button>
        </b-alert>

        <b-button-toolbar key-nav>
            <b-button :to="{ name: 'navigator' }" class="goto_nav">
                {{ $t('goto_nav') }}
            </b-button>

            <!--b-button v-if="createView !== null" :to="{ name: 'view_create', params: { name: createView } }" variant="primary">{{ $t('create') }}</b-button>-->
        </b-button-toolbar>

        <UserView v-if="currentUserView !== null" :uv="currentUserView"></UserView>
    </b-container>
</template>

<script lang="ts">
    import { Route } from "vue-router"
    import { Component, Watch, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { UserViewResult } from "@/state/user_view"
    import { ChangesMap } from "@/state/staging_changes"
    import UserView from "@/components/UserView.vue"

    const userView = namespace("userView")
    const staging = namespace("staging")

    @Component({
        components: {
            UserView,
        },
    })
    export default class RootUserView extends Vue {
        @userView.Mutation("clear") clearView!: () => void
        @userView.Action("getNamed") getNamed!: (_: { name: string, args: URLSearchParams }) => Promise<void>
        @userView.Action("getNamedInfo") getNamedInfo!: (_: string) => Promise<void>
        @userView.State("current") currentUserView!: UserViewResult | null
        @userView.Mutation("clearError") uvClearError!: () => void
        @userView.State("lastError") uvLastError!: string | null
        @staging.State("changes") changes!: ChangesMap
        @staging.Action("submit") submitChanges!: () => Promise<void>
        @staging.Mutation("clear") clearChanges!: () => void
        @staging.Mutation("clearError") stagingClearError!: () => void
        @staging.State("lastError") stagingLastError!: string | null
        @staging.Getter("isEmpty") changesAreEmpty!: boolean

        @Watch("$route")
        private onRouteChanged() {
            this.updateView()
        }

        private created() {
            this.updateView()
        }

        private updateView() {
            this.clearView()
            switch (this.$route.name) {
                case "view":
                    const query = Object.keys(this.$route.query).map(name => {
                        const values = this.$route.query[name]
                        const val = Array.isArray(values) ? values[0] : values
                        return [name, val]
                    })
                    this.getNamed({ name: this.$route.params.name, args: new URLSearchParams(query) })
                    break
                case "view_create":
                    this.getNamedInfo(this.$route.params.name)
                    break
                default:
                    console.assert(false, `Invalid route name: ${this.$route.name}`)
                    break
            }
        }
    }
</script>

<style scoped lang="scss">
    .goto_nav {
        margin-bottom: 20px;
    }
</style>