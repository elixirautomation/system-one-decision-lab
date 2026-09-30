# @sysone/provider-kev

The Kev adapter: a self-hosted, Apache-2.0 family of small decision models ([jaredpalmer/kev](https://github.com/jaredpalmer/kev)) that serves the same `POST /v1/systemone` protocol, plus the provider-owned `Dockerfile` that root composition builds. It depends on `@sysone/decision-core`; core and the generic orchestrator do not depend on it.

![Root composition builds the Kev image from a pinned source commit, because Kev is not on PyPI. The first start downloads the checkpoint named by KEV_RUN into a cached volume; later starts only load it. The endpoint stays on this host, so no egress consent is required. Kev's choice confidence is a rescaling of the winning option's probability, so the gate reads that probability directly.](../../../diagrams/provider-kev-local-runtime.svg)

An application opts in explicitly; nothing registers itself:

```ts
import { kevProvider } from '@sysone/provider-kev';
```

## Selecting it

```dotenv
DECISION_PROVIDER=kev
DECISION_TRIAGE_ENABLED=true
```

No API key and no egress consent, because the resolved endpoint is on this host. It comes up with `./start` alongside every other composed engine; the generic orchestrator discovers the `kev` profile without knowing this package exists.

**First start takes about three minutes on CPU**: under a minute to build the image, then roughly two to download and load `kev-0.8b`. Weights live in the `kev-model-cache` volume, so later starts only load them. `--clean` preserves that cache; `--purge-models` deletes it. Tail it with `./start --logs kev`.

## Configuration

| Key | Requirement | Purpose |
|---|---|---|
| `KEV_BASE_URL` | optional | origin the `/v1/systemone` path is appended to (default `http://localhost:8009`) |
| `KEV_ENDPOINT` | optional | full URL, overriding the above |
| `KEV_MODEL` | optional | model name sent in the request (default `kev-latest`) |
| `KEV_API_KEY` | **required-when-remote** | bearer token; needed only once the endpoint is off-host |

Requirement levels are data on the adapter, enforced by generic resolution — see [requirement levels](../../infra/decision-core/README.md#provider-configuration) in decision-core.

`KEV_MODEL` does not choose weights: the server answers `kev-latest` with whatever checkpoint it loaded. The checkpoint is a **runtime** setting, read by root `compose.yml`:

| Key | Default | Effect |
|---|---|---|
| `KEV_RUN` | `jaredpalmer/kev-0.8b` | Hugging Face checkpoint (or `repo@revision`) the container serves |
| `KEV_THREADS` | `4` | CPU threads (`OMP_NUM_THREADS`) |
| `KEV_HOST_PORT` | `8009` | published port |
| `KEV_DTYPE` | empty (fp32 on CPU) | `bf16` halves memory at slightly different probabilities |
| `KEV_DATE_FACTS` | `0` | `1` appends day counts between dates found in the state |
| `KEV_TORCH_INDEX` | `cpu` | PyTorch wheel index used at build time |

The default is the 0.8B checkpoint because it is the only size that fits a default 8 GB Docker Desktop VM on CPU: about 4 GB resident and around 1.5 s per two-question request on an Apple M4 Pro. `kev-4b` is the upstream recommendation and is markedly more accurate. Measured on the same machine with a 16 GB VM:

```dotenv
KEV_RUN=jaredpalmer/kev-4b
KEV_DTYPE=bf16        # required: fp32 weights alone would fill a 16 GB VM
```

That serves at about 11 GB resident and 6–7 s per two-question request, and its first start takes about eleven minutes, mostly downloading roughly 10 GB into the cache volume. The container runs PyTorch on CPU; it does not reach Apple's GPU, so upstream's MLX latencies do not apply here.

The image pins the upstream commit (`KEV_COMMIT` build argument) and installs from Kev's own `uv.lock`, with only torch swapped for the CPU wheel. Kev is not published to PyPI — the `kev` package there is an unrelated project — so do not replace the source install with `pip install kev`.

## Capabilities and gate

```text
selfHostable: true · calibratedChoiceConfidence: false
reportsRouting: false · reportsTokenUsage: true
gate: top_probability · act ≥ 0.75 · review ≥ 0.45
```

Kev's Choice `confidence` is `(p_max − 1/K) / (1 − 1/K)`: a rescaling of the winning option's probability rather than an independent signal, and one that shifts with the number of options. So the adapter declares `calibratedChoiceConfidence: false` and the gate reads the probability mass directly. That mass carries a temperature fitted upstream on held-out data, which is why the thresholds sit higher than Laya's; they are still declared defaults, not values measured on this lab's labels.

> **Not measured on this lab's data.** Upstream reports Kev-0.8B at 0.648 development accuracy on sources it never trained on, well below Kev-4B and hosted Jev. In this lab, one out-of-the-box smoke request (a single literal DNS `ERR_NAME_NOT_RESOLVED`, not a sample) answered `unknown` at 0.46 probability, with `infrastructure_failure` second at 0.25 — routed to review, not acted on. Treat that as evidence the container works, not as accuracy.

Run `yarn workspace @sysone/provider-kev check`.
