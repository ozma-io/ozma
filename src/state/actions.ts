import { Dispatch } from "vuex";

import {
  IActionRef, IActionResult, default as Api
} from "@/api";
import { CombinedTransactionResult } from "@/state/staging_changes";

export const saveAndRunAction = async ({ dispatch }: { dispatch: Dispatch }, ref: IActionRef, args: Record<string, any>): Promise<IActionResult> => {
  let ret: IActionResult | undefined;
  let reloaded = false;
  try {
    const submitRet: CombinedTransactionResult[] = await dispatch("staging/submit", { preReload: async () => {
      ret = await dispatch("callProtectedApi", {
        func: Api.runAction,
        args: [ref, args],
      }, { root: true });
    } }, { root: true });
    reloaded = submitRet.length !== 0;
  } catch (e) {
    if (ret === undefined) {
      throw e;
    }
  }

  if (!reloaded) {
    // We didn't reload; do it now.
    try {
      await dispatch("userView/reload", null, { root: true });
    } catch (e) { }
  }
  return ret as IActionResult;
};