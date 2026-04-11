import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginManager } from '../src/plugin/plugin-manager';
import type { TrellisAPI, TrellisPlugin } from '../src/types';

// 建立最小化的 mock API 供測試使用
function createMockAPI(): TrellisAPI {
  return {
    getState: vi.fn(() => ({ data: [], columns: [] })) as unknown as TrellisAPI['getState'],
    setState: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    on: vi.fn(() => () => {}),
    emit: vi.fn(),
    registerSlot: vi.fn(() => () => {}),
    getSlot: vi.fn(() => undefined),
  };
}

describe('PluginManager', () => {
  let manager: PluginManager;
  let api: TrellisAPI;

  beforeEach(() => {
    api = createMockAPI();
    manager = new PluginManager(api);
  });

  it('registers a plugin and calls its install method', () => {
    const install = vi.fn();
    const plugin: TrellisPlugin = { name: 'test', install };

    manager.register(plugin);

    expect(install).toHaveBeenCalledWith(api);
  });

  it('throws when registering a plugin with a duplicate name', () => {
    manager.register({ name: 'test', install: vi.fn() });

    expect(() =>
      manager.register({ name: 'test', install: vi.fn() }),
    ).toThrow(/already registered/);
  });

  it('get() returns a registered plugin by name', () => {
    const plugin: TrellisPlugin = { name: 'test', install: vi.fn() };
    manager.register(plugin);

    expect(manager.get('test')).toBe(plugin);
  });

  it('get() returns undefined for unknown plugin', () => {
    expect(manager.get('unknown')).toBeUndefined();
  });

  it('unregister calls the plugin destroy method', () => {
    const destroy = vi.fn();
    manager.register({ name: 'test', install: vi.fn(), destroy });

    manager.unregister('test');

    expect(destroy).toHaveBeenCalledOnce();
    expect(manager.get('test')).toBeUndefined();
  });

  it('unregister is safe for plugins without destroy', () => {
    manager.register({ name: 'test', install: vi.fn() });

    expect(() => manager.unregister('test')).not.toThrow();
  });

  it('unregister is a no-op for unknown plugins', () => {
    expect(() => manager.unregister('unknown')).not.toThrow();
  });

  it('destroyAll calls destroy on all plugins and clears registry', () => {
    const destroy1 = vi.fn();
    const destroy2 = vi.fn();
    manager.register({ name: 'p1', install: vi.fn(), destroy: destroy1 });
    manager.register({ name: 'p2', install: vi.fn(), destroy: destroy2 });

    manager.destroyAll();

    expect(destroy1).toHaveBeenCalledOnce();
    expect(destroy2).toHaveBeenCalledOnce();
    expect(manager.get('p1')).toBeUndefined();
    expect(manager.get('p2')).toBeUndefined();
  });
});
