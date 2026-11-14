import assert from 'node:assert/strict';
import process from 'node:process';
import { defineConfig, env } from 'prisma/config';

const provider = process.env.TRELLIS_TEST_PROVIDER;
assert.ok(provider === 'mysql' || provider === 'postgresql');
const url = env('TRELLIS_TEST_DATABASE_URL');
assert.equal(new URL(url).pathname, '/trellis_prisma7_test');

export default defineConfig({
    schema: `schemas/${provider}.prisma`,
    datasource: { url },
});
