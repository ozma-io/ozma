import * as Utils from "@/utils";

const hostnameParts = location.hostname.split(".");
const instanceName = hostnameParts[0];
const instancesHost = hostnameParts.length >= 2 ? hostnameParts[hostnameParts.length - 2] + "." + hostnameParts[hostnameParts.length - 1] : null;
const apiUrl = __API_URL__;
export const disableAuth = __DISABLE_AUTH__;

export const authOrigin = String(__API_AUTH_URL__);
export const authUrlBase = `${authOrigin}${__API_AUTH_URL_BASE__}`;
export const authUrl = `${authUrlBase}/protocol/openid-connect`;
export const accountUrl = `${authUrlBase}/account`;
export const authClientId = String(__AUTH_CLIENT_ID__);

if (!disableAuth && !(__API_AUTH_URL__ && __API_AUTH_URL_BASE__ && __AUTH_CLIENT_ID__)) {
  throw new Error("Invalid auth configuration");
}

export const funappSchema = "funapp";

export interface IAuthToken {
  sub: string;
  exp: number;
}

export type DomainId = number;
export type RowId = number;
export type FieldName = string;
export type EntityName = string;
export type SchemaName = string;
export type ColumnName = string;
export type AttributeName = string;
export type UserViewName = string;
export type ConstraintName = string;

export interface IAllowedEntity {
  fields: Record<FieldName, void>;
}

export interface IAllowedSchema {
  entities: Record<EntityName, IAllowedEntity>;
}

export interface IAllowedDatabase {
  schemas: Record<SchemaName, IAllowedSchema>;
}

export interface IEntityRef {
  schema: SchemaName;
  name: EntityName;
}

export interface IFieldRef {
  entity: IEntityRef;
  name: FieldName;
}

export interface IUserViewRef {
  schema: SchemaName;
  name: UserViewName;
}

export type SimpleType = "int" | "decimal" | "string" | "bool" | "datetime" | "date" | "regclass" | "json";

export interface IScalarSimpleType {
  type: SimpleType;
}

export interface IArraySimpleType {
  type: "array";
  subtype: SimpleType;
}

export type ValueType = IScalarSimpleType | IArraySimpleType;

export type FieldValueType = "int" | "decimal" | "string" | "bool" | "datetime" | "date" | "json";

export type AttributesMap = Record<AttributeName, any>;
export type AttributeTypesMap = Record<AttributeName, ValueType>;

export interface IScalarFieldType {
  type: FieldValueType;
}

export interface IArrayFieldType {
  type: "array";
  subtype: FieldValueType;
}

export interface IReferenceFieldType {
  type: "reference";
  entity: IEntityRef;
  where: string | null;
}

export interface IEnumFieldType {
  type: "enum";
  values: string[];
}

export type FieldType = IScalarFieldType | IArrayFieldType | IReferenceFieldType | IEnumFieldType;

export interface IColumnField {
  fieldType: FieldType;
  valueType: ValueType;
  defaultValue: any;
  isNullable: boolean;
  isImmutable: boolean;
  inheritedFrom: IEntityRef | null;
}

export type UsedFields = FieldName[];
export type UsedEntities = Record<EntityName, UsedFields>;
export type UsedSchemas = Record<SchemaName, UsedEntities>;

export interface IComputedField {
  expression: string;
  isLocal: boolean;
  hasId: boolean;
  usedSchemas: UsedSchemas;
  inheritedFrom: IEntityRef | null;
  isVirtual: boolean;
}

export interface IUniqueConstraint {
  columns: FieldName[];
}

export interface ICheckConstraint {
  expression: string;
}

export interface IChildEntity {
  ref: IEntityRef;
  direct: boolean;
}

export interface IEntity {
  columnFields: Record<FieldName, IColumnField>;
  computedFields: Record<FieldName, IComputedField>;
  uniqueConstraints: Record<ConstraintName, IUniqueConstraint>;
  checkConstraints: Record<ConstraintName, ICheckConstraint>;
  mainField: FieldName;
  forbidExternalReferences: boolean;
  isHidden: boolean;
  parent: IEntityRef | null;
  children: IChildEntity[];
  isAbstract: boolean;
  root: IEntityRef;
}

export interface IMainFieldInfo {
  name: FieldName;
  field: IColumnField;
}

export interface IResultColumnInfo {
  name: string;
  attributeTypes: AttributeTypesMap;
  cellAttributeTypes: AttributeTypesMap;
  valueType: ValueType;
  punType: ValueType | null;
  mainField: IMainFieldInfo | null;
}

export interface IDomainField {
  ref: IFieldRef;
  field: IColumnField | null;
  idColumn: ColumnName;
}

export interface IResultViewInfo {
  attributeTypes: AttributeTypesMap;
  rowAttributeTypes: AttributeTypesMap;
  domains: Record<DomainId, Record<ColumnName, IDomainField>>;
  mainEntity: IEntityRef | null;
  columns: IResultColumnInfo[];
}

export interface IExecutedValue {
  value: any;
  attributes?: AttributesMap;
  pun?: any;
}

export interface IEntityId {
  id: RowId;
  subEntity?: IEntityRef;
}

export interface IExecutedRow {
  values: IExecutedValue[];
  domainId: DomainId;
  attributes?: AttributesMap;
  entityIds?: Record<ColumnName, IEntityId>;
  mainId?: RowId;
  mainSubEntity?: IEntityRef;
}

export interface IExecutedViewExpr {
  attributes: AttributesMap;
  columnAttributes: AttributesMap[];
  rows: IExecutedRow[];
}

export interface IViewExprResult {
  info: IResultViewInfo;
  result: IExecutedViewExpr;
}

export interface IViewInfoResult {
  info: IResultViewInfo;
  pureAttributes: Record<AttributeName, any>;
  pureColumnAttributes: Record<AttributeName, any>[];
}

export interface IInsertEntityOp {
  type: "insert";
  entity: IEntityRef;
  entries: Record<FieldName, any>;
}

export interface IUpdateEntityOp {
  type: "update";
  entity: IEntityRef;
  id: number;
  entries: Record<FieldName, any>;
}

export interface IDeleteEntityOp {
  type: "delete";
  entity: IEntityRef;
  id: number;
}

export type TransactionOp = IInsertEntityOp | IUpdateEntityOp | IDeleteEntityOp;

export interface IInsertEntityResult {
  type: "insert";
  id: number;
}

export interface IUpdateEntityResult {
  type: "update";
}

export interface IDeleteEntityResult {
  type: "delete";
}

export type TransactionResult = IInsertEntityResult | IUpdateEntityResult | IDeleteEntityResult;

const fetchGetApi = async (subUrl: string, token: string | null): Promise<any> => {
  const headers: Record<string, string> = {};
  if (token !== null) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return await Utils.fetchJson(`${apiUrl}/${subUrl}`, {
    method: "GET",
    headers,
  });
};

const fetchFormApi = async (subUrl: string, token: string | null, method: string, body?: string): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (token !== null) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return await Utils.fetchJson(`${apiUrl}/${subUrl}`, {
    method,
    headers,
    body,
  });
};

const fetchJsonApi = async (subUrl: string, token: string | null, method: string, body?: any): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token !== null) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return await Utils.fetchJson(`${apiUrl}/${subUrl}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
};

export const fetchAllowed = async (token: string | null): Promise<IAllowedDatabase> => {
  return await fetchJsonApi("permissions/allowed", token, "GET");
};

const fetchView = async (path: string, token: string | null, args: URLSearchParams): Promise<IViewExprResult> => {
  return await fetchJsonApi(`views/${path}/entries?${args}`, token, "GET");
};

const fetchViewInfo = async (path: string, token: string | null, args: URLSearchParams): Promise<IViewInfoResult> => {
  return await fetchJsonApi(`views/${path}/info?${args}`, token, "GET");
};

const convertArgs = (args: Record<string, any>): URLSearchParams => {
  const params = new URLSearchParams();
  Object.entries(args).forEach(([name, arg]) => {
    params.append(name, JSON.stringify(arg));
  });
  return params;
};

export const fetchAnonymousView = async (token: string | null, query: string, args: Record<string, any>): Promise<IViewExprResult> => {
  const search = convertArgs(args);
  search.set("__query", query);
  return await fetchView("anonymous", token, search);
};

export const fetchNamedView = async (token: string | null, ref: IUserViewRef, args: Record<string, any>): Promise<IViewExprResult> => {
  return await fetchView(`by_name/${ref.schema}/${ref.name}`, token, convertArgs(args));
};

export const fetchNamedViewInfo = async (token: string | null, ref: IUserViewRef): Promise<IViewInfoResult> => {
  return await fetchViewInfo(`by_name/${ref.schema}/${ref.name}`, token, new URLSearchParams());
};

export const getEntityInfo = async (token: string | null, ref: IEntityRef): Promise<IEntity> => {
  return await fetchJsonApi(`entity/${ref.schema}/${ref.name}`, token, "GET");
};

const changeEntity = async (path: string, method: string, token: string | null, ref: IEntityRef, body?: string): Promise<any> => {
  return await fetchFormApi(`entity/${ref.schema}/${ref.name}${path}`, token, method, body);
};

export const insertEntry = async (token: string | null, ref: IEntityRef, args: Record<string, any>): Promise<void> => {
  return await changeEntity("", "POST", token, ref, convertArgs(args).toString());
};

export const updateEntry = async (token: string | null, ref: IEntityRef, id: number, args: Record<string, any>): Promise<void> => {
  await changeEntity(`/${id}`, "PUT", token, ref, convertArgs(args).toString());
};

export const deleteEntry = async (token: string | null, ref: IEntityRef, id: number): Promise<void> => {
  await changeEntity(`/${id}`, "DELETE", token, ref);
};

export const runTransaction = async (token: string | null, ops: TransactionOp[]): Promise<TransactionResult[]> => {
  return await fetchJsonApi("transaction", token, "POST", { operations: ops });
};

export const saveSchema = async (token: string | null, schema: string): Promise<object> => {
  return await fetchGetApi(`layouts/${schema}`, token);
};

export const restoreSchema = async (token: string | null, schema: string, data: object): Promise<void> => {
  await fetchJsonApi(`layouts/${schema}`, token, "PUT", data);
};
