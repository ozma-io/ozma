import { Module } from 'vuex'
import FunDBAPI, { IEntityRef, IEntity } from '@ozma-io/ozmadb-js/client'

import { IRef, ObjectMap, waitTimeout } from '@/utils'
import { CancelledError } from '@/modules'

// For each entity contains array of all accessible entries (main fields) identified by id
export type EntityResult = IEntity | Promise<IEntity> | Error

export class CurrentEntities {
  // Entities data is both finite and small, so we don't use ObjectResourceMap here and just keep all fetched info till reload.
  entities = new ObjectMap<IEntityRef, EntityResult>()

  getEntityOrError(ref: IEntityRef) {
    const entity = this.entities.get(ref)
    if (entity === undefined || entity instanceof Promise) {
      return undefined
    } else {
      return entity
    }
  }

  getEntity(ref: IEntityRef) {
    const entity = this.getEntityOrError(ref)
    if (entity instanceof Error) {
      return undefined
    } else {
      return entity
    }
  }
}

export interface IEntitiesState {
  current: CurrentEntities
}

const entitiesModule: Module<IEntitiesState, {}> = {
  namespaced: true,
  state: {
    current: new CurrentEntities(),
  },
  mutations: {
    initEntity: (state, args: { ref: IEntityRef; entity: EntityResult }) => {
      state.current.entities.insert(args.ref, args.entity)
    },
    updateEntity: (
      state,
      { ref, entity }: { ref: IEntityRef; entity: EntityResult },
    ) => {
      state.current.entities.insert(ref, entity)
    },

    clear: (state) => {
      state.current = new CurrentEntities()
    },
  },
  actions: {
    reload: {
      root: true,
      handler: ({ commit }) => {
        commit('clear')
      },
    },

    getEntity: (
      { state, commit, dispatch },
      ref: IEntityRef,
    ): Promise<IEntity> => {
      const old = state.current.entities.get(ref)
      if (old instanceof Error) {
        return Promise.reject(old)
      } else if (old instanceof Promise) {
        return old
      } else if (old !== undefined) {
        return Promise.resolve(old)
      }

      const pending: IRef<Promise<IEntity>> = {}
      pending.ref = (async () => {
        await waitTimeout() // Delay promise so that it gets saved to `pending` first.
        try {
          const entity: IEntity = await dispatch(
            'callApi',
            {
              func: (api: FunDBAPI) => api.getEntityInfo(ref),
            },
            { root: true },
          )
          const currPending = state.current.entities.get(ref)
          if (currPending !== pending.ref) {
            throw new CancelledError(
              `Pending entity get cancelled, ref ${JSON.stringify(ref)}`,
            )
          }
          commit('updateEntity', { ref, entity })
          return entity
        } catch (e) {
          const currPending = state.current.entities.get(ref)
          if (currPending === pending.ref) {
            commit('updateEntity', { ref, entity: e })
          }
          throw e
        }
      })()
      commit('initEntity', { ref, entity: pending.ref })
      return pending.ref
    },
  },
}

export default entitiesModule
