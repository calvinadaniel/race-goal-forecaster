"""
One-time Strava OAuth authorization script.
Runs a local HTTP server, opens the Strava auth page, catches the callback,
exchanges the code for tokens, and writes STRAVA_REFRESH_TOKEN to scripts/.env
"""
import os
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import requests
from dotenv import load_dotenv, set_key

ENV_PATH = Path(__file__).parent / '.env'
load_dotenv(ENV_PATH)

CLIENT_ID     = os.getenv('STRAVA_CLIENT_ID')
CLIENT_SECRET = os.getenv('STRAVA_CLIENT_SECRET')

REDIRECT_URI  = 'http://localhost:8080/callback'
SCOPE         = 'activity:read_all'
AUTH_URL = (
    f'https://www.strava.com/oauth/authorize'
    f'?client_id={CLIENT_ID}'
    f'&response_type=code'
    f'&redirect_uri={REDIRECT_URI}'
    f'&approval_prompt=force'
    f'&scope={SCOPE}'
)

received_code = None


class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global received_code
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        if 'code' in params:
            received_code = params['code'][0]
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<h2>Authorization successful! You can close this tab.</h2>')
        else:
            error = params.get('error', ['unknown'])[0]
            self.send_response(400)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(f'<h2>Authorization failed: {error}</h2>'.encode())
        threading.Thread(target=self.server.shutdown).start()

    def log_message(self, *args):
        pass  # silence request logs


def exchange_code(code):
    resp = requests.post('https://www.strava.com/oauth/token', data={
        'client_id':     CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'code':          code,
        'grant_type':    'authorization_code',
    })
    resp.raise_for_status()
    return resp.json()


def main():
    print(f'Starting local server on {REDIRECT_URI} ...')
    print()
    print('IMPORTANT: Make sure your Strava app has this redirect URI registered:')
    print(f'  {REDIRECT_URI}')
    print()
    print('Opening browser for Strava authorization...')

    server = HTTPServer(('localhost', 8080), CallbackHandler)
    webbrowser.open(AUTH_URL)

    print('Waiting for Strava callback...')
    server.serve_forever()

    if not received_code:
        print('No authorization code received. Aborting.')
        return

    print('Exchanging authorization code for tokens...')
    tokens = exchange_code(received_code)

    refresh_token = tokens['refresh_token']
    access_token  = tokens['access_token']
    scope         = tokens.get('scope', '')
    athlete       = tokens.get('athlete', {}).get('username', 'unknown')

    print(f'Authorized as: {athlete}')
    print(f'Scope granted: {scope}')

    set_key(str(ENV_PATH), 'STRAVA_REFRESH_TOKEN', refresh_token)
    print(f'Saved new STRAVA_REFRESH_TOKEN to {ENV_PATH}')
    print()
    print('Done! You can now run: python scripts/fetch_strava.py')


if __name__ == '__main__':
    main()
