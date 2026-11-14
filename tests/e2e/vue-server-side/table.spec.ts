import process from 'node:process';
import { expect, test as base } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

interface Entry {
    id: number;
    query: {
        page: number;
        pageSize: number;
        sort: { columnId: string; direction: string }[];
        filter?: { global: string };
    };
    scope: string;
    mode: string;
    plan: string;
    aborted: boolean;
    released: boolean;
    result: { total: number; filtered: number; data: { id: number }[] };
}

function backend(request: APIRequestContext) {
    return {
        async control(data: { plan?: string; activeCount?: number }) {
            const response = await request.post('/__test/control', { data });
            expect(response.ok()).toBe(true);
        },
        async entries(): Promise<Entry[]> {
            const response = await request.get('/__test/status');
            expect(response.ok()).toBe(true);

            return response.json();
        },
        async release(id: number) {
            const response = await request.post(`/__test/release/${id}`);
            expect(response.ok()).toBe(true);
        },
    };
}

const test = base.extend<{
    backend: ReturnType<typeof backend>;
    uncaughtErrors: void;
}>({
    backend: async ({ request }, use) => {
        const response = await request.post('/__test/reset');
        expect(response.ok()).toBe(true);
        await use(backend(request));
    },
    uncaughtErrors: [
        async ({ page }, use) => {
            const errors: string[] = [];
            page.on('pageerror', (error) => errors.push(error.message));
            await use();
            expect(errors).toEqual([]);
        },
        { auto: true },
    ],
});

const rows = (page: Page) => page.locator('tbody tr');
const firstName = (page: Page) => rows(page).first().locator('td').nth(1);
const lastName = (page: Page) => rows(page).last().locator('td').nth(1);
const next = (page: Page) => page.getByRole('button', { name: '下一頁' });
const reload = (page: Page) => page.getByRole('button', { name: '重新載入' });
const pageLabel = (page: Page) => page.getByLabel('資料分頁');

test.beforeEach(async ({ page, backend, request }, testInfo) => {
    await backend.entries();
    const health = await (await request.get('/__test/health')).json();
    expect(health.mode).toBe(process.env.TRELLIS_E2E_PACKAGES ?? 'published');
    await testInfo.attach('package-versions', {
        body: JSON.stringify(health, null, 2),
        contentType: 'application/json',
    });
    await page.goto('/');
    await expect(rows(page)).toHaveCount(10);
    await expect(firstName(page)).toHaveText('User 001');
    await expect(page.getByRole('status')).toHaveCount(0);
});

test.afterEach(async ({ backend }, testInfo) => {
    await testInfo.attach('backend-requests', {
        body: JSON.stringify(await backend.entries(), null, 2),
        contentType: 'application/json',
    });
});

test('initial query, cross-page search/sort, page size and authoritative counts', async ({
    page,
    backend,
}) => {
    await expect(pageLabel(page)).toContainText('第 1／7 頁');
    await expect(page.getByText('篩選後 64 筆／全部 64 筆')).toBeVisible();
    await expect(lastName(page)).toHaveText('User 010');
    expect((await backend.entries())[0].query).toEqual({
        page: 1,
        pageSize: 10,
        sort: [{ columnId: 'name', direction: 'asc' }],
    });

    await next(page).click();
    await expect(firstName(page)).toHaveText('User 011');
    await page.getByRole('searchbox').fill('east.test');
    await expect(firstName(page)).toHaveText('User 002');
    await expect(pageLabel(page)).toContainText('第 1／4 頁');
    await expect(page.getByText('篩選後 32 筆／全部 64 筆')).toBeVisible();
    await expect(rows(page)).toHaveCount(10);

    await next(page).click();
    await expect(firstName(page)).toHaveText('User 022');
    await page.getByRole('button', { name: '姓名降冪' }).click();
    await expect(firstName(page)).toHaveText('User 064');
    await expect(lastName(page)).toHaveText('User 046');
    await expect(pageLabel(page)).toContainText('第 1／4 頁');

    await next(page).click();
    await expect(firstName(page)).toHaveText('User 044');
    await page.getByLabel('每頁筆數').selectOption('25');
    await expect(pageLabel(page)).toContainText('第 1／2 頁');
    await expect(rows(page)).toHaveCount(25);
    await expect(firstName(page)).toHaveText('User 064');
    await expect(lastName(page)).toHaveText('User 016');
    await next(page).click();
    await expect(rows(page)).toHaveCount(7);
    await expect(firstName(page)).toHaveText('User 014');
    await expect(lastName(page)).toHaveText('User 002');
    await expect(next(page)).toBeDisabled();
    const entries = await backend.entries();
    expect(entries.map((entry) => entry.query.page)).toEqual([
        1, 2, 1, 2, 1, 2, 1, 2,
    ]);
    expect(entries.every((entry) => entry.scope === 'active')).toBe(true);
    expect(entries.at(-1)?.result).toMatchObject({ total: 64, filtered: 32 });
});

test('new search aborts an unfinished HTTP request and retains the newest rows', async ({
    page,
    backend,
}) => {
    await backend.control({ plan: 'hold' });
    await page.getByRole('searchbox').fill('User 001');
    await expect(page.getByRole('status')).toBeVisible();
    await expect.poll(async () => (await backend.entries()).length).toBe(2);
    await page.getByRole('searchbox').fill('east.test');
    await expect(firstName(page)).toHaveText('User 002');
    await expect(page.getByText('篩選後 32 筆／全部 64 筆')).toBeVisible();
    await expect
        .poll(async () => (await backend.entries())[1].aborted)
        .toBe(true);
    await backend.release(2);
    await reload(page).click();
    await expect.poll(async () => (await backend.entries()).length).toBe(4);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(firstName(page)).toHaveText('User 002');
    await expect(rows(page)).toHaveCount(10);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect((await backend.entries())[1].released).toBe(true);
});

test('explicit cancel aborts HTTP, preserves rows and permits reload', async ({
    page,
    backend,
}) => {
    await backend.control({ plan: 'hold' });
    await reload(page).click();
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.locator('section')).toHaveAttribute('aria-busy', 'true');
    await expect(next(page)).toBeDisabled();
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await expect
        .poll(async () => (await backend.entries())[1]?.aborted)
        .toBe(true);
    await expect(page.locator('section')).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(rows(page)).toHaveCount(10);
    await expect(firstName(page)).toHaveText('User 001');
    await backend.release(2);
    await reload(page).click();
    await expect.poll(async () => (await backend.entries()).length).toBe(3);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByText('篩選後 64 筆／全部 64 筆')).toBeVisible();
});

for (const plan of ['503', 'invalid']) {
    test(`${plan} response displays a friendly error and retry recovers`, async ({
        page,
        backend,
    }) => {
        await next(page).click();
        await expect(firstName(page)).toHaveText('User 011');
        await backend.control({ plan });
        await reload(page).click();
        await expect(page.getByRole('alert')).toContainText('資料載入失敗');
        await expect(page.getByRole('alert')).not.toContainText(
            'internal transport details',
        );
        await expect(rows(page)).toHaveCount(10);
        await expect(firstName(page)).toHaveText('User 011');
        await expect(pageLabel(page)).toContainText('第 2／7 頁');
        await page.getByRole('button', { name: '重試', exact: true }).click();
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(page.getByRole('status')).toHaveCount(0);
        await expect(firstName(page)).toHaveText('User 011');
        const entries = await backend.entries();
        expect(entries.map((entry) => entry.query.page)).toEqual([1, 2, 2, 2]);
        expect(entries.at(-1)?.plan).toBe('success');
    });
}

test('zero matches preserves unfiltered total and disables pagination', async ({
    page,
}) => {
    await next(page).click();
    await expect(firstName(page)).toHaveText('User 011');
    await page.getByRole('searchbox').fill('no matching users');
    await expect(page.getByText('查無資料', { exact: true })).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByText('篩選後 0 筆／全部 64 筆')).toBeVisible();
    await expect(pageLabel(page)).toContainText('第 1／1 頁');
    await expect(next(page)).toBeDisabled();
    await expect(page.getByRole('button', { name: '上一頁' })).toBeDisabled();
});

test('shrinking backend data corrects an out-of-range page and refetches it', async ({
    page,
    backend,
}) => {
    for (let target = 2; target <= 7; target++) {
        await next(page).click();
        await expect(pageLabel(page)).toContainText(`第 ${target}／7 頁`);
        await expect(page.getByRole('status')).toHaveCount(0);
    }

    await expect(rows(page)).toHaveCount(4);
    await backend.control({ activeCount: 12 });
    await reload(page).click();
    await expect(pageLabel(page)).toContainText('第 2／2 頁');
    await expect(rows(page)).toHaveCount(2);
    await expect(firstName(page)).toHaveText('User 011');
    await expect(lastName(page)).toHaveText('User 012');
    await expect(page.getByText('篩選後 12 筆／全部 12 筆')).toBeVisible();
    await expect(next(page)).toBeDisabled();
    const correction = (await backend.entries()).slice(-2);
    expect(correction.map((entry) => entry.query.page)).toEqual([7, 2]);
    expect(correction[0].result.data).toEqual([]);
    expect(correction[0].result.filtered).toBe(12);
});

test('Vue unmount aborts the request and remount starts a fresh table', async ({
    page,
    backend,
}) => {
    await backend.control({ plan: 'hold' });
    await reload(page).click();
    await expect(page.getByRole('status')).toBeVisible();
    await expect.poll(async () => (await backend.entries()).length).toBe(2);
    await page.getByRole('button', { name: '卸載表格' }).click();
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect
        .poll(async () => (await backend.entries())[1].aborted)
        .toBe(true);
    await backend.release(2);
    await page.getByRole('button', { name: '掛載表格' }).click();
    await expect(rows(page)).toHaveCount(10);
    await expect(firstName(page)).toHaveText('User 001');
    await expect(pageLabel(page)).toContainText('第 1／7 頁');
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect((await backend.entries()).map((entry) => entry.query.page)).toEqual([
        1, 1, 1,
    ]);
});
