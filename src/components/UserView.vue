<i18n>
    {
        "en": {
            "loading": "Now loading",
            "forbidden": "Sorry, you are not authorized to use this user view. Contact your administrator.",
            "not_found": "User view not found",
            "bad_request": "User view request error: {msg}",
            "unknown_error": "Unknown user view fetch error: {msg}",
            "anonymous_query": "(anonymous query)",
            "edit_view": "Edit user view",
            "open_as_top_level": "Open in full screen"
        },
        "ru": {
            "loading": "Загрузка данных",
            "forbidden": "К сожалению у вас нет прав доступа для просмотра этого представления. Свяжитесь с администратором.",
            "not_found": "Представление не найдено",
            "bad_request": "Неверный запрос для этого представления: {msg}",
            "unknown_error": "Неизвестная ошибка загрузки представления: {msg}",
            "anonymous_query": "(анонимный запрос)",
            "edit_view": "Редактировать представление",
            "open_as_top_level": "Открыть на полный экран"
        }
    }
</i18n>
<!--
  UserView SHOULD NOT contain any additional scaffolding
  Such as <InputSlot /> (We had precedents before)
  Any attempt to delegate any scaffolding logic to UserView,
  either via InputSlot or otherwise is subject to a
  thorough discussion with the team
-->

<template>
  <span>
    <template v-if="uvIsReady">
      <UserViewCommon
        :uv="currentUv"
        :is-root="isRoot"
        :is-top-level="isTopLevel"
        :filter="filter"
        :local="local"
        :base-local="baseLocal"
        :scope="scope"
        :level="level"
        :selection-mode="selectionMode"
        :default-values="defaultValues"
        @update:actions="extraCommonActions = $event"
      />
      <component
        :is="`UserView${userViewType}`"
        :uv="currentUv"
        :is-root="isRoot"
        :is-top-level="isTopLevel"
        :filter="filter"
        :local="local"
        :base-local="baseLocal"
        :scope="scope"
        :level="level"
        :selection-mode="selectionMode"
        :default-values="defaultValues"
        :background-color="backgroundColor"
        @goto="$emit('goto', $event)"
        @select="$emit('select', $event)"
        @update:actions="extraActions = $event"
        @update:statusLine="$emit('update:statusLine', $event)"
        @update:enableFilter="$emit('update:enableFilter', $event)"
        @update:bodyStyle="$emit('update:bodyStyle', $event)"
      />
    </template>
    <div
      v-else-if="errorMessage !== null"
      class="loading"
    >
      {{ errorMessage }}
    </div>
    <ProgressBar v-if="isLoadingUv" />
  </span>
</template>

<script lang="ts">
import { VueConstructor } from "vue";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { Store } from "vuex";
import ProgressBar from "@/components/ProgressBar.vue"

import { RecordSet, ReferenceName, deepEquals, snakeToPascal } from "@/utils";
import { funappSchema } from "@/api";
import { equalEntityRef } from "@/values";
import { CombinedUserView, UserViewError, IUserViewArguments, IUserViewEventHandler, CurrentUserViews, IUserViewState, homeSchema } from "@/state/user_view";
import { CurrentAuth } from "@/state/auth";
import { CombinedTransactionResult, ICombinedInsertEntityResult, ScopeName } from "@/state/staging_changes";
import { ICurrentQuery, attrToQuery, queryLocation, IQuery, IAttrToQueryOpts } from "@/state/query";
import { IUserViewConstructor } from "@/components";
import { IHandlerProvider } from "@/local_user_view";
import { Action } from "@/components/ActionsMenu.vue";
import { ISelectionRef, LocalBaseUserView } from "@/components/BaseUserView";
import UserViewCommon from "@/components/UserViewCommon.vue";

const types: RecordSet<string> = {
  "form": null,
  "menu": null,
  "table": null,
  "multi_select": null,
  "board": null,
};

const components = Object.fromEntries(Object.keys(types).map(name => {
  const pascalName = snakeToPascal(name);
  return [`UserView${pascalName}`, () => import(`@/components/views/${pascalName}.vue`)];
}));

const userView = namespace("userView");
const staging = namespace("staging");
const query = namespace("query");

const userViewType = (uv: CombinedUserView) => {
  if (!("type" in uv.attributes)) {
    return "Table";
  }

  const typeAttr = String(uv.attributes["type"]);

  if (typeAttr in types) {
    return snakeToPascal(typeAttr);
  } else {
    return "Table";
  }
};

const maxLevel = 4;

/* This is enclosing component, which runs Vuex actions to load actual user view data, manages lifetime of
 * user views themselves etc. For instance, it ensures smooth reloading of components when user view data is
 * reloaded.
 *
 * Current user view component lifetime can be summarized as:
 *   1. UserView component is created, `updateUserView()` is called.
 *   2. `updateUserView()` ensures that the data is loaded, then loads needed user view component based on `type` uv attribute.
 *   3. If local user view data (`LocalUserView` objects) is used for this user view type, we construct it and subscribe
 *      for data changes.
 *   4. We swap old user view and local user view with the old one.
 *   5. When user view is deconstructed, we unsubscribe LocalUserView. We may also keep it and pass along when current
 *      user view is reloaded. In this case, old data is used to restore as much old state as possible (for example, keep
 *      selected table rows selected when the table is reloaded, even when new rows were added).
 */
@Component({components: {
  UserViewCommon,
  ProgressBar,
  ...components
}})
export default class UserView extends Vue {
  @userView.State("current") currentUvs!: CurrentUserViews;
  @userView.Mutation("removeUserViewConsumer") removeUserViewConsumer!: (args: { args: IUserViewArguments; reference: ReferenceName }) => void;
  @userView.Mutation("registerHandler") registerHandler!: (args: { args: IUserViewArguments; handler: IUserViewEventHandler }) => void;
  @userView.Mutation("unregisterHandler") unregisterHandler!: (args: { args: IUserViewArguments; handler: IUserViewEventHandler }) => void;
  @userView.Action("getUserView") getUserView!: (args: { args: IUserViewArguments; root: boolean; reference: ReferenceName }) => Promise<CombinedUserView>;
  @staging.State("currentSubmit") submitPromise!: Promise<CombinedTransactionResult[]> | null;
  @query.State("current") query!: ICurrentQuery | null;

  @Prop({ type: Object, required: true }) args!: IUserViewArguments;
  @Prop({ type: Boolean, default: false }) isRoot!: boolean;
  @Prop({ type: Boolean, default: false }) isTopLevel!: boolean;
  @Prop({ type: String, required: true }) scope!: ScopeName;
  @Prop({ type: Number, default: 0 }) level!: number;
  @Prop({ type: Array, default: () => [] }) filter!: string[];
  @Prop({ type: Object, default: () => ({}) }) defaultValues!: Record<string, any>;
  // Use this user view to select and return an entry.
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
  @Prop({ type: String }) backgroundColor!: string;

  private extraActions: Action[] = [];
  private extraCommonActions: Action[] = [];
  private component: IUserViewConstructor<Vue> | null = null;
  private local: IHandlerProvider | null = null;
  private baseLocal: LocalBaseUserView | null = null;
  // currentUv is shown while new component for uv is loaded.
  private currentUv: CombinedUserView | UserViewError | null = null;
  private waitReload = false;

  get title() {
    if (this.currentUv instanceof CombinedUserView && this.currentUv.attributes.hasOwnProperty('title'))
      return this.currentUv.attributes.title;
    if (this.args.source.type === "named")
      return this.args.source.ref.name;

    return this.$t("anonymous_query").toString();
  }

  get newUv() {
    if (this.level >= maxLevel) {
      return new UserViewError("execution", "Too many levels of nested user views", this.args);
    } else {
      const ret = this.currentUvs.getUserViewOrError(this.args);
      return ret === undefined ? null : ret;
    }
  }

  get uvIsReady() {
    return this.currentUv instanceof CombinedUserView && this.component !== null;
  }

  get actions() {
    const actions = [...this.extraCommonActions, ...this.extraActions];
    if (this.currentUv === null) {
      return actions;
    }
    if (this.currentUv.args.source.type === "named") {
      const editQuery: IQuery = {
        defaultValues: {},
        args: {
          source: {
            type: "named",
            ref: {
              schema: funappSchema,
              name: "user_view_by_name",
            },
          },
          args: {
            schema: this.currentUv.args.source.ref.schema,
            name: this.currentUv.args.source.ref.name,
          },
        },
        search: "",
      };
      actions.push({ name: this.$t("edit_view").toString(), query: editQuery });
    }
    if (!this.isTopLevel) {
      const gotoQuery: IQuery = {
        defaultValues: this.defaultValues,
        args: this.currentUv.args,
        search: "",
      };
      actions.push({ name: this.$t("open_as_top_level").toString(), query: gotoQuery });
    }
    return actions;
  }

  get userViewType() {
    if (this.currentUv instanceof CombinedUserView) {
      return userViewType(this.currentUv);
    } else {
      return null;
    }
  }

  get errorMessage() {
    if (!(this.currentUv instanceof UserViewError)) {
      return null;
    } else {
      if (this.currentUv.type === "access_denied") {
        return this.$t("forbidden");
      } else if (this.currentUv.type === "not_found") {
        return this.$t("not_found");
      } else if (this.currentUv.type === "arguments") {
        return this.$t("bad_request", { msg: this.currentUv.message });
      } else {
        return this.$t("unknown_error", { msg: this.currentUv.message });
      }
    }
  }

  get isLoadingUv(): boolean {
    return this.newUv === null || this.currentUv === null || !deepEquals(this.newUv.args, this.currentUv.args);
  }

  // Load new user view and replace old data. We keep old user view loaded as long as possible, to avoid "loading" placeholders.
  @Watch("newUv", { immediate: true })
  private async updateUserView() {
    const newUv = this.newUv;
    if (newUv !== null && newUv === this.currentUv) {
      return;
    }

    if (newUv instanceof CombinedUserView) {
      if (newUv.rows === null && newUv.info.mainEntity === null) {
        this.setUvError(new UserViewError("execution", "Creation mode requires main entity to be specified", newUv.args));
        return;
      }
      const newType = userViewType(newUv);
      const component: IUserViewConstructor<Vue> = (await import(`@/components/views/${newType}.vue`)).default;
      // Check we weren't restarted.
      if (newUv !== this.currentUvs.getUserViewOrError(this.args)) {
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

      this.clearState();
      this.currentUv = newUv;
      this.local = local;
      this.baseLocal = new LocalBaseUserView(this.$store, newUv, this.defaultValues, this.baseLocal);
      if(this.baseLocal !== null) {
        this.registerHandler({ args: newUv.args, handler: this.baseLocal.handler });
      }
      this.component = component;
    } else if (newUv instanceof UserViewError) {
      this.clearState();
      this.currentUv = newUv;
      this.local = null;
      this.baseLocal = null;
      this.component = null;
    } else if (newUv === null) {
      await this.requestView();
    }
  }

  private clearState() {
    this.extraActions = [];
    this.extraCommonActions = [];
    this.$emit("update:statusLine", "");
    this.$emit("update:enableFilter", false);
    this.$emit("update:bodyStyle", "");
  }

  // We should request a view:
  // * when arguments change (different view selected);
  // * when current view is `null` (view is not yet requested).
  private async requestView() {
    if (!this.waitReload) {
      await this.getUserView({ args: this.args, root: this.isRoot, reference: this.uid });
    }
  }

  @Watch("waitReload")
  private async reloadWhenUnblocked(newValue: boolean, oldValue: boolean) {
    if (oldValue && !newValue) {
      await this.requestView();
    }
  }

  private destroyUserView(args: IUserViewArguments) {
    if (this.local !== null) {
      this.unregisterHandler({ args, handler: this.local.handler });
    }
    if (this.baseLocal !== null) {
      this.unregisterHandler({ args, handler: this.baseLocal.handler });
    }
    this.removeUserViewConsumer({ args, reference: this.uid });
  }

  private setUvError(error: UserViewError) {
    this.destroyUserView(this.args);
    this.currentUv = error;
    this.local = null;
    this.baseLocal = null;
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
  private async argsChanged(newArgs: IUserViewArguments, oldArgs: IUserViewArguments) {
    if (!deepEquals(oldArgs, newArgs)) {
      this.destroyUserView(oldArgs);
      await this.requestView();
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
        this.waitReload = true;
        try {
          ret = await submitPromise;
        } catch (e) {
          this.waitReload = false;
          return;
        }

        if (!deepEquals(this.args, currentUv.args)) {
          // We went somewhere else meanwhile.
          this.waitReload = false;
          return;
        }

        const createOp = ret.find(x => x.type === "insert" && equalEntityRef(x.entity, currentUv.info.mainEntity!));
        if (createOp === undefined) {
          this.waitReload = false;
          return;
        }
        const id = (createOp as ICombinedInsertEntityResult).id;
        if (id != null && this.selectionMode) {
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
            search: "",
          };
          this.$emit("goto", newQuery);
        }
        this.waitReload = false;
      })();
    }
  }
}
</script>
