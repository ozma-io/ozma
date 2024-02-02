import { Module } from 'vuex'
import Vue from 'vue'

export type ReloadKey = string

export interface IReloadState {
  handlers: Record<ReloadKey, () => void>
}

const reloadModule: Module<IReloadState, {}> = {
  namespaced: true,
  state: {
    handlers: {},
  },
  mutations: {
    setHandler: (
      state,
      { key, handler }: { key: ReloadKey; handler: () => void },
    ) => {
      Vue.set(state.handlers, key, handler)
    },
    removeHandler: (state, key: ReloadKey) => {
      Vue.delete(state.handlers, key)
    },
  },
  actions: {
    reload: {
      root: true,
      handler: ({ state }) => {
        Object.values(state.handlers).forEach((handler) => {
          handler()
        })
      },
    },
  },
}

export default reloadModule
