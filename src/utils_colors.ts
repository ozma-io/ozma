import { rgba, toRgba, parseToRgba, readableColor, mix } from "color2k";
import { z } from "zod";
import FunDBAPI, { IViewExprResult, SchemaName, RowId } from "ozma-api";
import { store } from "@/main";
import { mapMaybe, objectMap, safeJsonParse } from "@/utils";

const ThemeRef = z.object({
  schema: z.string(),
  name: z.string(),
});

export type IThemeRef = z.infer<typeof ThemeRef>;

const orNull = <T, F>(func: (arg: T) => F) =>
  (arg: any) => {
    try {
      return func(arg as T);
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

type RawColorVariant = {
  [key in VariantKey]?: unknown;
};
export type ColorVariant = {
  [key in VariantKey]: string;
};

export type ThemeName = string;

export interface ITheme {
  localized: Record<string, string>;
  colorVariants: Record<string, ColorVariant>;
}

export type ThemesMap = Record<SchemaName, Record<ThemeName, ITheme>>;

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

const rawSimpleBootstrapColorVariants: Record<SimpleBootstrapVariantName, RawColorVariant> = {
  primary: { foreground: "#e8e6e3", background: "#007bff" },
  secondary: { foreground: "#e8e6e3", background: "#6c757d" },
  success: { foreground: "#e8e6e3", background: "#28a745" },
  warning: { foreground: "#e8e6e3", background: "#ffc107" },
  danger: { foreground: "#e8e6e3", background: "#dc3545" },
  info: { foreground: "#e8e6e3", background: "#17a2b8" },
  light: { foreground: "#212529", background: "#f8f9fa" },
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

export const transparentVariant = Object.fromEntries(variantKeys.map(key => [key, "transparent"])) as ColorVariant;

export const defaultVariantAttribute: ColorVariantAttribute = ({ type: "existing", className: "default" }) as const;
export const interfaceButtonVariant: ColorVariantAttribute = ({ type: "existing", className: "interfaceButton" }) as const;
export const outlinedInterfaceButtonVariant: ColorVariantAttribute = ({ type: "existing", className: "outlinedInterfaceButton" }) as const;

export const bootstrapVariantAttribute = (name: BootstrapVariantName) => ({ type: "existing", className: name }) as const;

const loadColorThemeHeaders = async (): Promise<Record<SchemaName, Record<ThemeName, { id: RowId; theme: ITheme }>>> => {
  const uvRef = { schema: "funapp", name: "color_themes" };
  const res: IViewExprResult = await store.dispatch("callApi", {
    func: (api: FunDBAPI) => api.getNamedUserView(uvRef),
  }, { root: true });

  const idColumnIndex = res.info.columns.findIndex(column => column.name === "id");
  const schemaNameColumnIndex = res.info.columns.findIndex(column => column.name === "schema_name");
  const nameColumnIndex = res.info.columns.findIndex(column => column.name === "name");
  const localizedNameColumnIndex = res.info.columns.findIndex(column => column.name === "localized_name");

  const themes: Record<SchemaName, Record<ThemeName, { id: RowId; theme: ITheme }>> = {};
  res.result.rows.forEach(row => {
    const schemaName = row.values[schemaNameColumnIndex].value as string;
    const name = row.values[nameColumnIndex].value as string;
    let schema = themes[schemaName];
    if (schema === undefined) {
      schema = {};
      themes[schemaName] = schema;
    }
    const id = row.values[idColumnIndex].value as RowId;
    const theme = {
      localized: row.values[localizedNameColumnIndex].value as Record<string, string>,
      colorVariants: {},
    };
    schema[name] = { id, theme };
  });
  return themes;
};

const loadColorVariants = async (): Promise<Record<RowId, Record<string, ColorVariant>>> => {
  const ref = { schema: "funapp", name: "color_variants" };
  const res: IViewExprResult = await store.dispatch("callApi", {
    func: (api: FunDBAPI) => api.getNamedUserView(ref),
  }, { root: true });

  const idColumnIndex = res.info.columns.findIndex(column => column.name === "theme_id");
  const nameColumnIndex = res.info.columns.findIndex(column => column.name === "name");
  const columnIndexes = mapMaybe((column, i) => {
    if (column.name === "theme_id" || column.name === "name") {
      return undefined;
    } else {
      return i;
    }
  }, res.info.columns);

  const themes: Record<RowId, Record<string, ColorVariant>> = {};
  res.result.rows.forEach(row => {
    const colors = Object.fromEntries(columnIndexes.map(index => [res.info.columns[index].name, row.values[index].value])) as RawColorVariant;
    const id = row.values[idColumnIndex].value as RowId;
    const name = row.values[nameColumnIndex].value as string;
    let theme = themes[id];
    if (theme === undefined) {
      theme = {};
      themes[id] = theme;
    }
    theme[name] = colorVariantFromRaw(colors);
    return [id, colors];
  });
  return themes;
};

export const loadThemes = async (): Promise<ThemesMap> => {
  const themes = await loadColorThemeHeaders();
  const colorVariantRows = await loadColorVariants();
  return Object.fromEntries(Object.entries(themes).map(([schemaName, schemaHeaders]) => {
    const schema = Object.fromEntries(Object.entries(schemaHeaders).map(([themeName, { id, theme }]) => {
      const colorVariants = colorVariantRows[id];
      if (colorVariants !== undefined) {
        theme.colorVariants = colorVariants;
      }
      return [themeName, theme];
    }));
    return [schemaName, schema];
  }));
};

const colorVariantPropToCssVariableEntry = (variantKey: VariantKey, color: string): [ColorVariantCssVariableName, string] =>
  [`--${variantKey}Color` as const, color];

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

export type ColorVariantClassName = string;
export type ColorVariantFullClassName = `${string}-variant`;

export type ColorVariantAttribute =
  | { type: "existing"; className: ColorVariantClassName }
  | { type: "inline"; variables: ColorVariantCssVariables };

export const colorVariantFromAttribute = (attribute: unknown, defaultVariant = defaultVariantAttribute): ColorVariantAttribute =>
  typeof attribute === "string"
    ? { type: "existing", className: `${attribute}` }
    : typeof attribute === "object" && attribute !== null
      ? { type: "inline", variables: colorVariantToCssVariables(colorVariantFromRaw(attribute)) }
      : defaultVariant;

export const getColorVariantAttributeClassName = (attribute: ColorVariantAttribute): ColorVariantFullClassName | null =>
  attribute?.type === "existing" ? `${attribute.className}-variant` as const : null;

export const getColorVariantAttributeVariables = (attribute: ColorVariantAttribute): ColorVariantCssVariables | null =>
  attribute?.type === "inline" ? attribute.variables : null;

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

export const getPreferredTheme = (themes: ThemesMap, defaultSchema?: SchemaName): IThemeRef | null => {
  // FIXME: use prefers-color-scheme for user browser dark theme when we will fix all dark theme design issues
  // const prefersDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const prefersDarkTheme = false;

  const storedTheme = ThemeRef.safeParse(safeJsonParse(localStorage.getItem("preferredTheme")));

  if (storedTheme.success) {
    const themesSchema = themes[storedTheme.data.schema];
    if (themesSchema !== undefined && storedTheme.data.name in themesSchema) {
      return storedTheme.data;
    }
    console.error(`User theme ${storedTheme.data.schema}.${storedTheme.data.name} is not defined`);
  }

  const myDefaultSchema = defaultSchema ?? "user";

  const tryFindTheme = (themeName: string): IThemeRef | null => {
    const def = themes[myDefaultSchema]?.[themeName];
    if (def) {
      return { schema: myDefaultSchema, name: themeName };
    } else {
      const fallback = Object.entries(themes).find(([schemaName, schema]) => themeName in schema);
      if (fallback) {
        return { schema: fallback[0], name: themeName };
      } else {
        return null;
      }
    }
  };

  if (prefersDarkTheme) {
    const darkScheme = tryFindTheme("dark");
    if (darkScheme) {
      return darkScheme;
    }
  }

  return tryFindTheme("light");
};

export type ColorVariantCssVariableName = `--${VariantKey}Color`;
export type ColorVariantCssVariables = Record<ColorVariantCssVariableName, string>;
