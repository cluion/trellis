import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrellis } from '../src/hooks/use-trellis';
import type { ColumnDef } from '@trellisjs/core';

interface User {
  name: string;
  age: number;
}

const data: User[] = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
];

const columns: ColumnDef<User>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'age', accessor: 'age', header: 'Age' },
];

describe('useTrellis', () => {
  it('creates a trellis instance with data and columns', () => {
    const { result } = renderHook(() =>
      useTrellis({ data, columns }),
    );

    const state = result.current.api.getState();
    expect(state.data).toHaveLength(2);
    expect(state.columns).toHaveLength(2);
  });

  it('returns a stable API reference across re-renders', () => {
    const { result, rerender } = renderHook(() =>
      useTrellis({ data, columns }),
    );

    const firstApi = result.current.api;
    rerender({ data, columns });
    const secondApi = result.current.api;

    expect(firstApi).toBe(secondApi);
  });

  it('triggers re-render when state changes', () => {
    const { result } = renderHook(() =>
      useTrellis({ data, columns }),
    );

    act(() => {
      result.current.api.setState((s) => ({
        pagination: { ...s.pagination, page: 5 },
      }));
    });

    expect(result.current.api.getState().pagination.page).toBe(5);
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() =>
      useTrellis({ data, columns }),
    );

    expect(() => unmount()).not.toThrow();
  });

  it('accepts plugins option', () => {
    const install = vi.fn();
    renderHook(() =>
      useTrellis({
        data,
        columns,
        plugins: [{ name: 'test', install }],
      }),
    );

    expect(install).toHaveBeenCalled();
  });
});
