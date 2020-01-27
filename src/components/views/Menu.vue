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
    <b-container>
        <b-row>
            <b-col cols="12">
                <span v-if="typeof categoriesOrError === 'string'">
                    {{ error }}
                </span>
            </b-col>
        </b-row>
        <b-row v-for="category in categoriesOrError" :key="category.index" class="menu_category_block">
            <b-col cols="12">
                <div class="menu_category_title">
                    {{ category.name }}
                </div>
                <hr />
            </b-col>
            <b-col v-for="(button, buttonI) in category.buttons" :key="buttonI" cols="12" class="menu_entry">
                <UserViewLink
                    class="navigation-entry"
                    :uv="button.uv"
                    @[indirectLinks?`click`:null]="$emit('goto', $event)">
                    {{ button.name }}
                </UserViewLink>
            </b-col>
        </b-row>
    </b-container>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { Location } from "vue-router";
import { namespace } from "vuex-class";
import { mixins } from "vue-class-component";

import { tryDicts } from "@/utils";
import { CombinedUserView, valueToPunnedText, homeSchema } from "@/state/user_view";
import { IQuery, attrToQuery } from "@/state/query";
import { CurrentChanges, IEntityChanges } from "@/state/staging_changes";
import LocalEmptyUserView from "@/LocalEmptyUserView";
import { UserView } from "@/components";
import BaseUserView from "@/components/BaseUserView";

interface IMainMenuButton {
    index: number;
    name: string;
    categoryName: string;
    uv: IQuery;
}

interface IMainMenuCategory {
    index: number;
    name: string;
    buttons: IMainMenuButton[];
}

@UserView({
    localConstructor: LocalEmptyUserView,
})
@Component
export default class UserViewMenu extends mixins<BaseUserView<LocalEmptyUserView, null, null, null>>(BaseUserView) {
    @Prop() uv!: CombinedUserView;
    @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;

    get categoriesOrError() {
        // .rows === null means that we are in "create new" mode -- there are no selected existing values.
        if (this.uv.rows === null) {
            // Not supported in menu yet.
            return [];
        } else if (this.uv.info.columns.length !== 2) {
            return this.$t("invalid_menu").toString();
        } else {
            const viewAttrs = this.uv.attributes;

            const categoryColumnInfo = this.uv.info.columns[0];
            const categoriesAttrs = this.uv.columnAttributes[0];
            const buttonColumnInfo = this.uv.info.columns[1];
            const buttonsAttrs = this.uv.columnAttributes[1];

            const categories = new Map<string, IMainMenuCategory>();
            const home = homeSchema(this.uv.args);
            const linkOpts = home !== null ? { homeSchema: home } : undefined;
            this.uv.rows.forEach((row, rowI) => {
                if (row.deleted) {
                    return;
                }

                const rowAttrs = row.attributes === undefined ? {} : row.attributes;
                const getRowAttr = (name: string) => tryDicts(name, rowAttrs, viewAttrs);

                const categoryCell = row.values[0];
                const categoryName = valueToPunnedText(categoryColumnInfo.valueType, categoryCell);
                let category: IMainMenuCategory | undefined = categories.get(categoryName);
                if (category === undefined) {
                    category = {
                        index: rowI,
                        name: categoryName,
                        buttons: [],
                    };
                    categories.set(categoryName, category);
                }

                const buttonCell = row.values[1];
                const buttonName = valueToPunnedText(buttonColumnInfo.valueType, buttonCell);
                const buttonAttrs = buttonCell.attributes || {};
                const getButtonAttr = (name: string) => tryDicts(name, buttonAttrs, rowAttrs, buttonsAttrs, viewAttrs);

                const toQuery = attrToQuery(getButtonAttr("LinkedView"), linkOpts);
                if (toQuery === null) {
                    return;
                }

                const button = {
                    index: rowI,
                    name: buttonName,
                    categoryName,
                    uv: toQuery,
                };
                category.buttons.push(button);
            });
            return Array.from(categories.values());
        }
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
    .navigation-sector-title {
        padding: 5px;
        padding-left: 1px;
        min-height: 18px;
        width: 100%;
        height: calc(1.5em + 4px) !important;
        white-space: nowrap;
    }
    .navigation-sector-title-head {
        color: var(--NavigationTextColor) !important;
        font-weight: bold;
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

            .navigation-sector-title {
                height: 29px !important;
                margin: 0px !important;
                padding: 5px !important;
                background-color: var(--NavigationBackColor);
                overflow-x: scroll;
            }

            .navigation-sector-title-head {
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
 .menu_list {
     list-style: none;
     padding-left: 0;
 }
 /deep/ .menu_entry > a {
     color: var(--MainTextColor);
     text-decoration: underline;
     text-decoration-color: var(--MainBorderColor);
     font-size: 1.3rem !important;
 }
 .menu_entry {
     display: inline-flex;
     align-items: center;
     color: var(--MainTextColor);
     padding-bottom: 5px;
 }
 .menu_entry:first-child {
     padding-left: 0;
 }
 .menu_entry:last-child {
     border-right: 0;
 }
 .menu_category_block {
     margin-top: 75px;
 }
 .menu_category_title {
     font-size: 1.5rem !important;
     color: var(--MainTextColorLight);
 }
</style>
