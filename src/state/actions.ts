import { Dispatch } from "vuex";
import { IActionRef, IActionResult } from "ozma-api";

import Api from "@/api";
import { app } from "@/main";
import { CombinedTransactionResult } from "@/state/staging_changes";
import { shortLanguage } from "@/utils";

const messages: Record<string, Record<string, string>> = {
  en: {
    "exception_in_action": "Exception in action",
  },
  ru: {
    "exception_in_action": "Исключение в действии",
  },
};
const funI18n = (key: string) => messages[shortLanguage]?.[key]; // TODO: can't access VueI18n here, but this solution looks stupid too.

export const saveAndRunAction = async (
  { dispatch }: { dispatch: Dispatch },
  ref: IActionRef,
  args: Record<string, unknown>,
): Promise<IActionResult> => {
  let ret: IActionResult | undefined;
  let reloaded = false;
  try {
    const submitRet: CombinedTransactionResult[] = await dispatch("staging/submit", { preReload: async () => {
      try {
        ret = await dispatch("callProtectedApi", {
          func: Api.runAction,
          args: [ref, args],
        }, { root: true });
      } catch (e) {
        const errorPrefix = "Error: Failed to run action: Unhandled exception ";
        if (String(e).includes(errorPrefix, 0)) {
          const error = String(e).replace(errorPrefix, "");
          app.$bvToast.toast(error, {
            title: funI18n("exception_in_action"),
            variant: "danger",
            solid: true,
          });
        }

        throw e;
      }
    } }, { root: true });
    reloaded = submitRet.length !== 0;
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
