import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateStore } from '../src/state/store';

interface TestState {
  count: number;
  name: string;
  items: string[];
}

describe('StateStore', () => {
  let store: StateStore<TestState>;

  beforeEach(() => {
    store = new StateStore<TestState>({
      count: 0,
      name: 'test',
      items: [],
    });
  });

  // --- getState ---
  it('returns the initial state', () => {
    const state = store.getState();
    expect(state.count).toBe(0);
    expect(state.name).toBe('test');
    expect(state.items).toEqual([]);
  });

  // --- setState ---
  it('updates state immutably with a partial updater', () => {
    const prev = store.getState();
    store.setState((s) => ({ count: s.count + 1 }));

    const next = store.getState();
    expect(next.count).toBe(1);
    expect(prev).not.toBe(next);
    expect(prev.count).toBe(0); // 舊快照未變更
  });

  it('merges partial updates without losing unrelated fields', () => {
    store.setState(() => ({ count: 5 }));
    const state = store.getState();

    expect(state.count).toBe(5);
    expect(state.name).toBe('test');
  });

  it('replaces arrays entirely (no mutation)', () => {
    store.setState(() => ({ items: ['a', 'b'] }));
    const state = store.getState();

    expect(state.items).toEqual(['a', 'b']);
  });

  // --- immutability ---
  it('getState always returns the latest snapshot', () => {
    store.setState(() => ({ count: 10 }));
    store.setState(() => ({ name: 'updated' }));

    const state = store.getState();
    expect(state.count).toBe(10);
    expect(state.name).toBe('updated');
  });

  // --- subscribe ---
  it('notifies subscribers on state change', () => {
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState(() => ({ count: 1 }));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ count: 1 }),
    );
  });

  it('unsubscribe stops notifications', () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.setState(() => ({ count: 1 }));

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies multiple subscribers', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    store.subscribe(listener1);
    store.subscribe(listener2);

    store.setState(() => ({ count: 1 }));

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it('subscriber receives the new state', () => {
    let receivedState: TestState | undefined;
    store.subscribe((state) => {
      receivedState = state;
    });

    store.setState(() => ({ count: 42 }));

    expect(receivedState?.count).toBe(42);
    expect(receivedState?.name).toBe('test');
  });
});
