import { Dispatch } from "vuex";
import { IActionRef, IActionResult } from "ozma-api";

import Api from "@/api";
import { app } from "@/main";
import { i18n } from "@/modules";
import { ISubmitResult } from "@/state/staging_changes";

const dirtyHackGetErrorMessage = (error: any): string =>
  /Unhandled exception (Error: )?(.*):\n/g.exec(String(error))?.[2] ?? "";

export const saveAndRunAction = async (
  { dispatch }: { dispatch: Dispatch },
  ref: IActionRef,
  args: Record<string, unknown>,
): Promise<IActionResult> => {
  let ret: IActionResult | undefined;
  let reloaded = false;
  try {
    const submitRet: ISubmitResult = await dispatch("staging/submit", { preReload: async () => {
      try {
        ret = await dispatch("callProtectedApi", {
          func: Api.runAction,
          args: [ref, args],
        }, { root: true });
      } catch (e) {
        // TODO: Return proper messages from backend instead of using regexps.
        app.$bvToast.toast(dirtyHackGetErrorMessage(e), {
          title: i18n.tc("exception_in_action"),
          variant: "danger",
          solid: true,
        });

        throw e;
      }
    } }, { root: true });
    reloaded = submitRet.results.length !== 0;
  } catch (e) {
    if (ret === undefined) {
      throw e;
    }
  }

  if (!reloaded) {
    void dispatch("reload", undefined, { root: true });
  }
  return ret as IActionResult;
};
