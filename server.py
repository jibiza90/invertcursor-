#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Servidor HTTP simple para servir la aplicación web del Diario VIP
Con guardado automático por mes para mayor velocidad
"""
import http.server
import socketserver
import os
import json
import threading
import re
from urllib.parse import urlparse
from pathlib import Path
import shutil

PORT = int(os.environ.get('PORT', '8000'))
DIRECTORIO_DATOS = os.environ.get('DATA_DIR', 'datos_mensuales')
ARCHIVO_DATOS_EDITADOS = os.environ.get('EDITADOS_PATH', 'datos_editados.json')

os.makedirs(DIRECTORIO_DATOS, exist_ok=True)

def seed_datos_if_empty():
    """If DATA_DIR points to a persistent disk and it's empty, seed it from the repo's datos_mensuales."""
    try:
        target = Path(DIRECTORIO_DATOS)
        target.mkdir(parents=True, exist_ok=True)
        has_json = any(p.suffix.lower() == '.json' for p in target.glob('*.json'))
        if has_json:
            return

        source = Path(__file__).resolve().parent / 'datos_mensuales'
        if not source.exists() or not source.is_dir():
            return

        for p in source.glob('*.json'):
            if not p.is_file():
                continue
            shutil.copy2(p, target / p.name)
    except Exception as e:
        print(f"⚠️  No se pudo inicializar DATA_DIR: {e}")

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/meses':
            return self.enviar_lista_meses()
        if parsed.path.startswith('/api/datos/'):
            match = re.match(r'/api/datos/([^/]+)/(\d{4}-\d{2})', parsed.path)
            if match:
                hoja = match.group(1).replace('_', ' ')
                mes = match.group(2)
                return self.enviar_datos_mes(hoja, mes)
        return super().do_GET()
    
    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/guardar/'):
            match = re.match(r'/api/guardar/([^/]+)/(\d{4}-\d{2})', parsed.path)
            if match:
                hoja = match.group(1).replace('_', ' ')
                mes = match.group(2)
                return self.guardar_datos_mes(hoja, mes)
        if parsed.path == '/guardar_datos':
            return self.guardar_datos_completo()
        self.send_response(404)
        self.end_headers()

    def enviar_lista_meses(self):
        try:
            meses_por_hoja = {}
            for archivo in os.listdir(DIRECTORIO_DATOS):
                if archivo.endswith('.json') and archivo != 'indice.json':
                    partes = archivo.replace('.json', '').rsplit('_', 1)
                    if len(partes) == 2:
                        hoja = partes[0].replace('_', ' ')
                        mes = partes[1]
                        meses_por_hoja.setdefault(hoja, []).append(mes)
            for hoja in meses_por_hoja:
                meses_por_hoja[hoja].sort()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(meses_por_hoja).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def enviar_datos_mes(self, hoja, mes):
        try:
            archivo = f"{DIRECTORIO_DATOS}/{hoja.replace(' ', '_')}_{mes}.json"
            if not os.path.exists(archivo):
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f'No hay datos para {hoja} {mes}'}).encode('utf-8'))
                return
            with open(archivo, 'r', encoding='utf-8') as f:
                datos = json.load(f)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(datos).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def guardar_datos_mes(self, hoja, mes):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            datos = json.loads(post_data.decode('utf-8'))
            archivo = f"{DIRECTORIO_DATOS}/{hoja.replace(' ', '_')}_{mes}.json"
            with open(archivo, 'w', encoding='utf-8') as f:
                json.dump(datos, f, ensure_ascii=False, separators=(',', ':'))
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))

    def guardar_datos_completo(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            datos = json.loads(post_data.decode('utf-8'))
            def guardar_async():
                try:
                    with open(ARCHIVO_DATOS_EDITADOS, 'w', encoding='utf-8') as f:
                        json.dump(datos, f, ensure_ascii=False, separators=(',', ':'))
                    print(f"✓ Datos completos guardados")
                except Exception as e:
                    print(f"✗ Error al guardar: {e}")
            threading.Thread(target=guardar_async, daemon=True).start()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))

    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    seed_datos_if_empty()
    
    with socketserver.TCPServer(("0.0.0.0", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🚀 Servidor iniciado en http://localhost:{PORT}")
        print(f"📂 Directorio: {os.getcwd()}")
        print(f"💾 Guardado automático: {ARCHIVO_DATOS_EDITADOS}")
        print(f"🌐 Abre tu navegador en: http://localhost:{PORT}/index.html")
        print("\nPresiona Ctrl+C para detener el servidor\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n⏹️  Servidor detenido")

if __name__ == "__main__":
    main()
