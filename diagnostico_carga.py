import json
import sys
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

BASE_URL = 'http://localhost:8000'

def fetch(url):
    req = Request(url, headers={'Cache-Control': 'no-cache'})
    with urlopen(req, timeout=5) as resp:
        data = resp.read()
        return resp.status, data

def main():
    print('== Diagnóstico de carga ==')
    try:
        status, data = fetch(f'{BASE_URL}/index.html')
        print(f'index.html: {status}, bytes={len(data)}')
    except Exception as e:
        print('index.html: ERROR', e)
        sys.exit(1)

    try:
        status, data = fetch(f'{BASE_URL}/app.js')
        print(f'app.js: {status}, bytes={len(data)}')
    except Exception as e:
        print('app.js: ERROR', e)

    try:
        status, data = fetch(f'{BASE_URL}/api/meses')
        print(f'/api/meses: {status}')
        meses = json.loads(data.decode('utf-8'))
        print('meses disponibles:', meses)
    except Exception as e:
        print('/api/meses: ERROR', e)
        meses = {}

    if isinstance(meses, dict):
        for hoja, lista in meses.items():
            if not lista:
                continue
            mes = lista[0]
            url = f"{BASE_URL}/api/datos/{hoja.replace(' ', '_')}/{mes}"
            try:
                status, data = fetch(url)
                print(f'{url}: {status}, bytes={len(data)}')
            except Exception as e:
                print(f'{url}: ERROR', e)

if __name__ == '__main__':
    main()
