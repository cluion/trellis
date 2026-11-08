<script setup lang="ts">
import type { ColumnDef } from '@trellisjs/core';
import {
    createDatasourcePlugin,
    createRemoteDatasource,
} from '@trellisjs/plugin-datasource';
import { createFilterPlugin } from '@trellisjs/plugin-filter';
import { createPaginationPlugin } from '@trellisjs/plugin-pagination';
import { createSortPlugin } from '@trellisjs/plugin-sort';
import { TlTable, useTrellis } from '@trellisjs/vue';
import { computed } from 'vue';

interface User {
    id: number;
    name: string;
    email: string;
}

const columns: ColumnDef<User>[] = [
    { id: 'id', accessor: 'id', header: 'ID' },
    { id: 'name', accessor: 'name', header: '姓名' },
    { id: 'email', accessor: 'email', header: 'Email' },
];
const { api, state } = useTrellis<User>({
    data: [],
    columns,
    rowId: 'id',
    plugins: [
        createDatasourcePlugin({
            datasource: createRemoteDatasource<User>({
                url: '/api/users?scope=active',
                method: 'GET',
            }),
            initialQuery: {
                page: 1,
                pageSize: 10,
                sort: [{ columnId: 'name', direction: 'asc' }],
                filter: { global: '' },
            },
        }),
        createFilterPlugin({ searchDebounceMs: 250 }),
        createSortPlugin(),
        createPaginationPlugin(),
    ],
});
const request = computed(() => state.value.datasource!);
const totalPages = computed(() =>
    Math.max(
        1,
        Math.ceil(
            state.value.pagination.totalItems / state.value.pagination.pageSize,
        ),
    ),
);

function search(event: Event) {
    api.emit('filter:change', {
        query: (event.target as HTMLInputElement).value,
    });
}

function pageSize(event: Event) {
    api.emit('pagination:pageSize', {
        pageSize: Number((event.target as HTMLSelectElement).value),
    });
}
</script>

<template>
    <section :aria-busy="request.loading">
        <label>
            搜尋
            <input
                type="search"
                :value="state.filtering.query"
                @input="search"
            />
        </label>
        <label>
            每頁筆數
            <select :value="state.pagination.pageSize" @change="pageSize">
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
            </select>
        </label>
        <button
            type="button"
            @click="
                api.emit('sort:change', { columnId: 'name', direction: 'asc' })
            "
        >
            姓名升冪
        </button>
        <button
            type="button"
            @click="
                api.emit('sort:change', { columnId: 'name', direction: 'desc' })
            "
        >
            姓名降冪
        </button>
        <button type="button" @click="api.emit('datasource:reload')">
            重新載入
        </button>
        <button
            v-if="request.loading"
            type="button"
            @click="api.emit('datasource:cancel')"
        >
            取消
        </button>
        <p v-if="request.loading" role="status">載入中…</p>
        <p v-if="request.error" role="alert">
            資料載入失敗，請稍後重試。
            <button type="button" @click="api.emit('datasource:retry')">
                重試
            </button>
        </p>
        <TlTable />
        <p v-if="!request.loading && !request.error && request.filtered === 0">
            查無資料
        </p>
        <p>篩選後 {{ request.filtered }} 筆／全部 {{ request.total }} 筆</p>
        <nav aria-label="資料分頁">
            <button
                type="button"
                :disabled="request.loading || state.pagination.page <= 1"
                @click="api.emit('pagination:prev')"
            >
                上一頁
            </button>
            <span>第 {{ state.pagination.page }}／{{ totalPages }} 頁</span>
            <button
                type="button"
                :disabled="
                    request.loading || state.pagination.page >= totalPages
                "
                @click="api.emit('pagination:next')"
            >
                下一頁
            </button>
        </nav>
    </section>
</template>
