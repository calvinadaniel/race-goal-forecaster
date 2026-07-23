import os
import json
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')

CLIENT_ID     = os.getenv('STRAVA_CLIENT_ID')
CLIENT_SECRET = os.getenv('STRAVA_CLIENT_SECRET')
REFRESH_TOKEN = os.getenv('STRAVA_REFRESH_TOKEN')

START_AFTER = int(datetime(2024, 9, 1).timestamp())
OUTPUT_PATH = Path(__file__).parent.parent / 'data' / 'activities.json'


def get_access_token():
    resp = requests.post('https://www.strava.com/oauth/token', data={
        'client_id':     CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'refresh_token': REFRESH_TOKEN,
        'grant_type':    'refresh_token',
    })
    resp.raise_for_status()
    return resp.json()['access_token']


def fetch_all_activities(token):
    activities, page = [], 1
    headers = {'Authorization': f'Bearer {token}'}
    while True:
        resp = requests.get(
            'https://www.strava.com/api/v3/athlete/activities',
            headers=headers,
            params={'per_page': 200, 'page': page, 'after': START_AFTER},
        )
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        activities.extend(batch)
        page += 1
    return activities


def clean_activity(a):
    sport = a.get('sport_type') or a.get('type', '')
    if sport != 'Run':
        return None
    dist_m = a.get('distance', 0)
    if dist_m < 100:
        return None
    dist_mi = dist_m / 1609.344
    moving_sec = a['moving_time']
    pace = moving_sec / dist_mi if dist_mi > 0 else None
    return {
        'id':                a['id'],
        'date':              a['start_date_local'][:10],
        'distance_miles':    round(dist_mi, 2),
        'moving_time_sec':   moving_sec,
        'pace_sec_per_mile': round(pace, 1) if pace else None,
        'avg_hr':            a.get('average_heartrate'),
        'max_hr':            a.get('max_heartrate'),
        'suffer_score':      a.get('suffer_score'),
    }


def main():
    print('Refreshing access token...')
    token = get_access_token()
    print('Fetching activities...')
    raw = fetch_all_activities(token)
    cleaned = [c for a in raw if (c := clean_activity(a)) is not None]
    cleaned.sort(key=lambda x: x['date'])
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(cleaned, indent=2))
    print(f'Saved {len(cleaned)} runs -> {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
