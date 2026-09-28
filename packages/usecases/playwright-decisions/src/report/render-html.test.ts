import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDashboardReport } from './aggregate.js';
import type { ReportSource } from './model.js';
import { renderDashboardHtml } from './render-html.js';

const source: ReportSource = {
  runs: [
    {
      id: 'run-1',
      pipelineId: 'pipeline-1',
      projectConfiguration: 'chromium',
      projectId: 'demo',
      branch: 'main',
      commitSha: 'abc123',
      app: 'decision-lab',
      squadName: 'quality',
      origin: 'actual_run',
      triggeredAt: new Date('2026-09-23T08:00:00Z'),
      completedAt: new Date('2026-09-23T08:00:05Z'),
    },
  ],
  cases: [
    {
      id: 'case-1',
      runId: 'run-1',
      testName: 'renders prices',
      suiteName: 'tests/prices.spec.ts > prices',
      status: 'failed',
      durationMs: 500,
      retryCount: 1,
      errorMessage: 'Timeout waiting for prices',
      errorSignature: 'TIMEOUT_PRICES',
      failureCategory: null,
      failureCategoryConfidence: null,
      sourceFile: 'tests/prices.spec.ts',
      projectId: 'demo',
      projectConfiguration: 'chromium',
      executedAt: new Date('2026-09-23T08:00:04Z'),
    },
  ],
  decisions: [
    {
      id: 'decision-1',
      testCaseId: 'case-1',
      origin: 'actual_run',
      decisionType: 'failure_triage',
      projectId: 'demo',
      projectConfiguration: 'chromium',
      suiteName: 'tests/prices.spec.ts > prices',
      testName: 'renders prices',
      provider: 'jev',
      model: 'jev-test-model',
      category: 'environment_issue',
      score: null,
      noul: null,
      confidence: 0.82,
      recommendedAction: 'flag_for_review',
      routingSignal: 'confidence',
      routingValue: 0.82,
      result: { probabilities: { environment_issue: 0.82, unknown: 0.18 } },
      inputTokens: 12,
      outputTokens: 4,
      createdAt: new Date('2026-09-23T08:00:06Z'),
    },
  ],
};

const report = buildDashboardReport(source, new Date('2026-09-23T09:00:00Z'));
const html = renderDashboardHtml(report);

describe('dashboard HTML design-system contract', () => {
  it('emits the required light/dark tokens and theme-safe shadows', () => {
    assert.match(html, /--bg:#f4f6fb;--surface:#fff;--surface-2:#f8f9fc;--ink:#172033/);
    assert.match(html, /--shadow-rgb:38,48,78;--shadow:0 16px 40px rgba\(var\(--shadow-rgb\),\.08\)/);
    assert.match(html, /:root\[data-theme=dark\][^{]*\{[^}]*--bg:#111522;--surface:#181e2e;--surface-2:#202739;--ink:#edf1fb/);
    assert.doesNotMatch(html, /box-shadow:[^;}]*rgba\((?!var\(--shadow-rgb\))/);
  });

  it('uses inline SVG icons and never emits platform-dependent icon glyphs', () => {
    assert.doesNotMatch(html, /[✦◐↻◇]/u);
    assert.match(html, /class="decision-mark"[^>]*>\s*<i class="ico">\s*<svg/);
    assert.match(html, /<b>Jev<\/b>/);
    assert.match(html, /id="theme-toggle"[\s\S]*class="ico ico-sun"[\s\S]*class="ico ico-moon"/);
  });

  it('renders the cascading navigation, insights, and decision sections', () => {
    assert.match(html, /class="section-nav"/);
    assert.match(html, /id="current-insight-banner" class="insight-banner"/);
    assert.match(html, /id="historical-insight-banner" class="insight-banner"/);
    for (const id of [
      'section-current-run-map',
      'section-current-triage',
      'section-current-causes',
      'section-current-tests',
      'section-historical-trend',
      'section-historical-decisions',
      'section-historical-flaky',
      'section-historical-performance',
      'section-historical-tests',
    ]) {
      assert.match(html, new RegExp(`id="${id}"`));
    }
  });

  it('derives proportional visuals from the rendered DOM', () => {
    assert.match(html, /class="metric-bar"/);
    assert.match(html, /buildMetricBars/);
    assert.match(html, /buildCategoryChart/);
    assert.match(html, /--pass-color/);
    assert.match(html, /\.run-cell:before\{[^}]*width:9px;height:9px;border-radius:50%/);
    assert.doesNotMatch(html, /\.run-cell:hover\{[^}]*scale[XY]?\(/);
  });

  it('embeds its downloadable data and has no external runtime dependencies', () => {
    assert.match(html, /<script id="report-data" type="application\/json">/);
    assert.match(html, /id="download-data"/);
    assert.doesNotMatch(html, /href="data\.json"/);
    assert.doesNotMatch(html, /<(?:link|script)[^>]+(?:src|href)="https?:/);
  });

  it('is the only dashboard and never links to a Playwright HTML report', () => {
    // This is a decision lab, not a test-automation product: Playwright's own
    // HTML report is not generated, so the report must not offer a dead link to
    // it. Failure evidence is reached with `npx playwright show-trace` instead.
    assert.doesNotMatch(html, /playwright-report/);
    assert.doesNotMatch(html, /Open Playwright detail/);
  });

  it('keeps all animation behind the global reduced-motion override', () => {
    assert.match(html, /@keyframes rise-in/);
    assert.match(html, /@keyframes bar-grow/);
    assert.match(html, /@media\(prefers-reduced-motion:reduce\)\{\*,\*:before,\*:after/);
  });
});

describe('decision provider attribution', () => {
  function renderWithProvider(provider: string, model: string): string {
    const decision = source.decisions[0];
    if (!decision) throw new Error('fixture is missing its decision');
    return renderDashboardHtml(
      buildDashboardReport(
        { ...source, decisions: [{ ...decision, provider, model }] },
        new Date('2026-09-23T09:00:00Z'),
      ),
      );
  }

  it('labels a Laya-produced decision as Laya, never as Jev', () => {
    const layaHtml = renderWithProvider('laya', 'laya-rl-agent');
    assert.match(layaHtml, /class="decision-mark"[^>]*>\s*<i class="ico">[\s\S]*?<b>Laya<\/b>/);
    assert.doesNotMatch(layaHtml, /<b>Jev<\/b>/);
    assert.match(layaHtml, /Laya decisions/);
  });

  it('labels a Jev-produced decision as Jev', () => {
    const jevHtml = renderWithProvider('jev', 'jev-latest');
    assert.match(jevHtml, /<b>Jev<\/b>/);
    assert.doesNotMatch(jevHtml, /<b>Laya<\/b>/);
  });

  it('falls back to a neutral label when providers are mixed', () => {
    const decision = source.decisions[0];
    if (!decision) throw new Error('fixture is missing its decision');
    const mixed = renderDashboardHtml(
      buildDashboardReport(
        {
          ...source,
          decisions: [
            { ...decision, provider: 'jev', model: 'jev-latest' },
            {
              ...decision,
              id: 'decision-2',
              provider: 'laya',
              model: 'laya-rl-agent',
              decisionType: 'root_cause_choice',
            },
          ],
        },
        new Date('2026-09-23T09:00:00Z'),
      ),
    );
    // Report-wide surfaces must not claim one vendor produced a mixed database.
    assert.match(mixed, /System One decisions/);
    // Per-decision badges still name their own engine.
    assert.match(mixed, /<b>Jev<\/b>/);
  });

  it('summarises decision counts per provider in the header', () => {
    assert.match(renderWithProvider('laya', 'laya-rl-agent'), /Laya 1</);
  });
});
