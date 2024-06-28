import type {
  ValueType,
  FieldType,
  IFieldRef,
  IEntityRef,
  IEntity,
  IExecutedRow,
  IResultViewInfo,
  ScalarFieldType,
  IScalarSimpleType,
  SimpleType,
} from '@ozma-io/ozmadb-js/client'
import moment, {
  Moment,
  Duration,
  MomentInput,
  DurationInputArg1,
} from 'moment'

import { deepEquals } from '@/utils'
import { i18n } from '@/modules'

// Date/time is stored as Moment objects in UTC.
export const localDateFormat = 'L'
export const dateFormat = 'YYYY-MM-DD'
export const localDateTimeFormat = 'L LT'

export interface IFieldInfo {
  fieldType: FieldType
  isNullable: boolean
}

export const equalEntityRef = (a: IEntityRef, b: IEntityRef) => {
  return a.schema === b.schema && a.name === b.name
}

export const equalFieldRef = (a: IFieldRef, b: IFieldRef) => {
  return equalEntityRef(a.entity, b.entity) && a.name === b.name
}

export const inheritedFromEntity = (
  entityRef: IEntityRef,
  entity: IEntity,
  otherRef: IEntityRef,
) => {
  return (
    equalEntityRef(entityRef, otherRef) ||
    entity.children.some((childRef) => equalEntityRef(childRef.ref, otherRef))
  )
}

export const parentOfEntity = (
  entityRef: IEntityRef,
  entity: IEntity,
  otherRef: IEntityRef,
) => {
  return (
    equalEntityRef(entityRef, otherRef) ||
    entity.parents.some((parentRef) => equalEntityRef(parentRef, otherRef))
  )
}

export interface IUpdatedValue {
  // "edited" value - may come in several different types, like parsed moment date or a string for a "datetime" field.
  rawValue: unknown
  // `undefined` here means that value didn't pass validation
  value: unknown
}

// Should be in sync with `valueFromRaw` and be idempotent.
// TODO: deprecate this in favor of customizable `formatValue`.
export const valueToText = (valueType: ValueType, value: unknown): string => {
  if (typeof value === 'string') {
    return value
  } else if (value === undefined || value === null) {
    return ''
  } else if (valueType.type === 'date') {
    return (value as Moment).locale(i18n.locale).format(localDateFormat)
  } else if (
    valueType.type === 'datetime' ||
    valueType.type === 'localdatetime'
  ) {
    return (value as Moment)
      .locale(i18n.locale)
      .local()
      .format(localDateTimeFormat)
  } else if (valueType.type === 'interval') {
    return (value as Duration).asMilliseconds().toString()
  } else if (valueType.type === 'json') {
    return JSON.stringify(value)
  } else {
    return String(value)
  }
}

export const valueEquals = (
  valueType: ValueType,
  a: unknown,
  b: unknown,
): boolean => {
  if (a === undefined || b === undefined) {
    return false
  }

  if (
    valueType.type === 'date' ||
    valueType.type === 'datetime' ||
    valueType.type === 'localdatetime'
  ) {
    if (moment.isMoment(a)) {
      return a.isSame(b as MomentInput)
    } else {
      return a === b
    }
  } else if (valueType.type === 'interval') {
    if (moment.isDuration(a)) {
      return (
        a.asMilliseconds() ===
        moment.duration(b as DurationInputArg1).asMilliseconds()
      )
    } else {
      return a === b
    }
  } else {
    return deepEquals(a, b)
  }
}

const scalarFieldToValueType = (
  fieldType: ScalarFieldType,
): IScalarSimpleType => {
  if (fieldType.type === 'reference') {
    return { type: 'int' }
  } else if (fieldType.type === 'enum') {
    return { type: 'string' }
  } else {
    return fieldType
  }
}

export const fieldToValueType = (fieldType: FieldType): ValueType => {
  if (fieldType.type === 'array') {
    const subtype = scalarFieldToValueType(fieldType.subtype)
    return { type: 'array', subtype }
  } else {
    return scalarFieldToValueType(fieldType)
  }
}

// Checks if raw value is null.
export const valueIsNull = (value: unknown): value is null | undefined | '' =>
  value === null || value === undefined || value === ''

const convertArray = (
  entryType: FieldType,
  value: unknown[],
): unknown[] | undefined => {
  const converted = value.map((entry) =>
    valueFromRaw({ fieldType: entryType, isNullable: false }, entry),
  )
  if (converted.some((entry) => entry === undefined)) {
    return undefined
  } else {
    return converted
  }
}

const stringToMaybeBool = (str: string) => {
  const lowercased = str.toLowerCase()
  switch (lowercased) {
    case 'true':
      return true
    case 'false':
      return false
    default:
      return undefined
  }
}

export const valueFromRaw = (
  { fieldType, isNullable }: IFieldInfo,
  rawValue: unknown,
): unknown => {
  const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue

  if (valueIsNull(value)) {
    return isNullable ? null : undefined
  }

  switch (fieldType.type) {
    case 'string':
    case 'enum':
    case 'uuid':
      // Remove whitespaces.
      return typeof value === 'string' ? value : undefined
    case 'bool':
      switch (typeof value) {
        case 'boolean':
          return value
        case 'string':
          return stringToMaybeBool(value)
        default:
          return undefined
      }
    case 'array':
      if (value instanceof Array) {
        return convertArray(fieldType.subtype, value)
      } else if (typeof value === 'string') {
        return convertArray(fieldType.subtype, value.split(','))
      } else {
        return undefined
      }
    case 'date': {
      // We use local time for dates.
      {
        const date = moment(value as MomentInput, dateFormat, true)
        if (date.isValid()) {
          return date
        }
      }
      {
        const date = moment(value as MomentInput, localDateFormat, true)
        if (date.isValid()) {
          return date
        }
      }
      return undefined
    }
    case 'interval': {
      const duration = moment.duration(
        value as DurationInputArg1,
        'milliseconds',
      )
      if (duration.isValid()) {
        return duration
      }
      return undefined
    }
    case 'datetime': {
      {
        const dateTime = moment(value as MomentInput, true)
        if (dateTime.isValid()) {
          return dateTime.utc()
        }
      }
      {
        const dateTime = moment(value as MomentInput, localDateTimeFormat, true)
        if (dateTime.isValid()) {
          return dateTime.utc()
        }
      }
      return undefined
    }
    case 'decimal': {
      const decimal = Number(value)
      return Number.isFinite(decimal) ? decimal : undefined
    }
    case 'int':
    case 'reference': {
      const int = Number(value)
      return Number.isInteger(int) ? int : undefined
    }
    case 'json':
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch (e) {
          return undefined
        }
      } else {
        return value
      }
    default:
      throw new Error(`Invalid field type ${(fieldType as any).type}`)
  }
}

const deserializeScalarValueFunction = (
  scalarType: SimpleType,
): ((value: unknown) => unknown) | null => {
  if (scalarType === 'datetime') {
    return (value) => moment.utc(value as MomentInput, true)
  } else if (scalarType === 'localdatetime' || scalarType === 'date') {
    return (value) => moment(value as MomentInput, true)
  } else if (scalarType === 'interval') {
    return (value) => moment.duration(value as DurationInputArg1)
  } else {
    return null
  }
}

export const deserializeValueFunction = (
  valueType: ValueType,
): ((value: unknown) => unknown) | null => {
  if (valueType.type === 'array') {
    const deserializeItem = deserializeScalarValueFunction(
      valueType.subtype.type,
    )
    if (deserializeItem) {
      return (value) => (value as unknown[]).map(deserializeItem)
    } else {
      return null
    }
  } else {
    return deserializeScalarValueFunction(valueType.type)
  }
}

const tryDeserializeScalarValueFunction = (
  scalarType: SimpleType,
): ((value: unknown) => unknown | undefined) | null => {
  if (scalarType === 'datetime') {
    return (value) => {
      const conv = moment.utc(value as MomentInput, true)
      return conv.isValid() ? conv : undefined
    }
  } else if (scalarType === 'localdatetime' || scalarType === 'date') {
    return (value) => {
      const conv = moment(value as MomentInput, true)
      return conv.isValid() ? conv : undefined
    }
  } else if (scalarType === 'interval') {
    return (value) => {
      const conv = moment.duration(value as DurationInputArg1)
      return conv.isValid() ? conv : undefined
    }
  } else {
    return null
  }
}

export const tryDeserializeValueFunction = (
  valueType: ValueType,
): ((value: unknown) => unknown | undefined) | null => {
  if (valueType.type === 'array') {
    const deserializeItem = tryDeserializeScalarValueFunction(
      valueType.subtype.type,
    )
    if (deserializeItem) {
      return (value) => (value as unknown[]).map(deserializeItem)
    } else {
      return null
    }
  } else {
    return tryDeserializeScalarValueFunction(valueType.type)
  }
}

export const deserializeParsedRows = (
  info: IResultViewInfo,
  rows: IExecutedRow[],
) => {
  info.columns.forEach((columnInfo, colI) => {
    const deserializeOne = deserializeValueFunction(columnInfo.valueType)
    if (deserializeOne) {
      for (const row of rows) {
        const cell = row.values[colI]
        if (cell.value) {
          cell.value = deserializeOne(cell.value)
        }
      }
    }
  })
}

export const serializeValue = (
  fieldType: FieldType | ValueType,
  value: Exclude<unknown, undefined>,
): unknown => {
  if (value === null) {
    return null
  }

  if (fieldType.type === 'date') {
    return (value as Moment).format(dateFormat)
  } else if (fieldType.type === 'datetime') {
    return (value as Moment).toISOString()
  } else if (fieldType.type === 'interval') {
    return (value as Duration).toISOString()
  } else {
    return value
  }
}
