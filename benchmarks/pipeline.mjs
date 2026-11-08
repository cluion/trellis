import assert from 'node:assert/strict';
import { log } from 'node:console';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { Trellis } from '../packages/core/dist/index.mjs';
import { createFilterPlugin } from '../packages/plugin-filter/dist/index.mjs';
import { createPaginationPlugin } from '../packages/plugin-pagination/dist/index.mjs';
import { createSortPlugin } from '../packages/plugin-sort/dist/index.mjs';
import { createVirtualScrollPlugin } from '../packages/plugin-virtual-scroll/dist/index.mjs';

const require = createRequire(import.meta.url);
const samples = 9;
const scrolls = 20;
globalThis.requestAnimationFrame = (callback) => {
    callback(0);

    return 0;
};
globalThis.cancelAnimationFrame = () => {};

function measure(fn) {
    const times = [];

    for (let i = 0; i < samples + 2; i++) {
        const start = performance.now();
        fn(i);

        if (i >= 2) {
            times.push(performance.now() - start);
        }
    }

    times.sort((a, b) => a - b);

    return {
        medianMs: +times[Math.floor(times.length / 2)].toFixed(3),
        p95Ms: +times[Math.ceil(times.length * 0.95) - 1].toFixed(3),
    };
}

function run(count) {
    const data = Array.from({ length: count }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        group: `Group ${i % 10}`,
        score: (i * 7919) % count,
    }));
    const calls = { filter: 0, sort: 0 };
    const track = (plugin, name) => ({
        ...plugin,
        install(api) {
            plugin.install({
                ...api,
                registerTransform(key, priority, fn, options) {
                    api.registerTransform(
                        key,
                        priority,
                        (rows, state) => {
                            calls[name]++;

                            return fn(rows, state);
                        },
                        options,
                    );
                },
            });
        },
    });
    const vs = createVirtualScrollPlugin({ rowHeight: 40, overscan: 5 });
    const table = new Trellis({
        data,
        columns: [
            { id: 'name', accessor: 'name', header: 'Name' },
            { id: 'group', accessor: 'group', header: 'Group' },
            { id: 'score', accessor: 'score', header: 'Score' },
        ],
        rowId: 'id',
        pageSize: 1000,
        plugins: [
            track(createFilterPlugin(), 'filter'),
            track(createSortPlugin(), 'sort'),
            createPaginationPlugin(),
            vs,
        ],
    });
    let listener;
    const viewport = {
        scrollTop: 0,
        clientHeight: 400,
        addEventListener(_name, fn) {
            listener = fn;
        },
        removeEventListener() {
            listener = undefined;
        },
    };
    vs.attachScrollContainer(viewport);
    const filtering = measure((i) =>
        table.api.emit('filter:change', {
            query: i % 2 ? 'group 1' : 'group 2',
        }),
    );
    table.api.emit('filter:change', { query: '' });
    const sorting = measure((i) =>
        table.api.emit('sort:change', {
            columnId: 'score',
            direction: i % 2 ? 'asc' : 'desc',
        }),
    );
    table.api.emit('filter:change', { query: 'group 1' });
    const combinedRecompute = measure(() => table.api.recompute());
    calls.filter = 0;
    calls.sort = 0;
    const scrolling = measure((i) => {
        for (let j = 0; j < scrolls; j++) {
            viewport.scrollTop = ((i + j) % 20) * 40;
            listener();
        }
    });
    const filtered = table.api.getFilteredData();
    assert.equal(filtered.length, count / 10);
    assert.ok(filtered.every((row) => row.original.group === 'Group 1'));
    assert.ok(
        filtered.every(
            (row, index) =>
                index === 0 ||
                filtered[index - 1].original.score >= row.original.score,
        ),
    );
    assert.equal(table.api.getState().pagination.totalItems, count / 10);
    const result = {
        rows: count,
        filtering,
        sorting,
        combinedRecompute,
        scrollBatch: { events: scrolls, ...scrolling },
        scrollTransformCalls: { ...calls },
        measuredAndWarmupScrollEvents: (samples + 2) * scrolls,
        visibleRows: table.api.getState().data.length,
    };
    table.destroy();

    return result;
}

log(
    JSON.stringify(
        {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            vitest: require('../node_modules/vitest/package.json').version,
            samples,
            description:
                'Core CPU benchmark with a mock scroll container; excludes browser rendering and HTTP. Nine measured samples after two warmups; p95 uses the largest sample.',
            results: [10000, 50000].map(run),
        },
        null,
        2,
    ),
);
