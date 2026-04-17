import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVirtualScroll } from '../src/hooks/use-virtual-scroll';
import { Trellis } from '@trellisjs/core';
import { createVirtualScrollPlugin } from '@trellisjs/plugin-virtual-scroll';
import type { ColumnDef } from '@trellisjs/core';

interface Item {
  name: string;
  value: number;
}

const columns: ColumnDef<Item>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'value', accessor: 'value', header: 'Value' },
];

function generateData(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Item ${i + 1}`,
    value: i + 1,
  }));
}

// Mock rAF
let rafCallbacks: Map<number, FrameRequestCallback> = new Map();
let rafCounter = 0;

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = ++rafCounter;
    rafCallbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks.delete(id);
  });
});

afterEach(() => {
  rafCallbacks.clear();
  rafCounter = 0;
});

function flushRaf() {
  const cbs = [...rafCallbacks.values()];
  rafCallbacks.clear();
  cbs.forEach((cb) => cb(performance.now()));
}

describe('useVirtualScroll', () => {
  it('回傳 containerRef', () => {
    const plugin = createVirtualScrollPlugin({ rowHeight: 40 });
    const trellis = new Trellis<Item>({
      data: generateData(100),
      columns,
      pageSize: 100,
      plugins: [plugin],
    });

    const { result } = renderHook(() => useVirtualScroll(plugin));

    expect(result.current.containerRef).toBeDefined();
    expect(result.current.containerRef).toHaveProperty('current');
  });

  it('回傳 scroll container 的 style', () => {
    const plugin = createVirtualScrollPlugin({ rowHeight: 40 });
    const trellis = new Trellis<Item>({
      data: generateData(100),
      columns,
      pageSize: 100,
      plugins: [plugin],
    });

    const { result } = renderHook(() => useVirtualScroll(plugin));

    expect(result.current.style).toHaveProperty('overflowY', 'auto');
  });
});
