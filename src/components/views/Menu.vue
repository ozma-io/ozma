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
    <div fluid class="main-menu-block">
        <span v-if="error !== null">
            {{ error }}
        </span>
        <div v-else class="submain-menu-block">
            <div class="row subsubmain-menu-block" v-for="category in showedCategories" :key="category.index">
                <div class="navigation-sector">
                    <div class="row navigation-sector-titel"><a class="navigation-sector-titel-head">{{ category.name }}</a></div>
                    <div class="row navigation-sector-body">
                        <div class="filter-back" v-for="button in category.buttons" :key="button.index">
                            <b-button class="navigation-entry" :to="button.to">
                                {{ button.name }}
                            </b-button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
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


<style scoped>
    .main-menu-block {
        width: 100%; 
        height: 100%;
        position: fixed;
        top: 0;
        left: 0;
        display: flex;
        padding: 0;
        overflow: auto;
    }
    .row {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
        margin-right: -15px;
        margin-left: -15px;
    }
    .submain-menu-block {
        max-width: 650px !important; /*450px*/
        display: block;
        margin: auto;
        padding: 0;
        padding-top: 35px;
        padding-bottom: 35px;
    }
    .subsubmain-menu-block {
        width: auto;
        height: 90%;
        display: flex;
        align-items: center; /*для разных браузеров*/
        justify-content: center; /*для разных браузеров*/
        flex-direction: column;
        align-items: flex-start;
        margin: auto;
        border: 0px;
        padding: 0;
        background-color: transparent;
    }
    .filter-back {
        margin: 0;
        padding: 0;
        display: inline-block;
        background: var(--MenuColor);
        margin-right: 2px;
        margin-bottom: 2px;
    }
	.filter-back > *{
        padding-left: 30px;
    }
    .navigation-sector {
        margin-bottom: 20px;
        float: left;
        clear: left;
        padding: 0;
    }
    .navigation-sector-titel {
        padding: 5px;
        padding-left: 1px;
        min-height: 18px;
        width: 100%;
        height: calc(1.5em + 4px) !important;
    }
    .navigation-sector-titel-head {
        color: var(--NavigationTextColor) !important;
        font-weight: bold;
    }
    .navigation-entry {
        display: table;
        padding: 5px;
        padding-left: 7px;
        padding-right: 7px;
        line-height: normal;
        height: calc(1.5em + 4px) !important;
        color: var(--ButtonTextColor) !important;
        background: rgba(255, 255, 255, 0.3);
        text-decoration: none;
        border: 0px;
    }
    @media screen and (orientation: portrait) {
        @media screen and (max-device-width: 480px) {
            .main-menu-block {
                position: relative !important;
            }

            .submain-menu-block {
                width: 100% !important;
                margin-top: 0px !important;
                padding-top: 0px !important;
                padding-bottom: 0px !important;
            }

            .subsubmain-menu-block {
                height: auto !important;
                margin: 0px !important;
                width: 100% !important;
            }

            .navigation-sector {
                margin: 0px !important;
                width: 100%;
            }

            .navigation-sector-titel {
                height: 29px !important;
                margin: 0px !important;
                padding: 5px !important;
                background-color: var(--NavigationBackColor);
                overflow-x: scroll;
            }

            .navigation-sector-titel-head {
                padding: 0px !important;
                line-height: normal;
                color: var(--NavigationTextColor) !important;
                font-weight: 700;
            }

            .navigation-sector-body {
                width: 100% !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                padding: 0px !important;
                background-color: var(--MenuColor);
            }
            .filter-back {
                margin-bottom: 1px !important;
                width: 100%;
                margin-left: 0 !important;
                margin-right: 0 !important;
            }

            .filter-back:first-child {
                margin-top: 1px !important;
            }

            .navigation-entry {
                background: hsla(0,0%,100%,.3);
                margin-right: 0px !important;
                margin-bottom: 1px;
                width: 100%;
                text-align: left;
                opacity: 1;
            }

                .navigation-entry:last-child {
                    margin-bottom: 0px;
                }
        }
    }
</style>
