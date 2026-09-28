# @sysone/provider-laya

The Laya adapter: a self-hosted, Apache-2.0 engine with zero egress, plus the provider-owned `Dockerfile` that root composition builds. It depends on `@sysone/decision-core`; core and the generic orchestrator do not depend on it.

![Root composition includes the Laya container. The first start builds the image and downloads a checkpoint into a cached volume, so later starts are fast. The endpoint stays on this host, so no egress consent is required, and the gate reads probability mass rather than confidence.](../../../diagrams/provider-laya-local-runtime.svg)

An application opts in explicitly; nothing registers itself:

```ts
import { layaProvider } from '@sysone/provider-laya';
```

## Selecting it

```dotenv
DECISION_PROVIDER=laya
DECISION_TRIAGE_ENABLED=true
```

No API key and no egress consent, because the resolved endpoint is on this host. It comes up with `./start` — root `compose.yml` decides whether the local runtime is included, and the generic orchestrator discovers the profile without knowing this package exists.

**First start takes roughly five minutes**: about two to build the CPU-torch image and about four to download the checkpoint. Weights live in a named volume, so later starts are around ten seconds. `--clean` preserves that cache; `--purge-models` deletes it. Tail it with `./start --logs laya`.

## Configuration

| Key | Requirement | Purpose |
|---|---|---|
| `LAYA_BASE_URL` | optional | origin the `/v1/systemone` path is appended to (default `http://localhost:8000`) |
| `LAYA_ENDPOINT` | optional | full URL, overriding the above |
| `LAYA_MODEL` | optional | checkpoint name (default `english`) |
| `LAYA_API_KEY` | **required-when-remote** | needed only once the endpoint is off-host |

Requirement levels are data on the adapter, enforced by generic resolution — see [requirement levels](../../infra/decision-core/README.md#provider-configuration) in decision-core.

Runtime settings: `LAYA_MODELS` (only `english` is resident by default), `LAYA_DEVICE`, `LAYA_THREADS`, `LAYA_HOST_PORT`, and the generic `ENGINE_START_TIMEOUT`.

Because `LAYA_API_KEY` is `required-when-remote`, pointing this adapter at a hosted deployment is possible but is treated as remote: it then demands both a key and explicit egress consent.

## Capabilities and gate

```text
selfHostable: true · calibratedChoiceConfidence: false
reportsRouting: true · reportsTokenUsage: true
gate: top_probability · act ≥ 0.60 · review ≥ 0.35
```

The gate reads **probability mass** rather than confidence, because this engine's Choice confidence is on a much lower scale and is not calibrated.

> **Do not treat Laya as a drop-in accuracy equivalent.** Its published checkpoints are untuned for a bespoke taxonomy and were not trained on this lab's data. Out of the box, on a small private sample of hand-labelled real Playwright failures (not shipped in this repository), it answered `product_bug` to a literal DNS `ERR_NAME_NOT_RESOLVED`, and flakiness Noul probabilities clustered in 0.50–0.56 for flaky and healthy tests alike — effectively no signal on that question. Thresholds above are declared defaults, not measured accuracy; tune them against your own labels.

Run `yarn workspace @sysone/provider-laya check`.
