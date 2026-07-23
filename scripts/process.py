import json
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

ROOT         = Path(__file__).parent.parent
INPUT_PATH   = ROOT / 'data' / 'activities.json'
MONTHLY_PATH = ROOT / 'data' / 'monthly.json'
WEEKLY_PATH  = ROOT / 'data' / 'weekly.json'


def pace_to_display(seconds):
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f'{m}:{s:02d}'


def aggregate_monthly(activities):
    buckets = defaultdict(lambda: {'paces': [], 'hrs': [], 'miles': 0.0, 'suffer': 0, 'count': 0})
    for a in activities:
        b = buckets[a['date'][:7]]
        if a.get('pace_sec_per_mile'):
            b['paces'].append(a['pace_sec_per_mile'])
        if a.get('avg_hr'):
            b['hrs'].append(a['avg_hr'])
        b['miles']  += a.get('distance_miles', 0)
        b['suffer'] += a.get('suffer_score') or 0
        b['count']  += 1

    result = []
    for month in sorted(buckets):
        b = buckets[month]
        avg_pace = sum(b['paces']) / len(b['paces']) if b['paces'] else None
        avg_hr   = sum(b['hrs'])   / len(b['hrs'])   if b['hrs']   else None
        hr_eff   = avg_hr / avg_pace if avg_hr and avg_pace else None
        result.append({
            'month':            month,
            'avg_pace_sec':     round(avg_pace, 1) if avg_pace else None,
            'avg_pace_display': pace_to_display(avg_pace) if avg_pace else None,
            'avg_hr':           round(avg_hr, 1) if avg_hr else None,
            'total_miles':      round(b['miles'], 1),
            'total_suffer':     b['suffer'],
            'hr_efficiency':    round(hr_eff, 4) if hr_eff else None,
            'run_count':        b['count'],
        })
    return result


def compute_weekly_volume(activities):
    weeks = defaultdict(float)
    for a in activities:
        dt = datetime.strptime(a['date'], '%Y-%m-%d')
        monday = dt - timedelta(days=dt.weekday())
        key = monday.strftime('%Y-%m-%d')
        weeks[key] += a.get('distance_miles', 0)
    return [{'week_start': k, 'miles': round(v, 1)} for k, v in sorted(weeks.items())]


def main():
    activities = json.loads(INPUT_PATH.read_text())
    monthly    = aggregate_monthly(activities)
    weekly     = compute_weekly_volume(activities)
    MONTHLY_PATH.write_text(json.dumps(monthly, indent=2))
    WEEKLY_PATH.write_text(json.dumps(weekly, indent=2))
    print(f'Monthly: {len(monthly)} months -> {MONTHLY_PATH}')
    print(f'Weekly:  {len(weekly)} weeks  -> {WEEKLY_PATH}')


if __name__ == '__main__':
    main()
