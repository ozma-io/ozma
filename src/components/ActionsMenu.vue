<template>
    <b-dropdown class="nav_batton, actions_btn, menu_btn" v-if="actionsMenu.length > 0" :text="title" no-caret>
        <b-dropdown-item v-for="action in actionsMenu" :key="action.name" class="menu_btn" variant="primary" v-bind="action.attrs">
            {{ action.name }}
        </b-dropdown-item>
    </b-dropdown>
</template>

<script lang="ts">
    import { Component, Vue, Prop } from "vue-property-decorator"
    import { RawLocation } from "vue-router"

    export interface ILocationAction {
        name: string
        location: RawLocation
    }

    export interface ICallbackAction {
        name: string
        callback: () => void
    }

    export type IAction = ILocationAction | ICallbackAction

    @Component
    export default class ActionsMenu extends Vue {
        @Prop({ type: Array }) actions!: IAction[]
        @Prop({ type: String }) title!: string

        get actionsMenu() {
            return this.actions.map(action => {
                let attrs
                if ("location" in action) {
                    attrs = { to: action.location }
                } else {
                    attrs = { ["on:click"]: () => action.callback() }
                }
                return { name: action.name, attrs }
            })
        }
    }
</script>
