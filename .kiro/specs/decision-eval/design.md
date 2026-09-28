# @sysone/decision-eval — design

Companion to `requirements.md`.

## Placement and dependency

`packages/infra/decision-eval` is reusable evaluation infrastructure. It depends only on `@sysone/decision-store`, never imports a use case, and never writes the table it evaluates.

```text
decision-eval -> decision-store -> decision-core
```

Use cases own their taxonomies and adjudicated fixtures. They submit labels through the evaluator's generic public API.

## Schema

`decision_labels` records `subject_type`, `subject_id`, `decision_type`, label, labeller, rationale, supersession, and creation time. A label belongs to a subject and question rather than one provider answer, so it can score every provider that answered the same pair.

The effective label is the newest non-superseded row for a subject and decision type. Resolution lives in one function.

## Module layout

| Module | Responsibility |
|---|---|
| `schema.ts` | label persistence |
| `labels.ts` | write, supersede, resolve |
| `dataset.ts` | assemble scored samples |
| `metrics/classification.ts` | classification metrics |
| `metrics/calibration.ts` | scoring rules and ECE |
| `metrics/ranking.ts` | binary ranking metrics |
| `metrics/intervals.ts` | uncertainty intervals |
| `metrics/paired.ts` | paired-provider analysis |
| `gate/risk-coverage.ts` | gate evaluation |
| `bin/report.ts` | IO and formatting |

## Decisions

- Metric functions consume arrays and perform no IO.
- Calibration is grouped by provider and model; confidence scales are never pooled.
- Rates include intervals and sample sizes.
- Providers answering the same subject are compared as paired observations.
- A row being scored cannot contribute to its own retrieval prior.
- Judge-produced labels retain provenance and never score themselves implicitly.
- Domain labels, examples, category names, and seed datasets remain in use-case packages.

## CLI

```bash
yarn workspace @sysone/decision-eval report
yarn workspace @sysone/decision-eval report --type <decision-type>
yarn workspace @sysone/decision-eval report --json out.json
yarn workspace @sysone/decision-eval label <subject-id> <label> --rationale "..."
```

## Risks

- Small samples: always show sample size and intervals; enforce a regression minimum.
- Label drift: retain supersession history.
- Judge confirmation bias: retain labeller provenance and use human-verified holdouts.
