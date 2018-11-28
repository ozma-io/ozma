<i18n>
    {
        "en-US": {
            "create_not_supported": "Creating new entities in a table is not supported",
            "create": "Create new",
            "filter": "Filter",
            "search_placeholder": "Type to search",
            "clear": "Clear",
            "yes": "Yes",
            "no": "No"
        },
        "ru-RU": {
            "create_not_supported": "Создание новых записей через таблицу не поддерживается",
            "create": "Создать новую",
            "filter": "Поиск",
            "search_placeholder": "Введите фразу",
            "clear": "Очистить",
            "yes": "Да",
            "no": "Нет"
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
            <b-form-group horizontal :label="$t('filter')" class="find">
                <b-input-group>
                    <b-form-input v-model="filter" :placeholder="$t('search_placeholder')" />
                    <b-input-group-append>
                        <b-btn :disabled="!filter" @click="filter = ''">{{ $t('clear') }}</b-btn>
                    </b-input-group-append>
                </b-input-group>
            </b-form-group>
            <b-container class="tabl">
                <b-table striped hover :fields="[{key:'isActive', class:'empty_th'},{key:'openform',class:'empty_th'}].concat(fields)" :items="items" :filter="filter">
                    <template slot="HEAD_isActive" slot-scope="data">
                    </template>
                    <template slot="isActive" slot-scope="data">
                        <b-form-checkbox class="flag"></b-form-checkbox>
                    </template>
                    <template slot="HEAD_openform" slot-scope="data">
                    </template>
                    <template slot="openform" slot-scope="data">
                        <b-button style="cursor:pointer" class="open_form"><b-img src="/assets/openform.png" /></b-button>
                    </template>

                    <template v-for="col in fields" :slot="col.key" slot-scope="data">
                        <div class="contentTd" v-if="data.value.width!==null || data.value.height!==null" :style="{minWidth: data.value.width + 'px', height: data.value.height + 'px', width: data.value.width + 'px'}">
                            <template v-if="col.isActive===true">
                                <b-checkbox :checked="data.value.value" disabled="true"></b-checkbox>
                            </template>
                            <template v-else>
                                <router-link v-if="data.value.link !== null" :key="col.name" :to="data.value.link">
                                    {{ data.value.value }}
                                </router-link>
                                <template v-else>
                                    {{ data.value.value }}
                                </template>
                            </template>
                        </div>
                        <div class="contentTd" v-else>
                            <template v-if="col.isActive===true">
                                <b-checkbox :checked="data.value.value" disabled="true"></b-checkbox>
                            </template>
                            <template v-else>
                                <router-link v-if="data.value.link !== null" :key="col.name" :to="data.value.link">
                                    {{ data.value.value }}
                                </router-link>
                                <template v-else>
                                    {{ data.value.value }}
                                </template>
                            </template>
                        </div>
                    </template>
                </b-table>
            </b-container>
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
        width: any
        height: any
    }

    @Component
    export default class UserViewTable extends Vue {
        filter: string = ""
        @Prop() private uv!: IUserViewData

        get createView() {
            const attr = this.uv.attributes["CreateView"]
            return attr === undefined ? null : String(attr)
        }

        get fields() {
            return this.uv.info.columns.map((columnInfo, i) => {
                const columnAttrs = this.uv.columnAttributes[i]
                const captionAttr = columnAttrs["Caption"]
                const caption = captionAttr !== undefined ? captionAttr : columnInfo.name
                const sortD = columnInfo.valueType.type === "int" ? "desc" : "asc"
                const chek = columnInfo.valueType.type === "bool" ? true : false
                return {
                    key: String(i),
                    label: caption,
                    sortable: true,
                    sortDirection: sortD,
                    isActive: chek,
                }
            })
        }

        get items() {
            if (this.uv.rows === null) {
                return null
            }

            return this.uv.rows.map(row => {
                const rowAttrs = row.attributes === undefined ? {} : row.attributes
                return row.values.reduce((rowObj: any, value, i) => {
                    const rowAttrs = row.attributes
                    const viewAttrs = this.uv.attributes
                    const columnInfo = this.uv.info.columns[i]
                    const columnAttrs = this.uv.columnAttributes[i]
                    const cellw = row.id === undefined ? undefined : columnAttrs["WidthColumn"]
                    const cellh = viewAttrs["HeightRow"] === undefined ? (rowAttrs === undefined ? undefined : rowAttrs["HeightRow"]) : viewAttrs["HeightRow"]
                    const width = cellw === undefined ? null : cellw
                    const height = cellh === undefined ? null : cellh
                    const cellAttrs = value.attributes === undefined ? {} : value.attributes
                    const linkedViewAttr = row.id === undefined ? undefined : columnAttrs["LinkedView"]
                    const link =
                        linkedViewAttr === undefined ? null : {
                            name: "view",
                            params: { "name": String(linkedViewAttr) },
                            query: { "id": String(row.id) },
                        }
                    const valueText = this.getValueText(value.value)
                    const cell: ITableCell = {
                        value: value.pun === undefined || value.value === null ? valueText : `(${valueText}) ${value.pun}`,
                        link, width, height,
                    }
                    const cellStyle = cellAttrs["CellStyle"] || rowAttrs["CellStyle"] || columnAttrs["CellStyle"]

                    const key = String(i)
                    rowObj[key] = cell
                    // FIXME: cellStyle should be a string, not bool -- this is temporary until we get conditionals in FunQL
                    if (cellStyle !== undefined && cellStyle !== null && cellStyle) {
                        rowObj._cellVariants[key] = "warning"
                    }
                    return rowObj
                }, { _cellVariants: {} })
            })
        }

        private getValueText(val: any) {
            if (val === null) {
                return ""
            } else if (typeof val === "boolean") {
                return val ? this.$tc("yes") : this.$tc("no")
            } else {
                return val
            }
        }
    }
</script>

<style scoped lang="scss">
</style>
