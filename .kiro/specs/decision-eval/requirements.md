# @sysone/decision-eval — requirements

**Status:** proposed, not started.

## Why

The lab can ask several engines the same bounded question and persist every answer, but it cannot yet measure accuracy, calibration, agreement, or regressions against independently adjudicated labels.

## Scope

A reusable package at `packages/infra/decision-eval` that turns persisted decisions plus generic subject labels into metrics and machine-readable output. It measures; it never decides and never writes a decision.

### R1 — Label store

- Own a `decision_labels` table and migration journal.
- Identify a label by `subject_type`, `subject_id`, and `decision_type`.
- Store label value, labeller (`human`, `llm_judge`, or `deterministic_rule`), rationale, supersession, and timestamp.
- Attach labels to subjects and questions, not provider-specific answers.
- Preserve superseded labels as history.

### R2 — Classification metrics

Per provider and model: accuracy, macro-F1, per-class precision/recall, confusion matrix, an imbalance-aware statistic, and Wilson intervals.

### R3 — Probability and calibration metrics

Brier score, log loss, expected calibration error, reliability buckets, and AUROC/AUPRC for binary Noul questions.

### R4 — Paired comparison

McNemar's test, agreement rate, and accuracy conditioned on agreement for providers answering the same subject and question.

### R5 — Gate evaluation

A risk–coverage table and threshold search based on persisted `routing_signal` and `routing_value`. Output must state that thresholds tuned on a dataset cannot be reported as unbiased accuracy on that same dataset.

### R6 — CLI

`yarn workspace @sysone/decision-eval report` prints metrics and can emit JSON. A regression gate may fail only above a configured minimum sample size.

### R7 — Label capture

A generic CLI records or supersedes a label. Judge-assisted labels remain distinguishable from human labels and require an explicit promotion step.

## Out of scope

- Domain-specific fixtures, taxonomies, and labels. They stay in their owning use case and call the generic label API.
- Free-text LLM judging metrics.
- A second dashboard.
- Fine-tuning or automatic retraining.
- A new build or dependency-graph framework.

## Acceptance

- Every metric has hand-computed tests, including degenerate inputs.
- No rate is emitted without an interval or explicit sample count.
- The package depends on `@sysone/decision-store` only and never imports a use case.
- The package cannot write `decisions`.
- Domain packages can seed labels through the public API without modifying evaluation infrastructure.
