<i18n>
    {
        "en": {
            "create": "Create new",
            "edit_view": "Edit user view",
            "loading": "Now loading"
        },
        "ru": {
            "create": "Создать новую",
            "edit_view": "Редактировать отображение",
            "loading": "Загрузка данных"
        }
    }
</i18n>

<template>
    <span>
        <component v-if="uv !== null"
                :is="userViewType"
                :uv="uv"
                :isRoot="isRoot"
                :filter="filter"
                @update:actions="extraActions = $event"
                @update:statusLine="$emit('update:statusLine', $event)"
                @update:onSubmitStaging="$emit('update:onSubmitStaging', $event)"
                @update:enableFilter="$emit('update:enableFilter', $event)" />
        <template v-else>
            {{ $t('loading') }}
        </template>
    </span>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { CurrentAuth } from "@/state/auth"
    import { UserViewResult } from "@/state/user_view"
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
        @Prop({ type: UserViewResult }) uv!: UserViewResult | null
        @Prop({ type: Boolean, default: false }) isRoot!: boolean
        @Prop({ type: String, default: "" }) filter!: string
        @auth.State("current") currentAuth!: CurrentAuth

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
            if (this.uv !== null && this.uv.args.type === "named" && this.currentAuth.header.sub === "root") {
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
            if (this.uv === null) {
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
            if (this.uv === null) {
                return null
            } else {
                const attr = this.uv.attributes["CreateView"]
                return attr !== undefined ? String(attr) : null
            }
        }
    }
</script>