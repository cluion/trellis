import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { describe, expect, it, vi } from 'vitest';
import {
    executeBackendRelease,
    frontendReleaseReady,
    planBackendRelease,
    publishFrontend,
    verifyProvenance,
    waitFor,
} from '../scripts/backend-release.mjs';

const names = ['@trellisjs/server', '@trellisjs/server-prisma'];
const commit = 'a'.repeat(40);
const manifests = (version = '0.1.0-alpha.3', tag = 'alpha') =>
    names.map((name) => ({
        name,
        version,
        publishConfig: { tag, access: 'public' },
    }));
const metadata = () =>
    names.map((name) => ({
        name,
        versions: { '0.1.0-alpha.2': {} } as Record<string, object>,
        'dist-tags': {
            alpha: '0.1.0-alpha.2',
            latest: '0.1.0-alpha.1',
            next: undefined as string | undefined,
        },
    }));
const stableManifests = () => manifests('0.1.0', 'next');

describe('backend release planning', () => {
    it('refuses a partial pair, unsupported prereleases or an implicit latest publication', () => {
        const mixed = stableManifests();
        mixed[1].version = '0.1.0-alpha.3';
        expect(() => planBackendRelease(mixed, metadata())).toThrow(/together/);
        expect(() =>
            planBackendRelease(manifests('0.1.0-rc.1', 'next'), metadata()),
        ).toThrow(/Invalid backend version/);
        expect(() =>
            planBackendRelease(manifests('0.1.0', 'latest'), metadata()),
        ).toThrow();
        expect(() =>
            planBackendRelease(manifests('0.1.0-alpha.3', 'next'), metadata()),
        ).toThrow();
    });

    it('refuses to downgrade alpha, next or latest', () => {
        const published = metadata();
        published[0]['dist-tags'].alpha = '0.1.0-alpha.4';
        expect(() => planBackendRelease(manifests(), published)).toThrow(
            /alpha backwards/,
        );
        published[0]['dist-tags'].next = '0.2.0';
        expect(() => planBackendRelease(stableManifests(), published)).toThrow(
            /next backwards/,
        );
        published[0]['dist-tags'].next = '0.1.0';
        published[0]['dist-tags'].latest = '0.2.0';
        expect(() => planBackendRelease(stableManifests(), published)).toThrow(
            /latest backwards/,
        );
    });

    it('fails closed for the wrong package, private access or malformed registry metadata', () => {
        const published = metadata();
        const packages = manifests();
        packages[0].name = '@trellisjs/core';
        expect(() => planBackendRelease(packages, published)).toThrow();
        packages[0].name = names[0];
        packages[0].publishConfig.access = 'restricted';
        expect(() => planBackendRelease(packages, published)).toThrow();
        published[0].name = 'other-package';
        expect(() => planBackendRelease(manifests(), published)).toThrow();
        published[0].name = names[0];
        expect(() =>
            planBackendRelease(manifests(), [
                { ...published[0], versions: [] },
                published[1],
            ]),
        ).toThrow(/Invalid npm metadata/);
    });
});

describe('frontend Changesets isolation', () => {
    for (const desired of [manifests(), stableManifests()]) {
        it(`runs unchanged Changesets publish only after both ${desired[0].version} versions are visible`, () => {
            const published = metadata();
            const invoke = vi.fn();
            const plan = () => planBackendRelease(desired, published);

            expect(frontendReleaseReady(plan())).toBe(false);
            expect(() => publishFrontend(plan(), invoke)).toThrow(
                /pending backend/,
            );
            published[0].versions[desired[0].version] = {};
            expect(() => publishFrontend(plan(), invoke)).toThrow(
                /pending backend/,
            );
            expect(invoke).not.toHaveBeenCalled();
            published[1].versions[desired[1].version] = {};
            expect(frontendReleaseReady(plan())).toBe(true);
            publishFrontend(plan(), invoke);
            expect(invoke.mock.calls).toEqual([
                ['pnpm', ['changeset', 'publish']],
            ]);
        });
    }

    it('versions a frontend changeset without touching backend versions', () => {
        const fixture = mkdtempSync(path.join(tmpdir(), 'trellis-changesets-'));
        const json = (file: string, value: object) =>
            writeFileSync(path.join(fixture, file), JSON.stringify(value));
        const require = createRequire(import.meta.url);
        const cli = require.resolve('@changesets/cli/package.json');

        try {
            mkdirSync(path.join(fixture, '.changeset'));
            json('package.json', {
                name: 'fixture',
                private: true,
                workspaces: ['packages/*'],
            });
            const config = JSON.parse(
                readFileSync(
                    new URL('../.changeset/config.json', import.meta.url),
                    'utf8',
                ),
            );
            json('.changeset/config.json', { ...config, changelog: false });
            writeFileSync(
                path.join(fixture, '.changeset/ui-patch.md'),
                '---\n"@trellisjs/vue": patch\n---\n\nFix a UI bug.\n',
            );

            for (const [directory, packageJson] of [
                ['server', stableManifests()[0]],
                [
                    'server-prisma',
                    {
                        ...stableManifests()[1],
                        peerDependencies: { [names[0]]: '^0.1.0' },
                    },
                ],
                ['vue', { name: '@trellisjs/vue', version: '1.1.0' }],
            ] as const) {
                mkdirSync(path.join(fixture, 'packages', directory), {
                    recursive: true,
                });
                json(`packages/${directory}/package.json`, packageJson);
            }

            execFileSync(
                process.execPath,
                [path.join(path.dirname(cli), 'bin.js'), 'version'],
                { cwd: fixture },
            );
            const version = (directory: string) =>
                JSON.parse(
                    readFileSync(
                        path.join(
                            fixture,
                            'packages',
                            directory,
                            'package.json',
                        ),
                        'utf8',
                    ),
                ).version;
            expect(version('vue')).toBe('1.1.1');
            expect(version('server')).toBe('0.1.0');
            expect(version('server-prisma')).toBe('0.1.0');
        } finally {
            rmSync(fixture, { force: true, recursive: true });
        }
    });
});

function releaseIO() {
    return {
        pack: vi.fn(({ name }) => `${name}.tgz`),
        publish: vi.fn(),
        verify: vi.fn(async () => commit),
        promote: vi.fn(async () => {}),
        confirmLatest: vi.fn(async () => {}),
        track: vi.fn(),
    };
}

describe('paired backend release execution', () => {
    it('does not publish anything if either tarball fails validation', async () => {
        const io = releaseIO();
        io.pack
            .mockImplementationOnce(() => 'server.tgz')
            .mockImplementationOnce(() => {
                throw new Error('wrong packed peer');
            });
        await expect(
            executeBackendRelease(
                planBackendRelease(stableManifests(), metadata()),
                'stage-stable',
                commit,
                io,
            ),
        ).rejects.toThrow('wrong packed peer');
        expect(io.publish).not.toHaveBeenCalled();
    });

    it('resumes only the missing version after server is published and the adapter fails', async () => {
        const registry = metadata();
        const io = releaseIO();
        io.publish.mockImplementation(({ name, version }, _tarball) => {
            if (name === names[1]) {
                throw new Error('registry rejected adapter');
            }

            registry[0].versions[version] = {};
        });
        const plan = () => planBackendRelease(stableManifests(), registry);

        await expect(
            executeBackendRelease(plan(), 'stage-stable', commit, io),
        ).rejects.toThrow('registry rejected adapter');
        expect(io.promote).not.toHaveBeenCalled();
        expect(io.track).not.toHaveBeenCalled();

        const resume = releaseIO();
        await executeBackendRelease(plan(), 'stage-stable', commit, resume);
        expect(resume.pack.mock.calls.map(([pkg]) => pkg.name)).toEqual([
            names[1],
        ]);
        expect(
            resume.publish.mock.calls.map(([pkg]) => [pkg.name, pkg.tag]),
        ).toEqual([[names[1], 'next']]);
        expect(
            resume.verify.mock.calls.map(([pkg, sha]) => [pkg.name, sha]),
        ).toEqual(names.map((name) => [name, commit]));
        expect(resume.promote).not.toHaveBeenCalled();
    });

    it('stops before publishing the missing half if the occupied version is from another source', async () => {
        const registry = metadata();
        registry[0].versions['0.1.0'] = {};
        const io = releaseIO();
        io.verify.mockRejectedValueOnce(new Error('another source commit'));
        await expect(
            executeBackendRelease(
                planBackendRelease(stableManifests(), registry),
                'stage-stable',
                commit,
                io,
            ),
        ).rejects.toThrow('another source commit');
        expect(io.publish).not.toHaveBeenCalled();
    });

    it('promotes only after both candidates have been verified and resumes an interrupted promotion', async () => {
        const registry = metadata();
        const plan = () => planBackendRelease(stableManifests(), registry);
        const io = releaseIO();
        registry[0].versions['0.1.0'] = {};
        await expect(
            executeBackendRelease(plan(), 'promote-stable', commit, io),
        ).rejects.toThrow(/Stage both/);
        expect(io.promote).not.toHaveBeenCalled();
        registry[1].versions['0.1.0'] = {};
        io.verify
            .mockResolvedValueOnce(commit)
            .mockRejectedValueOnce(new Error('tarball unavailable'));
        await expect(
            executeBackendRelease(plan(), 'promote-stable', commit, io),
        ).rejects.toThrow('tarball unavailable');
        expect(io.promote).not.toHaveBeenCalled();

        const changed: string[] = [];
        const partial = releaseIO();
        const promote = async ({
            name,
            version,
        }: {
            name: string;
            version: string;
        }) => {
            const tags = registry[names.indexOf(name)]['dist-tags'];

            if (tags.latest === version) {
                return;
            }

            changed.push(name);
            tags.latest = version;
        };
        partial.promote
            .mockImplementationOnce(promote)
            .mockRejectedValueOnce(new Error('second tag failed'));
        await expect(
            executeBackendRelease(plan(), 'promote-stable', commit, partial),
        ).rejects.toThrow('second tag failed');
        expect(partial.track).not.toHaveBeenCalled();

        const resume = releaseIO();
        resume.promote.mockImplementation(promote);
        await executeBackendRelease(plan(), 'promote-stable', commit, resume);
        expect(changed).toEqual(names);
        expect(resume.promote.mock.calls.map(([pkg]) => pkg.name)).toEqual([
            names[1],
        ]);
        expect(resume.confirmLatest).toHaveBeenCalledTimes(2);
        expect(resume.publish).not.toHaveBeenCalled();
        expect(resume.track).toHaveBeenCalledTimes(2);
    });

    it('keeps the existing alpha publication separate from stable stage and promotion', async () => {
        const plan = planBackendRelease(manifests(), metadata());
        const io = releaseIO();
        await expect(
            executeBackendRelease(plan, 'stage-stable', commit, io),
        ).rejects.toThrow(/channel/);
        await executeBackendRelease(plan, 'publish', commit, io);
        expect(io.publish.mock.calls.map(([pkg]) => pkg.tag)).toEqual([
            'alpha',
            'alpha',
        ]);
        expect(io.track).toHaveBeenCalledTimes(2);
        expect(io.promote).not.toHaveBeenCalled();
    });
});

it('waits through index and provenance propagation but stops on authorization failures', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const pending = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(
            Object.assign(new Error('not visible'), { status: 404 }),
        )
        .mockResolvedValueOnce('verified');
    await expect(waitFor('npm provenance', pending, sleep)).resolves.toBe(
        'verified',
    );
    expect(sleep).toHaveBeenCalledTimes(2);
    const denied = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('denied'), { status: 403 }));
    await expect(waitFor('npm provenance', denied, sleep)).rejects.toThrow(
        'denied',
    );
    expect(denied).toHaveBeenCalledTimes(1);
});

it('binds registry provenance to the expected commit and tarball identity', () => {
    const pkg = { name: names[0], version: '0.1.0' };
    const digest = Buffer.alloc(64, 1);
    const published = {
        dist: { integrity: `sha512-${digest.toString('base64')}` },
    };
    const provenance = (gitCommit: string, hash: string) => ({
        attestations: [
            {
                predicateType: 'https://slsa.dev/provenance/v1',
                bundle: {
                    dsseEnvelope: {
                        payload: Buffer.from(
                            JSON.stringify({
                                subject: [
                                    {
                                        name: 'pkg:npm/%40trellisjs/server@0.1.0',
                                        digest: { sha512: hash },
                                    },
                                ],
                                predicate: {
                                    buildDefinition: {
                                        externalParameters: {
                                            workflow: {
                                                repository:
                                                    'https://github.com/cluion/trellis',
                                                path: '.github/workflows/release.yml',
                                                ref: 'refs/heads/main',
                                            },
                                        },
                                        resolvedDependencies: [
                                            { digest: { gitCommit } },
                                        ],
                                    },
                                },
                            }),
                        ).toString('base64'),
                    },
                },
            },
        ],
    });
    expect(
        verifyProvenance(
            pkg,
            published,
            provenance(commit, digest.toString('hex')),
            commit,
        ),
    ).toBe(commit);
    expect(() =>
        verifyProvenance(
            pkg,
            published,
            provenance('b'.repeat(40), digest.toString('hex')),
            commit,
        ),
    ).toThrow(/another source commit/);
    expect(() =>
        verifyProvenance(pkg, published, provenance(commit, 'wrong'), commit),
    ).toThrow(/published tarball/);
});
