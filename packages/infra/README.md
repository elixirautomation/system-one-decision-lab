# Reusable platform packages

These packages are shared by every use case. None imports an application.

![Reusable packages receive dependencies from use cases and never point back. Configuration loading is separate from persistence, and the orchestrator operates only the root Compose model.](../../diagrams/infra-map.svg)

| Package | Owns | Depends on |
|---|---|---|
| `config` | root `.env` discovery, shell-over-file precedence, and shared configuration resolution | nothing internal |
| [`decision-core`](decision-core/README.md) | contracts, generic registry mechanics, gate, transport | nothing internal |
| [`decision-store`](decision-store/README.md) | PostgreSQL schema, explicit adapter, writes, migrations | core types + config at CLI composition boundaries |
| [`orchestrator`](orchestrator/README.md) | generic Docker lifecycle over root Compose | nothing internal |

`config` has no README of its own: it is three functions — `findRepoRoot`, `loadLabEnv`, `databaseUrl` — and the contract a caller needs is precedence, which the [root README](../../README.md#configuration) already owns. `loadLabEnv({ overrideKeys })` is the one escape hatch: a caller names the keys for which the file must beat an ambient shell export.

Concrete adapters live in `packages/providers/*` and depend on `@sysone/decision-core`. Each documents its own endpoint, credentials, capabilities and gate — [`jev`](../providers/jev/README.md), [`laya`](../providers/laya/README.md), [`kev`](../providers/kev/README.md). Applications depend on the adapters they intentionally compose; core never imports them.

## Boundary rules

- Applications compose concrete provider definitions and choose their own default.
- Persistence receives a connection string and explicit provider identity.
- Configuration loading never lives in persistence.
- The orchestrator never runs migrations, creates application directories, deletes application artifacts, or prints application commands.
- Cross-workspace imports use `@sysone/*` exports.
- Root commands may compose workspaces; reusable packages may not reach back into them.

These rules are enforced by `/tools/architecture.test.mjs` and run through `yarn test`.
