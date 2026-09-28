import type {
  CurrentRunView,
  CurrentTestView,
  DashboardReport,
  HistoricalIdentityView,
  TrendPoint,
} from './model.js';
import { stripAnsi } from '../triage/error-text.js';
import { providerDisplayName } from './aggregate.js';
import { REPORT_SCRIPT, REPORT_STYLES } from './report-assets.js';

const SPARKLE_ICON = '<i class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.3c.7 4 2 6.6 3.9 8.5 1.9 1.9 4.5 3.2 8.5 3.9-4 .7-6.6 2-8.5 3.9-1.9 1.9-3.2 4.5-3.9 8.5-.7-4-2-6.6-3.9-8.5-1.9-1.9-4.5-3.2-8.5-3.9 4-.7 6.6-2 8.5-3.9 1.9-1.9 3.2-4.5 3.9-8.5z" fill="currentColor"/></svg></i>';
const EMPTY_ICON = '<i class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Zm2.5-.5a.5.5 0 0 0-.5.5V15h3.2l1.2 2h3.2l1.2-2H18V5.5a.5.5 0 0 0-.5-.5h-11Z" fill="currentColor"/></svg></i>';
const DOWNLOAD_ICON = '<i class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3h2v10.2l3.1-3.1 1.4 1.4-5.5 5.5-5.5-5.5 1.4-1.4 3.1 3.1V3ZM5 19h14v2H5v-2Z" fill="currentColor"/></svg></i>';
const THEME_ICONS = '<i class="ico ico-sun"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 1h2v3h-2V1Zm0 19h2v3h-2v-3ZM1 11h3v2H1v-2Zm19 0h3v2h-3v-2ZM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4-2.1-2.1Zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4-2.1-2.1ZM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1-1.4-1.4ZM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1-1.4-1.4ZM12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" fill="currentColor"/></svg></i><i class="ico ico-moon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 14.7A8.7 8.7 0 1 1 9.3 3.8a7.2 7.2 0 0 0 10.9 10.9Z" fill="currentColor"/></svg></i>';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function text(value: string | null | undefined, fallback = '—'): string {
  return escapeHtml(value || fallback);
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1_000) return `${Math.round(milliseconds)} ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1_000).toFixed(1)} s`;
  return `${(milliseconds / 60_000).toFixed(1)} min`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function shortId(value: string | null): string {
  if (!value) return '—';
  return value.length > 12 ? value.slice(0, 12) : value;
}

function emptyState(title: string, detail: string): string {
  return `<div class="empty-state">${EMPTY_ICON}<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`;
}

/**
 * Label used for report-wide decision surfaces (metric cards, chart eyebrows,
 * footer) where no single decision row is in scope. Set once per render from
 * `report.decisionLabel`; rendering is a synchronous single pass.
 */
let activeDecisionLabel = 'System One';

/**
 * The badge must name the engine that actually produced the decision. Stamping
 * one engine's name on another's row would misattribute it, so per-decision
 * surfaces pass their own provider and report-wide surfaces fall back to the
 * label computed across every persisted decision.
 */
function renderDecisionMark(badge: string, title: string): string {
  return `<span class="decision-mark" title="${escapeHtml(title)}">${SPARKLE_ICON}<b>${escapeHtml(badge)}</b></span>`;
}

function renderProviderMark(provider: string | null | undefined, context: string): string {
  const name = provider ? providerDisplayName(provider) : activeDecisionLabel;
  return renderDecisionMark(name, `${name} ${context}`);
}

function metricCard(label: string, value: string | number, detail: string, tone = ''): string {
  const decisionMark = tone.includes('decision-metric')
    ? renderDecisionMark(activeDecisionLabel, `Metric backed by persisted ${activeDecisionLabel} decisions`)
    : '';
  return `<article class="metric-card ${tone}" data-metric="${escapeHtml(label)}"><span class="metric-label">${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><span class="metric-detail">${escapeHtml(detail)}</span>${decisionMark}<div class="metric-bar" hidden></div></article>`;
}

function renderPassRing(passRate: number): string {
  const safeRate = Math.max(0, Math.min(100, passRate));
  return `<div class="pass-ring" data-rate="${safeRate}" style="--pass:${safeRate * 3.6}deg" role="img" aria-label="Pass rate ${safeRate.toFixed(1)} percent"><div><strong>${safeRate.toFixed(1)}%</strong><span>pass rate</span></div></div>`;
}

function renderInsightBanner(id: string): string {
  return `<div id="${id}" class="insight-banner" hidden>${SPARKLE_ICON}<p></p></div>`;
}

function renderSectionNav(label: string, sections: Array<[string, string]>): string {
  return `<nav class="section-nav" aria-label="${escapeHtml(label)}">${sections.map(([id, title]) => `<a href="#${id}">${escapeHtml(title)}</a>`).join('')}</nav>`;
}

function renderRunStrip(current: CurrentRunView): string {
  if (current.tests.length === 0) return emptyState('No test executions', 'The latest persisted run contains no test cases.');
  return `<div class="run-strip" aria-label="Current run outcomes">${current.tests.map((test) => `<button class="run-cell ${test.status}${test.retryCount > 0 ? ' retried' : ''}" data-scroll-test="${escapeHtml(test.id)}" title="${escapeHtml(`${test.title} · ${test.status}${test.retryCount ? ` · ${test.retryCount} retries` : ''}`)}"><span class="sr-only">${text(test.title)}: ${test.status}</span></button>`).join('')}</div>`;
}

function renderProbabilityBars(probabilities: Record<string, number>): string {
  const entries = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return '';
  return `<div class="probabilities">${entries.map(([label, probability]) => {
    const percentage = Math.max(0, Math.min(100, probability * 100));
    return `<div class="prob-row"><span>${escapeHtml(label)}</span><div class="bar-track"><i style="width:${percentage.toFixed(1)}%"></i></div><b>${percentage.toFixed(0)}%</b></div>`;
  }).join('')}</div>`;
}

function renderTriage(test: CurrentTestView): string {
  if (!test.category) return '<span class="muted">No persisted triage decision</span>';
  return `<div class="triage-block decision-surface"><div class="pill-row">${test.hasModelDecision ? renderProviderMark(test.decisionProvider, `classification via ${test.model ?? 'configured model'}`) : ''}<span class="pill category">${text(test.category)}</span>${test.recommendedAction ? `<span class="pill action">${text(test.recommendedAction.replaceAll('_', ' '))}</span>` : ''}${test.confidence === null ? '' : `<span class="confidence">${(test.confidence * 100).toFixed(0)}% confidence</span>`}</div>${renderProbabilityBars(test.probabilities)}${test.model ? `<span class="model">${text(test.model)}</span>` : ''}</div>`;
}

function renderCurrentTestRows(current: CurrentRunView): string {
  return current.tests.map((test) => {
    const searchable = [test.title, test.suiteName, test.projectConfiguration, test.category, test.errorMessage].filter(Boolean).join(' ').toLowerCase();
    const error = test.errorMessage ? `<details><summary>Failure evidence</summary><pre>${escapeHtml(stripAnsi(test.errorMessage))}</pre></details>` : '';
    return `<tr id="test-${escapeHtml(test.id)}" data-current-row data-status="${test.status}" data-search="${escapeHtml(searchable)}"><td><span class="status ${test.status}">${test.status}</span></td><td><strong>${text(test.title)}</strong><small>${text(test.suiteName)}</small>${error}</td><td><span>${text(test.projectConfiguration)}</span><small>${text(test.sourceFile)}</small></td><td>${formatDuration(test.durationMs)}${test.retryCount ? `<small>${test.retryCount} retries</small>` : ''}</td><td>${renderTriage(test)}</td></tr>`;
  }).join('');
}

function renderNeedsAttention(current: CurrentRunView): string {
  const failures = current.tests.filter((test) => test.status === 'failed');
  if (failures.length === 0) return emptyState('No failures in the latest run', 'The current persisted pipeline has no failed executions.');
  return `<div class="attention-list">${failures.map((test) => `<article class="attention-card"><div><span class="status failed">failed</span>${test.hasModelDecision ? renderProviderMark(test.decisionProvider, `triaged with ${test.model ?? 'configured model'}`) : ''}${test.category ? `<span class="pill category">${text(test.category)}</span>` : ''}</div><h3>${text(test.title)}</h3><p>${text(test.errorMessage?.split('\n')[0], 'No error message persisted')}</p><footer><span>${text(test.projectConfiguration)}</span><span>${formatDuration(test.durationMs)}</span>${test.recommendedAction ? `<span>${text(test.recommendedAction.replaceAll('_', ' '))}</span>` : ''}</footer></article>`).join('')}</div>`;
}

function renderFailureClusters(current: CurrentRunView): string {
  if (current.failureClusters.length === 0) return emptyState('No failure clusters', 'Clusters appear when failures are persisted.');
  return `<div class="cluster-list">${current.failureClusters.map((cluster) => `<article class="cluster-row"><span class="cluster-count">${cluster.count}</span><div><strong>${text(cluster.signature)}</strong><small>${cluster.tests.map(escapeHtml).join(' · ')}</small></div>${cluster.hasModelDecision ? renderProviderMark(cluster.decisionProvider, 'decided this cluster category') : ''}${cluster.category ? `<span class="pill category">${text(cluster.category)}</span>` : ''}</article>`).join('')}</div>`;
}

function renderCurrent(report: DashboardReport): string {
  const current = report.current;
  if (!current) return `<section id="panel-current" class="tab-panel active" role="tabpanel">${emptyState('PostgreSQL has no runs', 'Run the Playwright suite or local seed, then generate the report again.')}</section>`;
  return `<section id="panel-current" class="tab-panel active" role="tabpanel">
    <div class="section-heading"><div><span class="eyebrow">LATEST PERSISTED PIPELINE</span><h2>${text(current.pipelineId)}</h2><p>${formatDate(current.triggeredAt)} · ${text(current.app)} · ${text(current.branch)}</p></div></div>
    ${renderSectionNav('Jump to current-run section', [['section-current-run-map', 'Run map'], ['section-current-triage', 'Triage queue'], ['section-current-causes', 'Root causes'], ['section-current-tests', 'All tests']])}
    ${renderInsightBanner('current-insight-banner')}
    <div class="current-overview"><article class="ring-card">${renderPassRing(current.passRate)}<div><span>${current.total} executions</span><small>${formatDuration(current.durationMs)} pipeline duration</small></div></article>${metricCard('Passed', current.passed, 'final outcomes', 'success')}${metricCard('Failed', current.failed, 'need attention', current.failed ? 'danger' : '')}${metricCard('Skipped', current.skipped, 'not executed')}${metricCard('Retry recovered', current.retryRecovered, 'passed after retry', current.retryRecovered ? 'warning' : '')}${metricCard(`${activeDecisionLabel} decisions`, current.triaged, 'model-backed triage', current.triaged ? 'decision-metric' : '')}</div>
    <article class="card" id="section-current-run-map"><div class="card-heading"><div><span class="eyebrow">RUN MAP</span><h3>Execution sequence</h3></div><span class="legend"><span><i class="passed"></i>Passed</span><span><i class="failed"></i>Failed</span><span><i class="skipped"></i>Skipped</span><span><i class="retried"></i>Retry</span></span></div>${renderRunStrip(current)}</article>
    <div class="two-column"><article class="card" id="section-current-triage"><div class="card-heading"><div><span class="eyebrow">TRIAGE QUEUE</span><h3>Needs attention</h3></div><span class="count-badge">${current.failed}</span></div>${renderNeedsAttention(current)}</article><article class="card" id="section-current-causes"><div class="card-heading"><div><span class="eyebrow">ROOT CAUSES</span><h3>Failure clusters</h3></div><span class="count-badge">${current.failureClusters.length}</span></div><div class="category-chart" hidden></div>${renderFailureClusters(current)}</article></div>
    <article id="section-current-tests" class="card table-card"><div class="card-heading"><div><span class="eyebrow">CURRENT RESULTS</span><h3>Every persisted test</h3></div><span id="current-count">${current.tests.length} tests</span></div><div class="filters"><label><span class="sr-only">Search current tests</span><input id="current-search" type="search" placeholder="Search tests, suite, category or error…"></label><select id="current-status" aria-label="Filter current tests by status"><option value="all">All outcomes</option><option value="failed">Failed</option><option value="passed">Passed</option><option value="skipped">Skipped</option></select></div><div class="table-wrap"><table><thead><tr><th>Outcome</th><th>Test</th><th>Configuration</th><th>Duration</th><th>${escapeHtml(activeDecisionLabel)} triage</th></tr></thead><tbody>${renderCurrentTestRows(current)}</tbody></table></div></article>
  </section>`;
}

function renderTrend(points: TrendPoint[]): string {
  if (points.length === 0) return emptyState('No trend yet', 'Persist two or more runs to build a useful trend.');
  const width = 760;
  const height = 250;
  const pad = { left: 42, right: 18, top: 20, bottom: 38 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (points.length === 1 ? innerWidth / 2 : (index * innerWidth) / (points.length - 1));
  const y = (value: number) => pad.top + innerHeight - (Math.max(0, Math.min(100, value)) / 100) * innerHeight;
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(point.passRate).toFixed(1)}`).join(' ');
  const labels = [0, 25, 50, 75, 100].map((value) => `<g><line x1="${pad.left}" y1="${y(value)}" x2="${width - pad.right}" y2="${y(value)}"/><text x="${pad.left - 8}" y="${y(value) + 4}">${value}%</text></g>`).join('');
  const dots = points.map((point, index) => `<circle cx="${x(index)}" cy="${y(point.passRate)}" r="4" title="${escapeHtml(`${point.pipelineId}: ${point.passRate.toFixed(1)}% · ${point.passed} passed · ${point.failed} failed`)}"/>`).join('');
  const start = formatDate(points[0]?.triggeredAt ?? new Date().toISOString());
  const end = formatDate(points.at(-1)?.triggeredAt ?? new Date().toISOString());
  return `<div class="chart-scroll"><svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Pass rate across persisted runs"><g class="grid">${labels}</g><path d="${line}" class="trend-area"/><path d="${line}" class="trend-line"/>${dots}<text class="axis-label" x="${pad.left}" y="${height - 10}">${escapeHtml(start)}</text><text class="axis-label end" x="${width - pad.right}" y="${height - 10}">${escapeHtml(end)}</text></svg></div>`;
}

function renderOutcomeHistory(points: TrendPoint[]): string {
  if (points.length === 0) return emptyState('No run outcomes', 'Outcome bars appear after data is persisted.');
  return `<div class="outcome-history">${points.slice(-12).reverse().map((point) => {
    const denominator = Math.max(1, point.total);
    return `<div class="history-row"><span title="${text(point.pipelineId)}">${text(shortId(point.pipelineId))}</span><div class="stacked-bar" title="${point.passed} passed, ${point.failed} failed, ${point.skipped} skipped"><i class="passed" style="width:${(point.passed / denominator) * 100}%"></i><i class="failed" style="width:${(point.failed / denominator) * 100}%"></i><i class="skipped" style="width:${(point.skipped / denominator) * 100}%"></i></div><b>${point.passRate.toFixed(0)}%</b></div>`;
  }).join('')}</div>`;
}

function renderDistribution(title: string, values: Record<string, number>, id = ''): string {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return `<article class="card"${id ? ` id="${id}"` : ''}><div class="card-heading"><h3>${escapeHtml(title)}</h3></div>${emptyState('No persisted data', `This chart fills when ${activeDecisionLabel} decisions are stored.`)}</article>`;
  const max = Math.max(...entries.map((entry) => entry[1]));
  return `<article class="card"${id ? ` id="${id}"` : ''}><div class="card-heading"><div><span class="eyebrow">${renderDecisionMark(activeDecisionLabel, `Persisted ${activeDecisionLabel} decision data`)} DECISIONS</span><h3>${escapeHtml(title)}</h3></div><span>${entries.reduce((sum, entry) => sum + entry[1], 0)} total</span></div><div class="distribution">${entries.map(([label, count]) => `<div class="distribution-row"><span>${escapeHtml(label.replaceAll('_', ' '))}</span><div class="bar-track"><i style="width:${(count / max) * 100}%"></i></div><b>${count}</b></div>`).join('')}</div></article>`;
}

function renderRecentStatuses(identity: HistoricalIdentityView): string {
  return `<span class="status-dots" aria-label="Recent execution history">${identity.recentStatuses.map((execution, index) => `<i class="${execution.status}${execution.retryCount > 0 ? ' retry' : ''}" title="${index === 0 ? 'Latest' : `${index + 1} runs ago`}: ${execution.status}${execution.retryCount ? ` after ${execution.retryCount} retries` : ''}"></i>`).join('')}</span>`;
}

function renderFlakiest(identities: HistoricalIdentityView[]): string {
  const flaky = identities.filter((identity) => identity.metrics.isFlaky).slice(0, 10);
  if (flaky.length === 0) return emptyState('No flaky identities', 'At least five executions and enough outcome variation or retry recovery are required.');
  return `<div class="identity-list">${flaky.map((identity) => `<article><div><strong>${text(identity.testName)}</strong><small>${text(identity.projectConfiguration)}</small></div>${identity.latestNoul !== null || identity.latestEvidenceScore !== null ? renderProviderMark(identity.latestDecisionProvider, 'historical flakiness decision available') : ''}${renderRecentStatuses(identity)}<span class="score" data-score="${identity.metrics.flakinessScore}">${identity.metrics.flakinessScore.toFixed(1)}</span><span class="pill">${text(identity.evidenceStrength.replaceAll('_', ' '))}</span></article>`).join('')}</div>`;
}

function renderSlowest(identities: HistoricalIdentityView[]): string {
  const slowest = [...identities].sort((a, b) => b.p95DurationMs - a.p95DurationMs).slice(0, 8);
  if (slowest.length === 0) return emptyState('No duration history', 'Durations appear after test executions are stored.');
  const max = Math.max(1, ...slowest.map((identity) => identity.p95DurationMs));
  return `<div class="slow-list">${slowest.map((identity) => `<div><span title="${text(identity.testName)}">${text(identity.testName)}</span><div class="bar-track"><i style="width:${(identity.p95DurationMs / max) * 100}%"></i></div><b>${formatDuration(identity.p95DurationMs)}</b></div>`).join('')}</div>`;
}

function renderHistoricalRows(identities: HistoricalIdentityView[]): string {
  return identities.map((identity) => {
    const search = [identity.testName, identity.suiteName, identity.projectConfiguration, identity.latestCategory].filter(Boolean).join(' ').toLowerCase();
    const state = identity.metrics.isFlaky ? 'flaky' : identity.lastStatus;
    const category = identity.latestCategory ? `${identity.latestCategoryFromModel ? renderProviderMark(identity.latestDecisionProvider, 'selected the latest category') : ''}<span class="pill category">${text(identity.latestCategory)}</span>${identity.latestCategoryConfidence === null ? '' : `<small>${(identity.latestCategoryConfidence * 100).toFixed(0)}% confidence</small>`}` : '<span class="muted">No category</span>';
    return `<tr data-history-row data-state="${state}" data-search="${escapeHtml(search)}"><td><strong>${text(identity.testName)}</strong><small>${text(identity.suiteName)}</small></td><td><span class="status ${identity.lastStatus}">${identity.lastStatus}</span>${renderRecentStatuses(identity)}</td><td><strong>${identity.metrics.flakinessScore.toFixed(1)}</strong><small>${identity.metrics.sampleSize} samples · ${identity.metrics.flipCount} flips · ${identity.metrics.retryFlakeCount} retry recoveries</small></td><td>${formatDuration(identity.p95DurationMs)}<small>avg ${formatDuration(identity.averageDurationMs)}</small></td><td>${category}</td><td>${text(identity.projectConfiguration)}</td></tr>`;
  }).join('');
}

function renderHistorical(report: DashboardReport): string {
  return `<section id="panel-historical" class="tab-panel" role="tabpanel" hidden>
    <div class="section-heading"><div><span class="eyebrow">POSTGRESQL SNAPSHOT</span><h2>Historical intelligence</h2><p>Every persisted run, execution, and ${escapeHtml(activeDecisionLabel)} decision currently in the database.</p></div><button id="download-data" class="secondary-button" type="button">${DOWNLOAD_ICON} Download data JSON</button></div>
    ${renderSectionNav('Jump to historical section', [['section-historical-trend', 'Quality trend'], ['section-historical-decisions', `${activeDecisionLabel} decisions`], ['section-historical-flaky', 'Flakiness'], ['section-historical-performance', 'Performance'], ['section-historical-tests', 'Test catalogue']])}
    ${renderInsightBanner('historical-insight-banner')}
    <div class="metric-grid historical-metrics">${metricCard('Persisted runs', report.summary.runCount, 'pipeline executions')}${metricCard('Test executions', report.summary.executionCount, `${report.summary.passRate.toFixed(1)}% pass rate`)}${metricCard('Logical tests', report.summary.identityCount, 'identity histories')}${metricCard('Flaky tests', report.summary.flakyIdentities, 'deterministic baseline', report.summary.flakyIdentities ? 'warning' : '')}${metricCard('Failed executions', report.summary.failedExecutions, 'across all history', report.summary.failedExecutions ? 'danger' : '')}${metricCard(`${activeDecisionLabel} coverage`, `${report.summary.decisionCoverage.toFixed(1)}%`, `${report.summary.decisionCount} persisted decisions`, 'decision-metric')}</div>
    <div id="section-historical-trend" class="two-column trend-layout"><article class="card"><div class="card-heading"><div><span class="eyebrow">QUALITY TREND</span><h3>Pass rate over ${report.trend.length} runs</h3></div><span>Hover points for counts</span></div>${renderTrend(report.trend)}</article><article class="card"><div class="card-heading"><div><span class="eyebrow">RUN HEALTH</span><h3>Recent outcome mix</h3></div><span>latest first</span></div>${renderOutcomeHistory(report.trend)}</article></div>
    <div id="section-historical-decisions" class="three-column">${renderDistribution('Root-cause categories', report.summary.categoryCounts, 'historical-root-causes')}${renderDistribution('Recommended actions', report.summary.actionCounts)}${renderDistribution('Decision primitives', report.summary.decisionTypeCounts)}</div>
    <div class="two-column"><article class="card" id="section-historical-flaky"><div class="card-heading"><div><span class="eyebrow">NON-DETERMINISM</span><h3>Flakiest tests</h3></div><span>score 0–100</span></div>${renderFlakiest(report.identities)}</article><article class="card" id="section-historical-performance"><div class="card-heading"><div><span class="eyebrow">PERFORMANCE</span><h3>Slowest P95 tests</h3></div><span>last 50 executions</span></div>${renderSlowest(report.identities)}</article></div>
    <article id="section-historical-tests" class="card table-card"><div class="card-heading"><div><span class="eyebrow">TEST CATALOGUE</span><h3>Logical test histories</h3></div><span id="history-count">${report.identities.length} tests</span></div><div class="filters"><label><span class="sr-only">Search historical tests</span><input id="history-search" type="search" placeholder="Search test, suite, configuration or category…"></label><select id="history-status" aria-label="Filter historical tests"><option value="all">All test states</option><option value="flaky">Flaky</option><option value="failed">Latest failed</option><option value="passed">Latest passed</option><option value="skipped">Latest skipped</option></select></div><div class="table-wrap"><table><thead><tr><th>Test</th><th>Recent outcomes</th><th>Flakiness</th><th>P95 duration</th><th>Latest category</th><th>Configuration</th></tr></thead><tbody>${renderHistoricalRows(report.identities)}</tbody></table></div></article>
  </section>`;
}

function serializeReport(report: DashboardReport): string {
  return JSON.stringify(report, null, 2)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function renderDashboardHtml(report: DashboardReport): string {
  activeDecisionLabel = report.decisionLabel;
  const providerSummary = Object.entries(report.summary.providerCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([provider, count]) => `${providerDisplayName(provider)} ${count}`)
    .join(' · ');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>System One Decision Lab</title><style>${REPORT_STYLES}</style></head><body><main class="shell">
    <header class="topbar"><div class="brand"><span class="brand-mark">${SPARKLE_ICON}</span><div><h1>System One Decision Lab</h1><p>Fast model decisions layered onto Playwright evidence and run history</p></div></div><div class="header-actions">${providerSummary ? `<span class="muted" title="Decisions grouped by the engine that produced them">${escapeHtml(providerSummary)}</span>` : ''}<span class="muted">Generated ${escapeHtml(formatDate(report.generatedAt))}</span><button id="theme-toggle" class="icon-button theme-toggle" aria-label="Toggle colour theme">${THEME_ICONS}</button></div></header>
    <nav class="tabs" role="tablist"><button class="tab active" data-tab="current" role="tab" aria-selected="true">Current</button><button class="tab" data-tab="historical" role="tab" aria-selected="false" tabindex="-1">Historical</button></nav>
    ${renderCurrent(report)}${renderHistorical(report)}
    <footer class="footer"><span>Database snapshot · ${report.summary.runCount} runs · ${report.summary.executionCount} executions · ${report.summary.decisionCount} ${escapeHtml(activeDecisionLabel)} decisions</span><span>Keyboard: 1 current · 2 historical · / search</span></footer>
  </main><div id="custom-tooltip" class="custom-tooltip" role="tooltip"></div><script id="report-data" type="application/json">${serializeReport(report)}</script><script>${REPORT_SCRIPT}</script></body></html>`;
}
