import { Store } from "vuex";
import { IActionRef, IActionResult } from "ozma-api";

import Api, { findErrorUserData } from "@/api";
import { app, eventBus } from "@/main";
import { i18n } from "@/modules";
import { ISubmitResult } from "@/state/staging_changes";

import { CurrentSettings } from "./settings";
import { CurrentAuth, INoAuth } from "./auth";

const dirtyHackGetErrorMessage = (error: unknown): string => {
  const errorString = String(error);
  return /^Error: Uncaught Error: (.*)\n/.exec(errorString)?.[1] ??
    errorString.replace(/^Error: /, "");
};

export const saveAndRunAction = async (
  { dispatch, state }: Store<any>,
  ref: IActionRef,
  args: Record<string, unknown>,
): Promise<IActionResult> => {
  const settings = state.settings.current as CurrentSettings;
  const auth = state.auth.current as CurrentAuth | INoAuth | null;

  let ret: IActionResult | undefined;
  try {
    const submitRet: ISubmitResult = await dispatch("staging/submit", { preReload: async () => {
      try {
        ret = await dispatch("callProtectedApi", {
          func: Api.runAction,
          args: [ref, args],
        }, { root: true });
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e;
        }

        const userData = findErrorUserData(e);
        if (userData) {
          ret = { result: userData };
        } else if (settings.getEntry("is_read_only_demo_instance", Boolean, false) && !auth?.refreshToken) {
          eventBus.emit("show-readonly-demo-modal");
        } else {
          app.$bvToast.toast(dirtyHackGetErrorMessage(e), {
            title: i18n.tc("exception_in_action"),
            variant: "danger",
            solid: true,
          });
        }

        throw e;
      }
    } }, { root: true });
  } catch (e) {
    if (ret === undefined) {
      throw e;
    }
  }

  void dispatch("reload", undefined, { root: true });
  return ret as IActionResult;
};
