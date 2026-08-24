import { rgba, toRgba, parseToRgba, readableColor, mix } from 'color2k'
import { z } from 'zod'
import FunDBAPI, {
  IViewExprResult,
  SchemaName,
  RowId,
} from '@ozma-io/ozmadb-js/client'
import { store } from '@/main'
import { mapMaybe, objectMap, safeJsonParse } from '@/utils'

const ThemeRef = z.object({
  schema: z.string(),
  name: z.string(),
})

export type IThemeRef = z.infer<typeof ThemeRef>

// Reads the last theme chosen by the user, without validating it against
// loaded themes — usable before any server data arrives.
export const getStoredThemeRef = (): IThemeRef | null => {
  const storedTheme = ThemeRef.safeParse(
    safeJsonParse(localStorage.getItem('preferredTheme')),
  )
  return storedTheme.success ? storedTheme.data : null
}

const orNull =
  <T, F>(func: (arg: T) => F) =>
  (arg: any) => {
    try {
      return func(arg as T)
    } catch (e) {
      return null
    }
  }

const parseToRgbaOrNull = orNull(parseToRgba)
const toRgbaOrNull = orNull(toRgba)

export type Rgba = [r: number, g: number, b: number, a: number]
export type Hsla = [h: number, s: number, l: number, a: number]
export type Color = string

export const colorVariantKeys = [
  'foreground',
  'foregroundContrast',
  'foregroundDarker',
  'background',
  'backgroundDarker1',
  'backgroundDarker2',
  'border',
  'shadow',
] as const
export type ColorVariantKey = (typeof colorVariantKeys)[number]
export const styleVariantKeys = [
  'fontWeight',
  'fontStyle',
  'textDecoration',
] as const
export type StyleVariantKey = (typeof styleVariantKeys)[number]
export const variantKeys = [...colorVariantKeys, ...styleVariantKeys] as const
export type VariantKey = (typeof variantKeys)[number]

type RawColorVariant = {
  [key in VariantKey]?: unknown
} & {
  font_weight?: unknown
  font_style?: unknown
  text_decoration?: unknown
}
export type ColorVariant = {
  [key in VariantKey]: string
}

export type ThemeName = string

export interface ITheme {
  localized: Record<string, string>
  colorVariants: Record<string, ColorVariant>
}

export type ThemesMap = Record<SchemaName, Record<ThemeName, ITheme>>

const darkenOrLighten = (color: string, amount: number): string =>
  mix(color, readableColor(color), amount)
const lightenOrDarken = (color: string, amount: number): string =>
  mix(color, readableColor(readableColor(color)), amount)

export const colorVariantFromRaw = (raw: RawColorVariant): ColorVariant => {
  const background = toRgbaOrNull(raw.background) ?? rgba(0, 0, 0, 1)
  const foreground =
    toRgbaOrNull(raw.foreground) ?? darkenOrLighten(background, 0.8)
  const border = toRgbaOrNull(raw.border) ?? mix(background, 'black', 0.06)
  const shadow = toRgbaOrNull(raw.shadow) ?? rgba(15, 23, 42, 0.45)
  const backgroundDarker1 = mix(background, foreground, 0.05)
  const backgroundDarker2 = mix(background, foreground, 0.15)
  const foregroundContrast = readableColor(background)
  const foregroundDarker = mix(foreground, background, 0.5)
  const fontWeight = String(raw.fontWeight ?? raw.font_weight ?? 'normal')
  const fontStyle = String(raw.fontStyle ?? raw.font_style ?? 'normal')
  const textDecoration = String(
    raw.textDecoration ?? raw.text_decoration ?? 'none',
  )
  return {
    foreground,
    foregroundContrast,
    foregroundDarker,
    background,
    backgroundDarker1,
    backgroundDarker2,
    border,
    shadow,
    fontWeight,
    fontStyle,
    textDecoration,
  }
}

type SimpleBootstrapVariantName =
  | 'success'
  | 'primary'
  | 'secondary'
  | 'warning'
  | 'danger'
  | 'info'
  | 'light'
  | 'dark'

type OutlineBootstrapVariantName = `outline-${SimpleBootstrapVariantName}`

export type BootstrapVariantName =
  | SimpleBootstrapVariantName
  | OutlineBootstrapVariantName

const rawSimpleBootstrapColorVariants: Record<
  SimpleBootstrapVariantName,
  RawColorVariant
> = {
  primary: { foreground: '#e8e6e3', background: '#007bff' },
  secondary: { foreground: '#e8e6e3', background: '#6c757d' },
  success: { foreground: '#e8e6e3', background: '#28a745' },
  warning: { foreground: '#e8e6e3', background: '#ffc107' },
  danger: { foreground: '#e8e6e3', background: '#dc3545' },
  info: { foreground: '#e8e6e3', background: '#17a2b8' },
  light: { foreground: '#212529', background: '#f8f9fa' },
  dark: { foreground: '#e8e6e3', background: '#343a40' },
}

const simpleToOutline = (simple: RawColorVariant): RawColorVariant => ({
  background: 'transparent',
  foreground: simple.background,
  border: simple.background,
})

const rawOutlineBootstrapColorVariants: Record<
  OutlineBootstrapVariantName,
  RawColorVariant
> = Object.fromEntries(
  Object.entries(rawSimpleBootstrapColorVariants).map(([key, value]) => [
    `outline-${key}`,
    simpleToOutline(value),
  ]),
) as Record<OutlineBootstrapVariantName, RawColorVariant>

const rawBootstrapColorVariants = {
  ...rawSimpleBootstrapColorVariants,
  ...rawOutlineBootstrapColorVariants,
}

export const bootstrapColorVariants: Record<
  BootstrapVariantName,
  ColorVariant
> = objectMap(
  (value) => colorVariantFromRaw({ ...value }),
  rawBootstrapColorVariants,
)

export const transparentVariant = Object.fromEntries(
  variantKeys.map((key) => [key, 'transparent']),
) as ColorVariant

export const defaultVariantAttribute: ColorVariantAttribute = {
  type: 'existing',
  className: 'default',
} as const
export const interfaceButtonVariant: ColorVariantAttribute = {
  type: 'existing',
  className: 'interfaceButton',
} as const
export const outlinedInterfaceButtonVariant: ColorVariantAttribute = {
  type: 'existing',
  className: 'outlinedInterfaceButton',
} as const

export const bootstrapVariantAttribute = (name: BootstrapVariantName) =>
  ({ type: 'existing', className: name }) as const

const loadColorThemeHeaders = async (): Promise<
  Record<SchemaName, Record<ThemeName, { id: RowId; theme: ITheme }>>
> => {
  const uvRef = { schema: 'funapp', name: 'color_themes' }
  const res: IViewExprResult = await store.dispatch(
    'callApi',
    {
      func: (api: FunDBAPI) => api.getNamedUserView(uvRef),
    },
    { root: true },
  )

  const idColumnIndex = res.info.columns.findIndex(
    (column) => column.name === 'id',
  )
  const schemaNameColumnIndex = res.info.columns.findIndex(
    (column) => column.name === 'schema_name',
  )
  const nameColumnIndex = res.info.columns.findIndex(
    (column) => column.name === 'name',
  )
  const localizedNameColumnIndex = res.info.columns.findIndex(
    (column) => column.name === 'localized_name',
  )

  const themes: Record<
    SchemaName,
    Record<ThemeName, { id: RowId; theme: ITheme }>
  > = {}
  res.result.rows.forEach((row) => {
    const schemaName = row.values[schemaNameColumnIndex].value as string
    const name = row.values[nameColumnIndex].value as string
    let schema = themes[schemaName]
    if (schema === undefined) {
      schema = {}
      themes[schemaName] = schema
    }
    const id = row.values[idColumnIndex].value as RowId
    const theme = {
      localized: row.values[localizedNameColumnIndex].value as Record<
        string,
        string
      >,
      colorVariants: {},
    }
    schema[name] = { id, theme }
  })
  return themes
}

const loadColorVariants = async (): Promise<
  Record<RowId, Record<string, ColorVariant>>
> => {
  const query = `SELECT theme_id, name, foreground, border, background, font_weight, font_style, text_decoration FROM funapp.color_variants`
  const res: IViewExprResult = await store.dispatch(
    'callApi',
    {
      func: (api: FunDBAPI) => api.getAnonymousUserView(query),
    },
    { root: true },
  )

  const idColumnIndex = res.info.columns.findIndex(
    (column) => column.name === 'theme_id',
  )
  const nameColumnIndex = res.info.columns.findIndex(
    (column) => column.name === 'name',
  )
  const columnIndexes = mapMaybe((column, i) => {
    if (column.name === 'theme_id' || column.name === 'name') {
      return undefined
    } else {
      return i
    }
  }, res.info.columns)

  const themes: Record<RowId, Record<string, ColorVariant>> = {}
  res.result.rows.forEach((row) => {
    const colors = Object.fromEntries(
      columnIndexes.map((index) => [
        res.info.columns[index].name,
        row.values[index].value,
      ]),
    ) as RawColorVariant
    const id = row.values[idColumnIndex].value as RowId
    const name = row.values[nameColumnIndex].value as string
    let theme = themes[id]
    if (theme === undefined) {
      theme = {}
      themes[id] = theme
    }
    theme[name] = colorVariantFromRaw(colors)
    return [id, colors]
  })
  return themes
}

export const loadThemes = async (): Promise<ThemesMap> => {
  const themes = await loadColorThemeHeaders()
  const colorVariantRows = await loadColorVariants()
  return Object.fromEntries(
    Object.entries(themes).map(([schemaName, schemaHeaders]) => {
      const schema = Object.fromEntries(
        Object.entries(schemaHeaders).map(([themeName, { id, theme }]) => {
          const colorVariants = colorVariantRows[id]
          if (colorVariants !== undefined) {
            theme.colorVariants = colorVariants
          }
          return [themeName, theme]
        }),
      )
      return [schemaName, schema]
    }),
  )
}

const colorVariantPropToCssVariableEntry = (
  variantKey: VariantKey,
  value: string,
): [ColorVariantCssVariableName, string] => [
  (colorVariantKeys.includes(variantKey as ColorVariantKey)
    ? `--${variantKey}Color`
    : `--${variantKey}Style`) as ColorVariantCssVariableName,
  value,
]

const colorVariantPropToCssVariable = (
  variantKey: VariantKey,
  value: string,
) => {
  const [name, _] = colorVariantPropToCssVariableEntry(variantKey, value)
  return `${name}: ${value};`
}

export const colorVariantToCssVariables = (
  variant: ColorVariant,
): ColorVariantCssVariables => {
  const entries = (Object.entries(variant) as [VariantKey, string][]).map(
    ([variantKey, color]) =>
      colorVariantPropToCssVariableEntry(variantKey, color),
  )
  const variables = Object.fromEntries(entries) as ColorVariantCssVariables
  return variables
}

export type ColorVariantClassName = string
export type ColorVariantFullClassName = `${string}-variant`

export type ColorVariantAttribute =
  | { type: 'existing'; className: ColorVariantClassName }
  | { type: 'inline'; variables: ColorVariantCssVariables }

export const colorVariantFromAttribute = (
  attribute: unknown,
  defaultVariant = defaultVariantAttribute,
): ColorVariantAttribute =>
  typeof attribute === 'string'
    ? { type: 'existing', className: `${attribute}` }
    : typeof attribute === 'object' && attribute !== null
      ? {
          type: 'inline',
          variables: colorVariantToCssVariables(colorVariantFromRaw(attribute)),
        }
      : defaultVariant

// For `cell_color`: if the string is a valid CSS color, treat it as a background color (inline).
// Otherwise treat it as a palette variant class name (same as `option_variant`).
export const colorVariantFromCellColor = (
  cellColor: string,
): ColorVariantAttribute =>
  cellColor === 'table_color'
    ? {
        type: 'inline',
        variables: {
          '--foregroundColor': 'var(--table-foregroundColor)',
          '--foregroundContrastColor': 'var(--table-foregroundContrastColor)',
          '--foregroundDarkerColor': 'var(--table-foregroundDarkerColor)',
          '--backgroundColor': 'var(--table-backgroundColor)',
          '--backgroundDarker1Color': 'var(--table-backgroundDarker1Color)',
          '--backgroundDarker2Color': 'var(--table-backgroundDarker2Color)',
          '--borderColor': 'var(--table-borderColor)',
          '--shadowColor': 'var(--table-shadowColor)',
          '--fontWeightStyle': 'var(--table-fontWeightStyle, normal)',
          '--fontStyleStyle': 'var(--table-fontStyleStyle, normal)',
          '--textDecorationStyle': 'var(--table-textDecorationStyle, none)',
        },
      }
    : toRgbaOrNull(cellColor) !== null
      ? {
          type: 'inline',
          variables: colorVariantToCssVariables(
            colorVariantFromRaw({ background: cellColor }),
          ),
        }
      : { type: 'existing', className: cellColor }

export const getColorVariantAttributeClassName = (
  attribute: ColorVariantAttribute,
): ColorVariantFullClassName | null =>
  attribute?.type === 'existing'
    ? (`${attribute.className}-variant` as const)
    : null

export const getColorVariantAttributeVariables = (
  attribute: ColorVariantAttribute,
): ColorVariantCssVariables | null =>
  attribute?.type === 'inline' ? attribute.variables : null

const globalVariantPrefix = 'global-'

const colorVariantToCssRule = (
  variantName: string,
  variant: ColorVariant,
): string => {
  if (variantName.startsWith(globalVariantPrefix)) {
    const cssVarName = `--${variantName.slice(globalVariantPrefix.length)}`
    return `:root {\n${cssVarName}: ${variant.background};\n}`
  }
  const variables = (Object.entries(variant) as [VariantKey, string][])
    .map(([variantKey, value]) =>
      colorVariantPropToCssVariable(variantKey, value),
    )
    .join('\n')
  return `.${variantName}-variant {\n${variables}\n}`
}

export const colorVariantsToCssRules = (
  colorVariants: Record<string, ColorVariant>,
): string[] => {
  const entries = Object.entries(colorVariants)
  const rules = entries.map(([variantName, variant]) =>
    colorVariantToCssRule(variantName, variant),
  )
  return rules
}

export const getPreferredTheme = (
  themes: ThemesMap,
  defaultSchema?: SchemaName,
): IThemeRef | null => {
  const storedTheme = getStoredThemeRef()

  if (storedTheme !== null) {
    const themesSchema = themes[storedTheme.schema]
    if (themesSchema !== undefined && storedTheme.name in themesSchema) {
      return storedTheme
    }
    console.error(`User theme ${storedTheme.schema}.${storedTheme.name} is not defined`)
  }

  const myDefaultSchema = defaultSchema ?? 'user'

  const tryFindTheme = (themeName: string): IThemeRef | null => {
    const def = themes[myDefaultSchema]?.[themeName]
    if (def) {
      return { schema: myDefaultSchema, name: themeName }
    } else {
      const fallback = Object.entries(themes).find(
        ([schemaName, schema]) => themeName in schema,
      )
      if (fallback) {
        return { schema: fallback[0], name: themeName }
      } else {
        return null
      }
    }
  }

  // Keep light as the default for users without an explicit preference.
  return (
    tryFindTheme('light') ??
    tryFindTheme('light-glass') ??
    tryFindTheme('dark') ??
    tryFindTheme('dark-glass') ??
    null
  )
}

export type ColorVariantCssVariableName =
  | `--${ColorVariantKey}Color`
  | `--${StyleVariantKey}Style`
export type ColorVariantCssVariables = Record<
  ColorVariantCssVariableName,
  string
>

// `option_variant` attributes often nest one CASE inside another (a theme check
// wrapping the value check), so the first END does not close the outer CASE.
// Walk case/end tokens by depth and return the whole balanced expression.
export const extractOptionVariantCase = (
  attributesText: string,
): string | null => {
  const start = attributesText.match(/option_variant\s*=\s*(?=case\b)/i)
  if (start?.index === undefined) {
    return null
  }

  const exprStart = start.index + start[0].length
  const tokens = /\b(case|end)\b/gi
  tokens.lastIndex = exprStart
  let depth = 0
  let token = tokens.exec(attributesText)
  while (token !== null) {
    if (token[1].toLowerCase() === 'case') {
      depth += 1
    } else {
      depth -= 1
      if (depth === 0) {
        return attributesText
          .slice(exprStart, token.index + token[0].length)
          .trim()
      }
    }
    token = tokens.exec(attributesText)
  }

  return null
}
