import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VirtualScrollBody } from '../src/components/virtual-scroll-body';
import { TrellisContext } from '../src/context';
import { Trellis } from '@trellisjs/core';
import { createVirtualScrollPlugin } from '@trellisjs/plugin-virtual-scroll';
import { useTrellis } from '../src/hooks/use-trellis';
import type { ColumnDef } from '@trellisjs/core';
import type { ReactNode } from 'react';

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

function createWrapperWithVirtualScroll(data: Item[], vsPlugin: ReturnType<typeof createVirtualScrollPlugin>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const { api } = useTrellis({
      data,
      columns,
      pageSize: 100,
      plugins: [vsPlugin],
    });
    return (
      <TrellisContext.Provider value={api}>
        {children}
      </TrellisContext.Provider>
    );
  };
}

describe('VirtualScrollBody', () => {
  it('只渲染 startIndex 到 endIndex 範圍的行', () => {
    const vsPlugin = createVirtualScrollPlugin({ rowHeight: 40, overscan: 0 });
    const data = generateData(50);
    const trellis = new Trellis<Item>({
      data,
      columns,
      pageSize: 100,
      plugins: [vsPlugin],
    });

    // 設定 virtualScroll 範圍
    trellis.api.recompute({
      virtualScroll: {
        startIndex: 10,
        endIndex: 15,
        totalHeight: 2000,
        rowHeight: 40,
      },
    } as any);

    const { container } = render(
      <TrellisContext.Provider value={trellis.api}>
        <VirtualScrollBody />
      </TrellisContext.Provider>,
    );

    const dataRows = container.querySelectorAll('tbody tr.trellis-virtual-scroll__data-row');
    expect(dataRows).toHaveLength(5);
  });

  it('上下有佔位 tr', () => {
    const vsPlugin = createVirtualScrollPlugin({ rowHeight: 40, overscan: 0 });
    const data = generateData(50);
    const trellis = new Trellis<Item>({
      data,
      columns,
      pageSize: 100,
      plugins: [vsPlugin],
    });

    trellis.api.recompute({
      virtualScroll: {
        startIndex: 10,
        endIndex: 15,
        totalHeight: 2000,
        rowHeight: 40,
      },
    } as any);

    const { container } = render(
      <TrellisContext.Provider value={trellis.api}>
        <VirtualScrollBody />
      </TrellisContext.Provider>,
    );

    const topSpacer = container.querySelector('tr.trellis-virtual-scroll__spacer--top');
    const bottomSpacer = container.querySelector('tr.trellis-virtual-scroll__spacer--bottom');

    expect(topSpacer).toBeInTheDocument();
    expect(bottomSpacer).toBeInTheDocument();

    // 上方佔位高度 = startIndex * rowHeight = 10 * 40 = 400px
    expect(topSpacer!.querySelector('td')).toHaveStyle({ height: '400px' });
    // 下方佔位高度 = (totalItems - endIndex) * rowHeight = (50 - 15) * 40 = 1400px
    // 但我們需要知道 pagination 後的資料總數...
    // 這裡用 virtualScroll.totalHeight 來計算
  });

  it('沒有 virtualScroll 狀態時渲染所有行', () => {
    const data = generateData(5);
    const trellis = new Trellis<Item>({
      data,
      columns,
      pageSize: 100,
    });

    // 沒有 virtualScroll 狀態
    const { container } = render(
      <TrellisContext.Provider value={trellis.api}>
        <VirtualScrollBody />
      </TrellisContext.Provider>,
    );

    // 應該回退到渲染全部行
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(5);
  });
});
