# Use cases

One package per domain. A use case owns its evidence, bounded questions, deterministic baseline, composition roots, migrations, report, and generated artifacts. It imports reusable packages; reusable packages never import it.

![A use case owns domain evidence and questions while borrowing generic configuration, decision runtime and persistence contracts.](../../diagrams/usecases-anatomy.svg)

| Use case | Domain | Docs |
|---|---|---|
| [`playwright-decisions`](playwright-decisions/README.md) | decisions over live test failures and history | reference implementation |

## Create a use case

```bash
yarn create:usecase flaky-test
```

This creates:

```text
packages/usecases/flaky-test/
├── src/index.ts
├── tests/index.test.ts
├── package.json
└── tsconfig.json
```

The root workspace glob discovers it automatically. No orchestrator or reusable-package registration is required.

No `README.md` is generated, deliberately. This document already owns use-case anatomy and onboarding, so a scaffolded README would only repeat it. Add one to your package once it owns something this page does not — its own evidence model, commands, migrations, or configuration — and add a row to the table above when you do.

Then run:

```bash
yarn install
yarn workspace @sysone/flaky-test check
```

The generator validates lowercase kebab-case, refuses to overwrite a package, declares exact tool versions and workspace dependencies, and is tested without writing into the repository.

## What a use case owns

1. Its evidence schema and migration journal, when persistence is needed.
2. Its subject mapping and domain taxonomy.
3. Its deterministic baseline and labels.
4. Its report and generated artifacts.
5. Its `setup` and `clean` scripts.
6. Its composition roots: database configuration and installed provider definitions.

Use `@sysone/config` to load configuration, `@sysone/decision-core` for contracts/runtime, and `@sysone/decision-store` for persistence. Provider identity must be explicit on every write.

Root `yarn db:migrate` and `yarn clean` discover workspace scripts automatically. Adding an optional convenience alias to the root manifest is the only root-level composition change a use case may need.
