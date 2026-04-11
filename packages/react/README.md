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
| `Table` | Renders a `<table>` with `<TableHead>` and `<TableBody>`. |
| `TableHead` | Header row from column definitions. |
| `TableBody` | Body rows from current data and columns. |
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

## Quick Usage

```tsx
import { useTrellis, TrellisContext, Table, SlotRenderer } from '@trellisjs/react';

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
