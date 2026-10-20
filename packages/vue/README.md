# @trellisjs/vue

Headless data table components and composables for Vue 3, powered by `@trellisjs/core`.

## Installation

```bash
npm install @trellisjs/vue @trellisjs/core vue
```

Requires Vue >= 3.5.

## Quick Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useTrellis, TlTable, TlTableInfo } from '@trellisjs/vue';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import type { ColumnDef } from '@trellisjs/core';

interface User {
  id: number;
  name: string;
  age: number;
}

const users = ref<User[]>([]);
const columns: ColumnDef<User>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'age', accessor: 'age', header: 'Age', align: 'right' },
];

const { api, state } = useTrellis({
  data: users,
  columns,
  rowId: 'id',
  plugins: [createSortPlugin(), createPaginationPlugin()],
});
</script>

<template>
  <TlTable sticky-header />
  <TlTableInfo />
  <button
    :disabled="state.pagination.page === 1"
    @click="api.emit('pagination:prev')"
  >
    Prev
  </button>
</template>
```

## API

### `useTrellis<T>(options)`

Creates a Trellis instance and returns `{ api, state }`:

- `api` — the `TrellisAPI<T>`.
- `state` — a read-only `shallowRef` holding the current `TableState<T>`. Every update replaces it with a new immutable snapshot, so templates re-render automatically.

`options` takes the same fields as `TrellisOptions<T>`, except that `data` can be an array, a ref or a getter:

- When `data` is a ref or a getter, replacing the array or adding and removing rows (`push`, `splice`) is synced automatically. Property changes inside a row object are not tracked; use `api.updateRow()` for those.
- A plain array is read once when the instance is created.

When called in a component's `setup`, `useTrellis()` also provides the instance to its descendants, so `Tl*` components work without extra wiring. The instance is destroyed (plugins and event listeners cleaned up) when the component unmounts.

### `provideTrellis(api)`

Provides an existing `TrellisAPI` (for example one created with `new Trellis()`) to descendant components. Only needed when the instance is not created with `useTrellis()`.

### `useTrellisContext<T>()` / `useTrellisState<T>()`

Read the provided `TrellisAPI` and state ref in a descendant component. Both throw when no ancestor called `useTrellis()` or `provideTrellis()`.

### `useVirtualScroll(plugin)`

Binds a scroll container to `@trellisjs/plugin-virtual-scroll`. Returns `{ containerRef, style }`: put `containerRef` on the scrolling element as a template ref and apply `style`. The container is attached when the element mounts and detached when it unmounts.

```vue
<script setup lang="ts">
const vs = createVirtualScrollPlugin({ rowHeight: 40 });
useTrellis({ data, columns, plugins: [vs] });
const { containerRef, style } = useVirtualScroll(vs);
</script>

<template>
  <div ref="containerRef" :style="{ ...style, height: '400px' }">
    <TlTable virtual-scroll />
  </div>
</template>
```

### Components

Every component has the same structure, CSS classes and behaviour as its `@trellisjs/react` counterpart, with a `Tl` prefix. They can be used as `<TlTable>` or `<tl-table>`. `class` and `style` on `TlTable` are applied to its outer element and merged with the built-in `overflow` styles.

| Component | Props | Description |
|-----------|-------|-------------|
| `TlTable` | `stickyHeader`, `virtualScroll` | Full table: header plus a regular or virtual-scroll body |
| `TlTableHead` | `columns`, `stickyHeader` | `<thead>` with one `TlTh` per visible column |
| `TlTableBody` | `data`, `columns` | `<tbody>` with one `TlTr` per row, plus expansion rows |
| `TlVirtualScrollBody` | — | `<tbody>` that renders only the visible range |
| `TlTr` | `row`, `columns`, `hasExpansion` | Data row |
| `TlTh` | `column`, `stickyHeader` | Header cell: width, alignment, sticky header, column pinning and resize handle |
| `TlTd` | `row`, `column` | Data cell: value from the column accessor, alignment and column pinning |
| `TlTableInfo` | `format`, `pagination` | "Showing 1 to 10 of 25 entries" text |
| `TlExpansionToggle` | `rowId`, `expandIcon`, `collapseIcon` | Expand / collapse button |
| `TlExpansionRow` | `row`, `colSpan` | Expanded content row, renders the `expansion:default` slot |
| `TlResizeHandle` | `columnId` | Drag handle that emits `resize:start`, `resize:column` and `resize:end` |
| `TlSlotRenderer` | `name`, `context`, `fallback` | Renders a slot from the Trellis slot registry |

### Custom cells and headers

Use scoped slots on `TlTable`, or `renderCell` / `renderHeader` on the column. For each cell the first match wins:

1. `#cell-{columnId}` slot
2. `#cell` slot (every column)
3. `column.renderCell`
4. the value as a string

Headers follow the same order with `#header-{columnId}`, `#header`, `column.renderHeader` and `column.header`.

```vue
<TlTable>
  <template #cell-role="{ value }">
    <span class="badge">{{ value }}</span>
  </template>
  <template #cell-actions="{ row, api }">
    <button type="button" @click="api.removeRow(row.id)">Delete</button>
  </template>
  <template #header-name="{ column, api }">
    <button type="button" @click="api.emit('sort:change', { columnId: column.id, direction: 'asc' })">
      {{ column.header }}
    </button>
  </template>
</TlTable>
```

Slot props are the same contexts `renderCell` / `renderHeader` receive: `{ row, value, column, api }` for cells and `{ column, api }` for headers. Use `v-slot:[`cell-${id}`]` for column ids that are not valid slot shorthand. `renderCell` / `renderHeader` return VNodes and also work when `TlTd` / `TlTh` are used without `TlTable`:

```ts
{ id: 'role', accessor: 'role', header: 'Role', renderCell: ({ value }) => h('span', { class: 'badge' }, String(value)) }
```

### `TlTableInfo`

`format` is a template string with `{start}`, `{end}` and `{total}` placeholders, or a function that returns a VNode:

```vue
<TlTableInfo format="Rows {start}–{end} of {total}" />
<TlTableInfo :format="({ start, end, total }) => h('b', `${start}-${end} / ${total}`)" />
```

Pass `pagination` to use it without `useTrellis()` or `provideTrellis()`.

### Styling notes

Trellis ships no CSS, so two things are up to your stylesheet:

- **Opaque cell backgrounds.** Sticky header cells and pinned cells stay in place while the rest scrolls underneath them. Give them a background, otherwise the scrolled content shows through:

  ```css
  .my-table th,
  .my-table td {
    background: #fff;
  }
  ```

- **Put the height limit on the table component itself.** When columns are pinned, the component's outer element gets `overflow-x: auto`, which makes it the scroll container in both directions. Set it on `TlTable`: `<TlTable sticky-header style="max-height: 400px" />`. A `max-height` on an outer wrapper scrolls the whole table instead, and the sticky header scrolls away with it.

### Slots

Slot renderers registered with `api.registerSlot()` return VNodes in Vue:

```ts
api.registerSlot('expansion:default', ({ row }) =>
  h('p', `Details for ${(row as User).name}`),
);
```

`TlSlotRenderer` falls back to its `fallback` prop or its default slot when the slot is not registered.

## License

MIT
