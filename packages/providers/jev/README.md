# @sysone/provider-jev

The Jev adapter: the hosted TypeSafe API. It depends on `@sysone/decision-core`; core does not depend on it. It owns no persistence and no application behaviour.

![Jev resolves to a remote endpoint, so evidence would leave the machine and egress consent is required before a request is sent. A bearer token is mandatory at every endpoint. Because Jev reports calibrated choice confidence, its gate reads the confidence field rather than probability mass.](../../../diagrams/provider-jev-hosted-consent.svg)

An application opts in explicitly; nothing registers itself:

```ts
import { jevProvider } from '@sysone/provider-jev';
```

## Selecting it

```dotenv
DECISION_PROVIDER=jev
DECISION_TRIAGE_ENABLED=true
ALLOW_DECISION_DATA_EGRESS=true
JEV_API_KEY=<your-key>
```

Consent is not optional here. The default endpoint is off-host, so failure evidence — error messages, stack traces, and whatever else the use case sends as evidence — leaves this machine. Generic resolution refuses the request until `ALLOW_DECISION_DATA_EGRESS=true`, and that refusal is derived from the **resolved endpoint**, not from this adapter's name. Never enable it if your evidence can contain secrets or personal data.

## Configuration

| Key | Requirement | Purpose |
|---|---|---|
| `JEV_API_KEY` | **required** | bearer token; the service has no anonymous access at any endpoint |
| `JEV_MODEL` | optional | model name (default `jev-latest`) |
| `JEV_BASE_URL` | optional | origin the `/v1/systemone` path is appended to (default `https://api.typesafe.ai`) |
| `JEV_ENDPOINT` | optional | full URL, overriding the above |

Requirement levels are data on the adapter, enforced by generic resolution — see [requirement levels](../../infra/decision-core/README.md#provider-configuration) in decision-core.

## Capabilities and gate

```text
selfHostable: false · calibratedChoiceConfidence: true
reportsRouting: false · reportsTokenUsage: true
gate: confidence · act ≥ 0.75 · review ≥ 0.45
```

Because this engine reports calibrated Choice confidence, its gate reads the `confidence` field directly rather than probability mass.

> Worth knowing before you trust that number. Out of the box — the model was not trained or tuned on this lab's data — on nine hand-labelled real Playwright failures (a small private sample, not shipped in this repository), its single most confident answer (0.840) was **wrong**, while a correct one sat at 0.440 — just below its own review threshold. Confidence and correctness were anti-correlated on that sample. Thresholds above are declared defaults, not measured accuracy; measuring this properly is what [`.kiro/specs/decision-eval`](../../../.kiro/specs/decision-eval/requirements.md) is for.

Run `yarn workspace @sysone/provider-jev check`.
