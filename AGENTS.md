# AGENTS.md — Правила работы с ozma

Инструкции для AI-агентов (Claude Code и др.) по работе с этим репозиторием.

---

## Стек

- **Vue 2** + vue-class-component + vue-property-decorator (TypeScript)
- **Bootstrap-Vue** для сетки (`b-row`, `b-col`) и компонентов
- **SCSS** с BEM-подобными именами, `::v-deep` для проникновения в дочерние компоненты
- **OzmaDB (FunDB)** — бэкенд: данные и метаданные в одном месте, запросы на FunQL
- **Keycloak** — авторизация (realm `ozma`)
- **Caddy** — реверс-прокси: `/api/*` → ozmadb, `/auth/*` → keycloak, остальное → SPA

---

## Локальная разработка и деплой

### Сборка и деплой UI (быстрый путь)

```bash
yarn build
./local_rebuild_and_publish.sh --only_ui --no_rebuild
```

`--no_rebuild` копирует локальный `dist/` в уже запущенный контейнер вместо пересборки образа — намного быстрее.

### Полная пересборка UI-образа

```bash
./local_rebuild_and_publish.sh --only_ui
```

### Пересборка ozmadb из исходников

```bash
./local_rebuild_and_publish.sh --only_db
```

Исходники ozmadb: `/Users/vientooscuro/SyncFolder/ozmadb`

Переменная `OZMADB_LOCAL_DIR` задаёт путь (по умолчанию `/Users/vientooscuro/SyncFolder/ozmadb`).

### Полная пересборка всего

```bash
./local_rebuild_and_publish.sh
```

### Порты

- UI + API: `http://localhost:9080`
- HTTPS: `https://localhost:9443`

---

## MCP-серверы

Два MCP-сервера для OzmaDB:

| Имя          | Назначение                        |
|--------------|-----------------------------------|
| `ozma`       | Production                        |
| `Ozma-Local` | Локальный Docker-инстанс          |

**Всегда использовать `Ozma-Local` для разработки и тестирования.** Production (`ozma`) не трогать без явного указания пользователя.

---

## Работа с FunQL / user views

### safe_update_view_query

При использовании `safe_update_view_query` в режиме `from_text`/`to_text`:

- Точное совпадение пробелов и переносов строк обязательно — любое отличие даёт "No occurrences"
- При ошибке использовать `new_query` (полная перезапись)
- Всегда указывать `validate_before_commit: true`

### validate_funql

Инструмент использует POST `/views/anonymous/info` с телом `{"Query": "..."}` — не GET. Это уже исправлено в сервере OzmaMCP.

### Атрибуты колонок для форм

| Атрибут | Тип | Описание |
|---|---|---|
| `form_block` | int | Номер блока (0-based, по `@block_sizes`) |
| `form_sub_block` | int | Номер под-блока внутри блока |

### Атрибуты таблицы

| Атрибут | Тип | Описание |
|---|---|---|
| `caption_lines` | int | Сколько строк отводится под заголовок колонки. `1` (по умолчанию) – прежнее поведение: одна строка, дальше многоточие. `0` – сколько угодно строк. `N` – не больше N строк, дальше многоточие. Читается через `getColumnAttr`, поэтому работает и как view-атрибут (на всю таблицу), и как атрибут отдельной колонки. При значении, отличном от `1`, высота шапки перестаёт быть фиксированной и растёт под содержимое: `min-height` остаётся прежней. |

```sql
SELECT
    @type = 'table',
    @caption_lines = 2,
    ...
```

### View-атрибуты для форм

| Атрибут | Формат | Описание |
|---|---|---|
| `@block_sizes` | `array[int]` | Ширина каждого блока (из 12) |
| `@sub_block_titles` | `{"blockIdx": {"subBlockIdx": "Title"}}` | Заголовки под-блоков |
| `@sub_block_colors` | `{"blockIdx": {"subBlockIdx": "rgba(...)"}}` | Цвет фона под-блока |

Пример:
```sql
@sub_block_colors = {
    "1": {
        "0": 'rgba(99, 102, 241, 0.12)',
        "1": 'rgba(20, 184, 166, 0.12)'
    }
}
```

---

## Архитектура форм

### Типы GridElement

```
IGridInput          — одно поле
IGridSection        — плоский список полей (нет form_sub_block)
IGridSectionWithSubBlocks — сгруппированные под-блоки
```

### IGridSubBlock

```typescript
{
  title?: string      // из @sub_block_titles
  color?: string      // из @sub_block_colors → CSS --sub-block-color
  hasCard: boolean    // true если form_sub_block >= 0
  content: GridElement[]
}
```

### Классы CSS

| Класс | Назначение |
|---|---|
| `.first_level_grid_block` | Основной блок формы (с фоном) |
| `.first_level_grid_block.has-sub-blocks` | Блок с под-блоками (прозрачный) |
| `.form_sub_block` | Карточка под-блока |
| `.form_sub_block--unstyled` | Под-блок без стилизации (настройка выключена) |
| `.form_inline_block` | Элементы без form_sub_block внутри секции с под-блоками |

### Настройка пользователя: `form_sub_blocks`

- Хранится как user setting
- По умолчанию: `false` (блоки выключены)
- При `false`: `gridBlocks` возвращает плоские секции, игнорируя `form_sub_block`
- Переключается в меню профиля

---

## CSS / темы

### Структура тем

- `data-theme-style` на `<html>` — стиль темы (`dark-glass`, `light-glass`, пусто)
- `data-theme` на `<html>` — цветовая схема
- Глобальные стили: `src/styles/style.scss`
- Scoped стили в компонентах имеют **более высокий приоритет** — переопределять через `::v-deep` или добавлять в scoped блок напрямую

### Glass-темы: CSS-токены

```scss
/* Общие */
--sub-block-bg       // фон под-блока
--sub-block-border   // рамка под-блока
--glass-bg           // основной glass-фон
--glass-border       // glass-рамка
--glass-blur         // blur (40px)

/* Секции */
--section-bg
--section-border

/* Радиусы */
--radius-panel: 1.5rem
--radius-section: 1.5rem
--radius-input: 0.75rem
```

### Правило приоритета

Scoped SCSS в компонентах перебивает глобальный `style.scss`. Если нужно переопределить из глобального — использовать `!important` или специфичный селектор вида `#app[data-theme-style='dark-glass'] .class`.

---

## Lint

Перед коммитом (или после изменений в `.vue`/`.ts` файлах):

```bash
yarn lint --no-fix --max-warnings 0 src/path/to/File.vue
```

CI запускает `yarn lint --no-fix --max-warnings 0` — предупреждения тоже ломают сборку.

Частые ошибки:
- `no-undef-init` — не писать `let x: T | undefined = undefined`, только `let x: T | undefined`
- `unused-imports/no-unused-imports-ts` — удалять неиспользуемые импорты

---

## Keycloak

- Realm: `ozma`
- Конфиг: `docker/keycloak-realm.json`
- Клиент `ozmadb` должен быть confidential с `directAccessGrantsEnabled: true`

При сбросе Keycloak (удаление volume) нужно пересоздать пользователя:
```bash
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080/auth --realm master \
  --user admin --password $ADMIN_PASSWORD

docker compose exec keycloak /opt/keycloak/bin/kcadm.sh create users \
  -r ozma -s username=... -s email=... -s enabled=true

docker compose exec keycloak /opt/keycloak/bin/kcadm.sh set-password \
  -r ozma --username ... --new-password ...
```

---

## Git

- Основная ветка: `master`
- Рабочие ветки именовать по фиче: `form-design`, `table-design` и т.д.
- Перед слиянием в master — `git merge --no-ff`
- Co-author в коммитах: никогда не писать ничего
