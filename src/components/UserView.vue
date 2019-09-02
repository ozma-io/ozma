<i18n>
    {
        "en": {
            "create": "Create new",
            "edit_view": "Edit user view",
            "loading": "Now loading",
            "forbidden": "Sorry, you are not authorized to use this user view. Contact your administrator.",
            "not_found": "User view not found",
            "bad_request": "User view request error: {msg}",
            "unknown_error": "Unknown user view fetch error: {msg}"
        },
        "ru": {
            "create": "Создать новую",
            "edit_view": "Редактировать представление",
            "loading": "Загрузка данных",
            "forbidden": "К сожалению у вас нет прав доступа для просмотра этого представления. Свяжитесь с администратором.",
            "not_found": "Представление не найдено",
            "bad_request": "Неверный запрос для этого представления: {msg}",
            "unknown_error": "Неизвестная ошибка загрузки представления: {msg}"
        }
    }
</i18n>

<template>
    <span>
        <component v-if="uvIsReady"
                :is="`UserView${userViewType}`"
                :uv="uv"
                :isRoot="isRoot"
                :filter="filter"
                :local="local"
                @update:actions="extraActions = $event"
                @update:statusLine="$emit('update:statusLine', $event)"
                @update:onSubmitStaging="$emit('update:onSubmitStaging', $event)"
                @update:enableFilter="$emit('update:enableFilter', $event)"
                @update:bodyStyle="$emit('update:bodyStyle', $event)" />
        <div v-else-if="errorMessage !== null" class="loading">
            {{ errorMessage }}
        </div>
        <div v-else class="loading">
            {{ $t('loading') }}
        </div>
    </span>
</template>

<script lang="ts">
import { VueConstructor } from "vue";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { Store } from "vuex";

import { RecordSet, deepEquals } from "@/utils";
import { funappSchema } from "@/api";
import { CombinedUserView, UserViewError, IUserViewArguments, IUserViewEventHandler, CurrentUserViews, IUserViewState } from "@/state/user_view";
import { CurrentAuth } from "@/state/auth";
import { attrToInfoQuery, queryLocation, IQuery } from "@/state/query";
import { IUserViewConstructor } from "@/components";
import { IHandlerProvider } from "@/local_user_view";
import { IAction } from "@/components/ActionsMenu.vue";

const types: RecordSet<string> = {
    "Form": null,
    "Menu": null,
    "Table": null,
};

const components = Object.fromEntries(Object.keys(types).map(name => {
    return [`UserView${name}`, () => import(`@/components/views/${name}.vue`)];
}));

const userView = namespace("userView");

const userViewType = (uv: CombinedUserView) => {
    const typeAttr = uv.attributes["Type"];
    if (typeAttr in types) {
        return typeAttr;
    } else {
        return "Table";
    }
};

@Component({ components })
export default class UserView extends Vue {
    @userView.State("current") currentUvs!: CurrentUserViews;
    @userView.Mutation("registerHandler") registerHandler!: (args: { args: IUserViewArguments, handler: IUserViewEventHandler }) => void;
    @userView.Mutation("unregisterHandler") unregisterHandler!: (args: { args: IUserViewArguments, handler: IUserViewEventHandler }) => void;
    @Prop({ type: Object, required: true }) args!: IUserViewArguments;
    @Prop({ type: Boolean, default: false }) isRoot!: boolean;
    @Prop({ type: Array, default: () => [] }) filter!: string[];
    @Prop({ type: Object, default: () => ({}) }) defaultValues!: Record<string, any>;

    private extraActions: IAction[] = [];
    private component: IUserViewConstructor<Vue> | null = null;
    private local: IHandlerProvider | null = null;
    private oldArgs: IUserViewArguments | null = null;

    get uv() {
        return this.currentUvs.getUserView(this.args);
    }

    get uvIsReady() {
        return this.uv instanceof CombinedUserView && this.component !== null;
    }

    get actions() {
        const actions: IAction[] = [];
        if (this.createView !== null) {
            actions.push({ name: this.$tc("create"), location: queryLocation(this.createView) });
        }
        if (this.uv instanceof CombinedUserView && this.uv.args.source.type === "named") {
            const query: IQuery = {
                search: {},
                rootViewArgs: {
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
            actions.push({ name: this.$tc("edit_view"), location: queryLocation(query) });
        }
        actions.push(...this.extraActions);
        return actions;
    }

    @Watch("uv")
    // Should clear all user view-specific values.
    private async updateUserView(uv: CombinedUserView | UserViewError | null, oldUv: CombinedUserView | UserViewError | null) {
        this.extraActions = [];
        this.component = null;
        let oldLocal: IHandlerProvider | null = null;
        let oldType: string | null = null;
        if (this.oldArgs !== null && this.local !== null) {
            this.unregisterHandler({ args: this.oldArgs, handler: this.local.handler });
            if (this.uv instanceof CombinedUserView && oldUv instanceof CombinedUserView && deepEquals(this.uv.args, oldUv.args)) {
                oldLocal = this.local;
                oldType = userViewType(oldUv);
            }
            this.local = null;
        }
        this.oldArgs = null;

        console.log("Updated uv, new value", this.uv, "type", this.userViewType);
        if (this.userViewType !== null) {
            if (!(this.uv instanceof CombinedUserView)) {
                throw Error("Impossible");
            }
            const args = this.args;
            const component: IUserViewConstructor<Vue> = (await import(`@/components/views/${this.userViewType}.vue`)).default;
            // Check we weren't restarted.
            if (args !== this.args || !(this.uv instanceof CombinedUserView)) {
                return;
            }

            this.component = component;
            this.oldArgs = args;
            if (component.localConstructor !== undefined) {
                const givenLocal = oldLocal !== null && oldType! === this.userViewType ? oldLocal : null;
                const local = component.localConstructor(this.$store, this.uv, this.defaultValues, givenLocal);
                this.local = local;
                this.registerHandler({ args: this.args, handler: local.handler });
            }
        }
    }

    @Watch("actions", { deep: true })
    private pushActions() {
        this.$emit("update:actions", this.actions);
    }

    get userViewType() {
        if (!(this.uv instanceof CombinedUserView)) {
            return null;
        } else {
            return userViewType(this.uv);
        }
    }

    get createView() {
        if (!(this.uv instanceof CombinedUserView)) {
            return null;
        } else {
            return attrToInfoQuery(this.uv.attributes["CreateView"]);
        }
    }

    get errorMessage() {
        if (!(this.uv instanceof UserViewError)) {
            return null;
        } else {
            if (this.uv.type === "forbidden") {
                return this.$t("forbidden");
            } else if (this.uv.type === "not_found") {
                return this.$t("not_found");
            } else if (this.uv.type === "bad_request") {
                return this.$t("bad_request", { msg: this.uv.message });
            } else {
                return this.$t("unknown_error", { msg: this.uv.message });
            }
        }
    }

    private destroyed() {
        if (this.local !== null) {
            this.unregisterHandler({ args: this.args, handler: this.local.handler });
        }
    }
}
</script>
