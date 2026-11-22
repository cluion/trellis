import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { log } from 'node:console';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const registry = 'https://registry.npmjs.org';
const names = ['@trellisjs/server', '@trellisjs/server-prisma'];
const alpha = 'alpha';
const candidate = 'next';

function versionParts(version) {
    const match =
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-alpha\.(0|[1-9]\d*))?$/.exec(
            version,
        );
    assert.ok(
        match &&
            match
                .slice(1)
                .every(
                    (part) =>
                        part === undefined ||
                        Number.isSafeInteger(Number(part)),
                ),
        `Invalid backend version: ${version}.`,
    );
    const [major, minor, patch, pre] = match.slice(1);

    return [
        Number(major),
        Number(minor),
        Number(patch),
        pre === undefined ? Infinity : Number(pre),
    ];
}

function assertNoDowngrade(target, current, tag) {
    if (current === undefined) {
        return;
    }

    const existing = versionParts(current);
    const difference = target.findIndex((part, i) => part !== existing[i]);
    assert.ok(
        difference === -1 || target[difference] > existing[difference],
        `Refusing to move ${tag} backwards.`,
    );
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
    const target = versionParts(manifests[0].version);
    const tag = target[3] === Infinity ? candidate : alpha;

    return manifests.map((pkg, index) => {
        assert.equal(pkg.publishConfig?.tag, tag);
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
        const tags = published['dist-tags'];
        assertNoDowngrade(target, tags[tag], tag);

        if (tag === candidate) {
            assert.ok(
                tags.latest && tags.alpha,
                'Expected existing latest and alpha tags for a backend stable release.',
            );
            assertNoDowngrade(target, tags.latest, 'latest');
        }

        return {
            ...pkg,
            tag,
            directory: path.join(root, 'packages', pkg.name.split('/')[1]),
            exists: Object.hasOwn(published.versions, pkg.version),
            latest: tags.latest,
            alpha: tags.alpha,
        };
    });
}

export function frontendReleaseReady(plan) {
    return plan.every((pkg) => pkg.exists);
}

export function publishFrontend(plan, invoke = run) {
    assert.ok(
        frontendReleaseReady(plan),
        'Publish pending backend versions through their dedicated workflow first.',
    );
    invoke('pnpm', ['changeset', 'publish']);
}

async function request(url) {
    const response = await globalThis.fetch(url, {
        headers: { 'cache-control': 'no-cache' },
        signal: globalThis.AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        const error = new Error(
            `Release metadata request failed: HTTP ${response.status}.`,
        );
        error.status = response.status;

        throw error;
    }

    return response;
}

async function json(url) {
    return (await request(url)).json();
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

export async function waitFor(description, check, sleep = setTimeout) {
    const until = Date.now() + 300000;

    do {
        try {
            const result = await check();

            if (result) {
                return result;
            }
        } catch (error) {
            if (
                ![404, 429, 500, 502, 503, 504].includes(error.status) &&
                error.name !== 'TimeoutError'
            ) {
                throw error;
            }
        }

        if (Date.now() < until) {
            await sleep(5000);
        }
    } while (Date.now() < until);

    throw new Error(
        `Unable to confirm ${description}. Check npm before rerunning this workflow.`,
    );
}

function checkTags(pkg, tags, promotion = false) {
    if (pkg.tag === candidate) {
        assert.equal(
            tags.alpha,
            pkg.alpha,
            'The alpha tag changed during a stable release.',
        );
    }

    assert.ok(
        tags.latest === pkg.latest ||
            (promotion && tags.latest === pkg.version),
        'Unexpected change to the latest tag.',
    );
}

function confirmPublished(pkg, tag = pkg.tag) {
    return waitFor(`${pkg.name}@${pkg.version} on ${tag}`, async () => {
        const published = await metadata(pkg.name);
        const tags = published['dist-tags'];
        checkTags(pkg, tags, tag === 'latest');

        if (tags[tag] === pkg.version) {
            return published.versions[pkg.version];
        }
    });
}

export function verifyProvenance(pkg, published, attestations, expectedCommit) {
    const provenance = attestations.attestations?.find(
        (item) => item.predicateType === 'https://slsa.dev/provenance/v1',
    );
    assert.ok(provenance, 'Missing npm provenance statement.');
    const statement = JSON.parse(
        Buffer.from(provenance.bundle.dsseEnvelope.payload, 'base64'),
    );
    const build = statement.predicate.buildDefinition;
    const workflow = build.externalParameters.workflow;
    assert.equal(workflow.repository, 'https://github.com/cluion/trellis');
    assert.equal(workflow.path, '.github/workflows/release.yml');
    assert.equal(workflow.ref, 'refs/heads/main');
    const commit = build.resolvedDependencies[0].digest.gitCommit;
    assert.match(commit, /^[a-f0-9]{40}$/);

    if (expectedCommit !== undefined) {
        assert.equal(
            commit,
            expectedCommit,
            'An existing npm artifact belongs to another source commit.',
        );
    }

    const integrity = published.dist.integrity;
    assert.match(integrity, /^sha512-[a-zA-Z0-9+/]{86}==$/);
    const subject = `pkg:npm/${pkg.name.replace('@', '%40')}@${pkg.version}`;
    const digest = Buffer.from(integrity.slice(7), 'base64').toString('hex');
    assert.ok(
        statement.subject.some(
            (item) => item.name === subject && item.digest.sha512 === digest,
        ),
        'npm provenance does not match the published tarball.',
    );

    return commit;
}

async function verifyPublished(pkg, expectedCommit) {
    const published = await confirmPublished(pkg);
    const { version, attestations } = await waitFor(
        `npm provenance for ${pkg.name}@${pkg.version}`,
        async () => {
            const version = (await metadata(pkg.name)).versions[pkg.version];
            const url = version?.dist?.attestations?.url;

            if (!url) {
                return;
            }

            assert.ok(
                url.startsWith(`${registry}/-/npm/v1/attestations/`),
                'Invalid npm provenance URL.',
            );
            const attestations = await json(url);

            if (attestations.attestations?.length) {
                return { version, attestations };
            }
        },
    );
    assert.equal(version.dist.integrity, published.dist.integrity);
    const commit = verifyProvenance(pkg, version, attestations, expectedCommit);

    if (pkg.tag === candidate) {
        const tarball = version.dist.tarball;
        assert.ok(
            tarball?.startsWith(`${registry}/${pkg.name}/-/`),
            'Invalid npm tarball URL.',
        );
        await waitFor(
            `public tarball for ${pkg.name}@${pkg.version}`,
            async () => {
                const bytes = await (await request(tarball)).arrayBuffer();
                assert.equal(
                    `sha512-${createHash('sha512').update(Buffer.from(bytes)).digest('base64')}`,
                    version.dist.integrity,
                );

                return true;
            },
        );
    }

    return commit;
}

function trackRelease(pkg, commit) {
    const prerelease = pkg.tag === alpha;
    const tag = `${pkg.name}@${pkg.version}`;

    if (!output('git', ['tag', '--list', tag])) {
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
        assert.equal(release.isPrerelease, prerelease);
    } else {
        run('gh', [
            'release',
            'create',
            tag,
            '--title',
            tag,
            ...(prerelease ? ['--prerelease'] : ['--latest=false']),
            '--verify-tag',
            '--notes',
            output('git', [
                'show',
                `${commit}:packages/${pkg.name.split('/')[1]}/CHANGELOG.md`,
            ]),
        ]);
    }
}

function pack(pkg, staging) {
    run('pnpm', [
        '--dir',
        pkg.directory,
        'pack',
        '--pack-destination',
        staging,
    ]);
    const file = path.join(
        staging,
        `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`,
    );
    const manifest = JSON.parse(
        output('tar', ['-xOf', file, 'package/package.json']),
    );
    assert.equal(manifest.name, pkg.name);
    assert.equal(manifest.version, pkg.version);
    assert.equal(manifest.publishConfig.tag, pkg.tag);
    assert.equal(manifest.publishConfig.access, 'public');
    assert.ok(!manifest.private, 'Cannot publish a private backend package.');

    if (pkg.name === names[1]) {
        assert.equal(manifest.peerDependencies[names[0]], `^${pkg.version}`);
    }

    return file;
}

function publish(pkg, tarball) {
    run('npm', [
        'publish',
        tarball,
        '--tag',
        pkg.tag,
        '--access',
        'public',
        '--registry',
        registry,
        '--provenance',
    ]);
}

async function promote(pkg) {
    const current = await metadata(pkg.name);
    checkTags(pkg, current['dist-tags'], true);
    assert.equal(
        current['dist-tags'].next,
        pkg.version,
        'The candidate tag changed before promotion.',
    );

    if (current['dist-tags'].latest !== pkg.version) {
        run('npm', [
            'dist-tag',
            'add',
            `${pkg.name}@${pkg.version}`,
            'latest',
            '--registry',
            registry,
        ]);
    }

    await confirmPublished(pkg, 'latest');
}

export async function executeBackendRelease(plan, mode, commit, io) {
    assert.ok(
        ['publish', 'stage-stable', 'promote-stable'].includes(mode),
        'Unknown backend release mode.',
    );
    assert.ok(
        plan.every(
            (pkg) => pkg.tag === (mode === 'publish' ? alpha : candidate),
        ),
        'Manifests do not match the requested backend release channel.',
    );
    assert.match(
        commit ?? '',
        /^[a-f0-9]{40}$/,
        'Expected a full release commit SHA.',
    );

    if (mode === 'promote-stable') {
        assert.ok(
            frontendReleaseReady(plan),
            'Stage both stable packages before promotion.',
        );
    }

    const sources = new Map();

    for (const pkg of plan.filter((item) => item.exists)) {
        sources.set(pkg.name, await io.verify(pkg, commit));
    }

    if (mode === 'promote-stable') {
        for (const pkg of plan.filter((item) => item.latest !== item.version)) {
            await io.promote(pkg);
        }

        await Promise.all(plan.map((pkg) => io.confirmLatest(pkg)));
    } else {
        const tarballs = new Map();

        for (const pkg of plan.filter((item) => !item.exists)) {
            tarballs.set(pkg.name, io.pack(pkg));
        }

        for (const pkg of plan.filter((item) => !item.exists)) {
            io.publish(pkg, tarballs.get(pkg.name));
            sources.set(pkg.name, await io.verify(pkg, commit));
        }
    }

    if (mode !== 'stage-stable') {
        for (const pkg of plan) {
            io.track(pkg, sources.get(pkg.name));
        }
    }
}

async function main(mode) {
    assert.ok(
        [
            'check',
            'stable',
            'publish',
            'stage-stable',
            'promote-stable',
        ].includes(mode),
        'Unknown release mode.',
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

    if (mode === 'check') {
        const pending = !frontendReleaseReady(plan);

        if (process.env.GITHUB_OUTPUT) {
            appendFileSync(
                process.env.GITHUB_OUTPUT,
                `backend_pending=${pending}\n`,
            );
        }

        log(
            pending
                ? 'Backend versions are pending. Use the dedicated backend workflow; the shared stable publisher is skipped.'
                : 'Backend versions are already published; the shared stable publisher may proceed.',
        );

        return;
    }

    if (mode === 'stable') {
        publishFrontend(plan);

        return;
    }

    assert.equal(
        process.env.GITHUB_ACTIONS,
        'true',
        'Publish through GitHub Actions.',
    );
    assert.equal(process.env.GITHUB_REPOSITORY, 'cluion/trellis');
    assert.equal(process.env.GITHUB_REF, 'refs/heads/main');
    assert.equal(process.env.GITHUB_EVENT_NAME, 'workflow_dispatch');
    const commit =
        mode === 'promote-stable'
            ? process.env.TRELLIS_RELEASE_SHA
            : process.env.GITHUB_SHA;

    if (mode === 'promote-stable') {
        assert.match(
            commit ?? '',
            /^[a-f0-9]{40}$/,
            'Pass the staged commit as release_sha.',
        );
        run('git', ['merge-base', '--is-ancestor', commit, 'HEAD']);

        for (const pkg of plan) {
            const prior = JSON.parse(
                output('git', [
                    'show',
                    `${commit}:packages/${pkg.name.split('/')[1]}/package.json`,
                ]),
            );
            assert.equal(
                prior.version,
                pkg.version,
                'The release commit does not match the backend versions on main.',
            );
        }
    }

    const staging = mkdtempSync(path.join(tmpdir(), 'trellis-backend-'));

    try {
        await executeBackendRelease(plan, mode, commit, {
            pack: (pkg) => pack(pkg, staging),
            publish,
            verify: verifyPublished,
            promote,
            confirmLatest: (pkg) => confirmPublished(pkg, 'latest'),
            track: trackRelease,
        });
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
