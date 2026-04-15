import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TableInfo } from '../src/components/table-info';
import { useTrellis } from '../src/hooks/use-trellis';
import { TrellisContext } from '../src/context';
import type { ColumnDef, TrellisAPI } from '@trellisjs/core';
import type { ReactNode } from 'react';

interface User {
  id: number;
  name: string;
  age: number;
}

const columns: ColumnDef<User>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'age', accessor: 'age', header: 'Age' },
];

/**
 * 建立帶有指定 pagination state 的 Wrapper。
 * 透過直接修改 state 來模擬不同分頁情境，避免依賴 pagination 插件。
 */
function createWrapper(
  data: User[],
  paginationOverride?: Partial<{ page: number; pageSize: number; totalItems: number }>,
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const { api } = useTrellis<User>({ data, columns, pageSize: paginationOverride?.pageSize });
    // 直接覆寫 pagination state 以模擬特定頁面
    if (paginationOverride) {
      const current = api.getState().pagination;
      api.setState(() => ({
        pagination: { ...current, ...paginationOverride },
      }));
    }
    return (
      <TrellisContext.Provider value={api}>
        {children}
      </TrellisContext.Provider>
    );
  };
}

// 25 筆資料
const fullData: User[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  age: 20 + i,
}));

describe('TableInfo', () => {
  it('shows default format on first page', () => {
    render(<TableInfo />, { wrapper: createWrapper(fullData, { page: 1, pageSize: 10, totalItems: 25 }) });
    expect(screen.getByText('Showing 1 to 10 of 25 entries')).toBeInTheDocument();
  });

  it('shows correct range on last page', () => {
    render(<TableInfo />, { wrapper: createWrapper(fullData, { page: 3, pageSize: 10, totalItems: 25 }) });
    expect(screen.getByText('Showing 21 to 25 of 25 entries')).toBeInTheDocument();
  });

  it('shows zeros when no data', () => {
    render(<TableInfo />, { wrapper: createWrapper([], { page: 1, pageSize: 10, totalItems: 0 }) });
    expect(screen.getByText('Showing 0 to 0 of 0 entries')).toBeInTheDocument();
  });

  it('supports string template format', () => {
    render(
      <TableInfo format="第 {start} 到 {end} 筆，共 {total} 筆" />,
      { wrapper: createWrapper(fullData, { page: 1, pageSize: 10, totalItems: 25 }) },
    );
    expect(screen.getByText('第 1 到 10 筆，共 25 筆')).toBeInTheDocument();
  });

  it('supports render function format', () => {
    render(
      <TableInfo format={({ start, end, total }) => `${start}-${end}/${total}`} />,
      { wrapper: createWrapper(fullData, { page: 1, pageSize: 10, totalItems: 25 }) },
    );
    expect(screen.getByText('1-10/25')).toBeInTheDocument();
  });
});
