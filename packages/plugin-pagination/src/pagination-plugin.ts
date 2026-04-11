import type { TrellisPlugin, TrellisAPI, DataRow, PaginationState } from '@trellisjs/core';

/**
 * 建立分頁插件實例。
 * 管理資料的頁碼導航。
 * 會響應上游插件（排序、篩選）的資料變更並重新分頁。
 */
export function createPaginationPlugin(): TrellisPlugin {
  return {
    name: 'pagination',

    install(api: TrellisAPI) {
      // 儲存分頁前的來源資料（可能已排序/篩選）
      let sourceData: DataRow[] = [...api.getState().data];
      // 防止自己的 setState 觸發重複分頁
      let selfUpdate = false;

      // 套用初始分頁
      applyPagination(api, sourceData, true);

      // 訂閱狀態變更 — 當上游插件（sort/filter）改變 data 時重新分頁
      api.subscribe((newState) => {
        if (selfUpdate) {
          selfUpdate = false;
          return;
        }
        // 上游插件改變了資料 — 採用為新的來源並重設到第 1 頁
        sourceData = newState.data;
        selfUpdate = true;
        applyPagination(api, sourceData, true);
      });

      api.on('pagination:next', () => {
        const state = api.getState();
        const totalPages = getTotalPages(sourceData.length, state.pagination.pageSize);
        if (state.pagination.page >= totalPages) return;
        const newPage = state.pagination.page + 1;
        const start = (newPage - 1) * state.pagination.pageSize;
        selfUpdate = true;
        api.setState(() => ({
          pagination: buildPagination(newPage, state.pagination.pageSize, sourceData.length),
          data: sourceData.slice(start, start + state.pagination.pageSize),
        }));
      });

      api.on('pagination:prev', () => {
        const state = api.getState();
        if (state.pagination.page <= 1) return;
        const newPage = state.pagination.page - 1;
        const start = (newPage - 1) * state.pagination.pageSize;
        selfUpdate = true;
        api.setState(() => ({
          pagination: buildPagination(newPage, state.pagination.pageSize, sourceData.length),
          data: sourceData.slice(start, start + state.pagination.pageSize),
        }));
      });

      api.on('pagination:goto', (payload) => {
        const { page } = payload as { page: number };
        const state = api.getState();
        const totalPages = getTotalPages(sourceData.length, state.pagination.pageSize);
        const target = Math.max(1, Math.min(page, totalPages));
        const start = (target - 1) * state.pagination.pageSize;
        selfUpdate = true;
        api.setState(() => ({
          pagination: buildPagination(target, state.pagination.pageSize, sourceData.length),
          data: sourceData.slice(start, start + state.pagination.pageSize),
        }));
      });

      api.on('pagination:pageSize', (payload) => {
        const { pageSize } = payload as { pageSize: number };
        selfUpdate = true;
        api.setState(() => ({
          pagination: buildPagination(1, pageSize, sourceData.length),
          data: sourceData.slice(0, pageSize),
        }));
      });
    },
  };
}

function buildPagination(page: number, pageSize: number, totalItems: number): PaginationState {
  return { page, pageSize, totalItems };
}

function getTotalPages(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

function applyPagination(api: TrellisAPI, sourceData: DataRow[], resetToPage1?: boolean): void {
  const state = api.getState();
  const page = resetToPage1 ? 1 : state.pagination.page;
  const { pageSize } = state.pagination;
  const start = (page - 1) * pageSize;
  const sliced = sourceData.slice(start, start + pageSize);

  api.setState(() => ({
    pagination: buildPagination(page, pageSize, sourceData.length),
    data: sliced,
  }));
}
