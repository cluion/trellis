import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Trellis } from '@trellisjs/core';
import { createVirtualScrollPlugin } from '../src/virtual-scroll-plugin';
import type { VirtualScrollPlugin } from '../src/virtual-scroll-plugin';
import type { ColumnDef } from '@trellisjs/core';

// Node.js 環境沒有 rAF，手動 mock
const rafCallbacks: Map<number, FrameRequestCallback> = new Map();
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

/** 執行所有 pending rAF callbacks */
function flushRaf() {
  const cbs = [...rafCallbacks.values()];
  rafCallbacks.clear();
  cbs.forEach((cb) => cb(performance.now()));
}

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

/**
 * 建立一個 mock HTMLElement 來模擬滾動容器。
 */
function createMockScrollElement(overrides: {
  scrollTop?: number;
  clientHeight?: number;
} = {}) {
  const listeners: Record<string, EventListener[]> = {};
  return {
    scrollTop: overrides.scrollTop ?? 0,
    clientHeight: overrides.clientHeight ?? 400,
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: EventListener) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
    /** 模擬觸發 scroll 事件 */
    simulateScroll(scrollTop: number) {
      this.scrollTop = scrollTop;
      const handlers = listeners['scroll'] ?? [];
      handlers.forEach((h) => h(new Event('scroll')));
    },
  };
}

describe('VirtualScrollPlugin', () => {
  describe('工廠函式', () => {
    it('回傳正確的插件名稱', () => {
      const plugin = createVirtualScrollPlugin();
      expect(plugin.name).toBe('virtualScroll');
    });

    it('install 時註冊 priority=35 的 transform', () => {
      const mockApi = {
        getState: vi.fn(() => ({
          data: [],
          columns,
          sorting: { sortBy: [] },
          filtering: { query: '', columnFilters: {} },
          pagination: { page: 1, pageSize: 10, totalItems: 0 },
          selection: new Set(),
          columnVisibility: {},
          virtualScroll: undefined,
        })),
        setState: vi.fn(),
        subscribe: vi.fn(() => () => {}),
        on: vi.fn(() => () => {}),
        emit: vi.fn(),
        registerSlot: vi.fn(() => () => {}),
        getSlot: vi.fn(),
        registerTransform: vi.fn(),
        recompute: vi.fn(),
        updateSourceData: vi.fn(),
        addRow: vi.fn(),
        removeRow: vi.fn(),
        updateRow: vi.fn(),
      };

      const plugin = createVirtualScrollPlugin();
      plugin.install(mockApi);

      expect(mockApi.registerTransform).toHaveBeenCalledWith(
        'virtualScroll',
        35,
        expect.any(Function),
      );
    });

    it('使用預設選項時不 throw', () => {
      const trellis = new Trellis<Item>({
        data: generateData(100),
        columns,
        plugins: [createVirtualScrollPlugin()],
      });

      const state = trellis.api.getState();
      expect(state).toBeDefined();
    });

    it('提供 attachScrollContainer 方法', () => {
      const plugin = createVirtualScrollPlugin();
      expect(typeof plugin.attachScrollContainer).toBe('function');
      expect(typeof plugin.detachScrollContainer).toBe('function');
    });
  });

  describe('virtualScroll transform', () => {
    it('根據 startIndex/endIndex 切片資料', () => {
      const trellis = new Trellis<Item>({
        data: generateData(100),
        columns,
        pageSize: 100,
        plugins: [createVirtualScrollPlugin({ rowHeight: 40 })],
      });

      trellis.api.recompute({
        virtualScroll: {
          startIndex: 10,
          endIndex: 20,
          totalHeight: 4000,
          rowHeight: 40,
        },
      } as any);

      const state = trellis.api.getState();
      expect(state.data).toHaveLength(10);
      expect(state.data[0].original.name).toBe('Item 11');
      expect(state.data[9].original.name).toBe('Item 20');
    });

    it('接近資料開頭時 startIndex 被 clamp 為 0', () => {
      const trellis = new Trellis<Item>({
        data: generateData(50),
        columns,
        pageSize: 100,
        plugins: [createVirtualScrollPlugin({ rowHeight: 40 })],
      });

      trellis.api.recompute({
        virtualScroll: {
          startIndex: 0,
          endIndex: 15,
          totalHeight: 2000,
          rowHeight: 40,
        },
      } as any);

      const state = trellis.api.getState();
      expect(state.data[0].original.name).toBe('Item 1');
      expect(state.data).toHaveLength(15);
    });

    it('接近資料結尾時 endIndex 被 clamp 為資料長度', () => {
      const trellis = new Trellis<Item>({
        data: generateData(30),
        columns,
        pageSize: 100,
        plugins: [createVirtualScrollPlugin({ rowHeight: 40 })],
      });

      trellis.api.recompute({
        virtualScroll: {
          startIndex: 25,
          endIndex: 40,
          totalHeight: 1200,
          rowHeight: 40,
        },
      } as any);

      const state = trellis.api.getState();
      expect(state.data).toHaveLength(5);
      expect(state.data[0].original.name).toBe('Item 26');
    });

    it('virtualScroll 為 undefined 時回傳完整資料', () => {
      const trellis = new Trellis<Item>({
        data: generateData(50),
        columns,
        pageSize: 100,
        plugins: [createVirtualScrollPlugin({ rowHeight: 40 })],
      });

      // 不設定 virtualScroll，transform 不切片
      const state = trellis.api.getState();
      expect(state.data).toHaveLength(50);
    });
  });

  describe('滾動事件處理', () => {
    it('attachScrollContainer 後計算初始 virtualScroll 狀態', () => {
      const plugin = createVirtualScrollPlugin({ rowHeight: 40, overscan: 5 });
      const trellis = new Trellis<Item>({
        data: generateData(100),
        columns,
        pageSize: 100,
        plugins: [plugin],
      });

      const mockElement = createMockScrollElement({
        scrollTop: 0,
        clientHeight: 400,
      });

      plugin.attachScrollContainer(mockElement as any);

      const state = trellis.api.getState();
      expect(state.virtualScroll).toBeDefined();
      expect(state.virtualScroll!.startIndex).toBe(0);
      // 400px / 40px = 10 visible rows, + 5 overscan = 15 endIndex
      expect(state.virtualScroll!.endIndex).toBe(15);
      expect(state.virtualScroll!.rowHeight).toBe(40);

      plugin.destroy();
    });

    it('scroll 事件觸發 recompute 更新 startIndex/endIndex', () => {
      const plugin = createVirtualScrollPlugin({ rowHeight: 40, overscan: 5 });
      const trellis = new Trellis<Item>({
        data: generateData(100),
        columns,
        pageSize: 100,
        plugins: [plugin],
      });

      const mockElement = createMockScrollElement({
        scrollTop: 0,
        clientHeight: 400,
      });

      plugin.attachScrollContainer(mockElement as any);

      // 模擬滾動到 400px
      mockElement.simulateScroll(400);

      // 觸發 rAF
      flushRaf();

      const state = trellis.api.getState();
      expect(state.virtualScroll!.startIndex).toBe(5);
      expect(state.virtualScroll!.endIndex).toBe(25);

      plugin.destroy();
    });

    it('快速連續滾動只觸發一次 recompute（rAF 合併）', async () => {

      const plugin = createVirtualScrollPlugin({ rowHeight: 40, overscan: 5 });
      const trellis = new Trellis<Item>({
        data: generateData(100),
        columns,
        pageSize: 100,
        plugins: [plugin],
      });

      const mockElement = createMockScrollElement({
        scrollTop: 0,
        clientHeight: 400,
      });

      plugin.attachScrollContainer(mockElement as any);

      // 初始 recompute
      const stateBefore = trellis.api.getState();

      // 連續觸發 3 次 scroll 事件
      mockElement.simulateScroll(100);
      mockElement.simulateScroll(200);
      mockElement.simulateScroll(400);

      // 在 rAF 執行前，資料還沒變
      const stateMid = trellis.api.getState();
      expect(stateMid.virtualScroll!.startIndex).toBe(0);

      // 觸發 rAF（只執行一次，因為 dirty flag 阻止了多次 rAF 排程）
      flushRaf();

      const stateAfter = trellis.api.getState();
      // 應該只基於最後的 scrollTop=400 計算
      expect(stateAfter.virtualScroll!.startIndex).toBe(5);
      expect(stateAfter.virtualScroll!.endIndex).toBe(25);

      plugin.destroy();
    });
  });

  describe('插件銷毀', () => {
    it('destroy 時移除 scroll listener', () => {
      const plugin = createVirtualScrollPlugin({ rowHeight: 40 });
      const mockElement = createMockScrollElement({
        scrollTop: 0,
        clientHeight: 400,
      });

      const trellis = new Trellis<Item>({
        data: generateData(100),
        columns,
        pageSize: 100,
        plugins: [plugin],
      });

      plugin.attachScrollContainer(mockElement as any);
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        { passive: true },
      );

      plugin.destroy();

      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
      );
    });

    it('destroy 後 scroll 事件不再觸發 recompute', () => {
      const plugin = createVirtualScrollPlugin({ rowHeight: 40 });
      const trellis = new Trellis<Item>({
        data: generateData(100),
        columns,
        pageSize: 100,
        plugins: [plugin],
      });

      const mockElement = createMockScrollElement({
        scrollTop: 0,
        clientHeight: 400,
      });

      plugin.attachScrollContainer(mockElement as any);
      const stateBefore = trellis.api.getState();
      const initialStartIndex = stateBefore.virtualScroll!.startIndex;

      plugin.destroy();

      // destroy 後滾動不應觸發 recompute
      mockElement.simulateScroll(400);
      flushRaf();

      const stateAfter = trellis.api.getState();
      // startIndex 不應改變
      expect(stateAfter.virtualScroll!.startIndex).toBe(initialStartIndex);
    });
  });
});
