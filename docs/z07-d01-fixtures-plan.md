# ICAN Z07-D01: Actual Fixtures Directory Structure & Minimal Sample Boundaries

**Version:** v0.1
**Status:** Draft Plan
**Related:** Z05 fixture-schema.ts, Design Book §11

---

## 1. Relationship to Z05

Z05 (`src/fixtures/`) provides the **type-level foundation** for fixtures:

| Z05 Constant | Value | Purpose |
|:---|:---|:---|
| `FIXTURES_ROOT` | `test-fixtures` | Root directory |
| `CASES_DIR` | `cases` | Case subdirectory |
| `POLICIES_DIR` | `policies` | Per-case policy files |
| `EXPECTED_DIR` | `expected` | Per-case expected outputs |
| `REQUEST_FILE` | `request.json` | Evaluation request |
| `METADATA_FILE` | `metadata.json` | Case metadata |

Z05 also defines `CaseMetadata`, `OriginType`, `AssertionKind`, and expected output file constants.

Z07-D01 **does not modify Z05**. It uses Z05 constants as the directory naming authority and extends them with actual file placement conventions.

---

## 2. Actual Fixtures Root

```
车间/test-fixtures/
  └── cases/
```

This matches Z05's `FIXTURES_ROOT` and `CASES_DIR`. The `test-fixtures/` directory is placed at the workshop root (`车间/`) to maintain clear separation from `src/` source code.

---

## 3. Per-Case Directory Structure

Each case is a subdirectory under `cases/`, named with a short semantic identifier:

```
test-fixtures/
  cases/
    allow-single-statement/
    explicit-deny-priority/
    implicit-deny-no-allow/
    indeterminate-unsupported/
    invalid-policy-json/
    ...
```

### 3.1 Per-Case Contents

| File | Z05 Constant | Content |
|:---|:---|:---|
| `policies/policy-01.json` | `POLICIES_DIR` | Input IAM policy document (synthetic) |
| `request.json` | `REQUEST_FILE` | Evaluation request with action/resource/context |
| `metadata.json` | `METADATA_FILE` | Case metadata (id, description, tags, origin) |
| `expected/expected-evaluation.json` | `EXPECTED_EVALUATION_FILE` | Expected finalDecision, decisionStatus, matchedStatementIds |
| `expected/expected-json-output.json` | `EXPECTED_JSON_OUTPUT_FILE` | Expected full JSON output snapshot |
| `expected/expected-text-output.txt` | `EXPECTED_TEXT_OUTPUT_FILE` | Expected full text output snapshot |
| `expected/expected-path-trace.json` | `EXPECTED_PATH_TRACE_FILE` | Expected path trace entries |

### 3.2 Multiple Policy Files

If a case requires multiple policies, place them as sequentially numbered files:

```
policies/policy-01.json
policies/policy-02.json
```

### 3.3 Context Variations

If a case tests the same policy with different contexts, use request variants:

```
request-allow.json      # ALLOW expected
request-deny.json       # DENY expected
```

Each variant gets its own expected directory:

```
expected-allow/expected-evaluation.json
expected-deny/expected-evaluation.json
```

---

## 4. Minimal Sample Type Inventory

Z07 must cover S01 acceptance core paths. Minimum set:

| # | Type | Case Name | What It Verifies |
|:---|:---|:---|:---|
| 1 | **allow** | `allow-single-statement` | Single Allow statement matches → `ALLOW`, exitCode 0 |
| 2 | **explicit-deny** | `explicit-deny-priority` | Deny statement overrides Allow → `EXPLICIT_DENY`, exitCode 1 |
| 3 | **implicit-deny** | `implicit-deny-no-allow` | No applicable Allow → `IMPLICIT_DENY`, exitCode 4 |
| 4 | **indeterminate** | `indeterminate-unsupported` | Unsupported feature causes `INDETERMINATE`, exitCode 3 |
| 5 | **invalid-input** | `invalid-policy-json` | Malformed policy → error output, exitCode 2 |
| 6 | **multi-policy** | `multi-policy-merge` | Multiple policies with cross-policy deny/allow → correct merge |

### 4.1 Type Justification

| Type | Why Required |
|:---|:---|
| allow | Verifies the happy path from input to JSON/text output to exitCode 0 |
| explicit-deny | Verifies deny-precedence semantics and exitCode 1 |
| implicit-deny | Verifies default-deny semantics and exitCode 4 (distinct from explicit deny per §10.8) |
| indeterminate | Verifies unsupported feature handling and exitCode 3 |
| invalid-input | Verifies error output formatting and exitCode 2 |
| multi-policy | Verifies multi-policy evaluation and statement deduplication |

### 4.2 Not Included in D01

These are deferred to D02 or later, or blocked pending 帅裁定:

| Type | Reason Deferred |
|:---|:---|
| Real-world AWS policies | Requires 帅 approval per existing policy |
| Large policy sets (>10 statements) | Exceeds Z07 minimum scope |
| Complex Condition operators | Z03 already tested; fixtures should focus on CLI integration |
| Performance/stress cases | Not part of S01 acceptance |

---

## 5. Naming Conventions

### 5.1 Case Directory Names

- Lowercase kebab-case: `allow-single-statement`, `explicit-deny-priority`
- Semantic, not numeric: avoid `case-01`, `case-02`

### 5.2 Policy File Names

- `policy-01.json`, `policy-02.json` within each case's `policies/` directory

### 5.3 Metadata File

```json
{
  "caseName": "allow-single-statement",
  "caseId": "z07-allow-001",
  "description": "Single Allow statement matches action and resource",
  "origin": "synthetic",
  "tags": ["allow", "single-statement", "basic"],
  "expectedFinalDecision": "ALLOW",
  "expectedDecisionStatus": "DETERMINATE",
  "expectedExitCode": 0
}
```

### 5.4 Expected Output Files

- `expected-evaluation.json`: Final decision and statement-level results
- `expected-json-output.json`: Full CLI JSON output snapshot
- `expected-text-output.txt`: Full CLI text output snapshot
- `expected-path-trace.json`: Path trace entries

---

## 6. Relationship to Golden Output

**Golden Output** is the persistent, version-controlled expected output file that serves as the baseline for test assertions.

| Aspect | Z07-D01 Role |
|:---|:---|
| Golden output **directory structure** | Planned in D01 |
| Golden output **file naming** | Planned in D01 |
| Golden output **content creation** | **NOT in D01** — deferred to Z07-D02 |
| Golden output **automated generation** | **NOT in D01** — tooling is a D02/D03 concern |

### 6.1 Golden Output Principle

Golden output files are the single source of truth for "what the CLI should output for this case." Tests read golden output and compare it against actual CLI output for the same input.

### 6.2 Golden Output Requirements (for D02)

| Requirement | Description |
|:---|:---|
| Stability | Output must not change between runs with identical inputs |
| Determinism | No random values, timestamps, or execution-order-dependent fields |
| Comparability | JSON output must have stable field ordering (already guaranteed by Z04) |
| Reviewability | Diff-friendly format; one golden file per output format per case |

---

## 7. Directory Structure Summary

```
车间/
  test-fixtures/                          ← Z05 FIXTURES_ROOT
    README.md                             ← Explains directory conventions
    cases/                                ← Z05 CASES_DIR
      allow-single-statement/
        policies/
          policy-01.json
        request.json
        metadata.json
        expected/
          expected-evaluation.json
          expected-json-output.json
          expected-text-output.txt
          expected-path-trace.json
      explicit-deny-priority/
        policies/
          policy-01.json
          policy-02.json                  ← Deny policy + Allow policy
        request.json
        metadata.json
        expected/
          expected-evaluation.json
          expected-json-output.json
          expected-text-output.txt
          expected-path-trace.json
      implicit-deny-no-allow/
        policies/
          policy-01.json                  ← Policy with no matching Allow
        request.json
        metadata.json
        expected/
          ...
      indeterminate-unsupported/
        policies/
          policy-01.json                  ← Policy using unsupported feature
        request.json
        metadata.json
        expected/
          ...
      invalid-policy-json/
        policies/
          policy-01.json                  ← Malformed JSON
        request.json
        metadata.json
        expected/
          ...
      multi-policy-merge/
        policies/
          policy-01.json
          policy-02.json
        request.json
        metadata.json
        expected/
          ...
```

---

## 8. Test Code Integration (Preview)

Z07-D02 will need test code that:

1. Iterates over case directories
2. Reads `policy-*.json` files
3. Reads `request.json`
4. Calls `ican check` (via `runCheck` or CLI executable)
5. Compares actual output against `expected/` golden files
6. Asserts exitCode matches `metadata.json.expectedExitCode`

This is **not implemented in D01**. D01 only defines the structure that D02 will consume.

---

## 9. Boundaries

| Boundary | Status |
|:---|:---|
| Modifies Z01-Z06 | ❌ Not allowed |
| Modifies Z05 fixture-schema.ts | ❌ Not planned (only reference) |
| Creates actual fixture files | ❌ Deferred to D02 |
| Generates golden output | ❌ Deferred to D02 |
| Introduces real-world samples | ❌ Not allowed |
| Launches Z07-D02 | ❌ Not yet activated |
