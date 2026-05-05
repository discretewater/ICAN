# ICAN Usage Guide — CLI & Evaluation Walkthrough

This guide walks through installing, building, testing, and running ICAN
end-to-end. It assumes you have already read the project [README](../README.md).

---

## Prerequisites & Installation

```bash
# Requires Node.js 20+
node --version

# Install dependencies
npm install
```

---

## Verify the Build

```bash
# Type checking
npm run typecheck          # → tsc --noEmit

# All tests (1090 test cases as of S01 completion)
npm run test -- --run      # → vitest run

# Compile TypeScript to dist/
npm run build              # → tsc
```

All three commands should pass without errors before using `ican check`.

---

## The `ican check` Command

ICAN provides a single CLI command: `ican check`.

### Package binary vs direct invocation

The `package.json` registers `ican` as the binary name (via `bin.ican` pointing
to `dist/cli/ican.js`). Until the package is linked or published, run the
command directly:

```bash
node dist/cli/ican.js check [options]
```

For brevity, this guide uses `ican check` in descriptions; substitute with the
direct path above as needed.

### Basic help

```bash
node dist/cli/ican.js check --help
```

---

## Input: Policies, Action, Resource

`ican check` requires:

| Parameter | Description |
|---|---|
| `--policy <path>` | One or more IAM policy JSON files (repeatable) |
| `--action <string>` | The action being evaluated (e.g., `s3:GetObject`) |
| `--resource <string>` | The resource ARN being accessed |

Optional parameters:

| Parameter | Description |
|---|---|
| `--context-json <json>` | Inline context JSON |
| `--context-file <path>` | Context JSON file |
| `--format <json\|text>` | Output format (default: `text`) |

### Policy file format

Policy files should be valid JSON following the IAM `Version 2012-10-17`
format. Each policy contains one or more `Statement` entries with `Effect`
(`Allow` or `Deny`), `Action`, and `Resource`.

Example minimal allow policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::example-bucket/*"]
  }]
}
```

---

## Quick Examples

### Allow evaluation

```bash
# Write a policy to a temp file
cat > /tmp/allow-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::example-bucket/*"]
  }]
}
EOF

# Run the check (matching action and resource → ALLOW)
node dist/cli/ican.js check \
  --policy /tmp/allow-policy.json \
  --action s3:GetObject \
  --resource arn:aws:s3:::example-bucket/photo.jpg
```

Expected: `finalDecision: ALLOW`, `decisionStatus: DETERMINATE`, exit code `0`.

### JSON output

```bash
node dist/cli/ican.js check --format json \
  --policy /tmp/allow-policy.json \
  --action s3:GetObject \
  --resource arn:aws:s3:::example-bucket/photo.jpg
```

---

## Understanding the Output

### JSON format (`--format json`)

The JSON output contains:

| Field | Meaning |
|---|---|
| `finalDecision` | `ALLOW`, `EXPLICIT_DENY`, or `IMPLICIT_DENY` |
| `decisionStatus` | `DETERMINATE` or `INDETERMINATE` |
| `summary` | Human-readable decision summary |
| `statementResults` | Per-statement evaluation details |
| `pathTrace` | Ordered evaluation path showing each statement checked |
| `matchedDenyStatementIds` | IDs of matched Deny statements |
| `matchedAllowStatementIds` | IDs of matched Allow statements |
| `diagnostics` | Invalid inputs and unsupported features |

### Text format (`--format text`, default)

The text output presents the same information as structured sections:

```
Evaluation Report
---
decision:
  ALLOW
decisionStatus:
  DETERMINATE
summary:
  Request allowed by matching Allow statement
...
```

### Path trace

The `pathTrace` field lists each statement that was evaluated, in order. It
shows:

- Which statement was evaluated
- Whether Action, Resource, and Condition matched
- Why a statement was not applicable (if any)
- Any unsupported features encountered

This is the primary structured basis for debugging and understanding why ICAN
made a particular decision.

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Allowed (`ALLOW` + `DETERMINATE`) |
| `1` | Explicitly denied (`EXPLICIT_DENY` + `DETERMINATE`) |
| `2` | Input or validation error (bad policy, missing params, etc.) |
| `3` | Indeterminate result or unsupported feature |
| `4` | Implicitly denied (`IMPLICIT_DENY` + `DETERMINATE`) |
| `10` | Internal runtime error |

---

## Common Errors

### Missing required parameters

```bash
node dist/cli/ican.js check --action s3:GetObject
# → exit code 2, stderr: missing required parameter: --policy
```

### Policy file not found

```bash
node dist/cli/ican.js check --policy /nonexistent.json ...
# → exit code 2, error output describing file-not-found
```

### Invalid JSON policy

If a policy file contains malformed JSON, ICAN reports a parse error with
exit code `2`.

### Unsupported features

ICAN supports `StringEquals`, `StringLike`, `Bool`, and `IpAddress` condition
operators. Using other operators (e.g., `StringNotEquals`, `ArnEquals`) will
produce an unsupported-feature diagnostic. If no applicable statements remain,
the result will be `INDETERMINATE` with exit code `3`.

---

## Fixtures & Golden Output

ICAN includes 6 synthetic fixture cases under `test-fixtures/cases/`:

| Case | Purpose |
|---|---|
| `allow-basic` | Verify single Allow → ALLOW, exit code 0 |
| `explicit-deny-basic` | Verify Deny overrides Allow → EXPLICIT_DENY, exit code 1 |
| `implicit-deny-basic` | Verify no matching Allow → IMPLICIT_DENY, exit code 4 |
| `indeterminate-unsupported-condition` | Verify unsupported operator → exit code 3 |
| `invalid-policy-json` | Verify malformed JSON → exit code 2 |
| `multi-policy-precedence` | Verify cross-policy Deny wins → exit code 1 |

Each case has a `metadata.json` describing the expected result, a `request.json`
with the evaluation request, and policy files under `policies/`. The
`expected/` directory contains golden output files (JSON, text, exit code)
generated during S01 and verified to be stable and free of absolute paths.

These fixtures and golden outputs serve as the acceptance baseline — if you
modify ICAN, the golden-output comparison tests will catch regressions.

---

## Important Boundaries

- **No real-world IAM samples** — all policies, ARNs, and account IDs in
  fixtures and examples are synthetic placeholders
- **Not a full AWS IAM simulator** — ICAN currently supports a focused subset
  of IAM semantics
- **S01 phase is complete** — subsequent phases are not yet started and await
  separate planning and approval

---

## See Also

- [README](../README.md) — project overview and quick start
- `test-fixtures/cases/` — fixture cases and expected outputs
- `テストを実行` — `npm run test -- --run`
