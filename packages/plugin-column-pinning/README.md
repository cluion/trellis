# @trellisjs/plugin-column-pinning

Column pinning plugin for Trellis data tables — fix key columns to the left or right side using CSS `position: sticky`.

## Installation

```bash
npm install @trellisjs/plugin-column-pinning
```

## Events

Payloads are typed through `TrellisEventMap`: once the plugin is imported, `api.on()` and `api.emit()` infer them. Exported payload types: `PinTogglePayload`, `PinSetPayload`.

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

The plugin provides `calculatePinOffsets()` to compute the CSS `left` / `right` values for each pinned column based on the widths of the preceding pinned columns:

```ts
import { calculatePinOffsets } from '@trellisjs/plugin-column-pinning';

const offsets = calculatePinOffsets(
  state.columns,
  state.columnPinning,
  state.columnVisibility,
  state.columnResizing, // optional: use widths resized with @trellisjs/plugin-column-resizing
);

// offsets is a Map<string, PinOffset>
const pinInfo = offsets.get('name');
// pinInfo = { side: 'left', offset: 60, isLastLeft: true, isFirstRight: false }
```

Hidden columns (via `columnVisibility`) are automatically excluded from offset calculation.

A pinned column's width is taken from, in order:

1. its resized width, when `columnResizing` is passed (`plugin.getPinOffsets(state)` and the React / Vue table components always pass it);
2. `columnResizing.defaultWidth`, when column resizing is enabled and the column has no `width`;
3. its numeric `width`.

Give pinned columns a numeric `width` (or enable column resizing): a missing or non-numeric width such as `'20%'` counts as `0` and the following pinned columns will overlap it.

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

The `<Table>` component automatically wraps the table with `overflowX: 'auto'` when pinned columns are detected. With `@trellisjs/vue`, `<TlTable>` does the same.

### Styling

Trellis ships no CSS, so two things are up to your stylesheet:

- **Opaque cell backgrounds.** Sticky header cells and pinned cells stay in place while the rest scrolls underneath them. Give them a background, otherwise the scrolled content shows through:

  ```css
  .my-table th,
  .my-table td {
    background: #fff;
  }
  ```

- **Put the height limit on the table component itself.** When columns are pinned, the component's outer element gets `overflow-x: auto`, which makes it the scroll container in both directions. Pass the limit to the component (`<Table style={{ maxHeight: 400 }} stickyHeader />` in React, `<TlTable style="max-height: 400px" sticky-header />` in Vue). A `max-height` on an outer wrapper scrolls the whole table instead, and the sticky header scrolls away with it.

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
