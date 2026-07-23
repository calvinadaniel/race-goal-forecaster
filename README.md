# Running Analysis

Personal Strava running dashboard with weekly mileage charts and Boston Marathon qualifying time projections.

Static frontend (Chart.js) + local Python pipeline. No backend required.

## Quick start

```bash
# Serve the dashboard (JSON fetch needs a local server)
python -m http.server 8000
# Open http://localhost:8000
```

## Data pipeline

### 1. Install dependencies

```bash
pip install -r scripts/requirements.txt
```

### 2. Strava credentials

```bash
cp scripts/.env.example scripts/.env
# Fill in STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET from https://www.strava.com/settings/api
```

Register redirect URI `http://localhost:8080/callback` on your Strava API app, then authorize once:

```bash
python scripts/strava_auth.py
```

### 3. Refresh data

```bash
python scripts/fetch_strava.py
python scripts/process.py
python scripts/project.py
```

Or on Windows, run `scripts/weekly_refresh.ps1` to fetch, process, project, and commit updated JSON.

### 4. Tests

```bash
cd scripts && pytest
```

## Project layout

```
├── index.html          # Dashboard
├── css/                # theme.css + dashboard.css
├── js/                 # theme-toggle.js + dashboard.js
├── data/               # Baked JSON (committed)
└── scripts/            # Strava fetch → aggregate → BQ projection
```

## Notes

Extracted from the [calvin-daniel](https://github.com/calvinadaniel) portfolio. The portfolio still hosts a copy at `/projects/running-analysis-app/`; this repo is the standalone home for further development.
