import type { TrellisAPI, TrellisPlugin } from '@trellisjs/core';
import { buildQueryFromState } from './types';
import type {
    DatasourcePluginOptions,
    DatasourceState,
    TrellisQuery,
} from './types';
import { validateQuery, validateResponse } from './validation';

/** 以共用查詢協定管理遠端資料與請求生命週期。 */
export function createDatasourcePlugin<
    T extends object = Record<string, unknown>,
>(options: DatasourcePluginOptions<T>): TrellisPlugin<T> {
    let api: TrellisAPI<T>;
    let started = false;
    let destroyed = false;
    let queued = false;
    let revision = 0;
    let controller: AbortController | undefined;
    let queryKey = '';
    const cleanups: (() => void)[] = [];

    function invalidate(): void {
        revision++;
        controller?.abort();
        controller = undefined;
    }

    function setStatus(update: Partial<DatasourceState>): void {
        api.setState((state) => ({
            datasource: { ...state.datasource!, ...update },
        }));
    }

    async function load(): Promise<void> {
        invalidate();
        const current = revision;
        const query = buildQueryFromState(api);
        const request = new AbortController();
        controller = request;
        setStatus({ loading: true, error: null });

        try {
            validateQuery(query);
            const result = await options.datasource.fetch(query, {
                signal: request.signal,
            });

            if (destroyed || current !== revision) {
                return;
            }

            validateResponse<T>(result, query);
            const page = Math.min(
                query.page,
                Math.max(1, Math.ceil(result.filtered / query.pageSize)),
            );
            const state = api.getState();
            api.updateSourceData(page === query.page ? result.data : [], {
                pagination: {
                    ...state.pagination,
                    page,
                    totalItems: result.filtered,
                },
                datasource: {
                    loading: page !== query.page,
                    error: null,
                    total: result.total,
                    filtered: result.filtered,
                },
            });
        } catch (cause) {
            if (!destroyed && current === revision) {
                setStatus({
                    loading: false,
                    error:
                        cause instanceof Error
                            ? cause
                            : new Error(String(cause)),
                });
            }
        } finally {
            if (current === revision) {
                controller = undefined;
            }
        }
    }

    function schedule(): void {
        if (!started || destroyed || queued) {
            return;
        }

        queued = true;
        queueMicrotask(() => {
            if (!queued || destroyed) {
                return;
            }

            queued = false;
            void load();
        });
    }

    function reload(): void {
        invalidate();
        schedule();
    }

    return {
        name: 'datasource',
        install(instance) {
            api = instance;
            const state = api.getState();
            const initial: TrellisQuery = {
                ...buildQueryFromState(api),
                ...options.initialQuery,
            };
            validateQuery(initial);
            api.setState(() => ({
                dataMode: 'server',
                sorting: {
                    sortBy:
                        initial.sort?.map((criterion) => ({ ...criterion })) ??
                        [],
                },
                filtering: {
                    query: initial.filter?.global ?? '',
                    columnFilters: { ...initial.filter?.columns },
                },
                pagination: {
                    ...state.pagination,
                    page: initial.page,
                    pageSize: initial.pageSize,
                    totalItems: 0,
                },
                datasource: {
                    loading: false,
                    error: null,
                    total: 0,
                    filtered: 0,
                },
            }));
            queryKey = JSON.stringify(buildQueryFromState(api));
            cleanups.push(
                api.subscribe(() => {
                    const key = JSON.stringify(buildQueryFromState(api));

                    if (key !== queryKey) {
                        queryKey = key;
                        reload();
                    }
                }),
            );
            cleanups.push(api.on('datasource:reload', reload));
            cleanups.push(api.on('datasource:retry', reload));
            cleanups.push(
                api.on('datasource:cancel', () => {
                    invalidate();
                    queued = false;
                    setStatus({ loading: false, error: null });
                }),
            );
        },
        start() {
            started = true;
            schedule();
        },
        stop() {
            started = false;
            queued = false;
            invalidate();
        },
        destroy() {
            destroyed = true;
            queued = false;
            invalidate();
            cleanups.splice(0).forEach((cleanup) => cleanup());
        },
    };
}
