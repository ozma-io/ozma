import { Module } from "vuex";

export type WindowKey = string;

export interface IWindowsState {
  stack: WindowKey[];
}

export const elementWindow = (el: HTMLElement): WindowKey => {
  const myWindow = el.closest("[data-window]") as HTMLElement | null;
  if (myWindow === null) {
    throw new Error("Can't find window for the element");
  }
  return myWindow.dataset["window"] as WindowKey;
};

// This basic window management is needed so elements that define global shortcuts or
// react to global events can detect whether they should be ignoring them, because
// another window is currently active.
const windowsModule: Module<IWindowsState, {}> = {
  namespaced: true,
  state: {
    stack: [],
  },
  mutations: {
    createWindow: (state, key) => {
      if (state.stack.includes(key)) {
        throw new Error(`Duplicate window: ${key}`);
      }
      state.stack.push(key);
    },
    destroyWindow: (state, key) => {
      const windowPos = state.stack.findIndex(w => w === key);
      if (windowPos === -1) {
        return;
      }
      state.stack.splice(windowPos, 1);
    },
    activateWindow: (state, key) => {
      const windowPos = state.stack.findIndex(w => w === key);
      if (windowPos === -1) {
        throw new Error("Window not found");
      }
      state.stack.splice(windowPos, 1);
      state.stack.push(key);
    },
  },
  getters: {
    active: state => {
      if (state.stack.length === 0) {
        return null;
      } else {
        return state.stack[state.stack.length - 1];
      }
    },
  },
};

export default windowsModule;
