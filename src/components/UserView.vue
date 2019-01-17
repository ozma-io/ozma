<template>
    <UserViewForm v-if="userViewType === 'Form'" :uv="uv" :isRoot="isRoot" />
    <UserViewMenu v-else-if="userViewType === 'Menu'" :uv="uv" :isRoot="isRoot" />
    <UserViewTable v-else :uv="uv" :isRoot="isRoot" />
</template>

<script lang="ts">
    import { Component, Prop, Vue } from "vue-property-decorator"
    import { UserViewResult } from "@/state/user_view"

    @Component({
        components: {
            UserViewTable: () => import("@/components/views/Table.vue"),
            UserViewForm: () => import("@/components/views/Form.vue"),
            UserViewMenu: () => import("@/components/views/Menu.vue"),
        },
    })
    export default class UserView extends Vue {
        @Prop({ type: UserViewResult }) private uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) private isRoot!: boolean

        get userViewType() {
            const typeAttr = this.uv.attributes["Type"]
            if (typeAttr === undefined) {
                return null
            } else {
                return String(typeAttr)
            }
        }
    }
</script>