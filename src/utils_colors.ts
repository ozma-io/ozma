import { rgba, toRgba, parseToRgba, readableColor, mix } from "color2k";
import { IViewExprResult } from "ozma-api";
import { store } from "@/main";
import { default as Api } from "@/api";
import R from "ramda";

const orNull = <T, F>(func: (arg: T) => F) =>
  (arg: unknown) => {
    try {
      return func(arg as any); // Function must throw exception when argument is wrong.
    } catch (e) {
      return null;
    }
  };

const parseToRgbaOrNull = orNull(parseToRgba);
const toRgbaOrNull = orNull(toRgba);

export type Rgba = [r: number, g: number, b: number, a: number];
export type Hsla = [h: number, s: number, l: number, a: number];
export type Color = string;

export const variantKeys = [
  "foreground",
  "foregroundContrast",
  "foregroundDarker",
  "background",
  "backgroundDarker1",
  "backgroundDarker2",
  "border",
] as const;
export type VariantKey = typeof variantKeys[number];

export type NamedColorVariant = {
  name: string;
} & {
  [key in VariantKey]: Color;
};

export type RawColorVariant = {
  name: unknown;
} & {
  [key in VariantKey]?: unknown;
};

export type InlineColorVariant = {
  [key in VariantKey]?: unknown;
};

export type ColorVariables = Record<string, string>;

const darkenOrLighten = (color: string, amount: number): string => mix(color, readableColor(color), amount);
const lightenOrDarken = (color: string, amount: number): string => mix(color, readableColor(readableColor(color)), amount);

export const colorVariantFromRaw = (raw: RawColorVariant): NamedColorVariant => {
  const background = toRgbaOrNull(raw.background) ?? rgba(0, 0, 0, 1);
  const foreground = toRgbaOrNull(raw.foreground) ?? darkenOrLighten(background, 0.8);
  const border = toRgbaOrNull(raw.border) ?? mix(background, "black", 0.2);
  const backgroundDarker1 = mix(background, foreground, 0.05);
  const backgroundDarker2 = mix(background, foreground, 0.15);
  const foregroundContrast = readableColor(background);
  const foregroundDarker = mix(foreground, background, 0.5);
  return {
    name: String(raw.name),
    foreground,
    foregroundContrast,
    foregroundDarker,
    background,
    backgroundDarker1,
    backgroundDarker2,
    border,
  };
};

export const colorVariablesFromVariant = (variant: NamedColorVariant): Record<string, string> => {
  return Object.entries(variant).reduce((curr, [key, value]) => {
    curr[`--${variant.name}-${key}Color`] = value;
    return curr;
  }, {} as Record<string, string>);
};

export const getVariantColorVariable = (componentName: string, variantName: string, key: VariantKey): [string, string] => {
  return [`--${componentName}-${key}Color`, `var(--${variantName}-${key}Color)`];
};

export const getVariantColorVariables = (componentName: string, variantName: string, keys = variantKeys) => {
  return Object.fromEntries(variantKeys.map(key => getVariantColorVariable(componentName, variantName, key)));
};

export const getColorVariables = (componentName: string, colorVariant: unknown): ColorVariables => {
  const isVaraiantName = typeof colorVariant === "string";
  if (isVaraiantName) {
    return getVariantColorVariables(componentName, colorVariant as string);
  }

  const isInlineVariant = typeof colorVariant === "object" && colorVariant !== null;
  if (isInlineVariant) {
    const variant = colorVariantFromRaw({ name: "inline", ...colorVariant as object });
    return Object.fromEntries(Object.keys(variant).map(key => [`--${componentName}-${key}Color`, (variant as any)[key]]));
  }

  return {};
};

export const loadColorVariants = async (ref: { schema: string; name: string }) => {
  const res: IViewExprResult = await store.dispatch("callProtectedApi", {
    func: Api.getNamedUserView,
    args: [ref],
  }, { root: true });
  const columnNames = res.info.columns.map(column => column.name);
  const rawVariants = res.result.rows.map(row =>
    Object.fromEntries(columnNames.map((name, index) => ([name, row.values[index].value]))));
  const requiredColumnNames = ["name", "background"];
  if (R.intersection(requiredColumnNames, columnNames).length === requiredColumnNames.length) {
    return rawVariants.map(colorVariantFromRaw as any);
  } else {
    console.warn("Table with color variants must have fields: " + requiredColumnNames.join(", "));
  }
  return [];
};
