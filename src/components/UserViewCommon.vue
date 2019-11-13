<i18n>
    {
        "en": {
            "create": "Create new",
            "edit_view": "Edit user view",
            "create_in_modal": "Create referenced in modal window"
        },
        "ru": {
            "create": "Создать новую",
            "edit_view": "Редактировать представление",
            "create_in_modal": "Создать связанную запись в окне"
        }
    }
</i18n>

<template>
    <span>
        <SelectUserView v-if="modalUV"
            :selectView="modalUV"
            :entity="modalReferenceField.entity"
            @select="selectFromUserView($event)"
            @close="modalUV = null" />
    </span>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { mixins } from "vue-class-component";
import * as R from "ramda";

import BaseUserView from "@/components/BaseUserView";
import { LocalUserView } from "@/local_user_view";
import { IAttrToQueryOpts, attrToQuery, IQuery } from "@/state/query";
import { ValueRef } from "@/local_user_view";
import { homeSchema } from "@/state/user_view";
import { IAction } from "@/components/ActionsMenu.vue";
import { funappSchema, IEntityRef } from "@/api";
import SelectUserView from "@/components/SelectUserView.vue";
import { mapMaybe } from "@/utils";

interface IModalReferenceField {
    field: ValueRef;
    uv: IQuery;
    entity: IEntityRef;
}

@Component({ components: { SelectUserView } })
export default class UserViewCommon extends mixins<BaseUserView<LocalUserView<null, null, null>, null, null, null>>(BaseUserView) {
    modalUV: IQuery | null = null;

    get createView() {
        const opts: IAttrToQueryOpts = {
            infoByDefault: true,
        };
        const home = homeSchema(this.uv.args);
        if (home !== null) {
            opts.homeSchema = home;
        }
        return attrToQuery(this.uv.attributes["CreateView"], opts);
    }

    get actions() {
        const actions: IAction[] = [];
        if (this.createView !== null) {
            actions.push({ name: this.$tc("create"), query: this.createView });
        }
        const modalReferenceField = this.modalReferenceField;
        if (modalReferenceField) {
            actions.push({ name: this.$tc("create_in_modal"), callback: () => this.modalUV = modalReferenceField.uv });
        }
        if (this.uv.args.source.type === "named") {
            const editQuery: IQuery = {
                defaultValues: {},
                args: {
                    source: {
                        type: "named",
                        ref: {
                            schema: funappSchema,
                            name: "UserViewByName",
                        },
                    },
                    args: {
                        schema: this.uv.args.source.ref.schema,
                        name: this.uv.args.source.ref.name,
                    },
                },
            };
            actions.push({ name: this.$tc("edit_view"), query: editQuery });
        }
        return actions;
    }

    get modalReferenceField(): IModalReferenceField | null {
        const modalReferenceField = R.head(mapMaybe((column, columnIndex): IModalReferenceField | undefined => {
            const referenceViewAttr = R.pathOr(null, ["columnAttributes", String(columnIndex), "ReferenceView"], this.uv);
            const referenceUV = attrToQuery(referenceViewAttr);
            const entity = R.path<IEntityRef>(["info", "columns", String(columnIndex), "mainField", "field", "fieldType", "entity"], this.uv);
            if (referenceUV && entity) {
                return {
                    field: { type: "new", column: columnIndex },
                    uv: referenceUV,
                    entity,
                };
            }
            return undefined;
        }, this.uv.columnAttributes));

        return modalReferenceField || null;
    }

    @Watch("actions", { deep: true, immediate: true })
    private pushActions() {
        this.$emit("update:actions", this.actions);
    }

    private selectFromUserView(id: number) {
        if (this.modalReferenceField) {
            this.updateValue(this.modalReferenceField.field, id);
        }
        this.modalUV = null;
    }
}
</script>
