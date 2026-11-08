# @trellisjs/core

Headless datatable engine -- state management, plugin system, slot registry, and event bus. Framework-agnostic; rendering is handled by adapters.

The server-side state and resumable lifecycle APIs require core 1.13.0 or later; see the [compatible package versions](../../examples/vue-server-side/README.md#versions-and-release-status).

## Installation

```bash
npm install @trellisjs/core
```

## Quick Start

```typescript
import { Trellis } from '@trellisjs/core'
import type { ColumnDef, TrellisPlugin } from '@trellisjs/core'

interface User {
  id: number
  name: string
  email: string
}

const columns: ColumnDef<User>[] = [
  { id: 'name', accessor: 'name', header: 'Name', sortable: true },
  { id: 'email', accessor: 'email', header: 'Email' },
]

const data: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
]

const table = new Trellis({ data, columns, rowId: 'id' })

// Read state
const state = table.api.getState()

// Subscribe to changes
const unsubscribe = table.api.subscribe((state) => {
  console.log('State changed:', state.pagination.page)
})

// Listen for events
table.api.on('row:click', (payload) => {
  console.log('Row clicked:', payload)
})

// Clean up
table.destroy()
```

## Dynamic Data Operations

Add, remove, or update individual rows. Each operation modifies `sourceData` and re-runs the Transform Pipeline so sort/filter/pagination stay in sync.

```typescript
// Add a new row — appended to sourceData, pipeline re-runs
table.api.addRow({ id: 3, name: 'Charlie', email: 'charlie@example.com' })

// Remove a row by ID — no-op if ID not found
table.api.removeRow('2')

// Update a row (shallow merge) — no-op if ID not found
table.api.updateRow('1', { name: 'Alice Updated' })

// Listen for data change events
table.api.on('data:added', (id) => console.log('Added:', id))
table.api.on('data:removed', (id) => console.log('Removed:', id))
table.api.on('data:updated', (id) => console.log('Updated:', id))
```

## API Reference

### `Trellis<T>`

Main class. Generic `T` is the shape of a data row.

```typescript
const table = new Trellis(options)
```

- `table.api` -- the public `TrellisAPI<T>` interface.
- `table.start()` -- starts plugin resources after installation and the initial pipeline. Called automatically unless `autoStart: false`. Repeated calls while started are no-ops.
- `table.stop()` -- immediately stops resumable plugin resources, preserving state and subscriptions. Call `start()` to resume.
- `table.destroy()` -- stops resources, unregisters all plugins and clears event listeners. A destroyed instance cannot be restarted. Dispose your own `api.subscribe()` subscriptions with their returned functions.

### `TrellisAPI<T>`

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `getState` | `() => TableState<T>` | Immutable snapshot | Current table state |
| `setState` | `(updater: (prev) => Partial<TableState<T>>) => void` | `void` | Produce next state immutably |
| `subscribe` | `(listener: (state) => void) => () => void` | Unsubscribe fn | React to state changes |
| `on` | `(event, handler: (payload: TrellisEventMap[event]) => void) => () => void` | Unsubscribe fn | Listen for events; see [Typed events](#typed-events) |
| `emit` | `(event, payload: TrellisEventMap[event]) => void` | `void` | Dispatch an event; see [Typed events](#typed-events) |
| `registerSlot` | `(name: string, renderer: SlotRenderer) => () => void` | Unregister fn | Register a named render slot |
| `getSlot` | `(name: string) => SlotRenderer \| undefined` | Renderer or undefined | Retrieve a registered slot |
| `registerTransform` | `(name: string, priority: number, fn: TransformFn<T>) => void` | `void` | Register a pipeline transform |
| `recompute` | `(withState?: Partial<TableState<T>>) => void` | `void` | Re-run pipeline, optionally merging state. Subscribers are notified once, after the pipeline finishes |
| `updateSourceData` | `(data: T[], withState?: Partial<TableState<T>>) => void` | `void` | Replace source data, optionally merge state and re-run pipeline with one notification |
| `addRow` | `(item: T) => void` | `void` | Append a row to sourceData and re-run pipeline. Emits `data:added` |
| `removeRow` | `(id: DataId) => void` | `void` | Remove a row by ID and re-run pipeline. Emits `data:removed` |
| `updateRow` | `(id: DataId, partial: Partial<T>) => void` | `void` | Merge-update a row by ID and re-run pipeline. Emits `data:updated` |
| `getFilteredData` | `() => DataRow<T>[]` | Array copy | Filtered + sorted data before slicing; server mode contains only the loaded page |

### Transform priority

Transforms run in ascending `priority`. Built-in plugins use filter `10`, sort `20`, pagination `30` and virtualScroll `35`.

Transforms with priority `>= 30` are treated as slicing: they only narrow what is rendered in `state.data`. In client mode, `pagination.totalItems` and `getFilteredData()` use the result of the transforms below `30`, whether or not the pagination plugin is installed.

### Server-side state and operations

Install `createDatasourcePlugin()` from `@trellisjs/plugin-datasource` to select `state.dataMode === 'server'`; otherwise the table uses client-side behavior. The filter, sort and pagination plugins then update query state without processing the loaded page locally. `pagination.totalItems` retains the backend's `filtered` count, while `state.datasource.total` retains the unfiltered count. Search, column filters, sorting and page-size changes reset the page to 1 in this mode.

`getFilteredData()` can only return loaded rows in server mode. `updateSourceData()`, `addRow()`, `removeRow()` and `updateRow()` change local loaded data; they neither write to the backend nor recalculate remote counts. Persist changes through your application API, then emit `datasource:reload` to refresh rows and counts. See the [server-side API, Vue example and release status](../../examples/vue-server-side/README.md).

### Adapter helpers

Framework-agnostic helpers that the React and Vue adapters share. Use them when building your own cells or another framework adapter.

| Function | Returns | Description |
|----------|---------|-------------|
| `getCellValue(row, column)` | `unknown` | Value of a cell, read through the column `accessor` (key or function) |
| `getHeaderCellLayout(column, state, stickyHeader?)` | `{ style?, className?, resizable }` | Inline style and class for a `<th>`: width, alignment, sticky header, column pinning and column resizing |
| `getBodyCellLayout(column, state)` | `{ style?, className? }` | Inline style and class for a `<td>`: alignment and column pinning |

Lengths in `style` are always strings with units (`'60px'`), so the object works as both a React and a Vue style binding.

### Typed events

`api.on()` and `api.emit()` look up payload types in `TrellisEventMap`. Core registers `data:added`, `data:removed` and `data:updated` (payload: `DataId`). Each plugin registers its own events, so importing the plugin is enough:

```typescript
api.on('sort:change', ({ columnId, direction }) => {}); // SortChangePayload
api.emit('sort:change', { columnId: 'age', direction: 'up' }); // type error
```

- Commands without a payload, such as `pagination:next`, can be emitted without a second argument. Any value is still accepted, so existing `null` or `{}` calls keep compiling.
- Events that are not in the map keep the previous behaviour: the payload is `unknown`.
- Your own plugins can register events the same way:

```typescript
declare module '@trellisjs/core' {
  interface TrellisEventMap {
    'my-plugin:refresh': { force: boolean };
  }
}
```

## Types

### `TrellisOptions<T>`

```typescript
interface TrellisOptions<T> {
  data: T[]
  columns: ColumnDef<T>[]
  plugins?: TrellisPlugin<any>[]  // plugins are row-type agnostic, so any plugin fits any T
  pageSize?: number        // default: 10
  rowId?: keyof T | ((row: T, index: number) => DataId)
  autoStart?: boolean     // default: true; false defers plugin start hooks
}
```

### `TrellisPlugin<T>`

```typescript
interface TrellisPlugin<T> {
  name: string
  install: (api: TrellisAPI<T>) => void
  start?: () => void
  stop?: () => void
  destroy?: () => void
}
```

`install` runs during construction, including when `autoStart: false`. Put resumable external work in `start` and immediate cancellation in `stop`; `destroy` handles final cleanup. `start` first runs after every plugin is installed and the initial pipeline finishes, then again after any `stop` / `start` cycle. The React adapter uses these hooks to handle StrictMode replay and immediate request cancellation on unmount.

### `ColumnDef<T>`

```typescript
interface ColumnDef<T> {
  id: string
  accessor: keyof T | ((row: T) => unknown)
  header: string            // also used by CSV export and clipboard
  renderCell?: (context: CellContext<T>) => unknown
  renderHeader?: (context: HeaderContext<T>) => unknown
  sortFn?: ColumnSortFn
  sortable?: boolean
  filterable?: boolean
  width?: number | string
  minWidth?: number | string
  maxWidth?: number | string
  align?: 'left' | 'center' | 'right'
  visible?: boolean
  resizable?: boolean
  // ...see source for full definition
}

interface CellContext<T> {
  row: DataRow<T>
  value: unknown        // read through the column accessor
  column: ColumnDef<T>
  api: TrellisAPI<T>
}

interface HeaderContext<T> {
  column: ColumnDef<T>
  api: TrellisAPI<T>
}
```

`renderCell` and `renderHeader` customize what the React and Vue table components render: return a React node with `@trellisjs/react`, a VNode with `@trellisjs/vue`. Core never calls them. The `api` in the context lets columns defined outside a component act on the table, for example `api.emit('sort:change', ...)` from a header or `api.removeRow(row.id)` from a cell.

### `DataRow<T>`

```typescript
interface DataRow<T> {
  id: DataId            // string | number
  original: T           // user-provided row data
  index: number          // position in original array
}
```

### `TableState<T>`

```typescript
interface TableState<T> {
  dataMode?: 'client' | 'server' // absent means client
  datasource?: DatasourceState // present when the datasource plugin is installed
  data: DataRow<T>[]
  columns: ColumnDef<T>[]
  sorting: { sortBy: { columnId: string; direction: 'asc' | 'desc' }[] }
  filtering: { query: string; columnFilters: Record<string, unknown> }
  pagination: { page: number; pageSize: number; totalItems: number }
  selection: Set<DataId>
  columnVisibility: Record<string, boolean>
  columnPinning: { left: string[]; right: string[] }
  expandedRows: Set<DataId>
  virtualScroll?: { startIndex: number; endIndex: number; totalHeight: number; rowHeight: number }
  // Additional optional plugin state is defined in the source.
}

interface DatasourceState {
  loading: boolean
  error: Error | null
  total: number    // unfiltered backend count
  filtered: number // filtered backend count; also pagination.totalItems
}
```

## License

MIT
