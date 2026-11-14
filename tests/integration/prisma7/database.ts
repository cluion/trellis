import assert from 'node:assert/strict';
import process from 'node:process';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client/client.ts';

function configuration() {
    const provider = process.env.TRELLIS_TEST_PROVIDER;
    assert.ok(provider === 'mysql' || provider === 'postgresql');
    const url = new URL(process.env.TRELLIS_TEST_DATABASE_URL!);
    assert.equal(url.pathname, '/trellis_prisma7_test');

    return { provider, url } as const;
}

const { provider, url } = configuration();
export { provider };

export function createClient() {
    const adapter =
        provider === 'mysql'
            ? new PrismaMariaDb({
                  host: url.hostname,
                  port: Number(url.port || 3306),
                  user: decodeURIComponent(url.username),
                  password: decodeURIComponent(url.password),
                  database: url.pathname.slice(1),
                  connectionLimit: 1,
              })
            : new PrismaPg({ connectionString: url.href, max: 1 });

    return new PrismaClient({ adapter });
}
