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
        :scope="scope"
        :level="level"
        :selection-mode="selectionMode"
        :default-values="defaultValues"
        @goto="$emit('goto', $event)"
        @goto-previous="$emit('goto-previous')"
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
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { AttributesMap } from "ozma-api";

import { RecordSet, deepEquals, snakeToPascal, deepClone, IRef, waitTimeout } from "@/utils";
import { funappSchema } from "@/api";
import { equalEntityRef } from "@/values";
import type { AddedRowId, CombinedTransactionResult, ICombinedInsertEntityResult, IStagingEventHandler, ScopeName, StagingKey } from "@/state/staging_changes";
import { ICurrentQueryHistory, IQuery } from "@/state/query";
import { IUserViewConstructor } from "@/components";
import { Action } from "@/components/ActionsMenu.vue";
import UserViewCommon from "@/components/UserViewCommon.vue";
import { IPanelButton } from "@/components/ButtonsPanel.vue";
import { addLinkDefaultArgs, attrToLink, Link, linkHandler, ILinkHandlerParams } from "@/links";
import type { ICombinedUserViewAny, IUserViewArguments } from "@/user_views/combined";
import { CombinedUserView } from "@/user_views/combined";
import { UserViewError, fetchUserViewData } from "@/user_views/fetch";
import { baseUserViewHandler } from "@/components/BaseUserView";
import { IEntityRef } from "ozma-api/src";

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

const reload = namespace("reload");
const staging = namespace("staging");
const query = namespace("query");

interface UserViewComponent {
  type: "component";
  component: string;
}

interface UserViewLink {
  type: "link";
  link: Link;
}

type UserViewType = UserViewComponent | UserViewLink;

const userViewType = (attributes: AttributesMap): UserViewType => {
  const typeAttr = attributes["type"];

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
  uv: ICombinedUserViewAny;
  component: IUserViewConstructor<Vue> | null;
}

interface IUserViewLoading {
  state: "loading";
}

interface IUserViewError {
  state: "error";
  args: IUserViewArguments;
  message: string;
}

// Check is two user views are "compatible" comparing their arguments, so that we can
// use data from the older combined user view (new rows, selected rows etc).
const argsAreCompatible = (a: IUserViewArguments, b: IUserViewArguments): boolean => {
  return deepEquals(a.source, b.source) && (a.args === null || b.args === null || deepEquals(a.args, b.args));
};

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
  @reload.Mutation("setHandler") setReloadHandler!: (args: { key: StagingKey; handler: () => void }) => void;
  @reload.Mutation("removeHandler") removeReloadHandler!: (key: StagingKey) => void;
  @staging.Mutation("setHandler") setStagingHandler!: (args: { key: StagingKey; handler: IStagingEventHandler }) => void;
  @staging.Mutation("removeHandler") removeStagingHandler!: (key: StagingKey) => void;
  @staging.Action("resetAddedEntry") resetAddedEntry!: (args: { entityRef: IEntityRef; id: AddedRowId }) => Promise<void>;
  @staging.State("currentSubmit") submitPromise!: Promise<CombinedTransactionResult[]> | null;
  @query.State("current") query!: ICurrentQueryHistory | null;

  @Prop({ type: Object, required: true }) args!: IUserViewArguments;
  @Prop({ type: Boolean, default: false }) isRoot!: boolean;
  @Prop({ type: Boolean, default: false }) isTopLevel!: boolean;
  @Prop({ type: String, required: true }) scope!: ScopeName;
  @Prop({ type: Number, default: 0 }) level!: number;
  @Prop({ type: Array, default: () => [] }) filter!: string[];
  @Prop({ type: Object, default: () => ({}) }) defaultValues!: Record<string, unknown>;
  // Use this user view to select and return an entry.
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean;

  private panelButtons: IPanelButton[] = [];
  private extraActions: Action[] = [];
  private extraCommonActions: Action[] = [];
  // Old user view is shown while new component for uv is loaded.
  private state: UserViewLoadingState = loadingState;
  private pendingArgs: IUserViewArguments | null = null;
  private nextUv: Promise<void> | null = null;
  private inhibitReload = false;

  get title() {
    if (this.state.state === "show" && "title" in this.state.uv.attributes) {
      return String(this.state.uv.attributes["title"]);
    } else if (this.args.source.type === "named") {
      return this.args.source.ref.name;
    } else {
      return this.$t("anonymous_query").toString();
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
          link: { query: editQuery, target: "modal-auto", type: "query" },
        });
      }
    }

    return actions;
  }

  @Watch("panelButtons", { deep: true, immediate: true })
  private pushPanelButtons() {
    this.$emit("update:panelButtons", this.panelButtons);
  }

  private reloadIfRoot() {
    if (this.isRoot) {
      this.reload();
    }
  }

  @Watch("isRoot", { immediate: true })
  private handleReloadIfRoot(isRoot: boolean) {
    if (isRoot) {
      this.setReloadHandler({
        key: this.uid,
        handler: () => {
          if (!this.inhibitReload) {
            this.reload();
          }
        },
      });
    } else {
      this.removeReloadHandler(this.uid);
    }
  }

  private async resetAllAddedEntries(uv: ICombinedUserViewAny) {
    await Promise.all(Object.keys(uv.newRows).map(async rawAddedId => {
      const addedId = Number(rawAddedId);
      await this.resetAddedEntry({
        entityRef: uv.info.mainEntity!,
        id: addedId,
      });
    }));
  }

  private reload() {
    const args = deepClone(this.args);
    if (this.level >= maxLevel) {
      this.setState({
        state: "error",
        args,
        message: "Too many levels of nested user views",
      });
      return;
    }

    if (this.state.state === "error") {
      this.setState(loadingState);
    }

    const pending: IRef<Promise<void>> = {};
    pending.ref = (async () => {
      await waitTimeout(); // Delay promise so that it gets saved to `pending` first.
      try {
        const uvData = await fetchUserViewData(this.$store, args);
        const newType = userViewType(uvData.attributes);
        if (newType.type === "component") {
          const component: IUserViewConstructor<Vue> = (await import(`@/components/views/${newType.component}.vue`)).default;
          // Check we weren't restarted.
          if (pending.ref !== this.nextUv) {
            return;
          }
          const handler = component.handler ?? baseUserViewHandler;
          let oldLocal: ICombinedUserViewAny | null = null;
          if (this.state.state === "show") {
            if (argsAreCompatible(args, this.state.uv.args) && this.state.componentName === newType.component) {
              oldLocal = this.state.uv;
            } else {
              void this.resetAllAddedEntries(this.state.uv);
            }
          }
          const uv = new CombinedUserView({
            store: this.$store,
            defaultRawValues: this.defaultValues,
            oldLocal,
            handler,
            ...uvData,
          });
          this.setStagingHandler({
            key: this.uid,
            handler: uv,
          });
          this.setState({
            state: "show",
            uv,
            componentName: newType.component,
            component,
          });
          this.nextUv = null;
        } else if (newType.type === "link") {
          const linkHandlerParams: ILinkHandlerParams = {
            store: this.$store,
            goto: target => this.$emit("goto", target),
            link: newType.link,
          }
          const handler = linkHandler( linkHandlerParams );
          await handler.handler();
          // Because we need router to switch URL.
          await this.$nextTick();
          if (pending.ref === this.nextUv) {
            this.setState({
              state: "error",
              args,
              message: this.$t("link_to_nowhere").toString(),
            });
            this.nextUv = null;
          }
        } else {
          throw new Error("Impossible");
        }
      } catch (e) {
        if (pending.ref === this.nextUv) {
          this.setState({
            state: "error",
            args,
            message: e instanceof UserViewError ? this.uvErrorMessage(e) : String(e),
          });
          this.nextUv = null;
        }
        throw e;
      }
    })();
    this.nextUv = pending.ref;
  }

  private scrollToTop() {
    (this.$refs.userViewRef as Vue)?.$el.scrollTo(0, 0);
  }

  private destroyCurrentUserView() {
    if (this.state.state !== "show") {
      return;
    }

    this.state = loadingState;
    this.extraActions = [];
    this.extraCommonActions = [];
    this.$emit("update:statusLine", "");
    this.$emit("update:enableFilter", false);
    this.$emit("update:bodyStyle", "");
  }

  private setState(state: UserViewLoadingState) {
    if (state.state === "show"
     && this.state.state === "show"
     && !deepEquals(this.state.uv.args, state.uv.args)
    ) {
      this.scrollToTop();
    }

    this.destroyCurrentUserView();
    this.state = state;
    if (state.state === "show") {
      this.setStagingHandler({
        key: this.uid,
        handler: state.uv,
      });
    } else {
      this.removeStagingHandler(this.uid);
    }
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
    if (this.state.state === "show") {
      void this.resetAllAddedEntries(this.state.uv);
      this.removeStagingHandler(this.uid);
    }
    this.destroyCurrentUserView();
    if (this.isRoot) {
      this.removeReloadHandler(this.uid);
    }
    this.nextUv = null;
  }

  @Watch("args", { deep: true, immediate: true })
  private argsChanged(newArgs: IUserViewArguments) {
    this.reload();
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
    this.inhibitReload = true;
    const uv = this.state.uv;

    // We detect if a redirect should happen. If not, we just reload. If it does, we
    // execute it and then reload only if `args` didn't change.
    void (async () => {
      let ret: CombinedTransactionResult[];
      try {
        try {
          ret = await submitPromise;
        } catch (e) {
          return;
        }

        if (!deepEquals(this.args, uv.args)) {
          // We went somewhere else meanwhile.
          this.reloadIfRoot();
          return;
        }

        const createOp = ret.find(x => x.type === "insert" && equalEntityRef(x.entity, uv.info.mainEntity!));
        if (createOp === undefined) {
          this.reloadIfRoot();
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
            type: "query",
          };
        } else {
          addLinkDefaultArgs(customLink, { id });
          link = customLink;
        }

        const oldArgs = deepClone(this.args);
        try {
          const linkHandlerParams: ILinkHandlerParams = {
            store: this.$store,
            goto: target => this.$emit("goto", target),
            link
          }
          await linkHandler( linkHandlerParams ).handler();
        } catch (e) {
          this.reloadIfRoot();
          return;
        }
        await this.$nextTick();
        if (deepEquals(oldArgs, this.args)) {
          this.reloadIfRoot();
        }
      } finally {
        this.inhibitReload = false;
      }
    })();
  }
}
</script>
