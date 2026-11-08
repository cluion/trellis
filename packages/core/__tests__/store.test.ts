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
    it('copies nested inputs without freezing or retaining caller-owned containers', () => {
        const input = {
            nested: { count: 1 },
            items: [{ value: 2 }],
            selection: new Set(['a']),
        };
        const protectedStore = new StateStore(input);
        input.nested.count = 9;
        input.items[0].value = 9;
        input.selection.add('outside');
        expect(protectedStore.getState()).toEqual({
            nested: { count: 1 },
            items: [{ value: 2 }],
            selection: new Set(['a']),
        });
        expect(Object.isFrozen(input.nested)).toBe(false);
        expect(Object.isFrozen(input.items)).toBe(false);
    });

    it('rejects nested mutation in snapshots and updater callbacks without notifying', () => {
        const protectedStore = new StateStore({
            nested: { count: 1 },
            items: ['a'],
        });
        const listener = vi.fn();
        protectedStore.subscribe(listener);
        const state = protectedStore.getState();
        expect(() => {
            state.nested.count = 2;
        }).toThrow(TypeError);
        expect(() => state.items.push('b')).toThrow(TypeError);
        expect(() =>
            protectedStore.setState((prev) => {
                prev.nested.count = 3;

                return {};
            }),
        ).toThrow(TypeError);
        expect(protectedStore.getState()).toBe(state);
        expect(listener).not.toHaveBeenCalled();
    });

    it('blocks Set mutators while preserving reads, iteration and instanceof', () => {
        const state = new StateStore({
            selection: new Set(['a', 'b']),
        }).getState();
        expect(state.selection instanceof Set).toBe(true);
        expect(state.selection.has('a')).toBe(true);
        expect(state.selection.size).toBe(2);
        expect([...state.selection]).toEqual(['a', 'b']);
        expect([...state.selection.entries()]).toEqual([
            ['a', 'a'],
            ['b', 'b'],
        ]);
        expect(() => state.selection.add('c')).toThrow(/readonly/);
        expect(() => state.selection.delete('a')).toThrow(/readonly/);
        expect(() => state.selection.clear()).toThrow(/readonly/);
        expect(() =>
            state.selection.forEach((_value, _key, set) => set.add('c')),
        ).toThrow(/readonly/);
        expect(() => Set.prototype.add.call(state.selection, 'c')).toThrow(
            TypeError,
        );
        expect(state.selection.valueOf()).toBe(state.selection);
        const union = Reflect.get(state.selection, 'union') as
            undefined | ((other: Set<string>) => Set<string>);

        if (union) {
            expect([...union(new Set(['c']))]).toEqual(['a', 'b', 'c']);
        }
    });

    it('retains old snapshots and shares unchanged protected branches', () => {
        const initial = {
            nested: { count: 1 },
            selection: new Set(['a']),
            page: 1,
        };
        const protectedStore = new StateStore(initial);
        const previous = protectedStore.getState();
        const nextSet = new Set(previous.selection);
        nextSet.add('b');
        protectedStore.setState(() => ({ selection: nextSet, page: 2 }));
        nextSet.clear();
        expect([...previous.selection]).toEqual(['a']);
        expect([...protectedStore.getState().selection]).toEqual(['a', 'b']);
        expect(protectedStore.getState().nested).toBe(previous.nested);
        expect(previous.page).toBe(1);
    });

    it('supports cycles and symbol properties while retaining opaque class instances', () => {
        const symbol = Symbol('state');
        const date = new Date(0);
        const input = { [symbol]: { value: 1 }, date } as {
            [symbol]: { value: number };
            date: Date;
            self?: unknown;
        };
        input.self = input;
        const state = new StateStore(input).getState();
        expect(state.self).toBe(state);
        expect(() => {
            state[symbol].value = 2;
        }).toThrow(TypeError);
        expect(state.date).toBe(date);
        expect(Object.isFrozen(date)).toBe(false);
    });

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
