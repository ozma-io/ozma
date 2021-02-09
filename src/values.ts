import { ValueType, FieldType, IFieldRef, IEntityRef } from "ozma-api";
import moment, { Moment, MomentInput } from "moment";

import { deepEquals } from "@/utils";

// Date/time is stored as Moment objects in UTC.
export const dateFormat = "L";
export const dateTimeFormat = "L LTS";

export interface IFieldInfo {
  fieldType: FieldType;
  isNullable: boolean;
}

export const equalEntityRef = (a: IEntityRef, b: IEntityRef) => {
  return a.schema === b.schema && a.name === b.name;
};

export const equalFieldRef = (a: IFieldRef, b: IFieldRef) => {
  return equalEntityRef(a.entity, b.entity) && a.name === b.name;
};

export interface IUpdatedValue {
  // "edited" value - may come in several different types, like parsed moment date or a string for a "datetime" field.
  rawValue: unknown;
  // `undefined` here means that value didn't pass validation
  value: unknown;
}

// Should be in sync with `valueFromRaw` and be idempotent.
export const valueToText = (valueType: ValueType, value: unknown): string => {
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

export const valueEquals = (valueType: ValueType, a: unknown, b: unknown) : boolean => {
  if (a === undefined || b === undefined) {
    return false;
  }

  if (valueType.type === "date" || valueType.type === "datetime") {
    if (moment.isMoment(a)) {
      return a.isSame(b as any);
    } else {
      return a === b;
    }
  } else {
    return deepEquals(a, b);
  }
};

// Checks if raw value is null.
export const valueIsNull = (value: unknown): value is (null | undefined | "") => value === null || value === undefined || value === "";

const convertArray = (entryType: FieldType, value: unknown[]): unknown[] | undefined => {
  const converted = value.map(entry => valueFromRaw({ fieldType: entryType, isNullable: false }, entry));
  if (converted.some(entry => entry === undefined)) {
    return undefined;
  } else {
    return converted;
  }
};

export const valueFromRaw = ({ fieldType, isNullable }: IFieldInfo, rawValue: unknown): unknown => {
  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

  if (valueIsNull(value)) {
    return isNullable ? null : undefined;
  } else if (fieldType.type === "string" || fieldType.type === "enum" || fieldType.type === "interval") {
    // Remove whitespaces
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
    // We use local time for dates.
    const date = moment(value as MomentInput, dateFormat);
    if (!date.isValid()) {
      return undefined;
    } else {
      return date;
    }
  } else if (fieldType.type === "datetime") {
    const date = moment(value as MomentInput, dateTimeFormat).utc();
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
      return JSON.parse(String(value));
    } catch (e) {
      return undefined;
    }
  } else {
    throw new Error("Invalid field type");
  }
};
