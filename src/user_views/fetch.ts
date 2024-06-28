import FunDBAPI, {
  IViewInfoResult,
  IViewExprResult,
  OzmaDBError,
  IInfoRequestOpts,
  IEntriesRequestOpts,
  ClientHttpError,
  UserViewError as UVError,
} from '@ozma-io/ozmadb-js/client'

import { Store } from 'vuex'

import { developmentMode } from '@/api'
import { IUserViewArguments, ICombinedUserViewDataParams } from './combined'

export type ClientUserViewError = UVError | ClientHttpError

export class UserViewError extends OzmaDBError {
  body: ClientUserViewError
  args: IUserViewArguments

  constructor(body: ClientUserViewError, args: IUserViewArguments) {
    super(body)
    this.body = body
    this.args = args
  }
}

const defaultViewOpts: IEntriesRequestOpts = {
  chunk: { limit: 5000 },
}

export const fetchUserViewData = async (
  store: Store<any>,
  args: IUserViewArguments,
  opts: IEntriesRequestOpts = defaultViewOpts,
): Promise<ICombinedUserViewDataParams> => {
  try {
    const source = args.source
    if (source.type === 'named') {
      if (args.args === null) {
        // Always recompile user views if development mode is enabled.
        let reqOpts: IInfoRequestOpts = {}
        if (developmentMode) {
          // Hack `chunk` to pass undocumented call argument.
          reqOpts = { ...reqOpts, forceRecompile: true } as any
        }
        const res: IViewInfoResult = await store.dispatch(
          'callApi',
          {
            func: (api: FunDBAPI) =>
              api.getNamedUserViewInfo(source.ref, reqOpts),
          },
          { root: true },
        )
        return {
          args,
          info: res.info,
          attributes: res.constAttributes,
          columnAttributes: res.constColumnAttributes,
          argumentAttributes: res.constArgumentAttributes,
          rows: null,
          complete: true,
        }
      } else {
        let reqOpts = opts
        const realLimit = opts.chunk?.limit
        // Increasing `limit` to compute `complete`.
        if (realLimit !== undefined) {
          reqOpts = {
            ...reqOpts,
            chunk: { ...opts.chunk, limit: realLimit + 1 },
          }
        }
        // Always recompile user views if development mode is enabled.
        if (developmentMode) {
          reqOpts = { ...reqOpts, forceRecompile: true } as any
        }
        const res: IViewExprResult = await store.dispatch(
          'callApi',
          {
            func: (api: FunDBAPI) =>
              api.getNamedUserView(source.ref, args.args ?? undefined, reqOpts),
          },
          { root: true },
        )

        const complete =
          realLimit === undefined || res.result.rows.length <= realLimit
        return {
          args,
          info: res.info,
          attributes: res.result.attributes,
          columnAttributes: res.result.columnAttributes,
          argumentAttributes: res.result.argumentAttributes,
          rows: complete ? res.result.rows : res.result.rows,
          complete,
        }
      }
    } else if (args.source.type === 'anonymous') {
      if (args.args === null) {
        throw new Error(
          'Getting information about anonymous views is not supported',
        )
      } else {
        const res: IViewExprResult = await store.dispatch(
          'callApi',
          {
            func: (api: FunDBAPI) =>
              api.getAnonymousUserView(
                source.query,
                args.args ?? undefined,
                opts,
              ),
          },
          { root: true },
        )
        return {
          args,
          info: res.info,
          attributes: res.result.attributes,
          columnAttributes: res.result.columnAttributes,
          argumentAttributes: res.result.argumentAttributes,
          rows: res.result.rows,
          complete:
            opts.chunk?.limit !== undefined &&
            res.result.rows.length < opts.chunk.limit,
        }
      }
    } else {
      throw new Error('Invalid source type')
    }
  } catch (e) {
    if (!(e instanceof OzmaDBError)) {
      throw e
    }

    throw new UserViewError(e.body as UVError, args)
  }
}
