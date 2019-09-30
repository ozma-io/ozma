<i18n>
    {
        "en": {
            "save_scoped": "Save scoped"
        },
        "ru": {
            "save_scoped": "Сохранить вложенное"
        }
    }
</i18n>

<template>
    <UserView
        :args="currentView.args"
        :defaultValues="currentView.defaultValues"
        selectionMode
        indirectLinks
        :scope="uid"
        @update:actions="extraActions = $event"
        @goto="goto"
        @select="selectFromView" />
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { IEntityRef } from "@/api";
import { equalEntityRef } from "@/values";
import { IAction } from "@/components/ActionsMenu.vue";
import { IQuery } from "@/state/query";
import { CurrentChanges, ScopeName } from "@/state/staging_changes";
import { ISelectionRef } from "@/components/BaseUserView";

const staging = namespace("staging");

@Component
export default class SelectUserView extends Vue {
    @staging.State("current") changes!: CurrentChanges;
    @staging.Action("submit") submitChanges!: (scope?: ScopeName) => Promise<void>;
    @staging.Action("removeScope") removeScope!: (scope: ScopeName) => Promise<void>;
    @Prop({ type: Object, required: true }) entity!: IEntityRef;
    @Prop({ type: Object, required: true }) selectView!: IQuery;

    private extraActions: IAction[] = [];
    private currentView: IQuery = this.selectView;

    get actions() {
        const actions: IAction[] = [];

        if (!this.changes.isScopeEmpty(this.uid)) {
            actions.push({
                name: this.$tc("save_scoped"),
                callback: () => this.submitChanges(this.uid),
            });
        }

        const convertedActions = this.extraActions.map(action => {
            if ("query" in action) {
                return { name: action.name, callback: () => this.goto(action.query) };
            } else {
                return action;
            }
        });
        actions.push(...convertedActions);
        return actions;
    }

    private selectFromView(selection: ISelectionRef) {
        if (!equalEntityRef(this.entity, selection.entity)) {
            throw new Error("Entry from invalid entity selected");
        }

        this.$emit("select", selection.id);
    }

    @Watch("actions", { deep: true, immediate: true })
    private pushActions() {
        this.$emit("update:actions", this.actions);
    }

    private destroyed() {
        this.removeScope(this.uid);
    }

    private goto(query: IQuery) {
        this.currentView = query;
    }
}
</script>