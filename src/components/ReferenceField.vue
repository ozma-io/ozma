<i18n>
    {
        "en": {
            "select_view": "Add in modal window",
            "follow_reference": "Open in modal window"
        },
        "ru": {
            "select_view": "Создать во вложенном окне",
            "follow_reference": "Открыть во вложенном окне"
        }
    }
</i18n>

<template>
    <div>
        <SelectUserView v-if="selectViewActive"
                :selectView="selectView"
                :entity="entry.entity"
                @select="$emit('update', $event); selectViewActive = false"
                @close="selectViewActive = false" />

        <SelectUserView v-if="uv"
            :selectView="uv"
            :entity="entry.entity"
            @select="$emit('update', $event); selectViewActive = false"
            @close="uv = null" />

        <MultiSelect v-if="options !== null"
                        :value="currentValue"
                        :options="options"
                        :height="height"
                        single
                        @update:value="$emit('update', $event)"
                        :required="!isNullable"
                        :disabled="isDisabled"
                        ref="control">
            <template v-slot:singleValue="select">
                <span v-if="select.valueOption.meta && select.valueOption.meta.link"
                    :style="select.listValueStyle"
                    class="single_value">
                    <input @click.stop="openModal()" type="button" class="material-icons reference__open_modal" value="flip_to_front">
                    <UserViewLink :uv="select.valueOption.meta.link"
                                    @[indirectLinks?`click`:null]="$emit('goto', $event)">
                        {{select.valueOption.label}}
                    </UserViewLink>
                </span>
                <span v-else
                        :style="select.listValueStyle"
                        class="single_value">{{select.valueOption.label}}</span>
            </template>
            <template v-slot:actions="actions" v-if="showModalButton">
                <button type="button" class="reference__new_modal__button" @click="openNewModal">
                    <input type="button" class="material-icons reference__open_modal" value="add">
                    {{ $t("select_view") }}
                </button>
            </template>
        </MultiSelect>
        <input v-else
                type="text"
                class="reference_backup_input"
                :value="currentValue"
                @input="$emit('update', $event.target.value)"
                :disabled="isDisabled"
                :required="!isNullable"
                :style="controlStyle"
                ref="control" />
    </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";

import { ReferenceName } from "@/utils";
import { IReferenceFieldType, IEntityRef } from "@/api";
import { IUserViewArguments, ICombinedValue, homeSchema, currentValue, IEntriesRef } from "@/state/user_view";
import { IQuery, attrToQueryRef } from "@/state/query";
import SelectUserView from "@/components/SelectUserView.vue";
import { ISelectOption } from "@/components/multiselect/MultiSelect.vue";
import MultiSelect from "@/components/multiselect/MultiSelect.vue";
import { IAction } from "@/components/ActionsMenu.vue";
import { equalEntityRef } from "@/values";
import BaseEntriesView from "@/components/BaseEntriesView";

@Component({
    components: {
        SelectUserView,
        MultiSelect,
    },
})
export default class ReferenceField extends mixins(BaseEntriesView) {
    @Prop({ type: Object, required: true }) value!: ICombinedValue;
    @Prop({ type: Object, required: true }) entry!: IEntriesRef;
    @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments;
    @Prop({ type: Object }) selectView!: IQuery | undefined;
    @Prop({ type: Object }) linkedAttr!: any | undefined;
    @Prop({ type: Boolean, default: false }) isDisabled!: boolean;
    @Prop({ type: Boolean, default: false }) isNullable!: boolean;
    @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
    @Prop({ type: Number }) height!: number | undefined;
    @Prop({ type: Object }) controlStyle!: any;

    private extraActions: IAction[] = [];
    private selectViewActive = false;
    private uv: IQuery | null = null;

    get entriesEntity() {
        return this.entry;
    }

    get currentValue() {
        return currentValue(this.value);
    }

    get showModalButton(): boolean {
        const home = homeSchema(this.uvArgs);
        const linkOpts = home !== null ? { homeSchema: home } : undefined;

        const linkedView = attrToQueryRef(this.linkedAttr, this.currentValue, linkOpts);
        return linkedView != null;
    }

    private openModal() {
        const home = homeSchema(this.uvArgs);
        const linkOpts = home !== null ? { homeSchema: home } : undefined;

        const actions: IAction[] = [];

        const linkedView = attrToQueryRef(this.linkedAttr, this.currentValue, linkOpts);
        if (linkedView !== null) {
            this.uv = linkedView;
        }
    }

    private openNewModal() {
        if (this.selectView !== undefined && !this.selectViewActive && !this.isDisabled) {
            this.selectViewActive = true;
        }
    }

    get options(): ISelectOption[] | null {
        if (this.currentEntries === null) {
            return null;
        } else {
            const home = homeSchema(this.uvArgs);
            const linkOpts = home !== null ? { homeSchema: home } : undefined;

            return Object.entries(this.currentEntries).map(([id, name]) => ({
                label: name,
                value: Number(id),
                meta: {
                    link: attrToQueryRef(this.linkedAttr, id, linkOpts),
                },
            }));
        }
    }

    @Watch("selectViewActive")
    private clearActions() {
        if (!this.selectViewActive) {
            this.extraActions = [];
        }
    }
}
</script>

<style scoped>
 .reference_backup_input {
     width: 100%;
 }
 .form-view {
     width: 85vw;
 }
 .single_value > a,
 .select_container__options_list__option > a {
     color: var(--TableTextColor);
     text-decoration: underline;
 }
 .reference__open_modal {
     border: none;
     background: none;
     padding: 0;
     margin: 0 10px 0 0;
 }
 .reference__new_modal__button {
    background-color: var(--NavigationBackColor);
    color: var(--NavigationTextColor);
    display: flex;
    align-items: center;
 }
</style>
