<i18n>
    {
        "en": {
            "select_view": "Select in view",
            "follow_reference": "Follow reference"
        },
        "ru": {
            "select_view": "Выбрать из представления",
            "follow_reference": "Перейти к сущности"
        }
    }
</i18n>

<template>
    <div>
        <SelectUserView v-if="selectViewActive"
                :selectView="selectView"
                :entity="entity"
                @update:actions="extraActions = $event"
                @select="$emit('update', $event); selectViewActive = false" />

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
                    <UserViewLink :uv="select.valueOption.meta.link"
                                    @[indirectLinks?`click`:null]="$emit('goto', $event)">
                        {{select.valueOption.label}}
                    </UserViewLink>
                </span>
                <span v-else
                        :style="select.listValueStyle"
                        class="single_value">{{select.valueOption.label}}</span>
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
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { ReferenceName, debugLog } from "@/utils";
import { IReferenceFieldType, IEntityRef } from "@/api";
import { Entries, CurrentEntries, IUserViewArguments, ICombinedValue, homeSchema, currentValue } from "@/state/user_view";
import { IQuery, attrToQueryRef } from "@/state/query";
import SelectUserView from "@/components/SelectUserView.vue";
import { ISelectOption } from "@/components/multiselect/MultiSelect.vue";
import MultiSelect from "@/components/multiselect/MultiSelect.vue";
import { IAction } from "@/components/ActionsMenu.vue";
import { equalEntityRef } from "@/values";

const userView = namespace("userView");

@Component({
    components: {
        SelectUserView,
        MultiSelect,
    },
})
export default class ReferenceField extends Vue {
    @userView.Mutation("removeEntriesConsumer") removeEntriesConsumer!: (args: { ref: IEntityRef, reference: ReferenceName }) => void;
    @userView.State("entries") entriesMap!: CurrentEntries;
    @userView.Action("getEntries") getEntries!: (args: { reference: ReferenceName, ref: IEntityRef }) => Promise<Entries>;

    @Prop({ type: Object, required: true }) value!: ICombinedValue;
    @Prop({ type: Object, required: true }) entity!: IEntityRef;
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
    private oldEntries: Entries | Error | null = null;

    get currentValue() {
        return currentValue(this.value);
    }

    get actions() {
        const home = homeSchema(this.uvArgs);
        const linkOpts = home !== null ? { homeSchema: home } : undefined;

        const actions: IAction[] = [];

        const linkedView = attrToQueryRef(this.linkedAttr, this.currentValue, this.value.info, linkOpts);
        if (linkedView !== null) {
            actions.push({ name: this.$tc("follow_reference"), query: linkedView });
        }

        if (this.selectView !== undefined && !this.selectViewActive && !this.isDisabled) {
            actions.push( { name: this.$tc("select_view"), callback: () => {
                this.selectViewActive = true;
            } });
        }

        actions.push(...this.extraActions);
        return actions;
    }

    get options(): ISelectOption[] | null {
        if (this.oldEntries === null) {
            return null;
        } else {
            const home = homeSchema(this.uvArgs);
            const linkOpts = home !== null ? { homeSchema: home } : undefined;

            return Object.entries(this.oldEntries).map(([id, name]) => ({
                label: name,
                value: Number(id),
                meta: {
                    link: attrToQueryRef(this.linkedAttr, id, this.value.info, linkOpts),
                },
            }));
        }
    }

    get newEntries() {
        const ret = this.entriesMap.getEntries(this.entity);
        return ret === undefined ? null : ret;
    }

    private destroyEntities(ref: IEntityRef) {
        this.removeEntriesConsumer({ ref, reference: this.uid });
    }

    @Watch("newEntries", { immediate: true })
    private updateEntries() {
        if (this.newEntries instanceof Error) {
            this.oldEntries = null;
        } else if (this.newEntries !== null) {
            this.oldEntries = this.newEntries;
        }
    }

    @Watch("actions", { deep: true, immediate: true })
    private pushActions() {
        this.$emit("update:actions", this.actions);
    }

    @Watch("selectView")
    private clearActions() {
        if (this.selectView === null) {
            this.extraActions = [];
        }
    }

    @Watch("entity", { immediate: true, deep: true })
    private entityChanged(newEntity: IEntityRef, oldEntity: IEntityRef | undefined) {
        if (oldEntity === undefined || !equalEntityRef(newEntity, oldEntity)) {
            if (oldEntity !== undefined) {
                this.destroyEntities(oldEntity);
            }
            this.getEntries({ ref: newEntity, reference: this.uid });
        }
    }

    private destroyed() {
        this.destroyEntities(this.entity);
    }
}
</script>

<style scoped>
 .reference_backup_input {
     width: 100%;
 }
</style>
