# @trellisjs/react

Headless data table components and hooks for React, powered by `@trellisjs/core`.

## Installation

```bash
npm install @trellisjs/react @trellisjs/core react react-dom
```

Requires React >= 18.

## API

### `useTrellis<T>(options)`

Creates and manages a Trellis instance. Returns `{ api }` where `api` is a
`TrellisAPI<T>`. The instance is created once and re-renders are triggered
automatically on state changes. Compatible with React StrictMode double-mount.

```ts
const { api } = useTrellis<User>({ columns, data });
```

**Parameters** -- `options: TrellisOptions<T>` (column definitions, initial
data, plugins, etc.) passed directly to the `Trellis` constructor.

### `TrellisContext`

A React context holding a `TrellisAPI` instance. Wrap your tree with
`<TrellisContext.Provider value={api}>` so child components can access the
table API.

### `useTrellisContext<T>()`

Hook that reads the `TrellisAPI` from `TrellisContext`. Throws if called
outside a provider.

### Components

| Component | Description |
|-----------|-------------|
| `Table` | Renders a `<table>` with `<TableHead>` and `<TableBody>`. Supports `stickyHeader` and `virtualScroll` props. |
| `TableInfo` | Displays pagination info ("Showing X to Y of Z entries"). |
| `TableHead` | Header row from column definitions. |
| `TableBody` | Body rows from current data and columns. |
| `VirtualScrollBody` | Virtual-scrolled body — only renders visible rows with spacer rows for scrollbar accuracy. |
| `Tr` / `Th` / `Td` | Primitive row and cell components. |

### `SlotRenderer`

Renders a named slot from the Trellis slot registry.

```tsx
<SlotRenderer name="toolbar" fallback={<div>No toolbar</div>} />
```

Props:

- `name` -- slot name to look up.
- `context` -- optional `SlotContext` passed to the renderer.
- `fallback` -- rendered when no slot is registered.

### `TableProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `stickyHeader` | `boolean` | `false` | Enables sticky header — `<th>` elements get `position: sticky; top: 0` so the header stays visible during vertical scroll. Requires the container to have `max-height` and `overflow: auto`. |
| `virtualScroll` | `boolean` | `false` | Enables virtual scrolling — uses `VirtualScrollBody` instead of `TableBody` to render only visible rows. |

The `Table` component automatically applies `overflowX: 'auto'` when pinned columns are detected, enabling CSS sticky positioning.

### `useVirtualScroll(plugin)`

Hook that binds a scroll container to a virtual scroll plugin. Manages lifecycle (attach/detach).

```tsx
import { useVirtualScroll } from '@trellisjs/react';
import { createVirtualScrollPlugin } from '@trellisjs/plugin-virtual-scroll';

const vsPlugin = createVirtualScrollPlugin({ rowHeight: 40 });

function MyTable() {
  const { api } = useTrellis({ data, columns, pageSize: data.length, plugins: [vsPlugin] });
  const { containerRef, style } = useVirtualScroll(vsPlugin);

  return (
    <div ref={containerRef} style={{ ...style, maxHeight: 500 }}>
      <table>...</table>
    </div>
  );
}
```

Returns `{ containerRef: RefObject<HTMLDivElement>, style: { overflowY: 'auto' } }`.

```tsx
<div style={{ maxHeight: 400, overflow: 'auto' }}>
  <Table stickyHeader />
</div>
```

### `TableInfo`

Displays the current page's data range (e.g. "Showing 1 to 10 of 25 entries").

```tsx
// Auto-reads from TrellisContext
<TableInfo />

// Or pass pagination directly (no context required)
<TableInfo pagination={{ page: 1, pageSize: 10, totalItems: 25 }} />
```

Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `format` | `string \| FormatFn` | `"Showing {start} to {end} of {total} entries"` | Custom format string (supports `{start}`, `{end}`, `{total}` placeholders) or a render function `({ start, end, total }) => ReactNode`. |
| `pagination` | `{ page, pageSize, totalItems }` | — | When provided, uses this instead of reading from `TrellisContext`. |

```tsx
// String template
<TableInfo format="第 {start} 到 {end} 筆，共 {total} 筆" />

// Render function
<TableInfo format={({ start, end, total }) => `${start}-${end} / ${total}`} />
```

## Quick Usage

```tsx
import { useTrellis, TrellisContext, Table, SlotRenderer, VirtualScrollBody, useVirtualScroll } from '@trellisjs/react';

const columns = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
];

function App() {
  const { api } = useTrellis({ columns, data: users });

  return (
    <TrellisContext.Provider value={api}>
      <SlotRenderer name="toolbar" />
      <Table />
    </TrellisContext.Provider>
  );
}
```

## License

MIT
