import { UserViewErrorType, IViewInfoResult, IViewExprResult, FunDBError, IEntriesRequestOpts } from "ozma-api";
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

const defaultViewOpts: IEntriesRequestOpts = {
  chunk: { limit: 5000 },
};

export const fetchUserViewData =
async (
  store: Store<any>,
  args: IUserViewArguments,
  opts: IEntriesRequestOpts = defaultViewOpts,
): Promise<ICombinedUserViewDataParams> => {
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
          complete: true,
        };
      } else {
        // Increasing `limit` to compute `complete`.
        const extendedOpts = opts.chunk?.limit !== undefined
          ? { ...opts, chunk: { ...opts.chunk, limit: opts.chunk.limit + 1 } }
          : opts;
        const res: IViewExprResult = await store.dispatch("callProtectedApi", {
          func: Api.getNamedUserView.bind(Api),
          args: [args.source.ref, args.args, extendedOpts],
        }, { root: true });
        const complete = opts.chunk?.limit !== undefined && res.result.rows.length <= opts.chunk.limit;
        return {
          args,
          info: res.info,
          attributes: res.result.attributes,
          columnAttributes: res.result.columnAttributes,
          rows: complete ? res.result.rows : res.result.rows,
          complete,
        };
      }
    } else if (args.source.type === "anonymous") {
      if (args.args === null) {
        throw new Error("Getting information about anonymous views is not supported");
      } else {
        const res: IViewExprResult = await store.dispatch("callProtectedApi", {
          func: Api.getAnonymousUserView.bind(Api),
          args: [args.source.query, args.args, opts],
        }, { root: true });
        return {
          args,
          info: res.info,
          attributes: res.result.attributes,
          columnAttributes: res.result.columnAttributes,
          rows: res.result.rows,
          complete: opts.chunk?.limit !== undefined && res.result.rows.length < opts.chunk.limit,
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
