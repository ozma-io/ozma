<i18n>
    {
        "en": {
            "loading": "Now loading",
            "forbidden": "Sorry, you are not authorized to use this user view. Contact your administrator.",
            "no_instance": "Instance not found.",
            "not_found": "User view not found.",
            "bad_request": "User view request error: {msg}",
            "unknown_error": "Unknown user view fetch error: {msg}",
            "anonymous_query": "(anonymous query)",
            "edit_view": "Edit user view",
            "new_mode_no_main": "FOR INSERT INTO clause is required for new entry mode.",
            "link_to_nowhere": "This user view was a link which didn't replace it, so there's nothing to show."
        },
        "ru": {
            "loading": "Загрузка данных",
            "forbidden": "К сожалению у вас нет прав доступа для просмотра этого представления. Свяжитесь с администратором.",
            "no_instance": "База не найдена.",
            "not_found": "Представление не найдено.",
            "bad_request": "Неверный запрос для этого представления: {msg}",
            "unknown_error": "Неизвестная ошибка загрузки представления: {msg}",
            "anonymous_query": "(анонимный запрос)",
            "edit_view": "Редактировать представление",
            "new_mode_no_main": "Для режима создания новой записи должна использоваться конструкция FOR INSERT INTO.",
            "link_to_nowhere": "Это отображение являлось ссылкой, которая его не заменила. Теперь здесь нечего показать."
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
    <template v-if="state.state === 'show'">
      <UserViewCommon
        :uv="state.uv"
        :is-root="isRoot"
        :is-top-level="isTopLevel"
        :filter="filter"
        :local="state.local"
        :base-local="state.baseLocal"
        :scope="scope"
        :level="level"
        :selection-mode="selectionMode"
        :default-values="defaultValues"
        @update:actions="extraCommonActions = $event"
        @update:panelButtons="panelButtons = $event"
      />
      <component
        :is="`UserView${state.componentName}`"
        ref="userViewRef"
        :uv="state.uv"
        :is-root="isRoot"
        :is-top-level="isTopLevel"
        :filter="filter"
        :local="state.local"
        :base-local="state.baseLocal"
        :scope="scope"
        :level="level"
        :selection-mode="selectionMode"
        :default-values="defaultValues"
        @goto="$emit('goto', $event)"
        @select="$emit('select', $event)"
        @update:actions="extraActions = $event"
        @update:statusLine="$emit('update:statusLine', $event)"
        @update:enableFilter="$emit('update:enableFilter', $event)"
        @update:bodyStyle="$emit('update:bodyStyle', $event)"
      />
    </template>
    <div
      v-else-if="state.state === 'error'"
    >
      {{ state.message }}
    </div>
    <div
      v-else
      class="loading-container h-100 p-3 d-flex justify-content-center align-items-center"
      style="background-color: rgba(0, 0, 0, 0.05); cursor: wait;"
    >
      <div
        class="spinner-border"
        style="width: 3em; height: 3em; border-color: rgba(0, 0, 0, 0.5); border-right-color: transparent;"
      />
    </div>
  </span>
</template>

<script lang="ts">
import { VueConstructor } from "vue";
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { Store } from "vuex";

import { RecordSet, ReferenceName, deepEquals, snakeToPascal, deepClone, waitTimeout } from "@/utils";
import { funappSchema } from "@/api";
import { equalEntityRef } from "@/values";
import type { IUserViewArguments, IUserViewEventHandler, IUserViewState } from "@/state/user_view";
import { CombinedUserView, UserViewError, CurrentUserViews, homeSchema, UserViewResult } from "@/state/user_view";
import { CurrentAuth } from "@/state/auth";
import type { CombinedTransactionResult, ICombinedInsertEntityResult, ScopeName } from "@/state/staging_changes";
import { ICurrentQuery, queryLocation, IQuery, IAttrToQueryOpts } from "@/state/query";
import { IUserViewConstructor } from "@/components";
import { IHandlerProvider } from "@/local_user_view";
import { Action } from "@/components/ActionsMenu.vue";
import { ISelectionRef, LocalBaseUserView } from "@/components/BaseUserView";
import UserViewCommon from "@/components/UserViewCommon.vue";
import { IPanelButton } from "@/components/ButtonsPanel.vue";
import { addLinkDefaultArgs, attrToLink, Link, linkHandler } from "@/links";

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

interface UserViewComponent {
  type: "component",
  component: string,
}

interface UserViewLink {
  type: "link",
  link: Link,
}

type UserViewType = UserViewComponent | UserViewLink;

const userViewType = (uv: CombinedUserView): UserViewType => {
  const typeAttr = uv.attributes["type"];

  if (typeof typeAttr === "string") {
    const component = typeAttr in types ? snakeToPascal(typeAttr) : "Table";
    return { type: "component", component };
  } else if (typeof typeAttr === "object" && typeAttr !== null) {
    const obj = typeAttr as Record<string, unknown>;
    const link = attrToLink(obj["link"], { defaultTarget: "root" });
    if (link !== null) {
      return { type: "link", link };
    }
  }

  return { type: "component", component: "Table" };
};

interface IUserViewShow {
  state: "show";
  componentName: string;
  uv: CombinedUserView;
  component: IUserViewConstructor<Vue> | null;
  local: IHandlerProvider | null;
  baseLocal: LocalBaseUserView;
}

interface IUserViewLoading {
  state: "loading";
}

interface IUserViewError {
  state: "error";
  args: IUserViewArguments;
  message: string;
}

type UserViewLoadingState = IUserViewShow | IUserViewLoading | IUserViewError;

const maxLevel = 4;

const loadingState: IUserViewLoading = { state: "loading" };

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
@Component({ components: {
  UserViewCommon,
  ...components,
} })
export default class UserView extends Vue {
  @userView.State("current") currentUvs!: CurrentUserViews;
  @userView.Mutation("addUserViewConsumer") addUserViewConsumer!: (args: { args: IUserViewArguments; reference: ReferenceName }) => void;
  @userView.Mutation("removeUserViewConsumer") removeUserViewConsumer!: (args: { args: IUserViewArguments; reference: ReferenceName }) => void;
  @userView.Mutation("registerHandler") registerHandler!: (args: { args: IUserViewArguments; handler: IUserViewEventHandler }) => void;
  @userView.Mutation("unregisterHandler") unregisterHandler!: (args: { args: IUserViewArguments; handler: IUserViewEventHandler }) => void;
  @userView.Action("getUserView") getUserView!: (args: { args: IUserViewArguments; reference: ReferenceName }) => Promise<CombinedUserView>;
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

  private panelButtons: IPanelButton[] = [];
  private extraActions: Action[] = [];
  private extraCommonActions: Action[] = [];
  // Old user view is shown while new component for uv is loaded.
  private state: UserViewLoadingState = loadingState;
  private pendingArgs: IUserViewArguments | null = null;

  get title() {
    if (this.state.state === "show" && "title" in this.state.uv.attributes) {
      return this.state.uv.attributes["title"];
    } else if (this.args.source.type === "named") {
      return this.args.source.ref.name;
    } else {
      return this.$t("anonymous_query").toString();
    }
  }

  get newUv() {
    if (this.level >= maxLevel) {
      return new UserViewError("execution", "Too many levels of nested user views", this.args);
    } else {
      const ret = this.currentUvs.userViews.get(this.args);
      return ret === undefined ? null : ret;
    }
  }

  get actions() {
    const actions = [...this.extraCommonActions, ...this.extraActions];

    if (this.state.state === "error" || (this.state.state === "show" && !this.state.uv.attributes["hide_default_actions"])) {
      const args = this.state.state === "show" ? this.state.uv.args : this.state.args;
      if (args.source.type === "named") {
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
              schema: args.source.ref.schema,
              name: args.source.ref.name,
            },
          },
          search: "",
        };

        actions.push({
          icon: "code",
          name: this.$t("edit_view").toString(),
          link: { query: editQuery, target: "modal-auto" },
        });
      }
    }

    return actions;
  }

  @Watch("panelButtons", { deep: true, immediate: true })
  private pushPanelButtons() {
    this.$emit("update:panelButtons", this.panelButtons);
  }

  // Load new user view and replace old data. We keep old user view loaded as long as possible, to avoid "loading" placeholders.
  @Watch("newUv", { immediate: true })
  private async awaitUserView(newUv: CombinedUserView | UserViewError | Promise<UserViewResult> | null) {
    if (newUv !== null && this.state.state === "show" && newUv === this.state.uv) {
      return;
    }

    if (newUv instanceof CombinedUserView) {
      if (newUv.rows === null && newUv.info.mainEntity === null) {
        this.setState({ state: "error", args: newUv.args, message: this.$t("new_mode_no_main").toString() });
        return;
      }
      if (this.state.state === "error") {
        this.destroyCurrentUserView();
      }

      const newType = userViewType(newUv);
      if (newType.type === "component") {
        const component: IUserViewConstructor<Vue> = (await import(`@/components/views/${newType.component}.vue`)).default;
        // Check we weren't restarted.
        if (!deepEquals(newUv.args, this.args) || newUv !== this.currentUvs.getUserViewOrError(newUv.args)) {
          return;
        }

        // Exceptions in async watchers are silently ignored (?), so print it explicitly.
        let local: IHandlerProvider | null;
        if (component.localConstructor !== undefined) {
          const givenLocal = this.state.state === "show" && this.state.componentName === newType.component ? this.state.local : null;
          local = component.localConstructor(this.$store, newUv, this.defaultValues, givenLocal);
          this.registerHandler({ args: newUv.args, handler: local.handler });
        } else {
          local = null;
        }
        const baseLocal = new LocalBaseUserView(this.$store, newUv, this.defaultValues, this.state.state === "show" ? this.state.baseLocal : null);
        this.registerHandler({ args: newUv.args, handler: baseLocal.handler });

        this.setState({
          state: "show",
          local,
          baseLocal,
          componentName: newType.component,
          component,
          uv: newUv,
        });

        this.scrollToTop();
      } else if (newType.type === "link") {
        const handler = linkHandler(this.$store, (...args) => this.$emit(...args), newType.link);
        await handler.handler();
        // Because we need router to switch URL.
        await this.$nextTick();
        if (deepEquals(newUv.args, this.args) && newUv === this.currentUvs.getUserViewOrError(newUv.args)) {
          this.setState({
            state: "error",
            args: newUv.args,
            message: this.$t("link_to_nowhere").toString(),
          });
        }
      } else {
        throw new Error("Impossible");
      }
    } else if (newUv instanceof UserViewError) {
      this.setState({
        state: "error",
        args: newUv.args,
        message: this.uvErrorMessage(newUv),
      });
    } else if (newUv === null) {
      if (this.state.state === "error") {
        this.destroyCurrentUserView();
      }
      // We need deep clone here as args may change, and getUserView expects them freezed.
      void this.getUserView({ args: deepClone(this.args), reference: this.uid });
    }
  }

  private scrollToTop() {
    (this.$refs.userViewRef as Vue)?.$el.scrollTo(0, 0);
  }

  private destroyCurrentUserView() {
    if (this.state.state !== "show") {
      return;
    }

    const args = this.state.uv.args;
    if (this.state.local !== null) {
      this.unregisterHandler({ args, handler: this.state.local.handler });
    }
    this.unregisterHandler({ args, handler: this.state.baseLocal.handler });

    this.state = loadingState;
    this.extraActions = [];
    this.extraCommonActions = [];
    this.$emit("update:statusLine", "");
    this.$emit("update:enableFilter", false);
    this.$emit("update:bodyStyle", "");
  }

  private setState(state: UserViewLoadingState) {
    this.destroyCurrentUserView();
    this.state = state;
  }

  private uvErrorMessage(uv: UserViewError): string {
    if (uv.type === "access_denied") {
      return this.$t("forbidden").toString();
    } else if (uv.type === "no_instance") {
      return this.$t("no_instance").toString();
    } else if (uv.type === "not_found") {
      return this.$t("not_found").toString();
    } else if (uv.type === "arguments" || uv.type === "request") {
      return this.$t("bad_request", { msg: uv.message }).toString();
    } else {
      return this.$t("unknown_error", { msg: uv.message }).toString();
    }
  }

  @Watch("actions", { deep: true, immediate: true })
  private pushActions() {
    this.$emit("update:actions", this.actions);
  }

  private destroyed() {
    this.destroyCurrentUserView();
    if (this.pendingArgs !== null) {
      this.removeUserViewConsumer({ args: this.pendingArgs, reference: this.uid });
    }
  }

  @Watch("args", { deep: true, immediate: true })
  private argsChanged(newArgs: IUserViewArguments) {
    const newPendingArgs = deepClone(newArgs);
    if (this.newUv === null) {
      // We need deep clone here as args may change, and getUserView expects them freezed.
      void this.getUserView({ args: newPendingArgs, reference: this.uid });
    }

    const oldPendingArgs = this.pendingArgs;
    this.pendingArgs = newPendingArgs;
    if (oldPendingArgs !== null && !deepEquals(oldPendingArgs, newArgs)) {
      this.removeUserViewConsumer({ args: oldPendingArgs, reference: this.uid });
    }
  }

  @Watch("title", { immediate: true })
  private updateTitle() {
    this.$emit("update:title", this.title);
  }

  @Watch("submitPromise", { immediate: true })
  private changesSubmitted(submitPromise: Promise<CombinedTransactionResult[]> | null) {
    if (this.state.state !== "show" || this.state.uv.rows !== null || submitPromise === null) {
      return;
    }
    const uv = this.state.uv;

    void (async () => {
      let ret: CombinedTransactionResult[];
      try {
        ret = await submitPromise;
      } catch (e) {
        return;
      }

      if (!deepEquals(this.args, uv.args)) {
        // We went somewhere else meanwhile.
        return;
      }

      const createOp = ret.find(x => x.type === "insert" && equalEntityRef(x.entity, uv.info.mainEntity!));
      if (createOp === undefined) {
        return;
      }
      const id = (createOp as ICombinedInsertEntityResult).id;
      const customLink = attrToLink(uv.attributes["post_create_link"], { defaultTarget: "root" });
      let link: Link;
      if (customLink === null) {
        link = {
          query: {
            defaultValues: {},
            args: { source: uv.args.source, args: { id } },
            search: "",
          },
          target: "root",
        };
      } else {
        addLinkDefaultArgs(customLink, { id });
        link = customLink;
      }
      void linkHandler(this.$store, (...args) => this.$emit(...args), link).handler();
    })();
  }
}
</script>
