import json
from datetime import datetime
from pathlib import Path

from dateutil.relativedelta import relativedelta
from scipy import stats

ROOT         = Path(__file__).parent.parent
MONTHLY_PATH = ROOT / 'data' / 'monthly.json'
OUTPUT_PATH  = ROOT / 'data' / 'projections.json'

BQ_TARGET_SEC  = 423   # 7:03/mi ≈ 3:05:00 marathon pace
PACE_FLOOR_SEC = 390   # 6:30/mi — realistic improvement ceiling

SCENARIOS = {
    'current':    (1.00, 'Current Trajectory'),
    'consistent': (1.25, 'Consistent Training'),
    'peak':       (1.50, 'Peak Training'),
}


def pace_to_display(seconds):
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f'{m}:{s:02d}'


def fit_regression(monthly):
    valid = [(i, m['avg_pace_sec']) for i, m in enumerate(monthly) if m.get('avg_pace_sec')]
    if len(valid) < 3:
        raise ValueError('Need at least 3 months of pace data for regression')
    xs, ys = zip(*valid)
    slope, intercept, r_value, _, _ = stats.linregress(xs, ys)
    if slope >= 0:
        slope = -0.5  # guarantee meaningful projection even for flat runners
    return float(slope), float(intercept), float(r_value)


def project_scenario(last_pace, slope, num_months=36):
    return [max(last_pace + slope * i, float(PACE_FLOOR_SEC)) for i in range(1, num_months + 1)]


def find_bq_crossing(paces, start_month_str):
    start = datetime.strptime(start_month_str, '%Y-%m')
    for i, pace in enumerate(paces):
        if pace <= BQ_TARGET_SEC:
            return (start + relativedelta(months=i + 1)).strftime('%Y-%m')
    return None


def generate_month_labels(start_month_str, num_months=36):
    start = datetime.strptime(start_month_str, '%Y-%m')
    return [(start + relativedelta(months=i + 1)).strftime('%Y-%m') for i in range(num_months)]


def build_historical_trend(monthly, slope, intercept):
    valid = [(i, m['month']) for i, m in enumerate(monthly) if m.get('avg_pace_sec')]
    return {
        'dates':     [month for _, month in valid],
        'paces_sec': [round(intercept + slope * i, 1) for i, _ in valid],
    }


def main():
    monthly = json.loads(MONTHLY_PATH.read_text())
    slope, intercept, r_value = fit_regression(monthly)

    last = next(m for m in reversed(monthly) if m.get('avg_pace_sec'))
    last_pace    = last['avg_pace_sec']
    last_month   = last['month']
    month_labels = generate_month_labels(last_month)

    scenarios = []
    for key, (multiplier, label) in SCENARIOS.items():
        adj_slope = slope * multiplier
        paces     = project_scenario(last_pace, adj_slope)
        crossing  = find_bq_crossing(paces, last_month)
        scenarios.append({
            'name':                label,
            'key':                 key,
            'slope_sec_per_month': round(adj_slope, 3),
            'paces_sec':           [round(p, 1) for p in paces],
            'paces_display':       [pace_to_display(p) for p in paces],
            'dates':               month_labels,
            'bq_crossing_date':    crossing,
            'bq_crossing_label':   (
                datetime.strptime(crossing, '%Y-%m').strftime('%b %Y')
                if crossing else 'Not reached in 3 years'
            ),
        })

    output = {
        'generated_at':         datetime.now().strftime('%Y-%m-%d'),
        'bq_target_sec':        BQ_TARGET_SEC,
        'bq_target_display':    pace_to_display(BQ_TARGET_SEC),
        'current_pr_display':   '3:54:23',
        'regression_r_squared': round(r_value ** 2, 3),
        'slope_sec_per_month':  round(slope, 3),
        'last_month':           last_month,
        'last_pace_sec':        round(last_pace, 1),
        'last_pace_display':    pace_to_display(last_pace),
        'month_labels':         month_labels,
        'historical_trend':     build_historical_trend(monthly, slope, intercept),
        'scenarios':            scenarios,
    }

    OUTPUT_PATH.write_text(json.dumps(output, indent=2))
    print(f'Projections -> {OUTPUT_PATH}')
    for s in scenarios:
        print(f"  {s['name']:25s}  BQ: {s['bq_crossing_label']}")


if __name__ == '__main__':
    main()
