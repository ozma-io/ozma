<i18n>
    {
        "en": {
            "create": "Create new",
            "edit_view": "Edit user view",
            "loading": "Now loading",
            "forbidden": "Sorry, you are not authorized to use this user view. Contact your administrator.",
            "not_found": "User view not found",
            "bad_request": "User view request error: {msg}",
            "unknown_error": "Unknown user view fetch error: {msg}",
            "anonymous_query": "(anonymous query)"
        },
        "ru": {
            "create": "Создать новую",
            "edit_view": "Редактировать представление",
            "loading": "Загрузка данных",
            "forbidden": "К сожалению у вас нет прав доступа для просмотра этого представления. Свяжитесь с администратором.",
            "not_found": "Представление не найдено",
            "bad_request": "Неверный запрос для этого представления: {msg}",
            "unknown_error": "Неизвестная ошибка загрузки представления: {msg}",
            "anonymous_query": "(анонимный запрос)"
        }
    }
</i18n>

<template>
    <span>
        <component v-if="uvIsReady"
                :is="`UserView${userViewType}`"
                :uv="currentUv"
                :isRoot="isRoot"
                :filter="filter"
                :local="local"
                :scope="scope"
                :level="level"
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

import { RecordSet, ReferenceName, deepEquals } from "@/utils";
import { funappSchema } from "@/api";
import { equalEntityRef } from "@/values";
import { CombinedUserView, UserViewError, IUserViewArguments, IUserViewEventHandler, CurrentUserViews, IUserViewState, homeSchema } from "@/state/user_view";
import { CurrentAuth } from "@/state/auth";
import { CombinedTransactionResult, ICombinedInsertEntityResult, ScopeName } from "@/state/staging_changes";
import { CurrentQuery, attrToQuery, queryLocation, IQuery, IAttrToQueryOpts } from "@/state/query";
import { IUserViewConstructor } from "@/components";
import { IHandlerProvider } from "@/local_user_view";
import { IAction } from "@/components/ActionsMenu.vue";
import { ISelectionRef } from "@/components/BaseUserView";

const types: RecordSet<string> = {
    "Form": null,
    "Menu": null,
    "Table": null,
    "MultiSelect": null,
};

const components = Object.fromEntries(Object.keys(types).map(name => {
    return [`UserView${name}`, () => import(`@/components/views/${name}.vue`)];
}));

const userView = namespace("userView");
const staging = namespace("staging");
const query = namespace("query");

const userViewType = (uv: CombinedUserView) => {
    const typeAttr = uv.attributes["Type"];
    if (typeAttr in types) {
        return String(typeAttr);
    } else {
        return "Table";
    }
};

const maxLevel = 4;

@Component({ components })
export default class UserView extends Vue {
    @userView.State("current") currentUvs!: CurrentUserViews;
    @userView.Mutation("removeUserViewConsumer") removeUserViewConsumer!: (args: { args: IUserViewArguments, reference: ReferenceName }) => void;
    @userView.Mutation("registerHandler") registerHandler!: (args: { args: IUserViewArguments, handler: IUserViewEventHandler }) => void;
    @userView.Mutation("unregisterHandler") unregisterHandler!: (args: { args: IUserViewArguments, handler: IUserViewEventHandler }) => void;
    @userView.Action("getNestedView") getNestedView!: (args: { args: IUserViewArguments, reference: ReferenceName }) => Promise<CombinedUserView>;
    @staging.State("currentSubmit") submitPromise!: Promise<CombinedTransactionResult[]> | null;
    @query.State("current") query!: CurrentQuery;

    @Prop({ type: Object, required: true }) args!: IUserViewArguments;
    @Prop({ type: Boolean, default: false }) isRoot!: boolean;
    @Prop({ type: String, required: true }) scope!: ScopeName;
    @Prop({ type: Number, default: 0 }) level!: number;
    @Prop({ type: Array, default: () => [] }) filter!: string[];
    @Prop({ type: Object, default: () => ({}) }) defaultValues!: Record<string, any>;
    // Use this user view to select and return an entry.
    @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
    // Emit events to jump to other user views. If `false` insert simple <href>s instead.
    @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;

    private extraActions: IAction[] = [];
    private component: IUserViewConstructor<Vue> | null = null;
    private local: IHandlerProvider | null = null;
    // currentUv is shown while new component for uv is loaded.
    private currentUv: CombinedUserView | UserViewError | null = null;

    get title() {
        if (this.args.source.type === "named") {
            return this.args.source.ref.name;
        } else {
            return this.$tc("anonymous_query");
        }
    }

    get newUv() {
        if (this.level >= maxLevel) {
            return new UserViewError("bad_request", "Too many levels of nested user views", this.args);
        } else {
            const ret = this.currentUvs.getUserView(this.args);
            return ret === undefined ? null : ret;
        }
    }

    get uvIsReady() {
        return this.currentUv instanceof CombinedUserView && this.component !== null;
    }

    get actions() {
        const actions: IAction[] = [];
        if (this.createView !== null) {
            actions.push({ name: this.$tc("create"), query: this.createView });
        }
        if (this.currentUv !== null && this.currentUv.args.source.type === "named") {
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
                        schema: this.currentUv.args.source.ref.schema,
                        name: this.currentUv.args.source.ref.name,
                    },
                },
            };
            actions.push({ name: this.$tc("edit_view"), query: editQuery });
        }
        actions.push(...this.extraActions);
        return actions;
    }

    get userViewType() {
        if (this.currentUv instanceof CombinedUserView) {
            return userViewType(this.currentUv);
        } else {
            return null;
        }
    }

    get createView() {
        if (this.currentUv instanceof CombinedUserView) {
            const opts: IAttrToQueryOpts = {
                infoByDefault: true,
            };
            const home = homeSchema(this.currentUv.args);
            if (home !== null) {
                opts.homeSchema = home;
            }
            return attrToQuery(this.currentUv.attributes["CreateView"], opts);
        } else {
            return null;
        }
    }

    get errorMessage() {
        if (!(this.currentUv instanceof UserViewError)) {
            return null;
        } else {
            if (this.currentUv.type === "forbidden") {
                return this.$t("forbidden");
            } else if (this.currentUv.type === "not_found") {
                return this.$t("not_found");
            } else if (this.currentUv.type === "bad_request") {
                return this.$t("bad_request", { msg: this.currentUv.message });
            } else {
                return this.$t("unknown_error", { msg: this.currentUv.message });
            }
        }
    }

    // Should clear all user view-specific values.
    @Watch("newUv", { immediate: true })
    private async updateUserView() {
        const newUv = this.newUv;
        if (newUv !== null && newUv === this.currentUv) {
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
            this.currentUv = newUv;
            this.local = local;
            this.component = component;
        } else if (newUv instanceof UserViewError) {
            this.extraActions = [];
            this.currentUv = newUv;
            this.local = null;
            this.component = null;
        } else if (newUv === null) {
            this.requestView();
        }
    }

    // We should request nested view:
    // * when arguments change (different view selected);
    // * when current view is `null` (view is not yet requested).
    private requestView() {
        if (this.query.rootViewArgs !== null && !deepEquals(this.args, this.query.rootViewArgs)) {
            this.getNestedView({ args: this.args, reference: this.uid });
        }
    }

    private destroyUserView(args: IUserViewArguments) {
        if (this.local !== null) {
            this.unregisterHandler({ args, handler: this.local.handler });
        }
        this.removeUserViewConsumer({ args, reference: this.uid });
    }

    private setUvError(error: UserViewError) {
        this.destroyUserView(this.args);
        this.currentUv = error;
        this.local = null;
        this.component = null;
    }

    @Watch("actions", { deep: true, immediate: true })
    private pushActions() {
        this.$emit("update:actions", this.actions);
    }

    private destroyed() {
        this.destroyUserView(this.args);
    }

    @Watch("args", { deep: true })
    private argsChanged(newArgs: IUserViewArguments, oldArgs: IUserViewArguments) {
        if (!deepEquals(oldArgs, newArgs)) {
            this.destroyUserView(oldArgs);
            this.requestView();
        }
    }

    @Watch("title", { immediate: true })
    private updateTitle() {
        this.$emit("update:title", this.title);
    }

    @Watch("submitPromise", { immediate: true })
    private changesSubmitted(submitPromise: Promise<CombinedTransactionResult[]> | null) {
        const currentUv = this.currentUv;
        if (currentUv instanceof CombinedUserView && currentUv.rows === null && submitPromise !== null) {
            (async () => {
                let ret: CombinedTransactionResult[];
                try {
                    ret = await submitPromise;
                } catch (e) {
                    return;
                }

                if (!deepEquals(this.args, currentUv.args)) {
                    // We went somewhere else meanwhile.
                    return;
                }

                const createOp = ret.find(x => x.type === "insert" && equalEntityRef(x.entity, currentUv.info.mainEntity!));
                if (createOp === undefined) {
                    return;
                }
                const id = (createOp as ICombinedInsertEntityResult).id;
                if (this.selectionMode) {
                    const ref: ISelectionRef = {
                        entity: currentUv.info.mainEntity!,
                        id,
                    };
                    this.$emit("select", ref);
                } else {
                    const args: IUserViewArguments = { source: currentUv.args.source, args: { id } };
                    const newQuery: IQuery = {
                        defaultValues: {},
                        args,
                    };
                    this.$emit("goto", newQuery);
                }
            })();
        }
    }
}
</script>
