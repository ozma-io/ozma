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
        <!-- Used when user selects an entry -->
        <ModalUserView v-if="selectedView"
                       :initialView="selectedView"
                       :selectEntity="entry.entity"
                       @select="$emit('update', $event); selectedView = null"
                       @close="selectedView = null" />

        <!-- Used when user opens a model window for an entry ("modal" button) -->
        <ModalUserView v-if="nestedView !== null"
            :initialView="nestedView"
            @close="nestedView = null" />

        <MultiSelect v-if="options !== null"
                        :value="currentValue"
                        :options="options"
                        :height="height"
                        single
                        :autofocus="autofocus"
                        :dontOpen="dontOpen"
                        @update:value="$emit('update', $event)"
                        @focus="$emit('focus', $event)"
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
            <template slot="actions" v-if="showModalButton">
                <button v-for="(action, index) in actions"
                        :key="index" type="button"
                        class="reference__new_modal__button"
                        @click="openActionModal(action)">
                    <input type="button" class="material-icons reference__open_modal" value="add">
                    {{ action.name }}
                </button>
            </template>
        </MultiSelect>
        <input v-else
                type="text"
               :autofocus="autofocus"
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
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { mixins } from "vue-class-component";
import { IUserViewArguments, ICombinedValue, homeSchema, currentValue, IEntriesRef } from "@/state/user_view";
import { IQuery, attrToQueryRef } from "@/state/query";
import ModalUserView from "@/components/ModalUserView.vue";
import { ISelectOption } from "@/components/multiselect/MultiSelect.vue";
import MultiSelect from "@/components/multiselect/MultiSelect.vue";
import { IAction, IQueryAction } from "@/components/ActionsMenu.vue";
import BaseEntriesView from "@/components/BaseEntriesView";

@Component({
    components: {
        ModalUserView,
        MultiSelect,
    },
})
export default class ReferenceField extends mixins(BaseEntriesView) {
    @Prop({ type: Array, required: true }) actions!: IQueryAction[];
    @Prop({ type: Object, required: true }) value!: ICombinedValue;
    @Prop({ type: Object, required: true }) entry!: IEntriesRef;
    @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments;
    @Prop({ type: Object }) selectView!: IQuery | undefined;
    @Prop({ type: Object }) linkedAttr!: any | undefined;
    @Prop({ type: Boolean, default: false }) isDisabled!: boolean;
    @Prop({ type: Boolean, default: false }) isNullable!: boolean;
    @Prop({ type: Boolean, default: false }) dontOpen!: boolean;
    @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
    @Prop({ type: Number }) height!: number | undefined;
    @Prop({ type: Object }) controlStyle!: any;
    @Prop({ type: Boolean, default: false }) autofocus!: boolean;
    private selectedView: IQuery | null = null;
    private nestedView: IQuery | null = null;

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

        const linkedView = attrToQueryRef(this.linkedAttr, this.currentValue, linkOpts);
        if (linkedView !== null) {
            this.nestedView = linkedView;
        }
    }

    private openActionModal(action: IQueryAction) {
        if (!this.isDisabled) {
            this.selectedView = action.query;
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
     color: var(--MainTextColor);
     text-decoration: underline;
 }
 .reference__open_modal {
     border: none;
     background: none;
     padding: 0;
     margin: 0 10px 0 0;
     color: var(--MainTextColor);
 }
 .reference__new_modal__button {
    background-color: var(--NavigationBackColor);
    color: var(--TableTextColor);
    display: flex;
    align-items: center;
     width: 100%;
 }
</style>
