<i18n>
    {
        "en-US": {
            "language": "en",
            "filter": "Filter",
            "search_placeholder": "Type to search",
            "filtered_count": "Rows count: {count}",
            "clear": "Clear",
            "yes": "Yes",
            "no": "No"
        },
        "ru-RU": {
            "language": "ru",
            "filter": "Поиск",
            "search_placeholder": "Введите фразу",
            "filtered_count": "Кол-во записей: {count}",
            "clear": "Очистить",
            "yes": "Да",
            "no": "Нет"
        }
    }
</i18n>

<template>
    <b-container fluid class="main_nav">
        <b-container class="submain_nav">
            <b-row class="subsubmain_nav" v-for="category in showedCategories" :key="category.index">
                <b-container class="nav_sec">
                    <b-row class="nav_sec_tit"><a>{{ category.name }}</a></b-row>
                    <b-row>
                        <b-button class="nav_ent" :to="button.to" v-for="button in category.buttons" :key="button.index">
                            {{ button.name }}
                        </b-button>
                    </b-row>
                </b-container>
            </b-row>
        </b-container>
    </b-container>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { Location } from "vue-router"
    import { namespace } from "vuex-class"
    import { UserViewResult } from "@/state/user_view"
    import { ChangesMap, IEntityChanges } from "@/state/staging_changes"
    import { setBodyStyle } from "@/style"

    interface IMainMenuButton {
        index: number
        name: string
        categoryName: string
        deleted: boolean
        to: Location | null
    }

    interface IMainMenuCategory {
        index: number
        name: string
        buttons: IMainMenuButton[]
    }

    const staging = namespace("staging")

    @Component
    export default class UserViewMenu extends Vue {
        @staging.State("changes") changes!: ChangesMap
        @staging.Getter("forUserView") changesForUserView!: (uv: UserViewResult) => IEntityChanges
        @staging.Getter("isEmpty") changesAreEmpty!: boolean

        categories: IMainMenuCategory[] = []
        rows: IMainMenuButton[] = []

        @Prop({ type: UserViewResult }) private uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) private isRoot!: boolean

        /* To optimize performance when staging entries change, we first pre-build entries and then update them selectively watching staging entries.
           This is to avoid rebuilding complete rows array each time user changes a field.
        */
        @Watch("uv")
        private updateEntries() {
            this.buildEntries()
        }

        @Watch("changes")
        private updateChanges() {
            // Be lazy
            this.buildEntries()
        }

        private created() {
            if (this.isRoot) {
                setBodyStyle("")
            }
            this.buildEntries()
        }

        // Update this.entries
        private buildEntries() {
            // .rows === null means that we are in "create new" mode -- there are no selected existing values.
            if (this.uv.rows === null) {
                // Not supported in table yet.
                this.categories = []
            } else if (this.uv.info.columns.length !== 2) {
                console.log("Menu user view should have two columns")
                this.categories = []
            } else {
                const changedFields = this.getCurrentChanges()
                const viewAttrs = this.uv.attributes

                const categoryColumnInfo = this.uv.info.columns[0]
                const categoryColumnName = categoryColumnInfo.updateField !== null ? categoryColumnInfo.updateField.name : null
                const categoriesAttrs = this.uv.columnAttributes[0]
                const buttonColumnInfo = this.uv.info.columns[1]
                const buttonColumnName = buttonColumnInfo.updateField !== null ? buttonColumnInfo.updateField.name : null
                const buttonsAttrs = this.uv.columnAttributes[1]

                const categories = new Map<string, IMainMenuCategory>()
                this.rows = this.uv.rows.map((row, rowI) => {
                    const rowAttrs = row.attributes === undefined ? {} : row.attributes
                    const getRowAttr = (name: string) => rowAttrs[name] || viewAttrs[name]

                    let updatedValues: Record<string, any> = {}
                    let deleted = false
                    if (row.id !== undefined) {
                        deleted = changedFields.deleted[row.id] || false
                        const updatedEntry = changedFields.updated[row.id]
                        if (updatedEntry !== undefined && updatedEntry !== null) {
                            updatedValues = updatedEntry
                        }
                    }

                    const updatedCategory = categoryColumnName === null ? undefined : updatedValues[categoryColumnName]
                    const currentCategory = updatedCategory === undefined ? row.values[0].value : updatedCategory
                    const categoryName = String(currentCategory)
                    let category: IMainMenuCategory | undefined = categories.get(categoryName)
                    if (category === undefined) {
                        category = {
                            index: rowI,
                            name: categoryName,
                            buttons: [],
                        }
                        categories.set(categoryName, category)
                    }

                    const updatedButton = buttonColumnName === null ? undefined : updatedValues[buttonColumnName]
                    const currentButton = updatedButton === undefined ? row.values[1].value : updatedButton
                    const buttonName = String(currentButton)
                    const buttonAttrs = row.values[1].attributes || {}
                    const getButtonAttr = (name: string) => buttonAttrs[name] || rowAttrs[name] || buttonsAttrs[name] || viewAttrs[name]

                    const linkedView = getButtonAttr("LinkedView")
                    const to = linkedView === undefined ? null : { name: "view", params: { name: linkedView } }

                    const button = {
                        index: rowI,
                        name: buttonName,
                        deleted, categoryName, to,
                    }
                    category.buttons.push(button)
                    return button
                })
                this.categories = Array.from(categories.values())
            }
        }

        private getCurrentChanges() {
            return this.changesForUserView(this.uv)
        }

        get showedCategories() {
            return this.categories
                .map(category => Object.assign({}, category, { buttons: category.buttons.filter(button => !button.deleted) }))
                .filter(category => category.buttons.length !== 0)
        }
    }
</script>
