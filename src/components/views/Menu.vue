<i18n>
    {
        "en-US": {
            "filter": "Filter",
            "search_placeholder": "Type to search",
            "filtered_count": "Rows count: {count}",
            "clear": "Clear",
            "yes": "Yes",
            "no": "No",
            "invalid_menu": "Menu user view should have two columns"
        },
        "ru": {
            "filter": "Поиск",
            "search_placeholder": "Введите фразу",
            "filtered_count": "Кол-во записей: {count}",
            "clear": "Очистить",
            "yes": "Да",
            "no": "Нет",
            "invalid_menu": "Представление меню должно иметь две колонки"
        }
    }
</i18n>

<template>
    <b-container fluid class="main_nav">
        <span v-if="error !== null">
            {{ error }}
        </span>
        <b-container v-else class="submain_nav">
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
    import { tryDicts } from "@/utils"
    import { UserViewResult, printValue, homeSchema } from "@/state/user_view"
    import { attrToQuery, queryLocation } from "@/state/query"
    import { CurrentChanges, IEntityChanges } from "@/state/staging_changes"

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
        @staging.State("current") changes!: CurrentChanges
        @Prop({ type: UserViewResult }) uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) isRoot!: boolean

        private categories: IMainMenuCategory[] = []
        private rows: IMainMenuButton[] = []
        private error: string | null = null

        /* To optimize performance when staging entries change, we first pre-build entries and then update them selectively watching staging entries.
           This is to avoid rebuilding complete rows array each time user changes a field.
        */
        @Watch("uv", { deep: true })
        private updateEntries() {
            this.buildEntries()
        }

        // TODO: implement
        /*@Watch("changes", { deep: true })
        private updateChanges() {
        }*/

        private created() {
            this.buildEntries()
        }

        // Update this.entries
        private buildEntries() {
            // .rows === null means that we are in "create new" mode -- there are no selected existing values.
            if (this.uv.rows === null) {
                // Not supported in table yet.
                this.categories = []
            } else if (this.uv.info.columns.length !== 2) {
                this.error = this.$tc("invalid_menu")
                this.categories = []
                this.rows = []
            } else {
                const viewAttrs = this.uv.attributes

                const categoryColumnInfo = this.uv.info.columns[0]
                const categoriesAttrs = this.uv.columnAttributes[0]
                const buttonColumnInfo = this.uv.info.columns[1]
                const buttonsAttrs = this.uv.columnAttributes[1]

                const categories = new Map<string, IMainMenuCategory>()
                this.rows = this.uv.rows.map((row, rowI) => {
                    const rowAttrs = row.attributes === undefined ? {} : row.attributes
                    const getRowAttr = (name: string) => tryDicts(name, rowAttrs, viewAttrs)

                    const categoryCell = row.values[0]
                    const categoryName = printValue(categoryColumnInfo.valueType, categoryCell.value)
                    let category: IMainMenuCategory | undefined = categories.get(categoryName)
                    if (category === undefined) {
                        category = {
                            index: rowI,
                            name: categoryName,
                            buttons: [],
                        }
                        categories.set(categoryName, category)
                    }

                    const buttonCell = row.values[1]
                    const buttonName = printValue(buttonColumnInfo.valueType, buttonCell.value)
                    const buttonAttrs = buttonCell.attributes || {}
                    const getButtonAttr = (name: string) => tryDicts(name, buttonAttrs, rowAttrs, buttonsAttrs, viewAttrs)

                    const toQuery = attrToQuery(homeSchema(this.uv.args), getButtonAttr("LinkedView"))
                    const to = toQuery === null ? null : this.$router.resolve(queryLocation(toQuery)).location

                    const button = {
                        index: rowI,
                        name: buttonName,
                        deleted: false,
                        categoryName, to,
                    }
                    category.buttons.push(button)
                    return button
                })
                this.categories = Array.from(categories.values())
                this.error = null
            }
        }

        get showedCategories() {
            return this.categories
                .map(category => Object.assign({}, category, { buttons: category.buttons.filter(button => !button.deleted) }))
                .filter(category => category.buttons.length !== 0)
        }
    }
</script>
