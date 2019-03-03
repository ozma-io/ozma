<i18n>
    {
        "en": {
            "loading": "Now loading"
        },
        "ru": {
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
                @update:actions="$emit('update:actions', $event)"
                @update:statusLine="$emit('update:statusLine', $event)"
                @update:onSubmitStaging="$emit('update:onSubmitStaging', $event)"
                @update:enableFilter="$emit('update:enableFilter', $event)" />
        <template v-else>
            {{ $t('loading') }}
        </template>
    </span>
</template>

<script lang="ts">
    import { Component, Prop, Vue } from "vue-property-decorator"
    import { UserViewResult } from "@/state/user_view"

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
        @Prop({ type: UserViewResult }) private uv!: UserViewResult | null
        @Prop({ type: Boolean, default: false }) private isRoot!: boolean
        @Prop({ type: String, default: "" }) private filter!: string

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
    }
</script>