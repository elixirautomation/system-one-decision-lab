export const REPORT_STYLES = `
:root{color-scheme:light;--bg:#f4f6fb;--surface:#fff;--surface-2:#f8f9fc;--ink:#172033;--muted:#68748a;--line:#e2e6ef;--accent:#5a4df0;--accent-2:#2f80ed;--success:#17a673;--danger:#ef5b5b;--warning:#e2a93b;--shadow-rgb:38,48,78;--shadow:0 16px 40px rgba(var(--shadow-rgb),.08)}
:root[data-theme=dark]{color-scheme:dark;--bg:#111522;--surface:#181e2e;--surface-2:#202739;--ink:#edf1fb;--muted:#a6afc1;--line:#30394d;--shadow-rgb:0,0,0;--shadow:0 16px 40px rgba(var(--shadow-rgb),.25)}
html{scroll-behavior:smooth}*{box-sizing:border-box}[id^=section-]{scroll-margin-top:20px}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background-color .25s ease,color .25s ease}button,input,select{font:inherit}.shell{max-width:1800px;margin:auto;padding:24px 32px 60px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:22px}.brand{display:flex;align-items:center;gap:13px}.brand-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,var(--accent),#9b62f4);color:#fff;font-size:20px;box-shadow:0 9px 22px rgba(var(--shadow-rgb),.2)}.brand h1{margin:0;font-size:19px;letter-spacing:-.02em}.brand p,.section-heading p{margin:1px 0 0;color:var(--muted);font-size:12px}.header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.icon-button,.secondary-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:8px 12px;text-decoration:none;cursor:pointer}.theme-toggle{width:38px;height:38px;padding:0}.theme-toggle .ico{font-size:18px}.theme-toggle .ico-sun{display:none}:root[data-theme=dark] .theme-toggle .ico-sun{display:inline-flex}:root[data-theme=dark] .theme-toggle .ico-moon{display:none}
.ico{display:inline-flex;width:1em;height:1em;vertical-align:-.14em;flex:none}.ico svg{display:block;width:100%;height:100%;fill:currentColor}.tabs{display:inline-flex;padding:4px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);margin-bottom:18px}.tab{border:0;background:transparent;color:var(--muted);padding:9px 18px;border-radius:9px;cursor:pointer;font-weight:700;transition:color .2s ease,background-color .2s ease,transform .2s ease}.tab:hover:not(.active){color:var(--ink);transform:translateY(-1px)}.tab.active{background:var(--ink);color:var(--surface)}.tab-panel{display:none}.tab-panel.active{display:block;animation:rise-in .45s both}
.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:14px}.section-heading h2{margin:2px 0 0;font-size:26px;letter-spacing:-.04em}.eyebrow{display:flex;align-items:center;gap:7px;color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.13em}.section-nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}.section-nav a{font-size:11px;font-weight:700;color:var(--muted);background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:6px 12px;text-decoration:none;transition:color .2s ease,border-color .2s ease,transform .2s ease}.section-nav a:hover{color:var(--accent);border-color:var(--accent);transform:translateY(-1px)}
.insight-banner{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;margin-bottom:16px;background:linear-gradient(120deg,color-mix(in srgb,var(--accent) 9%,var(--surface)),color-mix(in srgb,var(--accent-2) 6%,var(--surface)));border:1px solid color-mix(in srgb,var(--accent) 22%,var(--line));animation:rise-in .45s .04s both}.insight-banner .ico{font-size:20px;color:var(--accent)}.insight-banner p{margin:0;font-size:13px;line-height:1.5}.insight-banner strong{color:var(--accent)}
.current-overview{display:grid;grid-template-columns:1.35fr repeat(5,1fr);gap:12px;margin-bottom:14px}.metric-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:14px}.metric-card,.ring-card,.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}.metric-card{padding:17px;display:flex;flex-direction:column;min-height:128px}.metric-card strong{font-size:27px;letter-spacing:-.04em;margin:8px 0 2px}.metric-label,.metric-detail,.card-heading>span,.card-heading small{color:var(--muted);font-size:11px}.metric-card.success strong{color:var(--success)}.metric-card.danger strong{color:var(--danger)}.metric-card.warning strong{color:var(--warning)}.metric-card.accent strong,.metric-card.decision-metric strong{color:var(--accent)}.metric-card .decision-mark{align-self:flex-start;margin-top:8px}.metric-bar{margin-top:auto;padding-top:10px}.metric-bar .bar-track{height:5px}.metric-bar b{display:block;margin-top:5px;font-size:10px;color:var(--muted);font-weight:700}.ring-card{padding:14px 18px;display:flex;align-items:center;gap:18px}.ring-card>div:last-child{display:flex;flex-direction:column}.ring-card small{color:var(--muted)}
.pass-ring{--pass:0deg;--pass-color:var(--success);width:100px;height:100px;border-radius:50%;background:conic-gradient(var(--pass-color) var(--pass),var(--line) 0);display:grid;place-items:center;position:relative;box-shadow:0 0 0 1px var(--line) inset}.pass-ring:before{content:"";position:absolute;inset:11px;border-radius:50%;background:var(--surface);box-shadow:0 2px 10px rgba(var(--shadow-rgb),.06) inset}.pass-ring div{position:relative;text-align:center}.pass-ring strong{display:block;font-size:21px;letter-spacing:-.03em}.pass-ring span{font-size:10px;color:var(--muted)}
.card{padding:18px;margin-bottom:14px}.card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:15px}.card-heading h3{font-size:15px;margin:2px 0}.two-column{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}.three-column{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.card,.metric-card,.ring-card,.attention-card,.cluster-row,.identity-list article,.secondary-button,.icon-button{transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease,border-color .25s ease,background-color .25s ease}.card:hover,.metric-card:hover,.ring-card:hover{border-color:color-mix(in srgb,var(--accent) 24%,var(--line));box-shadow:0 20px 48px rgba(var(--shadow-rgb),.12)}.metric-card:hover,.ring-card:hover{transform:translateY(-3px)}.attention-card:hover{transform:translateX(4px);border-color:color-mix(in srgb,var(--accent) 30%,var(--line))}.secondary-button:hover,.icon-button:hover{transform:translateY(-2px);border-color:var(--accent);box-shadow:0 8px 22px rgba(var(--shadow-rgb),.14)}
.run-strip{display:flex;align-items:center;gap:4px;overflow-x:auto;padding:7px 1px;min-height:28px}.run-cell{flex:0 0 18px;width:18px;height:18px;padding:0;border:0;border-radius:50%;background:transparent;cursor:pointer;position:relative;animation:rise-in .35s both;transition:transform .2s ease}.run-cell:before{content:"";position:absolute;left:50%;top:50%;width:9px;height:9px;border-radius:50%;background:var(--line);transform:translate(-50%,-50%)}.run-cell.passed:before{background:var(--success)}.run-cell.failed:before{background:var(--danger)}.run-cell.skipped:before{background:var(--muted)}.run-cell.retried:after{content:"";position:absolute;left:50%;top:50%;width:15px;height:15px;border-radius:50%;border:1.5px solid var(--accent);transform:translate(-50%,-50%)}.run-cell:hover{transform:translateY(-2px)}.run-cell:nth-child(3n+2){animation-delay:.03s}.run-cell:nth-child(3n){animation-delay:.06s}.legend{display:flex;align-items:center;gap:14px;color:var(--muted);font-size:11px;flex-wrap:wrap}.legend span{display:inline-flex;align-items:center;gap:5px}.legend i{width:9px;height:9px;border-radius:50%;background:var(--line);display:inline-block}.legend i.passed{background:var(--success)}.legend i.failed{background:var(--danger)}.legend i.skipped{background:var(--muted)}.legend i.retried{background:var(--surface);border:1.5px solid var(--accent)}
.attention-list,.cluster-list,.identity-list{display:flex;flex-direction:column;gap:9px}.attention-card{border:1px solid var(--line);background:var(--surface-2);border-radius:12px;padding:13px}.attention-card h3{font-size:13px;margin:8px 0 3px}.attention-card p{color:var(--muted);margin:0;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.attention-card footer{display:flex;gap:12px;color:var(--muted);font-size:10px;margin-top:9px;flex-wrap:wrap}.pill-row,.attention-card>div{display:flex;align-items:center;gap:5px;flex-wrap:wrap}.pill,.status,.count-badge{display:inline-flex;align-items:center;border-radius:999px;padding:5px 10px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;background:var(--surface-2);border:1px solid var(--line);line-height:1;white-space:nowrap}.status.passed{color:var(--success);background:color-mix(in srgb,var(--success) 10%,transparent)}.status.failed{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,transparent)}.status.skipped{color:var(--muted)}.pill.category{color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)}.pill.action{color:var(--warning)}.confidence,.model,.muted{font-size:10px;color:var(--muted)}
.decision-mark{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;background:linear-gradient(110deg,var(--accent),#8b5cf6 48%,var(--accent-2));color:#fff;font-size:10px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 5px 14px rgba(var(--shadow-rgb),.22);vertical-align:middle;white-space:nowrap;flex:none;line-height:1;overflow:visible}.decision-mark .ico{font-size:11px}.decision-mark b{font:inherit}.decision-mark .mark-count{padding-left:5px;margin-left:1px;border-left:1px solid rgba(255,255,255,.45);font-variant-numeric:tabular-nums}.provider-summary{display:inline-flex;gap:5px;flex-wrap:wrap}.metric-card .decision-mark+.decision-mark{margin-top:4px}.other-engines{display:grid;gap:5px;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)}.decision-surface{border-left:2px solid var(--accent);padding-left:9px}.decision-metric{background:linear-gradient(145deg,var(--surface),color-mix(in srgb,var(--accent) 10%,var(--surface)))}
.cluster-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;align-items:center;gap:10px;border-bottom:1px solid var(--line);padding:8px 0}.cluster-row:last-child{border:0}.cluster-count{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:color-mix(in srgb,var(--danger) 12%,transparent);color:var(--danger);font-weight:800;font-size:14px}.cluster-row small,.identity-list small,td small{display:block;color:var(--muted);font-size:10px;margin-top:2px}.category-chart{display:grid;gap:8px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--line)}.category-chart-row{display:grid;grid-template-columns:130px 1fr 22px;align-items:center;gap:9px;font-size:11px;animation:rise-in .4s both}.category-chart-row:nth-child(2){animation-delay:.04s}.category-chart-row:nth-child(3){animation-delay:.08s}.category-chart-row:nth-child(4){animation-delay:.12s}.category-chart-row:nth-child(5){animation-delay:.16s}.category-chart-label{color:var(--ink);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.category-chart-row b{text-align:right;font-variant-numeric:tabular-nums}
.filters{display:flex;gap:8px;margin-bottom:12px}.filters label{flex:1}.filters input,.filters select,select{width:100%;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);border-radius:10px;padding:9px 11px;outline:none}.filters input:focus,.filters select:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 15%,transparent)}.filters select{width:170px}.table-card{padding:0;overflow:hidden}.table-card>.card-heading,.table-card>.filters{margin-left:18px;margin-right:18px}.table-card>.card-heading{margin-top:18px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:950px}th{text-align:left;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.08em;background:var(--surface-2);padding:9px 13px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}td{padding:12px 13px;border-bottom:1px solid var(--line);vertical-align:top;font-size:11px}tbody tr{transition:background-color .2s ease,box-shadow .2s ease}tbody tr:hover{background:var(--surface-2)}tbody tr.row-flash{background:color-mix(in srgb,var(--accent) 14%,transparent);box-shadow:inset 3px 0 var(--accent)}td strong{font-size:11px}details{margin-top:6px}details summary{color:var(--accent);cursor:pointer;font-size:10px}pre{white-space:pre-wrap;max-width:650px;max-height:180px;overflow:auto;padding:9px;border-radius:9px;background:var(--bg);font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
.probabilities{margin-top:7px;display:grid;gap:3px}.prob-row,.distribution-row{display:grid;grid-template-columns:110px 1fr 38px;align-items:center;gap:7px;font-size:9px}.bar-track{height:8px;background:var(--line);border-radius:99px;overflow:hidden}.bar-track i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-2));border-radius:99px;transform-origin:left;animation:bar-grow .8s .2s cubic-bezier(.2,.8,.2,1) both}.model{display:block;margin-top:5px}.trend-layout{grid-template-columns:1.5fr 1fr}.trend-chart{display:block;width:100%;min-width:560px;animation:rise-in .5s .08s both}.trend-chart .grid line{stroke:var(--line);stroke-dasharray:3 4}.trend-chart .grid text,.axis-label{fill:var(--muted);font-size:9px;text-anchor:end}.axis-label{text-anchor:start}.axis-label.end{text-anchor:end}.trend-line{fill:none;stroke:var(--accent);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.trend-area{fill:none;stroke:color-mix(in srgb,var(--accent) 15%,transparent);stroke-width:13;stroke-linecap:round}.trend-chart circle{fill:var(--surface);stroke:var(--accent);stroke-width:3}.outcome-history,.distribution,.slow-list{display:grid;gap:11px}.history-row,.slow-list>div{display:grid;grid-template-columns:85px 1fr 44px;gap:10px;align-items:center;font-size:11px}.history-row>span,.slow-list span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stacked-bar{height:9px;display:flex;border-radius:99px;overflow:hidden;background:var(--line)}.stacked-bar i{transform-origin:left;animation:bar-grow .8s .2s cubic-bezier(.2,.8,.2,1) both}.stacked-bar i.passed{background:var(--success)}.stacked-bar i.failed{background:var(--danger)}.stacked-bar i.skipped{background:var(--muted)}.distribution-row{grid-template-columns:120px 1fr 30px}.distribution-row b{font-variant-numeric:tabular-nums}
.identity-list article{display:grid;grid-template-columns:minmax(150px,1fr) auto auto 48px auto;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--line)}.identity-list article:last-child{border:0}.identity-list article>div{min-width:0}.score{font-weight:800;color:var(--warning);font-size:15px;font-variant-numeric:tabular-nums}.status-dots{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 2px}.status-dots i{width:9px;height:9px;border-radius:50%;background:var(--line);position:relative;flex:none}.status-dots i.passed{background:var(--success)}.status-dots i.failed{background:var(--danger)}.status-dots i.skipped{background:var(--muted)}.status-dots i.retry:after{content:"";position:absolute;inset:-3px;border-radius:50%;border:1.5px solid var(--accent)}
.empty-state{min-height:130px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--muted);gap:5px}.empty-state strong{color:var(--ink)}.empty-state .ico{font-size:24px;color:var(--accent)}.footer{display:flex;justify-content:space-between;gap:20px;color:var(--muted);font-size:10px;margin-top:20px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}[hidden]{display:none!important}
.custom-tooltip{position:fixed;z-index:1000;pointer-events:none;max-width:300px;padding:8px 10px;border-radius:9px;background:#121826;border:1px solid color-mix(in srgb,#fff 8%,transparent);color:#fff;font-size:10px;line-height:1.4;box-shadow:0 10px 30px rgba(var(--shadow-rgb),.3);backdrop-filter:blur(12px);opacity:0;transform:translateY(5px) scale(.97);transition:opacity .15s ease,transform .15s ease}:root[data-theme=dark] .custom-tooltip{background:var(--surface-2);border-color:var(--line);color:var(--ink);box-shadow:0 10px 30px rgba(var(--shadow-rgb),.45)}.custom-tooltip.visible{opacity:1;transform:translateY(0) scale(1)}
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid color-mix(in srgb,var(--accent) 30%,transparent);outline-offset:2px}.tab-panel.active>.section-heading,.tab-panel.active>.section-nav,.tab-panel.active>.current-overview>*,.tab-panel.active>.metric-grid>*,.tab-panel.active>.card,.tab-panel.active>.two-column,.tab-panel.active>.three-column{animation:rise-in .5s both}.tab-panel.active>.current-overview>*:nth-child(2),.tab-panel.active>.metric-grid>*:nth-child(2){animation-delay:.04s}.tab-panel.active>.current-overview>*:nth-child(3),.tab-panel.active>.metric-grid>*:nth-child(3){animation-delay:.08s}.tab-panel.active>.current-overview>*:nth-child(4),.tab-panel.active>.metric-grid>*:nth-child(4){animation-delay:.12s}.tab-panel.active>.current-overview>*:nth-child(5),.tab-panel.active>.metric-grid>*:nth-child(5){animation-delay:.16s}.tab-panel.active>.current-overview>*:nth-child(6),.tab-panel.active>.metric-grid>*:nth-child(6){animation-delay:.2s}@keyframes rise-in{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:none}}@keyframes bar-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
@media(max-width:1200px){.current-overview{grid-template-columns:repeat(3,1fr)}.ring-card{grid-column:span 2}.metric-grid,.three-column{grid-template-columns:repeat(3,1fr)}}@media(max-width:1050px){.two-column,.trend-layout{grid-template-columns:1fr}.three-column{grid-template-columns:1fr 1fr}.three-column>:last-child:nth-child(odd){grid-column:1/-1}}@media(max-width:800px){.shell{padding:16px}.topbar,.section-heading{align-items:flex-start;flex-direction:column}.current-overview,.metric-grid,.two-column,.three-column{grid-template-columns:1fr}.three-column>:last-child:nth-child(odd){grid-column:auto}.ring-card{grid-column:auto}.filters{flex-direction:column}.filters select{width:100%}.footer{flex-direction:column}.tabs{width:100%}.tab{flex:1}.identity-list article{grid-template-columns:1fr auto}.identity-list .status-dots{grid-column:1/-1}.cluster-row{grid-template-columns:34px minmax(0,1fr)}.cluster-row>.decision-mark,.cluster-row>.pill{grid-column:2}}@media print{body{background:#fff}.header-actions,.tabs,.filters,.section-nav,.secondary-button{display:none}.tab-panel{display:block!important}.card,.metric-card,.ring-card{box-shadow:none;break-inside:avoid}.shell{max-width:none;padding:0}}
`;

export const REPORT_SCRIPT = `
(() => {
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const savedTheme = localStorage.getItem('decision-lab-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;

  const numberSelector = '.metric-card strong, .pass-ring strong, .cluster-count, .score';
  const parseNumber = (value) => Number(value.replace(/[^0-9.-]/g, '')) || 0;
  const findMetric = (panel, label) => Array.from(panel.querySelectorAll('.metric-card')).find((card) => card.querySelector('.metric-label')?.textContent.trim() === label);

  const animateNumbers = (scope) => {
    if (reducedMotion || !scope) return;
    scope.querySelectorAll(numberSelector).forEach((element) => {
      if (element.dataset.counted === 'true') return;
      const match = element.textContent.trim().match(/^([0-9,.]+)(.*)$/);
      if (!match) return;
      const target = Number(match[1].replaceAll(',', ''));
      if (!Number.isFinite(target)) return;
      element.dataset.counted = 'true';
      const suffix = match[2];
      const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0;
      const start = performance.now();
      const tick = (time) => {
        const progress = Math.min(1, (time - start) / 700);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = (target * eased).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };

  const setMetricBar = (card, value, total, description) => {
    const metricBar = card?.querySelector('.metric-bar');
    if (!metricBar || total <= 0) return;
    const percentage = Math.max(0, Math.min(100, (value / total) * 100));
    metricBar.replaceChildren();
    const track = document.createElement('div');
    track.className = 'bar-track';
    const fill = document.createElement('i');
    fill.style.width = percentage.toFixed(1) + '%';
    track.appendChild(fill);
    const caption = document.createElement('b');
    caption.textContent = percentage.toFixed(0) + '% ' + description;
    metricBar.append(track, caption);
    metricBar.hidden = false;
  };

  // The renderer embeds the report snapshot, including the label for whichever
  // engine produced the persisted decisions. Reading it here keeps metric-card
  // lookups and the insight copy in step with the rendered headings instead of
  // hardcoding one vendor's name.
  const decisionLabel = (() => {
    try {
      return JSON.parse(document.getElementById('report-data')?.textContent || '{}').decisionLabel || 'System One';
    } catch (error) {
      return 'System One';
    }
  })();

  const buildMetricBars = (panel) => {
    if (!panel) return;
    if (panel.id === 'panel-current') {
      const total = panel.querySelectorAll('.run-cell').length;
      for (const label of ['Passed', 'Failed', 'Skipped', 'Retry recovered', decisionLabel + ' decisions']) {
        const card = findMetric(panel, label);
        const value = parseNumber(card?.querySelector('strong')?.textContent || '0');
        setMetricBar(card, value, total, 'of executions');
      }
      return;
    }
    const executions = parseNumber(findMetric(panel, 'Test executions')?.querySelector('strong')?.textContent || '0');
    const identities = parseNumber(findMetric(panel, 'Logical tests')?.querySelector('strong')?.textContent || '0');
    setMetricBar(findMetric(panel, 'Test executions'), executions, executions, 'of stored executions');
    setMetricBar(findMetric(panel, 'Flaky tests'), parseNumber(findMetric(panel, 'Flaky tests')?.querySelector('strong')?.textContent || '0'), identities, 'of logical tests');
    setMetricBar(findMetric(panel, 'Failed executions'), parseNumber(findMetric(panel, 'Failed executions')?.querySelector('strong')?.textContent || '0'), executions, 'of executions');
    setMetricBar(findMetric(panel, decisionLabel + ' coverage'), parseNumber(findMetric(panel, decisionLabel + ' coverage')?.querySelector('strong')?.textContent || '0'), 100, 'decision coverage');
  };

  const setRingSeverity = (panel) => {
    const ring = panel?.querySelector('.pass-ring');
    if (!ring) return;
    const percentage = Number(ring.dataset.rate || '0');
    const colour = percentage < 50 ? 'var(--danger)' : percentage < 80 ? 'var(--warning)' : 'var(--success)';
    ring.style.setProperty('--pass-color', colour);
  };

  const buildCategoryChart = (panel) => {
    const container = panel?.querySelector('.category-chart');
    const pills = panel?.querySelectorAll('.cluster-row .pill.category');
    if (!container || !pills?.length) return;
    const counts = new Map();
    pills.forEach((pill) => {
      const label = pill.textContent.trim();
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const max = Math.max(...entries.map((entry) => entry[1]));
    container.replaceChildren(...entries.map(([label, count]) => {
      const row = document.createElement('div');
      row.className = 'category-chart-row';
      const name = document.createElement('span');
      name.className = 'category-chart-label';
      name.textContent = label.replaceAll('_', ' ');
      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('i');
      fill.style.width = ((count / max) * 100).toFixed(0) + '%';
      track.appendChild(fill);
      const total = document.createElement('b');
      total.textContent = String(count);
      row.append(name, track, total);
      return row;
    }));
    container.hidden = false;
  };

  const appendStrong = (parent, value) => {
    const strong = document.createElement('strong');
    strong.textContent = value;
    parent.appendChild(strong);
  };

  const buildInsight = (panel) => {
    if (!panel) return;
    const banner = panel.querySelector('.insight-banner');
    const copy = banner?.querySelector('p');
    if (!banner || !copy) return;
    copy.replaceChildren();
    if (panel.id === 'panel-current') {
      const cells = panel.querySelectorAll('.run-cell');
      if (!cells.length) return;
      const passed = panel.querySelectorAll('.run-cell.passed').length;
      const failed = panel.querySelectorAll('.run-cell.failed').length;
      const passRate = ((passed / cells.length) * 100).toFixed(1) + '% pass rate';
      appendStrong(copy, passRate);
      copy.append(' this run - ' + failed + ' of ' + cells.length + ' tests failed.');
      const firstCategory = panel.querySelector('.category-chart-row .category-chart-label');
      const firstCount = panel.querySelector('.category-chart-row b');
      if (firstCategory && firstCount) {
        copy.append(' The leading root cause is ');
        appendStrong(copy, firstCategory.textContent || 'unclassified');
        copy.append(' (' + firstCount.textContent + ' cluster' + (firstCount.textContent === '1' ? '' : 's') + ') - start triage there.');
      }
    } else {
      const passRate = findMetric(panel, 'Test executions')?.querySelector('.metric-detail')?.textContent.split(' ')[0] || '0%';
      const failed = findMetric(panel, 'Failed executions')?.querySelector('strong')?.textContent || '0';
      appendStrong(copy, passRate + ' historical pass rate');
      copy.append(' across the stored evidence, with ' + failed + ' failed executions.');
      const leadingCause = panel.querySelector('#historical-root-causes .distribution-row span');
      if (leadingCause) {
        copy.append(' The most frequent ' + decisionLabel + ' root-cause decision is ');
        appendStrong(copy, leadingCause.textContent || 'unclassified');
        copy.append('.');
      }
    }
    banner.hidden = false;
  };

  const colourFlakiness = (panel) => {
    panel?.querySelectorAll('.score').forEach((element) => {
      const value = Number(element.dataset.score || element.textContent.trim());
      element.style.color = value >= 55 ? 'var(--danger)' : value >= 25 ? 'var(--warning)' : 'var(--success)';
    });
  };

  const enhancePanel = (panel) => {
    buildMetricBars(panel);
    setRingSeverity(panel);
    buildCategoryChart(panel);
    buildInsight(panel);
    colourFlakiness(panel);
  };

  document.querySelectorAll('.tab-panel').forEach(enhancePanel);
  animateNumbers(document.getElementById('panel-current'));

  const themeToggle = document.getElementById('theme-toggle');
  themeToggle?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('decision-lab-theme', root.dataset.theme);
  });

  const activateImmediately = (name) => {
    document.querySelectorAll('.tab').forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      const active = panel.id === 'panel-' + name;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
      if (active) {
        panel.querySelectorAll(numberSelector).forEach((element) => delete element.dataset.counted);
        animateNumbers(panel);
      }
    });
  };

  const activate = (name) => {
    if (document.querySelector('.tab.active')?.dataset.tab === name) return;
    if (document.startViewTransition && !reducedMotion) document.startViewTransition(() => activateImmediately(name));
    else activateImmediately(name);
  };
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => activate(tab.dataset.tab)));

  const wireFilter = (prefix, rowSelector, stateAttribute) => {
    const search = document.getElementById(prefix + '-search');
    const state = document.getElementById(prefix + '-status');
    const counter = document.getElementById(prefix + '-count');
    if (!search || !state || !counter) return;
    const apply = () => {
      const query = search.value.trim().toLowerCase();
      const wanted = state.value;
      let visible = 0;
      document.querySelectorAll(rowSelector).forEach((row) => {
        const matchesText = !query || (row.dataset.search || '').includes(query);
        const matchesState = wanted === 'all' || row.dataset[stateAttribute] === wanted;
        row.hidden = !(matchesText && matchesState);
        if (!row.hidden) visible++;
      });
      counter.textContent = visible + ' tests';
    };
    search.addEventListener('input', apply);
    state.addEventListener('change', apply);
  };
  wireFilter('current', '[data-current-row]', 'status');
  wireFilter('history', '[data-history-row]', 'state');

  document.querySelectorAll('[data-scroll-test]').forEach((cell) => cell.addEventListener('click', () => {
    const row = document.getElementById('test-' + cell.dataset.scrollTest);
    row?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    if (row) {
      row.classList.add('row-flash');
      setTimeout(() => row.classList.remove('row-flash'), reducedMotion ? 0 : 1200);
    }
  }));

  document.getElementById('download-data')?.addEventListener('click', () => {
    const data = document.getElementById('report-data')?.textContent || '{}';
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'decision-lab-report.json';
    link.click();
    URL.revokeObjectURL(url);
  });

  const tooltip = document.getElementById('custom-tooltip');
  let tooltipTarget = null;
  const hideTooltip = () => {
    tooltip?.classList.remove('visible');
    tooltipTarget = null;
  };
  const showTooltip = (target) => {
    const label = target.getAttribute('title') || target.dataset.tooltip;
    if (!label || !tooltip) return;
    target.dataset.tooltip = label;
    target.removeAttribute('title');
    tooltipTarget = target;
    tooltip.textContent = label;
    tooltip.classList.add('visible');
  };
  document.addEventListener('pointerover', (event) => {
    const target = event.target.closest?.('[title],[data-tooltip]');
    if (target) showTooltip(target);
  });
  document.addEventListener('pointermove', (event) => {
    if (!tooltipTarget || !tooltip) return;
    const x = Math.min(innerWidth - tooltip.offsetWidth - 12, event.clientX + 14);
    const y = Math.min(innerHeight - tooltip.offsetHeight - 12, event.clientY + 14);
    tooltip.style.left = Math.max(8, x) + 'px';
    tooltip.style.top = Math.max(8, y) + 'px';
  });
  document.addEventListener('pointerout', (event) => {
    if (!tooltipTarget || tooltipTarget.contains(event.relatedTarget)) return;
    hideTooltip();
  });
  document.addEventListener('focusin', (event) => {
    const target = event.target.closest?.('[title],[data-tooltip]');
    if (target) showTooltip(target);
  });
  document.addEventListener('focusout', hideTooltip);

  document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    if (event.key === '1') activate('current');
    if (event.key === '2') activate('historical');
    if (event.key === '/') {
      event.preventDefault();
      document.querySelector('.tab-panel.active input[type=search]')?.focus();
    }
    if (event.key === 'Escape') hideTooltip();
  });
})();
`;
