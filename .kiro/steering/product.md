---
inclusion: always
---

# Product context

This repository is the **System One Decision Lab**: a playground for evaluating System One decision models on real evidence. It is a monorepo with two kinds of package, and the split is the product:

- **Infra** (`packages/infra/*`) — everything that is true of *any* decision: the provider contract, the engines, the confidence gate, the shared `decisions` table, and the Docker stack. Contributors integrating an engine work only here.
- **Use cases** (`packages/usecases/*`) — one package per domain that asks questions and owns its own evidence. `@sysone/playwright-decisions` is the first: Playwright failures and run history. Contributors strengthening a domain work only there.

It is not a monitoring or dashboard product and must never be positioned as one. PostgreSQL exists to retain the evidence needed for repeatable decision experiments; a use case's report exists to explain those decisions to a human.

**The dependency rule is the whole architecture: a use case may depend on infra, and infra may never depend on a use case.** If infra needs to know something about Playwright, the abstraction is wrong. This is why a decision references its subject polymorphically (`subject_type` + `subject_id`) instead of with a foreign key to `test_cases`.

The lab is provider-neutral by design. No engine's name appears in the product name, a package name, a report heading, the schema, the neutral environment variables, or the CSS. Engine names appear only where they are factual: a provider definition, its own `<PROVIDER>_*` keys, and a badge naming the engine that produced a specific decision.

Providers are selected with `DECISION_PROVIDER`, implemented in `packages/providers/*`, and explicitly composed by each executable use case. Two ship today: hosted **TypeSafe Jev**, and self-hosted **Laya** (Apache-2.0), which serves the same `POST /v1/systemone` protocol locally. Neither is the "real" one; the lab exists to compare engines on the same evidence. Do not describe Laya as a drop-in accuracy equivalent: out of the box (not trained on this lab's data) on a small hand-labelled sample it answered `product_bug` to a DNS resolution error, and its flakiness Noul carried effectively no signal.

The deterministic flakiness formula, evidence-strength ordering, and failure taxonomy are owned by this lab's code; the lab depends on no external test-observability service.

A seed is temporary local-validation tooling; after inspecting it, the operator must run `yarn clean` before collecting real evidence. `./start --stop` preserves infrastructure data.

Data egress is decided by the resolved endpoint, never by the provider name. A locally served engine sends nothing off the host and needs no consent; any remote endpoint requires `ALLOW_DECISION_DATA_EGRESS=true`. Never weaken that derivation into a per-provider boolean. Never log API keys or site credentials.

Accuracy statements about an engine must say they are out-of-the-box results from a model not trained on this lab's data, and name the sample size. The lab is independent and not affiliated with any engine's vendor or maintainers.
