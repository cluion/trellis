import { describe, it, expect, vi } from 'vitest';
import { Trellis } from '../src/trellis';
import type { TrellisPlugin, TrellisAPI, DataRow } from '../src/types';

const sampleData = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
  { name: 'Charlie', age: 35 },
];

const columns = [
  { id: 'name', accessor: 'name' as const, header: 'Name' },
  { id: 'age', accessor: 'age' as const, header: 'Age' },
];

describe('Transform Pipeline', () => {
  it('依 priority 順序執行 transforms', () => {
    const executionOrder: string[] = [];

    const pluginA: TrellisPlugin = {
      name: 'plugin-a',
      install(api: TrellisAPI) {
        api.registerTransform('a', 20, (data) => {
          executionOrder.push('a');
          return data;
        });
      },
    };

    const pluginB: TrellisPlugin = {
      name: 'plugin-b',
      install(api: TrellisAPI) {
        api.registerTransform('b', 10, (data) => {
          executionOrder.push('b');
          return data;
        });
      },
    };

    new Trellis({ data: sampleData, columns, plugins: [pluginA, pluginB] });

    expect(executionOrder).toEqual(['b', 'a']);
  });

  it('防止遞迴執行', () => {
    let callCount = 0;

    const recursivePlugin: TrellisPlugin = {
      name: 'recursive',
      install(api: TrellisAPI) {
        api.registerTransform('recursive', 10, (data) => {
          callCount++;
          // 在 transform 中觸發 recompute（應被 lock 阻擋）
          api.recompute();
          return data;
        });
      },
    };

    new Trellis({ data: sampleData, columns, plugins: [recursivePlugin] });

    // 只執行一次，不會無限迴圈
    expect(callCount).toBe(1);
  });

  it('recompute 合併狀態更新', () => {
    let capturedQuery = '';

    const trackingPlugin: TrellisPlugin = {
      name: 'tracking',
      install(api: TrellisAPI) {
        api.registerTransform('tracking', 10, (data, state) => {
          capturedQuery = state.filtering.query;
          return data;
        });

        // 模擬 filter:change 事件
        api.recompute({ filtering: { query: 'test', columnFilters: {} } });
      },
    };

    new Trellis({ data: sampleData, columns, plugins: [trackingPlugin] });

    expect(capturedQuery).toBe('test');
  });

  it('updateSourceData 替換原始資料並重跑管線', () => {
    const newData = [
      { name: 'Dave', age: 40 },
      { name: 'Eve', age: 28 },
    ];

    let apiRef: TrellisAPI | undefined;

    const capturePlugin: TrellisPlugin = {
      name: 'capture',
      install(api: TrellisAPI) {
        apiRef = api;
      },
    };

    const trellis = new Trellis({
      data: sampleData,
      columns,
      plugins: [capturePlugin],
    });

    expect(trellis.api.getState().data).toHaveLength(3);

    apiRef!.updateSourceData(newData);

    const state = trellis.api.getState();
    expect(state.data).toHaveLength(2);
    expect(state.data[0].original.name).toBe('Dave');
  });

  it('無 transform 時為 identity', () => {
    const trellis = new Trellis({ data: sampleData, columns });

    const state = trellis.api.getState();
    expect(state.data).toHaveLength(3);
    expect(state.data[0].original.name).toBe('Alice');
    expect(state.pagination.totalItems).toBe(3);
  });

  it('totalItems 為最後一個 transform 前的資料長度', () => {
    // 模擬 pagination：篩選剩 2 筆，切片剩 1 筆，totalItems 應為 2
    const filterPlugin: TrellisPlugin = {
      name: 'filter',
      install(api: TrellisAPI) {
        api.registerTransform('filter', 10, (data) => {
          // 只保留 age > 26
          return data.filter((row) => (row.original as { age: number }).age > 26);
        });
      },
    };

    const paginationPlugin: TrellisPlugin = {
      name: 'pagination',
      install(api: TrellisAPI) {
        api.registerTransform('pagination', 30, (data) => {
          return data.slice(0, 1);
        });
      },
    };

    const trellis = new Trellis({
      data: sampleData,
      columns,
      plugins: [filterPlugin, paginationPlugin],
    });

    const state = trellis.api.getState();
    expect(state.data).toHaveLength(1);
    expect(state.pagination.totalItems).toBe(2); // filter 後、pagination 前
  });

  it('刪除資料後 page 自動校正到有效範圍', () => {
    // 25 筆資料，每頁 5 筆 = 5 頁
    const data25 = Array.from({ length: 25 }, (_, i) => ({ name: `U${i}`, age: i }));
    const cols = [
      { id: 'name', accessor: 'name' as const, header: 'Name' },
      { id: 'age', accessor: 'age' as const, header: 'Age' },
    ];

    const paginationPlugin: TrellisPlugin = {
      name: 'pagination',
      install(api: TrellisAPI) {
        api.registerTransform('pagination', 30, (data, state) => {
          const start = (state.pagination.page - 1) * state.pagination.pageSize;
          return data.slice(start, start + state.pagination.pageSize);
        });
      },
    };

    const trellis = new Trellis({
      data: data25,
      columns: cols,
      pageSize: 5,
      plugins: [paginationPlugin],
    });

    // 導航到第 5 頁
    trellis.api.setState(() => ({
      pagination: { ...trellis.api.getState().pagination, page: 5 },
    }));
    trellis.api.recompute();
    expect(trellis.api.getState().pagination.page).toBe(5);

    // 刪除最後 5 筆 → 只剩 20 筆 = 4 頁
    const last5Ids = trellis.api.getState().data.map((r) => r.id);
    last5Ids.forEach((id) => trellis.api.removeRow(id));

    const state = trellis.api.getState();
    // page 應自動校正到第 4 頁（新的最後一頁）
    expect(state.pagination.page).toBe(4);
    expect(state.pagination.totalItems).toBe(20);
    // 第 4 頁應有資料
    expect(state.data.length).toBeGreaterThan(0);
  });
});
