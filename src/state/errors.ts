import { Module } from "vuex";
import Vue from "vue";

export type ErrorKey = string;

export interface IErrorsState {
  errors: Record<ErrorKey, string[]>;
  silent: boolean;
}

const errorsModule: Module<IErrorsState, {}> = {
  namespaced: true,
  state: {
    errors: {},
    silent: false,
  },
  mutations: {
    reset: state => {
      state.errors = {};
    },
    setError: (state, { key, error }: { key: ErrorKey; error: string }) => {
      Vue.set(state.errors, key, [error]);
    },
    pushError: (state, { key, error }: { key: ErrorKey; error: string }) => {
      let errors = state.errors[key];
      if (errors === undefined) {
        errors = [];
        Vue.set(state.errors, key, errors);
      }
      errors.push(error);
    },
    removeError: (state, { key, index }: { key: ErrorKey; index: number }) => {
      const errors = state.errors[key];
      if (errors === undefined) {
        return;
      }
      errors.splice(index, 1);
    },
    resetErrors: (state, key: ErrorKey) => {
      Vue.delete(state.errors, key);
    },
    setSilent: (state, silent: boolean) => {
      state.silent = silent;
    },
  },
};

export default errorsModule;
