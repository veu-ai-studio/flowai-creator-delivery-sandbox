# Milestone 0 BuildExecutionWorker Credential Preflight

Date: 2026-06-23T00:08:47-04:00
Branch: feature/build-execution-worker-m0
Base: origin/main 61d31e29ec338d1ac1fbd4b6b38f6a3bf5b02332
Prepared by: CTO
Adjudicator: W04

## Verdict

BLOCK.

Milestone 0 implementation did not proceed.

W04 required credential pre-flight before BuildExecutionWorker implementation. The pre-flight found that GitHub repository mutation and Vercel authority are present, but GitHub Actions workflow execution/write authority is not verified and appears absent for the available operator credential path.

This blocks the named GitHub Actions execution substrate.

## Required Authorities

| Authority | Result | Evidence |
| --- | --- | --- |
| GitHub repository mutation authority | PASS | GitHub API `/repos/victor2081new-cloud/flowai` returned 200 with `permissions.push=true` and `permissions.admin=true` for the Doppler-provided GitHub credential. |
| GitHub workflow execution authority | BLOCK | GitHub API `/repos/victor2081new-cloud/flowai/actions/workflows` returned 403 for the Doppler-provided GitHub credential. |
| GitHub workflow write authority | BLOCK | OAuth scope header did not include `workflow`; workflow list call returned 403. |
| Deployment authority | PASS | Vercel API `/v2/user` returned 200 for the Doppler-provided Vercel credential. |
| Vercel operator authority | PASS | Vercel API `/v9/projects?teamId=<configured-team>&limit=1` returned 200. |

## Secret Presence Checks

Doppler project/config checked: `flowai / prd`.

No secret values were printed or recorded.

| Secret | Presence |
| --- | --- |
| `GITHUB_OPERATOR_TOKEN` | MISSING |
| `GITHUB_PAT` | PRESENT |
| `GITHUB_TOKEN` | MISSING |
| `GITHUB_APP_ID` | PRESENT |
| `GITHUB_APP_INSTALLATION_ID` | PRESENT |
| `GITHUB_APP_PRIVATE_KEY` | PRESENT |
| `VERCEL_OPERATOR_TOKEN` | MISSING |
| `VERCEL_TOKEN` | PRESENT |
| `VERCEL_ORG_ID` | PRESENT |
| `VERCEL_TEAM_ID` | MISSING |

## API Preflight Evidence

No secret values were printed or recorded.

```text
github_user_status=200
github_oauth_scopes=(none-or-fine-grained)
github_repo_status=200
github_repo_push=true
github_repo_admin=true
github_workflows_list_status=403
github_workflow_scope_present=false
vercel_user_status=200
vercel_team_or_org_present=true
vercel_projects_status=200
```

## GitHub App Manifest Cross-Check

The checked-in GitHub App manifest at `.github/flowai-app-manifest.yml` confirms the current FlowAI GitHub App is not intended to carry workflow or administration authority:

```text
default_permissions:
  contents: write
  pull_requests: write
  metadata: read
note:
  ... no `workflows: write`,
  no `actions: write`, no `administration: *`,
  no `secrets: *`.
```

That app can support branch/file writes and pull requests. It cannot satisfy W04's required machine-triggered GitHub Actions substrate by itself.

## Local Tooling Note

`gh` is not installed in this environment, so GitHub Actions authority could not be checked through GitHub CLI. The REST API check above is the controlling evidence.

## Why This Blocks Milestone 0

W04's Milestone 0 condition requires:

```text
FlowAI
Dispatch
Runner
Result
```

The selected compute substrate in the amended plan is a GitHub Actions hosted runner. To satisfy the bar, FlowAI must programmatically trigger the workflow by `workflow_dispatch`, `repository_dispatch`, or an equivalent machine-triggered path.

The available Doppler GitHub credential can mutate the repository, but the workflow API returned 403 and no workflow scope was present. Building a worker now would create an implementation that cannot complete the required:

```text
checkout
mutate
commit
deploy
evidence
```

chain through the named substrate.

## Required Unblock

Provide one of the following, then rerun preflight before implementation:

1. A GitHub operator token in Doppler with repository write authority plus workflow execution/write authority for `victor2081new-cloud/flowai`.
2. A GitHub App installation with explicit workflow/actions authority sufficient to dispatch the BuildExecutionWorker workflow and write the workflow file.
3. A different explicitly named compute substrate with equivalent programmatic dispatch, workspace mutation, commit, deploy, and evidence authority.

Until one of those is verified from origin-compatible evidence, Milestone 0 remains BLOCKED and no BuildExecutionWorker implementation should proceed.

## Claim Movement

No capability claim moves.

The following adjudications remain unchanged:

- `AUDITOR_RUNTIME_ACTIVE`
- `UPGRADER_AUTONOMOUS_DISPROVEN`
- `TOOL_DISPATCH_BUILD_PRODUCTION_AUTO_NOT_PROVEN`
- `BUILD_WIRE_CANDIDATE_LEVEL_ONLY`

## Final Status

BLOCK: credential authority gap at GitHub Actions workflow execution/write.

This is a valid Milestone 0 preflight result under W04's stated acceptance rules.
