<template>
    <b-dropdown class="nav_batton, actions_btn, menu_btn" v-if="actions.length > 0" :text="title" no-caret>
        <template v-for="action in actions">
            <!-- Passing v-on:click to v-bind doesn't seem to work, hence this ugly solution -->
            <b-dropdown-item v-if="'location' in action" :key="action.name" class="menu_btn" variant="primary" :to="action.location">
                {{ action.name }}
            </b-dropdown-item>
            <b-dropdown-item v-else-if="'callback' in action" :key="action.name" class="menu_btn" variant="primary" @click="action.callback()">
                {{ action.name }}
            </b-dropdown-item>
        </template>
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
    }
</script>
