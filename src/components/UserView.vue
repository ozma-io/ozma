<template>
    <component :is="userViewType"
               :uv="uv"
               :isRoot="isRoot"
               @update:actions="$emit('update:actions', $event)"
               @update:statusLine="$emit('update:statusLine', $event)" />
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
            const types: Record<string, string> = {
                "Form": "UserViewForm",
                "Menu": "UserViewMenu",
            }
            const typeAttr = this.uv.attributes["Type"]
            const type = types[String(typeAttr)]
            if (type === undefined) {
                return "UserViewTable"
            } else {
                return type
            }
        }
    }
</script>