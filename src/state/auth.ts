import { Module, ActionContext } from "vuex";
import { v4 as uuidv4 } from "uuid";
import jwtDecode from "jwt-decode";

import { IRef } from "@/utils";
import { FunDBError, disableAuth, authClientId, authUrl, developmentMode } from "@/api";
import * as Utils from "@/utils";
import { router, getQueryValue } from "@/modules";

export class CurrentAuth {
  createdTime: number;
  token: string;
  refreshToken: string;
  idToken: string;
  decodedToken: Record<string, string>;
  decodedRefreshToken: Record<string, string>;
  decodedIdToken: Record<string, string>;

  constructor(token: string, refreshToken: string, idToken: string, createdTime?: number) {
    this.createdTime = (createdTime !== undefined) ? createdTime : Utils.sse();
    this.decodedToken = jwtDecode(token);
    this.decodedRefreshToken = jwtDecode(refreshToken);
    this.decodedIdToken = jwtDecode(idToken);
    this.token = token;
    this.refreshToken = refreshToken;
    this.idToken = idToken;
  }

  get username() {
    return this.decodedIdToken["preferred_username"];
  }

  get refreshValidFor(): number {
    return Number(this.decodedRefreshToken["exp"]) - Number(this.decodedRefreshToken["iat"]);
  }

  get validFor(): number {
    return Number(this.decodedToken["exp"]) - Number(this.decodedToken["iat"]);
  }

  get session(): string {
    return this.decodedToken["session_state"];
  }
}

export interface IAuthState {
  current: CurrentAuth | INoAuth | null;
  renewalTimeoutId: NodeJS.Timeout | null;
  pending: Promise<void> | null;
  protectedCalls: number; // Used for tracking fetch requests and displaying a progress bar.
}

export interface INoAuth {
  token: null;
}

interface IOIDCState {
  path: string;
  nonce: string;
}

interface IAuthPersistedState {
  token: string;
  refreshToken: string;
  idToken: string;
  createdTime: number;
}

const authKey = "auth";
const authNonceKey = "authNonce";

const redirectUri = () => {
  const returnPath = router.resolve({ name: "auth_response" }).href;
  return `${window.location.protocol}//${window.location.host}${returnPath}`;
};

const persistCurrentAuth = (auth: CurrentAuth) => {
  const dump: IAuthPersistedState = {
    token: auth.token,
    refreshToken: auth.refreshToken,
    idToken: auth.idToken,
    createdTime: auth.createdTime,
  };
  localStorage.setItem(authKey, JSON.stringify(dump));
};

const dropCurrentAuth = () => {
  localStorage.removeItem(authKey);
};

const loadCurrentAuth = () => {
  const dumpStr = localStorage.getItem(authKey);

  if (dumpStr !== null) {
    const dump = JSON.parse(dumpStr);
    const auth = new CurrentAuth(dump.token, dump.refreshToken, dump.idToken, dump.createdTime);
    const timestamp = Utils.sse();
    if (auth.createdTime + auth.refreshValidFor > timestamp) {
      return auth;
    } else {
      return null;
    }
  } else {
    return null;
  }
};

const requestToken = async (params: Record<string, string>): Promise<CurrentAuth> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const newParams = { ...params, "client_id": authClientId };
  const paramsString = new URLSearchParams(newParams).toString();

  const ret = await Utils.fetchJson(`${authUrl}/token`, {
    method: "POST",
    headers,
    body: paramsString,
  });

  return new CurrentAuth(ret.access_token, ret.refresh_token, ret.id_token);
};

const startGetToken = (context: ActionContext<IAuthState, {}>, params: Record<string, string>) => {
  const { state, commit, dispatch } = context;
  const oldPending = state.pending;
  const pending: IRef<Promise<void>> = {};
  pending.ref = (async () => {
    await Utils.waitTimeout(); // Delay promise so that it gets saved to `pending` first.
    if (oldPending !== null) {
      try {
        await oldPending;
      } catch (_) {
        // It's handled somewhere else.
      }
    }
    try {
      const auth = await requestToken(params);
      if (state.pending !== pending.ref) {
        throw new Error("Pending operation cancelled");
      }
      updateAuth(context, auth);
      startTimeouts(context);
    } catch (e) {
      if (state.pending === pending.ref) {
        let description: string | null = e.message;
        if (e instanceof Utils.FetchError && typeof e.body === "object") {
          // try setting a better error
          try {
            if (e.body.error === "invalid_grant") {
              // token got revoked, not an error condition
              description = null;
            } else if ("error_description" in e.body) {
              description = e.body.error_description;
            }
          } catch (_) {
            // just don't try.
          }
        }

        await dispatch("removeAuth", undefined, { root: true });
        if (description !== null) {
          void dispatch("setError", `Error when getting token: ${description}`);
        }
        void requestLogin(context, false);
      }
      throw e;
    } finally {
      if (state.pending === pending.ref) {
        commit("setPending", null);
      }
    }
  })();
  commit("setPending", pending.ref);
  return pending.ref;
};

const updateAuth = ({ state, commit, dispatch }: ActionContext<IAuthState, {}>, auth: CurrentAuth | INoAuth) => {
  const oldAuth = state.current;
  commit("setAuth", auth);
  if (auth.token) {
    persistCurrentAuth(auth);
  }
};

const renewAuth = async (context: ActionContext<IAuthState, {}>) => {
  const { commit, state } = context;
  if (!state.current?.token) {
    throw new Error("Cannot renew without an existing token");
  }

  if (state.renewalTimeoutId !== null) {
    clearTimeout(state.renewalTimeoutId);
    commit("setRenewalTimeout", null);
  }

  const params: Record<string, string> = {
    "grant_type": "refresh_token",
    "refresh_token": state.current.refreshToken,
  };
  await startGetToken(context, params);
};

const constantFactorStart = 0.8;
const constantFactorEnd = 0.9;

const startTimeouts = (context: ActionContext<IAuthState, {}>) => {
  const { state, commit } = context;
  if (!state.current?.token) {
    throw new Error("Cannot start timeouts with no tokens");
  }

  const validFor = state.current.validFor;
  // Random timeouts to not overload the server with different tabs.
  const timeoutSecs = constantFactorStart * validFor + Math.random() * (constantFactorEnd - constantFactorStart) * validFor;

  if (state.renewalTimeoutId !== null) {
    clearTimeout(state.renewalTimeoutId);
  }
  const renewalTimeoutId = setTimeout(() => {
    if (state.pending === null) {
      void renewAuth(context);
    } else {
      commit("setRenewalTimeout", null);
    }
  }, timeoutSecs * 1000);
  commit("setRenewalTimeout", renewalTimeoutId);
};

const requestLogin = ({ state, commit }: ActionContext<IAuthState, {}>, tryExisting: boolean, path?: string) => {
  const nonce = uuidv4();
  sessionStorage.setItem(authNonceKey, nonce);
  let realPath: string;
  if (path) {
    realPath = path;
  } else if (router.currentRoute.name === "auth_response") {
    realPath = router.resolve({ name: "main" }).href;
  } else {
    realPath = router.currentRoute.fullPath;
  }
  const savedState: IOIDCState = {
    nonce,
    path: realPath,
  };
  const params = {
    "client_id": authClientId,
    "redirect_uri": redirectUri(),
    "state": btoa(JSON.stringify(savedState)),
    "scope": "openid",
    "response_mode": "query",
    "response_type": "code",
    "prompt": tryExisting ? "none" : "login",
  };
  const paramsString = new URLSearchParams(params).toString();

  const waitForLoad = Utils.gotoHref(`${authUrl}/auth?${paramsString}`);
  commit("setPending", waitForLoad);
  return waitForLoad;
};

const runProtectedCall = async <Args extends unknown[], Ret>({ state, commit, dispatch }: ActionContext<IAuthState, {}>, func: (token: string | null, ...args: Args) => Promise<Ret>, ...args: Args) => {
  commit("increaseProtectedCalls");
  try {
    const token = state.current?.token ?? null;
    return await func(token, ...args);
  } catch (e) {
    if (e instanceof FunDBError) {
      if (e.body.error === "unauthorized") {
        if (state.current === null) {
          await dispatch("login", undefined);
        } else {
          await dispatch("removeAuth", undefined, { root: true });
          await dispatch("setError", `Authentication error during request: ${e.message}`);
        }
      }
    }
    throw e;
  } finally {
    commit("decreaseProtectedCalls");
  }
};

const authQueryKey = "__auth";

export const getAuthedLink = (auth: CurrentAuth): string => {
  const query = { ...router.currentRoute.query };
  query[authQueryKey] = auth.refreshToken;
  const href = router.resolve({ path: router.currentRoute.path, query }).href;
  return window.location.origin + href;
};

const errorKey = "auth";

export const authModule: Module<IAuthState, {}> = {
  namespaced: true,
  state: {
    current: null,
    pending: null,
    renewalTimeoutId: null,
    protectedCalls: 0,
  },
  mutations: {
    setAuth: (state, auth: CurrentAuth) => {
      state.current = auth;
    },
    setRenewalTimeout: (state, renewalTimeoutId: NodeJS.Timeout | null) => {
      state.renewalTimeoutId = renewalTimeoutId;
    },
    clearAuth: state => {
      state.current = null;
      state.renewalTimeoutId = null;
    },
    setPending: (state, pending: Promise<void> | null) => {
      state.pending = pending;
    },
    increaseProtectedCalls: state => {
      state.protectedCalls += 1;
    },
    decreaseProtectedCalls: state => {
      state.protectedCalls -= 1;
    },
  },
  actions: {
    removeAuth: {
      root: true,
      handler: ({ state, commit }) => {
        if (state.renewalTimeoutId !== null) {
          clearTimeout(state.renewalTimeoutId);
        }
        if (state.current !== null) {
          commit("clearAuth");
          dropCurrentAuth();
        }
      },
    },
    setAuth: {
      root: true,
      handler: ({ commit }) => {
        commit("errors/resetErrors", errorKey, { root: true });
      },
    },
    setError: ({ commit }, error: string) => {
      commit("errors/setError", { key: errorKey, error }, { root: true });
    },
    startAuth: context => {
      const { state, commit, dispatch } = context;

      console.assert(state.pending === null);
      const pending: IRef<Promise<void>> = {};
      pending.ref = (async () => {
        await Utils.waitTimeout(); // Delay promise so that it gets saved to `pending` first.

        try {
          if (disableAuth) {
            return;
          }

          await new Promise(resolve => router.onReady(resolve)); // Await till router is ready.

          let tryExisting = true;
          if (router.currentRoute.name === "auth_response") {
            tryExisting = false;
            dropCurrentAuth();

            const stateString = getQueryValue("state");
            if (stateString !== null) {
              const savedState: IOIDCState = JSON.parse(atob(stateString));
              const nonce = sessionStorage.getItem(authNonceKey);
              sessionStorage.removeItem(authNonceKey);
              if (nonce === null || savedState.nonce !== nonce) {
                // Invalid nonce; silently redirect.
                console.error("Invalid client nonce");
                await router.replace({ name: "main" });
              } else {
                const code = getQueryValue("code");
                if (code !== null) {
                  const params: Record<string, string> = {
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirectUri(),
                  };
                  const auth = await requestToken(params);
                  updateAuth(context, auth);
                  startTimeouts(context);
                } else {
                  const error = getQueryValue("error");
                  if (error !== "login_required") {
                    const errorDescription = getQueryValue("errorDescription");
                    void dispatch("setError", `Invalid auth response query parameters, error ${error} ${errorDescription}`);
                  } else {
                    await requestLogin(context, false, savedState.path);
                  }
                }
                await router.replace(savedState.path);
              }
            } else {
              // We got here after logout, redirect.
              await router.replace({ name: "main" });
            }
          } else if (developmentMode && authQueryKey in router.currentRoute.query) {
            dropCurrentAuth();
            const refreshToken = String(router.currentRoute.query[authQueryKey]);
            const newQuery = { ...router.currentRoute.query };
            delete newQuery[authQueryKey];
            await router.replace({ query: newQuery });
            const params: Record<string, string> = {
              "grant_type": "refresh_token",
              "refresh_token": refreshToken,
            };
            try {
              const currAuth = await requestToken(params);
              updateAuth(context, currAuth);
              startTimeouts(context);
            } catch (e) {
              console.error("Failed to use refresh token from URL", e);
            }
          } else {
            const oldAuth = loadCurrentAuth();
            if (oldAuth !== null) {
              updateAuth(context, oldAuth);
              void renewAuth(context);
            }
          }

          const authStorageHandler = async (e: StorageEvent) => {
            if (e.key !== authKey) {
              return;
            }

            if (e.newValue === null) {
              await dispatch("removeAuth", undefined, { root: true });
            } else {
              const newAuth = loadCurrentAuth();
              if (newAuth !== null && (state.current === null || newAuth.token !== state.current.token)) {
                updateAuth(context, newAuth);
                startTimeouts(context);
              }
            }
          };
          window.addEventListener("storage", e => {
            void authStorageHandler(e);
          });
        } finally {
          if (state.pending === pending.ref) {
            commit("setPending", null);
          }
        }
        void dispatch("setAuth", undefined, { root: true });
      })();
      commit("setPending", pending.ref);
      return pending.ref;
    },
    callProtectedApi: {
      root: true,
      handler: async (context, { func, args }: { func: (token: string | null, ...funcArgs: unknown[]) => Promise<any>; args?: unknown[] }): Promise<any> => {
        const { state, commit } = context;
        if (state.pending !== null) {
          try {
            await state.pending;
          } catch (_) {
            // It's handled somewhere else.
          }
          console.assert(state.pending === null);
        }

        if (state.current !== null) {
          return runProtectedCall(context, func, ...(args ?? []));
        } else {
          // Try to perform operation anyway, see if it fails and set the token to empty if not.
          const pending: IRef<Promise<any>> = {};
          pending.ref = (async () => {
            await Utils.waitTimeout(); // Delay promise so that it gets saved to `pending` first.
            const ret = await runProtectedCall(context, func, ...(args ?? []));
            updateAuth(context, { token: null });
            if (state.pending === pending.ref) {
              commit("setPending", null);
            }
            return ret;
          })();
          commit("setPending", state.pending);
          return pending.ref;
        }
      },
    },
    logout: async ({ state, commit }) => {
      if (state.current === null) {
        throw new Error("Cannot logout without an existing token");
      }

      if (disableAuth) {
        return;
      }

      const params = {
        "redirect_uri": redirectUri(),
      };
      const paramsString = new URLSearchParams(params).toString();
      dropCurrentAuth();
      const wait = Utils.gotoHref(`${authUrl}/logout?${paramsString}`);
      commit("setPending", wait);
      await wait;
    },
    login: async context => {
      await requestLogin(context, true);
    },
  },
};

export default authModule;
