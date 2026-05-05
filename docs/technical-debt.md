# ICAN Technical Debt Register — RC01-D04

This document catalogs known technical debt across ICAN S01. Items are
recorded for future reference; they are NOT to be fixed in this RC01-D04
task. Actual fixes require separate planning and approval.

---

## 1. IAM Semantic Coverage Boundaries

| # | Item | Severity | Notes |
|---|---|---|---|
| 1.1 | Limited condition operators | Medium | Only `StringEquals`, `StringLike`, `Bool`, `IpAddress` supported. Operators like `ArnEquals`, `StringNotEquals`, `DateLessThan`, `NumericLessThan`, `ForAllValues`, `ForAnyValue` are unsupported. The `StringNotEquals` case produces `POLICY_UNSUPPORTED_FEATURE` (exitCode 3). |
| 1.2 | `NotAction` / `NotResource` | Low | These structural IAM constructs are rejected at the schema level as invalid shape. They are not treated as unsupported features. |
| 1.3 | `Principal` evaluation | Not in scope | IAM Principal field is read but not evaluated in S01. |
| 1.4 | Resource-level wildcard granularity | Low | Basic `*` matching works; multi-segment wildcards (`???`) and condition-key-based resource matching are not implemented. |

## 2. CLI Experience

| # | Item | Severity | Notes |
|---|---|---|---|
| 2.1 | Error message readability | Medium | Some error messages expose raw zod validation details. Could be more user-friendly for external consumers. |
| 2.2 | `--context-json` inline ergonomics | Low | Inline JSON context requires careful shell escaping. A `--context` shorthand or file-only recommendation could improve usability. |
| 2.3 | `node dist/cli/ican.js check` verbosity | Low | The direct invocation path is long. `npm link` or publishing would enable `ican check` directly via bin. |
| 2.4 | Help text coverage | Low | Current help covers core flags; could add examples in help output. |
| 2.5 | Color output | Low | Text output currently has no color or formatting for terminal readability. |

## 3. Output Model

| # | Item | Severity | Notes |
|---|---|---|---|
| 3.1 | `sourcePolicyPath` contains absolute paths in live output | Low | Live CLI output contains real absolute paths. Golden output replaces them with `<WORKSHOP_ROOT>`. Future versions could consider relative-path normalization in core output. |
| 3.2 | `summary` field is English-only | Low | No i18n mechanism. Could consider structured summary with localization hooks. |
| 3.3 | `diagnostics` structure depth | Low | Diagnostics are flat arrays; nested error relationships are not expressed. |
| 3.4 | JSON field ordering | Stable | Z04-D02 guarantees stable field ordering; this is acceptable for S01. Adding new fields requires careful position management. |

## 4. pathTrace Explainability

| # | Item | Severity | Notes |
|---|---|---|---|
| 4.1 | pathTrace entry readability | Low | Raw pathTrace uses internal IDs. A human-readable summary could improve debuggability. |
| 4.2 | `nonApplicableReasons` overlap | Low | Multiple reasons may apply to a single statement but only the primary one is recorded. |

## 5. Fixtures / Golden Output Maintenance

| # | Item | Severity | Notes |
|---|---|---|---|
| 5.1 | Only 6 fixture cases | Low | Current coverage is minimal for S01 acceptance. Future phases may need more cases for edge conditions, multi-level resource matching, etc. |
| 5.2 | Golden output regeneration risk | Medium | The regeneration script exists but is not part of normal workflow. Accidental regeneration could silently change acceptance baseline. |
| 5.3 | `indeterminate-unsupported-condition` case design | Low | Uses `StringNotEquals` condition to trigger unsupported error. A more canonical unsupported feature fixture (e.g., a policy with an unsupported structural element handled by the evaluation pipeline) could be added. |

## 6. Documentation Consistency

| # | Item | Severity | Notes |
|---|---|---|---|
| 6.1 | README / usage / examples cross-references | Low | Cross-document references are manual; a documentation build step could verify link consistency. |
| 6.2 | Task books vs README vs usage | Low | Governance task books describe features in Chinese; user-facing docs are in English. Some feature descriptions could benefit from bilingual alignment. |
| 6.3 | CLI examples in docs use `node dist/cli/ican.js check` | Low | After packaging or linking, examples should also show `ican check` usage. |

## 7. Security & Sample Boundaries

| # | Item | Severity | Notes |
|---|---|---|---|
| 7.1 | No automated sample boundary check | Low | Currently relies on human review. A CI script could grep for known real AWS patterns. |
| 7.2 | License review pending | Low | License file exists but has not been reviewed for publish readiness. |
| 7.3 | `process.exitCode` vs `process.exit()` | Addressed | S01 uses `process.exitCode` consistently; `process.exit()` is not called in any CLI code path. No action required. |

## 8. Release Engineering

| # | Item | Severity | Notes |
|---|---|---|---|
| 8.1 | No `.npmignore` | Medium | Publishing to npm would include unnecessary files (task books, dev docs). Needs `.npmignore` or `files` field. |
| 8.2 | No CI/CD pipeline | Low | Build, test, and lint checks are manual. |
| 8.3 | No version policy | Low | Version number in `package.json` has not been incremented since S01. |
| 8.4 | `dist/` not in `.gitignore` | Low | Build output in `dist/` should not be version-controlled if a CI/CD pipeline exists. Currently tracked. |

## 9. Package / Bin / License / Repository Metadata

| # | Item | Severity | Notes |
|---|---|---|---|
| 9.1 | Repository URL | Low | `package.json` repository field may need updating before publish. |
| 9.2 | Author field | Low | Author metadata is placeholder. |
| 9.3 | Keywords | Low | `package.json` lacks `keywords` for discoverability. |

## 10. S02 Candidate Risks

| # | Item | Severity | Notes |
|---|---|---|---|
| 10.1 | Condition evaluator extensibility | Medium | Adding new operators requires changes to `condition-evaluator.ts` handler map. Design is straightforward but not plugin-based. |
| 10.2 | Multi-policy evaluation order | Low | Statement-level evaluation order is stable. Cross-policy deduplication uses statementId. |
| 10.3 | Output model extensibility | Low | Adding new JSON fields must maintain stable field ordering (Z04-D02 contract). |
| 10.4 | Fixtures approach | Low | Current 6-case fixtures are synthetic. Real-world IAM scenarios would require new case design and sample policy review. |
| 10.5 | CLI extensibility | Low | Currently single `check` subcommand. Adding new subcommands requires extending the dispatch function. |

---

## Summary

| Category | Items | Highest Severity |
|---|---|---|
| IAM semantic coverage | 4 | Medium |
| CLI experience | 5 | Medium |
| Output model | 4 | Low |
| pathTrace | 2 | Low |
| Fixtures / golden output | 3 | Medium |
| Documentation | 3 | Low |
| Security & samples | 3 | Low |
| Release engineering | 4 | Medium |
| Package metadata | 3 | Low |
| S02 candidate risks | 5 | Medium |

No item in this registry requires immediate fix before RC01 completion.
All items are deferred to post-RC01 planning or S02 candidate evaluation.
