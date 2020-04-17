import { Module, ActionContext } from "vuex";
import uuid from "uuid";
import jwtDecode from "jwt-decode";

import { IRef } from "@/utils";
import * as Api from "@/api";
import * as Utils from "@/utils";
import { router, getQueryValue } from "@/modules";

export class CurrentAuth {
  createdTime: number;
  token: string;
  refreshToken: string;
  idToken: string;
  decodedToken: any;
  decodedRefreshToken: any;
  decodedIdToken: any;

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
    return this.decodedIdToken.preferred_username;
  }

  get refreshValidFor(): number {
    return this.decodedRefreshToken.exp - this.decodedRefreshToken.iat;
  }

  get validFor(): number {
    return this.decodedToken.exp - this.decodedToken.iat;
  }

  get session(): string {
    return this.decodedToken.session_state;
  }
}

export interface IAuthState {
  current: CurrentAuth | null;
  renewalTimeoutId: NodeJS.Timeout | null;
  pending: Promise<CurrentAuth> | null;
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

const getToken = (context: ActionContext<IAuthState, {}>, params: Record<string, string>) => {
  const { state, commit, dispatch } = context;
  const pending: IRef<Promise<CurrentAuth>> = {};
  pending.ref = (async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      params.client_id = Api.authClientId;
      const paramsString = new URLSearchParams(params).toString();

      const ret = await Utils.fetchJson(`${Api.authUrl}/token`, {
        method: "POST",
        headers,
        body: paramsString,
      });
      if (state.pending !== pending.ref) {
        throw new Error("Pending operation cancelled");
      }
      const auth = new CurrentAuth(ret.access_token, ret.refresh_token, ret.id_token);
      updateAuth(context, auth);
      startTimeouts(context);
      return auth;
    } catch (e) {
      if (state.pending === pending.ref) {
        let description: string | null = e.message;
        if (e instanceof Utils.FetchError && typeof e.body === "object") {
          // try setting a better error
          try {
            if (e.body.error === "invalid_grant") {
              // token got revoked, not an error condition
              description = null;
            } else {
              if ("error_description" in e.body) {
                description = e.body.error_description;
              }
            }
          } catch (e) {
            // just don't try
          }
        }

        dispatch("removeAuth", undefined, { root: true });
        if (description !== null) {
          dispatch("setError", `Error when getting token: ${description}`);
        }
        requestLogin(context, false);
      }
      throw e;
    }
  })();
  commit("setPending", pending.ref);
  return pending.ref;
};

const updateAuth = ({ state, commit, dispatch }: ActionContext<IAuthState, {}>, auth: CurrentAuth) => {
  const oldAuth = state.current;
  commit("setAuth", auth);
  persistCurrentAuth(auth);
  if (oldAuth === null) {
    dispatch("setAuth", undefined, { root: true });
  }
};

const renewAuth = async (context: ActionContext<IAuthState, {}>) => {
  const { commit, state } = context;
  if (state.current === null) {
    throw new Error("Cannot renew without an existing token");
  }

  if (state.renewalTimeoutId !== null) {
    clearTimeout(state.renewalTimeoutId);
    commit("setRenewalTimeout", null);
  }

  const params: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: state.current.refreshToken,
  };
  return getToken(context, params);
};

const constantFactorStart = 0.8;
const constantFactorEnd = 0.9;

const startTimeouts = (context: ActionContext<IAuthState, {}>) => {
  const { state, commit, dispatch } = context;
  if (state.current === null) {
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
      renewAuth(context);
    } else {
      commit("setRenewalTimeout", null);
    }
  }, timeoutSecs * 1000);
  commit("setRenewalTimeout", renewalTimeoutId);
};

const requestLogin = ({ state, commit }: ActionContext<IAuthState, {}>, tryExisting: boolean) => {
  const nonce = uuid.v4();
  localStorage.setItem(authNonceKey, nonce);
  const path =
        router.currentRoute.name === "auth_response" ?
          router.resolve({ name: "main" }).href :
          router.currentRoute.fullPath;
  const savedState: IOIDCState = {
    nonce,
    path,
  };
  const params = {
    client_id: Api.authClientId,
    redirect_uri: redirectUri(),
    state: btoa(JSON.stringify(savedState)),
    scope: "openid",
    response_mode: "query",
    response_type: "code",
    prompt: tryExisting ? "none" : "login",
  };
  const paramsString = new URLSearchParams(params).toString();

  window.location.href = `${Api.authUrl}/auth?${paramsString}`;
  const waitForLoad = new Promise<void>((resolve, reject) => {
    addEventListener("load", () => {
      reject();
    });
  });
  commit("setPending", waitForLoad);
  return waitForLoad;
};

const errorKey = "auth";

export const authModule: Module<IAuthState, {}> = {
  namespaced: true,
  state: {
    current: null,
    pending: null,
    renewalTimeoutId: null,
  },
  mutations: {
    setAuth: (state, auth: CurrentAuth) => {
      state.current = auth;
      state.pending = null;
    },
    setRenewalTimeout: (state, renewalTimeoutId: NodeJS.Timeout | null) => {
      state.renewalTimeoutId = renewalTimeoutId;
    },
    clearAuth: state => {
      state.current = null;
      state.renewalTimeoutId = null;
      state.pending = null;
    },
    setPending: (state, pending: Promise<CurrentAuth> | null) => {
      state.pending = pending;
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
      commit("setPending", null);
    },
    startAuth: async context => {
      const { state, commit, dispatch } = context;

      if (Api.disableAuth) {
        return;
      }

      let tryExisting = true;
      if (router.currentRoute.name === "auth_response") {
        dropCurrentAuth();
        tryExisting = false;

        const stateString = getQueryValue("state");
        if (stateString !== null) {
          const savedState: IOIDCState = JSON.parse(atob(stateString));
          const nonce = localStorage.getItem(authNonceKey);
          if (nonce === null || savedState.nonce !== nonce) {
            // Invalid nonce; silently redirect.
            console.error("Invalid client nonce");
            router.push({ name: "main" });
          } else {
            const code = getQueryValue("code");
            if (code !== null) {
              const params: Record<string, string> = {
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri(),
              };
              getToken(context, params);
            } else {
              const error = getQueryValue("error");
              if (error !== "login_required") {
                const errorDescription = getQueryValue("errorDescription");
                dispatch("setError", `Invalid auth response query parameters, error ${error} ${errorDescription}`);
              }
            }
            router.push(savedState.path);
          }
        } else {
          // We got here after logout, redirect.
          router.push({ name: "main" });
        }
      } else {
        const oldAuth = loadCurrentAuth();
        if (oldAuth !== null) {
          updateAuth(context, oldAuth);
          renewAuth(context);
        }
      }
      localStorage.removeItem(authNonceKey);

      const authStorageHandler = (e: StorageEvent) => {
        if (e.key !== authKey) {
          return;
        }

        if (e.newValue === null) {
          dispatch("removeAuth", undefined, { root: true });
        } else {
          const newAuth = loadCurrentAuth();
          if (newAuth !== null && (state.current === null || newAuth.token !== state.current.token)) {
            updateAuth(context, newAuth);
            startTimeouts(context);
          }
        }
      };
      window.addEventListener("storage", authStorageHandler);

      if (state.current === null && state.pending === null) {
        if (tryExisting) {
          await requestLogin(context, tryExisting);
        }
      } else if (state.pending !== null) {
        await state.pending;
      }
    },
    callProtectedApi: {
      root: true,
      handler: async ({ state, commit, dispatch }, { func, args }: { func: ((_1: string | null, ..._2: any[]) => Promise<any>); args?: any[] }): Promise<any> => {
        if (state.current === null) {
          if (state.pending !== null) {
            await state.pending;
          }
        }

        try {
          const argsArray = args === undefined ? [] : args;
          const token = state.current === null ? null : state.current.token;
          return await func(token, ...argsArray);
        } catch (e) {
          if (e instanceof Utils.FetchError) {
            if (e.response.status === 401) {
              if (state.current === null) {
                await dispatch("login", undefined);
              } else {
                await dispatch("removeAuth", undefined, { root: true });
                await dispatch("setError", `Authentication error during request: ${e.message}`);
              }
            }
          }
          throw e;
        }
      },
    },
    logout: async ({ state, dispatch, commit }) => {
      if (state.current === null) {
        throw new Error("Cannot logout without an existing token");
      }

      if (Api.disableAuth) {
        return;
      }

      const params = {
        redirect_uri: redirectUri(),
      };
      const paramsString = new URLSearchParams(params).toString();
      dropCurrentAuth();
      window.location.href = `${Api.authUrl}/logout?${paramsString}`;
      const waitForLoad = new Promise((resolve, reject) => {
        addEventListener("load", () => {
          reject();
        });
      });
      commit("setPending", waitForLoad);
      await waitForLoad;
    },
    login: async context => {
      await requestLogin(context, false);
    },
  },
};

export default authModule;
