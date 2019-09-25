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
                :uv="oldUv"
                :isRoot="isRoot"
                :filter="filter"
                :local="local"
                :scope="scope"
                :selectionMode="selectionMode"
                :indirectLinks="indirectLinks"
                @goto="$emit('goto', $event)"
                @select="$emit('select', $event)"
                @update:actions="extraActions = $event"
                @update:statusLine="$emit('update:statusLine', $event)"
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
import { equalEntityRef } from "@/values";
import { CombinedUserView, UserViewError, IUserViewArguments, IUserViewEventHandler, CurrentUserViews, IUserViewState, homeSchema, ConsumerName } from "@/state/user_view";
import { CurrentAuth } from "@/state/auth";
import { CombinedTransactionResult, ICombinedInsertEntityResult, ScopeName } from "@/state/staging_changes";
import { attrToQuery, queryLocation, IQuery, IAttrToQueryOpts } from "@/state/query";
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
const staging = namespace("staging");

const userViewType = (uv: CombinedUserView) => {
    const typeAttr = uv.attributes["Type"];
    if (typeAttr in types) {
        return String(typeAttr);
    } else {
        return "Table";
    }
};

@Component({ components })
export default class UserView extends Vue {
    @userView.State("current") currentUvs!: CurrentUserViews;
    @userView.Mutation("removeUserViewConsumer") removeUserViewConsumer!: (args: { args: IUserViewArguments, consumer: ConsumerName }) => void;
    @userView.Mutation("registerHandler") registerHandler!: (args: { args: IUserViewArguments, handler: IUserViewEventHandler }) => void;
    @userView.Mutation("unregisterHandler") unregisterHandler!: (args: { args: IUserViewArguments, handler: IUserViewEventHandler }) => void;
    @userView.Action("getNestedView") getNestedView!: (args: { args: IUserViewArguments, consumer: ConsumerName }) => Promise<void>;
    @staging.State("currentSubmit") submitPromise!: Promise<CombinedTransactionResult[]> | null;
    @Prop({ type: Object, required: true }) args!: IUserViewArguments;
    @Prop({ type: Boolean, default: false }) isRoot!: boolean;
    @Prop({ type: String, required: true }) scope!: ScopeName;
    @Prop({ type: Array, default: () => [] }) filter!: string[];
    @Prop({ type: Object, default: () => ({}) }) defaultValues!: Record<string, any>;
    // Use this user view to select and return an entry.
    @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
    // Emit events to jump to other user views. If `false` insert simple <href>s instead.
    @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;

    private extraActions: IAction[] = [];
    private component: IUserViewConstructor<Vue> | null = null;
    private local: IHandlerProvider | null = null;
    // oldUv is shown while new component for uv is loaded.
    private oldUv: CombinedUserView | UserViewError | null = null;

    get newUv() {
        return this.currentUvs.getUserView(this.args);
    }

    get uvIsReady() {
        return this.oldUv instanceof CombinedUserView && this.component !== null;
    }

    get actions() {
        const actions: IAction[] = [];
        if (this.createView !== null) {
            actions.push({ name: this.$tc("create"), query: this.createView });
        }
        if (this.oldUv !== null && this.oldUv.args.source.type === "named") {
            const query: IQuery = {
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
                        schema: this.oldUv.args.source.ref.schema,
                        name: this.oldUv.args.source.ref.name,
                    },
                },
            };
            actions.push({ name: this.$tc("edit_view"), query });
        }
        actions.push(...this.extraActions);
        return actions;
    }

    // Should clear all user view-specific values.
    @Watch("newUv", { immediate: true })
    private async updateUserView() {
        const newUv = this.newUv;
        if (newUv !== null && newUv === this.oldUv) {
            return;
        }

        if (newUv instanceof CombinedUserView) {
            if (newUv.rows === null && newUv.info.mainEntity === null) {
                this.setUvError(new UserViewError("bad_request", "Creation mode requires main entity to be specified", newUv.args));
                return;
            }
            const newType = userViewType(newUv);
            const component: IUserViewConstructor<Vue> = (await import(`@/components/views/${newType}.vue`)).default;
            // Check we weren't restarted.
            if (newUv !== this.newUv) {
                return;
            }

            // Exceptions in async watchers are silently ignored (?), so print it explicitly.
            let local: IHandlerProvider | null;
            if (component.localConstructor !== undefined) {
                const givenLocal = this.local !== null && this.userViewType === newType ? this.local : null;
                local = component.localConstructor(this.$store, newUv, this.defaultValues, givenLocal);
                this.registerHandler({ args: newUv.args, handler: local.handler });
            } else {
                local = null;
            }

            this.extraActions = [];
            this.component = component;
            this.oldUv = newUv;
            this.local = local;
        } else if (newUv instanceof UserViewError) {
            this.extraActions = [];
            this.component = null;
            this.oldUv = newUv;
            this.local = null;
        }
    }

    private destroyOldUv() {
        if (this.oldUv instanceof CombinedUserView) {
            if (this.local !== null) {
                this.unregisterHandler({ args: this.oldUv.args, handler: this.local.handler });
            }
            this.removeUserViewConsumer({ args: this.oldUv.args, consumer: this.uid });
        }
    }

    private setUvError(error: UserViewError) {
        this.destroyOldUv();
        this.oldUv = error;
        this.local = null;
        this.component = null;
    }

    @Watch("actions", { deep: true })
    private pushActions() {
        this.$emit("update:actions", this.actions);
    }

    get userViewType() {
        if (this.oldUv instanceof CombinedUserView) {
            return userViewType(this.oldUv);
        } else {
            return null;
        }
    }

    get createView() {
        if (this.oldUv instanceof CombinedUserView) {
            const opts: IAttrToQueryOpts = {
                infoByDefault: true,
            };
            const home = homeSchema(this.oldUv.args);
            if (home !== null) {
                opts.homeSchema = home;
            }
            return attrToQuery(this.oldUv.attributes["CreateView"], opts);
        } else {
            return null;
        }
    }

    get errorMessage() {
        if (!(this.oldUv instanceof UserViewError)) {
            return null;
        } else {
            if (this.oldUv.type === "forbidden") {
                return this.$t("forbidden");
            } else if (this.oldUv.type === "not_found") {
                return this.$t("not_found");
            } else if (this.oldUv.type === "bad_request") {
                return this.$t("bad_request", { msg: this.oldUv.message });
            } else {
                return this.$t("unknown_error", { msg: this.oldUv.message });
            }
        }
    }

    private destroyed() {
        this.destroyOldUv();
    }

    @Watch("args", { deep: true, immediate: true })
    private argsChanged(newArgs: IUserViewArguments, oldArgs: IUserViewArguments) {
        if (!deepEquals(oldArgs, newArgs)) {
            this.destroyOldUv();
            this.getNestedView({ args: this.args, consumer: this.uid });
        }
    }

    @Watch("submitPromise", { immediate: true })
    private changesSubmitted(submitPromise: Promise<CombinedTransactionResult[]> | null) {
        const oldUv = this.oldUv;
        if (oldUv instanceof CombinedUserView && oldUv.rows === null && submitPromise !== null) {
            (async () => {
                let ret: CombinedTransactionResult[];
                try {
                    ret = await submitPromise;
                } catch (e) {
                    return;
                }

                if (!deepEquals(this.args, oldUv.args)) {
                    // We went somewhere else meanwhile.
                    return;
                }

                const createOp = ret.find(x => x.type === "insert" && equalEntityRef(x.entity, oldUv.info.mainEntity!));
                if (createOp === undefined) {
                    return;
                }
                const id = (createOp as ICombinedInsertEntityResult).id;
                const args: IUserViewArguments = { source: oldUv.args.source, args: { id } };
                const query: IQuery = {
                    defaultValues: {},
                    args,
                };
                this.$emit("goto", query);
            })();
        }
    }
}
</script>
