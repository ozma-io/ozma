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
            "edit_view": "Edit",
            "arguments_updated": "Apply or reset arguments changes to continue",
            "reset_updated_arguments": "Reset",
            "apply_updated_arguments": "Apply",
            "show_argument_editor": "Show filters",
            "hide_argument_editor": "Hide filters",
            "new_mode_no_main": "FOR INSERT INTO clause is required for new entry mode.",
            "invalid_user_view_link": "User view link is invalid.",
            "user_view_loop": "User view loop is detected.",
            "switch_argument_editor": "Filters"
        },
        "ru": {
            "loading": "Загрузка данных",
            "forbidden": "К сожалению у вас нет прав доступа для просмотра этого представления. Свяжитесь с администратором.",
            "no_instance": "База не найдена.",
            "not_found": "Представление не найдено.",
            "bad_request": "Неверный запрос для этого представления: {msg}",
            "unknown_error": "Неизвестная ошибка загрузки представления: {msg}",
            "anonymous_query": "(анонимный запрос)",
            "edit_view": "Редактировать",
            "arguments_updated": "Примените или сбросьте изменения аргументов, чтобы продолжить",
            "reset_updated_arguments": "Сбросить",
            "apply_updated_arguments": "Применить",
            "show_argument_editor": "Показать фильтры",
            "hide_argument_editor": "Скрыть фильтры",
            "new_mode_no_main": "Для режима создания новой записи должна использоваться конструкция FOR INSERT INTO.",
            "invalid_user_view_link": "Неверная ссылка в представлении.",
            "user_view_loop": "Обнаружен цикл из ссылок в представлениях.",
            "switch_argument_editor": "Фильтры"
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
  <div
    class="userview-wrapper"
  >
    <template
      v-if="state.state === 'show'"
    >
      <button
        v-if="showArgumentEditorButton"
        class="filter-button list-group-item list-group-item-action list-group-item-default"
        @click.prevent="showArgumentEditor = !showArgumentEditor;"
      >
        <span
          v-if="argumentEditorVisible"
          class="icon material-icons md-14"
        >
          filter_alt_off
        </span>
        <span
          v-else
          class="icon material-icons md-14"
        >
          filter_alt
        </span>
        <span
          class="filter-button-text mx-2"
        >
          {{ $t("switch_argument_editor").toString() }}
        </span>
      </button>

      <transition name="fade-move">
        <ArgumentEditor
          v-if="argumentEditorVisible"
          class="userview-argument-editor"
          :home-schema="state.uv.homeSchema"
          :argument-params="state.uv.info.arguments"
          :argument-values="currentArguments"
          @reset="resetUpdatedArguments"
          @update="updateArgument"
          @apply="applyUpdatedArguments"
        />
      </transition>

      <UserViewCommon
        :uv="state.uv"
        :is-root="isRoot"
        :is-top-level="isTopLevel"
        :filter="filter"
        :scope="scope"
        :level="level"
        :selection-mode="selectionMode"
        :default-values="defaultValues"
        @load-all-chunks-limitless="loadAllChunksLimitless"
        @update:buttons="uvCommonButtons = $event"
      />

      <!-- `z-index: 30` to work well with popups from ArgumentEditor -->
      <b-overlay
        class="userview-overlay"
        :show="argumentEditorVisible && argumentEditorHasUpdatedValues"
        variant="dark"
        opacity="0.4"
        blur="5px"
        rounded="sm"
        :z-index="30"
        :infinite-wrapper="isRoot"
      >
        <template #overlay>
          <div class="overlay-content">
            <div class="overlay-text">
              {{ $t("arguments_updated") }}
            </div>

            <div class="overlay-buttons">
              <b-button
                class="mr-3"
                variant="light"
                @click="resetUpdatedArguments"
              >
                {{ $t("reset_updated_arguments") }}
              </b-button>
              <b-button
                variant="primary"
                @click="applyUpdatedArguments"
              >
                {{ $t("apply_updated_arguments") }}
              </b-button>
            </div>
          </div>
        </template>

        <transition name="fade-1" mode="out-in">
          <component
            :is="`UserView${state.componentName}`"
            ref="userViewRef"
            :key="transitionKey"
            :uv="state.uv"
            :is-root="isRoot"
            :is-top-level="isTopLevel"
            :filter="filter"
            :scope="scope"
            :level="level"
            :selection-mode="selectionMode"
            :default-values="defaultValues"
            :auto-saved="state.autoSaved"
            @goto="$emit('goto', $event)"
            @goto-previous="$emit('goto-previous')"
            @select="$emit('select', $event)"
            @update:buttons="componentButtons = $event"
            @update:status-line="$emit('update:status-line', $event)"
            @update:enable-filter="$emit('update:enable-filter', $event)"
            @update:current-page="$emit('update:current-page', $event)"
            @update:body-style="$emit('update:body-style', $event)"
            @load-next-chunk="loadNextChunk"
            @load-all-chunks="loadAllChunks"
            @load-entries="loadEntries"
          />
        </transition>
      </b-overlay>
    </template>

    <Errorbox
      v-else-if="state.state === 'error'"
      :class="isRoot ? 'm-2' : ''"
      :message="state.message"
    />
    <transition name="fade-2">
      <div
        v-if="state.state === 'loading'"
        :class="[
          'loading-container',
          {
            'nested': !isRoot,
          }
        ]"
      >
        <div
          :class="[
            'loading-background',
            'h-100',
            'd-flex',
            'justify-content-center',
            'align-items-center',
            'rounded',
            'shadow-sm',
          ]"
        >
          <div
            class="spinner-border"
            style="width: 3em; height: 3em; border-color: var(--default-foregroundDarkerColor, rgba(0, 0, 0, 0.5)); border-right-color: transparent;"
          />
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { ArgumentName, AttributesMap, IEntityRef, IEntriesRequestOpts } from "ozma-api";

import { RecordSet, deepEquals, snakeToPascal, deepClone, IRef, waitTimeout, NeverError, mapMaybe } from "@/utils";
import { defaultVariantAttribute, bootstrapVariantAttribute } from "@/utils_colors";
import { funappSchema } from "@/api";
import { equalEntityRef, serializeValue, valueFromRaw } from "@/values";
import { AddedRowId, ICombinedInsertEntityResult, IStagingEventHandler, ISubmitResult, StagingKey } from "@/state/staging_changes";
import type { ScopeName } from "@/state/staging_changes";
import { ICurrentQueryHistory, IQuery } from "@/state/query";
import { IUserViewConstructor } from "@/components";
import UserViewCommon from "@/components/UserViewCommon.vue";
import ArgumentEditor from "@/components/ArgumentEditor.vue";
import type { Button } from "@/components/buttons/buttons";
import { addLinkDefaultArgs, attrToLink, Link, linkHandler, ILinkHandlerParams } from "@/links";
import type { ICombinedUserViewAny, IRowLoadState, IUserViewArguments } from "@/user_views/combined";
import { CombinedUserView } from "@/user_views/combined";
import { fetchUserViewData, UserViewError } from "@/user_views/fetch";
import { baseUserViewHandler } from "@/components/BaseUserView";
import Errorbox from "@/components/Errorbox.vue";
import { CurrentSettings } from "@/state/settings";

const types: RecordSet<string> = {
  "form": null,
  "menu": null,
  "table": null,
  "multi_select": null,
  "board": null,
  "timeline": null,
  "iframe": null,
};

const components = Object.fromEntries(Object.keys(types).map(name => {
  const pascalName = snakeToPascal(name);
  return [`UserView${pascalName}`, () => import(`@/components/views/${pascalName}.vue`)];
}));

const reload = namespace("reload");
const staging = namespace("staging");
const query = namespace("query");
const settings = namespace("settings");

interface IUserViewComponent {
  type: "component";
  component: string;
}

interface IUserViewLink {
  type: "link";
  link: Link;
}

interface IUserViewInvalid {
  type: "invalid";
  message: string;
}

type UserViewType = IUserViewComponent | IUserViewLink | IUserViewInvalid;

const userViewType = (attributes: AttributesMap): UserViewType => {
  const typeAttr = attributes["type"];

  if (typeof typeAttr === "string") {
    const component = typeAttr in types ? snakeToPascal(typeAttr) : "Table";
    return { type: "component", component };
  } else if (typeof typeAttr === "object" && typeAttr !== null) {
    const obj = typeAttr as Record<string, unknown>;
    const link = attrToLink(obj["link"], { defaultTarget: "root" });
    if (link !== null) {
      if (link.type !== "href" && link.type !== "query") {
        return { type: "invalid", message: "invalid_user_view_link" };
      }
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
  autoSaved: boolean;
}

interface IUserViewLoading {
  state: "loading";
  args: IUserViewArguments | null;
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
const maxUserViewRedirects = 3;

export const maxPerFetch = 50;
export const fetchAllLimit = 5000;
const getEagerLoadState = (): IRowLoadState => ({ complete: true, perFetch: fetchAllLimit, fetchedRowCount: 0 });

const loadingState: IUserViewLoading = { state: "loading", args: null };

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
  ArgumentEditor,
  Errorbox,
  ...components,
} })
export default class UserView extends Vue {
  @reload.Mutation("setHandler") setReloadHandler!: (args: { key: StagingKey; handler: () => void }) => void;
  @reload.Mutation("removeHandler") removeReloadHandler!: (key: StagingKey) => void;
  @staging.Mutation("setHandler") setStagingHandler!: (args: { key: StagingKey; handler: IStagingEventHandler }) => void;
  @staging.Mutation("removeHandler") removeStagingHandler!: (key: StagingKey) => void;
  @staging.Action("resetAddedEntry") resetAddedEntry!: (args: { entityRef: IEntityRef; id: AddedRowId }) => Promise<void>;
  @staging.State("currentSubmit") submitPromise!: Promise<ISubmitResult> | null;
  @query.State("current") query!: ICurrentQueryHistory | null;
  @settings.State("current") settings!: CurrentSettings;

  @Prop({ type: Object, required: true }) args!: IUserViewArguments;
  @Prop({ type: Boolean, default: false }) isRoot!: boolean;
  @Prop({ type: Boolean, default: false }) isTopLevel!: boolean;
  @Prop({ type: String, required: true }) scope!: ScopeName;
  @Prop({ type: Number, default: 0 }) level!: number;
  @Prop({ type: Array, default: () => [] }) filter!: string[];
  @Prop({ type: Object, default: () => ({}) }) defaultValues!: Record<string, unknown>;
  // Use this user view to select and return an entry.
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean;

  private uvCommonButtons: Button[] = [];
  private componentButtons: Button[] = [];

  // Old user view is shown while new component for uv is loaded.
  private state: UserViewLoadingState = loadingState;
  private nextUv: Promise<void> | null = null;
  private inhibitReload = false;
  private updatedArguments: Record<ArgumentName, unknown> = {};
  private showArgumentEditor = false;
  private userViewRedirects = 0;

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

  private get transitionKey() {
    return this.state.state === "show"
      ? JSON.stringify(this.state.uv.args.source)
      : "none";
  }

  private get hasArgumentEditor() {
    return this.state.state === "show" && Object.keys(this.state.uv.info.arguments).length > 0;
  }

  get title() {
    if (this.state.state === "show" && "title" in this.state.uv.attributes) {
      return String(this.state.uv.attributes["title"]);
    } else if (this.args.source.type === "named") {
      return this.args.source.ref.name;
    } else {
      return this.$t("anonymous_query").toString();
    }
  }

  private get toggleArgumentEditorButton(): Button {
    return {
      icon: "edit_note",
      caption: this.argumentEditorVisible ? this.$t("hide_argument_editor").toString() : this.$t("show_argument_editor").toString(),
      variant: this.argumentEditorVisible ? bootstrapVariantAttribute("secondary") : defaultVariantAttribute,
      callback: () => {
        this.showArgumentEditor = !this.showArgumentEditor;
      },
      type: "callback",
    };
  }

  get uvButtons() {
    const buttons: Button[] = [];

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
          page: null,
        };

        if (this.state.state === "show") {
          if (this.hasArguments) {
            buttons.push(this.toggleArgumentEditorButton);
          }
        }

        if (this.settings.userCanEditUserViews) {
          buttons.push({
            icon: "code",
            caption: this.$t("edit_view").toString(),
            variant: defaultVariantAttribute,
            link: { query: editQuery, target: "modal-auto", type: "query" },
            type: "link",
          });
        }
      }
    }
    return buttons;
  }

  private get hasArguments() {
    return this.state.state === "show" && Object.keys(this.state.uv.info.arguments).length > 0;
  }

  get allButtons() {
    return [...this.uvCommonButtons, ...this.componentButtons, ...this.uvButtons];
  }

  @Watch("allButtons", { deep: true, immediate: true })
  private pushAllButtons() {
    this.$emit("update:buttons", this.allButtons);
  }

  get initialArguments() {
    if (this.state.state !== "show") {
      return null;
    } else {
      const uv = this.state.uv;
      if (uv.args.args === null) {
        return null;
      } else {
        return Object.fromEntries(mapMaybe(([name, rawValue]) => {
          const argInfo = uv.info.arguments[name];
          if (argInfo === undefined) {
            return undefined;
          } else {
            const value = valueFromRaw({ fieldType: argInfo.argType, isNullable: argInfo.optional }, rawValue);
            return [name, value];
          }
        }, Object.entries(uv.args.args)));
      }
    }
  }

  get currentArguments() {
    if (this.initialArguments === null) {
      return null;
    } else {
      return { ...this.initialArguments, ...this.updatedArguments };
    }
  }

  private resetUpdatedArguments() {
    this.updatedArguments = {};
    this.$nextTick(() => this.applyUpdatedArguments());
  }

  private applyUpdatedArguments() {
    const args = Object.fromEntries(mapMaybe(([name, value]) => {
      if (value === undefined) {
        return undefined;
      } else {
        if (this.state.state !== "show") {
          throw new Error("Unexpected state");
        }
        const argInfo = this.state.uv.info.arguments[name];
        const serialized = serializeValue(argInfo.argType, value);
        return [name, serialized];
      }
    }, Object.entries(this.currentArguments!)));
    // TODO: In nested views this opens view in fullscreen, it's not good, but not such frequent case either, I suppose.
    const linkQuery: IQuery = {
      args: {
        source: this.args.source,
        args,
      },
      defaultValues: {},
      search: "",
      page: null,
    };
    this.$emit("goto", linkQuery);
  }

  private updateArgument(name: ArgumentName, value: unknown) {
    Vue.set(this.updatedArguments, name, value);
  }

  private async reloadIfRoot(autoSaved?: boolean) {
    if (this.isRoot) {
      await this.reload({ autoSaved });
    }
  }

  @Watch("isRoot", { immediate: true })
  private handleReloadIfRoot(isRoot: boolean) {
    if (isRoot) {
      this.setReloadHandler({
        key: this.uid,
        handler: () => {
          if (!this.inhibitReload) {
            void this.reload();
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

  private async loadNextChunk(next?: () => void | Promise<void>) {
    if (this.state.state !== "show" || this.state.uv.rowLoadState === null) return;

    await this.reload({ loadNextChunk: true });
    if (next) {
      await next();
    }
  }

  private async loadAllChunks(next?: () => void | Promise<void>) {
    if (this.state.state !== "show" || this.state.uv.rowLoadState === null) return;

    await this.reload({ loadAllChunks: true });
    if (next) {
      await next();
    }
  }

  private async loadAllChunksLimitless(next?: () => void | Promise<void>) {
    if (this.state.state !== "show" || this.state.uv.rowLoadState === null) return;

    await this.reload({ loadAllChunksLimitless: true });
    if (next) {
      await next();
    }
  }

  private async loadEntries(limit: number, next?: () => void | Promise<void>) {
    if (this.state.state !== "show" || this.state.uv.rowLoadState === null) return;

    await this.reload({ limit });
    if (next) {
      await next();
    }
  }

  private reload(options?: {
    differentComponent?: boolean;
    loadNextChunk?: boolean;
    loadAllChunks?: boolean; // With `fetchAllLimit`.
    loadAllChunksLimitless?: boolean; // Load ALL rows.
    limit?: number;
    autoSaved?: boolean;
  }): Promise<void> {
    const args = deepClone(this.args);
    if (this.level >= maxLevel) {
      this.setState({
        state: "error",
        args,
        message: "Too many levels of nested user views",
      });
      return Promise.resolve();
    }

    if (this.state.state === "error") {
      this.setState({ state: "loading", args });
    }

    let allFetched = false;
    const pending: IRef<Promise<void>> = {};
    pending.ref = (async () => {
      await waitTimeout(); // Delay promise so that it gets saved to `pending` first.
      try {
        let limit: number | undefined;
        if (this.state.state === "show" && !options?.differentComponent) {
          if (this.state.uv.rowLoadState === null) {
            limit = fetchAllLimit;
            allFetched = true;
          } else {
            const delta = (options?.loadNextChunk ? 1 : 0) * this.state.uv.rowLoadState.perFetch;
            const fetchAll = options?.loadAllChunks || this.state.uv.rowLoadState.complete;
            limit = options?.loadAllChunksLimitless
              ? undefined
              : fetchAll
                ? fetchAllLimit
                : options?.limit ?? (this.state.uv.rowLoadState.fetchedRowCount + delta);
          }
        } else {
          limit = maxPerFetch;
        }
        const opts: IEntriesRequestOpts = {
          chunk: {
            limit,
          },
        };

        let uvData = await fetchUserViewData(this.$store, args, opts);
        if (pending.ref !== this.nextUv) return;
        if (uvData.rows && (limit === undefined || uvData.rows.length < limit)) {
          allFetched = true;
        }
        const newType = userViewType(uvData.attributes);
        if (newType.type === "component") {
          const component: IUserViewConstructor<Vue> = (await import(`@/components/views/${newType.component}.vue`)).default;
          // Check we weren't restarted.

          const handler = component.handler ?? baseUserViewHandler;

          if (!allFetched && !component.useLazyLoad) {
            uvData = await fetchUserViewData(this.$store, args);
          }

          let oldLocal: ICombinedUserViewAny | null = null;
          let rowLoadState: IRowLoadState;
          const fetchedRowCount = uvData.rows?.length ?? 0;
          if (this.state.state === "show") {
            if (argsAreCompatible(args, this.state.uv.args) && this.state.componentName === newType.component) {
              oldLocal = this.state.uv;

              if (oldLocal.rowLoadState) {
                rowLoadState = {
                  fetchedRowCount,
                  perFetch: oldLocal.rowLoadState.perFetch,
                  complete: uvData.complete,
                };
              }
            } else {
              void this.resetAllAddedEntries(this.state.uv);
              rowLoadState = { fetchedRowCount, perFetch: maxPerFetch, complete: uvData.complete };
            }
          } else {
            rowLoadState = { fetchedRowCount, perFetch: maxPerFetch, complete: uvData.complete };
          }

          rowLoadState ??= getEagerLoadState();
          const uv = new CombinedUserView({
            store: this.$store,
            defaultRawValues: this.defaultValues,
            oldLocal,
            handler,
            rowLoadState,
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
            autoSaved: options?.autoSaved ?? false,
          });
          this.showArgumentEditor = Boolean(uv.attributes["show_argument_editor"]);
          this.nextUv = null;
        } else if (newType.type === "link") {
          if (this.userViewRedirects >= maxUserViewRedirects) {
            this.setState({
              state: "error",
              args,
              message: this.$t("user_view_loop").toString(),
            });
            this.nextUv = null;
            return;
          }
          const linkHandlerParams: ILinkHandlerParams = {
            store: this.$store,
            goto: target => this.$emit("goto", target),
            openQRCodeScanner: link => this.$root.$emit("open-qrcode-scanner", link),
            link: newType.link,
            replaceInsteadPush: true,
          };
          const handler = linkHandler(linkHandlerParams);
          this.userViewRedirects++;
          void handler.handler();
        } else if (newType.type === "invalid") {
          this.setState({
            state: "error",
            args,
            message: this.$t(newType.message).toString(),
          });
          this.nextUv = null;
        } else {
          throw new NeverError(newType);
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
    return pending.ref;
  }

  private scrollToTop() {
    (this.$refs.userViewRef as Vue)?.$el.scrollTo(0, 0);
  }

  private get showArgumentEditorButton() {
    return this.hasArguments && this.state.state === "show" && Boolean(this.state.uv.attributes["show_argument_button"]);
  }

  private destroyCurrentUserView() {
    if (this.state.state !== "show") {
      return;
    }

    this.state = loadingState;
    this.componentButtons = [];
    this.showArgumentEditor = false;
    this.updatedArguments = {};
    this.$emit("update:status-line", "");
    this.$emit("update:enable-filter", false);
    this.$emit("update:body-style", "");
  }

  private setState(state: UserViewLoadingState) {
    if (state.state !== "loading") {
      this.userViewRedirects = 0;
    }

    if (state.state === "show"
     && this.state.state === "show"
     && !deepEquals(this.state.uv.args, state.uv.args)
    ) {
      this.scrollToTop();
    }

    this.destroyCurrentUserView();
    this.state = state;
    if (state.state === "show") {
      this.updatedArguments = {};
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

  @Watch("args", { deep: true, immediate: true })
  private argsChanged() {
    let currentArgs: IUserViewArguments | undefined;
    if (this.state.state === "show") {
      currentArgs = this.state.uv.args;
    } else if (this.state.state === "loading" && this.state.args !== null) {
      currentArgs = this.state.args;
    } else if (this.state.state === "error") {
      currentArgs = this.state.args;
    }
    if (deepEquals(currentArgs, this.args)) {
      return;
    }
    void this.reload({ differentComponent: true });
  }

  @Watch("state.state", { immediate: true })
  updateIsLoading(newValue: string, oldValue: string) {
    if (newValue === oldValue) return;

    this.$emit("update:is-loading", newValue === "loading");
  }

  @Watch("title", { immediate: true })
  private updateTitle() {
    this.$emit("update:title", this.title);
  }

  private get argumentEditorHasUpdatedValues() {
    return Object.entries(this.updatedArguments).length > 0 && this.state.state !== "loading";
  }

  private get argumentEditorVisible() {
    return this.hasArguments && this.showArgumentEditor;
  }

  @Watch("submitPromise", { immediate: true })
  private changesSubmitted(submitPromise: Promise<ISubmitResult> | null) {
    if (this.state.state !== "show" || this.state.uv.rows !== null || submitPromise === null) {
      return;
    }
    this.inhibitReload = true;
    const uv = this.state.uv;

    // We detect if a redirect should happen. If not, we just reload. If it does, we
    // execute it and then reload only if `args` didn't change.
    void (async () => {
      try {
        let ret: ISubmitResult;
        try {
          ret = await submitPromise;
        } catch (e) {
          return;
        }

        if (!deepEquals(this.args, uv.args)) {
          // We went somewhere else meanwhile.
          await this.reloadIfRoot(ret.autoSave);
          return;
        }

        const createOp = ret.results.find(x => x.type === "insert" && equalEntityRef(x.entity, uv.info.mainEntity!));
        if (createOp === undefined) {
          await this.reloadIfRoot(ret.autoSave);
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
              page: null,
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
            openQRCodeScanner: qrLink => this.$root.$emit("open-qrcode-scanner", qrLink),
            link,
          };
          await linkHandler(linkHandlerParams).handler();
        } catch (e) {
          await this.reloadIfRoot(ret.autoSave);
          return;
        }
        await this.$nextTick();
        if (deepEquals(oldArgs, this.args)) {
          await this.reloadIfRoot(ret.autoSave);
        }
      } finally {
        this.inhibitReload = false;
      }
    })();
  }
}
</script>

<style lang="scss" scoped>
  .userview-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .userview-argument-editor {
    flex: 0 0 auto;
  }

  .userview-overlay {
    flex: 1 1;
    width: 100%;
    overflow-x: auto;
  }

  .loading-container {
    min-height: 100px;
    height: 100%;

    .loading-background {
      padding: 30px;
      background-color: var(--default-backgroundDarker2Color, rgba(240, 240, 240));
      cursor: wait;
    }

    &.fade-2-leave-active {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 1000;
      min-height: 0;

      &.nested {
        padding: 0 15px !important; /* Mimic `.col` paddings */
      }

      .spinner-border {
        opacity: 0;
        transition: opacity 0.05s;
      }
    }
  }

  .overlay-content {
    padding: 1rem;
    border-radius: 0.5rem;
    color: white;
    background-color: #000a;
    -webkit-transform: translate3d(0, 0, 0); /* Fix for darked element in Safari */

    .overlay-text {
      margin-bottom: 0.5rem;
      text-align: center;
    }

    .overlay-buttons {
      display: flex;
      flex-wrap: nowrap;
      justify-content: center;
    }
  }

  .fade-move-enter-active,
  .fade-move-leave-active {
    transition: opacity 0.4s, transform 0.4s;
  }

  .fade-move-enter,
  .fade-move-leave-to {
    opacity: 0;
    transform: translateY(-1rem);
  }

  .filter-button {
    margin-left: 10px;
    max-width: 100px;
    text-align: left;
    background-color: transparent;
    border-radius: 0.25rem !important;
    border-width: 0;
    width: fit-content;
    color: var(--MainTextColor);

    .filter-button-text {
      margin-left: 0.2rem !important;
    }

    &:hover {
      background-color: var(--default-backgroundDarker2Color) !important;
      color: var(--MainTextColor);
      cursor: pointer;
    }

    &:focus {
      background-color: transparent;
    }
  }
</style>
