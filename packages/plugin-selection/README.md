# @trellisjs/plugin-selection

Selection plugin for Trellis data tables — supports single row toggle, select all, and Shift range selection.

## Installation

```bash
npm install @trellisjs/plugin-selection
```

## Events

### Listens

| Event | Payload | Description |
|---|---|---|
| `selection:toggle` | `{ rowId: DataId }` | Toggle a single row's selection state. Sets the anchor for subsequent range selections. |
| `selection:all` | `{ select: boolean }` | Select all rows in current `state.data` (`true`) or deselect all (`false`). |
| `selection:range` | `{ toIndex: number }` | Select all rows from the anchor to `toIndex` (inclusive). Replaces the current selection with exactly this range. If no anchor exists, selects only the row at `toIndex`. |

### State Updated

- `state.selection` — a `Set<DataId>` of currently selected row IDs.

When filtering or sorting changes `state.data`, any selected IDs no longer present in the data are automatically removed from `state.selection`.

## Usage

### Single Row Selection

```ts
import { Trellis } from '@trellisjs/core';
import { createSelectionPlugin } from '@trellisjs/plugin-selection';

const trellis = new Trellis({
  columns: [
    { id: 'name', accessor: 'name' },
    { id: 'email', accessor: 'email' },
  ],
  data: [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
  ],
  rowId: 'id',
  plugins: [createSelectionPlugin()],
});

// Select a row
trellis.api.emit('selection:toggle', { rowId: '1' });

// Deselect the same row
trellis.api.emit('selection:toggle', { rowId: '1' });

// Check selection
trellis.api.getState().selection.has('1'); // false
```

### Select All / Deselect All

```ts
// Select all visible rows
trellis.api.emit('selection:all', { select: true });

// Deselect all
trellis.api.emit('selection:all', { select: false });
```

`selection:all` operates on the current `state.data` — after filtering and pagination. This means "select all" selects exactly what the user sees.

### Shift Range Selection

```ts
// Click row at index 1 — sets anchor
trellis.api.emit('selection:toggle', { rowId: '2' });

// Shift+click row at index 4 — selects rows 1 through 4
trellis.api.emit('selection:range', { toIndex: 4 });

// Shift+click row at index 2 — adjusts to rows 1 through 2
// (rows 3 and 4 are deselected)
trellis.api.emit('selection:range', { toIndex: 2 });
```

Range selection **replaces** the current selection with exactly the anchor-to-target range, matching standard desktop application behavior.

### React Integration

The plugin only provides the selection logic. The UI is up to you:

```tsx
function MyTable({ data }) {
  const { api } = useTrellis({
    data,
    columns,
    rowId: 'id',
    plugins: [createSelectionPlugin()],
  });

  const state = api.getState();
  const allSelected = state.data.length > 0 && state.selection.size === state.data.length;

  const handleToggleAll = () => {
    api.emit('selection:all', { select: !allSelected });
  };

  const handleToggleRow = (rowId: string, shiftKey: boolean, rowIndex: number) => {
    if (shiftKey) {
      api.emit('selection:range', { toIndex: rowIndex });
    } else {
      api.emit('selection:toggle', { rowId });
    }
  };

  return (
    <table>
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleToggleAll}
            />
          </th>
          {/* column headers */}
        </tr>
      </thead>
      <tbody>
        {state.data.map((row, rowIndex) => (
          <tr key={row.id}>
            <td>
              <input
                type="checkbox"
                checked={state.selection.has(row.id)}
                onChange={() => {}}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleRow(row.id, e.shiftKey, rowIndex);
                }}
              />
            </td>
            {/* cells */}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Combination with Other Plugins

Selection works alongside filter, sort, and pagination. When data changes due to filtering or sorting, selected IDs no longer in the data are automatically removed.

```ts
plugins: [
  createFilterPlugin(),
  createSortPlugin(),
  createPaginationPlugin(),
  createSelectionPlugin(),
]
```

## License

MIT
