import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import process from 'node:process';

const provider = process.env.TRELLIS_TEST_PROVIDER;

if (provider !== 'mysql' && provider !== 'postgresql') {
    throw new Error('TRELLIS_TEST_PROVIDER must be mysql or postgresql.');
}

mkdirSync('reports', { recursive: true });
const result = spawnSync(
    process.execPath,
    [
        '--import',
        'tsx',
        '--test',
        '--test-concurrency=1',
        '--test-reporter=spec',
        '--test-reporter-destination=stdout',
        '--test-reporter=junit',
        `--test-reporter-destination=reports/${provider}.xml`,
        'prisma.integration.ts',
        'sql.integration.ts',
    ],
    { stdio: 'inherit' },
);

if (result.error) {
    throw result.error;
}

process.exit(result.status ?? 1);
