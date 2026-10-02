# Archived documentation

This directory contains one snapshot per archived version. Version directory names must match `v<major>.<minor>[.<patch>|.x][-rc<n>]` — e.g. `v0.8.5`, `v0.8.8-rc2`, `v0.7.x` — and are served at `/<version>/docs`. A directory name outside that shape fails the build rather than silently publishing nothing.

Archives contain English-only content and are created with `pnpm docs:archive <version>`. Archived content is frozen: it is never translated and is never modified by `pnpm sync:config-version`.

## When a release ships

1. Archive the release from the commit that prepared it: `pnpm docs:archive v0.8.9 --ref=<release-commit>`.
2. Delete the snapshots of that release's candidates (`v0.8.9-rc*`). Only final releases stay archived: every snapshot is bundled into the build, and keeping each candidate as well pushes the bundle past what webpack can emit.

The newest archived release is labelled as the latest release in the version switcher and gets an informational banner instead of the archived warning. The live docs at `/docs` follow LibreChat's development branch.
