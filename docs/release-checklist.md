# ICAN Release Candidate Checklist — RC01-D04

This checklist provides a structured pre-release verification for ICAN S01.
It does NOT authorize pushing to Codeberg or creating a release tag —
those actions are executed by the project commander / user, not by the
development team. The development team only prepares release candidate
materials.

---

## Checklist Items

### 1. Build & Test Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run test -- --run` passes (1090+ tests)
- [ ] `npm run build` passes

### 2. CLI End-to-End

- [ ] `node dist/cli/ican.js check --help` works
- [ ] `node dist/cli/ican.js check` with synthetic policy produces expected output
- [ ] JSON output (`--format json`) is valid JSON
- [ ] Text output (`--format text`) is human-readable
- [ ] Exit codes match expected values (0/1/2/3/4/10)

### 3. Documentation Links

- [ ] README has working link to usage guide
- [ ] README has working link to examples guide
- [ ] usage guide internally consistent and runnable
- [ ] examples guide covers all 6 fixture cases

### 4. Fixtures & Golden Output

- [ ] 6 actual fixture case directories exist under `test-fixtures/cases/`
   - `allow-basic`
   - `explicit-deny-basic`
   - `implicit-deny-basic`
   - `multi-policy-precedence`
   - `indeterminate-unsupported-condition`
   - `invalid-policy-json`
- [ ] 18 golden output files exist (3 per case: expected.json, expected.txt, expected-exit-code.txt)
- [ ] Golden output files contain NO absolute paths (`/home/`, `/tmp/`, `/mnt/`, `/Users/`)
- [ ] Golden output files use `<WORKSHOP_ROOT>` placeholders where applicable

### 5. Safety & Sample Boundaries

- [ ] No real-world IAM policy samples in any document
- [ ] No real AWS account IDs in any document
- [ ] No organization-specific ARNs in any document
- [ ] All fixtures marked as `source: "synthetic"`
- [ ] README does not claim full AWS IAM simulator capability
- [ ] Documents do not exaggerate current capabilities

### 6. Package Metadata

- [ ] `package.json` has `name`, `version`, `description`
- [ ] `package.json` has `bin.ican` pointing to `dist/cli/ican.js`
- [ ] `package.json` has valid `scripts.typecheck`, `scripts.test`, `scripts.build`
- [ ] License file or license metadata exists
- [ ] Repository field or metadata is consistent

### 7. Repository Cleanliness

- [ ] `git status` shows clean working tree
- [ ] No uncommitted changes
- [ ] Main repository `ling` branch is up-to-date
- [ ] Workshop repository `main` branch is up-to-date

### 8. Codeberg Push Readiness — Commander-Only Execution

**Codeberg push is executed by the project commander / user. The development team must NOT push to Codeberg, must NOT create release tags, and only prepares release candidate materials. After the push is completed, the commander may notify the development team at their discretion.**

- [ ] All checklist items above pass
- [ ] No release tag has been created by the development team
- [ ] Codeberg has NOT been pushed to by the development team
- [ ] Project commander approval has NOT yet been obtained for push
- [ ] Development team understands: push is commander-executed, not team-executed
- [ ] RC01-D05 (security review) is NOT yet started
- [ ] RC01-D06 (release candidate final review) is NOT yet started
- [ ] S02 is NOT yet started

### 9. Boundary Confirmation

- [ ] No subsequent phase (S02) has been started
- [ ] No new fixtures have been added since RC01-D03
- [ ] No golden outputs have been modified or regenerated
- [ ] No `metadata.json` or `request.json` files have been modified
- [ ] No `expected.json`, `expected.txt`, or `expected-exit-code.txt` files have been modified
- [ ] `src/` core implementation has not been modified
- [ ] `tests/` have not been modified
- [ ] `test-fixtures/` have not been modified except for approved golden output generation
- [ ] `设计/`, `规范/`, `参考/` have not been modified by development team

### 9. NPM Distribution Readiness (Local Only)

- [ ] `package.json` name is `@wizardelf/ican`
- [ ] `package.json` version is suitable (e.g. `0.1.0`)
- [ ] `package.json` `bin` field exposes `ican`
- [ ] `package.json` `files` field restricts published content
- [ ] `package.json` `license` is `Apache-2.0`
- [ ] `npm run typecheck` passes
- [ ] `npm run test -- --run` passes
- [ ] `npm run build` passes
- [ ] `npm pack --dry-run` succeeds
- [ ] `npm pack` produces a tarball
- [ ] Local tarball install and CLI verification succeeds
- [ ] Bun local verification succeeds (or reason noted for absence)
- [ ] `npm publish` has NOT been executed
- [ ] No npm token has been created
- [ ] No release tag has been created
- [ ] Codeberg has NOT been pushed by the development team

### 10. Post-Publish Verification (Commander-Only)

- [ ] `npm view @wizardelf/ican version` returns `0.1.0`
- [ ] `npm view @wizardelf/ican` shows expected metadata
- [ ] Temporary directory `npm install @wizardelf/ican` succeeds
- [ ] `npx ican check --help` outputs usage/help
- [ ] Temporary `.npmrc` has been cleaned up
- [ ] `NPM_TOKEN` environment variable has been cleared
- [ ] Temporary Granular Access Token has been revoked
- [ ] No release tag has been created by the development team
- [ ] `npm publish` has NOT been executed by the development team
- [ ] No npm token has been created by the development team
- [ ] Codeberg has NOT been pushed by the development team
- [ ] S02 has NOT been started
