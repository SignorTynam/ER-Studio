# Testing and verification matrix

Use focused tests while developing and the full relevant suite before merge.
Never claim a test that was not run. Always list skipped checks and explain
why.

| Change | Minimum checks |
| --- | --- |
| Agent documentation | Markdown links, policy validation, entrypoint parity, policy tests |
| Branch or commit tooling | Script tests and workflow inspection |
| TypeScript logic | Focused tests plus `npm run build` |
| Parser or serializer | Focused regression, pertinent suite, round-trip where relevant, build |
| ER transformations | Focused regression, translation suite, related identifier/cardinality cases, build |
| UI or component | Component test, accessibility/i18n review, build |
| Responsive layout | Relevant Playwright viewports plus build |
| User flow | Relevant end-to-end test |
| i18n | Key parity, all three locales, no hardcoded visible string |
| Release | release check, changelog check, tests, build, release-note generation |
| Configuration | Policy or pertinent suite plus build |
| Dependency | Clean install, build, and pertinent tests |

## Policy checks

Run the shared repository controls with:

```bash
npm run agents:check
npm run repo:check-branch
npm run repo:check-commits
npm run test:policy
```

`agents:check` validates the policy JSON, entrypoint parity, routed documents,
relative Markdown links, required triggers, competing instruction files, npm
script wiring, and forbidden tracked artifacts.

## General rules

- `npm ci` is the clean-install check used by CI.
- `npm test` runs the configured unit and integration suite.
- `npm run build` performs TypeScript project build and Vite production build.
- `npm run test:e2e` is mandatory for UI, layout, responsive, or user-flow
  changes; otherwise it may be skipped with an explicit reason.
- Domain bugs require a regression test.
- Parser or file-format changes require compatibility and round-trip coverage
  where applicable.
- Responsive changes require pertinent Playwright viewport coverage.
- Release preparation runs `release:check`, `changelog:check`, tests, build,
  and release-note generation.
- Finish with `git diff --check`, final diff inspection, and working-tree
  inspection.

When a check fails because of the change, fix it and rerun. When it fails for a
confirmed unrelated environmental reason, report the exact failure and do not
describe the check as passed.
