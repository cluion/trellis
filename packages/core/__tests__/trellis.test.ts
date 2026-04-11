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
    expect(state.pagination).toEqual({ page: 1, pageSize: 10 });
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
});
