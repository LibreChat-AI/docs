# Archived documentation

This directory contains one snapshot per archived version. Version directory names must match `v<major>.<minor>[.<patch>|.x][-rc<n>]` — e.g. `v0.8.5`, `v0.8.8-rc2`, `v0.7.x` — and are served at `/<version>/docs`. A directory name outside that shape fails the build rather than silently publishing nothing.

Archives contain English-only content and are created with `pnpm docs:archive <version>`. Archived content is frozen: it is never translated and is never modified by `pnpm sync:config-version`.

## When a release ships

The `Sync docs archive` workflow (`pnpm docs:archive:sync`) checks LibreChat's releases daily and opens a PR when there is something to do:

1. Each new release candidate is archived (`v0.8.9-rc1`, `v0.8.9-rc2`, ...) and stays archived while that release is in testing.
2. When the final release is published, it is archived and that release's candidate snapshots (`v0.8.9-rc*`) are removed. Only final releases stay archived: every snapshot is bundled into the build, and keeping each candidate as well pushes the bundle past what webpack can emit.

Each snapshot is taken from the last docs commit before the release was published. To archive by hand instead: `pnpm docs:archive v0.8.9 --ref=<release-commit>`.

The newest archived release is labelled as the latest release in the version switcher and gets an informational banner instead of the archived warning. The live docs at `/docs` follow LibreChat's development branch.
