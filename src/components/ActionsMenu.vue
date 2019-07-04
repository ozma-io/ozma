<template>
    <div :class="showActions? 'actions-menu_active actions-menu' : 'actions-menu'" v-if="actions.length > 0" >
        <input type="button" class="actions-menu_actions-button"  @click="actionsShow"  :value="title" >
        <div v-if="showActions" class="black-block" onklick>
            <button class="black-block_button" @click="actionsHidden()"></button>
        </div>
        <div v-show="showActions" class="div-with-actions">
        <template  v-for="action in actions">
            <!-- Passing v-on:click to v-bind doesn't seem to work, hence this ugly solution -->
            <router-link v-if="'location' in action" :key="action.name" class="div-with-actions_button" variant="primary" :to="action.location">
                {{ action.name }}
            </router-link>
            <a v-else-if="'href' in action" :key="action.name" class="div-with-actions_button" variant="primary" :href="action.href">
                {{ action.name }}
            </a>
            <input type="button" :value="action.name" v-else-if="'callback' in action" :key="action.name" class="div-with-actions_button" variant="primary" @click="action.callback(); actionsHidden();">
        </template>
        </div>
    </div>
</template>
<style scoped>
    .div-with-actions {
        width: max-content;
        flex: 1;
        position: absolute;
        display: block;
        z-index: 1200;
        background-color: var(--MenuColor);
    }
    .div-with-actions_button {
        display: block;
        background: hsla(0,0%,100%,.3) !important;
        padding: 5px;
        line-height: normal;
        padding-left: 7px;
        padding-right: 7px;
        color: var(--ButtonTextColor) !important;
        text-decoration: none;
        width: 100%;
        text-align: left;
        border: solid 1px var(--MenuColor) !important;
        border-top: 0px !important;
        border-radius: 0 !important;
    }
    .actions-menu {
        z-index: 1000;
        background-color: var(--MenuColor);
        
    }

    .actions-menu_active {
        position: relative;
    }
    .black-block{
       position: fixed;
       width: 150vw;
       height: 150vh;
       top: -50vh;
       left:-50vw;
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
        color: var(--ButtonTextColor) !important;
        background: hsla(0,0%,100%,.3);
        border: solid 1px var(--MenuColor) !important;
        border-left: 0px !important;
        text-align: left;
        height: 100%;
        padding-bottom: 4px;
        padding-top: 4px;
        line-height: normal;
        border-radius: 0 !important;
    }
    @media screen and (max-aspect-ratio: 13/9) {
        @media screen and (max-device-width: 480px) {
            .div-with-actions{
                width: 100vw !important;
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
            .actions-menu{
                position:relative;
            }
            .actions-menu_actions-button {
                position: sticky;
            }

            .actions-menu::after {
                content: "";
                display: block;
                width: 100%;
                background: var(--MenuColor);
                position: absolute;
                height: 100%;
                z-index: 900;
                opacity: 1;
                top: 0;
            }
            .actions-menu_actions-button, .div-with-actions_button {
                width: 100%;
                text-align: left;
                border-bottom: 0 !important;
                border-right: 0 !important;
                border: solid 1px var(--MenuColor) !important;
                border-left: 0px !important;
                border-top: 0px !important;
                z-index: 1000 !important;
                padding-left: 7px !important;
                padding-right: 7px !important;
            }
        }
    }
    @media print {
        .actions-menu {
            display: none !important
        }
    }
</style>
<script lang="ts">
    import { Component, Vue, Prop } from "vue-property-decorator"
    import { RawLocation } from "vue-router"

    export interface ILocationAction {
        name: string
        location: RawLocation
    }

    export interface IHrefAction {
        name: string
        href: string
    }

    export interface ICallbackAction {
        name: string
        callback: () => void
    }

    export type IAction = ILocationAction | IHrefAction | ICallbackAction

    @Component
    export default class ActionsMenu extends Vue {
        @Prop({ type: Array }) actions!: IAction[]
        @Prop({ type: String }) title!: string

        private showActions: boolean = false

        private actionsShow() {
            this.showActions = !this.showActions
        }
        private actionsHidden() {
            this.showActions = false
        }
    }
</script>
