import FunDBAPI, {
  IEntityRef,
  IFieldRef,
  IViewExprResult,
} from '@ozma-io/ozmadb-js/client'

import { store } from '@/main'

// Rows come back ordered so that the winning attributes for a field are seen first.
const query = `
{ $schema string, $entity string }:
SELECT field_name, attributes
FROM public.fields_attributes
WHERE schema_id=>name = $schema
  AND field_entity_id=>name = $entity
ORDER BY priority DESC
`

export interface IFieldAttributesRow {
  fieldName: string
  attributes: string
}

export interface IEntityFieldAttributes {
  // Every row for the entity, still ordered by descending priority.
  rows: IFieldAttributesRow[]
  // Winning (highest priority) attributes per field.
  byField: Record<string, string>
}

const entityKey = (entity: IEntityRef) => `${entity.schema}.${entity.name}`

const fetchEntityFieldAttributes = async (
  entity: IEntityRef,
): Promise<IEntityFieldAttributes> => {
  const res: IViewExprResult = await store.dispatch(
    'callApi',
    {
      func: (api: FunDBAPI) =>
        api.getAnonymousUserView(query, {
          schema: entity.schema,
          entity: entity.name,
        }),
    },
    { root: true },
  )

  const fieldNameIndex = res.info.columns.findIndex(
    (column) => column.name === 'field_name',
  )
  const attributesIndex = res.info.columns.findIndex(
    (column) => column.name === 'attributes',
  )

  const rows: IFieldAttributesRow[] = []
  const byField: Record<string, string> = {}
  res.result.rows.forEach((row) => {
    const fieldName = row.values[fieldNameIndex]?.value
    const attributes = row.values[attributesIndex]?.value
    if (typeof fieldName !== 'string' || typeof attributes !== 'string') {
      return
    }
    rows.push({ fieldName, attributes })
    if (!(fieldName in byField)) {
      byField[fieldName] = attributes
    }
  })

  return { rows, byField }
}

const pending = new Map<string, Promise<IEntityFieldAttributes>>()

/* Form controls and reference selects each used to ask for their own field's
   attributes, which meant one request per rendered field — around ninety on a large
   form, half of them exact duplicates fired in the same tick. These are schema
   metadata shared by every control on the entity, so fetch them once per entity and
   let concurrent callers share the in-flight promise. */
export const getEntityFieldAttributes = (
  entity: IEntityRef,
): Promise<IEntityFieldAttributes> => {
  const key = entityKey(entity)
  let request = pending.get(key)
  if (request === undefined) {
    request = fetchEntityFieldAttributes(entity).catch((e) => {
      // A transient failure shouldn't disable styling for the rest of the session.
      pending.delete(key)
      throw e
    })
    pending.set(key, request)
  }
  return request
}

// Field attributes are entity metadata, so they are dropped together with the rest of
// it when the user asks for a reload.
export const clearFieldAttributesCache = () => {
  pending.clear()
}

export const getFieldAttributes = async (
  field: IFieldRef,
): Promise<string | null> => {
  const { byField } = await getEntityFieldAttributes(field.entity)
  return byField[field.name] ?? null
}
