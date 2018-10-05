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

        <UserView v-if="currentUserView !== null" :uv="currentUserView.uv"></UserView>
    </b-container>
</template>

<script lang="ts">
    import { Route } from 'vue-router'
    import { Component, Watch, Vue } from 'vue-property-decorator'
    import { namespace } from 'vuex-class'
    import { CurrentUserView } from '../state/user_view'
    import UserView from './UserView.vue'

    const userView = namespace('userView')

    @Component({
        components: {
            UserView
        }
    })
    export default class RootUserView extends Vue {
        @userView.Action('getUserView') getUserView!: (_: { name: string, args: URLSearchParams }) => Promise<void>
        @userView.Action('getUserViewInfo') getUserViewInfo!: (_: string) => Promise<void>
        @userView.State('current') currentUserView!: CurrentUserView | null
        @userView.Mutation('clearError') clearError!: () => void
        @userView.State('lastError') lastError!: string | null

        private updateView() {
            if (this.$route.name === "view") {
                this.getUserView({ name: this.$route.params.name, args: new URLSearchParams(this.$route.query) })
            } else if (this.$route.name === "view_create") {
                this.getUserViewInfo(this.$route.params.name)
            } else {
                console.assert(false)
            }
        }

        created() {
            this.updateView()
        }

        @Watch('$route')
        onRouteChanged() {
            this.updateView()
        }
    }
</script>
<style scoped lang="scss">

</style>