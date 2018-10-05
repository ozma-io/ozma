<template>
    <UserViewForm v-if="userViewType === 'Form'" :uv="uv" />
    <UserViewTable v-else :uv="uv" />
</template>

<script lang="ts">
    import { Component, Prop, Vue } from 'vue-property-decorator'
    import { UserViewData } from '../state/user_view'

    import UserViewTable from './views/Table.vue'
    import UserViewForm from './views/Form.vue'

    @Component({
        components: {
            UserViewTable, UserViewForm
        }
    })
    export default class UserView extends Vue {
        @Prop() private uv!: UserViewData

        get userViewType() {
            const typeAttr = this.uv.attributes["Type"]
            if (typeAttr === undefined) {
                return null
            }
            else {
                return String(typeAttr)
            }
        }
    }
</script>

<style scoped lang="scss">
</style>