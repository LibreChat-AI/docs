# Docs sync: document what merged to LibreChat `dev`

You are updating the librechat.ai documentation so it covers changes that recently merged to the LibreChat application's `dev` branch. Work in the current checkout of the docs repository.

## Inputs

- `.sync/commits.txt`: the LibreChat commits to review, one per line (`<sha> <author date> <subject>`), oldest first.
- `.sync/librechat/`: a clone of `LibreChat-AI/LibreChat` at `origin/dev`. It is the source of truth for behavior. Read it with `git -C .sync/librechat show <sha>`, `git -C .sync/librechat show origin/dev:<path>` and `git -C .sync/librechat grep -n <pattern> origin/dev -- <paths>`.
- Docs live in `content/docs/`. English sources are the `*.mdx` and `meta.json` files without a locale suffix.

Useful app paths:

| What | Where |
| --- | --- |
| `librechat.yaml` schema, defaults, ranges | `packages/data-provider/src/config.ts` |
| Example config with comments | `librechat.example.yaml` |
| Environment variables | `.env.example` |
| English UI strings (exact labels) | `client/src/locales/en/translation.json` |
| Settings dialog entries | `client/src/components/Nav/Settings/registry.tsx` |

## Step 1: triage

For every commit in `.sync/commits.txt`, decide whether it needs documentation. It does when it:

- adds or changes an environment variable, a `librechat.yaml` key, a default, a range, or precedence between them;
- adds or changes a user-visible feature, setting, workflow or label;
- changes admin-facing behavior (auth, permissions, retention, rate limits, logging an admin acts on);
- makes existing docs wrong (for example a page that still describes a removed menu).

Internal refactors, tests, performance work, styling with no behavior change, and CI changes need no docs. Group related commits (a feature and its follow-up fixes) and document the final behavior on `origin/dev`, not the intermediate states.

## Step 2: check coverage

For each candidate, search the English docs for the keys, labels and concepts involved. If the docs already describe the current behavior correctly, record it as covered and move on.

## Step 3: write

- Verify every fact against `.sync/librechat` at `origin/dev` before writing it. A commit message is a lead, never evidence. Quote exact key names, defaults, ranges and UI labels from the source.
- Edit only English sources. Never create or edit locale copies such as `*.de.mdx` or `meta.de.json`; a separate workflow translates English changes. Write reader-facing prose inline in the MDX page, not in `components/repeated/`, because those partials are not translated.
- Put each change where a reader would look for it: feature behavior on the matching `content/docs/features/*.mdx` page, `librechat.yaml` keys on the matching page under `content/docs/configuration/librechat_yaml/object_structure/`, and environment variables in `content/docs/configuration/dotenv.mdx`. A genuinely new feature can get a new page; register it in the folder's `meta.json`.
- Match the page you are editing: its heading levels, tone and MDX components (`Callout`, `Steps`, `Tabs`, `OptionTable`). `OptionTable` cells render as plain text, so do not put backticks, bold or links inside them; put links in the surrounding prose.
- Lead with what the feature does and when to use it, then a minimal working example, then reference details, then caveats. Use exact UI labels in bold. Be complete but tight.
- The live docs follow `dev`. Do not add "available since" or "newer than vX" notes; released versions are served from `content/docs-archive/`, which you must never edit.
- Never use an em dash or an en dash as punctuation, and never use ` -- ` as a substitute. Use commas, colons, semicolons, parentheses or separate sentences. No emojis.
- Do not add or replace images. If a change makes an existing screenshot outdated, list it in the report instead.
- Do not touch files outside `content/docs/`, except `.sync/report.md`.

## Step 4: verify

After writing, re-check each changed claim against the source, ideally with an independent subagent that reads only the diff (`git diff -- content/docs`) and `.sync/librechat`. Fix every confirmed problem. Also check that every internal link you added points to an existing page and heading anchor.

## Step 5: report

Write `.sync/report.md`, which becomes the pull request description. Keep it to one screen:

```markdown
## Summary

<One short paragraph: what this sync documents and the commit range.>

## Changes

- <page>: <what was added or corrected> (<LibreChat PR numbers>)

## Reviewed without docs changes

<One line per group, e.g. "Internal refactors and tests: #16592, #16610">

## Needs a human

- <Unverified claims, outdated screenshots, decisions you could not make from the source>
```

If nothing needs documentation, leave `content/docs/` untouched and say so in the report.
