# @trellisjs/core

Headless datatable engine -- state management, plugin system, slot registry, and event bus. Framework-agnostic; rendering is handled by adapters.

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
- `table.destroy()` -- unregisters all plugins and clears event listeners.

### `TrellisAPI<T>`

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `getState` | `() => TableState<T>` | Immutable snapshot | Current table state |
| `setState` | `(updater: (prev) => Partial<TableState<T>>) => void` | `void` | Produce next state immutably |
| `subscribe` | `(listener: (state) => void) => () => void` | Unsubscribe fn | React to state changes |
| `on` | `(event: string, handler: EventHandler) => () => void` | Unsubscribe fn | Listen for events |
| `emit` | `(event: string, payload: unknown) => void` | `void` | Dispatch an event |
| `registerSlot` | `(name: string, renderer: SlotRenderer) => () => void` | Unregister fn | Register a named render slot |
| `getSlot` | `(name: string) => SlotRenderer \| undefined` | Renderer or undefined | Retrieve a registered slot |
| `registerTransform` | `(name: string, priority: number, fn: TransformFn<T>) => void` | `void` | Register a pipeline transform |
| `recompute` | `(withState?: Partial<TableState<T>>) => void` | `void` | Re-run pipeline, optionally merging state |
| `updateSourceData` | `(data: T[]) => void` | `void` | Replace all source data and re-run pipeline |
| `addRow` | `(item: T) => void` | `void` | Append a row to sourceData and re-run pipeline. Emits `data:added` |
| `removeRow` | `(id: DataId) => void` | `void` | Remove a row by ID and re-run pipeline. Emits `data:removed` |
| `updateRow` | `(id: DataId, partial: Partial<T>) => void` | `void` | Merge-update a row by ID and re-run pipeline. Emits `data:updated` |

## Types

### `TrellisOptions<T>`

```typescript
interface TrellisOptions<T> {
  data: T[]
  columns: ColumnDef<T>[]
  plugins?: TrellisPlugin<T>[]
  pageSize?: number        // default: 10
  rowId?: keyof T | ((row: T, index: number) => DataId)
}
```

### `TrellisPlugin<T>`

```typescript
interface TrellisPlugin<T> {
  name: string
  install: (api: TrellisAPI<T>) => void
  destroy?: () => void
}
```

### `ColumnDef<T>`

```typescript
interface ColumnDef<T> {
  id: string
  accessor: keyof T | ((row: T) => unknown)
  header: string
  sortFn?: ColumnSortFn
  sortable?: boolean
  filterable?: boolean
  width?: number | string
  minWidth?: number | string
  maxWidth?: number | string
  align?: 'left' | 'center' | 'right'
  visible?: boolean
  // ...see source for full definition
}
```

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
  data: DataRow<T>[]
  columns: ColumnDef<T>[]
  sorting: { columnId: string; direction: 'asc' | 'desc' | null }
  filtering: { query: string; columnFilters: Record<string, unknown> }
  pagination: { page: number; pageSize: number; totalItems: number }
  selection: Set<DataId>
  columnVisibility: Record<string, boolean>
  virtualScroll?: { startIndex: number; endIndex: number; totalHeight: number; rowHeight: number }
}
```

## License

MIT
