import { Module, ActionContext } from "vuex";
import uuidv4 from "uuid/v4";
import jwtDecode from "jwt-decode";

import { IRef } from "@/utils";
import * as Api from "@/api";
import * as Utils from "@/utils";
import { router, getQueryValue } from "@/modules";

interface IAuthParams {
    createdTime: number;
    token: string;
    refreshToken: string;
    idToken: string;
    decodedToken: any;
    decodedRefreshToken: any;
    decodedIdToken: any;
}

export class CurrentAuth implements IAuthParams {
    createdTime: number;
    token: string;
    refreshToken: string;
    idToken: string;
    decodedToken: any;
    decodedRefreshToken: any;
    decodedIdToken: any;

    constructor(params: IAuthParams) {
        this.createdTime = params.createdTime;
        this.token = params.token;
        this.refreshToken = params.refreshToken;
        this.idToken = params.idToken;
        this.decodedToken = params.decodedToken;
        this.decodedRefreshToken = params.decodedRefreshToken;
        this.decodedIdToken = params.decodedIdToken;
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

class JwtCurrentAuth extends CurrentAuth {
    constructor(token: string, refreshToken: string, idToken: string, createdTime?: number) {
        const myCreatedTime = (createdTime !== undefined) ? createdTime : Utils.sse();
        const decodedToken = jwtDecode(token);
        const decodedRefreshToken = jwtDecode(refreshToken);
        const decodedIdToken = jwtDecode(idToken);
        super({
            token,
            refreshToken,
            idToken,
            decodedToken,
            decodedRefreshToken,
            decodedIdToken,
            createdTime: myCreatedTime,
        });
    }
}

class MockCurrentAuth extends CurrentAuth {
    constructor() {
        super({
            token: "no_token",
            refreshToken: "no_token",
            idToken: "no_token",
            decodedToken: {
                exp: 600,
                iat: 0,
                session_state: "no_session",
            },
            decodedRefreshToken: {
                exp: 600,
                iat: 0,
            },
            decodedIdToken: {},
            createdTime: Utils.sse(),
        });
    }
}

export interface IAuthState {
    current: CurrentAuth | null;
    lastError: string | null;
    renewalTimeoutId: NodeJS.Timeout | null;
    checkTimeoutId: NodeJS.Timeout | null;
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

const checkTimeout = 5000;

const authKey = "auth";
const authNonceKey = "authNonce";

const createKeycloakIframe = () => {
    const ifr = document.createElement("iframe");
    ifr.setAttribute("src", `${Api.authUrl}/login-status-iframe.html`);
    ifr.setAttribute("title", "keycloak-session-iframe");
    ifr.style.display = "none";
    return ifr;
};

// We create it immediately so it loads faster.
const iframe = createKeycloakIframe();
document.body.appendChild(iframe);
const iframeLoaded = Utils.waitForElement(iframe);

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
        const auth = new JwtCurrentAuth(dump.token, dump.refreshToken, dump.idToken, dump.createdTime);
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
                throw Error("Pending operation cancelled");
            }
            const auth = new JwtCurrentAuth(ret.access_token, ret.refresh_token, ret.id_token);
            updateAuth(context, auth);
            startTimeouts(context);
            return auth;
        } catch (e) {
            if (state.pending === pending.ref) {
                dispatch("removeAuth", undefined, { root: true });
                commit("setError", e.message);
                dispatch("requestLogin", false);
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

const startCheckTimeout = ({ state, commit }: ActionContext<IAuthState, {}>) => {
    if (state.checkTimeoutId !== null) {
        clearTimeout(state.checkTimeoutId);
    }

    const checkTimeoutId = setTimeout(async () => {
        commit("setCheckTimeout", null);
        await iframeLoaded;
        if (state.pending === null && state.current !== null && iframe.contentWindow !== null) {
            const msg = `${Api.authClientId} ${state.current.session}`;
            iframe.contentWindow.postMessage(msg, Api.authOrigin);
        }
    }, checkTimeout);
    commit("setCheckTimeout", checkTimeoutId);
};

const renewAuth = async (context: ActionContext<IAuthState, {}>) => {
    const { commit, state } = context;
    if (state.current === null) {
        throw Error("Cannot renew without an existing token");
    }

    if (state.renewalTimeoutId !== null) {
        clearTimeout(state.renewalTimeoutId);
        commit("setRenewalTimeout", null);
    }
    if (state.checkTimeoutId !== null) {
        clearTimeout(state.checkTimeoutId);
        commit("setCheckTimeout", null);
    }

    const params: Record<string, string> = {
        grant_type: "refresh_token",
        refresh_token: state.current.refreshToken,
    };
    return getToken(context, params);
};

const startTimeouts = (context: ActionContext<IAuthState, {}>) => {
    const { state, commit, dispatch } = context;
    if (state.current === null) {
        throw new Error("Cannot start timeouts with no tokens");
    }

    const constantFactor = 0.6;
    const validFor = state.current.validFor;
    // Random timeouts for different tabs not to overload the server.
    const timeout = (validFor * constantFactor + Math.random() * validFor * (1 - 1.1 * constantFactor)) * 1000;

    if (state.renewalTimeoutId !== null) {
        clearTimeout(state.renewalTimeoutId);
    }
    const renewalTimeoutId = setTimeout(() => {
        if (state.pending === null) {
            renewAuth(context);
        } else {
            commit("setRenewalTimeout", null);
        }
    }, timeout);
    commit("setRenewalTimeout", renewalTimeoutId);

    startCheckTimeout(context);
};

const requestLogin = ({ state, commit }: ActionContext<IAuthState, {}>, tryExisting: boolean) => {
    const nonce = uuidv4();
    localStorage.setItem(authNonceKey, nonce);
    console.log("current path", router.currentRoute.fullPath);
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

export const authModule: Module<IAuthState, {}> = {
    namespaced: true,
    state: {
        current: null,
        pending: null,
        lastError: null,
        renewalTimeoutId: null,
        checkTimeoutId: null,
    },
    mutations: {
        setError: (state, lastError: string) => {
            console.error(`Auth error: ${lastError}`);
            state.lastError = lastError;
            state.pending = null;
        },
        clearError: state => {
            state.lastError = null;
        },
        setAuth: (state, auth: CurrentAuth) => {
            state.current = auth;
            state.lastError = null;
            state.pending = null;
        },
        setRenewalTimeout: (state, renewalTimeoutId: NodeJS.Timeout | null) => {
            state.renewalTimeoutId = renewalTimeoutId;
        },
        setCheckTimeout: (state, checkTimeoutId: NodeJS.Timeout | null) => {
            state.checkTimeoutId = checkTimeoutId;
        },
        clearAuth: state => {
            state.current = null;
            state.renewalTimeoutId = null;
            state.pending = null;
        },
        setPending: (state, pending: Promise<CurrentAuth>) => {
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
                if (state.checkTimeoutId !== null) {
                    clearTimeout(state.checkTimeoutId);
                }
                if (state.current !== null) {
                    commit("clearAuth");
                    dropCurrentAuth();
                }
            },
        },
        setAuth: {
            root: true,
            handler: () => { return; },
        },
        startAuth: async context => {
            const { state, commit, dispatch } = context;

            if (Api.disableAuth) {
                const auth = new MockCurrentAuth();
                commit("setAuth", auth);
                dispatch("setAuth", undefined, { root: true });
                return;
            }

            let tryExisting = true;
            if (router.currentRoute.name === "auth_response") {
                dropCurrentAuth();
                tryExisting = false;

                const stateString = getQueryValue("state");
                if (stateString !== null) {
                    const savedState: IOIDCState = JSON.parse(atob(stateString));
                    console.log("auth state", savedState);
                    const nonce = localStorage.getItem(authNonceKey);
                    if (nonce === null || savedState.nonce !== nonce) {
                        commit("setError", "Invalid client nonce");
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
                            const errorDescription = getQueryValue("errorDescription");
                            commit("setError", `Invalid auth response query parameters, error ${error} ${errorDescription}`);
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

            const iframeHandler = (e: MessageEvent) => {
                if (e.origin !== Api.authOrigin || e.source !== iframe.contentWindow) {
                    return;
                }
                const reply = e.data;

                if (reply === "unchanged") {
                    if (state.current !== null) {
                        startCheckTimeout(context);
                    }
                } else if (reply === "changed") {
                    dispatch("removeAuth", undefined, { root: true });
                } else if (reply === "error") {
                    dispatch("removeAuth", undefined, { root: true });
                    commit("setError", "Received an error during authorization check");
                }
            };
            window.addEventListener("message", iframeHandler);

            if (state.current === null && state.pending === null) {
                await requestLogin(context, tryExisting);
            } else if (state.pending !== null) {
                await state.pending;
            }
        },
        callProtectedApi: {
            root: true,
            handler: async ({ state, commit, dispatch }, { func, args }: { func: ((_1: string, ..._2: any[]) => Promise<any>), args?: any[] }): Promise<any> => {
                if (state.current === null) {
                    if (state.pending !== null) {
                        await state.pending;
                    }
                    if (state.current === null) {
                        throw new Error("No authentication token");
                    }
                }

                try {
                    const argsArray = args === undefined ? [] : args;
                    return await func(state.current.token, ...argsArray);
                } catch (e) {
                    if (e instanceof Utils.FetchError) {
                        if (e.response.status === 401) {
                            dispatch("removeAuth", undefined, { root: true });
                            commit("setError", e.message);
                        }
                    }
                    throw e;
                }
            },
        },
        logout: async ({ state, dispatch, commit }) => {
            if (state.current === null) {
                throw Error("Cannot logout without an existing token");
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
    },
};

export default authModule;
