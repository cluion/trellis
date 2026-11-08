import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { log } from 'node:console';
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const registry = 'https://registry.npmjs.org';
const names = ['@trellisjs/server', '@trellisjs/server-prisma'];

function alphaParts(version) {
    const match =
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-alpha\.(0|[1-9]\d*)$/.exec(
            version,
        );

    if (
        !match ||
        match.slice(1).some((part) => !Number.isSafeInteger(Number(part)))
    ) {
        throw new Error(`Expected an alpha version, received ${version}.`);
    }

    return match.slice(1).map(Number);
}

export function planBackendRelease(manifests, metadata) {
    assert.deepEqual(
        manifests.map((pkg) => pkg.name),
        names,
    );
    assert.equal(
        manifests[0].version,
        manifests[1].version,
        'Release backend packages together.',
    );
    const target = alphaParts(manifests[0].version);

    return manifests.map((pkg, index) => {
        assert.equal(pkg.publishConfig?.tag, 'alpha');
        assert.equal(pkg.publishConfig?.access, 'public');
        const published = metadata[index];
        assert.equal(published.name, pkg.name);
        assert.ok(
            published.versions &&
                typeof published.versions === 'object' &&
                !Array.isArray(published.versions) &&
                published['dist-tags'] &&
                typeof published['dist-tags'] === 'object' &&
                !Array.isArray(published['dist-tags']),
            'Invalid npm metadata.',
        );
        const current = published['dist-tags'].alpha;

        if (current) {
            const existing = alphaParts(current);
            const difference = target.findIndex(
                (part, i) => part !== existing[i],
            );
            assert.ok(
                difference === -1 || target[difference] > existing[difference],
                'Refusing to move alpha backwards.',
            );
        }

        return {
            ...pkg,
            directory: path.join(root, 'packages', pkg.name.split('/')[1]),
            exists: Object.hasOwn(published.versions, pkg.version),
            latest: published['dist-tags'].latest,
        };
    });
}

async function json(url) {
    const response = await globalThis.fetch(url, {
        headers: { 'cache-control': 'no-cache' },
    });

    if (!response.ok) {
        throw new Error(
            `Release metadata request failed: HTTP ${response.status}.`,
        );
    }

    return response.json();
}

function metadata(name) {
    return json(
        `${registry}/${name.replace('/', '%2f')}?release-check=${Date.now()}`,
    );
}

function output(command, args) {
    return execFileSync(command, args, { cwd: root, encoding: 'utf8' }).trim();
}

function run(command, args) {
    execFileSync(command, args, { cwd: root, stdio: 'inherit' });
}

async function confirmPublished(pkg) {
    for (let attempt = 0; attempt < 18; attempt++) {
        const published = await metadata(pkg.name);
        assert.equal(
            published['dist-tags'].latest,
            pkg.latest,
            'The latest tag changed during the alpha release.',
        );

        if (
            published.versions[pkg.version] &&
            published['dist-tags'].alpha === pkg.version
        ) {
            return published.versions[pkg.version];
        }

        await setTimeout(5000);
    }

    throw new Error(
        `Unable to confirm ${pkg.name}@${pkg.version} on the alpha tag.`,
    );
}

async function trackRelease(pkg, published) {
    const url = published.dist?.attestations?.url;
    assert.ok(
        url?.startsWith(`${registry}/-/npm/v1/attestations/`),
        'Missing npm provenance.',
    );
    const attestations = await json(url);
    const provenance = attestations.attestations.find(
        (item) => item.predicateType === 'https://slsa.dev/provenance/v1',
    );
    assert.ok(provenance, 'Missing provenance statement.');
    const statement = JSON.parse(
        Buffer.from(
            provenance.bundle.dsseEnvelope.payload,
            'base64',
        ).toString(),
    );
    const workflow =
        statement.predicate.buildDefinition.externalParameters.workflow;
    assert.equal(workflow.repository, 'https://github.com/cluion/trellis');
    assert.equal(workflow.path, '.github/workflows/release.yml');
    const commit =
        statement.predicate.buildDefinition.resolvedDependencies[0].digest
            .gitCommit;
    assert.match(commit, /^[a-f0-9]{40}$/);
    const tag = `${pkg.name}@${pkg.version}`;

    if (!output('git', ['tag', '--list', tag])) {
        assert.equal(
            commit,
            process.env.GITHUB_SHA,
            'An existing npm artifact belongs to another source commit.',
        );
        run('git', ['tag', tag, commit]);
    }

    assert.equal(output('git', ['rev-parse', `${tag}^{commit}`]), commit);
    run('git', ['push', 'origin', `refs/tags/${tag}`]);
    let release;

    try {
        release = JSON.parse(
            output('gh', ['release', 'view', tag, '--json', 'isPrerelease']),
        );
    } catch (error) {
        if (!error.stderr?.toString().includes('release not found')) {
            throw error;
        }
    }

    if (release) {
        assert.equal(release.isPrerelease, true);
    } else {
        run('gh', [
            'release',
            'create',
            tag,
            '--title',
            tag,
            '--prerelease',
            '--verify-tag',
            '--notes-file',
            path.join(pkg.directory, 'CHANGELOG.md'),
        ]);
    }
}

async function main(mode) {
    assert.ok(
        ['check', 'stable', 'publish'].includes(mode),
        'Use check, stable or publish.',
    );
    const manifests = names.map((name) =>
        JSON.parse(
            readFileSync(
                path.join(root, 'packages', name.split('/')[1], 'package.json'),
                'utf8',
            ),
        ),
    );
    const plan = planBackendRelease(
        manifests,
        await Promise.all(names.map(metadata)),
    );
    const pending = plan.some((pkg) => !pkg.exists);

    if (mode === 'check') {
        if (process.env.GITHUB_OUTPUT) {
            appendFileSync(
                process.env.GITHUB_OUTPUT,
                `backend_pending=${pending}\n`,
            );
        }

        log(
            pending
                ? 'Backend alpha versions are pending. Dispatch Release with channel=backend-alpha; the shared stable publisher is skipped.'
                : 'Backend versions are already published; the shared stable publisher may proceed.',
        );

        return;
    }

    if (mode === 'stable') {
        assert.equal(
            pending,
            false,
            'Publish pending backend versions through backend-alpha first.',
        );
        run('pnpm', ['changeset', 'publish']);

        return;
    }

    assert.equal(
        process.env.GITHUB_ACTIONS,
        'true',
        'Publish through GitHub Actions.',
    );
    assert.equal(process.env.GITHUB_REPOSITORY, 'cluion/trellis');
    assert.equal(process.env.GITHUB_REF, 'refs/heads/main');
    const staging = mkdtempSync(path.join(tmpdir(), 'trellis-alpha-'));

    try {
        const tarballs = new Map();

        for (const pkg of plan.filter((item) => !item.exists)) {
            run('pnpm', [
                '--dir',
                pkg.directory,
                'pack',
                '--pack-destination',
                staging,
            ]);
            const tarball = path.join(
                staging,
                `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`,
            );
            const packed = JSON.parse(
                output('tar', ['-xOf', tarball, 'package/package.json']),
            );
            assert.equal(packed.name, pkg.name);
            assert.equal(packed.version, pkg.version);
            assert.equal(packed.publishConfig.tag, 'alpha');

            if (pkg.name === '@trellisjs/server-prisma') {
                assert.equal(
                    packed.peerDependencies['@trellisjs/server'],
                    `^${plan[0].version}`,
                );
            }

            tarballs.set(pkg.name, tarball);
        }

        for (const pkg of plan) {
            if (!pkg.exists) {
                run('npm', [
                    'publish',
                    tarballs.get(pkg.name),
                    '--tag',
                    'alpha',
                    '--access',
                    'public',
                    '--registry',
                    registry,
                    '--provenance',
                ]);
            }

            const published = await confirmPublished(pkg);
            await trackRelease(pkg, published);
        }
    } finally {
        rmSync(staging, { recursive: true, force: true });
    }
}

if (
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    await main(process.argv[2]);
}
