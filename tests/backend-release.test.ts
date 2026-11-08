import { describe, expect, it } from 'vitest';
import { planBackendRelease } from '../scripts/backend-release.mjs';

const names = ['@trellisjs/server', '@trellisjs/server-prisma'];
const manifests = () =>
    names.map((name) => ({
        name,
        version: '0.1.0-alpha.2',
        publishConfig: { tag: 'alpha', access: 'public' },
    }));
const metadata = () =>
    names.map((name) => ({
        name,
        versions: { '0.1.0-alpha.1': {} },
        'dist-tags': { alpha: '0.1.0-alpha.1', latest: '0.1.0-alpha.1' },
    }));

describe('backend alpha release isolation', () => {
    it('blocks the shared publisher until both backend versions exist', () => {
        const published = metadata();
        expect(
            planBackendRelease(manifests(), published).some(
                (pkg) => !pkg.exists,
            ),
        ).toBe(true);
        published[0].versions['0.1.0-alpha.2'] = {};
        expect(
            planBackendRelease(manifests(), published).some(
                (pkg) => !pkg.exists,
            ),
        ).toBe(true);
        published[1].versions['0.1.0-alpha.2'] = {};
        expect(
            planBackendRelease(manifests(), published).some(
                (pkg) => !pkg.exists,
            ),
        ).toBe(false);
    });

    it('rejects a backend package targeting latest', () => {
        const packages = manifests();
        packages[1].publishConfig.tag = 'latest';
        expect(() => planBackendRelease(packages, metadata())).toThrow();
    });

    it('rejects stable or mismatched versions', () => {
        const packages = manifests();
        packages[1].version = '0.1.0-alpha.3';
        expect(() => planBackendRelease(packages, metadata())).toThrow();
        packages.forEach((pkg) => {
            pkg.version = '0.1.0';
        });
        expect(() => planBackendRelease(packages, metadata())).toThrow(
            /alpha version/,
        );
    });

    it('refuses to move the alpha channel backwards', () => {
        const published = metadata();
        published[0]['dist-tags'].alpha = '0.1.0-alpha.3';
        expect(() => planBackendRelease(manifests(), published)).toThrow(
            /backwards/,
        );
    });

    it('fails closed for wrong package metadata or an unexpected package', () => {
        const published = metadata();
        published[0].name = 'other-package';
        expect(() => planBackendRelease(manifests(), published)).toThrow();
        const packages = manifests();
        packages[0].name = '@trellisjs/core';
        expect(() => planBackendRelease(packages, metadata())).toThrow();
    });
});
