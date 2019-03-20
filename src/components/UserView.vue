<i18n>
    {
        "en": {
            "create": "Create new",
            "edit_view": "Edit user view",
            "loading": "Now loading",
            "forbidden": "Sorry, you are not authorized to use this user view. Contact your administrator.",
            "not_found": "User view not found",
            "bad_request": "User view request error: {msg}",
            "unknown_error": "Unknown user view fetch error: {msg}"
        },
        "ru": {
            "create": "Создать новую",
            "edit_view": "Редактировать представление",
            "loading": "Загрузка данных",
            "forbidden": "К сожалению у вас нет прав доступа для просмотра этого представления. Свяжитесь с администратором.",
            "not_found": "Представление не найдено",
            "bad_request": "Неверный запрос для этого представления: {msg}",
            "unknown_error": "Неизвестная ошибка загрузки представления: {msg}"
        }
    }
</i18n>

<template>
    <span>
        <component v-if="userViewType !== null"
                :is="userViewType"
                :uv="uv"
                :isRoot="isRoot"
                :filter="filter"
                @update:actions="extraActions = $event"
                @update:statusLine="$emit('update:statusLine', $event)"
                @update:onSubmitStaging="$emit('update:onSubmitStaging', $event)"
                @update:enableFilter="$emit('update:enableFilter', $event)" />
        <div v-else-if="errorMessage !== null" class="loading">
            {{ errorMessage }}
        </div>
        <div v-else class="loading">
            {{ $t('loading') }}
        </div>
    </span>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { UserViewResult, UserViewError } from "@/state/user_view"
    import { CurrentAuth } from "@/state/auth"
    import { IAction } from "@/components/ActionsMenu.vue"

    const types: string[] = [
        "Form",
        "Menu",
        "Table",
    ]

    const componentNames = types.reduce((res, name) => {
        res[name] = `UserView${name}`
        return res
    }, {} as Record<string, string>)
    const components = Object.entries(componentNames).reduce((res, [name, componentName]) => {
        res[componentName] = () => import(`@/components/views/${name}.vue`)
        return res
    }, {} as Record<string, () => any>)

    const auth = namespace("auth")

    @Component({ components })
    export default class UserView extends Vue {
        // FIXME FIXME FIXME
        @auth.State("current") currentAuth!: CurrentAuth
        @Prop() uv!: UserViewResult | UserViewError | null
        @Prop({ type: Boolean, default: false }) isRoot!: boolean
        @Prop({ type: String, default: "" }) filter!: string

        private extraActions: IAction[] = []

        @Watch("userViewType")
        updateUserView() {
            this.extraActions = []
        }

        get actions() {
            const actions: IAction[] = []
            if (this.createView !== null) {
                const createLocation = { name: "view_create", params: { "name": this.createView } }
                actions.push({ name: this.$tc("create"), location: this.$router.resolve(createLocation).href })
            }
            // FIXME FIXME FIXME
            if (this.uv instanceof UserViewResult && this.uv.args.type === "named" && this.currentAuth.decodedToken.realm_access.roles.includes("fundb_admin")) {
                const editLocation = { name: "view", params: { "name": "__UserViewByName" }, query: { "name": this.uv.args.source } }
                actions.push({ name: this.$tc("edit_view"), location: this.$router.resolve(editLocation).href })
            }
            actions.push(...this.extraActions)
            return actions
        }

        @Watch("actions", { deep: true })
        private pushActions() {
            this.$emit("update:actions", this.actions)
        }

        get userViewType() {
            if (!(this.uv instanceof UserViewResult)) {
                return null
            } else {
                const typeAttr = this.uv.attributes["Type"]
                const type = componentNames[String(typeAttr)]
                if (type === undefined) {
                    return "UserViewTable"
                } else {
                    return type
                }
            }
        }

        get createView() {
            if (!(this.uv instanceof UserViewResult)) {
                return null
            } else {
                const attr = this.uv.attributes["CreateView"]
                return attr !== undefined ? String(attr) : null
            }
        }

        get errorMessage() {
            if (!(this.uv instanceof UserViewError)) {
                return null
            } else {
                if (this.uv.type === "forbidden") {
                    return this.$t("forbidden")
                } else if (this.uv.type === "not_found") {
                    return this.$t("not_found")
                } else if (this.uv.type === "bad_request") {
                    return this.$t("bad_request", { msg: this.uv.message })
                } else {
                    return this.$t("unknown_error", { msg: this.uv.message })
                }
            }
        }
    }
</script>