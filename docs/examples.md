# ICAN Examples — Fixtures & Golden Outputs

This document walks through each of the 6 synthetic fixture cases included in
ICAN. These fixtures serve as the acceptance baseline — every case has
expected inputs, expected outputs (golden output), and expected exit codes.

All fixtures are **synthetic**: no real-world IAM policy samples, real AWS
account IDs, or organization-specific ARNs are included.

---

## Fixture Cases Overview

| Case | Type | Expected FinalDecision | Expected ExitCode |
|---|---|---|---|
| `allow-basic` | Allow | `ALLOW` | `0` |
| `explicit-deny-basic` | Explicit Deny | `EXPLICIT_DENY` | `1` |
| `implicit-deny-basic` | Implicit Deny | `IMPLICIT_DENY` | `4` |
| `multi-policy-precedence` | Multi-policy | `EXPLICIT_DENY` | `1` |
| `indeterminate-unsupported-condition` | Unsupported | *(error)* | `3` |
| `invalid-policy-json` | Invalid Input | *(error)* | `2` |

---

## File Structure

Every case directory contains:

| File | Purpose |
|---|---|
| `policies/*.json` | One or more IAM policy documents |
| `request.json` | The evaluation request (action, resource, context) |
| `metadata.json` | Human-readable case metadata and expected outcome |
| `expected/expected.json` | Golden output — the stable JSON result this case should produce |
| `expected/expected.txt` | Golden output — the stable text result this case should produce |
| `expected/expected-exit-code.txt` | Golden output — the stable exit code this case should produce |

The golden output files were generated during ICAN S01 development by running
`ican check` against each case's input, then normalizing any absolute paths
to `<WORKSHOP_ROOT>/` placeholders. They are checked into version control
as the single source of truth for "what ICAN should output for this input."

---

## Case 1: `allow-basic`

**Purpose:** Verify that a single Allow statement matching both action and
resource produces an ALLOW decision with exit code 0.

**Input:**
- One policy with one `Allow` statement for `s3:GetObject` on `example-bucket/*`
- Request: `action=s3:GetObject`, `resource=arn:aws:s3:::example-bucket/photo.jpg`

**Expected:**
- `finalDecision`: `ALLOW`
- `decisionStatus`: `DETERMINATE`
- `exitCode`: `0`

**Why this matters:** This is the simplest happy-path test. If this case fails,
something fundamental is broken.

---

## Case 2: `explicit-deny-basic`

**Purpose:** Verify Deny precedence — a `Deny` statement overrides an `Allow`
statement for the same action and resource.

**Input:**
- One policy with two statements: `Deny` for `s3:GetObject` on `example-bucket/*`,
  followed by `Allow` for the same action and resource
- Request: `action=s3:GetObject`, `resource=arn:aws:s3:::example-bucket/photo.jpg`

**Expected:**
- `finalDecision`: `EXPLICIT_DENY`
- `decisionStatus`: `DETERMINATE`
- `exitCode`: `1`

**Why this matters:** IAM explicitly specifies that a Deny always takes
precedence over an Allow. This case verifies that ICAN enforces this rule.

---

## Case 3: `implicit-deny-basic`

**Purpose:** Verify that when no Allow statement matches the request, the
result is an implicit deny (the IAM default).

**Input:**
- One policy with one `Allow` statement for `s3:PutObject` (not `GetObject`)
- Request: `action=s3:GetObject`, `resource=arn:aws:s3:::example-bucket/photo.jpg`

**Expected:**
- `finalDecision`: `IMPLICIT_DENY`
- `decisionStatus`: `DETERMINATE`
- `exitCode`: `4`

**Why this matters:** ICAN distinguishes between explicit deny (exit code 1)
and implicit deny (exit code 4) per the design specification (§10.8). This
case ensures the tool correctly identifies the absence of any applicable Allow
as a distinct outcome.

---

## Case 4: `multi-policy-precedence`

**Purpose:** Verify cross-policy evaluation: policy-01 allows `s3:GetObject`
on `example-bucket/*`, policy-02 denies `s3:GetObject` on
`example-bucket/secret/*`. The Deny should win.

**Input:**
- Two policies:
  - policy-01: `Allow` `s3:GetObject` on `example-bucket/*`
  - policy-02: `Deny` `s3:GetObject` on `example-bucket/secret/*`
- Request: `action=s3:GetObject`, `resource=arn:aws:s3:::example-bucket/secret/data.txt`

**Expected:**
- `finalDecision`: `EXPLICIT_DENY`
- `decisionStatus`: `DETERMINATE`
- `exitCode`: `1`

**Why this matters:** In real IAM, multiple policies are evaluated together,
with Deny statements from any policy overriding Allow statements. This case
simulates two separate policy files to verify cross-policy priority.

---

## Case 5: `indeterminate-unsupported-condition`

**Purpose:** Verify that using a Condition operator outside the supported
set produces an unsupported feature error with exit code 3.

**Input:**
- One policy with a `StringNotEquals` condition — a valid IAM operator not in
  the currently supported set (`StringEquals`, `StringLike`, `Bool`, `IpAddress`)
- Request: `action=s3:GetObject`, `resource=arn:aws:s3:::example-bucket/photo.jpg`

**Expected:**
- Error output (not a full `EvaluationResult`)
- Error code: `POLICY_UNSUPPORTED_FEATURE`
- `exitCode`: `3`

**Why this matters:** This case demonstrates how ICAN handles unsupported
features: it does not silently ignore them, but reports them as
`POLICY_UNSUPPORTED_FEATURE` with exit code 3. Note that this is different from
invalid input (exit code 2) — the policy itself is valid JSON and valid IAM
structure, but uses an operator ICAN does not currently implement.

---

## Case 6: `invalid-policy-json`

**Purpose:** Verify that malformed JSON policy input causes a parse error
with exit code 2.

**Input:**
- One policy file with **intentionally malformed JSON** (missing closing brace)
- Request: `action=s3:GetObject`, `resource=arn:aws:s3:::example-bucket/photo.jpg`

**Expected:**
- Error output (not a full `EvaluationResult`)
- `exitCode`: `2`

**Why this matters:** This case ensures ICAN handles input errors gracefully,
reporting them as exit code 2 without crashing. The distinction from the
unsupported feature case (exit code 3) is important: this case is about
*input validity*, not *capability limitations*.

---

## Understanding FinalDecision / DecisionStatus / ExitCode

| FinalDecision | DecisionStatus | ExitCode | Meaning |
|---|---|---|---|
| `ALLOW` | `DETERMINATE` | `0` | Request explicitly allowed |
| `EXPLICIT_DENY` | `DETERMINATE` | `1` | An explicit Deny statement matched |
| `IMPLICIT_DENY` | `DETERMINATE` | `4` | No applicable Allow was found |
| *(any)* | `INDETERMINATE` | `3` | Unsupported feature prevented a determinate decision |
| *(error)* | — | `2` | Input or validation error |
| *(error)* | — | `10` | Internal runtime error |

The `decisionStatus` field indicates whether the decision was reached
deterministically. `INDETERMINATE` means an unsupported feature may have
affected the result — the decision should be treated as "best effort."

---

## Understanding pathTrace

The `pathTrace` in each JSON/text output lists each statement that was
evaluated, in evaluation order. For each statement, you can see:

- Whether `Action` matched
- Whether `Resource` matched
- Whether `Condition` matched
- Whether the statement was `applicable`
- If not applicable, the reason (e.g., `action_not_matched`,
  `resource_not_matched`, `unsupported_feature`)
- The source policy and statement reference

This trace is the primary structured basis for understanding **why** ICAN
made a particular decision. When debugging or extending ICAN, compare the
pathTrace against your expectations before looking at the final result.

---

## Unsupported Feature vs. Invalid Input

These are two distinct categories with different exit codes:

| Category | ExitCode | Example |
|---|---|---|
| **Invalid input** | `2` | Malformed JSON, missing fields, invalid structure |
| **Unsupported feature** | `3` | Valid IAM operator not yet implemented (e.g., `StringNotEquals`) |

This distinction matters for automation: if a tool receives exit code 2, it
knows the input was wrong; exit code 3 tells it ICAN simply doesn't implement
that feature yet.

---

## Regression Testing with Fixtures

The golden output files serve as a regression baseline:

1. A developer makes a change to ICAN
2. They run the tests (including golden-output comparison)
3. Any change to the actual output will fail the comparison test
4. This catches unintended semantic changes before they proliferate

To regenerate golden outputs (only when intentional changes are made and
approved), use:

```bash
node dist/cli/scripts/generate-golden-outputs.js
```

⚠️ Do not regenerate golden outputs without explicit approval — they are a
stable acceptance baseline.

---

## Important Boundaries

- All fixtures and examples in this document are **synthetic**
- No real-world IAM policy samples, real AWS account IDs, or
  organization-specific ARNs are included
- This document does **not** constitute S02 startup material — subsequent
  phases are not yet planned or approved
- Do not modify fixtures or golden outputs to make examples look better
- Case names, file paths, and exit codes in this document match the actual
  files under `test-fixtures/cases/`
