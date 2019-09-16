import { SchemaName, EntityName, FieldName, ValueType, FieldType, IResultViewInfo, IFieldRef, IEntityRef } from "@/api";
import { Moment } from "moment";
import * as moment from "moment";

// Date/time is stored as Moment objects in UTC.
export const dateFormat = "L";
export const dateTimeFormat = "L LTS";

export interface IFieldInfo {
    fieldType: FieldType;
    isNullable: boolean;
}

export type EntityFieldsInfo = Record<FieldName, IFieldInfo>;

export type FieldsInfo = Record<SchemaName, Record<EntityName, EntityFieldsInfo>>;

export const insertFieldsInfo = (fieldsInfo: FieldsInfo, info: IResultViewInfo) => {
    Object.values(info.domains).forEach(domain => {
        Object.values(domain).forEach(field => {
            if (field.field === null) {
                return;
            }

            const schemaName = field.ref.entity.schema;
            const entityName = field.ref.entity.name;
            const fieldName = field.ref.name;
            let schemaInfo = fieldsInfo[schemaName];
            if (schemaInfo === undefined) {
                schemaInfo = {};
                fieldsInfo[schemaName] = schemaInfo;
            }
            let entityInfo = schemaInfo[entityName];
            if (entityInfo === undefined) {
                entityInfo = {};
                schemaInfo[entityName] = entityInfo;
            }
            entityInfo[fieldName] = field.field;
        });
    });
};

export const equalEntityRef = (a: IEntityRef, b: IEntityRef) => {
    return a.schema === b.schema && a.name === b.name;
};

export const equalFieldRef = (a: IFieldRef, b: IFieldRef) => {
    return equalEntityRef(a.entity, b.entity) && a.name === b.name;
};

export interface IUpdatedValue {
    rawValue: any;
    // `undefined` here means that value didn't pass validation
    value: any;
    erroredOnce: boolean; // failed on submit
}

// Should be in sync with valueFromRaw and be idempotent.
export const valueToText = (valueType: ValueType, value: any): any => {
    if (typeof value === "string") {
        return value;
    } else if (value === undefined || value === null) {
        return "";
    } else if (valueType.type === "date") {
        return (value as Moment).format(dateFormat);
    } else if (valueType.type === "datetime") {
        return (value as Moment).local().format(dateTimeFormat);
    } else if (valueType.type === "json") {
        return JSON.stringify(value);
    } else {
        return String(value);
    }
};

// Checks if raw value is null.
export const valueIsNull = (value: any) => !(value !== null && value !== undefined && value !== "");

const convertArray = (entryType: FieldType, value: any[]): any[] | undefined => {
    const converted = value.map(entry => valueFromRaw({ fieldType: entryType, isNullable: false }, entry));
    if (converted.some(entry => entry === undefined)) {
        return undefined;
    } else {
        return converted;
    }
};

export const valueFromRaw = ({ fieldType, isNullable }: IFieldInfo, value: any): any => {
    if (valueIsNull(value)) {
        return isNullable ? null : undefined;
    } else if (fieldType.type === "string") {
        // Remove whitespaces
        return typeof value === "string" ? value.trim() : undefined;
    } else if (fieldType.type === "enum") {
        return typeof value === "string" ? value : undefined;
    } else if (fieldType.type === "bool") {
        if (typeof value === "boolean") {
            return value;
        } else if (typeof value === "string") {
            const str = value.toLowerCase();
            if (str === "false") {
                return false;
            } else if (str === "true") {
                return true;
            } else {
                return undefined;
            }
        } else {
            return undefined;
        }
    } else if (fieldType.type === "array") {
        if (value instanceof Array) {
            return convertArray({ type: fieldType.subtype }, value);
        } else if (typeof value === "string") {
            return convertArray({ type: fieldType.subtype }, value.split(","));
        } else {
            return undefined;
        }
    } else if (fieldType.type === "date") {
        const date = moment.utc(value, dateFormat);
        if (!date.isValid()) {
            return undefined;
        } else {
            return date;
        }
    } else if (fieldType.type === "datetime") {
        const date = moment(value, dateTimeFormat).utc();
        if (!date.isValid()) {
            return undefined;
        } else {
            return date;
        }
    } else if (fieldType.type === "decimal") {
        const f = Number(value);
        if (Number.isFinite(f)) {
            return f;
        } else {
            return undefined;
        }
    } else if (fieldType.type === "int" || fieldType.type === "reference") {
        const f = Number(value);
        if (Number.isInteger(f)) {
            return f;
        } else {
            return undefined;
        }
    } else if (fieldType.type === "json") {
        try {
            return JSON.parse(value);
        } catch (e) {
            return undefined;
        }
    } else {
        throw Error("Invalid field type");
    }
};
