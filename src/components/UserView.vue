<i18n>
    {
        "en": {
            "create": "Create new",
            "loading": "Now loading"
        },
        "ru": {
            "create": "Создать новую",
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

    @Component({ components })
    export default class UserView extends Vue {
        @Prop({ type: UserViewResult }) uv!: UserViewResult | null
        @Prop({ type: Boolean, default: false }) isRoot!: boolean
        @Prop({ type: String, default: "" }) filter!: string

        private extraActions: IAction[] = []

        get actions() {
            const actions: IAction[] = []
            const createView = this.createView
            if (createView !== null) {
                actions.push({ name: this.$tc("create"), location: this.$router.resolve({ name: "view_create", params: { name: createView } }).href })
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