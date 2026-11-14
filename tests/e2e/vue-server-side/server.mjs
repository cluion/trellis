import assert from 'node:assert/strict';
import { log } from 'node:console';
import { copyFile, mkdir, readFile, realpath, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { createServer as createViteServer } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const repository = path.resolve(root, '../../..');
const mode = process.env.TRELLIS_E2E_PACKAGES ?? 'published';
assert.ok(['checkout', 'published'].includes(mode), 'Invalid package mode.');
const names = [
    'core',
    'plugin-datasource',
    'plugin-filter',
    'plugin-pagination',
    'plugin-sort',
    'server',
    'vue',
];
const aliases = {};
const versions = {};
const fixtureManifest = JSON.parse(
    await readFile(new URL('./package.json', import.meta.url), 'utf8'),
);

for (const name of names) {
    const packageRoot =
        mode === 'checkout'
            ? path.join(repository, 'packages', name)
            : path.join(root, 'node_modules', '@trellisjs', name);
    const manifest = JSON.parse(
        await readFile(path.join(packageRoot, 'package.json'), 'utf8'),
    );

    if (mode === 'published') {
        assert.equal(
            manifest.version,
            fixtureManifest.dependencies[manifest.name],
        );
        assert.ok(
            (await realpath(packageRoot)).startsWith(
                path.join(root, 'node_modules') + path.sep,
            ),
            'Published mode must not resolve workspace symlinks.',
        );
    }

    versions[manifest.name] = manifest.version;
    aliases[manifest.name] =
        mode === 'checkout'
            ? path.join(packageRoot, 'dist', 'index.mjs')
            : fileURLToPath(import.meta.resolve(manifest.name));
}

const {
    parseTrellisQuery,
    buildWhereClause,
    buildOrderByClause,
    buildResponse,
} = await import(pathToFileURL(aliases['@trellisjs/server']).href);
const generated = path.join(root, '.generated');
await mkdir(generated, { recursive: true });
await copyFile(
    path.join(repository, 'examples/vue-server-side/UserTable.vue'),
    path.join(generated, 'UserTable.vue'),
);
const vite = await createViteServer({
    configFile: false,
    root,
    plugins: [vue()],
    resolve: { alias: aliases, dedupe: ['vue'] },
    server: { middlewareMode: true, fs: { allow: [repository] } },
});
const db = new DatabaseSync(':memory:');
db.exec(
    'CREATE TABLE users (id INTEGER, name TEXT, email TEXT, active INTEGER)',
);
let requests = [];
let plans = [];
const held = new Map();

function reset() {
    for (const { response } of held.values()) {
        response.destroy();
    }

    held.clear();
    requests = [];
    plans = [];
    db.exec('DELETE FROM users');
    const insert = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?)');

    for (let id = 1; id <= 70; id++) {
        const number = String(id).padStart(3, '0');
        insert.run(
            id,
            `User ${number}`,
            `user${number}@${id % 2 ? 'west' : 'east'}.test`,
            id <= 64 ? 1 : 0,
        );
    }
}

function json(response, body, status = 200) {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
}

reset();
const server = createServer((request, response) => {
    void handle(request, response).catch((error) => {
        log(error);
        json(response, { error: 'Test backend request failed.' }, 500);
    });
});

async function handle(request, response) {
    const url = new URL(request.url, 'http://127.0.0.1:4176');

    if (url.pathname.startsWith('/__test/')) {
        if (url.pathname === '/__test/health') {
            json(response, { mode, versions, node: process.version });

            return;
        }

        if (url.pathname === '/__test/status') {
            json(response, requests);

            return;
        }

        if (request.method !== 'POST') {
            json(response, { error: 'POST required.' }, 405);

            return;
        }

        if (url.pathname === '/__test/reset') {
            reset();
        } else if (url.pathname === '/__test/control') {
            let text = '';

            for await (const chunk of request) {
                text += chunk;
            }

            const control = JSON.parse(text);

            if (control.plan) {
                assert.ok(['hold', '503', 'invalid'].includes(control.plan));
                plans.push(control.plan);
            }

            if (control.activeCount !== undefined) {
                assert.ok(Number.isInteger(control.activeCount));
                db.prepare('DELETE FROM users WHERE active = 1 AND id > ?').run(
                    control.activeCount,
                );
            }
        } else if (url.pathname.startsWith('/__test/release/')) {
            const id = Number(url.pathname.split('/').at(-1));
            const pending = held.get(id);
            assert.ok(pending, 'Expected a held request.');
            pending.entry.released = true;

            if (!pending.response.destroyed) {
                json(pending.response, pending.result);
            }

            held.delete(id);
        } else {
            json(response, { error: 'Unknown test control.' }, 404);

            return;
        }

        json(response, { ok: true });

        return;
    }

    if (url.pathname !== '/api/users') {
        vite.middlewares(request, response);

        return;
    }

    assert.equal(request.method, 'GET');
    assert.equal(url.searchParams.get('scope'), 'active');
    const query = parseTrellisQuery(Object.fromEntries(url.searchParams));
    const where = buildWhereClause(['name', 'email'], query.filter);
    const order = buildOrderByClause(query.sort, ['id', 'name', 'email']);
    const scope = 'WHERE active = 1';
    const condition = `${scope}${where.sql ? ` AND (${where.sql.slice(6)})` : ''}`;
    const total = db
        .prepare(`SELECT COUNT(*) AS count FROM users ${scope}`)
        .get().count;
    const filtered = db
        .prepare(`SELECT COUNT(*) AS count FROM users ${condition}`)
        .get(...where.params).count;
    const data = db
        .prepare(
            `SELECT id, name, email FROM users ${condition} ${order} LIMIT ? OFFSET ?`,
        )
        .all(
            ...where.params,
            query.pageSize,
            (query.page - 1) * query.pageSize,
        );
    const result = buildResponse(data, { total, filtered, query });
    const plan = plans.shift();
    const entry = {
        id: requests.length + 1,
        query,
        scope: url.searchParams.get('scope'),
        mode,
        plan: plan ?? 'success',
        aborted: false,
        released: false,
        result,
    };
    requests.push(entry);
    response.on('close', () => {
        entry.aborted = !response.writableEnded;
    });

    if (plan === 'hold') {
        held.set(entry.id, { response, result, entry });

        return;
    }

    if (plan === '503') {
        json(response, { error: 'internal transport details' }, 503);
    } else if (plan === 'invalid') {
        json(response, { data: [], total: -1, filtered: 0 });
    } else {
        json(response, result);
    }
}

server.listen(4176, '127.0.0.1', () => {
    log(JSON.stringify({ url: 'http://127.0.0.1:4176', mode, versions }));
});

process.once('SIGTERM', async () => {
    server.closeAllConnections();
    server.close();
    await vite.close();
    db.close();
    await rm(generated, { recursive: true, force: true });
});
