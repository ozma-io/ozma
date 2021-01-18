import { UserViewErrorType, IViewInfoResult, IViewExprResult, FunDBError } from "ozma-api";
import { Store } from "vuex";

import Api from "@/api";
import { IUserViewArguments, ICombinedUserViewDataParams } from "./combined";

export class UserViewError extends Error {
  type: UserViewErrorType;
  description: string;
  args: IUserViewArguments;

  constructor(type: UserViewErrorType, description: string, args: IUserViewArguments) {
    super(description !== "" ? description : type);
    this.type = type;
    this.description = description;
    this.args = args;
  }
}

export const fetchUserViewData = async (store: Store<any>, args: IUserViewArguments): Promise<ICombinedUserViewDataParams> => {
  try {
    if (args.source.type === "named") {
      if (args.args === null) {
        const res: IViewInfoResult = await store.dispatch("callProtectedApi", {
          func: Api.getNamedUserViewInfo.bind(Api),
          args: [args.source.ref],
        }, { root: true });
        return {
          args,
          info: res.info,
          attributes: res.pureAttributes,
          columnAttributes: res.pureColumnAttributes,
          rows: null,
        };
      } else {
        let uvArgs = args.args;
        // Development hack.
        if (process.env.NODE_ENV !== "production" && window.location.search.includes("__force_recompile")) {
          uvArgs = { ...args.args, "__force_recompile": true };
        }
        const res: IViewExprResult = await store.dispatch("callProtectedApi", {
          func: Api.getNamedUserView.bind(Api),
          args: [args.source.ref, uvArgs],
        }, { root: true });
        return {
          args,
          info: res.info,
          attributes: res.result.attributes,
          columnAttributes: res.result.columnAttributes,
          rows: res.result.rows,
        };
      }
    } else if (args.source.type === "anonymous") {
      if (args.args === null) {
        throw new Error("Getting information about anonymous views is not supported");
      } else {
        let uvArgs = args.args;
        if (process.env.NODE_ENV !== "production" && window.location.search.includes("__force_recompile")) {
          uvArgs = { ...args.args, "__force_recompile": true };
        }
        const res: IViewExprResult = await store.dispatch("callProtectedApi", {
          func: Api.getAnonymousUserView.bind(Api),
          args: [args.source.query, uvArgs],
        }, { root: true });
        return {
          args,
          info: res.info,
          attributes: res.result.attributes,
          columnAttributes: res.result.columnAttributes,
          rows: res.result.rows,
        };
      }
    } else {
      throw new Error("Invalid source type");
    }
  } catch (e) {
    if (e instanceof FunDBError) {
      throw new UserViewError(e.body.error as UserViewErrorType, e.message, args);
    }

    throw e;
  }
};
