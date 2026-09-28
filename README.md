<div align="center">

# System One Decision Lab

**A playground for evaluating System One decision models on real evidence.**

Engines sit behind one contract. Each domain that asks them questions is its own package.
The lab exists to compare engines on the same evidence — not to promote one.

`TypeSafe Jev` · hosted &nbsp;•&nbsp; `Laya` · self-hosted, Apache-2.0 &nbsp;•&nbsp; `PostgreSQL` &nbsp;•&nbsp; `Drizzle` &nbsp;•&nbsp; `Playwright`

</div>

![How the lab is put together: any domain brings its own evidence and becomes a use-case package; every use case asks the same System One contract, so the engine answering is configuration rather than a second integration; each answer passes a provider-specific confidence gate and lands in one shared decisions table that records which engine answered.](diagrams/lab-overview.svg)

---

## What this is for

Bring evidence from your own domain — a failed end-to-end test, a merge request, a log line — and get a **bounded, gated decision** about it from a System One engine, stored so that a second engine can answer the same question later and the two can be compared honestly.

Three properties are the point:

**Engines are swappable.** `DECISION_PROVIDER=laya` and `DECISION_PROVIDER=jev` speak the same `POST /v1/systemone` protocol, so selecting one is configuration rather than a second integration.

**Answers are gated, not trusted.** Engines do not share a confidence scale, so each declares how it should be routed to `auto_file` / `flag_for_review` / `escalate_to_human`.

**Evidence outlives the answer.** Every decision records which engine produced it, on which scale it was gated, and what it was about — so the same history can be re-asked and re-scored.

> **This is not a monitoring or dashboard product.** PostgreSQL retains evidence so decision experiments are repeatable; a use case's report exists to explain those decisions to a human.

> **Status: experimental.** Accuracy notes in the provider READMEs are out-of-the-box observations from models **not trained on this lab's data**, on a small hand-labelled sample; they are a reason to measure, not a benchmark.

---

## Quick start

Prerequisites: Docker Desktop, Node 22+, Yarn (the Berry release is vendored in `.yarn/releases`).

```bash
cp .env.example .env
yarn install
yarn bootstrap             # local infrastructure, then topological migrations
yarn lab setup             # Playwright prerequisites and application migrations
yarn lab e2e               # persists decisions and rebuilds its report
```

The Playwright use case ships pointed at a public practice site with published test credentials, so `yarn lab e2e` works without any account of your own; point `BASE_URL` at your application to collect real evidence. Model-backed triage is off until `DECISION_TRIAGE_ENABLED=true`.

`./start` owns Docker. `yarn` owns the use cases. Nothing is rebuilt per command, and a headed browser is a real browser.

| Scope | Command |
|---|---|
| Infrastructure only | `./start` · `--stop` · `--clean` · `--status` · `--logs` · `--without-engines` |
| Root composition | `yarn bootstrap` · `yarn db:migrate` · `yarn clean` · `yarn check` |
| Create a use case | `yarn create:usecase <name>` |
| Playwright use case | `yarn lab <script>` — `setup`, `seed`, `e2e`, `report`, `experiment:*` |
| One package | `yarn workspace @sysone/<name> <script>` |

`yarn lab` aliases `yarn workspace @sysone/playwright-decisions`. Each use case adds its own alias. Full lifecycle semantics live in the [orchestrator README](packages/infra/orchestrator/README.md).

---

## Adopting the lab

Pick the path that matches what you are here to do. Each ends in one package.

<details open>
<summary><b>I want to use it on my own domain</b> — the common case</summary>

You are adding a **use case**: a package that owns its evidence and its questions, and borrows the contract and the decisions table from infra.

1. Run `yarn create:usecase <name>` — this creates the package skeleton and no infrastructure registration.
2. Read [`packages/usecases/README.md`](packages/usecases/README.md) — the anatomy and ownership rules.
3. Read [`packages/infra/decision-core/README.md`](packages/infra/decision-core/README.md) — contracts and provider composition.
4. Follow [`packages/usecases/playwright-decisions`](packages/usecases/playwright-decisions/README.md), the reference implementation.

You will write: a schema for your evidence, a taxonomy of questions in your own vocabulary, a deterministic baseline to measure the engine against, and your own commands. You will not write: HTTP calls, provider selection, retry logic, egress checks, or a decisions table.

</details>

<details>
<summary><b>I want to add or tune a decision engine</b></summary>

Provider adapters live in **`packages/providers/<id>`** and depend on generic `@sysone/decision-core`. Each executable use case imports the concrete definitions it supports, constructs its registry, and chooses its default in a composition module. Persistence and generic orchestration do not change.

Start at [`packages/infra/decision-core/README.md`](packages/infra/decision-core/README.md) → *Adding a new engine*.

If your change needs edits outside that package, the contract is missing something — extend it rather than reaching around it.

</details>

<details>
<summary><b>I want to change how decisions are stored or configured</b></summary>

**`packages/infra/decision-store`** owns persistence only: the shared `decisions` table, explicit PostgreSQL adapter, write API, and migrations. `@sysone/config` owns root environment loading.

Start at [`packages/infra/decision-store/README.md`](packages/infra/decision-store/README.md).

</details>

<details>
<summary><b>I want to change containers, engines or lifecycle</b></summary>

**`packages/infra/orchestrator`** is a generic Docker lifecycle runner. The root `compose.yml` chooses PostgreSQL and concrete local engines; the orchestrator contains no provider names, application commands, migrations, or artifact paths.

Start at [`packages/infra/orchestrator/README.md`](packages/infra/orchestrator/README.md).

</details>

<details>
<summary><b>I just want to see it work, with no live target</b></summary>

```bash
./start
yarn lab seed            # 40 temporary runs, 480 executions, decision fixtures for every visualization
yarn lab report          # rebuild the report and print a file:// link
yarn clean                 # remove fixtures and workspace-generated artifacts
```

Seeded decisions use the model name `synthetic-local-validator` and rotate through every registered provider, so no row claims a real engine answered and each badge path still renders.

</details>

---

## Repository layout

```text
compose.yml                       root composition chooses concrete containers
packages/
├── infra/                        reusable; never imports a use case
│   ├── config/                   root environment loading
│   ├── decision-core/            contracts, generic registry, gate, transport
│   ├── decision-store/           persistence only
│   └── orchestrator/             generic Docker lifecycle
├── providers/
│   ├── jev/                       hosted provider adapter
│   └── laya/                      provider adapter + local runtime image
└── usecases/
    └── playwright-decisions/     application composition + domain evidence

tools/
├── create-usecase.mjs            contributor front door
└── architecture.test.mjs         boundary enforcement
```

**One rule holds the design together: a use case may depend on infra, and infra may never depend on a use case.**

<details>
<summary><b>What that rule buys, and what it costs</b></summary>

A decision points at its subject polymorphically — `subject_type` (`playwright:test_case`), an opaque `subject_id`, a `subject_label`, and `subject_keys` — instead of with a foreign key to a Playwright table. So a new use case stores decisions about a merge request or a log line without inheriting anyone else's schema.

The cost, stated plainly: PostgreSQL can no longer cascade-delete a decision when its subject disappears, nor verify that `subject_id` exists. A use case wanting referential integrity may add its own link table, because a use case is allowed to depend on infra.

Each package also owns its own migrations folder **and journal table**. Sharing one journal would make each package treat the other's `0000_*.sql` as already applied, and the second would silently never run.

</details>

### Where the documentation lives

The tree above is the map. Documentation follows it in one direction, so each level explains its own boundary and defers the rest: this page covers the lab, [`packages/infra`](packages/infra/README.md) covers the reusable side and its dependency rule, and [`packages/usecases`](packages/usecases/README.md) covers the application side and how to add one. Follow either into the package you actually need.

Two entry points are worth naming directly, because most work starts in one of them: [`decision-core`](packages/infra/decision-core/README.md) for the contract you integrate against, and [`playwright-decisions`](packages/usecases/playwright-decisions/README.md) for the reference implementation end to end.

Not every directory has a README, by design — `packages/infra/config` and the `src/*` subdirectories are documented by their parent. `.kiro/steering/development.md` holds the test for when a new one is justified.

Planned: `@sysone/decision-eval` — accuracy, calibration and paired comparison over accumulated decisions. Specified in [`.kiro/specs/decision-eval`](.kiro/specs/decision-eval/requirements.md), not built.

---

## Configuration

One `.env` remains at the repository root for contributor convenience. `@sysone/config` resolves and parses it; persistence receives an explicit connection string and never reads configuration files.

**Precedence is "the shell wins"**, so a one-off override works:

```bash
DECISION_PROVIDER=jev yarn lab experiment:choice
DATABASE_URL=postgresql://…:5434/decision_lab yarn lab report
```

The one exception is `BASE_URL`, `SITE_USERNAME` and `SITE_PASSWORD`, which the Playwright use case forces from the file via `loadLabEnv({ overrideKeys })` so a stale shell export cannot point a suite at the wrong environment. That choice belongs to the use case, not to the loader — see [`tests/support/site.ts`](packages/usecases/playwright-decisions/tests/support/site.ts).

Two checkouts on one machine need their own project name and port, or the second shares the first one's database:

```bash
COMPOSE_PROJECT_NAME=sysone-lab-spike POSTGRES_PORT=5434 \
  DATABASE_URL=postgresql://decisionlab:decisionlab@localhost:5434/decision_lab ./start
```

Never commit `.env`, credentials, authentication state, generated reports, or test artifacts.

---

## Data egress

Consent is derived from the **resolved endpoint**, never from the engine's name. An endpoint on loopback, a private range, or a Compose service name sends nothing off the host and needs no consent. Any remote endpoint is refused until `ALLOW_DECISION_DATA_EGRESS=true`, and pointing a self-hosted engine at a hosted deployment is refused too.

Never enable egress if your evidence can contain secrets or personal data. Never log API keys or site credentials.

---

## Contributing

Which package your change belongs in is decided in one place: the "Where your change goes" table in [`.kiro/steering/development.md`](.kiro/steering/development.md). It is the table a change is reviewed against, so it is not repeated here. The short version: engines in `packages/providers/<id>`, storage in `packages/infra/decision-store`, containers in `packages/infra/orchestrator` and root `compose.yml`, domains in `packages/usecases/*`.

**One rule survives every case: if a use-case change appears to require an infra change, extend the contract and say so rather than reaching around it. If an infra change appears to require naming a use case, the abstraction is wrong.**

<details>
<summary><b>Validation before you present a change</b></summary>

```bash
yarn check         # typecheck, lint, unit tests — every package
yarn db:generate   # must report no drift, in every package
yarn npm audit
```

A report change must also be rendered in Chromium and inspected in light, dark, Current and Historical states; structural tests alone are not sufficient for animation and layout work.

Diagrams are held to the same bar. Every diagram lives in `diagrams/` and each README references the one that explains its own idea. Open it in **both colour schemes** and **with reduced motion forced** before committing: motion is a guided reading order there, so every label must already be in its final position and readable with animation off.

</details>

`.kiro/steering/` holds the rules a change is reviewed against: product framing, architecture invariants, and workflow. Read `development.md` before your first contribution — it names which package your change belongs in.

---

## License

[Apache-2.0](LICENSE). This project is independent and is not affiliated with, endorsed by, or sponsored by TypeSafe AI (Jev) or the Laya maintainers; see [`NOTICE`](NOTICE).
