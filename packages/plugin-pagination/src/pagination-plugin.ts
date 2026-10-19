import type { TrellisPlugin, TrellisAPI } from '@trellisjs/core';

export interface PaginationGotoPayload {
    page: number;
}

export interface PaginationPageSizePayload {
    pageSize: number;
}

declare module '@trellisjs/core' {
    interface TrellisEventMap {
        'pagination:next': void;
        'pagination:prev': void;
        'pagination:goto': PaginationGotoPayload;
        'pagination:pageSize': PaginationPageSizePayload;
    }
}

/**
 * 建立分頁插件實例。
 * 管理資料的頁碼導航。
 * 透過管線轉換函式處理分頁切片。
 */
export function createPaginationPlugin(): TrellisPlugin {
    return {
        name: 'pagination',

        install(api: TrellisAPI) {
            // 註冊管線轉換函式 (priority=30)
            api.registerTransform('pagination', 30, (data, state) => {
                const { page, pageSize } = state.pagination;
                const start = (page - 1) * pageSize;

                return data.slice(start, start + pageSize);
            });

            api.on('pagination:next', () => {
                const state = api.getState();
                const totalPages = getTotalPages(
                    state.pagination.totalItems,
                    state.pagination.pageSize,
                );

                if (state.pagination.page >= totalPages) {
                    return;
                }

                const newPage = state.pagination.page + 1;
                api.recompute({
                    pagination: { ...state.pagination, page: newPage },
                });
            });

            api.on('pagination:prev', () => {
                const state = api.getState();

                if (state.pagination.page <= 1) {
                    return;
                }

                const newPage = state.pagination.page - 1;
                api.recompute({
                    pagination: { ...state.pagination, page: newPage },
                });
            });

            api.on('pagination:goto', (payload) => {
                const { page } = payload;
                const state = api.getState();
                const totalPages = getTotalPages(
                    state.pagination.totalItems,
                    state.pagination.pageSize,
                );
                const target = Math.max(1, Math.min(page, totalPages));
                api.recompute({
                    pagination: { ...state.pagination, page: target },
                });
            });

            api.on('pagination:pageSize', (payload) => {
                const { pageSize } = payload;
                const state = api.getState();
                api.recompute({
                    pagination: { ...state.pagination, page: 1, pageSize },
                });
            });
        },
    };
}

function getTotalPages(totalCount: number, pageSize: number): number {
    return Math.max(1, Math.ceil(totalCount / pageSize));
}
