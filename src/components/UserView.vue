<template>
    <UserViewForm v-if="userViewType === 'Form'" :uv="uv" />
    <UserViewTable v-else :uv="uv" />
</template>

<script lang="ts">
    import { Component, Prop, Vue } from "vue-property-decorator"
    import { UserViewResult } from "@/state/user_view"

    @Component({
        components: {
            UserViewTable: () => import("@/components/views/Table.vue"),
            UserViewForm: () => import("@/components/views/Form.vue"),
        },
    })
    export default class UserView extends Vue {
        @Prop({ type: UserViewResult }) private uv!: UserViewResult

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

<style scoped lang="scss">
</style>