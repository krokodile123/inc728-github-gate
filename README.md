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
8. A separately authenticated DB agent requesting failover should then receive `STEP_UP` because the rollback changed objective-level incident history.

## Repository status

- Public repository: suitable for GitHub custom deployment protection rule testing without GitHub Enterprise.
- Workflow: `.github/workflows/inc728-deploy.yml`
- Environment expected: `production`
- No real production infrastructure is modified.
- Live verification rerun triggered after Replit private-key handling fix on 2026-09-15.
- Second verification rerun triggered after GitHub callback schema fix on 2026-09-15.
- Final clean verification rerun triggered after 204-success bookkeeping fix on 2026-09-15.

## Remaining live setup

The repository-side workflow is ready. The remaining work is account/app configuration:

- expose the INC-728 authority service on a public HTTPS endpoint;
- create/configure the GitHub App with the deployment protection rule webhook and required permissions;
- install the App on this repository;
- create the `production` environment if GitHub has not created it automatically;
- attach the custom deployment protection rule to `production`;
- trigger the workflow and verify GitHub physically waits for the external authority decision.

This repository is intentionally disposable and contains no secrets.
