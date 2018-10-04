<template>
    <b-container>
        <b-table striped hover :fields="fields" :items="items">
            <template v-for="col in fields" :slot="col.key" slot-scope="row">
                <router-link v-if="row.value.link !== null" :to="row.value.link">
                    {{ row.value.value }}
                </router-link>
                <template v-else>
                    {{ row.value.value }}
                </template>
            </template>
        </b-table>
    </b-container>
</template>

<script lang="ts">
    import { Component, Prop, Vue } from 'vue-property-decorator'
    import { ResultViewExpr } from '../../api'

    interface TableCell {
        value: any
        link: object | null
    }

    @Component
    export default class UserViewTable extends Vue {
        @Prop() private uv!: ResultViewExpr

        get fields() {
            return this.uv.columns.map((column) => {
                const captionAttr = column.attributes['Caption']
                const caption = captionAttr !== undefined ? this.$t(captionAttr.value) : column.name

                return {
                    key: column.name,
                    label: caption
                }
            })
        }

        get items() {
            return this.uv.rows.map((row) => {
                return row.values.reduce<Record<string, TableCell>>((rowObj, value, i) => {
                    const col = this.uv.columns[i]
                    const linkedViewAttr = row.id === undefined ? undefined : col.attributes['LinkedView']
                    const link =
                        linkedViewAttr === undefined ? null : {
                            name: 'view',
                            params: { 'name': linkedViewAttr.value },
                            query: { 'id': row.id }
                        }
                    rowObj[col.name] = {
                        value: value.value,
                        link: link
                    }
                    return rowObj
                }, {})
            })
        }
    }
</script>

<style scoped lang="scss">
</style>