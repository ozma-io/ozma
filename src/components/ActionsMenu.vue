<template>
    <div :class="['actions-menu', {'actions-menu_active': showActions}]" v-if="actions.length > 0">
        <input type="button" class="actions-menu_actions-button material-icons" @click="showActions = !showActions"
               value="menu">
        <div v-if="showActions" class="black-block">
            <button class="black-block_button " @click="showActions = false"></button>
        </div>
        <div v-show="showActions" class="div-with-actions">
            <template v-for="action in actions">
                <!-- Passing v-on:click to v-bind doesn't seem to work, hence this ugly solution -->
                <router-link v-if="'location' in action" :key="action.name" class="div-with-actions_button" :to="action.location">
                    {{ action.name }}
                </router-link>
                <a v-else-if="'href' in action" :key="action.name" class="div-with-actions_button" :href="action.href">
                    {{ action.name }}
                </a>
                <UserViewLink v-else-if="'query' in action"
                        :key="action.name"
                        :uv="action.query"
                        class="div-with-actions_button"
                        @[indirectLinks?`click`:null]="$emit('goto', $event)">
                    {{ action.name }}
                </UserViewLink>
                <input v-else-if="'callback' in action"
                        :key="action.name"
                        type="button"
                        :value="action.name"
                        class="div-with-actions_button"
                        @click="action.callback(); showActions = false">
            </template>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { RawLocation } from "vue-router";

import { IQuery } from "@/state/query";
import UserViewLink from "@/components/UserViewLink";

export interface ILocationAction {
    name: string;
    location: RawLocation;
}

export interface IHrefAction {
    name: string;
    href: string;
}

export interface IQueryAction {
    name: string;
    query: IQuery;
}

export interface ICallbackAction {
    name: string;
    callback: () => void;
}

export type IAction = ILocationAction | IHrefAction | IQueryAction | ICallbackAction;

@Component({
    components: {
        UserViewLink,
    },
})
export default class ActionsMenu extends Vue {
    @Prop({ type: Array, required: true }) actions!: IAction[];
    @Prop({ type: String, required: true }) title!: string;
    @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;

    private showActions: boolean = false;

    private actionsHidden() {
        this.showActions = false;
    }
}
</script>

<style scoped>
/* Current Z layout:

* Drop-down menu         (1200)
* Button drop-down menu  (1000)
* Div around button menu (900)
* Black-block (for mob)  (700)

*/
    .actions-menu {
        margin: 0;
    }
    .actions-menu__burger {
        border: none;
        background: transparent;
        width: 24px;
        height: 24px;
        outline: none;
        padding: 0;
        margin-right: 20px;
    }
    .div-with-actions {
        width: max-content;
        flex: 1;
        position: absolute;
        display: block;
        z-index: 1200; /* меню действий для подтаблиц поверх темного фона */
        background-color: var(--MainBackgroundColor);
        border: 1px solid var(--MainBorderColor);
        margin-top: 0;
        top: calc(100% + 5px);
    }
    .div-with-actions_button {
        display: block;
        background: hsla(0,0%,100%,.3) !important;
        padding: 5px;
        line-height: normal;
        padding-left: 7px;
        padding-right: 7px;
        color: var(--MainTextColor) !important;
        text-decoration: none;
        width: 100%;
        text-align: left;
        border: 0;
    }
    .div-with-actions_button:hover {
        background-color: var(--MainBorderColor) !important;
        color: var(--MainTextColor) !important;
    }
    .actions-menu {
        z-index: 1000;
        display: flex;
        align-items: center;
    }
    .actions-menu_active {
        position: relative;
        z-index: 1300;
    }
    .black-block{
       position: fixed;
       width: 150vw;
       height: 150vh;
       top: -50vh;
       left: -50vw;
    }
    .black-block_button{
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: auto !important;

    }
    .actions-menu_actions-button:focus {
        outline: none;
    }
    .actions-menu_actions-button {
        color: var(--MainTextColor) !important;
        background: var(--MainBackgroundColor);
        border: none;
        text-align: left;
        height: 100%;
        padding: 0;
        line-height: normal;
        font-size: 24px;
        margin-right: 10px;
        vertical-align: bottom;
        height: 1.25em;
    }
    @media screen and (max-aspect-ratio: 13/9) {
        @media screen and (max-device-width: 480px) {
            .div-with-actions{
                width: 100vw !important;
                position: fixed;
                left: 0;
                top: 54px;
            }
            .black-block {
                top: -50vh !important;
                right: 0;
                left: 0;
                position: fixed;
                width: 100vw;
                height: 0;
                z-index: 700;
                opacity: 0.7;
                display: block !important;
                overflow: scroll;
                background-color: black !important;
                height: 200vh;
            }
            .actions-menu {
                display: inline-flex;
            }
            .actions-menu_actions-button {
                position: sticky;
            }


            .actions-menu_actions-button, .div-with-actions_button {
                width: 100%;
                text-align: left;
                z-index: 1000 !important; /* кнопка выбора действий выше темного блока */
            }
        }
    }
    @media print {
        .actions-menu {
            display: none !important
        }
    }
</style>
