import { rgba, toRgba, parseToRgba, readableColor, mix } from "color2k";
import { IExecutedValue, IExecutedRow, IViewExprResult } from "ozma-api";
import { store } from "@/main";
import { default as Api } from "@/api";
// import type { ISettingsState } from "@/state/settings";
import { objectMap } from "./utils";

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

export type ColorVariantRow = {
  name: string;
  "theme_id": string;
} & {
  [key in VariantKey]: string | null;
};

export type RawColorVariant = {
  [key in VariantKey]?: unknown;
};
export type ColorVariant = {
  [key in VariantKey]: string;
};

export type ColorVariables = Record<string, string>;

export type ThemeName = string;
export type FullThemeName = { name: ThemeName; localized: Record<string, undefined> | null };
export type Theme = {
  themeName: FullThemeName;
  colorVariants: Record<string, ColorVariant>;
};

const darkenOrLighten = (color: string, amount: number): string => mix(color, readableColor(color), amount);
const lightenOrDarken = (color: string, amount: number): string => mix(color, readableColor(readableColor(color)), amount);

export const colorVariantFromRaw = (raw: RawColorVariant): ColorVariant => {
  const background = toRgbaOrNull(raw.background) ?? rgba(0, 0, 0, 1);
  const foreground = toRgbaOrNull(raw.foreground) ?? darkenOrLighten(background, 0.8);
  const border = toRgbaOrNull(raw.border) ?? mix(background, "black", 0.2);
  const backgroundDarker1 = mix(background, foreground, 0.05);
  const backgroundDarker2 = mix(background, foreground, 0.15);
  const foregroundContrast = readableColor(background);
  const foregroundDarker = mix(foreground, background, 0.5);
  return {
    foreground,
    foregroundContrast,
    foregroundDarker,
    background,
    backgroundDarker1,
    backgroundDarker2,
    border,
  };
};

export const transparentVariant = Object.fromEntries(variantKeys.map(key => [key, "transparent"])) as ColorVariant;

const rawSimpleBootstrapColorVariants: Record<SimpleBootstrapVariantName, RawColorVariant> = {
  primary: { foreground: "#e8e6e3", background: "#007bff" },
  secondary: { foreground: "#e8e6e3", background: "#6c757d" },
  success: { foreground: "#e8e6e3", background: "#28a745" },
  warning: { foreground: "#e8e6e3", background: "#ffc107" },
  danger: { foreground: "#e8e6e3", background: "#dc3545" },
  info: { foreground: "#e8e6e3", background: "#17a2b8" },
  light: { foreground: "#e8e6e3", background: "#f8f9fa" },
  dark: { foreground: "#e8e6e3", background: "#343a40" },
};
const simpleToOutline = (simple: RawColorVariant): RawColorVariant =>
  ({ background: "transparent", foreground: simple.background, border: simple.background });
const rawOutlineBootstrapColorVariants: Record<OutlineBootstrapVariantName, RawColorVariant> =
  Object.fromEntries(Object.entries(rawSimpleBootstrapColorVariants).map(([key, value]) =>
    [`outline-${key}`, simpleToOutline(value)])) as Record<OutlineBootstrapVariantName, RawColorVariant>;
const rawBootstrapColorVariants = { ...rawSimpleBootstrapColorVariants, ...rawOutlineBootstrapColorVariants };
export const bootstrapColorVariants: Record<BootstrapVariantName, ColorVariant> =
  objectMap(value => colorVariantFromRaw({ ...value }), rawBootstrapColorVariants);

const loadFullThemeNames = async (): Promise<FullThemeName[]> => {
  const ref = { schema: "funapp", name: "color_themes" };
  const res: IViewExprResult = await store.dispatch("callProtectedApi", {
    func: Api.getNamedUserView,
    args: [ref],
  }, { root: true });

  const nameColumnIndex = res.info.columns.findIndex(column => column.name === "name");
  const localizedNameColumnIndex = res.info.columns.findIndex(column => column.name === "localized_name");
  return res.result.rows.map(row => ({
    name: row.values[nameColumnIndex].value as string,
    localized: row.values[localizedNameColumnIndex].value as Record<string, undefined>,
  }));
};

const punOrValue = (value: IExecutedValue) => value.pun ?? value.value;

export const loadColorVariants = async () => {
  const ref = { schema: "funapp", name: "color_variants" };
  const res: IViewExprResult = await store.dispatch("callProtectedApi", {
    func: Api.getNamedUserView,
    args: [ref],
  }, { root: true });

  const columnNames = res.info.columns.map(column => column.name);
  const rowArrayToObject =
    (row: IExecutedRow) => Object.fromEntries(columnNames.map((name, index) => ([name, punOrValue(row.values[index])])));
  return (res.result.rows.map(rowArrayToObject) as ColorVariantRow[]);
};

export const loadThemes = async (): Promise<Theme[]> => {
  const themeNames = await loadFullThemeNames();
  const colorVariantRows = await loadColorVariants();
  const themes = themeNames.map(themeName => {
    const rowsForTheme = colorVariantRows.filter(row => row.theme_id === themeName.name);
    const colorVariants = Object.fromEntries(rowsForTheme.map(row => [row.name, colorVariantFromRaw(row)]));
    return {
      themeName,
      colorVariants,
    };
  });
  return themes;
};

const colorVariantPropToCssVariableEntry = (variantKey: VariantKey, color: string): [ColorVariantCssVariableName, string] =>
  [`--${variantKey}Color` as ColorVariantCssVariableName, color];

const colorVariantPropToCssVariable = (variantKey: VariantKey, color: string) => {
  const [name, _] = colorVariantPropToCssVariableEntry(variantKey, color);
  return `${name}: ${color};`;
};

export const colorVariantToCssVariables = (variant: ColorVariant): ColorVariantCssVariables => {
  const entries = (Object.entries(variant) as [VariantKey, string][])
    .map(([variantKey, color]) => colorVariantPropToCssVariableEntry(variantKey, color));
  const variables = Object.fromEntries(entries) as ColorVariantCssVariables;
  return variables;
};

export type ColorVariantClassName = `${string}-variant`;

export type ColorVariantAttribute =
  | { type: "existing"; className: ColorVariantClassName }
  | { type: "custom"; variables: ColorVariantCssVariables };

export const colorVariantFromAttribute = (attribute: unknown): ColorVariantAttribute =>
  typeof attribute === "string"
    ? { type: "existing", className: `${attribute}-variant` as ColorVariantClassName }
    : typeof attribute === "object" && attribute !== null
      ? { type: "custom", variables: colorVariantToCssVariables(colorVariantFromRaw(attribute)) }
      : { type: "existing", className: "default-variant" };

export const getColorVariantAttributeClassName = (attribute: ColorVariantAttribute): ColorVariantClassName | null =>
  attribute.type === "existing" ? attribute.className : null;

export const getColorVariantAttributeVariables = (attribute: ColorVariantAttribute): ColorVariantCssVariables | null =>
  attribute.type === "custom" ? attribute.variables : null;

const colorVariantToCssRule = (variantName: string, variant: ColorVariant): string => {
  const variables = (Object.entries(variant) as [VariantKey, string][])
    .map(([variantKey, value]) => colorVariantPropToCssVariable(variantKey, value)).join("\n");
  return `.${variantName}-variant {\n${variables}\n}`;
};

export const colorVariantsToCssRules = (colorVariants: Record<string, ColorVariant>): string[] => {
  const entries = Object.entries(colorVariants);
  const rules = entries.map(([variantName, variant]) => colorVariantToCssRule(variantName, variant));
  return rules;
};

export const getPreferredTheme = (themeNames: ThemeName[]): ThemeName => {
  const prefersDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;

  const storagedTheme = localStorage.getItem("preferredTheme");
  if (themeNames.includes(storagedTheme as any)) {
    return storagedTheme as string;
  } else if (prefersDarkTheme && themeNames.includes("dark")) {
    return "dark";
  } else {
    return "light";
  }
};

// In the end of file because template literals breaks tree-sitter highlighting
// See https://github.com/tree-sitter/tree-sitter-typescript/issues/136
type SimpleBootstrapVariantName =
  | "success"
  | "primary"
  | "secondary"
  | "warning"
  | "danger"
  | "info"
  | "light"
  | "dark";
type OutlineBootstrapVariantName = `outline-${SimpleBootstrapVariantName}`;
export type BootstrapVariantName =
  | SimpleBootstrapVariantName
  | OutlineBootstrapVariantName;

export type ColorVariantCssVariableName = `--${VariantKey}Color`;
export type ColorVariantCssVariables = Record<ColorVariantCssVariableName, string>;
