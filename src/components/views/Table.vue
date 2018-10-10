<i18n>
    {
        "en": {
            "create_not_supported": "Creating new entities in a table is not supported",
            "create": "Create new"
        },
        "ru-RU": {
            "create_not_supported": "Создание новых записей через таблицу не поддерживается",
            "create": "Создать новую"
        }
    }
</i18n>

<template>
    <b-container>
        <h5 v-if="fields === null">
            {{ $t('create_not_supported') }}
        </h5>
        <template v-else>
            <b-button v-if="linkedView !== null" :to="{ name: 'view_create', params: { name: linkedView } }" variant="primary">{{ $t('create') }}</b-button>

            <b-table striped hover :fields="fields" :items="items">
                <template v-for="col in fields" :slot="col.key" slot-scope="row">
                    <router-link :key="col.name" v-if="row.value.link !== null" :to="row.value.link">
                        {{ row.value.value }}
                    </router-link>
                    <template v-else>
                        {{ row.value.value }}
                    </template>
                </template>
            </b-table>
        </template>
    </b-container>
</template>

<script lang="ts">
    import { Component, Prop, Vue } from "vue-property-decorator"
    import { IUserViewData } from "../../state/user_view"

    interface TableCell {
        value: any
        link: object | null
    }

    @Component
    export default class UserViewTable extends Vue {
        @Prop() private uv!: IUserViewData

        get linkedView() {
            if (this.uv.info.updateEntity === null) {
                return null;
            }

            const attr = this.uv.attributes['CreateView']
            return attr === undefined ? null : String(attr)
        }

        get fields() {
            return this.uv.info.columns.map((columnInfo, i) => {
                const columnAttrs = this.uv.columnAttributes[i]
                const captionAttr = columnAttrs['Caption']
                const caption = captionAttr !== undefined ? captionAttr : columnInfo.name

                return {
                    key: columnInfo.name,
                    label: caption
                }
            })
        }

        get items() {
            if (this.uv.rows === null) {
                return null;
            }

            return this.uv.rows.map((row) => {
                return row.values.reduce<Record<string, TableCell>>((rowObj, value, i) => {
                    const columnInfo = this.uv.info.columns[i]
                    const columnAttrs = this.uv.columnAttributes[i]
                    const linkedViewAttr = row.id === undefined ? undefined : columnAttrs['LinkedView']
                    const link =
                        linkedViewAttr === undefined ? null : {
                            name: 'view',
                            params: { 'name': linkedViewAttr },
                            query: { 'id': row.id }
                        }
                    rowObj[columnInfo.name] = {
                        value: value.pun === undefined ? value.value : `(${value.value}) ${value.pun}`,
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