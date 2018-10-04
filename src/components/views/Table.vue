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
    import { ViewExprResult } from '../../api'

    interface TableCell {
        value: any
        link: object | null
    }

    @Component
    export default class UserViewTable extends Vue {
        @Prop() private uv!: ViewExprResult

        get fields() {
            return this.uv.info.columns.map((columnInfo, i) => {
                const columnAttrs = this.uv.result.columnAttributes[i]
                const captionAttr = columnAttrs['Caption']
                const caption = captionAttr !== undefined ? this.$t(captionAttr.value) : columnInfo.name

                return {
                    key: columnInfo.name,
                    label: caption
                }
            })
        }

        get items() {
            return this.uv.result.rows.map((row) => {
                return row.values.reduce<Record<string, TableCell>>((rowObj, value, i) => {
                    const columnInfo = this.uv.info.columns[i]
                    const columnAttrs = this.uv.result.columnAttributes[i]
                    const linkedViewAttr = row.id === undefined ? undefined : columnAttrs['LinkedView']
                    const link =
                        linkedViewAttr === undefined ? null : {
                            name: 'view',
                            params: { 'name': linkedViewAttr },
                            query: { 'id': row.id }
                        }
                    rowObj[columnInfo.name] = {
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