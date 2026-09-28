---
inclusion: always
---

# Architecture

## The package map, and the one rule

```text
compose.yml                         root composition of concrete containers
packages/infra/config               @sysone/config             environment loading
packages/infra/decision-core        @sysone/decision-core      contracts, registry, gate, transport
packages/infra/decision-store       @sysone/decision-store     persistence only
packages/infra/orchestrator         @sysone/orchestrator       generic Docker lifecycle
packages/providers/<id>             @sysone/provider-<id>      concrete provider adapter/runtime
packages/usecases/<name>            @sysone/<name>             application/domain composition
tools/create-usecase.mjs                                        contributor front door
```

Being a package is not a reason to have a README. A README exists where a **documentation boundary** exists — where a reader needs information that no other document owns. `development.md` holds the test to apply before creating one, and the conventions a README follows once it exists. The root README covers the lab and how to adopt it, and nothing a package owns.

**A use case depends on infra. Infra never depends on a use case.** There is no exception, and it is enforceable by reading imports: nothing under `packages/infra/` may name a use case, a Playwright type, or a test-shaped concept.

Consequences that are load-bearing rather than incidental:

- **A decision references its subject polymorphically.** `decisions.subject_type` (`playwright:test_case`), `subject_id` (opaque), `subject_label`, and `subject_keys` (the identity dimensions that use case aggregates by). The old `decisions.test_case_id` foreign key pointed infra at a use case, which would have forced a second use case to inherit Playwright's tables. The database therefore cannot cascade-delete or verify the reference; that is the accepted price. A use case wanting integrity may add its own link table, because it is allowed to depend on infra.
- **Each package owns its own tables, migrations folder, AND journal table.** `__drizzle_migrations_decision_store` and `__drizzle_migrations_playwright`. Without separate journals two packages each generating `0000_*.sql` would each believe the other's migration had run. Infra's migrations go first, because they create `decisions`.
- **Only `@sysone/decision-store` writes to `decisions`,** through `recordDecision` / `recordDecisions`. A use case never hand-writes those columns, so the column set can change without editing every use case.
- **Configuration loading is separate from persistence.** `@sysone/config` resolves the root `.env`; applications and migration CLIs pass `databaseUrl()` into `createDatabase(connectionString)`. The store never reads files or infers a connection.
- **Provider identity is explicit.** `decisions.provider` is non-null with no database default and no closed catalog constraint. Runtime composition validates installed providers; persistence retains historical ids.

## The provider contract is the extension point

`@sysone/decision-core` defines `DecisionProviderDefinition`, generic registry mechanics, resolution, gating, and transport. Concrete definitions live in `packages/providers/*`; core imports none of them, creates no global registry, and chooses no default. Each executable use case constructs the registry of providers it supports and selects its default in a composition module. Adding a provider must not require a persistence or orchestrator code change.

Rules that keep it that way:

- **No `switch` or `if` on a provider id outside application composition.** Provider behavior belongs in `packages/providers/<id>` as capabilities, requirements, and gate defaults.
- **Requirements are data, not code.** `envKeys[].requirement` is `required`, `optional`, or `required-when-remote`. Jev's API key is `required`; Laya's is `required-when-remote`, so a local server needs none and a hosted one is refused anonymously. Never special-case a key in the resolver.
- **A definition is pure.** `resolveEndpoint` / `resolveModel` / `resolveApiKey` are functions of the environment only. `decision-core` has no database and no filesystem dependency; keep it that way.
- **Registries are composition-local.** Duplicate ids or aliases fail fast. Reports and seeds receive the same application-owned registry rather than importing a reusable global. Persistence stores provider ids as open historical provenance.

## Module responsibilities

`decision-core` is split by responsibility, one reason to change each:

| File | Owns |
|---|---|
| `protocol.ts` | The `POST /v1/systemone` wire shapes, and nothing else |
| `contract.ts` | The provider contract and resolved-config types |
| `registry.ts` | Empty generic registry; name/alias lookup and duplicate rejection |
| `resolve.ts` | Generic resolution + enforcement of declared requirements |
| `endpoint-scope.ts` | local vs remote classification |
| `egress.ts` | Consent derivation and its error |
| `gate.ts` | act/review/escalate policy and threshold parsing |
| `retry-policy.ts` | Backoff, behind an injectable interface |
| `system-one-client.ts` | Transport only |

There must be exactly one client: engines share a wire protocol, so a second implementation would be duplication. The client takes its retry policy, `fetch`, clock, and resolved provider by injection.

`decision-store` is narrow: `schema.ts` (the table), `record.ts` (the only write path), `client.ts` (an explicit connection-string adapter), and `migrate.ts` (migration mechanics). `@sysone/config` owns root discovery, dotenv parsing, precedence, and shared URL resolution.

A use case is split the same way. In `@sysone/playwright-decisions`: `reporter/result-capture.ts` translates Playwright objects, `reporter/triage-runner.ts` orchestrates asking the engine, `reporter/run-environment.ts` reads env with defaults, `reporter/run-identity.ts` owns the run id and its output directory, `reporter/run-artifacts.ts` writes files, `reporter/report-refresh.ts` rebuilds the report, `db/decision-subject.ts` is the single place a subject is described, and `reporter/decision-reporter.ts` only orchestrates. The reporter class must contain no path literals, no capture logic, and no engine knowledge.

## Stack and data

- **Infrastructure and applications remain separate.** `./start` delegates to the generic orchestrator and operates containers only. It runs no migrations and touches no application paths. Root `yarn bootstrap`, `yarn db:migrate`, and `yarn clean` compose workspaces; application commands remain package-local.
- Root `compose.yml` chooses PostgreSQL and concrete local engines. Provider-specific definitions and Dockerfiles live under `packages/providers/*`; the orchestrator discovers profile-gated services and contains no provider names, ports, volume names, or environment keys. There is no application container.
- `COMPOSE_PROJECT_NAME` is overridable so two checkouts can run side by side with their own volumes instead of silently sharing one database.
- Yarn Berry is pinned through `packageManager` plus the committed release in `.yarn/releases`, with `nodeLinker: node-modules` because Playwright and drizzle-kit resolve binaries from a real tree. Workspace packages are consumed as TypeScript sources through their `exports` field — there is no build step, and adding one would put a compile in front of every command. `.yarnrc.yml` must never carry a private registry override or auth token.
- The orchestrator's banner and log style is fixed (boxed header, timestamped `✔ / ▸ / ⚙ / ●` lines, a closing panel naming the next commands). Keep that vocabulary.
- **Provider selection must not decide what is started.** `--start` brings the full stack up, including every locally served engine, so `DECISION_PROVIDER` is a per-call choice. `--without-engines` (or `SKIP_LOCAL_ENGINES=true`) is the escape hatch for a first run that only needs a hosted provider.
- **Every discovered profile is enabled for the whole session,** so `ps`, `logs`, `down`, and `--clean` keep those services in scope and a lifecycle command run under a different provider cannot orphan an engine container.
- Lifecycle: default/`--start` starts and health-checks infrastructure; `--stop` preserves volumes; `--clean` removes only volumes listed in root Compose's `clean` retention group; `--purge-models` removes only `model-cache` volumes; `--status` reports services. Application artifacts are owned by workspace `clean` scripts.
- Every decision row carries a `provider` column, so a database may legitimately hold answers from several engines and remain comparable. `routing_signal` and `routing_value` are columns, not buried in `result`, because engines do not share a confidence scale and a later comparison must not guess which scale produced an action.
- Logical identity for the Playwright use case is `projectId + suiteName + effectiveProjectConfiguration + testName`, written into `subject_keys`.

## A use case's report

Rules below are written for `@sysone/playwright-decisions` and apply to any use case that ships a report.

- The report reads all rows and renders everything currently in PostgreSQL; there is no report-side dataset selection.
- `report-output/index.html` **inside the use-case package** is that use case's only dashboard. Playwright's own HTML reporter and the JSON reporter are deliberately not configured: this is a decision lab, not a test-automation product. It embeds its CSS, JavaScript, SVG icons, and downloadable JSON snapshot, and must remain fully functional offline.
- Playwright keeps failure **evidence** only — trace and screenshot on failure, no video — reached with `npx playwright show-trace`. The report must never link to a Playwright HTML report; a unit test enforces this.
- **Each run owns its output directory.** `outputDir` is `test-results/run-<runId>/`, resolved by `reporter/run-identity.ts`, and the run id is shared by the directory, the manifest, the triage payload, and the `test_runs` row. Playwright clears `outputDir` on start, so a shared directory lets a second run delete the first one's `.playwright-artifacts-*` mid-flight: tests whose bodies passed then fail at `browserContext.close` with a missing `.network` file, and the lab ingests and triages those fabricated failures as real evidence. Never make artifact paths run-independent, and never serialise runs to work around it. The id is generated once and published through the environment because Playwright re-evaluates the config in every worker.
- **Refreshing the report is part of finishing a run.** The reporter calls `reporter/report-refresh.ts`, which delegates to `report/write-report.ts` — the same writer the `report` script uses, so the automatic and manual paths cannot drift. It prints an absolute `file://` URL. A render failure is reported and swallowed: failing to render a view over persisted evidence must never change the tests' verdict.
- **A run has exactly two behaviour switches,** both read in `reporter/run-environment.ts`: `DECISION_TRIAGE_ENABLED` (default off) and `INGEST_REQUIRED` (default on). When triage is enabled it is **required**: an engine that is down, misconfigured, or refused yields `triageStatus` `failed` (none answered) or `partial` (some answered), the cause is printed with engine and endpoint, and the run fails — after the evidence is persisted, never instead of it. `disabled` means only that the switch was off. Everything else is fixed rather than configurable: every Playwright project, `setup` included, is persisted, and the report is always refreshed. Do not reintroduce opt-outs for those.
- Boolean environment knobs are parsed by `envBoolean`, which accepts the usual spellings (`true/1/yes/on/enabled`) and **warns** on anything unrecognised. A strict `=== 'true'` comparison once disabled triage for an entire run while `.env` plainly read `enabled`.
- Derived summaries, KPI proportions, severity colours, and current root-cause tallies are calculated from the rendered DOM. Only historical trend coordinates are precomputed.
- Product-level naming is provider-neutral: the title, `h1`, CSS classes (`decision-mark`, `decision-metric`, `decision-surface`), the theme storage key, and the download filename must never name an engine.
- Every model-backed value must carry the explicit SVG icon plus a marker naming the engine that produced it, taken from that row's `provider`. Non-model deterministic calculations must not carry the marker at all.
- The confidence gate is provider-specific and lives in the resolved provider config. A provider declaring `calibratedChoiceConfidence: false` is gated on the winning option's probability mass. Never copy one engine's thresholds onto another.
- `ground-truth/flakiness.ts` is the fixed reference formula experiments are scored against. Do not alter it casually.
