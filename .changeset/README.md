# Changesets

This folder is managed by the `@changesets/cli` package.

## Usage

1. Run `pnpm changeset` to create a new changeset
2. Select the packages that changed and the version bump type (patch/minor/major)
3. Write a description of the change
4. Commit the generated `.changeset/*.md` file

When changesets are merged to `main`, the Release workflow will:
1. Create or update a "Version Packages" PR for the stable packages
2. Once the version PR is merged, publish their unpublished versions to npm

## Backend alpha channel

`@trellisjs/server` and `@trellisjs/server-prisma` remain alpha packages. Keep
them out of stable Changesets entries so the version PR does not implicitly
promote them to `0.1.0`. Do not enable global Changesets prerelease mode: it also
affects the stable frontend packages.

For an approved backend alpha release:

1. Update both backend manifests to the same `X.Y.Z-alpha.N` version and update
   their changelogs and migration instructions. Preserve `publishConfig.tag:
   "alpha"` and `access: "public"`.
2. Merge after the PR's CI passes. The normal Release run skips the shared
   publisher while either backend version is unpublished.
3. Dispatch `.github/workflows/release.yml` on `main` with
   `channel=backend-alpha`. This existing workflow identity retains npm trusted
   publishing support. It packs only the two backend packages and explicitly
   runs `npm publish --tag alpha --access public --provenance`.
4. Verify both npm `alpha` tags, consumer installation and the GitHub prereleases.
   Existing `latest` tags must remain unchanged. The publisher refuses an alpha
   downgrade, checks both manifests before publishing, and supports retrying a
   partially completed release without republishing an existing version.

Both `pnpm release` and the stable workflow use the same guard before invoking
Changesets. Registry errors fail closed. Backend alpha versioning and publishing
require approval separately from a stable frontend release.
