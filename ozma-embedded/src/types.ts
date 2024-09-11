import { IUserViewRef } from '@ozma-io/ozmadb-js/types'

export const apiVersion = 1

export interface IRequest<Request extends { type: string }> {
  type: 'request'
  id?: unknown
  request: Request
}

export interface IResponseCommon {
  type: 'response'
  id: unknown
}

export interface IResponseSuccess<Result> extends IResponseCommon {
  status: 'ok'
  result: Result
}

export interface IResponseError<Error> extends IResponseCommon {
  status: 'error'
  error: Error
  message: string
}

export type Response<Result, Error> =
  | IResponseSuccess<Result>
  | IResponseError<Error>

export type CommonError = 'internal' | 'unknownRequest' | 'badRequest'

export interface IReadyRequestData {
  type: 'ready'
  version: number
}

export type ReadyRequest = IRequest<IReadyRequestData>
export type ReadyResponse = Response<undefined, CommonError>

export interface IChangeHeightRequestData {
  type: 'changeHeight'
  height: number
}

export type ChangeHeightRequest = IRequest<IChangeHeightRequestData>
export type ChangeHeightResponse = Response<undefined, CommonError>

export interface IUpdateValueRequestData {
  type: 'updateValue'
  rawValue: unknown
}

export type UpdateValueRequest = IRequest<IUpdateValueRequestData>
export type UpdateValueResponse = Response<undefined, CommonError>

export interface ICurrentValue {
  value: unknown
}

export type QueryTarget = 'top' | 'root' | 'modal' | 'blank' | 'modal-auto'

export interface IQueryLinkOpts {
  new?: boolean
  args?: Record<string, unknown>
  defaultValues?: Record<string, unknown>
  target?: QueryTarget
}

export interface IQueryLink extends IQueryLinkOpts {
  ref: IUserViewRef
}

export type RawQueryLink = (IQueryLinkOpts & IUserViewRef) | IQueryLink

export type HrefTarget = 'top' | 'blank'

export interface IHrefLinkOpts {
  target?: HrefTarget
}

export interface IHrefLink extends IHrefLinkOpts {
  href: string
}

export type RawHrefLink = IHrefLink | string

export type RawLink = RawQueryLink | RawHrefLink

export type Link = IQueryLink | IHrefLink

export interface IGotoRequestData {
  type: 'goto'
  link: Link
}

export interface IUpdateValuePush {
  type: 'updateValue'
  update: ICurrentValue
}

export type GotoRequest = IRequest<IGotoRequestData>
export type GotoResponse = Response<undefined, CommonError>

export interface IIDTokenRequestData {
  type: 'idToken'
}

export interface IIDTokenResponse {
  idToken?: string
}

export type IDTokenRequest = IRequest<IIDTokenRequestData>
export type IDTokenResponse = Response<IIDTokenResponse, CommonError>

export type PageClientMessage = ReadyRequest | GotoRequest | IDTokenRequest
export type PageServerMessage = ReadyResponse | GotoResponse | IDTokenResponse

export type ControlClientMessage =
  | PageClientMessage
  | ChangeHeightRequest
  | UpdateValueRequest
export type ControlServerMessage =
  | PageServerMessage
  | ChangeHeightResponse
  | UpdateValueResponse
  | IUpdateValuePush

export type AnyClientMessage = PageClientMessage | ControlClientMessage
export type AnyServerMessage = PageServerMessage | ControlServerMessage
