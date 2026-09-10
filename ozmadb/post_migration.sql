-- Idempotent post-migration for time-based triggers and admin captions.
-- Safe to run multiple times on both fresh and existing installations.

BEGIN;

-- 1) Ensure physical columns in public.triggers exist.
ALTER TABLE IF EXISTS public.triggers
    ADD COLUMN IF NOT EXISTS on_time_fields text[] NOT NULL DEFAULT array[]::text[];

ALTER TABLE IF EXISTS public.triggers
    ADD COLUMN IF NOT EXISTS on_time_offset_value integer NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.triggers
    ADD COLUMN IF NOT EXISTS on_time_offset_unit text NOT NULL DEFAULT 'MINUTES';

-- 2) Ensure metadata rows in public.column_fields for new trigger fields.
WITH trigger_entity AS (
    SELECT e.id AS entity_id
    FROM public.entities e
    JOIN public.schemas s ON s.id = e.schema_id
    WHERE s.name = 'public' AND e.name = 'triggers'
),
new_fields(name, type, default_expr, is_nullable, is_immutable) AS (
    VALUES
        ('on_time_fields', 'array(string)', 'array[]', false, false),
        ('on_time_offset_value', 'int', '0', false, false),
        ('on_time_offset_unit', 'enum(''MINUTES'', ''HOURS'', ''DAYS'')', '''MINUTES''', false, false)
)
INSERT INTO public.column_fields (entity_id, name, type, "default", is_nullable, is_immutable)
SELECT t.entity_id, f.name, f.type, f.default_expr, f.is_nullable, f.is_immutable
FROM trigger_entity t
CROSS JOIN new_fields f
WHERE NOT EXISTS (
    SELECT 1
    FROM public.column_fields cf
    WHERE cf.entity_id = t.entity_id
      AND cf.name = f.name
);

-- 3) Add/refresh captions in admin field attributes for public.triggers fields.
WITH admin_schema AS (
    SELECT id AS schema_id
    FROM public.schemas
    WHERE name = 'admin'
),
trigger_entity AS (
    SELECT e.id AS entity_id
    FROM public.entities e
    JOIN public.schemas s ON s.id = e.schema_id
    WHERE s.name = 'public' AND e.name = 'triggers'
),
captions(field_name, attrs) AS (
    VALUES
        ('on_time_fields', '@{ caption = { schema: ''admin'', message: ''Time Fields'' } }'::text),
        ('on_time_offset_value', '@{ caption = { schema: ''admin'', message: ''Time Offset Value'' } }'::text),
        ('on_time_offset_unit', '@{ caption = { schema: ''admin'', message: ''Time Offset Unit'' } }'::text)
)
INSERT INTO public.fields_attributes (schema_id, field_entity_id, field_name, allow_broken, priority, attributes)
SELECT a.schema_id, t.entity_id, c.field_name, false, 0, c.attrs
FROM admin_schema a
CROSS JOIN trigger_entity t
CROSS JOIN captions c
WHERE NOT EXISTS (
    SELECT 1
    FROM public.fields_attributes fa
    WHERE fa.schema_id = a.schema_id
      AND fa.field_entity_id = t.entity_id
      AND fa.field_name = c.field_name
      AND fa.priority = 0
);

WITH captions(field_name, attrs) AS (
    VALUES
        ('on_time_fields', '@{ caption = { schema: ''admin'', message: ''Time Fields'' } }'::text),
        ('on_time_offset_value', '@{ caption = { schema: ''admin'', message: ''Time Offset Value'' } }'::text),
        ('on_time_offset_unit', '@{ caption = { schema: ''admin'', message: ''Time Offset Unit'' } }'::text)
)
UPDATE public.fields_attributes fa
SET attributes = c.attrs
FROM captions c
WHERE fa.field_name = c.field_name
  AND fa.priority = 0
  AND fa.schema_id = (SELECT id FROM public.schemas WHERE name = 'admin')
  AND fa.field_entity_id = (
      SELECT e.id
      FROM public.entities e
      JOIN public.schemas s ON s.id = e.schema_id
      WHERE s.name = 'public' AND e.name = 'triggers'
  );

-- 4) Ensure captions are present directly in user views.
UPDATE public.user_views uv
SET query = replace(
    query,
    $q$on_time_fields @{
        form_block = 1
    },$q$,
    $q$on_time_fields @{
        form_block = 1,
        caption = { schema: 'admin', message: 'Time Fields' }
    },$q$
)
WHERE uv.schema_id = (SELECT id FROM public.schemas WHERE name = 'admin')
  AND uv.name = 'trigger_form'
  AND strpos(query, $q$on_time_fields @{
        form_block = 1
    },$q$) > 0;

-- Fallback for older admin.trigger_form where on_time fields are absent.
UPDATE public.user_views uv
SET query = regexp_replace(
    query,
    'on_delete[[:space:]]*@\{[[:space:]]*form_block[[:space:]]*=[[:space:]]*1[[:space:]]*\},',
    $q$    on_delete @{
        form_block = 1
    },
    on_time_fields @{
        form_block = 1,
        caption = { schema: 'admin', message: 'Time Fields' }
    },
    on_time_offset_value @{
        form_block = 1,
        caption = { schema: 'admin', message: 'Time Offset Value' }
    },
    on_time_offset_unit @{
        form_block = 1,
        caption = { schema: 'admin', message: 'Time Offset Unit' }
    },
    time @{
        form_block = 1
    },$q$
)
WHERE uv.schema_id = (SELECT id FROM public.schemas WHERE name = 'admin')
  AND uv.name = 'trigger_form'
  AND strpos(query, 'on_time_fields') = 0;

UPDATE public.user_views uv
SET query = replace(
    query,
    $q$on_time_fields @{
        column_width = 120
    },$q$,
    $q$on_time_fields @{
        column_width = 120,
        caption = { schema: 'admin', message: 'Time Fields' }
    },$q$
)
WHERE uv.schema_id = (SELECT id FROM public.schemas WHERE name = 'admin')
  AND uv.name = 'triggers_table'
  AND strpos(query, $q$on_time_fields @{
        column_width = 120
    },$q$) > 0;

-- Fallback for older admin.triggers_table where on_time columns are absent.
UPDATE public.user_views uv
SET query = regexp_replace(
    query,
    'on_update_fields[[:space:]]*@\{[[:space:]]*column_width[[:space:]]*=[[:space:]]*100[[:space:]]*\},',
    $q$    on_update_fields @{
        column_width = 100
    },
    on_time_fields @{
        column_width = 120,
        caption = { schema: 'admin', message: 'Time Fields' }
    },
    on_time_offset_value @{
        column_width = 90,
        caption = { schema: 'admin', message: 'Time Offset Value' }
    },
    on_time_offset_unit @{
        column_width = 90,
        caption = { schema: 'admin', message: 'Time Offset Unit' }
    },
    on_delete @{
        column_width = 50
    },$q$
)
WHERE uv.schema_id = (SELECT id FROM public.schemas WHERE name = 'admin')
  AND uv.name = 'triggers_table'
  AND strpos(query, 'on_time_fields') = 0;

UPDATE public.user_views uv
SET query = replace(
    query,
    $q$on_time_offset_value @{
        column_width = 90
    },$q$,
    $q$on_time_offset_value @{
        column_width = 90,
        caption = { schema: 'admin', message: 'Time Offset Value' }
    },$q$
)
WHERE uv.schema_id = (SELECT id FROM public.schemas WHERE name = 'admin')
  AND uv.name = 'triggers_table'
  AND strpos(query, $q$on_time_offset_value @{
        column_width = 90
    },$q$) > 0;

UPDATE public.user_views uv
SET query = replace(
    query,
    $q$on_time_offset_unit @{
        column_width = 90
    },$q$,
    $q$on_time_offset_unit @{
        column_width = 90,
        caption = { schema: 'admin', message: 'Time Offset Unit' }
    },$q$
)
WHERE uv.schema_id = (SELECT id FROM public.schemas WHERE name = 'admin')
  AND uv.name = 'triggers_table'
  AND strpos(query, $q$on_time_offset_unit @{
        column_width = 90
    },$q$) > 0;

UPDATE public.user_views uv
SET query = replace(
    replace(
        replace(
            query,
            $q$  "on_time_fields",$q$,
            $q$  "on_time_fields" @{ caption = { schema: 'admin', message: 'Time Fields' } },$q$
        ),
        $q$  "on_time_offset_value",$q$,
        $q$  "on_time_offset_value" @{ caption = { schema: 'admin', message: 'Time Offset Value' } },$q$
    ),
    $q$  "on_time_offset_unit",$q$,
    $q$  "on_time_offset_unit" @{ caption = { schema: 'admin', message: 'Time Offset Unit' } },$q$
)
WHERE uv.schema_id = (SELECT id FROM public.schemas WHERE name = 'funapp')
  AND uv.name IN ('form-public-triggers', 'table-public-triggers');

-- Ensure offset columns are present in generated funapp views even if generator emitted only on_time_fields.
UPDATE public.user_views uv
SET query = replace(
    query,
    $q$  "on_time_fields" @{ caption = { schema: 'admin', message: 'Time Fields' } },$q$,
    $q$  "on_time_fields" @{ caption = { schema: 'admin', message: 'Time Fields' } },
  "on_time_offset_value" @{ caption = { schema: 'admin', message: 'Time Offset Value' } },
  "on_time_offset_unit" @{ caption = { schema: 'admin', message: 'Time Offset Unit' } },$q$
)
WHERE uv.schema_id = (SELECT id FROM public.schemas WHERE name = 'funapp')
  AND uv.name IN ('form-public-triggers', 'table-public-triggers')
  AND strpos(query, '"on_time_fields" @{ caption = { schema: ''admin'', message: ''Time Fields'' } },') > 0
  AND strpos(query, 'on_time_offset_value') = 0;

-- 5) Theme variant typography fields for existing instances.
ALTER TABLE IF EXISTS funapp.color_variants
  ADD COLUMN IF NOT EXISTS font_weight text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS font_style text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS text_decoration text DEFAULT 'none';

WITH color_variants_entity AS (
    SELECT e.id AS entity_id
    FROM public.entities e
    JOIN public.schemas s ON s.id = e.schema_id
    WHERE s.name = 'funapp' AND e.name = 'color_variants'
),
new_fields(name, type, default_expr, is_nullable, is_immutable) AS (
    VALUES
        ('font_weight', 'string', '''normal''', true, false),
        ('font_style', 'string', '''normal''', true, false),
        ('text_decoration', 'string', '''none''', true, false)
)
INSERT INTO public.column_fields (entity_id, name, type, "default", is_nullable, is_immutable)
SELECT t.entity_id, f.name, f.type, f.default_expr, f.is_nullable, f.is_immutable
FROM color_variants_entity t
CROSS JOIN new_fields f
WHERE NOT EXISTS (
    SELECT 1
    FROM public.column_fields cf
    WHERE cf.entity_id = t.entity_id
      AND cf.name = f.name
);

UPDATE public.user_views uv
SET query = replace(
    query,
    $q$    background
  FROM$q$,
    $q$    background,
    font_weight,
    font_style,
    text_decoration
  FROM$q$
)
WHERE uv.schema_id = (SELECT id FROM public.schemas WHERE name = 'funapp')
  AND uv.name = 'color_variants'
  AND strpos(query, 'font_weight') = 0;

-- 6) Theme-level table background as dedicated color variant row.
UPDATE funapp.color_variants cv
SET background = '#f3f4f8'
FROM funapp.color_themes ct
WHERE cv.theme_id = ct.id
  AND ct.schema_id = (SELECT id FROM public.schemas WHERE name = 'admin')
  AND ct.name = 'light_old'
  AND cv.name = 'table-background';

INSERT INTO funapp.color_variants (
  name,
  theme_id,
  foreground,
  background,
  border,
  font_weight,
  font_style,
  text_decoration
)
SELECT
  'table-background',
  ct.id,
  NULL,
  '#f3f4f8',
  NULL,
  'normal',
  'normal',
  'none'
FROM funapp.color_themes ct
WHERE ct.schema_id = (SELECT id FROM public.schemas WHERE name = 'admin')
  AND ct.name = 'light_old'
  AND NOT EXISTS (
    SELECT 1
    FROM funapp.color_variants cv
    WHERE cv.theme_id = ct.id
      AND cv.name = 'table-background'
  );

-- 7) Exactly-once history table for time triggers.
CREATE SEQUENCE IF NOT EXISTS public.time_trigger_fired_id_seq;

CREATE TABLE IF NOT EXISTS public.time_trigger_fired (
  id integer NOT NULL DEFAULT nextval('public.time_trigger_fired_id_seq'),
  trigger_schema text NOT NULL,
  trigger_entity_schema text NOT NULL,
  trigger_entity_name text NOT NULL,
  trigger_name text NOT NULL,
  event_entity_schema text NOT NULL,
  event_entity_name text NOT NULL,
  root_entity_schema text NOT NULL,
  root_entity_name text NOT NULL,
  row_id integer NOT NULL,
  field_name text NOT NULL,
  offset_value integer NOT NULL,
  offset_unit text NOT NULL,
  due_at timestamp with time zone NOT NULL,
  fired_at timestamp with time zone NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.time_trigger_fired'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.time_trigger_fired
      ADD CONSTRAINT time_trigger_fired_pkey PRIMARY KEY (id);
  END IF;
END
$$;

ALTER SEQUENCE public.time_trigger_fired_id_seq
  OWNED BY NONE;

CREATE UNIQUE INDEX IF NOT EXISTS __index__time_trigger_fired__task
  ON public.time_trigger_fired (
    trigger_schema,
    trigger_entity_schema,
    trigger_entity_name,
    trigger_name,
    event_entity_schema,
    event_entity_name,
    row_id,
    field_name
  );

CREATE INDEX IF NOT EXISTS __index__time_trigger_fired__fired_at
  ON public.time_trigger_fired (fired_at, id);

CREATE INDEX IF NOT EXISTS __index__time_trigger_fired__root_row
  ON public.time_trigger_fired (root_entity_schema, root_entity_name, row_id);

-- 7) Fix potentially stale sequences to avoid duplicate key errors.
DO $$
BEGIN
    IF to_regclass('public.__idseq__fields_attributes') IS NOT NULL THEN
        PERFORM setval(
            'public.__idseq__fields_attributes',
            COALESCE((SELECT MAX(id) + 1 FROM public.fields_attributes), 1),
            false
        );
    END IF;

    IF to_regclass('public.__idseq__column_fields') IS NOT NULL THEN
        PERFORM setval(
            'public.__idseq__column_fields',
            COALESCE((SELECT MAX(id) + 1 FROM public.column_fields), 1),
            false
        );
    END IF;

    IF to_regclass('public.__idseq__indexes') IS NOT NULL THEN
        PERFORM setval(
            'public.__idseq__indexes',
            COALESCE((SELECT MAX(id) + 1 FROM public.indexes), 1),
            false
        );
    END IF;
END
$$;

COMMIT;
