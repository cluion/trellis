# @trellisjs/plugin-column-pinning

Column pinning plugin for Trellis data tables — fix key columns to the left or right side using CSS `position: sticky`.

## Installation

```bash
npm install @trellisjs/plugin-column-pinning
```

## Events

### Listens

| Event | Payload | Description |
|---|---|---|
| `column-pin:toggle` | `{ columnId: string, side: 'left' \| 'right' }` | Toggle a column's pinned state. If already pinned on that side, unpin it; otherwise pin it. |
| `column-pin:set` | `{ left: string[], right: string[] }` | Set the full list of left and right pinned column IDs. |
| `column-pin:clear` | `null` | Clear all pinned columns. |

### State Updated

- `state.columnPinning` — `{ left: string[], right: string[] }` tracking pinned column IDs.

## Usage

### Column Definition with Pin

```ts
import { Trellis } from '@trellisjs/core';
import { createColumnPinningPlugin } from '@trellisjs/plugin-column-pinning';

const trellis = new Trellis({
  columns: [
    { id: 'id', accessor: 'id', header: 'ID', width: 60, pin: 'left' },
    { id: 'name', accessor: 'name', header: 'Name', width: 120, pin: 'left' },
    { id: 'email', accessor: 'email', header: 'Email' },
    { id: 'actions', accessor: 'id', header: 'Actions', width: 100, pin: 'right' },
  ],
  data: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ],
  plugins: [createColumnPinningPlugin()],
});

// Pinned columns: left=['id','name'], right=['actions']
trellis.api.getState().columnPinning;
```

### Dynamic Pinning

```ts
// Pin 'email' to the left
trellis.api.emit('column-pin:toggle', { columnId: 'email', side: 'left' });

// Unpin 'email'
trellis.api.emit('column-pin:toggle', { columnId: 'email', side: 'left' });

// Set specific pins
trellis.api.emit('column-pin:set', { left: ['id'], right: ['actions'] });

// Clear all pins
trellis.api.emit('column-pin:clear', null);
```

### Offset Calculation

The plugin provides `calculatePinOffsets()` to compute the CSS `left` / `right` values for each pinned column based on preceding column widths:

```ts
import { calculatePinOffsets } from '@trellisjs/plugin-column-pinning';

const offsets = calculatePinOffsets(
  state.columns,
  state.columnPinning,
  state.columnVisibility,
);

// offsets is a Map<string, PinOffset>
const pinInfo = offsets.get('name');
// pinInfo = { side: 'left', offset: 60, isLastLeft: true, isFirstRight: false }
```

Hidden columns (via `columnVisibility`) are automatically excluded from offset calculation.

### React Integration

When using `@trellisjs/react`, the `<Table>`, `<Th>`, and `<Td>` components automatically apply sticky styles based on `state.columnPinning`:

```tsx
import { useTrellis, Table } from '@trellisjs/react';
import { createColumnPinningPlugin } from '@trellisjs/plugin-column-pinning';

function MyTable({ data }) {
  const { api } = useTrellis({
    data,
    columns: [
      { id: 'name', accessor: 'name', header: 'Name', width: 120, pin: 'left' },
      { id: 'email', accessor: 'email', header: 'Email' },
      { id: 'actions', accessor: 'id', header: 'Actions', width: 100, pin: 'right' },
    ],
    plugins: [createColumnPinningPlugin()],
  });

  return (
    <TrellisContext.Provider value={api}>
      <Table />
    </TrellisContext.Provider>
  );
}
```

The `<Table>` component automatically wraps the table with `overflowX: 'auto'` when pinned columns are detected.

### Shadow Borders

Pinned columns at the boundary (last left-pinned, first right-pinned) receive a CSS class for shadow styling:

- `trellis-pin-shadow--left` — applied to the last (rightmost) left-pinned column
- `trellis-pin-shadow--right` — applied to the first (leftmost) right-pinned column

Add CSS rules to display shadows:

```css
.trellis-pin-shadow--left {
  box-shadow: 4px 0 8px -2px rgba(0, 0, 0, 0.12);
}

.trellis-pin-shadow--right {
  box-shadow: -4px 0 8px -2px rgba(0, 0, 0, 0.12);
}
```

### Combination with Other Plugins

```ts
plugins: [
  createFilterPlugin(),
  createSortPlugin(),
  createPaginationPlugin(),
  createSelectionPlugin(),
  createColumnVisibilityPlugin(),
  createColumnPinningPlugin(),
]
```

## License

MIT
