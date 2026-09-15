# INC-728 GitHub Gate

This repository is a live proof harness for the bounded-autonomy / objective-scoped authority prototype.

## What this proves

A GitHub Actions job targets the `production` environment. Once a custom deployment protection rule is attached, GitHub should pause the job before execution and wait for an external authority decision.

The intended sequence is:

1. Trigger `INC-728 Protected Checkout Deployment` manually.
2. `prepare` completes.
3. `deploy` targets the `production` environment and is held by the custom protection rule.
4. The INC-728 authority service receives GitHub's deployment-protection webhook.
5. Authority returns approve / reject / wait-for-step-up.
6. Only after approval does the simulated rollback job execute.
7. The successful rollback is committed to shared `INC-728` authority state.
8. A separately authenticated second control root can then be evaluated against the same mandate state.

## Repository status

- Public repository: suitable for GitHub custom deployment protection rule testing without GitHub Enterprise.
- Workflow: `.github/workflows/inc728-deploy.yml`
- Environment expected: `production`
- No real production infrastructure is modified.
- P1 live GitHub protection flow passed.
- P2 Render agent harness added for cross-control-plane testing.
- P2 live cross-control-plane verification triggered after baseline ALLOW on 2026-09-15.

This repository is intentionally disposable and contains no secrets.
