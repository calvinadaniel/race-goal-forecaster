import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from process import pace_to_display, aggregate_monthly, compute_weekly_volume


def test_pace_to_display_whole_minutes():
    assert pace_to_display(480) == '8:00'


def test_pace_to_display_with_seconds():
    assert pace_to_display(535) == '8:55'


def test_pace_to_display_single_digit_seconds():
    assert pace_to_display(481) == '8:01'


def _acts(*rows):
    return [
        {'date': d, 'pace_sec_per_mile': p, 'avg_hr': h,
         'distance_miles': mi, 'suffer_score': s}
        for d, p, h, mi, s in rows
    ]


def test_aggregate_monthly_groups_correctly():
    acts = _acts(
        ('2024-09-10', 540.0, 150, 5.0, 40),
        ('2024-09-17', 530.0, 148, 6.0, 45),
        ('2024-10-05', 520.0, 145, 7.0, 50),
    )
    result = aggregate_monthly(acts)
    assert len(result) == 2
    assert result[0]['month'] == '2024-09'
    assert result[0]['avg_pace_sec'] == 535.0
    assert result[0]['total_miles'] == 11.0
    assert result[0]['run_count'] == 2
    assert result[1]['month'] == '2024-10'


def test_aggregate_monthly_skips_null_pace():
    acts = _acts(
        ('2024-09-10', None, 150, 5.0, 40),
        ('2024-09-17', 530.0, 148, 6.0, 45),
    )
    result = aggregate_monthly(acts)
    assert result[0]['avg_pace_sec'] == 530.0
    assert result[0]['run_count'] == 2


def test_aggregate_monthly_hr_efficiency():
    acts = _acts(('2024-09-10', 500.0, 150.0, 5.0, 40))
    result = aggregate_monthly(acts)
    assert result[0]['hr_efficiency'] == round(150.0 / 500.0, 4)


def test_aggregate_monthly_null_suffer_handled():
    acts = [{'date': '2024-09-10', 'pace_sec_per_mile': 530.0,
             'avg_hr': 148, 'distance_miles': 5.0, 'suffer_score': None}]
    result = aggregate_monthly(acts)
    assert result[0]['total_suffer'] == 0


def test_compute_weekly_volume_groups_by_week():
    acts = [
        {'date': '2024-09-02', 'distance_miles': 5.0},
        {'date': '2024-09-03', 'distance_miles': 3.0},
        {'date': '2024-09-09', 'distance_miles': 6.0},
    ]
    result = compute_weekly_volume(acts)
    assert len(result) == 2
    assert result[0]['miles'] == 8.0
    assert result[1]['miles'] == 6.0
