import * as Utils from "@/utils"
import seq from "@/sequences"

const apiUrl = (process.env["NODE_ENV"] === "production") ? `https://api.${location.hostname}` : `http://${location.hostname}:5000`

export const authOrigin = (process.env["NODE_ENV"] === "production") ? "https://account.myprocessx.com" : "https://keycloak-dev.myprocessx.com"
const authUrlBase = (process.env["NODE_ENV"] === "production") ? `${authOrigin}/auth/realms/myprocessx` : `${authOrigin}/auth/realms/myprocessx-dev`
export const authUrl = `${authUrlBase}/protocol/openid-connect`
export const accountUrl = `${authUrlBase}/account`
export const authClientId = "funapp"
export const authClientSecret = (process.env["NODE_ENV"] === "production") ? undefined : "f95ff7a4-5e36-44de-aa43-571f86b21638"

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

export type DomainId = number
export type RowId = number
export type RowIdString = string
export type FieldName = string
export type EntityName = string
export type SchemaName = string
export type ColumnName = string
export type AttributeName = string

export interface IAllowedEntity {
    fields: Record<FieldName, void>
}

export interface IAllowedSchema {
    entities: Record<EntityName, IAllowedEntity>
}

export interface IAllowedDatabase {
    schemas: Record<SchemaName, IAllowedSchema>
}

export interface IEntityRef {
    schema: SchemaName
    name: EntityName
}

export interface IFieldRef {
    entity: IEntityRef
    name: FieldName
}

export type SimpleType = "int" | "decimal" | "string" | "bool" | "datetime" | "date" | "regclass"

export interface IScalarSimpleType {
    type: SimpleType
}

export interface IArraySimpleType {
    type: "array"
    subtype: SimpleType
}

export type ValueType = IScalarSimpleType | IArraySimpleType

export type FieldValueType = "int" | "decimal" | "string" | "bool" | "datetime" | "date"

export type AttributesMap = Record<AttributeName, any>
export type AttributeTypesMap = Record<AttributeName, ValueType>

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

export interface IMainFieldInfo {
    name: FieldName
    field: IColumnField
}

export interface IResultColumnInfo {
    name: string
    attributeTypes: AttributeTypesMap
    cellAttributeTypes: AttributeTypesMap
    valueType: ValueType
    punType: ValueType | null
    mainField: IMainFieldInfo | null
}

export interface IDomainField {
    ref: IFieldRef
    field: IColumnField | null
    idColumn: ColumnName
}

export interface IMainEntityInfo {
    entity: IEntityRef
    name: FieldName
}

export interface IResultViewInfo {
    attributeTypes: AttributeTypesMap
    rowAttributeTypes: AttributeTypesMap
    domains: Record<DomainId, Record<ColumnName, IDomainField>>
    mainEntity: IMainEntityInfo | null
    columns: IResultColumnInfo[]
}

export interface IExecutedValue {
    value: any
    attributes?: AttributesMap
    pun?: any
}

export interface IExecutedRow {
    values: IExecutedValue[]
    domainId: DomainId
    attributes?: AttributesMap
    entityIds?: Record<ColumnName, RowId>
}

export interface IExecutedViewExpr {
    attributes: AttributesMap
    columnAttributes: AttributesMap[]
    rows: IExecutedRow[]
}

export interface IViewExprResult {
    info: IResultViewInfo
    result: IExecutedViewExpr
}

export interface IViewInfoResult {
    info: IResultViewInfo
    pureAttributes: Record<AttributeName, any>
    pureColumnAttributes: Array<Record<AttributeName, any>>
}

const fetchFormApi = async (subUrl: string, token: string, method: string, body?: string): Promise<any> => {
    return await Utils.fetchSuccess(`${apiUrl}/${subUrl}`, {
        method,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
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

export const fetchAllowed = async (token: string): Promise<IAllowedDatabase> => {
    return await fetchJsonApi("permissions/allowed", token, "GET")
}

const fetchView = async (path: string, token: string, args: URLSearchParams): Promise<IViewExprResult> => {
    return await fetchJsonApi(`views/${path}/entries?${args}`, token, "GET")
}

const fetchViewInfo = async (path: string, token: string, args: URLSearchParams): Promise<IViewInfoResult> => {
    return await fetchJsonApi(`views/${path}/info?${args}`, token, "GET")
}

const convertArgs = (args: Record<string, any>): URLSearchParams => {
    const params = new URLSearchParams()
    seq(args).forEach(([name, arg]) => {
        params.append(name, JSON.stringify(arg))
    })
    return params
}

export const fetchAnonymousView = async (token: string, query: string, args: Record<string, any>): Promise<IViewExprResult> => {
    const search = convertArgs(args)
    search.set("__query", query)
    return await fetchView("anonymous", token, search)
}

export const fetchNamedView = async (token: string, name: string, args: Record<string, any>): Promise<IViewExprResult> => {
    return await fetchView(`by_name/${name}`, token, convertArgs(args))
}

export const fetchNamedViewInfo = async (token: string, name: string): Promise<IViewInfoResult> => {
    return await fetchViewInfo(`by_name/${name}`, token, new URLSearchParams())
}

const changeEntity = async (path: string, method: string, token: string, ref: IEntityRef, body?: string): Promise<any> => {
    const schema = ref.schema === null ? "public" : ref.schema
    return await fetchFormApi(`entity/${schema}/${ref.name}${path}`, token, method, body)
}

export const insertEntry = async (token: string, ref: IEntityRef, args: Record<string, any>): Promise<void> => {
    return await changeEntity("", "POST", token, ref, convertArgs(args).toString())
}

export const updateEntry = async (token: string, ref: IEntityRef, id: number, args: Record<string, any>): Promise<void> => {
    await changeEntity(`/${id}`, "PUT", token, ref, convertArgs(args).toString())
}

export const deleteEntry = async (token: string, ref: IEntityRef, id: number): Promise<void> => {
    await changeEntity(`/${id}`, "DELETE", token, ref)
}
