# Changesets

This folder is managed by the `@changesets/cli` package.

## Usage

1. Run `pnpm changeset` to create a new changeset
2. Select the packages that changed and the version bump type (patch/minor/major)
3. Write a description of the change
4. Commit the generated `.changeset/*.md` file

When changesets are merged to `main`, the Release workflow will:
1. Create or update a "Version Packages" PR
2. Once the version PR is merged, publish all changed packages to npm
