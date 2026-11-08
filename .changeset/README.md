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

`@trellisjs/server` and `@trellisjs/server-prisma` remain alpha packages. The
current backend safety/API changes are source-only until a separate approved
alpha release; their manifests stay at `0.1.0-alpha.1` in this repair PR.
Keep them out of the stable Changesets entries so the version PR does not
implicitly promote them to `0.1.0`.

Before a backend alpha version bump, prepare an alpha-only publishing path that
explicitly uses the `alpha` npm dist-tag. Do not merge that bump while the shared
publisher would send it to `latest`. The installed Changesets CLI defaults to
`latest` outside global prerelease mode; global prerelease mode would also affect
the stable frontend release train. Versioning and publishing the backend alpha
packages require a separate release step and approval.
