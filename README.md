# Trellis

Modern headless datatable engine — TypeScript, plugin-based, full-stack ready.

Trellis is a framework-agnostic data table library with a plugin architecture, immutable state management, and a standardized query protocol for front-end and back-end integration.

## Features

- **Headless** — No UI, no CSS, no opinions. Bring your own components.
- **Plugin Architecture** — Sort, filter, paginate, fetch remote data — each is an independent plugin.
- **TypeScript Native** — Full generic support `Trellis<T>`, type-safe throughout.
- **Immutable State** — Every state change produces a new frozen snapshot.
- **EventBus** — Isolated event listeners; one error won't crash others.
- **Slot System** — Named rendering slots for complete UI customization.
- **Full-Stack Protocol** — `TrellisQuery / TrellisResponse` unifies frontend and backend interfaces.
- **Server Helpers** — Query parsing, SQL construction, and ORM adapters.
- **Tree-Shakeable** — Install only the plugins you need.
- **React Adapter** — First-class React support via `@trellisjs/react`, including sticky header.

## Packages

| Package | Description |
|---------|-------------|
| [`@trellisjs/core`](./packages/core) | Core engine — state, plugins, slots, events |
| [`@trellisjs/plugin-sort`](./packages/plugin-sort) | Column sorting (asc/desc) |
| [`@trellisjs/plugin-filter`](./packages/plugin-filter) | Global text search |
| [`@trellisjs/plugin-pagination`](./packages/plugin-pagination) | Page navigation and page size |
| [`@trellisjs/plugin-datasource`](./packages/plugin-datasource) | Remote API data fetching |
| [`@trellisjs/plugin-selection`](./packages/plugin-selection) | Row selection (single, multi, range) |
| [`@trellisjs/plugin-column-visibility`](./packages/plugin-column-visibility) | Dynamic column show/hide |
| [`@trellisjs/plugin-column-pinning`](./packages/plugin-column-pinning) | Pin columns to left/right with CSS sticky |
| [`@trellisjs/plugin-virtual-scroll`](./packages/plugin-virtual-scroll) | Virtual scrolling for large datasets |
| [`@trellisjs/react`](./packages/react) | React hooks and components |
| [`@trellisjs/server`](./packages/server) | Backend query parser and SQL builder |
| [`@trellisjs/server-prisma`](./packages/server-prisma) | Prisma ORM adapter |

## Quick Start

### Install

```bash
npm install @trellisjs/core @trellisjs/react @trellisjs/plugin-sort @trellisjs/plugin-filter @trellisjs/plugin-pagination @trellisjs/plugin-selection @trellisjs/plugin-column-visibility
```

### React Example

```tsx
import { useTrellis } from '@trellisjs/react';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import type { ColumnDef } from '@trellisjs/core';

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

const columns: ColumnDef<User>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'email', accessor: 'email', header: 'Email' },
  { id: 'age', accessor: 'age', header: 'Age' },
];

function UserTable({ data }: { data: User[] }) {
  const { api } = useTrellis<User>({
    data,
    columns,
    plugins: [
      createSortPlugin(),
      createFilterPlugin(),
      createPaginationPlugin(),
    ],
  });

  const state = api.getState();

  return (
    <div>
      <input
        placeholder="Search..."
        onChange={(e) => api.emit('filter:change', { value: e.target.value })}
      />
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.id} onClick={() => api.emit('sort:toggle', { columnId: col.id })}>
                {String(col.header)} {state.sort?.columnId === col.id ? (state.sort.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.data.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.id}>{String(row.original[col.accessor as keyof User] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Core-Only (No UI Framework)

```typescript
import { Trellis } from '@trellisjs/core';
import { createSortPlugin } from '@trellisjs/plugin-sort';

const trellis = new Trellis({
  data: [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
  ],
  columns: [
    { id: 'name', accessor: 'name', header: 'Name' },
    { id: 'age', accessor: 'age', header: 'Age' },
  ],
  plugins: [createSortPlugin()],
});

// Subscribe to state changes
trellis.api.subscribe((state) => {
  console.log('Data updated:', state.data);
});

// Sort by age descending
trellis.api.emit('sort:toggle', { columnId: 'age' });
```

### Backend (Node.js)

```typescript
import { parseQuery, buildWhere, buildOrderBy } from '@trellisjs/server';
import { createPrismaAdapter } from '@trellisjs/server-prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const adapter = createPrismaAdapter(prisma);

// In your API handler:
app.get('/api/users', async (req, res) => {
  const result = await adapter.query('user', req.query);
  res.json(result);
});
```

## Architecture

```
@trellisjs/core              ← State management, plugin system, events, slots
  ├── plugin-sort            ← Independent sorting plugin
  ├── plugin-filter          ← Independent filtering plugin
  ├── plugin-pagination      ← Independent pagination plugin
  ├── plugin-datasource      ← Remote data fetching plugin
  ├── plugin-selection       ← Row selection plugin
  ├── plugin-column-visibility ← Column visibility plugin
  ├── plugin-column-pinning  ← Column pinning plugin
  ├── plugin-virtual-scroll  ← Virtual scrolling plugin
  └── react                  ← React adapter (useTrellis hook)

@trellisjs/server            ← Backend query parser
  └── server-prisma          ← Prisma ORM adapter
```

Each plugin:
1. Implements `TrellisPlugin` interface (`name`, `install`, optional `destroy`)
2. Receives `TrellisAPI` during installation
3. Reads and modifies state via `api.setState()`
4. Communicates via `api.emit()` / `api.on()` events
5. Can register rendering slots via `api.registerSlot()`

## Status

Trellis is in **alpha** (v0.1.0-alpha). Core architecture is stable, but feature coverage is limited to basic sort/filter/pagination. See the [roadmap](https://github.com/cluion/trellis/issues) for planned features.

## License

MIT
