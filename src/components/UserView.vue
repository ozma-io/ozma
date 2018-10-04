<i18n>
    {
        "en": {
            "failed": "Failed to fetch user view: {msg}"
        },
        "ru-RU": {
            "failed": "Ошибка получения пользовательского вида: {msg}"
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

        <template v-if="currentUserView !== null">
            <UserViewForm v-if="userViewType === 'Form'" :uv="currentUserView.result" />
            <UserViewTable v-else :uv="currentUserView.result" />
        </template>
    </b-container>
</template>

<script lang="ts">
    import { Route } from 'vue-router'
    import { Component, Watch, Vue } from 'vue-property-decorator'
    import { namespace } from 'vuex-class'
    import { CurrentUserView } from '@/state/user_view'

    const userView = namespace('userView')

    import UserViewTable from './views/Table.vue'
    import UserViewForm from './views/Form.vue'

    @Component({
        components: {
            UserViewTable, UserViewForm
        }
    })
    export default class UserView extends Vue {
        @userView.Action('getUserView') getUserView!: (_: { name: string, args: URLSearchParams }) => Promise<void>
        @userView.State('current') currentUserView!: CurrentUserView | null
        @userView.Mutation('clearError') clearError!: () => void
        @userView.State('lastError') lastError!: string | null

        private updateView() {
            this.getUserView({ name: this.$route.params.name, args: new URLSearchParams(this.$route.query) })
        }

        created() {
            this.updateView()
        }

        @Watch('$route')
        onRouteChanged(to: Route, from: Route) {
            this.updateView()
        }

        get userViewType() {
            if (this.currentUserView === null) {
                return null
            }
            else {
                const typeAttr = this.currentUserView.result.attributes["Type"]
                if (typeAttr === undefined) {
                    return null
                }
                else {
                    return String(typeAttr.value)
                }
            }
        }
    }
</script>

<style scoped lang="scss">
</style>