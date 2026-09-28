# @sysone/decision-eval — tasks

Ordered so each step remains independently reviewable. Nothing here is started.

## 1 — Package skeleton

- [ ] Create `packages/infra/decision-eval` with package manifest, TypeScript config, checks, migration scripts, and README.
- [ ] Depend on `@sysone/decision-store` only.
- [ ] State explicitly that evaluation measures decisions and cannot write them.

## 2 — Label store

- [ ] Add `decision_labels` with its own migration journal.
- [ ] Implement `recordLabel`, `supersedeLabel`, and `effectiveLabels`.
- [ ] Test required provenance, retained superseded rows, and newest-effective resolution.

## 3 — Dataset assembly

- [ ] Join decisions to effective labels by subject and decision type.
- [ ] Return provider/model-grouped plain samples.
- [ ] Exclude unlabelled decisions and prevent a row from contributing to its own retrieval prior.

## 4 — Metrics

- [ ] Classification: accuracy, macro-F1, per-class rates, confusion matrix, kappa, Wilson intervals.
- [ ] Calibration: Brier, log loss, ECE, reliability buckets.
- [ ] Ranking: AUROC/AUPRC for binary answers.
- [ ] Paired comparison: McNemar, agreement, conditional accuracy.
- [ ] Gate evaluation: risk–coverage and threshold search.
- [ ] Cover degenerate inputs with hand-computed tests.

## 5 — CLI and regression gate

- [ ] Add generic report and label commands with JSON output.
- [ ] Refuse regression verdicts below a minimum sample size.
- [ ] Keep metric functions pure; CLI owns database and formatting IO.

## 6 — Domain integration

- [ ] Document the public label API.
- [ ] Let each use case own and seed its own adjudicated labels through that API.
- [ ] Verify adding a domain dataset requires no evaluation-package source change.

## 7 — Documentation

- [ ] Link the package from root and architecture documentation.
- [ ] Add the evaluation ownership row to the contribution guide.

## Follow-on, deliberately excluded

- Domain retrieval-prior features.
- Judge-assisted bulk labelling.
- Fine-tuning on accumulated labels.
