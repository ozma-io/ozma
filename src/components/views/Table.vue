<i18n>
    {
        "en-US": {
            "create": "Create new",
            "filter": "Filter",
            "search_placeholder": "Type to search",
            "clear": "Clear",
            "yes": "Yes",
            "no": "No"
        },
        "ru-RU": {
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
        <b-button v-if="createView !== null" :to="{ name: 'view_create', params: { name: createView } }" variant="primary">{{ $t('create') }}</b-button>
        <b-form-group horizontal :label="$t('filter')" class="find">
            <b-input-group>
                <b-form-input v-model="filter" :placeholder="$t('search_placeholder')" />
                <b-input-group-append>
                    <b-btn :disabled="!filter" @click="filter = ''">{{ $t('clear') }}</b-btn>
                </b-input-group-append>
            </b-input-group>
        </b-form-group>
        <b-container class="tabl">
            <b-table striped hover :fields="[{key:'isActive', class:'empty_th'},{key:'openform',class:'empty_th'}].concat(fields)" :items="entries" :filter="filter">
                <template slot="HEAD_isActive" slot-scope="data">
                </template>
                <template slot="isActive" slot-scope="data">
                    <!-- We wrap all cells in a div which fills the whole <td>. This is needed because bootstrap-vue's Table doesn't support computed
                        properties in <td>'s attributes -->
                    <div class="contentTd">
                        <b-form-checkbox class="flag"></b-form-checkbox>
                    </div>
                </template>
                <template slot="HEAD_openform" slot-scope="data">
                </template>
                <template slot="openform" slot-scope="data">
                    <div class="contentTd">
                        <b-button style="cursor:pointer" class="open_form"><b-img src="/assets/openform.png" /></b-button>
                    </div>
                </template>

                <template v-for="col in fields" :slot="col.key" slot-scope="data">
                    <div class="contentTd" :key="col.key" :style="data.value.style">
                        <template v-if="col.isActive">
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
    </b-container>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { Location } from "vue-router"
    import { namespace } from "vuex-class"
    import { UserViewResult } from "@/state/user_view"
    import { ChangesMap, IEntityChanges } from "@/state/staging_changes"
    import { IExecutedValue } from "@/api"

    interface ITableCell {
        value: string
        link: Location | null
        style: Record<string, any>
    }

    const staging = namespace("staging")

    @Component
    export default class UserViewTable extends Vue {
        @staging.State("changes") changes!: ChangesMap
        @staging.Getter("forUserView") changesForUserView!: (uv: UserViewResult) => IEntityChanges
        @staging.Getter("isEmpty") changesAreEmpty!: boolean

        filter: string = ""
        entries: Array<Record<string, ITableCell>> = []

        @Prop() private uv!: UserViewResult

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
                const check = columnInfo.valueType.type === "bool" ? true : false
                return {
                    key: columnInfo.name,
                    label: caption,
                    sortable: true,
                    sortDirection: sortD,
                    isActive: check,
                }
            })
        }

        /* To optimize performance when staging entries change, we first pre-build entries and then update them selectively watching staging entries.
           This is to avoid rebuilding complete rows array each time user changes a field.
        */
        @Watch("uv")
        updateFields() {
            this.entries = this.buildEntries()
        }

        @Watch("changes")
        updateChanges() {
            if (this.changesAreEmpty) {
                // Changes got reset -- rebuild entries.
                // This could be done more efficiently but it would require tracking of what fields were changed.
                this.entries = this.buildEntries()
            } else {
                const changedFields = this.getCurrentChanges()
                if (this.uv.rows !== null) {
                    Object.keys(changedFields.updated).forEach(rowId => {
                        const fields = changedFields.updated[rowId]
                        const rowI = this.uv.updateRowIds[rowId]
                        const entry = this.entries[rowI]
                        Object.keys(fields).forEach(fieldName => {
                            entry[fieldName].value = this.getValueText({ value: fields[fieldName] })
                        })
                    })
                }
            }
        }

        created() {
            this.entries = this.buildEntries()
        }

        private buildEntries(): Array<Record<string, ITableCell>> {
            // .rows === null means that we are in "create new" mode -- there are no selected existing values.
            if (this.uv.rows === null) {
                // Not supported in table yet.
                return []
            }

            const changedFields = this.getCurrentChanges()

            return this.uv.rows.map((row, rowI) => {
                const rowAttrs = row.attributes === undefined ? {} : row.attributes
                return row.values.reduce((rowObj: Record<string, ITableCell>, value, colI) => {
                    const viewAttrs = this.uv.attributes
                    const columnInfo = this.uv.info.columns[colI]
                    const columnAttrs = this.uv.columnAttributes[colI]
                    const cellAttrs = value.attributes === undefined ? {} : value.attributes

                    let updatedValue
                    if (row.id !== undefined) {
                        const updatedEntry = changedFields.updated[row.id]
                        if (updatedEntry !== undefined) {
                            updatedValue = updatedEntry[columnInfo.name]
                        }
                    }
                    const currentValue = updatedValue === undefined ? value : { value: updatedValue }
                    const valueText = this.getValueText(currentValue)

                    const linkedViewAttr = row.id === undefined ? undefined : cellAttrs["CellColor"] || columnAttrs["LinkedView"] || viewAttrs["LinkedView"]
                    const link =
                        linkedViewAttr === undefined ? null : {
                            name: "view",
                            params: { "name": String(linkedViewAttr) },
                            query: { "id": String(row.id) },
                        }

                    const style: Record<string, any> = {}

                    const cellColor = cellAttrs["CellColor"] || rowAttrs["CellColor"] || columnAttrs["CellColor"] || viewAttrs["CellColor"]
                    if (cellColor !== undefined) {
                        style["background-color"] = cellColor
                    }
                    const cellWidth = columnAttrs["WidthColumn"] || viewAttrs["WidthColumn"]
                    if (cellWidth !== undefined) {
                        style["width"] = cellWidth
                    }
                    const cellHeight = rowAttrs["HeightRow"] || viewAttrs["HeightRow"]
                    if (cellHeight !== undefined) {
                        style["height"] = cellHeight
                    }

                    const cell: ITableCell = {
                        value: valueText,
                        link, style,
                    }

                    rowObj[columnInfo.name] = cell
                    return rowObj
                }, {})
            })
        }

        private getValueText(val: IExecutedValue) {
            if (val.value === null) {
                return ""
            } else {
                return val.pun === undefined ? String(val.value) : `(${val.value}) ${val.pun}`
            }
        }

        private getCurrentChanges() {
            return this.changesForUserView(this.uv)
        }
    }
</script>

<style scoped lang="scss">
</style>
