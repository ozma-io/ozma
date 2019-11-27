<i18n>
    {
        "en": {
            "save_scoped": "Save scoped",
            "save_and_select_scoped": "Save and select"
        },
        "ru": {
            "save_scoped": "Сохранить вложенное",
            "save_and_select_scoped": "Сохранить и закрыть"
        }
    }
</i18n>

<template>
    <ModalPortal to="tabbed-modal" :tabName="title" @close="$emit('close')">
        <section>
            <UserView
                :args="currentView.args"
                :defaultValues="currentView.defaultValues"
                selectionMode
                indirectLinks
                :scope="uid"
                @update:actions="extraActions = $event"
                @update:title="title = $event"
                @goto="goto"
                @select="selectFromView" />
            <div class="selection_view_save__container">
                <button type="button" class="selection_view_save__button" @click="this.saveView">
                    {{ $t(saveAndSelect ? 'save_and_select_scoped' : 'save_scoped') }}
                </button>
            </div>
        </section>
    </ModalPortal>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { IEntityRef, IEntity } from "@/api";
import { equalEntityRef } from "@/values";
import { IAction } from "@/components/ActionsMenu.vue";
import { IQuery } from "@/state/query";
import { CurrentChanges, ScopeName } from "@/state/staging_changes";
import { ISelectionRef } from "@/components/BaseUserView";
import ModalPortal from "@/components/modal/ModalPortal";

const staging = namespace("staging");
const userView = namespace("userView");

@Component({ components: { ModalPortal }})
export default class SelectUserView extends Vue {
    @staging.State("current") changes!: CurrentChanges;
    @staging.Action("submit") submitChanges!: (scope?: ScopeName) => Promise<void>;
    @staging.Action("removeScope") removeScope!: (scope: ScopeName) => Promise<void>;
    @userView.Action("getEntity") getEntity!: (ref: IEntityRef) => Promise<IEntity>;
    @Prop({ type: Object, required: true }) entity!: IEntityRef;
    @Prop({ type: Object, required: true }) selectView!: IQuery;

    private extraActions: IAction[] = [];
    private currentView: IQuery = this.selectView;
    private title: string = "";

    get actions() {
        return this.extraActions.map(action => {
            if ("query" in action) {
                return { name: action.name, callback: () => this.goto(action.query) };
            } else {
                return action;
            }
        });
    }

    get saveAndSelect() {
        return this.currentView.args.args === null;
    }

    private saveView() {
        this.submitChanges(this.uid);
    }

    private async selectFromView(selection: ISelectionRef) {
        const entityInfo = await this.getEntity(this.entity);
        if (!(equalEntityRef(this.entity, selection.entity) || entityInfo.children.some(x => equalEntityRef(x.ref, selection.entity)))) {
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

<style>
 .selection_view_save__container {
     width: 100%;
     display: flex;
     justify-content: flex-end;
     position: sticky;
 }
 .selection_view_save__button {
     border: var(--NavigationTextColor) 1px solid !important;
     color: var(--NavigationTextColor);
     background-color: var(--NavigationBackColor);
 }
 @media screen and (min-width: 480px) {
     .selection_view_save__container {
         bottom: 25px;
     }
 }
</style>
