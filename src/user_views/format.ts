import moment from "moment";
import { AttributeName, ValueType } from "ozma-api";

import { getNumberFormatter, isValidNumberFormat, replaceHtmlLinks } from "@/utils";
import { ConvertedBoundAttributesMap, currentValue, ICombinedValue, valueToPunnedText } from "./combined";
import { valueToText } from "@/values";

export interface IFormatValueOpts {
  columnAttributeMappings?: ConvertedBoundAttributesMap;
  getCellAttr?: (name: AttributeName) => unknown;
}

export const tryFormatRawValue = (valueType: ValueType, rawValue: unknown, opts?: IFormatValueOpts): string | null => {
  if (typeof rawValue === "string" || typeof rawValue === "number") {
    const textMapping = opts?.columnAttributeMappings?.["text"];
    if (textMapping) {
      const entry = textMapping.entries[rawValue];
      if (entry) {
        return String(entry);
      } else if (textMapping.default) {
        return String(textMapping.default);
      }
    }
  }

  if (typeof rawValue === "number") {
    const numberFormatRaw = opts?.getCellAttr?.("number_format");
    if (typeof numberFormatRaw === "string") {
      const numberFormat = numberFormatRaw.toLowerCase();
      if (isValidNumberFormat(numberFormat)) {
        const fractionDigitsRaw = opts?.getCellAttr?.("fraction_digits");
        const fractionDigits = typeof fractionDigitsRaw === "number" ? fractionDigitsRaw : undefined;
        return getNumberFormatter(numberFormat, fractionDigits).format(rawValue);
      }
    }
  }

  if (moment.isMoment(rawValue) && opts?.getCellAttr?.("show_seconds") === true) {
    return rawValue.local().format("L LTS");
  }

  return null;
};

export const formatRawValue = (valueType: ValueType, rawValue: unknown, opts?: IFormatValueOpts): string => {
  const ret = tryFormatRawValue(valueType, rawValue, opts);
  if (ret === null) {
    return valueToText(valueType, rawValue);
  } else {
    return ret;
  }
};

export const formatValue = (valueType: ValueType, value: ICombinedValue, opts?: IFormatValueOpts): string => {
  const ret = tryFormatRawValue(valueType, currentValue(value), opts);
  if (ret === null) {
    return valueToPunnedText(valueType, value);
  } else {
    return ret;
  }
};

export const formatValueToHtml = (valueType: ValueType, value: ICombinedValue, opts?: IFormatValueOpts): string => {
  let valueHtml = formatValue(valueType, value, opts);
  if (typeof value === "string") {
    if (valueHtml.length > 1000) {
      valueHtml = valueHtml.slice(0, 1000) + "...";
    }
    valueHtml = replaceHtmlLinks(valueHtml);
  }
  return valueHtml;
};
