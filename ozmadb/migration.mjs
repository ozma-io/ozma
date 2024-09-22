const commonViews = {
  // Internal APIs
  settings: `
WITH user_settings AS MATERIALIZED (
  SELECT
    name,
    value
  FROM
    ozma.user_settings
  WHERE
    user_id = $$user_id
)
SELECT
  name,
  value
FROM
  user_settings
UNION ALL
SELECT
  name, value
FROM
  ozma.settings
WHERE
  name NOT IN (SELECT name FROM user_settings)`,

  my_user_id: 'SELECT $$user_id',

  color_themes: `
SELECT
  id,
  schema_id=>name as schema_name,
  name,
  localized_name
FROM
  ozma.color_themes`,
  color_variants: `
  SELECT
    theme_id,
    name,
    foreground,
    border,
    background
  FROM
    ozma.color_variants`,

  iframe_markup_by_name: `
{ $schema string, $name string }:
SELECT
  markup
FROM
  "ozma"."iframe_markups"
WHERE
  schema_id=>name = $schema
  AND name = $name`,
  embedded_page_by_name: `
{ $schema string, $name string }:
SELECT
  markup
FROM
  "ozma"."embedded_pages"
WHERE
  schema_id=>name = $schema
  AND name = $name`,

  translations_by_language: `
{ $language string }:
SELECT
  schema_id=>name as schema_name,
  message,
  translation
FROM
  "ozma"."translations"
WHERE
  language = $language`,

  // Public APIs
  system_menu: `
SELECT
  @type = 'menu',
  schemas.name AS category_name,
  entities.name AS name @{ link = { schema: 'ozma', name: 'table-' || schemas.name || '-' || entities.name } }
FROM
  public.entities
  LEFT JOIN public.schemas ON schemas.id = entities.schema_id
ORDER BY entities.id`,
  user_view_by_name: `
{ $schema string, $name string }:
SELECT
  @type = 'form',
  @block_sizes = [
    6, 6,
    12
  ],
  schema_id,
  name,
  allow_broken,
  query @{
    form_block = 2,
    text_type = 'codeeditor',
  }
FROM
  public.user_views
WHERE schema_id=>name = $schema AND name = $name
FOR INSERT INTO public.user_views`,
}

const generateDefaultViews = (layout) => {
  return Object.fromEntries(
    Object.entries(layout.schemas).flatMap(([schemaName, schema]) => {
      return Object.entries(schema.entities).flatMap(([entityName, entity]) => {
        if (entity.isHidden) {
          return []
        }
        const sqlName = `${renderOzmaQLName(schemaName)}.${renderOzmaQLName(entityName)}`
        const fields = []
        if (entity.children.length > 0) {
          fields.push(renderOzmaQLName('sub_entity'))
        }
        Object.keys(entity.columnFields).forEach((columnField) => {
          fields.push(renderOzmaQLName(columnField))
        })
        Object.entries(entity.computedFields).forEach(
          ([computedField, comp]) => {
            if (!comp.isBroken) {
              fields.push(renderOzmaQLName(computedField))
            }
          },
        )

        const formName = `form-${schemaName}-${entityName}`
        const formQuery = `
{ $id reference(${sqlName}) }:
SELECT
  @type = 'form',
  ${fields.join(',\n  ')}
FROM ${sqlName}
WHERE id = $id
${entity.isAbstract ? '' : `FOR INSERT INTO ${sqlName}`}`

        const tableName = `table-${schemaName}-${entityName}`
        const tableQuery = `
SELECT
  @type = 'table',
  @create_link = &"${formName}",
  id @{ row_link = &"${formName}" },
  ${fields.join(',\n  ')}
FROM ${sqlName}
ORDER BY id
${entity.isAbstract ? '' : `FOR INSERT INTO ${sqlName}`}`

        return [
          [formName, formQuery],
          [tableName, tableQuery],
        ]
      })
    }),
  )
}

export default function getUserViews(layout) {
  const generated = generateDefaultViews(layout)
  const allViews = { ...commonViews, ...generated }
  return Object.fromEntries(
    Object.entries(allViews).map(([name, query]) => [name, query.trim()]),
  )
}
