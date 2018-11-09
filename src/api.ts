import * as Utils from "@/utils"

const apiUrl = Utils.isProduction ? "https://api.myxprocess.com" : "http://127.0.0.1:5000"

interface IAuthRequest {
    username: string
    password: string
}

interface IAuthResponse {
    token: string
}

export interface IAuthToken {
    sub: string
    exp: number
}

export interface IAllowedEntity {
    fields: Record<string, void>
}

export interface IAllowedSchema {
    entities: Record<string, IAllowedEntity>
}

export interface IAllowedDatabase {
    schemas: Record<string, IAllowedSchema>
    systemEntities: Record<string, IAllowedEntity>
}

export interface IEntityRef {
    schema: string | null
    name: string
}

export type SimpleType = "int" | "string" | "bool" | "datetime" | "date" | "regclass"

export interface IScalarSimpleType {
    type: SimpleType
}

export interface IArraySimpleType {
    type: "array"
    subtype: SimpleType
}

export type ValueType = IScalarSimpleType | IArraySimpleType

export type FieldValueType = "int" | "string" | "bool" | "datetime" | "date"

export interface IScalarFieldType {
    type: FieldValueType
}

export interface IArrayFieldType {
    type: "array"
    subtype: FieldValueType
}

export interface IReferenceFieldType {
    type: "reference"
    entity: IEntityRef
    where: string
}

export interface IEnumFieldType {
    type: "enum"
    values: string[]
}

export type FieldType = IScalarFieldType | IArrayFieldType | IReferenceFieldType | IEnumFieldType

export interface IColumnField {
    fieldType: FieldType
    defaultValue: any
    isNullable: boolean
}

export interface IUpdateFieldInfo {
    name: string
    field: IColumnField
}

export interface IResultColumnInfo {
    name: string
    attributeTypes: Record<string, ValueType>
    cellAttributeTypes: Record<string, ValueType>
    valueType: ValueType
    fieldType: FieldType | null
    punType: ValueType | null
    updateField: IUpdateFieldInfo | null
}

export interface IResultViewInfo {
    attributeTypes: Record<string, ValueType>
    rowAttributeTypes: Record<string, ValueType>
    updateEntity: IEntityRef | null
    columns: IResultColumnInfo[]
}

export interface IExecutedValue {
    value: any
    attributes?: Record<string, any>
    pun?: any
}

export interface IExecutedRow {
    values: IExecutedValue[]
    attributes?: Record<string, any>
    id?: number
}

export interface IExecutedViewExpr {
    attributes: Record<string, any>
    columnAttributes: Array<Record<string, any>>
    rows: IExecutedRow[]
}

export interface IViewExprResult {
    info: IResultViewInfo
    result: IExecutedViewExpr
}

export interface IViewInfoResult {
    info: IResultViewInfo
    pureAttributes: Record<string, any>
    pureColumnAttributes: Array<Record<string, any>>
}

export const requestAuth = async (username: string, password: string): Promise<string> => {
    const reqBody: IAuthRequest = { username, password }
    const resBody: IAuthResponse = await Utils.fetchJson(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
    })
    return resBody.token
}

export const parseToken = (token: string): IAuthToken => {
    return JSON.parse(atob(token.split(".")[1]))
}

const fetchApi = async (subUrl: string, token: string, method: string, body?: string): Promise<any> => {
    return await Utils.fetchSuccess(`${apiUrl}/${subUrl}`, {
        method,
        headers: {
            "Authorization": `Bearer ${token}`,
        },
        body,
    })
}

const fetchJsonApi = async (subUrl: string, token: string, method: string, body?: any): Promise<any> => {
    return await Utils.fetchJson(`${apiUrl}/${subUrl}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    })
}

export const renewAuth = async (token: string): Promise<string> => {
    const response: IAuthResponse = await fetchJsonApi("auth/renew", token, "POST")
    return response.token
}

export const fetchAllowed = async (token: string): Promise<IAllowedDatabase> => {
    return await fetchJsonApi("permissions/allowed", token, "GET")
}

const fetchView = async (path: string, token: string, args: URLSearchParams): Promise<IViewExprResult> => {
    return await fetchJsonApi(`views/${path}/entries?${args}`, token, "GET")
}

const fetchViewInfo = async (path: string, token: string, args: URLSearchParams): Promise<IViewInfoResult> => {
    return await fetchJsonApi(`views/${path}/info?${args}`, token, "GET")
}

export const fetchAnonymousView = async (token: string, query: string, args: URLSearchParams): Promise<IViewExprResult> => {
    args.set("__query", query)
    return await fetchView("anonymous", token, args)
}

export const fetchNamedView = async (token: string, name: string, args: URLSearchParams): Promise<IViewExprResult> => {
    return await fetchView(`by_name/${name}`, token, args)
}

export const fetchNamedViewInfo = async (token: string, name: string): Promise<IViewInfoResult> => {
    return await fetchViewInfo(`by_name/${name}`, token, new URLSearchParams())
}

const changeEntity = async (path: string, method: string, token: string, ref: IEntityRef, body?: string): Promise<void> => {
    const schema = ref.schema === null ? "public" : ref.schema
    return await fetchApi(`entity/${schema}/${ref.name}${path}`, token, method, body)
}

export const insertEntity = async (token: string, ref: IEntityRef, args: URLSearchParams): Promise<void> => {
    return await changeEntity("", "POST", token, ref, args.toString())
}

export const updateEntity = async (token: string, ref: IEntityRef, id: number, args: URLSearchParams): Promise<void> => {
    return await changeEntity(`/${id}`, "PUT", token, ref, args.toString())
}

export const deleteEntity = async (token: string, ref: IEntityRef, id: number): Promise<void> => {
    return await changeEntity(`/${id}`, "DELETE", token, ref)
}
