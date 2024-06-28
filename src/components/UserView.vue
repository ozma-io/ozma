<i18n>
    {
        "en": {
            "edit_form": "Edit form",
            "edit_menu": "Edit menu",
            "edit_table": "Edit table",
            "edit_multi_select": "Edit multiselect",
            "edit_board": "Edit board",
            "edit_timeline": "Edit timeline",
            "edit_cancel": "Close",
            "edit_user_view": "Edit user view",
            "show_argument_editor": "Show filters",
            "loading": "Now loading",
            "forbidden": "Sorry, you are not authorized to use this user view. Contact your administrator.",
            "creation_not_available": "FOR INSERT INTO clause is required for new entry mode.",
            "no_instance": "Instance not found.",
            "bad_request": "User view request error: {msg}",
            "unknown_error": "Unknown user view fetch error: {msg}",
            "anonymous_query": "(anonymous query)",
            "edit_view": "Edit",
            "invalid_user_view_link": "User view link is invalid.",
            "user_view_loop": "User view loop is detected.",
            "edit_view_modal_text_common": "To edit this view contact your integrator using links below.",
            "edit_view_modal_text_for_roots": "If you feel comfortable editing view source code by yourself, press button below to open the editor. This confirmation is skipped when development mode is enabled (in top left menu). Read more on editing user views:",
            "open_editor": "Open editor"
        },
        "ru": {
            "edit_form": "Редактировать форму",
            "edit_menu": "Редактировать меню",
            "edit_table": "Редактировать таблицу",
            "edit_multi_select": "Редактировать мультиселект",
            "edit_board": "Редактировать доску",
            "edit_timeline": "Редактировать таймлайн",
            "edit_cancel": "Закрыть",
            "edit_user_view": "Редактировать пользовательское представление",
            "show_argument_editor": "Показать фильтры",
            "loading": "Загрузка данных",
            "forbidden": "К сожалению у вас нет прав доступа для просмотра этого представления. Свяжитесь с администратором.",
            "creation_not_available": "Для режима создания новой записи должна использоваться конструкция FOR INSERT INTO.",
            "no_instance": "База не найдена.",
            "bad_request": "Неверный запрос для этого представления: {msg}",
            "unknown_error": "Неизвестная ошибка загрузки представления: {msg}",
            "anonymous_query": "(анонимный запрос)",
            "edit_view": "Редактировать",
            "invalid_user_view_link": "Неверная ссылка в представлении.",
            "user_view_loop": "Обнаружен цикл из ссылок в представлениях.",
            "edit_view_modal_text_common": "Для изменения представления, обратитесь к вашему интегратору по контактам ниже.",
            "edit_view_modal_text_for_roots": "Если вы желаете самостоятельно отредактировать исходный код представления, нажмите кнопку внизу, чтобы открыть редактор. Это подтверждение не показывается, когда включён режим разработки (в верхнем левом меню). Больше информации про редактирование представлений:",
            "open_editor": "Открыть редактор"
        },
        "es": {
            "edit_form": "Editar el formulario",
            "edit_menu": "Editar el menú",
            "edit_table": "Editar la tabla",
            "edit_multi_select": "Editar la selección múltiple",
            "edit_board": "Editar el tablero",
            "edit_timeline": "Editar la línea de tiempo",
            "edit_cancel": "Cerrar",
            "edit_user_view": "Editar la vista de usuario",
            "show_argument_editor": "Mostrar los filtros",
            "loading": "Ahora está cargando",
            "forbidden": "Lo sentimos, no está autorizado para usar esta vista de usuario. Póngase en contacto con su administrador.",
            "creation_not_available": "Para INSERTAR EN la cláusula se requiere para el nuevo modo de entrada.",
            "no_instance": "La instancia no está encontrada.",
            "not_found": "No se encontró la vista de usuario.",
            "bad_request": "El error de solicitud de vista de usuario: {msg}",
            "unknown_error": "El error de recuperación de vista de usuario desconocido: {msg}",
            "anonymous_query": "(La consulta anónima)",
            "edit_view": "Editar",
            "invalid_user_view_link": "El enlace de vista de usuario no es válido.",
            "user_view_loop": "Se detecta un bucle de vista de usuario.",
            "edit_view_modal_text_common": "Para editar esta vista, póngase en contacto con su integrador mediante los enlaces que aparecen a continuación.",
            "edit_view_modal_text_for_roots": "Si se siente cómodo editando el código fuente de la vista usted mismo, presione el botón de abajo para abrir el editor. Esta confirmación se omite cuando el modo de desarrollo está habilitado (en el menú superior izquierdo). Más información sobre la edición de vistas de usuario:",
            "open_editor": "Abrir el editor"
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
  <div class="userview-wrapper">
    <b-modal
      :id="$id('business_mode_edit_view')"
      lazy
      centered
      ok-variant="danger"
    >
      <div>
        {{ businessModeEditViewText }}
        <a v-if="userIsRoot" href="https://wiki.ozma.io" target="_blank">
          wiki
        </a>
        <br />
        <a
          v-if="settings.communicationLinks.telegram"
          :href="settings.communicationLinks.telegram"
          target="_blank"
        >
          Telegram
        </a>
        <br />
        <a
          v-if="settings.communicationLinks.whatsapp"
          :href="settings.communicationLinks.whatsapp"
          target="_blank"
        >
          WhatsApp
        </a>
        <br />
        <a
          v-if="settings.communicationLinks.email"
          :href="'mailto:' + settings.communicationLinks.email"
          target="_blank"
        >
          E-mail
        </a>
      </div>

      <template #modal-footer="{ cancel }">
        <b-button variant="outline-secondary" @click="cancel()">
          {{ $t('edit_cancel') }}
        </b-button>

        <ButtonItem
          v-if="enableDeveloperModeButton"
          :button="enableDeveloperModeButton"
        />
      </template>
    </b-modal>

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
        @load-all-chunks-limitless="loadAllChunksLimitless"
        @update:buttons="uvCommonButtons = $event"
      />

      <!-- We don't use FunOverlay anymore basically but we need it for `infinite-wrapper`,
        just <div> doesn't work somehow (in nested views).
        TODO: Remove FunOverlay and do it another way -->
      <FunOverlay
        ref="overlayRef"
        :show="false"
        :infinite-wrapper="inContainer"
      >
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
            @update:enable-filter="$emit('update:enable-filter', $event)"
            @update:current-page="$emit('update:current-page', $event)"
            @update:body-style="$emit('update:body-style', $event)"
            @load-next-chunk="loadNextChunk"
            @load-all-chunks="loadAllChunks"
            @load-entries="loadEntries"
            @load-entries-with-remote-search="loadEntriesWithRemoteSearch"
          />
        </transition>
      </FunOverlay>
    </template>

    <Errorbox
      v-else-if="state.state === 'error' && !silentErrors"
      :class="isRoot ? 'm-2' : ''"
      :message="state.message"
    />
    <div
      v-if="
        state.state === 'loading' || (state.state === 'error' && silentErrors)
      "
      :class="[
        'loading-container',
        {
          nested: !isRoot,
        },
      ]"
    >
      <div class="loading-background">
        <div
          v-for="index in isRoot && !$isMobile ? 9 : 3"
          :key="index"
          class="loading-box"
        >
          <div class="loading-line" style="width: 30%" />
          <div class="loading-line" />
          <div class="loading-line" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from 'vue-property-decorator'
import { namespace } from 'vuex-class'
import { AttributesMap, IEntityRef, IEntriesRequestOpts } from '@ozma-io/ozmadb-js/client'

import {
  RecordSet,
  deepEquals,
  snakeToPascal,
  deepClone,
  IRef,
  waitTimeout,
  NeverError,
  mapMaybe,
} from '@/utils'
import {
  defaultVariantAttribute,
  bootstrapVariantAttribute,
} from '@/utils_colors'
import {
  equalEntityRef,
  fieldToValueType,
  serializeValue,
  valueEquals,
  valueFromRaw,
} from '@/values'
import {
  AddedRowId,
  ICombinedInsertEntityResult,
  IStagingEventHandler,
  ISubmitResult,
  StagingKey,
} from '@/state/staging_changes'
import type { ScopeName } from '@/state/staging_changes'
import { ICurrentQueryHistory, IQuery } from '@/state/query'
import { IUserViewConstructor } from '@/components'
import UserViewCommon from '@/components/UserViewCommon.vue'
import ArgumentEditor, {
  IApplyArgumentsParams,
  IArgumentEditorProps,
} from '@/components/ArgumentEditor.vue'
import ButtonItem from '@/components/buttons/ButtonItem.vue'
import FunOverlay from '@/components/FunOverlay.vue'
import type { Button } from '@/components/buttons/buttons'
import {
  addLinkDefaultArgs,
  attrToLink,
  Link,
  linkHandler,
  ILinkHandlerParams,
} from '@/links'
import type {
  ICombinedUserViewAny,
  IRowLoadState,
  IUserViewArguments,
} from '@/user_views/combined'
import { CombinedUserView } from '@/user_views/combined'
import { fetchUserViewData, UserViewError } from '@/user_views/fetch'
import { baseUserViewHandler } from '@/components/BaseUserView'
import Errorbox from '@/components/Errorbox.vue'
import { CurrentSettings, DisplayMode } from '@/state/settings'
import { rawToUserString, UserString } from '@/state/translations'

const types: RecordSet<string> = {
  form: null,
  menu: null,
  table: null,
  multi_select: null,
  board: null,
  timeline: null,
}

const components = Object.fromEntries(
  Object.keys(types).map((name) => {
    const pascalName = snakeToPascal(name)
    return [
      `UserView${pascalName}`,
      () => import(`@/components/views/${pascalName}.vue`),
    ]
  }),
)

const reload = namespace('reload')
const staging = namespace('staging')
const query = namespace('query')
const settings = namespace('settings')
const errors = namespace('errors')

interface IUserViewComponent {
  type: 'component'
  component: string
}

interface IUserViewLink {
  type: 'link'
  link: Link
}

interface IUserViewInvalid {
  type: 'invalid'
  message: string
}

type UserViewType = IUserViewComponent | IUserViewLink | IUserViewInvalid

const userViewType = (attributes: AttributesMap): UserViewType => {
  const typeAttr = attributes['type']

  if (typeof typeAttr === 'string') {
    const component = typeAttr in types ? snakeToPascal(typeAttr) : 'Table'
    return { type: 'component', component }
  } else if (typeof typeAttr === 'object' && typeAttr !== null) {
    const obj = typeAttr as Record<string, unknown>
    const link = attrToLink(obj['link'], { defaultTarget: 'root' })
    if (link !== null) {
      if (link.type !== 'href' && link.type !== 'query') {
        return { type: 'invalid', message: 'invalid_user_view_link' }
      }
      return { type: 'link', link }
    }
  }

  return { type: 'component', component: 'Table' }
}

interface IUserViewShow {
  state: 'show'
  componentName: string
  uv: ICombinedUserViewAny
  component: IUserViewConstructor<Vue> | null
  autoSaved: boolean
}

interface IUserViewLoading {
  state: 'loading'
  args: IUserViewArguments | null
}

interface IUserViewError {
  state: 'error'
  args: IUserViewArguments
  message: string
}

type UserViewLoadingState = IUserViewShow | IUserViewLoading | IUserViewError

// Check is two user views are "compatible" comparing their arguments, so that we can
// use data from the older combined user view (new rows, selected rows etc).
const argsAreCompatible = (
  a: IUserViewArguments,
  b: IUserViewArguments,
): boolean => {
  return (
    deepEquals(a.source, b.source) &&
    (a.args === null || b.args === null || deepEquals(a.args, b.args))
  )
}

const maxLevel = 4
const maxUserViewRedirects = 3

export const maxPerFetch = 50
export const fetchAllLimit = 5000
const getEagerLoadState = (): IRowLoadState => ({
  complete: true,
  perFetch: fetchAllLimit,
  fetchedRowCount: 0,
})

const loadingState: IUserViewLoading = { state: 'loading', args: null }

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
@Component({
  components: {
    UserViewCommon,
    ArgumentEditor,
    Errorbox,
    ButtonItem,
    FunOverlay,
    ...components,
  },
})
export default class UserView extends Vue {
  @reload.Mutation('setHandler') setReloadHandler!: (args: {
    key: StagingKey
    handler: () => void
  }) => void
  @reload.Mutation('removeHandler') removeReloadHandler!: (
    key: StagingKey,
  ) => void
  @staging.Mutation('setHandler') setStagingHandler!: (args: {
    key: StagingKey
    handler: IStagingEventHandler
  }) => void
  @staging.Mutation('removeHandler') removeStagingHandler!: (
    key: StagingKey,
  ) => void
  @staging.Action('resetAddedEntry') resetAddedEntry!: (args: {
    entityRef: IEntityRef
    id: AddedRowId
  }) => Promise<void>
  @staging.State('currentSubmit') submitPromise!: Promise<ISubmitResult> | null
  @query.State('current') query!: ICurrentQueryHistory | null
  @settings.State('current') settings!: CurrentSettings
  @settings.State('userIsRoot') userIsRoot!: boolean
  @settings.Getter('developmentModeEnabled') developmentModeEnabled!: boolean
  @settings.Action('setDisplayMode') setDisplayMode!: (
    mode: DisplayMode,
  ) => Promise<void>
  @errors.State('silent') silentErrors!: boolean

  @Prop({ type: Object, required: true }) args!: IUserViewArguments
  @Prop({ type: Boolean, default: false }) isRoot!: boolean
  @Prop({ type: Boolean, default: false }) isTopLevel!: boolean
  @Prop({ type: String, required: true }) scope!: ScopeName
  @Prop({ type: Number, default: 0 }) level!: number
  @Prop({ type: Array, default: () => [] }) filter!: string[]
  @Prop({ type: Object, default: () => ({}) }) defaultValues!: Record<
    string,
    unknown
  >
  // Use this user view to select and return an entry.
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean
  @Prop({ type: Boolean, default: false }) inContainer!: boolean

  private uvCommonButtons: Button[] = []
  private componentButtons: Button[] = []

  // Old user view is shown while new component for uv is loaded.
  private state: UserViewLoadingState = loadingState
  private nextUv: Promise<void> | null = null
  private userViewRedirects = 0

  protected created() {
    if (this.isRoot) {
      this.setReloadHandler({
        key: this.uid,
        handler: () => {
          void this.reload()
        },
      })
    }
  }

  destroyed() {
    if (this.state.state === 'show') {
      void this.resetAllAddedEntries(this.state.uv)
      this.removeStagingHandler(this.uid)
    }
    this.removeReloadHandler(this.uid)
    // Stop pending operations.
    this.nextUv = null
  }

  private get transitionKey() {
    return this.state.state === 'show'
      ? JSON.stringify(this.state.uv.args.source)
      : 'none'
  }

  get title(): UserString {
    if (this.state.state === 'show') {
      const titleAttr = rawToUserString(this.state.uv.attributes['title'])
      if (titleAttr) {
        return titleAttr
      }
    }

    if (this.args.source.type === 'named') {
      return this.args.source.ref.name
    } else {
      return this.$t('anonymous_query').toString()
    }
  }

  get description(): UserString | null {
    if (this.state.state === 'show') {
      const descriptionAttr = rawToUserString(
        this.state.uv.attributes['description'],
      )
      if (descriptionAttr) {
        return descriptionAttr
      }
    }
    return null
  }

  private get editViewQuery(): IQuery | null {
    if (this.state.state === 'loading') return null
    const args =
      this.state.state === 'show' ? this.state.uv.args : this.state.args
    if (args.source.type !== 'named') return null

    const schema = this.settings.editViewQuery.schema
    const name = this.settings.editViewQuery.name

    return {
      defaultValues: {},
      args: {
        source: {
          type: 'named',
          ref: {
            schema,
            name,
          },
        },
        args: {
          schema: args.source.ref.schema,
          name: args.source.ref.name,
        },
      },
      search: '',
      page: null,
    }
  }

  private get enableDeveloperModeButton(): Button | null {
    if (!this.editViewQuery) return null

    return {
      caption: this.$t('open_editor').toString(),
      variant: bootstrapVariantAttribute('primary'),
      type: 'callback',
      callback: () => {
        this.$bvModal.hide(this.$id('business_mode_edit_view'))

        const link: Link = {
          query: this.editViewQuery!,
          target: 'modal-auto',
          type: 'query',
        }
        const linkHandlerParams: ILinkHandlerParams = {
          goto: (event) => this.$emit('goto', event),
        }
        const handler = linkHandler(link, linkHandlerParams)
        void handler.handler()
      },
    }
  }

  private get businessModeEditViewText(): string {
    const common = this.$t('edit_view_modal_text_common').toString()
    const root = this.userIsRoot
      ? this.$t('edit_view_modal_text_for_roots').toString()
      : ''
    return `${common} ${root}`
  }

  get uvButtons() {
    const buttons: Button[] = []

    if (
      this.state.state === 'error' ||
      (this.state.state === 'show' &&
        !this.state.uv.attributes['hide_default_actions'])
    ) {
      const args =
        this.state.state === 'show' ? this.state.uv.args : this.state.args
      if (args.source.type === 'named') {
        const schema = this.settings.editViewQuery.schema
        const name = this.settings.editViewQuery.name

        const editQuery: IQuery = {
          defaultValues: {},
          args: {
            source: {
              type: 'named',
              ref: {
                schema,
                name,
              },
            },
            args: {
              schema: args.source.ref.schema,
              name: args.source.ref.name,
            },
          },
          search: '',
          page: null,
        }

        if (this.developmentModeEnabled) {
          buttons.push({
            icon: 'code',
            caption: this.$t('edit_view').toString(),
            variant: defaultVariantAttribute,
            link: { query: editQuery, target: 'modal-auto', type: 'query' },
            type: 'link',
          })
        } else {
          const caption = this.$t(
            this.state.state === 'show'
              ? 'edit_' + this.state.componentName.toLowerCase()
              : 'edit_view',
          ).toString()
          buttons.push({
            icon: 'edit',
            caption,
            variant: defaultVariantAttribute,
            type: 'callback',
            callback: () => {
              this.$bvModal.show(this.$id('business_mode_edit_view'))
            },
          })
        }
      }
    }
    return buttons
  }

  get allButtons() {
    return [
      ...this.uvCommonButtons,
      ...this.componentButtons,
      ...this.uvButtons,
    ]
  }

  @Watch('allButtons', { deep: true, immediate: true })
  private pushAllButtons() {
    this.$emit('update:buttons', this.allButtons)
  }

  @Watch('state', { immediate: true })
  private watchState() {
    if (this.state.state !== 'show') {
      this.$emit('update:argument-editor-props', null)
      return
    }

    const argumentEditorProps: IArgumentEditorProps = {
      userView: this.state.uv,
      applyArguments: (params) => this.applyUpdatedArguments(params),
    }
    this.$emit('update:argument-editor-props', argumentEditorProps)
  }

  // Arguments saved here if they were changed in nested userview.
  // `this.args.args` still has original arguments!
  private appliedArguments: IUserViewArguments['args'] = null

  private applyUpdatedArguments({
    defaultArguments,
    currentArguments,
  }: IApplyArgumentsParams) {
    if (this.state.state !== 'show') {
      throw new Error('Unexpected state')
    }
    const uv = this.state.uv

    const args = Object.fromEntries(
      mapMaybe(([name, rawValue]) => {
        const argInfo = uv.argumentsMap[name]
        const value = valueFromRaw(
          { fieldType: argInfo.argType, isNullable: argInfo.optional },
          rawValue,
        )

        if (value === undefined) {
          throw new Error(`Invalid value for argument "${name}"`)
        }

        const defaultValue = defaultArguments![name]
        if (
          valueEquals(fieldToValueType(argInfo.argType), defaultValue, value)
        ) {
          return undefined
        } else {
          const serialized = serializeValue(argInfo.argType, value)
          return [name, serialized]
        }
      }, Object.entries(currentArguments!)),
    )

    if (this.isRoot) {
      const linkQuery: IQuery = {
        args: {
          source: this.args.source,
          args,
        },
        defaultValues: {},
        search: '',
        page: null,
      }
      this.$emit('goto', { query: linkQuery })
    } else {
      this.appliedArguments = args
      void this.reload({ differentComponent: true })
    }
  }

  private async reloadIfRoot(autoSaved?: boolean) {
    if (this.isRoot && this.args.args !== null) {
      await this.reload({ autoSaved })
    }
  }

  private async resetAllAddedEntries(uv: ICombinedUserViewAny) {
    if (!uv.info.mainEntity) {
      return
    }

    await Promise.all(
      Object.keys(uv.newRows).map(async (rawAddedId) => {
        const addedId = Number(rawAddedId)
        await this.resetAddedEntry({
          entityRef: uv.info.mainEntity!.entity,
          id: addedId,
        })
      }),
    )
  }

  private async loadNextChunk(next?: () => void | Promise<void>) {
    if (
      this.state.state !== 'show' ||
      this.state.uv.rowLoadState === null ||
      this.state.uv.rowLoadState.complete
    )
      return

    await this.reload({ loadNextChunk: true })
    if (next) {
      await next()
    }
  }

  private async loadAllChunks(next?: () => void | Promise<void>) {
    if (
      this.state.state !== 'show' ||
      this.state.uv.rowLoadState === null ||
      this.state.uv.rowLoadState.complete
    )
      return

    await this.reload({ loadAllChunks: true })
    if (next) {
      await next()
    }
  }

  private async loadAllChunksLimitless(next?: () => void | Promise<void>) {
    if (
      this.state.state !== 'show' ||
      this.state.uv.rowLoadState === null ||
      this.state.uv.rowLoadState.complete
    )
      return

    await this.reload({ loadAllChunksLimitless: true })
    if (next) {
      await next()
    }
  }

  private async loadEntries(limit: number, next?: () => void | Promise<void>) {
    if (
      this.state.state !== 'show' ||
      this.state.uv.rowLoadState === null ||
      this.state.uv.rowLoadState.complete
    )
      return

    await this.reload({ limit })
    if (next) {
      await next()
    }
  }

  private async loadEntriesWithRemoteSearch(search: string | undefined) {
    if (this.state.state !== 'show') return

    await this.reload({ search, differentComponent: true })
  }

  private reload(
    options: {
      differentComponent?: boolean
      loadNextChunk?: boolean
      loadAllChunks?: boolean // With `fetchAllLimit`.
      loadAllChunksLimitless?: boolean // Load ALL rows.
      limit?: number
      autoSaved?: boolean
      search?: string
    } = {},
  ): Promise<void> {
    const {
      differentComponent,
      loadNextChunk,
      loadAllChunks,
      loadAllChunksLimitless,
      search,
    } = options
    const clonedArgs = deepClone(this.args)
    const args = {
      source: clonedArgs.source,
      args: this.appliedArguments ?? clonedArgs.args,
    }
    if (this.level >= maxLevel) {
      this.setState({
        state: 'error',
        args,
        message: 'Too many levels of nested user views',
      })
      return Promise.resolve()
    }

    if (this.state.state === 'error') {
      this.setState({ state: 'loading', args })
    }

    let allFetched = false
    const pending: IRef<Promise<void>> = {}
    pending.ref = (async () => {
      await waitTimeout() // Delay promise so that it gets saved to `pending` first.
      try {
        let limit: number | undefined
        if (this.state.state === 'show' && !differentComponent) {
          if (this.state.uv.rowLoadState === null) {
            limit = fetchAllLimit
            allFetched = true
          } else {
            const delta =
              (loadNextChunk ? 1 : 0) * this.state.uv.rowLoadState.perFetch
            const fetchAll =
              loadAllChunks || this.state.uv.rowLoadState.complete
            limit = loadAllChunksLimitless
              ? undefined
              : fetchAll
              ? fetchAllLimit
              : options?.limit ??
                this.state.uv.rowLoadState.fetchedRowCount + delta
          }
        } else {
          limit = maxPerFetch
        }
        const opts: IEntriesRequestOpts = { chunk: { limit, search } }
        let uvData = await fetchUserViewData(this.$store, args, opts)

        if (pending.ref !== this.nextUv) return

        if (
          uvData.rows &&
          (limit === undefined || uvData.rows.length < limit)
        ) {
          allFetched = true
        }
        const newType = userViewType(uvData.attributes)
        if (newType.type === 'component') {
          if (
            uvData.rows === null &&
            (!uvData.info.mainEntity || !uvData.info.mainEntity.forInsert)
          ) {
            this.setState({
              state: 'error',
              args,
              message: this.$t('creation_not_available').toString(),
            })
            this.nextUv = null
          }

          const component: IUserViewConstructor<Vue> = (
            await import(`@/components/views/${newType.component}.vue`)
          ).default
          // Check we weren't restarted.
          if (pending.ref !== this.nextUv) return

          const handler = component.handler ?? baseUserViewHandler

          if (!allFetched && !component.useLazyLoad) {
            uvData = await fetchUserViewData(this.$store, args)
          }

          let oldArgs: IUserViewArguments | null = null
          let oldLocal: ICombinedUserViewAny | null = null
          let rowLoadState: IRowLoadState
          const fetchedRowCount = uvData.rows?.length ?? 0
          if (this.state.state === 'show') {
            oldArgs = this.state.uv.args
            if (
              argsAreCompatible(args, this.state.uv.args) &&
              this.state.componentName === newType.component
            ) {
              oldLocal = this.state.uv

              if (oldLocal.rowLoadState) {
                rowLoadState = {
                  fetchedRowCount,
                  perFetch: oldLocal.rowLoadState.perFetch,
                  complete: uvData.complete,
                }
              }
            } else {
              void this.resetAllAddedEntries(this.state.uv)
              rowLoadState = {
                fetchedRowCount,
                perFetch: maxPerFetch,
                complete: uvData.complete,
              }
            }
          } else {
            rowLoadState = {
              fetchedRowCount,
              perFetch: maxPerFetch,
              complete: uvData.complete,
            }
          }

          rowLoadState ??= getEagerLoadState()
          const uv = new CombinedUserView({
            store: this.$store,
            defaultRawValues: this.defaultValues,
            oldLocal,
            handler,
            rowLoadState,
            ...uvData,
          })
          this.setStagingHandler({
            key: this.uid,
            handler: uv,
          })
          this.setState({
            state: 'show',
            uv,
            componentName: newType.component,
            component,
            autoSaved: options?.autoSaved ?? false,
          })
          // Don't reset argument editor state if we didn't switch user views.
          if (!oldLocal) {
            this.scrollToTop()
          }
          this.nextUv = null
        } else if (newType.type === 'link') {
          if (this.userViewRedirects >= maxUserViewRedirects) {
            this.setState({
              state: 'error',
              args,
              message: this.$t('user_view_loop').toString(),
            })
            this.nextUv = null
            return
          }
          const linkHandlerParams: ILinkHandlerParams = {
            goto: (target) => this.$emit('goto', target),
            replaceOnGoto: true,
          }
          const handler = linkHandler(newType.link, linkHandlerParams)
          this.userViewRedirects++
          void handler.handler()
        } else if (newType.type === 'invalid') {
          this.setState({
            state: 'error',
            args,
            message: this.$t(newType.message).toString(),
          })
          this.nextUv = null
        } else {
          throw new NeverError(newType)
        }
      } catch (e) {
        if (pending.ref === this.nextUv) {
          this.setState({
            state: 'error',
            args,
            message:
              e instanceof UserViewError ? this.uvErrorMessage(e) : String(e),
          })
          this.nextUv = null
        }
        throw e
      }
    })()
    this.nextUv = pending.ref
    return pending.ref
  }

  private scrollToTop() {
    ;(this.$refs.overlayRef as Vue)?.$el.scrollTo(0, 0)
  }

  private destroyCurrentUserView() {
    if (this.state.state !== 'show') {
      return
    }

    this.state = loadingState
    this.componentButtons = []
    this.$emit('update:enable-filter', false)
    this.$emit('update:body-style', '')
  }

  private setState(state: UserViewLoadingState) {
    if (state.state !== 'loading') {
      this.userViewRedirects = 0
    }

    this.destroyCurrentUserView()
    this.state = state
    if (state.state === 'show') {
      this.setStagingHandler({
        key: this.uid,
        handler: state.uv,
      })
    } else {
      this.removeStagingHandler(this.uid)
    }
  }

  private switchToDeveloperModeIfUserViewCode() {
    if (this.state.state !== 'show') return
    if (this.args.source.type !== 'named') return

    if (
      this.args.source.ref.schema === this.settings.editViewQuery.schema &&
      this.args.source.ref.name === this.settings.editViewQuery.name
    ) {
      void this.setDisplayMode('development')
    }
  }

  private uvErrorMessage(uv: UserViewError): string {
    if (uv.body.error === 'accessDenied') {
      return this.$t('forbidden').toString()
    } else if (uv.body.error === 'noInstance') {
      return this.$t('no_instance').toString()
    } else if (uv.body.error === 'request') {
      return this.$t('bad_request', { msg: uv.message }).toString()
    } else {
      return this.$t('unknown_error', { msg: uv.message }).toString()
    }
  }

  @Watch('args', { deep: true, immediate: true })
  private argsChanged() {
    void this.reload({ differentComponent: true })
  }

  @Watch('state.state', { immediate: true })
  updateIsLoading(newValue: string, oldValue: string | undefined) {
    if (newValue === oldValue) return

    this.$emit('update:is-loading', newValue === 'loading')
  }

  // FIXME: Do not changed when modal is open — only default values
  // for title and description.

  @Watch('title', { immediate: true })
  private updateTitle() {
    this.$emit('update:title', this.title)
  }

  @Watch('description', { immediate: true })
  private updateDescription() {
    this.$emit('update:description', this.description)
  }

  // Returns whether we need to reload.
  private async redirectOnInsert(
    oldUv: ICombinedUserViewAny,
    result: ISubmitResult,
  ): Promise<boolean> {
    if (
      !oldUv.info.mainEntity ||
      !oldUv.info.mainEntity.forInsert ||
      oldUv.args.args !== null
    ) {
      return false
    }

    if (!deepEquals(this.args, oldUv.args)) {
      // We went somewhere else meanwhile.
      return true
    }

    const createOps = result.results.filter(
      (x) =>
        x.type === 'insert' &&
        equalEntityRef(x.entity, oldUv.info.mainEntity!.entity),
    )
    if (createOps.length !== 1) {
      return false
    }
    const id = (createOps[0] as ICombinedInsertEntityResult).id
    const customLink = attrToLink(oldUv.attributes['post_create_link'], {
      defaultTarget: 'root',
    })
    let link: Link
    if (customLink === null) {
      link = {
        query: {
          defaultValues: {},
          args: { source: oldUv.args.source, args: { id } },
          search: '',
          page: null,
        },
        target: 'root',
        type: 'query',
      }
    } else {
      addLinkDefaultArgs(customLink, { id })
      link = customLink
    }

    try {
      const linkHandlerParams: ILinkHandlerParams = {
        goto: (target) => this.$emit('goto', target),
      }
      await linkHandler(link, linkHandlerParams).handler()
    } catch (e) {
      return false
    }
    return true
  }

  @Watch('submitPromise', { immediate: true })
  private changesSubmitted(submitPromise: Promise<ISubmitResult> | null) {
    if (this.state.state !== 'show' || submitPromise === null) {
      return
    }
    const uv = this.state.uv

    // We detect if a redirect should happen. If not, we just reload. If it does, we
    // execute it and then reload only if `args` didn't change.
    void (async () => {
      let ret: ISubmitResult
      try {
        ret = await submitPromise
      } catch (e) {
        return
      }

      if (this.isRoot && !(await this.redirectOnInsert(uv, ret))) {
        await this.reloadIfRoot(ret.autoSave)
      }
    })()
  }
}
</script>

<style lang="scss" scoped>
.userview-wrapper {
  display: flex;
  flex-direction: column;
  background-color: var(--userview-background-color);
  height: 100%;
  overflow-y: auto;
}

.loading-container {
  width: 100%;
  height: 100%;
  min-height: 100px;

  .loading-background {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.625rem;
    cursor: wait;
    background-color: var(--userview-background-color);
    padding: 2.5rem 1.7rem;
    width: 100%;
    height: 100%;

    @include mobile {
      grid-template-columns: repeat(1, minmax(0, 1fr));
      padding: 1rem;
    }
  }
  &.nested .loading-background {
    grid-template-columns: repeat(1, minmax(0, 1fr));
    padding: 0;
  }

  .loading-box {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    border-radius: 0.625rem;
    background: #fff;
    padding: 2.5rem 1.7rem;

    @include mobile {
      // height: 30%;
    }
  }

  .loading-line {
    border-radius: 1.8125rem;
    background: #efefef;
    width: 100%;
    height: 0.6875rem;
  }

  &.fade-2-leave-active {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1000;
    width: 100%;
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
  -webkit-transform: translate3d(
    0,
    0,
    0
  ); /* Fix for darked element in Safari */
  border-radius: 0.5rem;
  background-color: #000a;
  padding: 1rem;
  color: white;

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
  transform: translateY(-1rem);
  opacity: 0;
}

.userview-argument-editor-container {
  .filter-button-container {
    padding: 0.7rem;

    .filter-button {
      border-width: 0;
      border-radius: 0.25rem !important;
      background-color: transparent;
      padding: 0.2rem;
      width: fit-content;
      max-width: 100px;
      color: var(--MainTextColor);
      text-align: left;

      .filter-button-text {
        margin-left: 0.2rem !important;
      }

      &:hover {
        cursor: pointer;
        background-color: var(--default-backgroundDarker2Color) !important;
        color: var(--MainTextColor);
      }

      &:focus {
        background-color: transparent;
      }
    }
  }

  .userview-argument-editor-content {
    flex: 0 0 auto;
  }
}
</style>
