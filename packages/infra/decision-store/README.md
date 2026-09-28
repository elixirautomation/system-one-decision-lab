# @sysone/decision-store

**Persistence only.** Owns the shared `decisions` table, its write API, PostgreSQL adapter, and migration runner. Repository environment loading belongs to `@sysone/config`; callers pass the resolved connection string explicitly.

![A generic decision row uses a namespaced subject rather than a foreign key to any use case. Provider identity, model output and routing evidence are explicit columns.](../../../diagrams/decision-store-decision-row.svg)

## Connect explicitly

```ts
import { databaseUrl, loadLabEnv } from '@sysone/config';
import { createDatabase } from '@sysone/decision-store';

loadLabEnv();
const connection = createDatabase(databaseUrl());
```

The adapter neither reads `.env` nor chooses a default connection.

## Store a decision

Every write names its provider explicitly and goes through `recordDecision` or `recordDecisions`:

```ts
await recordDecision(transaction, {
  subject: { type: 'domain:item', id: item.id, label: item.name },
  dataOrigin: 'actual_run',
  decisionType: 'risk_classification',
  provider: outcome.provider,
  model: outcome.model,
  category: outcome.category,
  result: outcome.raw,
});
```

There is no database provider default and no closed provider check constraint. Runtime composition validates currently installed providers before calling the store, while historical provider identifiers remain valid evidence after adapters change.

## Subject boundary

`subject_type`, `subject_id`, `subject_label`, and `subject_keys` are deliberately polymorphic. The store does not import domain tables or types. A use case may add its own link table when it needs database-enforced referential integrity.

## Migrations

Each schema owner has its own migration folder and journal. Root `yarn db:migrate` runs workspace migrations topologically; an application setup command may apply shared migrations before its own for standalone use.

```bash
yarn workspace @sysone/decision-store check
yarn workspace @sysone/decision-store db:generate
yarn workspace @sysone/decision-store db:migrate
```
