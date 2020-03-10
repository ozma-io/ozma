import { Module } from "vuex";
import Vue from "vue";

export type ErrorKey = string;

export interface IErrorsState {
    errors: Record<ErrorKey, string[]>;
}

const errorsModule: Module<IErrorsState, {}> = {
    namespaced: true,
    state: {
        errors: {},
    },
    mutations: {
        reset: state => {
            state.errors = {};
        },
        setError: (state, { key, error }: { key: ErrorKey, error: string }) => {
            Vue.set(state.errors, key, [error]);
        },
        pushError: (state, { key, error }: { key: ErrorKey, error: string }) => {
            let errors = state.errors[key];
            if (errors === undefined) {
                errors = [];
                Vue.set(state.errors, key, errors);
            }
            errors.push(error);
        },
        removeError: (state, { key, index }: { key: ErrorKey, index: number }) => {
            const errors = state.errors[key];
            if (errors === undefined) {
                return;
            }
            errors.splice(index, 1);
        },
        resetErrors: (state, key: ErrorKey) => {
            Vue.delete(state.errors, key);
        },
    },
    actions: {
        removeAuth: {
            root: true,
            handler: ({ state, commit }) => {
                Object.keys(state.errors).forEach(key => {
                    // Clear all errors _except_ auth.
                    if (key !== "auth") {
                        commit("resetErrors", key);
                    }
                });
            },
        },
    },
};

export default errorsModule;
