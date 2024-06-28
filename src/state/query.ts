import { Module } from 'vuex'
import { Location, Route } from 'vue-router'
import { UserViewSource, SchemaName, IUserViewRef, RowId } from '@ozma-io/ozmadb-js/client'

import { deepSyncObject, mapMaybe, deepClone } from '@/utils'
import { router } from '@/modules'
import { IUserViewArguments } from '@/user_views/combined'

export interface IQuery {
  args: IUserViewArguments
  defaultValues: Record<string, unknown>
  search: string
  page: number | null
}

export interface IAttrToQueryOpts {
  homeSchema?: SchemaName
  infoByDefault?: boolean // Whether to create new entries by default
}

export type QueryWindowKey = number

export type QueryKey = QueryWindowKey | null

export const elementQueryKey = (el: HTMLElement): QueryKey => {
  const myWindow = el.closest('[data-query-window]') as HTMLElement | null
  if (myWindow === null) {
    return null
  }
  const rawQueryWindow = myWindow.dataset['query-window']
  return Number(rawQueryWindow)
}

export const attrToRef = (
  ref: unknown,
  opts?: IAttrToQueryOpts,
): { schema: string; name: string } | null => {
  if (typeof ref !== 'object' || ref === null) {
    return null
  }
  const refObj = ref as Record<string, unknown>
  const name = refObj['name']
  const schema = refObj['schema']
  if (typeof name !== 'string') {
    return null
  }
  if (schema === undefined) {
    if (opts?.homeSchema !== undefined) {
      return { schema: opts.homeSchema, name }
    } else {
      return null
    }
  } else if (typeof schema === 'string') {
    return { schema, name }
  } else {
    return null
  }
}

export const attrToRecord = (
  rawArgs: unknown,
): Record<string, unknown> | null => {
  if (rawArgs === undefined) {
    return {}
  } else if (typeof rawArgs !== 'object') {
    return null
  } else {
    return rawArgs as Record<string, unknown> | null
  }
}

export const attrObjectToQuery = (
  linkedAttr: unknown,
  opts?: IAttrToQueryOpts,
): IQuery | null => {
  if (typeof linkedAttr !== 'object' || linkedAttr === null) {
    return null
  }
  const linkedAttrObj = linkedAttr as Record<string, unknown>
  let ref: IUserViewRef | null
  if (
    typeof linkedAttrObj['ref'] === 'object' &&
    linkedAttrObj['ref'] !== null
  ) {
    ref = attrToRef(linkedAttrObj['ref'])
  } else {
    ref = attrToRef(linkedAttrObj)
  }
  if (ref === null) {
    return null
  }

  let args: Record<string, unknown> | null
  const newAttr = linkedAttrObj['new']
  if (newAttr || (newAttr === undefined && opts?.infoByDefault)) {
    args = null
  } else {
    args = attrToRecord(linkedAttrObj['args'])
    if (args === null) {
      return null
    }
  }

  let rawDefaultValues: unknown
  if ('default_values' in linkedAttrObj) {
    rawDefaultValues = linkedAttrObj['default_values']
  } else if ('defaultValues' in linkedAttrObj) {
    rawDefaultValues = linkedAttrObj['defaultValues']
  }

  let defaultValues: Record<string, unknown>
  if (rawDefaultValues) {
    const def = attrToRecord(rawDefaultValues)
    if (def === null) {
      return null
    }
    defaultValues = def
  } else {
    defaultValues = {}
  }

  return {
    defaultValues,
    args: {
      source: {
        type: 'named',
        ref: {
          schema: ref.schema,
          name: ref.name,
        },
      },
      args,
    },
    search: '',
    page: null,
  }
}

export const attrToQuery = (
  linkedAttr: unknown,
  opts?: IAttrToQueryOpts,
): IQuery | null => {
  if (typeof linkedAttr === 'object') {
    return attrObjectToQuery(linkedAttr, opts)
  } else {
    return null
  }
}

export const addQueryDefaultArgs = (
  query: IQuery,
  args: Record<string, unknown>,
) => {
  if (query.args.args !== null) {
    query.args.args = { ...args, ...query.args.args }
  }
}

export interface IIdInfo {
  id?: RowId
}

// Set 'id' argument to the value id.
export const selfIdArgs = (
  update: IIdInfo | undefined,
): Record<string, unknown> => {
  return update ? { id: update.id } : {}
}

// Set 'id' argument to the id of the referenced value.
export const refIdArgs = (value: unknown): Record<string, unknown> => {
  const id = Number(value)
  return !Number.isNaN(id) ? { id } : {}
}

// Set 'id' argument to the value id.
export const attrToQuerySelf = (
  linkedAttr: unknown,
  update?: IIdInfo,
  opts?: IAttrToQueryOpts,
): IQuery | null => {
  const ret = attrToQuery(linkedAttr, opts)
  if (ret !== null) {
    addQueryDefaultArgs(ret, selfIdArgs(update))
  }
  return ret
}

export const attrToQueryRef = (
  linkedAttr: unknown,
  value: unknown,
  opts?: IAttrToQueryOpts,
): IQuery | null => {
  const ret = attrToQuery(linkedAttr, opts)
  if (ret !== null) {
    addQueryDefaultArgs(ret, refIdArgs(value))
  }
  return ret
}

export const queryLocation = (query: IQuery): Location => {
  if (query.args.source.type !== 'named') {
    throw new Error("Unnamed user views aren't supported now")
  }

  const search: Record<string, string> = {}
  if (query.args.args !== null) {
    Object.entries(query.args.args).forEach(([name, value]) => {
      search[name] = JSON.stringify(value)
    })
  }
  Object.entries(query.defaultValues).forEach(([name, value]) => {
    search[`__def_${name}`] = JSON.stringify(value)
  })
  if (query.search !== '') {
    search['__q'] = query.search
  }

  if (query.page !== null && query.page !== 0) {
    search['__p'] = JSON.stringify(query.page + 1)
  }

  return {
    name: query.args.args !== null ? 'view' : 'view_create',
    params: query.args.source.ref as any,
    query: search,
  }
}

let nextWindowKey: QueryWindowKey = 0
const getWindowKey = (): QueryWindowKey => {
  return nextWindowKey++
}

export interface IGenericWindow<T> {
  key: QueryWindowKey
  query: T
}

export interface IGenericCurrentQuery<T> {
  root: T
  windows: IGenericWindow<T>[]
  selectedWindow: QueryWindowKey | null
}

export type ICurrentQuery = IGenericCurrentQuery<IQuery>

interface IWindowPartialQuery {
  source?: UserViewSource
  args: Record<string, unknown> | null
  defaultValues: Record<string, unknown>
  search: string
}

const getQueryByKey = <T>(
  queries: IGenericCurrentQuery<T>,
  key: QueryKey | undefined,
): T | undefined => {
  if (key === undefined) {
    key = queries.selectedWindow
  }
  if (key === null) {
    return queries.root
  } else {
    return queries.windows.find((w) => w.key === key)?.query
  }
}

// https://github.com/microsoft/TypeScript/issues/34523
function assertCurrentQuery<T>(
  queries: IGenericCurrentQuery<T> | null,
): asserts queries is IGenericCurrentQuery<T> {
  if (!queries) {
    throw new Error('No current query')
  }
}

const fetchQueryByKey = <T>(
  queries: IGenericCurrentQuery<T> | null,
  key: QueryKey | undefined,
): T => {
  assertCurrentQuery(queries)
  const result = getQueryByKey(queries, key)
  if (result === undefined) {
    throw new Error('No window with given key')
  }
  return result
}

const setQueryByKey = <T extends object>(
  queries: IGenericCurrentQuery<T>,
  key: QueryKey | undefined,
  query: T,
) => {
  if (key === undefined) {
    key = queries.selectedWindow
  }
  if (key === null) {
    deepSyncObject(queries.root, query)
  } else {
    const window = queries.windows.find((w) => w.key === key)
    if (window === undefined) {
      queries.windows.push({ key: getWindowKey(), query })
    } else {
      deepSyncObject(window.query, query)
    }
  }
}

const removeWindow = <T>(
  queries: IGenericCurrentQuery<T>,
  key: QueryWindowKey,
) => {
  if (queries.selectedWindow === key) {
    if (queries.windows.length === 1) {
      queries.selectedWindow = null
    } else {
      let windowIndex = queries.windows.findIndex((w) => w.key === key)
      if (windowIndex === queries.windows.length - 1) {
        windowIndex -= 1
      } else {
        windowIndex += 1
      }
      queries.selectedWindow = queries.windows[windowIndex].key
    }
  }
  queries.windows = queries.windows.filter((w) => w.key !== key)
}

const rootToCurrentQuery = (
  source: UserViewSource,
  createNew: boolean,
  search: Record<string, string | (string | null)[]>,
): ICurrentQueryHistory => {
  const args: Record<string, unknown> | null = createNew ? null : {}
  const defaultValues: Record<string, unknown> = {}
  let searchString = ''
  let page: number | null = null
  const windows: Record<string, IWindowPartialQuery> = {}
  let selectedWindowId: number | null = null

  const getWindow = (id: string) => {
    let windowQuery = windows[id]
    if (windowQuery === undefined) {
      windowQuery = {
        args: {},
        defaultValues: {},
        search: '',
      }
      windows[id] = windowQuery
    }
    return windowQuery
  }

  Object.entries(search).forEach(([name, rawVal]) => {
    let val: string
    if (typeof rawVal === 'string') {
      val = rawVal
    } else if (rawVal === null) {
      val = ''
    } else {
      const filtered = rawVal.filter((x) => x !== null)
      if (filtered.length === 0) {
        return
      } else {
        val = filtered[filtered.length - 1] as string
      }
    }

    if (name === '__q') {
      searchString = val
      return
    }

    if (name === '__p') {
      page = Number(val) - 1
      if (Number.isNaN(page)) {
        page = 0
      }
      return
    }

    if (name === '__w') {
      selectedWindowId = Number(val)
      return
    }

    const defaultMatch = /^__def_(.+)$/.exec(name)
    if (defaultMatch !== null) {
      defaultValues[defaultMatch[1]] = JSON.parse(val)
      return
    }

    const windowMatch = /^__([0-9]+)$/.exec(name)
    if (windowMatch !== null) {
      const windowId = windowMatch[1]
      const refMatch = /^([^/]+)\/([^/]+)(\/new)?$/.exec(val)
      if (refMatch !== null) {
        const window = getWindow(windowId)
        if (refMatch[3] !== undefined) {
          window.args = null
        }
        window.source = {
          type: 'named',
          ref: {
            schema: refMatch[1],
            name: refMatch[2],
          },
        }
      }
      return
    }

    const windowArgMatch = /^__([0-9]+)_(.+)$/.exec(name)
    if (windowArgMatch !== null) {
      const windowId = windowArgMatch[1]
      const windowName = windowArgMatch[2]
      const window = getWindow(windowId)
      let windowArgs = window.args
      if (windowArgs === undefined) {
        windowArgs = {}
        window.args = windowArgs
      }
      if (windowArgs !== null) {
        windowArgs[windowName] = JSON.parse(val)
      }
      return
    }

    const windowSearchMatch = /^__q([0-9]+)$/.exec(name)
    if (windowSearchMatch !== null) {
      const windowId = windowSearchMatch[1]
      const window = getWindow(windowId)
      window.search = val
      return
    }

    const windowDefMatch = /^__def([0-9]+)_(.+)$/.exec(name)
    if (windowDefMatch !== null) {
      const windowId = windowDefMatch[1]
      const windowDef = windowDefMatch[2]
      const window = getWindow(windowId)
      window.defaultValues[windowDef] = JSON.parse(val)
      return
    }

    if (args !== null && !name.includes('__')) {
      try {
        args[name] = JSON.parse(val)
      } catch {
        console.warn(`Unparsed query argument: ${name}=${val}`)
      }
    }
  })

  const root = {
    args: {
      source,
      args,
    },
    defaultValues,
    search: searchString,
    page,
    previous: null,
  }

  const rawWindowsArray = mapMaybe(
    ([rawId, rawWindow]): [number, IQueryHistory] | undefined => {
      if (rawWindow.source === undefined) {
        return undefined
      }

      const id = Number(rawId)
      const query = {
        args: {
          source: rawWindow.source,
          args: rawWindow.args,
        },
        defaultValues: rawWindow.defaultValues,
        search: rawWindow.search,
        page: null,
        previous: null,
      }
      return [id, query]
    },
    Object.entries(windows),
  )
  rawWindowsArray.sort(([id1, query1], [id2, query2]) => id1 - id2)
  let selectedWindowKey: QueryWindowKey | null = null
  const windowsArray = rawWindowsArray.map(([id, query], i) => {
    const key = getWindowKey()
    if (selectedWindowId === id) {
      selectedWindowKey = key
    }
    return { key, query }
  })
  if (selectedWindowKey === null && windowsArray.length > 0) {
    selectedWindowKey = windowsArray[windowsArray.length - 1].key
  }
  return {
    root,
    windows: windowsArray,
    selectedWindow: selectedWindowKey,
  }
}

export const currentQueryLocation = (query: ICurrentQuery): Location => {
  const ret = queryLocation(query.root)
  const search = ret.query as Record<string, string>

  query.windows.forEach(({ key: windowKey, query: windowQuery }, i) => {
    const args = windowQuery.args
    if (args.source.type !== 'named') {
      throw new Error('Anonymous views are not supported')
    }
    if (args.args !== null) {
      search[`__${i}`] = `${args.source.ref.schema}/${args.source.ref.name}`
      Object.entries(args.args).forEach(([name, value]) => {
        search[`__${i}_${name}`] = JSON.stringify(value)
      })
    } else {
      search[`__${i}`] =
        args.source.ref.schema + '/' + args.source.ref.name + '/new'
    }
    Object.entries(windowQuery.defaultValues).forEach(([name, value]) => {
      search[`__def${i}_${name}`] = JSON.stringify(value)
    })
    if (windowQuery.search !== '') {
      search[`__q${i}`] = windowQuery.search
    }
    if (query.selectedWindow === windowKey) {
      search['__w'] = String(i)
    }
  })

  return ret
}

export interface IQueryHistory extends IQuery {
  previous: IQueryHistory | null
}

// We first make a shallow copy with "previous" updated, and then deep clone.
// This is because sometimes `newCurrent` is actually `IQueryHistory`, and we
// don't want to clone the whole linked list.
const pushHistory = (
  current: IQueryHistory,
  newCurrent: IQuery,
): IQueryHistory => {
  return deepClone({ ...newCurrent, previous: current })
}

const replaceHistory = (
  current: IQueryHistory,
  newCurrent: IQuery,
): IQueryHistory => {
  return deepClone({ ...newCurrent, previous: current.previous })
}

const queryWithHistory = (query: IQuery): IQueryHistory => {
  return deepClone({ ...query, previous: null })
}

export type ICurrentQueryHistory = IGenericCurrentQuery<IQueryHistory>

export interface IQueryState {
  current: ICurrentQueryHistory | null
  resetLocks: number // Used to skip resetting routes when we cause a reset by ourselves.
}

const updateCurrent = (state: IQueryState, current: ICurrentQueryHistory) => {
  if (state.current === null) {
    state.current = current
  } else {
    deepSyncObject(state.current, current)
  }
}

// While in user_view views we use this module to reduce complete page reloads.
// Route updates are parsed and existing query is granularly updated.
// We assume that $router.push/replace are never used outside of this module.
const queryModule: Module<IQueryState, {}> = {
  namespaced: true,
  state: {
    current: null,
    resetLocks: 0,
  },
  mutations: {
    resetRoute: (state, route: Route) => {
      let createNew = false
      switch (route.name) {
        case 'view':
          createNew = false
          break
        case 'view_create':
          createNew = true
          break
        default:
          state.current = null
          return
      }

      const source: UserViewSource = {
        type: 'named',
        ref: {
          schema: route.params.schema,
          name: route.params.name,
        },
      }

      const newCurrent = rootToCurrentQuery(source, createNew, route.query)
      updateCurrent(state, newCurrent)
    },
    removeResetLock: (state) => {
      state.resetLocks -= 1
    },
    push: (
      state,
      {
        query,
        key,
        replace,
      }: { query: IQuery; key?: QueryKey; replace?: boolean },
    ) => {
      if (state.current === null) {
        state.current = {
          root: queryWithHistory(query),
          windows: [],
          selectedWindow: null,
        }
      } else {
        if (key === undefined) {
          key = state.current.selectedWindow
        }

        // Special handling for the root window -- we also close all windows.
        if (key === null) {
          const newCurrent: ICurrentQueryHistory = {
            root: (replace ? replaceHistory : pushHistory)(
              state.current.root,
              query,
            ),
            windows: [],
            selectedWindow: null,
          }
          deepSyncObject(state.current, newCurrent)
        } else {
          const current = getQueryByKey(state.current, key)
          if (current === undefined) {
            if (key === null) {
              throw new Error('Impossible')
            }
            state.current.windows.push({ key, query: queryWithHistory(query) })
            state.current.selectedWindow = key
          } else {
            const updated = (replace ? replaceHistory : pushHistory)(
              current,
              query,
            )
            setQueryByKey(state.current, key, updated)
          }
        }
      }
      state.resetLocks += 1
    },
    replaceSearch: (
      state,
      { search, key }: { search: string; key?: QueryKey },
    ) => {
      const current = fetchQueryByKey(state.current, key)
      current.search = search
      state.resetLocks += 1
    },
    replacePage: (
      state,
      { page, key }: { page: number | null; key?: QueryKey },
    ) => {
      const current = fetchQueryByKey(state.current, key)
      current.page = page
      state.resetLocks += 1
    },
    goBack: (state, key: QueryKey | undefined) => {
      const current = fetchQueryByKey(state.current, key)
      if (key === undefined) {
        key = state.current!.selectedWindow
      }
      const previous = current.previous
      if (!previous) {
        if (key !== null) {
          removeWindow(state.current!, key)
        }
      } else {
        current.previous = previous.previous
        deepSyncObject(current, previous)
      }
      state.resetLocks += 1
    },
    closeWindow: (state, key: QueryWindowKey) => {
      const current = fetchQueryByKey(state.current, key)
      removeWindow(state.current!, key)
      state.resetLocks += 1
    },
    selectWindow: (state, key: QueryWindowKey) => {
      const current = fetchQueryByKey(state.current, key)
      state.current!.selectedWindow = key
      state.resetLocks += 1
    },
  },
  actions: {
    resetRoute: ({ state, commit }, route: Route) => {
      if (state.resetLocks > 0) {
        return
      }
      commit('resetRoute', route)
    },
    push: async (
      { state, commit, dispatch },
      args: { query: IQuery; key?: QueryKey; replace?: boolean },
    ) => {
      await dispatch(
        'staging/submitIfNeeded',
        { errorOnIncomplete: true },
        { root: true },
      )

      commit('push', args)
      try {
        if (args.replace) {
          await router.replace(currentQueryLocation(state.current!))
        } else {
          await router.push(currentQueryLocation(state.current!))
        }
      } finally {
        commit('removeResetLock')
      }
    },
    replaceSearch: async (
      { state, commit },
      args: { search: string; key?: QueryKey },
    ) => {
      const current = fetchQueryByKey(state.current, args.key)
      if (current.search === args.search) {
        return
      }

      commit('replaceSearch', args)
      try {
        await router.replace(currentQueryLocation(state.current!))
      } finally {
        commit('removeResetLock')
      }
    },
    replacePage: async (
      { state, commit },
      args: { page: number | null; key?: QueryKey },
    ) => {
      const current = fetchQueryByKey(state.current, args.key)
      if (current.page === args.page) {
        return
      }
      commit('replacePage', args)
      try {
        await router.replace(currentQueryLocation(state.current!))
      } finally {
        commit('removeResetLock')
      }
    },
    goBack: async ({ state, commit, dispatch }, key?: QueryKey) => {
      await dispatch(
        'staging/submitIfNeeded',
        { errorOnIncomplete: true },
        { root: true },
      )

      commit('goBack', key)
      try {
        await router.replace(currentQueryLocation(state.current!))
      } finally {
        commit('removeResetLock')
      }
    },
    addWindow: async ({ state, commit, dispatch }, query: IQuery) => {
      await dispatch(
        'staging/submitIfNeeded',
        { errorOnIncomplete: true },
        { root: true },
      )

      commit('push', { query, key: getWindowKey() })
      try {
        await router.push(currentQueryLocation(state.current!))
      } finally {
        commit('removeResetLock')
      }
    },
    closeWindow: async ({ state, commit, dispatch }, key: QueryWindowKey) => {
      await dispatch(
        'staging/submitIfNeeded',
        { errorOnIncomplete: true },
        { root: true },
      )

      commit('closeWindow', key)
      try {
        await router.replace(currentQueryLocation(state.current!))
      } finally {
        commit('removeResetLock')
      }
    },
    selectWindow: async ({ state, commit }, key: QueryWindowKey) => {
      assertCurrentQuery(state.current)
      if (state.current.selectedWindow === key) {
        return
      }

      commit('selectWindow', key)
      try {
        await router.replace(currentQueryLocation(state.current!))
      } finally {
        commit('removeResetLock')
      }
    },
  },
}

export default queryModule
