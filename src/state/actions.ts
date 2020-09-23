import {
  IActionRef, IActionResult, default as Api
} from "@/api";

import { IRef, convertString } from "@/utils";
import { Module } from "vuex";

const errorKey = "actions"

export interface IActionArguments {
  ref: IActionRef; 
  args: Record<string, any> | null;
}

export interface IActionResultState {
  result: IActionResult | null;
  pending: Promise<IActionResult> | null;
}

const actionsModule: Module<IActionResultState, {}> = {
  namespaced: true,
  state: {
    result: null,
    pending: null,
  },
  mutations: {
    setActionResult: (state, result: IActionResult) => {
      state.result = result;
      state.pending = null;
    },
    setPending: (state, pending: Promise<IActionResult> | null) => {
      state.pending = pending;
    },
    clearActionResult: state => {
      state.result = null,
      state.pending = null;
    },
  },
  actions: {
    setError: ({ commit }, error: string) => {
      commit("errors/setError", { key: errorKey, error }, { root: true });
      commit("setPending", null);
    },
    getActionResult: ({state, commit, dispatch}, args: IActionArguments) => {
      if( state.pending !== null) {
        return state.pending;
      }
      const pending: IRef<Promise<IActionResult>> = {};
      pending.ref = (async () => {
        try {
          const res: Promise<IActionResult> = dispatch("callProtectedApi", {
            func: Api.runAction.bind(Api),
            args: [args.ref, args.args],
          }, { root: true});
          commit("setActionResult", await res);
          await dispatch("userView/reload", undefined, { root: true });
          return res;
        } catch(e){
          if(state.pending === pending.ref) {
            dispatch("setError", e.message);
          }
          throw e;
        }
      })();
      commit("setPending", pending.ref);
      return pending.ref;
    }
  } 
}

export default actionsModule;
