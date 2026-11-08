import { renderHook, act } from '@testing-library/react';
import type { ColumnDef } from '@trellisjs/core';
import { StrictMode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createDatasourcePlugin } from '../../plugin-datasource/src';
import type {
    TrellisDatasource,
    TrellisResponse,
} from '../../plugin-datasource/src';
import { useTrellis } from '../src/hooks/use-trellis';

interface User {
    name: string;
    age: number;
}

const data: User[] = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
];

const columns: ColumnDef<User>[] = [
    { id: 'name', accessor: 'name', header: 'Name' },
    { id: 'age', accessor: 'age', header: 'Age' },
];

describe('useTrellis', () => {
    it('creates a trellis instance with data and columns', () => {
        const { result } = renderHook(() => useTrellis({ data, columns }));

        const state = result.current.api.getState();
        expect(state.data).toHaveLength(2);
        expect(state.columns).toHaveLength(2);
    });

    it('returns a stable API reference across re-renders', () => {
        const { result, rerender } = renderHook(() =>
            useTrellis({ data, columns }),
        );

        const firstApi = result.current.api;
        rerender({ data, columns });
        const secondApi = result.current.api;

        expect(firstApi).toBe(secondApi);
    });

    it('triggers re-render when state changes', () => {
        const { result } = renderHook(() => useTrellis({ data, columns }));

        act(() => {
            result.current.api.setState((s) => ({
                pagination: { ...s.pagination, page: 5 },
            }));
        });

        expect(result.current.api.getState().pagination.page).toBe(5);
    });

    it('cleans up on unmount', () => {
        const { unmount } = renderHook(() => useTrellis({ data, columns }));

        expect(() => unmount()).not.toThrow();
    });

    it('accepts plugins option', () => {
        const install = vi.fn();
        renderHook(() =>
            useTrellis({
                data,
                columns,
                plugins: [{ name: 'test', install }],
            }),
        );

        expect(install).toHaveBeenCalled();
    });

    it('StrictMode 只啟動一次請求，綁定回應並在卸載後清理', async () => {
        let resolve!: (response: TrellisResponse<User>) => void;
        const fetch = vi
            .fn<TrellisDatasource<User>['fetch']>()
            .mockImplementation(
                () =>
                    new Promise((done) => {
                        resolve = done;
                    }),
            );
        const plugin = createDatasourcePlugin({ datasource: { fetch } });
        const { result, unmount } = renderHook(
            () => useTrellis<User>({ data: [], columns, plugins: [plugin] }),
            { wrapper: StrictMode },
        );
        await act(async () => {
            await Promise.resolve();
        });
        expect(fetch).toHaveBeenCalledOnce();
        expect(result.current.api.getState().datasource?.loading).toBe(true);
        await act(async () => {
            resolve({ data, total: 100, filtered: 2 });
        });
        expect(
            result.current.api.getState().data.map((row) => row.original),
        ).toEqual(data);
        expect(result.current.api.getState().pagination.totalItems).toBe(2);
        await act(async () => {
            result.current.api.emit('datasource:reload');
        });
        const api = result.current.api;
        const signal = fetch.mock.lastCall?.[1]?.signal;
        unmount();
        await Promise.resolve();
        expect(signal?.aborted).toBe(true);
        const before = api.getState();
        await act(async () => {
            resolve({ data: [], total: 0, filtered: 0 });
        });
        expect(api.getState()).toBe(before);
    });

    it('真正卸載時 destroy 插件一次', async () => {
        const destroy = vi.fn();
        const { unmount } = renderHook(
            () =>
                useTrellis({
                    data,
                    columns,
                    plugins: [{ name: 'cleanup', install() {}, destroy }],
                }),
            { wrapper: StrictMode },
        );
        expect(destroy).not.toHaveBeenCalled();
        unmount();
        await Promise.resolve();
        expect(destroy).toHaveBeenCalledOnce();
    });

    it('回應已排入 microtask 時立即卸載，也不可再套用資料', async () => {
        let resolve!: (response: TrellisResponse<User>) => void;
        const fetch = vi
            .fn<TrellisDatasource<User>['fetch']>()
            .mockImplementation(
                () =>
                    new Promise((done) => {
                        resolve = done;
                    }),
            );
        const { result, unmount } = renderHook(
            () =>
                useTrellis<User>({
                    data: [],
                    columns,
                    plugins: [
                        createDatasourcePlugin({ datasource: { fetch } }),
                    ],
                }),
            { wrapper: StrictMode },
        );
        await act(async () => {
            await Promise.resolve();
        });
        const api = result.current.api;
        const previousRows = api.getState().data;
        resolve({ data, total: 100, filtered: 2 });
        unmount();
        expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
        await Promise.resolve();
        expect(api.getState().data).toBe(previousRows);
    });
});
