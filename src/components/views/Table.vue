<i18n>
    {
        "en": {
            "create_not_supported": "Creating new entities in a table is not supported",
            "create": "Create new",
            "filter": "Filter",
            "search_placeholder": "Type to search",
            "clear": "Clear"
        },
        "ru-RU": {
            "create_not_supported": "Создание новых записей через таблицу не поддерживается",
            "create": "Создать новую",
            "filter": "Поиск",
            "search_placeholder": "Введите фразу",
            "clear": "Очистить"
        }
    }
</i18n>

<template>
    <b-container fluid>
        <h5 v-if="fields === null">
            {{ $t('create_not_supported') }}
        </h5>
        <template v-else>
            <b-button v-if="linkedView !== null" :to="{ name: 'view_create', params: { name: linkedView } }" variant="primary">{{ $t('create') }}</b-button>

            <b-form-group horizontal :label="$t('filter')">
            <b-input-group>
                <b-form-input v-model="filter" :placeholder="$t('search_placeholder')" />
                <b-input-group-append>
                    <b-btn :disabled="!filter" @click="filter = ''">{{ $t('clear') }}</b-btn>
                </b-input-group-append>
            </b-input-group>
            </b-form-group>

            <b-table striped hover :fields="fields" :items="items" :filter="filter">
                <template v-for="col in fields" :slot="col.key" slot-scope="data">
                    <router-link v-if="data.value.link !== null" :key="col.name" :to="data.value.link">
                        {{ data.value.value }}
                    </router-link>
                    <template v-else>
                        {{ data.value.value }}
                    </template>
                </template>
            </b-table>
        </template>
    </b-container>
</template>

<script lang="ts">
    import { Component, Prop, Vue } from "vue-property-decorator"
    import { IUserViewData } from "@/state/user_view"
    import { Location } from "vue-router"

    interface ITableCell {
        value: any
        link: Location | null
    }

    @Component
    export default class UserViewTable extends Vue {
        filter: string = ""
        @Prop() private uv!: IUserViewData

        get linkedView() {
            if (this.uv.info.updateEntity === null) {
                return null
            }

            const attr = this.uv.attributes["CreateView"]
            return attr === undefined ? null : String(attr)
        }

        get fields() {
            return this.uv.info.columns.map((columnInfo, i) => {
                const columnAttrs = this.uv.columnAttributes[i]
                const captionAttr = columnAttrs["Caption"]
                const caption = captionAttr !== undefined ? captionAttr : columnInfo.name

                return {
                    key: String(i),
                    label: caption,
                    sortable: true,
                }
            })
        }

        get items() {
            if (this.uv.rows === null) {
                return null
            }

            return this.uv.rows.map(row => {
                return row.values.reduce((rowObj: any, value, i) => {
                    const columnInfo = this.uv.info.columns[i]
                    const columnAttrs = this.uv.columnAttributes[i]
                    const linkedViewAttr = row.id === undefined ? undefined : columnAttrs["LinkedView"]
                    const link =
                        linkedViewAttr === undefined ? null : {
                            name: "view",
                            params: { "name": String(linkedViewAttr) },
                            query: { "id": String(row.id) },
                        }
                    const valueText = value.value === null ? "" : value.value
                    const cell: ITableCell = {
                        value: value.pun === undefined || value.value === null ? valueText : `(${valueText}) ${value.pun}`,
                        link,
                    }
                    const key = String(i)
                    rowObj[key] = cell
                    if (value.value === null) {
                        rowObj._cellVariants[key] = "warning"
                    }
                    return rowObj
                }, { _cellVariants: {} })
            })
        }
    }
</script>

<style scoped lang="scss">
</style>