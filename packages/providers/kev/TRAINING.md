# Fine-tuning Kev locally

How to fine-tune a released Kev checkpoint on your own labelled decisions, measure whether it helped, and serve the result to this lab. Everything runs on your machine; no evidence leaves it except the one-time download of the base model and the released adapter from Hugging Face.

This is the upstream recipe ([jaredpalmer/kev](https://github.com/jaredpalmer/kev), "Fine-Tune on Your Own Data") applied to the lab's triage questions. The commands and flags below are taken from Kev's source at the commit the lab's image pins (`KEV_COMMIT` in the [`Dockerfile`](Dockerfile)); upstream is the authority if they drift.

## When it is worth doing

A fine-tune teaches Kev your categories and your evidence, and it lets you fit the confidence to your own labels instead of trusting the shipped temperature. It only pays off with enough labels:

- Upstream measured gains of 6–10 accuracy points on workloads of about 1,000–5,000 records. With 400 records the gain on their example workload was inside the noise.
- Every category you want Kev to learn needs examples. A category with one or two labels will not be learned.
- A gain on your held-out records says Kev learned **your** task. It says nothing about inputs unlike your training data.

Label first, then train. A few hundred carefully reviewed records beat thousands of labels copied from another model, because a model trained on another model's labels can at best reproduce it.

## Prerequisites

| Need | Why |
|---|---|
| Python 3.12 or 3.13 and [uv](https://docs.astral.sh/uv/) | Kev's `.python-version` selects 3.13; torch has no 3.14 wheels yet. uv fetches 3.13 for you if it is missing. |
| An accelerator for anything but the 0.8B model | CUDA or Apple Silicon (`mps`). CPU works for 0.8B but is slow. |
| Disk for the base model and adapter | About 2 GB for 0.8B, about 10 GB for 4B. |

Check out Kev at the same commit the lab serves, so the checkpoint you train loads in the lab's container too:

```bash
git clone https://github.com/jaredpalmer/kev.git && cd kev
git checkout 0c142becde423a0c68ec857f7831dac0315588a1
uv sync --extra serve
```

Expected: uv resolves from Kev's `uv.lock` and finishes without errors. `uv run python -m kev.train --help` then prints the trainer's flags.

## 1. Write the training data

One JSON object per line: the same body as a `/v1/systemone` request, plus a `label` on every question. The label is the option name for `choice`, `true`/`false` for `noul`, and the level index from 0 for `score`.

**Use the exact `instructions` and `criteria` your application sends at run time.** Kev conditions on that text, so a record trained on different wording is teaching a different question. For this lab's failure triage that means the `state` keys and questions in [`classify-failure.ts`](../../usecases/playwright-decisions/src/triage/classify-failure.ts) and the categories in [`types.ts`](../../usecases/playwright-decisions/src/triage/types.ts):

```jsonl
{"state":{"test_title":"checkout > shows order confirmation","test_file":"tests/checkout.spec.ts","status":"failed","retry_count":1,"duration_ms":30125,"error_message":"Timeout 30000ms exceeded waiting for getByText('Order confirmed')","stack_trace_excerpt":"at tests/checkout.spec.ts:42:5","recent_log_lines":[]},"questions":{"category":{"type":"choice","instructions":"A Playwright end-to-end test failed. Select the most likely root-cause category from the evidence. Do not call a consistently failing product defect flaky merely because it failed in automation.","criteria":{"product_bug":"A genuine defect in the application under test; the feature is behaving incorrectly.","automation_bug":"A defect in test code, selectors, assertions, waits, fixtures, or test data setup.","environment_issue":"A dependency, third-party service, or target test environment is unavailable or unhealthy.","flaky_test":"The test is non-deterministic and the same code can produce different outcomes or need retries.","infrastructure_failure":"CI runner, DNS, network, TLS, container, or platform infrastructure failed.","unknown":"The available evidence is insufficient to assign a category safely."},"label":"automation_bug"},"is_timeout":{"type":"noul","instructions":"Does the error or stack indicate a Playwright wait, assertion, navigation, or action timeout?","label":true},"is_network_error":{"type":"noul","instructions":"Does the evidence indicate DNS, connection, TLS, HTTP 5xx, or another network-level failure?","label":false}}}
```

Rules that keep the data honest:

- **Label from the evidence in `state`.** If a human needed information that is not in `state` to decide, Kev cannot learn it; either add that evidence to the state your application sends, or leave the record out.
- **Redact before you write.** Tokens, passwords, cookies, emails and internal hostnames in error messages or URLs end up in the adapter's training data.
- **Every question on a record needs a label.** Kev's loader rejects a record with an unlabelled question. Drop the question from that record rather than guessing.
- **De-duplicate repeats.** Hundreds of copies of one failure teach one example very loudly. Keep one record per distinct test and error.

## 2. Split by test, not by line

Hold out 10–20% for evaluation, and split on test identity so no test appears on both sides. A random line split puts repeats of the same failure in train and eval and inflates the score.

```bash
python3 - <<'PY'
import hashlib, json
train, heldout = open("train.jsonl", "w"), open("heldout.jsonl", "w")
for line in open("labelled.jsonl"):
    record = json.loads(line)
    key = record["state"]["test_file"] + "::" + record["state"]["test_title"]
    bucket = int(hashlib.sha256(key.encode()).hexdigest(), 16) % 100
    (heldout if bucket < 20 else train).write(line)
PY
wc -l train.jsonl heldout.jsonl
```

Expected: roughly an 80/20 line count. Check that every category appears in `heldout.jsonl`; if one is missing, the evaluation cannot tell you anything about it.

## 3. Score the released model first

The baseline is the checkpoint you are about to fine-tune, unchanged. Without it a fine-tuned accuracy number has nothing to be compared with.

```bash
uv run python -m kev.benchmark --run jaredpalmer/kev-0.8b --data heldout.jsonl --out runs/baseline-eval
```

Expected: accuracy, Brier score and calibration per question type, written to `runs/baseline-eval/` (including `rows.json`). `--device` defaults to the best available (`cuda`, then `mps`, then `cpu`).

## 4. Fine-tune from the released checkpoint

Start from a released adapter with `--init_from` so Kev keeps what it already knows. Training from the bare base model throws that away; upstream saw a from-base fine-tune fall to 0.33 on Kev's own evaluation set while the same data with `--init_from` held 0.83.

Kev-0.8B on a Mac:

```bash
uv run python -m kev.train --data train.jsonl \
  --base Qwen/Qwen3.5-0.8B-Base --init_from jaredpalmer/kev-0.8b \
  --epochs 2 --lr 2e-5 --batch 1 --accum 8 --device mps --out runs/triage-0.8b
```

Kev-4B on a CUDA GPU:

```bash
uv run python -m kev.train --data train.jsonl \
  --base Qwen/Qwen3.5-4B-Base --init_from jaredpalmer/kev-4b \
  --epochs 2 --lr 2e-5 --batch 1 --accum 8 --dtype bf16 --checkpointing 1 --device cuda --out runs/triage-4b
```

- `--base` must match the checkpoint in `--init_from`. The trainer compares base, revision, LoRA rank and head size before loading and stops with an error if they disagree.
- `--dtype bf16` is CUDA only. On `mps` and `cpu` leave the default (`fp32`).
- `2e-5` is the upstream starting point for delta training, well below the from-scratch rate. Raise it only if the held-out score does not move.
- On a Mac run one training job at a time; two jobs on the same GPU are much slower.
- The starting checkpoint and all arguments are recorded in `runs/<name>/training_config.json`.

## 5. Score the fine-tune on the same held-out file

```bash
uv run python -m kev.benchmark --run runs/triage-0.8b --data heldout.jsonl --out runs/triage-0.8b-eval
```

Compare it with `runs/baseline-eval`, per question. Read it this way:

- **Accuracy decides whether to keep the fine-tune.** A gain smaller than a few records' worth on a small held-out set is noise.
- **Brier and calibration decide the gate thresholds.** The lab gates Kev on the top probability (see the [provider README](README.md#capabilities-and-gate)); those thresholds are defaults, not values measured on your labels.

To see what fitting a temperature to your own rows would do to confidence, without changing the checkpoint:

```bash
uv run python -m kev.calibrate --rows runs/triage-0.8b-eval/rows.json
```

Expected: a table of `raw`, `shipped`, `workload` and `workload_oof` arms. `workload_oof` is the honest one: the temperature fitted out of fold, scored on rows it was not fitted on. Accuracy is identical across arms by construction; only the confidence changes. The command reports and writes nothing to the checkpoint.

## 6. Serve it to the lab

Run the fine-tune on the port the adapter already targets, and do not start the lab's own `kev` container at the same time (both publish 8009):

```bash
uv run --extra serve python -m kev.serve --run runs/triage-0.8b --port 8009
```

```dotenv
DECISION_PROVIDER=kev
DECISION_TRIAGE_ENABLED=true
```

If 8009 is taken, serve on another port and set `KEV_BASE_URL=http://localhost:<port>`. The server binds to `127.0.0.1` by default, so it stays on this host and no egress consent or `KEV_API_KEY` is needed. Binding it wider (`--host 0.0.0.0`) makes it remote, and the adapter then requires `KEV_API_KEY`.

Then run the lab as usual and compare its decisions with the untouched model's on the same evidence.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `question '...' has no label` | A question on that line has no `label`. Label it or remove it from the record. |
| `--init_from ...: base is ... there and ... here` | `--base` does not match the checkpoint. Use the base named in its model card. |
| bf16 error on a Mac | `--dtype bf16` is CUDA only; drop it. |
| Fine-tune scores no better than baseline | Usually too few labels, or labels copied from another model. Add reviewed records before tuning flags. |
| Lab still answers like the released model | The lab's `kev` container is serving on 8009 instead of your run. Stop it, or point `KEV_BASE_URL` at your server. |
| `pip install kev` installs something else | The PyPI `kev` is an unrelated project. Install from the Kev repository as above. |
