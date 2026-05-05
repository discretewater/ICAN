# ICAN — Local-first IAM Policy Evaluation MVP

ICAN is a local-first, test-driven IAM policy evaluation engine.
It takes IAM policy documents and access requests, evaluates them through
a statement-by-statement matching pipeline, and returns structured
allow/deny decisions with human-readable output and reproducible results.

> **Status:** ICAN S01 (Phase 1) is complete. This is a **core MVP** — it works
> end-to-end as a CLI tool, but it is **not a full AWS IAM simulator**.

---

## What S01 Can Do

- Parse IAM policy documents (JSON, `Version 2012-10-17`)
- Evaluate `Allow` and `Deny` statements with Action, Resource, and Condition matching
- Support `StringEquals`, `StringLike`, `Bool`, and `IpAddress` condition operators
- Produce path traces that explain which statements were evaluated
- Output results as structured **JSON** or human-readable **text**
- Map results to standard exit codes:
  - `0` — allowed
  - `1` — explicitly denied
  - `2` — input or validation error
  - `3` — unsupported feature or indeterminate result
  - `4` — implicitly denied (no applicable Allow)
  - `10` — internal error
- [Usage Guide](docs/usage.md) — full CLI walkthrough
- [Examples & Fixtures](docs/examples.md) — fixture cases and golden outputs

The `package.json` `bin` field registers `ican` as the CLI name. Before
packaging or linking, the examples below use `node dist/cli/ican.js check`
directly.

## What S01 Does Not Do

- It does **not** evaluate full AWS IAM semantics
- It does **not** support `NotAction`, `NotResource`, `ForAllValues`, `ForAnyValue`
- It does **not** validate actual cloud resources
- It does **not** include any real-world IAM policy samples
- It is **not** a production-grade IAM auditing tool
- Subsequent phases (not yet started) may extend these capabilities

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (tested with Node 20+)
- npm (included with Node.js)

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
npm run typecheck   # TypeScript type checking
npm run test -- --run   # All tests
npm run build       # Compile to dist/
```

All tests pass (1090 test cases, 29 test files as of S01 completion).

### Run `ican check`

```bash
# Build first if you haven't:
npm run build

# Show help:
node dist/cli/ican.js check --help

# Basic allow evaluation — write a policy JSON file:
cat > /tmp/example-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::example-bucket/*"]
  }]
}
EOF

# Run the check:
node dist/cli/ican.js check \
  --policy /tmp/example-policy.json \
  --action s3:GetObject \
  --resource arn:aws:s3:::example-bucket/photo.jpg

# JSON output:
node dist/cli/ican.js check --format json \
  --policy /tmp/example-policy.json \
  --action s3:GetObject \
  --resource arn:aws:s3:::example-bucket/photo.jpg
```

---

## Fixtures & Golden Output

ICAN uses a **fixtures-driven testing** approach:

- **Actual fixtures** (`test-fixtures/cases/`): 6 synthetic cases covering
  allow, explicit deny, implicit deny, unsupported conditions, invalid
  input, and multi-policy precedence.
- **Golden output** (`expected/`): 18 pre-generated expected output files
  (JSON, text, exit code) that act as a stable acceptance baseline.
- **No real-world IAM samples** are included — all fixtures are hand-crafted
  and synthetic.

Golden output files do not contain any absolute paths (such as `/home/`
or `/tmp/`) and are portable across environments.

---

## Project Boundaries

- **No real-world IAM policy samples, real AWS account IDs, or organization-specific ARNs**
- All ARNs in examples and fixtures are synthetic placeholders
- All fixtures are synthetic and minimal
- The purpose of this project is engineering demonstration and
  skill verification, not a production IAM service
- Future phases are not yet planned or approved

---

## License

See [LICENSE](./LICENSE). This is a private project in its initial phase.

---

## What's Next?

ICAN S01 is complete. The project is currently in **release candidate
preparation** phase (RC01). The next steps — README refinement, usage
manual, example documentation, release checklist, and security boundary
review — will be carried out under the RC01 topic before any decision
is made on subsequent phases.
