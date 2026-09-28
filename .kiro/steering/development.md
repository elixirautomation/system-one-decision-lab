---
inclusion: always
---

# Development workflow

## Where your change goes

Decide this before writing code; it is the question the monorepo exists to answer.

| You are... | Work in | You must not touch |
|---|---|---|
| changing environment loading | `packages/infra/config` | persistence or use-case behavior |
| integrating or tuning an engine | `packages/providers/<id>`; core only for contract changes | unrelated use cases or persistence |
| changing how decisions are stored | `packages/infra/decision-store` | configuration loading or domain tables |
| changing generic container lifecycle | `packages/infra/orchestrator` | provider names or application commands |
| changing concrete local containers | root `compose.yml` / `packages/providers/*` | generic orchestrator logic |
| strengthening a domain | that `packages/usecases/*` package | reusable packages unless a contract is missing |
| adding a new domain | `yarn create:usecase <name>` | existing applications and orchestrator |

If a use-case change seems to require an infra change, say so explicitly and extend the contract rather than reaching around it. If an infra change seems to require naming a use case, the abstraction is wrong.

## Commands

Three entry points, and they do not overlap:

```bash
./start                          # containers only
./start --clean                  # clean-labelled infrastructure data only
yarn bootstrap                  # start infrastructure, then migrate workspaces
yarn db:migrate                 # topological workspace migrations
yarn clean                      # workspace-owned cleanup fan-out
yarn create:usecase flaky-test  # contributor front door
yarn lab setup                  # Playwright prerequisites and migrations
yarn lab <script>               # Playwright application commands
yarn check                      # architecture, typecheck, lint, unit tests
```

Add a new use-case command as a script in that use-case package, never as an orchestrator flag and never at the root. The root holds only cross-cutting fan-out (`check`, `typecheck`, `test`, `lint`, `db:migrate`, `db:generate`) plus one alias per package.

Yarn Berry is pinned via `packageManager` and the committed `.yarn/releases` binary. Keep dependency versions exact and commit `yarn.lock`. Declare a dependency in the package that imports it, not at the root — the root carries only the toolchain. Never add a private registry or auth token to `.yarnrc.yml`.

## Design principles applied here

These are the rules a change is reviewed against, not general advice:

- **Single responsibility** — one module, one reason to change. If a file both reads the environment and orchestrates work, split it.
- **Open/closed** — a new engine is a new definition. Executable composition roots opt into it; resolver, transport, gate, persistence, and generic orchestration do not change. Enforce this with tests.
- **Liskov substitution** — every registered provider must be usable wherever any other is, so differences are expressed through declared `capabilities` and `gateDefaults`, never by a consumer checking the id.
- **Interface segregation** — consumers depend on the narrowest type available: `ProviderEnv` instead of `NodeJS.ProcessEnv`, `DecisionWriter` instead of a whole `Database`, protocol types instead of the client, a `RetryPolicy` instead of the transport.
- **Dependency inversion** — the client, gate, triage, and persistence depend on the contract, not on `packages/providers/jev` or `packages/providers/laya`. Concrete definitions are reached only through the registry.
- **Optional-versus-mandatory is declared** — when a provider needs a key another does not, express it with `requirement` on that provider's `envKeys`.

## Adding a use case

1. Run `yarn create:usecase <name>`.
2. Define the package's evidence, subjects, questions, deterministic baseline, and composition roots.
3. Add package-owned migrations and a unique journal only when persistence is needed.
4. Add package-local `setup`, `clean`, and domain commands.
5. Run `yarn install` and `yarn workspace @sysone/<name> check`.
6. Add a root convenience alias only if it materially improves the common path.
7. Add a `README.md` to the package only if it ends up owning something `packages/usecases/README.md` does not — its own evidence model, commands, migrations, or configuration. The generator deliberately scaffolds none, so the default is no README and a row in the parent instead.

The workspace glob, root migration/clean fan-out, and architecture tests discover the package automatically. Never edit the orchestrator to register a use case.

## Before presenting changes

1. Run `yarn check` and `yarn npm audit`.
2. Run `yarn db:generate` and confirm no migration drift in any package.
3. Run `./start`, then your use case's seed, to exercise every report visualization.
4. Render the report in Chromium at desktop and narrow widths; inspect light and dark themes, tabs, search, filters, tooltips, keyboard controls, and reduced-motion behaviour.
5. When lifecycle code changes, validate that `--start` brings every composed local engine up, `--without-engines` skips them, `--stop` preserves volumes, `--clean` removes only root-composed clean data, and `--purge-models` removes only model-cache volumes. Verify application artifacts are untouched.
6. When provider code changes, exercise more than one registered engine against the already-running stack and confirm `decisions.provider` records the right engine each time.
7. When verifying against a second checkout, set `COMPOSE_PROJECT_NAME` and `POSTGRES_PORT` so you get your own volume. Two checkouts sharing the default project name share one database, and a migration meant for a fresh schema will hit real data.
8. When a README or its diagram changes, render it rather than reasoning about it: `python3 -m http.server`, then open `http://localhost:8000/diagrams/<file>.svg` in both colour schemes and with reduced motion forced, and confirm no text escapes the `viewBox`. Render the README itself **in place** so relative image paths resolve the way a viewer resolves them, and check that every collapsible section still folds with its tables and code rendered as elements rather than leaking as raw text.

## Documentation follows boundaries, not directories

A README exists because it **owns** information a reader needs and no other document owns. It does not exist because a directory does.

### Before creating a README, apply this test

```text
New folder, package, provider, or use case
        ↓
Does it represent a meaningful documentation boundary?
        ↓  NO  → do not create a README
       YES
        ↓
Does a parent, sibling, or child README already own this information?
        ↓  YES → extend that README instead
        NO
        ↓
Is it independently understandable, independently consumable,
operationally significant, or explicitly requested?
        ↓  YES → create the README
        NO  → document it in the nearest owning README
```

Non-negotiable consequences of that test:

1. **Never create a README merely because a directory exists.** Directory depth is not evidence of a boundary.
2. **Never create one automatically for a new package, provider, or use case.** Package-hood is cheap in a Yarn workspace; extracting a module for dependency-direction reasons is not by itself a documentation event.
3. **Inspect existing parent and sibling documentation first.** Read them before writing, every time.
4. **Prefer extending.** If a parent README already carries the topic, add to it. A new file that restates its parent's table is worse than a longer parent.
5. **A child README is legitimate** when the child has its own API or integration contract, its own lifecycle, its own configuration, its own operational commands, its own data model or migrations, or is an independently understandable reference implementation. A child README nested under a parent is not redundant by construction — `packages/infra/README.md` explains the infra domain and its dependency rule, while `decision-core/README.md` explains contracts and integration; both are correct.
6. **Never duplicate across parent and child.** When detail moves, it moves; it is not copied. Two documents stating the same threshold is how they start disagreeing. If you cannot state what a new README owns that its parent does not, do not create it.
7. **Ordinary implementation directories stay undocumented.** `src/`, `src/providers/`, `src/db/`, `src/reporter/`, `src/report/`, `src/triage/`, `src/experiments/`, `drizzle/`, `tests/` and their peers get no README. Explain them in the nearest owning package README — as `playwright-decisions/README.md` does when it explains why `src/experiments/` and `src/ground-truth/` are separate.
8. **A thin README is a signal, not an achievement.** A title, one sentence, and an import example means the boundary belongs to the parent. Delete it and put the row in the parent's table.

A missing README is a cheap, reversible mistake. A directory tree of stubs is not: it dilutes the documents that matter and drifts against the code.

### Ownership when a README does exist

These rows describe what a document covers **if** it exists. They are not a template to instantiate per directory.

| Document | Covers | Must not contain |
|---|---|---|
| root `README.md` | what the lab is for, quick start, adoption paths, layout, configuration | API contracts, engine configuration, use-case commands |
| `packages/infra/README.md` | the reusable domain, its packages, and the dependency direction | package-specific implementation detail |
| an infra package README | that package's API, contracts, and commands | another package's commands |
| a provider README | that engine's environment keys, requirement levels, capabilities, and gate defaults | generic contract mechanics; link to `decision-core` instead |
| `packages/usecases/README.md` | the anatomy of a use case, how to add one | one use case's specifics |
| a use-case README | that use case's context, evidence, questions, commands | infra internals; link instead |

The root README is the entry point and must not duplicate detailed package documentation. A package or domain README explains its own boundary and responsibilities. A use-case README documents that use case's behaviour and implementation, while `packages/usecases/README.md` explains the common model and onboarding.

Keep the documentation map in **one** place. A layout tree, an ownership table, and a link index all listing the same packages will drift; state it once and link to it.

**A README that exists references exactly one animated SVG, and every SVG lives in the repository-root `diagrams/`.** This is a constraint on READMEs, not a reason to create one — and never a reason to create a package README so a diagram has somewhere to live. One README, one diagram: a diagram that would need a second one is usually two ideas that should be separated, and **the same diagram must not be referenced by two READMEs**. If two documents want one diagram, they are one boundary. The root's diagram is about the lab and must stay legible without reference to any use case; a package's diagram explains that package's own idea.

They are centralised rather than kept per package because the token and keyframe block is **duplicated in every file** — an SVG embedded with `<img>` cannot load an external stylesheet, so self-containment is what makes it render at all — and one directory is what keeps those copies in step. The cost is that a package README references outside its own directory; that is accepted.

Name a diagram for what it explains and who uses it — `decision-core-request-lifecycle.svg` — so `diagrams/` needs no index to be navigable. Non-negotiables:

- Hand-written SVG, no external asset, no GIF, no screenshot.
- Tokens mirror `report-assets.ts`, and the shared keyframes keep the report's names (`rise-in`, `dash-flow`, `walk`, `breathe`).
- `prefers-color-scheme: dark` overrides are mandatory; a diagram that only reads in light mode is unfinished.
- `prefers-reduced-motion: reduce` must stop **all** animation, and every label must already be in its final position — motion is a guided reading order, never the only way to read the content.
- A `<title>` and a `<desc>` are required, and the Markdown `alt` text must state the diagram's point in prose for anyone who cannot see it.


Animations must guide attention rather than delay reading: use the shared `rise-in` and `bar-grow` keyframes, and honour `prefers-reduced-motion`. Explicitly mark model-produced values with the inline SVG icon plus the engine's own name; never apply the badge to deterministic or manually supplied classifications, and never label one engine's row with another's name. Do not use emoji or Unicode glyphs as icons.

Do not add Playwright's HTML or JSON reporter, and do not reintroduce video capture. Failure evidence is the trace and screenshot in `test-results/run-<runId>/`, opened with `npx playwright show-trace`. Any command that refreshes a report must print a clickable `file://` link to it.

Report UI changes must preserve the design tokens in `report/report-assets.ts`, theme-safe shadows through `rgba(var(--shadow-rgb), alpha)`, 9px status dots with retry rings, 10px badges with 5px/10px padding, DOM-derived summaries/proportions, and the summary-to-raw-data information hierarchy. Do not add external CSS, JavaScript, fonts, or chart libraries.

## Testing

Unit-test mapping, report aggregation, flakiness, provider resolution, requirement enforcement, egress derivation, and provider-specific confidence gating. Keep the contract-conformance test that walks every registered provider, and the test that registers a stub engine into an isolated registry to prove extension needs no resolver change. A new engine needs tests proving its endpoint scope, auth header, and gate semantics, not just that a request succeeds.

Tests live in the package that owns the code, and `yarn check` must pass per package as well as at the root — a contributor working on one package should never have to run another's suite.

Database writes must be transactional. Never commit `.env`, authentication state, reports, traces, screenshots, or generated data.
