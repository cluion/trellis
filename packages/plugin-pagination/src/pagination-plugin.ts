import type { TrellisPlugin, TrellisAPI, DataRow } from '@trellisjs/core';

/**
 * 建立分頁插件實例。
 * 管理資料的頁碼導航。
 */
export function createPaginationPlugin(): TrellisPlugin {
  return {
    name: 'pagination',

    install(api: TrellisAPI) {
      // 儲存完整資料
      let allData: DataRow[] = [...api.getState().data];

      // 套用初始分頁
      applyPagination(api, allData);

      api.on('pagination:next', () => {
        const state = api.getState();
        const totalPages = getTotalPages(allData, state.pagination.pageSize);
        if (state.pagination.page < totalPages) {
          api.setState(() => ({
            pagination: { ...state.pagination, page: state.pagination.page + 1 },
          }));
          applyPagination(api, allData);
        }
      });

      api.on('pagination:prev', () => {
        const state = api.getState();
        if (state.pagination.page > 1) {
          api.setState(() => ({
            pagination: { ...state.pagination, page: state.pagination.page - 1 },
          }));
          applyPagination(api, allData);
        }
      });

      api.on('pagination:goto', (payload) => {
        const { page } = payload as { page: number };
        const state = api.getState();
        const totalPages = getTotalPages(allData, state.pagination.pageSize);
        const target = Math.max(1, Math.min(page, totalPages));

        api.setState(() => ({
          pagination: { ...state.pagination, page: target },
        }));
        applyPagination(api, allData);
      });

      api.on('pagination:pageSize', (payload) => {
        const { pageSize } = payload as { pageSize: number };

        api.setState(() => ({
          pagination: { page: 1, pageSize },
        }));
        applyPagination(api, allData);
      });
    },
  };
}

function getTotalPages(allData: DataRow[], pageSize: number): number {
  return Math.max(1, Math.ceil(allData.length / pageSize));
}

function applyPagination(api: TrellisAPI, allData: DataRow[]): void {
  const state = api.getState();
  const { page, pageSize } = state.pagination;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const sliced = allData.slice(start, end);

  api.setState(() => ({ data: sliced }));
}
