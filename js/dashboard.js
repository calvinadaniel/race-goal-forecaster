(async function () {
  /* ── Colour tokens ───────────────────────────────────── */
  const NAVY   = '#0D1B3E';
  const ORANGE = '#FF5910';
  const BLUE   = '#2D4B94';
  const GREEN  = '#2A9D5C';

  const isDark    = () => document.documentElement.classList.contains('dark');
  const gridColor = () => isDark() ? 'rgba(245,240,232,0.08)' : 'rgba(13,27,62,0.08)';
  const tickColor = () => isDark() ? 'rgba(245,240,232,0.5)'  : 'rgba(13,27,62,0.5)';
  const lblColor  = () => isDark() ? '#F5F0E8' : NAVY;

  function fmtPace(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function baseScales() {
    const tick = { color: tickColor(), font: { family: 'Space Mono', size: 10 } };
    const grid = { color: gridColor() };
    return { x: { grid, ticks: tick }, y: { grid, ticks: tick } };
  }

  function baseLegend() {
    return { labels: { color: lblColor(), font: { family: 'Space Mono', size: 10 } } };
  }

  function baseTooltip() {
    return {
      backgroundColor: isDark() ? 'rgba(0,20,65,0.92)'      : 'rgba(250,248,245,0.97)',
      titleColor:      isDark() ? '#F5F0E8'                  : 'rgb(0,26,77)',
      bodyColor:       isDark() ? 'rgba(245,247,250,0.75)'   : 'rgba(0,26,77,0.65)',
      borderColor:     isDark() ? 'rgba(245,247,250,0.12)'   : 'rgba(0,26,77,0.15)',
      borderWidth: 1,
    };
  }

  /* ── Load all data ───────────────────────────────────── */
  const [activities, monthly, weekly, projections] = await Promise.all([
    fetch('./data/activities.json').then(r => r.json()),
    fetch('./data/monthly.json').then(r => r.json()),
    fetch('./data/weekly.json').then(r => r.json()),
    fetch('./data/projections.json').then(r => r.json()),
  ]);

  /* ── Summary bar ─────────────────────────────────────── */
  const totalMiles = activities.reduce((s, a) => s + a.distance_miles, 0);
  const totalSec   = activities.reduce((s, a) => s + a.moving_time_sec, 0);
  const lastMonth  = monthly[monthly.length - 1];

  document.getElementById('stat-runs').textContent  = activities.length.toLocaleString();
  document.getElementById('stat-miles').textContent = Math.round(totalMiles).toLocaleString();
  document.getElementById('stat-time').textContent  = `${Math.floor(totalSec / 3600).toLocaleString()}h`;
  document.getElementById('stat-pace').textContent  = lastMonth?.avg_pace_display ?? '—';

  /* ── Chart 1: Pace Trend ─────────────────────────────── */
  const trendMap = Object.fromEntries(
    projections.historical_trend.dates.map((d, i) => [d, projections.historical_trend.paces_sec[i]])
  );

  new Chart(document.getElementById('chart-pace'), {
    type: 'line',
    data: {
      labels: monthly.map(m => m.month),
      datasets: [
        {
          label: 'Avg Pace',
          data: monthly.map(m => m.avg_pace_sec),
          borderColor: ORANGE,
          backgroundColor: 'rgba(255,89,16,0.08)',
          tension: 0.3,
          spanGaps: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Trend',
          data: monthly.map(m => trendMap[m.month] ?? null),
          borderColor: BLUE,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        ...baseScales(),
        y: {
          ...baseScales().y,
          reverse: true,
          ticks: { ...baseScales().y.ticks, callback: v => fmtPace(v) },
        },
      },
      plugins: {
        legend: baseLegend(),
        tooltip: { ...baseTooltip(), callbacks: { label: ctx => `${ctx.dataset.label}: ${fmtPace(ctx.parsed.y)}/mi` } },
      },
    },
  });

  /* ── Chart 2: HR Efficiency (Scatter) ────────────────── */
  const midIdx  = Math.floor(monthly.length / 2);
  const cutoff  = monthly[midIdx]?.month ?? '2025-06';
  const early   = monthly.filter(m => m.month <  cutoff && m.avg_hr && m.avg_pace_sec);
  const recent  = monthly.filter(m => m.month >= cutoff && m.avg_hr && m.avg_pace_sec);

  new Chart(document.getElementById('chart-hr'), {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: `Early (before ${cutoff})`,
          data: early.map(m => ({ x: m.avg_pace_sec, y: m.avg_hr })),
          backgroundColor: 'rgba(13,27,62,0.5)',
          pointRadius: 7,
        },
        {
          label: `Recent (${cutoff}+)`,
          data: recent.map(m => ({ x: m.avg_pace_sec, y: m.avg_hr })),
          backgroundColor: ORANGE,
          pointRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        ...baseScales(),
        x: {
          ...baseScales().x,
          title: { display: true, text: 'Avg Pace (sec/mi)', color: tickColor(), font: { family: 'Space Mono', size: 9 } },
          ticks: { ...baseScales().x.ticks, callback: v => fmtPace(v) },
        },
        y: {
          ...baseScales().y,
          title: { display: true, text: 'Avg HR (bpm)', color: tickColor(), font: { family: 'Space Mono', size: 9 } },
        },
      },
      plugins: {
        legend: baseLegend(),
        tooltip: { ...baseTooltip(), callbacks: { label: ctx => `Pace: ${fmtPace(ctx.parsed.x)}/mi  HR: ${ctx.parsed.y} bpm` } },
      },
    },
  });

  /* ── Chart 3: Weekly Volume (Bar) ────────────────────── */
  new Chart(document.getElementById('chart-volume'), {
    type: 'bar',
    data: {
      labels: weekly.map(w => w.week_start),
      datasets: [{
        label: 'Miles',
        data: weekly.map(w => w.miles),
        backgroundColor: 'rgba(45,75,148,0.65)',
        borderColor: BLUE,
        borderWidth: 1,
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        ...baseScales(),
        y: { ...baseScales().y, beginAtZero: true },
        x: { ...baseScales().x, ticks: { ...baseScales().x.ticks, maxTicksLimit: 8 } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { ...baseTooltip(), callbacks: { label: ctx => `${ctx.parsed.y} miles` } },
      },
    },
  });

  /* ── Chart 4: Relative Effort ────────────────────────── */
  const rolling = monthly.map((_, i) => {
    const window = monthly.slice(Math.max(0, i - 3), i + 1).filter(m => m.total_suffer > 0);
    return window.length ? Math.round(window.reduce((s, m) => s + m.total_suffer, 0) / window.length) : null;
  });

  new Chart(document.getElementById('chart-effort'), {
    type: 'line',
    data: {
      labels: monthly.map(m => m.month),
      datasets: [
        {
          label: 'Monthly Effort',
          data: monthly.map(m => m.total_suffer || null),
          borderColor: 'rgba(13,27,62,0.25)',
          backgroundColor: 'transparent',
          pointRadius: 3,
          tension: 0.2,
          spanGaps: true,
        },
        {
          label: '4-Month Avg',
          data: rolling,
          borderColor: ORANGE,
          pointRadius: 0,
          tension: 0.4,
          borderWidth: 2.5,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { ...baseScales(), y: { ...baseScales().y, beginAtZero: true } },
      plugins: { legend: baseLegend(), tooltip: { ...baseTooltip() } },
    },
  });

  /* ── Chart 5: BQ Projection ─────────────────────────── */
  const histDates = projections.historical_trend.dates;
  const histPaces = projections.historical_trend.paces_sec;
  const projDates = projections.scenarios[0].dates;
  const allDates  = [...histDates, ...projDates];

  const scenarioColors = { current: NAVY, consistent: BLUE, peak: GREEN };

  const scenarioDatasets = projections.scenarios.map(s => ({
    label: `${s.name} (BQ: ${s.bq_crossing_label})`,
    data: [...histDates.map(() => null), ...s.paces_sec],
    borderColor: scenarioColors[s.key],
    backgroundColor: 'transparent',
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.2,
    spanGaps: false,
  }));

  new Chart(document.getElementById('chart-bq'), {
    type: 'line',
    data: {
      labels: allDates,
      datasets: [
        {
          label: 'Actual Pace',
          data: [...histPaces, ...projDates.map(() => null)],
          borderColor: ORANGE,
          pointRadius: 3,
          tension: 0.3,
          borderWidth: 2,
          spanGaps: true,
        },
        {
          label: `BQ Target (${projections.bq_target_display}/mi)`,
          data: allDates.map(() => projections.bq_target_sec),
          borderColor: 'rgba(255,89,16,0.45)',
          borderDash: [10, 6],
          pointRadius: 0,
          borderWidth: 1.5,
          tension: 0,
        },
        ...scenarioDatasets,
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        ...baseScales(),
        y: {
          ...baseScales().y,
          reverse: true,
          ticks: { ...baseScales().y.ticks, callback: v => fmtPace(v) },
        },
        x: { ...baseScales().x, ticks: { ...baseScales().x.ticks, maxTicksLimit: 10 } },
      },
      plugins: {
        legend: baseLegend(),
        tooltip: {
          ...baseTooltip(),
          callbacks: { label: ctx => `${ctx.dataset.label.split(' (')[0]}: ${fmtPace(ctx.parsed.y)}/mi` },
        },
      },
    },
  });
})();
