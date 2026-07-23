import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from project import (
    fit_regression, project_scenario, find_bq_crossing,
    generate_month_labels, pace_to_display,
    BQ_TARGET_SEC, PACE_FLOOR_SEC,
)


def _monthly(paces):
    months = ['2024-09', '2024-10', '2024-11', '2024-12', '2025-01', '2025-02']
    return [{'month': months[i], 'avg_pace_sec': p} for i, p in enumerate(paces)]


def test_pace_to_display():
    assert pace_to_display(423) == '7:03'
    assert pace_to_display(390) == '6:30'
    assert pace_to_display(535) == '8:55'


def test_fit_regression_negative_slope_for_improving_runner():
    slope, _, _ = fit_regression(_monthly([540, 535, 530, 525, 520, 515]))
    assert slope < 0


def test_fit_regression_slope_magnitude():
    slope, _, _ = fit_regression(_monthly([540, 535, 530, 525, 520, 515]))
    assert abs(slope - (-5)) < 1.0


def test_fit_regression_requires_three_months():
    with pytest.raises(ValueError, match='at least 3 months'):
        fit_regression(_monthly([540, 535])[:2])


def test_fit_regression_flat_slope_clamped_to_negative():
    # flat runner — slope should still be negative (minimal improvement assumption)
    slope, _, _ = fit_regression(_monthly([540, 540, 540, 540, 540, 540]))
    assert slope < 0


def test_project_scenario_length():
    assert len(project_scenario(500, -3, num_months=36)) == 36


def test_project_scenario_improves_over_time():
    paces = project_scenario(500, -3, num_months=5)
    assert paces[0] < 500
    assert paces[-1] < paces[0]


def test_project_scenario_respects_floor():
    paces = project_scenario(400, -5, num_months=36)
    assert all(p >= PACE_FLOOR_SEC for p in paces)


def test_find_bq_crossing_found():
    # paces[3]=421 is first value at or below BQ_TARGET_SEC (423)
    paces = [430, 427, 424, 421]
    crossing = find_bq_crossing(paces, '2025-01')
    assert crossing == '2025-05'  # index 3 → start + 4 months


def test_find_bq_crossing_not_found():
    assert find_bq_crossing([500, 498, 496], '2025-01') is None


def test_generate_month_labels_sequence():
    assert generate_month_labels('2025-01', num_months=3) == ['2025-02', '2025-03', '2025-04']


def test_bq_target_constant():
    assert BQ_TARGET_SEC == 423


def test_pace_floor_constant():
    assert PACE_FLOOR_SEC == 390
