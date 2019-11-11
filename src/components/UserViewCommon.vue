<i18n>
    {
        "en": {
            "create": "Create new",
            "edit_view": "Edit user view"
        },
        "ru": {
            "create": "Создать новую",
            "edit_view": "Редактировать представление"
        }
    }
</i18n>

<template>
    <span>
    </span>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { mixins } from "vue-class-component";

import BaseUserView from "@/components/BaseUserView";
import { LocalUserView } from "@/local_user_view";
import { IAttrToQueryOpts, attrToQuery, IQuery } from "@/state/query";
import { homeSchema } from "@/state/user_view";
import { IAction } from "@/components/ActionsMenu.vue";
import { funappSchema } from "@/api";

@Component
export default class UserViewCommon extends mixins<BaseUserView<LocalUserView<null, null, null>, null, null, null>>(BaseUserView) {
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

    @Watch("actions", { deep: true, immediate: true })
    private pushActions() {
        this.$emit("update:actions", this.actions);
    }
}
</script>
