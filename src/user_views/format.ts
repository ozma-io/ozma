import moment from 'moment'
import { AttributeName, IExecutedValue, ValueType } from 'ozma-api'

import {
  getNumberFormatter,
  isValidNumberFormat,
  replaceHtmlLinksWithInfo,
} from '@/utils'
import {
  ConvertedBoundAttributesMap,
  currentValue,
  valueToPunnedText,
} from './combined'
import { valueToText } from '@/values'
import { i18n } from '@/modules'

export interface IFormatValueOpts {
  columnAttributeMappings?: ConvertedBoundAttributesMap
  getCellAttr?: (name: AttributeName) => unknown
}

export const tryFormatRawValue = (
  valueType: ValueType,
  rawValue: unknown,
  opts?: IFormatValueOpts,
): string | null => {
  if (typeof rawValue === 'string' || typeof rawValue === 'number') {
    const textMapping = opts?.columnAttributeMappings?.['text']
    if (textMapping) {
      const entry = textMapping.entries[rawValue]
      if (entry) {
        return String(entry)
      } else if (textMapping.default) {
        return String(textMapping.default)
      }
    }
  }

  if (typeof rawValue === 'number') {
    const numberFormatRaw = opts?.getCellAttr?.('number_format')
    if (typeof numberFormatRaw === 'string') {
      const numberFormat = numberFormatRaw.toLowerCase()
      if (isValidNumberFormat(numberFormat)) {
        const fractionDigitsRaw = opts?.getCellAttr?.('fraction_digits')
        const fractionDigits =
          typeof fractionDigitsRaw === 'number' ? fractionDigitsRaw : undefined
        return getNumberFormatter(numberFormat, fractionDigits).format(rawValue)
      }
    }
  }

  if (
    moment.isMoment(rawValue) &&
    opts?.getCellAttr?.('show_seconds') === true
  ) {
    return rawValue.local().format('L LTS')
  }

  return null
}

export const formatRawValue = (
  valueType: ValueType,
  rawValue: unknown,
  opts?: IFormatValueOpts,
): string => {
  const ret = tryFormatRawValue(valueType, rawValue, opts)
  if (ret === null) {
    return valueToText(valueType, rawValue)
  } else {
    return ret
  }
}

export const formatValue = (
  valueType: ValueType,
  value: IExecutedValue,
  opts?: IFormatValueOpts,
): string => {
  const ret = tryFormatRawValue(valueType, currentValue(value), opts)
  if (ret === null) {
    return valueToPunnedText(valueType, value)
  } else {
    return ret
  }
}

export const formatValueToHtmlWithInfo = (
  valueType: ValueType,
  value: IExecutedValue,
  opts?: IFormatValueOpts,
): { result: string; hasLinks: boolean } => {
  let valueHtml = formatValue(valueType, value, opts)
  let hasLinks = false
  if (typeof value.pun === 'string' || typeof value.value === 'string') {
    if (valueHtml.length > 1000) {
      valueHtml = valueHtml.slice(0, 1000) + i18n.tc('ellipsis')
    }
    const { result, hasLinks: resultHasLinks } =
      replaceHtmlLinksWithInfo(valueHtml)
    valueHtml = result
    hasLinks = resultHasLinks
  }
  return { result: valueHtml, hasLinks }
}

export const formatValueToHtml = (
  valueType: ValueType,
  value: IExecutedValue,
  opts?: IFormatValueOpts,
): string => {
  return formatValueToHtmlWithInfo(valueType, value, opts).result
}
