import type { ValueType, FieldType, IFieldRef, IEntityRef, IEntity } from "ozma-api";
import moment, { Moment, MomentInput } from "moment";

import { deepEquals } from "@/utils";

// Date/time is stored as Moment objects in UTC.
export const dateFormat = "L";
export const dateTimeFormat = "L LT";

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

export const inheritedFromEntity = (entityRef: IEntityRef, entity: IEntity, otherRef: IEntityRef) => {
  return equalEntityRef(entityRef, otherRef) || entity.children.some(childRef => equalEntityRef(childRef.ref, otherRef));
};

export const parentOfEntity = (entityRef: IEntityRef, entity: IEntity, otherRef: IEntityRef) => {
  return equalEntityRef(entityRef, otherRef) || entity.parents.some(parentRef => equalEntityRef(parentRef, otherRef));
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

const stringToMaybeBool = (str: string) => {
  const lowercased = str.toLowerCase();
  switch (lowercased) {
    case "true": return true;
    case "false": return false;
    default: return undefined;
  }
};

export const valueFromRaw = ({ fieldType, isNullable }: IFieldInfo, rawValue: unknown): unknown => {
  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

  if (valueIsNull(value)) {
    return isNullable ? null : undefined;
  }

  switch (fieldType.type) {
    case "string":
    case "enum":
    case "interval":
    case "uuid":
      // Remove whitespaces
      return typeof value === "string" ? value : undefined;
    case "bool":
      switch (typeof value) {
        case "boolean":
          return value;
        case "string":
          return stringToMaybeBool(value);
        default:
          return undefined;
      }
    case "array":
      if (value instanceof Array) {
        return convertArray({ type: fieldType.subtype }, value);
      } else if (typeof value === "string") {
        return convertArray({ type: fieldType.subtype }, value.split(","));
      } else {
        return undefined;
      }
    case "date": {
      // We use local time for dates.
      const date = moment(value as MomentInput, dateFormat);
      return date.isValid() ? date : undefined;
    }
    case "datetime": {
      const datetime = moment(value as MomentInput, dateTimeFormat).utc();
      return datetime.isValid() ? datetime : undefined;
    }
    case "decimal": {
      const decimal = Number(value);
      return Number.isFinite(decimal) ? decimal : undefined;
    }
    case "int":
    case "reference": {
      const int = Number(value);
      return Number.isInteger(int) ? int : undefined;
    }
    case "json":
      try {
        return JSON.parse(String(value));
      } catch (e) {
        return undefined;
      }
    default:
      throw new Error("Invalid field type");
  }
};
