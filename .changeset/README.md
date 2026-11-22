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

## Backend release channels

`@trellisjs/server` and `@trellisjs/server-prisma` are versioned together in a
dedicated PR. Do not add them to frontend Changesets entries or enable global
Changesets prerelease mode. Both packages are ignored by Changesets versioning.
The existing `pnpm release` and frontend workflow allow `changeset publish`
only once both backend versions exist on npm: the Changesets publish command
can otherwise pick up any unpublished public workspace package.

### Alpha

1. Update both backend manifests to the same `X.Y.Z-alpha.N` version and update
   their changelogs and migration instructions. Preserve `publishConfig.tag:
   "alpha"` and `access: "public"`.
2. Merge after the PR's CI passes.
3. Dispatch `.github/workflows/release.yml` on `main` with
   `channel=backend-alpha`. This existing workflow identity retains npm trusted
   publishing support. It packs only the two backend packages and explicitly
   runs `npm publish --tag alpha --access public --provenance`.
4. Verify both npm `alpha` tags, consumer installation and the GitHub prereleases.
   Existing `latest` tags must remain unchanged. The publisher refuses an alpha
   downgrade, checks both manifests before publishing, and supports retrying a
   partially completed release without republishing an existing version.

### Stable

1. In a separate version PR, set both backend manifests to the same new
   `X.Y.Z` and `publishConfig.tag: "next"`, retaining public access. Update
   both changelogs and migration guides. Verify both packed packages and their
   peer dependency from that PR before merging.
2. After approving publication, dispatch `Release` from `main` with
   `channel=backend-stable`. The workflow publishes only the two backend packages
   to `next`, verifies their npm provenance and public tarball integrity, and
   leaves `alpha` and `latest` unchanged. Record the run's full source SHA.
3. Install both exact versions from npm in a clean consumer and verify their
   public APIs and documented compatibility. After separately approving the
   default install switch, dispatch `Release` with `channel=backend-promote`
   and `release_sha` set to the source SHA from step 2. The workflow checks both
   `next` artifacts against that SHA before updating either `latest` tag. It then
   verifies both tags and creates the GitHub releases at the staged commit.
4. Verify that installing without a tag resolves both new versions and that the
   `alpha` tags still point to the earlier prereleases.

Both steps use the existing `release.yml` Trusted Publisher identity. The
stable staging step needs **Allow npm publish**. Promotion needs **Allow npm
dist-tag** on both packages (independent of publish permission) and an npm CLI
that supports OIDC dist-tag operations. See [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing).

npm updates versions and tags one package at a time. If publishing or promotion
fails partway, first check npm for processing delays and confirm which
artifacts and tags are visible. Then rerun the failed workflow with the same
commit and inputs. It verifies existing artifacts before working on the
remaining package and skips versions and `latest` tags already set to the
target. Do not bump the versions or use a new source commit to resume the same
release. The frontend publisher stays blocked while either backend version is
absent from npm; it resumes when both exist, even if backend `latest` promotion
is still pending. Unrecognized registry errors and provenance mismatches stop
the release.
