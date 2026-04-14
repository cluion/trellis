import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Trellis } from '../src/trellis';
import type { TrellisPlugin, TrellisAPI, ColumnDef } from '../src/types';

interface User {
  name: string;
  age: number;
  email: string;
}

const sampleData: User[] = [
  { name: 'Alice', age: 30, email: 'alice@test.com' },
  { name: 'Bob', age: 25, email: 'bob@test.com' },
  { name: 'Charlie', age: 35, email: 'charlie@test.com' },
];

const sampleColumns: ColumnDef<User>[] = [
  { id: 'name', accessor: 'name', header: 'Name' },
  { id: 'age', accessor: 'age', header: 'Age' },
  { id: 'email', accessor: 'email', header: 'Email' },
];

describe('Trellis', () => {
  let trellis: Trellis<User>;

  beforeEach(() => {
    trellis = new Trellis<User>({
      data: sampleData,
      columns: sampleColumns,
    });
  });

  // --- 初始化 ---
  it('initializes with data and columns', () => {
    const state = trellis.api.getState();
    expect(state.data).toHaveLength(3);
    expect(state.columns).toHaveLength(3);
  });

  it('wraps raw data into DataRow objects with IDs', () => {
    const state = trellis.api.getState();
    expect(state.data[0]).toEqual({
      id: '0',
      original: sampleData[0],
      index: 0,
    });
  });

  it('sets default pagination state', () => {
    const state = trellis.api.getState();
    expect(state.pagination).toEqual({ page: 1, pageSize: 10, totalItems: 3 });
  });

  it('respects custom pageSize option', () => {
    const custom = new Trellis<User>({
      data: sampleData,
      columns: sampleColumns,
      pageSize: 25,
    });
    expect(custom.api.getState().pagination.pageSize).toBe(25);
  });

  // --- 狀態管理 ---
  it('setState produces new immutable state', () => {
    const prev = trellis.api.getState();
    trellis.api.setState((s) => ({
      pagination: { ...s.pagination, page: 2 },
    }));
    const next = trellis.api.getState();

    expect(next.pagination.page).toBe(2);
    expect(prev.pagination.page).toBe(1);
    expect(prev).not.toBe(next);
  });

  it('subscribe notifies on state change', () => {
    const listener = vi.fn();
    trellis.api.subscribe(listener);

    trellis.api.setState((s) => ({
      pagination: { ...s.pagination, page: 3 },
    }));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].pagination.page).toBe(3);
  });

  // --- 插件系統 ---
  it('registers plugins from options', () => {
    const install = vi.fn();
    const plugin: TrellisPlugin<User> = { name: 'test', install };

    const instance = new Trellis<User>({
      data: sampleData,
      columns: sampleColumns,
      plugins: [plugin],
    });

    expect(install).toHaveBeenCalledWith(instance.api);
  });

  it('plugins can modify state via API', () => {
    const plugin: TrellisPlugin<User> = {
      name: 'modifier',
      install: (api) => {
        api.setState((s) => ({
          pagination: { ...s.pagination, pageSize: 50 },
        }));
      },
    };

    const instance = new Trellis<User>({
      data: sampleData,
      columns: sampleColumns,
      plugins: [plugin],
    });

    expect(instance.api.getState().pagination.pageSize).toBe(50);
  });

  // --- 事件匯流排 ---
  it('emits and receives events', () => {
    const handler = vi.fn();
    trellis.api.on('custom:event', handler);
    trellis.api.emit('custom:event', { key: 'value' });

    expect(handler).toHaveBeenCalledWith({ key: 'value' });
  });

  // --- 插槽系統 ---
  it('registers and retrieves slots', () => {
    const renderer = (ctx: unknown) => 'custom';
    trellis.api.registerSlot('customSlot', renderer);

    expect(trellis.api.getSlot('customSlot')).toBe(renderer);
  });

  // --- 銷毀 ---
  it('destroy cleans up plugins and events', () => {
    const destroy = vi.fn();
    const plugin: TrellisPlugin<User> = {
      name: 'cleanup-test',
      install: vi.fn(),
      destroy,
    };

    const instance = new Trellis<User>({
      data: sampleData,
      columns: sampleColumns,
      plugins: [plugin],
    });

    const handler = vi.fn();
    instance.api.on('test', handler);

    instance.destroy();

    expect(destroy).toHaveBeenCalled();

    // 銷毀後發送事件不應到達處理器
    instance.api.emit('test', null);
    expect(handler).not.toHaveBeenCalled();
  });

  // --- rowId 選項 ---
  it('supports custom rowId via function', () => {
    const instance = new Trellis<User>({
      data: sampleData,
      columns: sampleColumns,
      rowId: (row) => row.email,
    });

    const state = instance.api.getState();
    expect(state.data[0].id).toBe('alice@test.com');
  });

  it('supports custom rowId via key', () => {
    const instance = new Trellis<User>({
      data: sampleData,
      columns: sampleColumns,
      rowId: 'email',
    });

    const state = instance.api.getState();
    expect(state.data[1].id).toBe('bob@test.com');
  });

  // --- 動態資料操作 ---
  describe('addRow', () => {
    it('adds a row to sourceData and updates state.data', () => {
      trellis.api.addRow({ name: 'Dave', age: 28, email: 'dave@test.com' });

      const state = trellis.api.getState();
      expect(state.data).toHaveLength(4);
      expect(state.data[3].original.name).toBe('Dave');
    });

    it('auto-generates ID based on index', () => {
      trellis.api.addRow({ name: 'Dave', age: 28, email: 'dave@test.com' });

      const state = trellis.api.getState();
      expect(state.data[3].id).toBe('3');
    });

    it('emits data:added event with new row ID', () => {
      const handler = vi.fn();
      trellis.api.on('data:added', handler);

      trellis.api.addRow({ name: 'Dave', age: 28, email: 'dave@test.com' });

      expect(handler).toHaveBeenCalledWith('3');
    });

    it('re-runs pipeline (respects sorting)', () => {
      const sorted = new Trellis<User>({
        data: sampleData,
        columns: sampleColumns,
        plugins: [
          {
            name: 'sort',
            install: (api) => {
              api.registerTransform('sort', 20, (data) =>
                [...data].sort((a, b) => a.original.age - b.original.age),
              );
            },
          },
        ],
      });

      sorted.api.addRow({ name: 'Dave', age: 22, email: 'dave@test.com' });

      const state = sorted.api.getState();
      // Dave (22) should be first after sorting by age
      expect(state.data[0].original.name).toBe('Dave');
    });
  });

  describe('removeRow', () => {
    it('removes a row by ID', () => {
      trellis.api.removeRow('1');

      const state = trellis.api.getState();
      expect(state.data).toHaveLength(2);
      expect(state.data.find((r) => r.id === '1')).toBeUndefined();
    });

    it('is a no-op for non-existent ID', () => {
      const before = trellis.api.getState().data;
      trellis.api.removeRow('nonexistent');

      const after = trellis.api.getState();
      expect(after.data).toHaveLength(before.length);
    });

    it('emits data:removed event with removed ID', () => {
      const handler = vi.fn();
      trellis.api.on('data:removed', handler);

      trellis.api.removeRow('1');

      expect(handler).toHaveBeenCalledWith('1');
    });

    it('does not emit event for non-existent ID', () => {
      const handler = vi.fn();
      trellis.api.on('data:removed', handler);

      trellis.api.removeRow('nonexistent');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('updateRow', () => {
    it('merges partial update into existing row', () => {
      trellis.api.updateRow('1', { age: 99 });

      const state = trellis.api.getState();
      const row = state.data.find((r) => r.id === '1');
      expect(row?.original.age).toBe(99);
      expect(row?.original.name).toBe('Bob');
    });

    it('is a no-op for non-existent ID', () => {
      const before = trellis.api.getState().data;
      trellis.api.updateRow('nonexistent', { age: 99 });

      const after = trellis.api.getState();
      expect(after.data).toHaveLength(before.length);
    });

    it('emits data:updated event with updated ID', () => {
      const handler = vi.fn();
      trellis.api.on('data:updated', handler);

      trellis.api.updateRow('1', { age: 99 });

      expect(handler).toHaveBeenCalledWith('1');
    });

    it('re-runs pipeline after update', () => {
      const sorted = new Trellis<User>({
        data: sampleData,
        columns: sampleColumns,
        plugins: [
          {
            name: 'sort',
            install: (api) => {
              api.registerTransform('sort', 20, (data) =>
                [...data].sort((a, b) => a.original.age - b.original.age),
              );
            },
          },
        ],
      });

      // Update Alice's age from 30 to 40 — she should move to last position
      sorted.api.updateRow('0', { age: 40 });

      const state = sorted.api.getState();
      expect(state.data[state.data.length - 1].original.name).toBe('Alice');
    });
  });
});
