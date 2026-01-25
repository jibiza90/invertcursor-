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

def sincronizar_clientes_startup():
    """Sincronizar datos de clientes en todos los meses al iniciar el servidor."""
    try:
        target = Path(DIRECTORIO_DATOS)
        archivos_wind = sorted(target.glob('Diario_WIND_2026-*.json'))
        
        if len(archivos_wind) == 0:
            return
        
        print("🔄 Sincronizando datos de clientes en todos los meses...")
        
        # Recopilar datos de clientes
        clientes_por_indice = {}
        for archivo in archivos_wind:
            with open(archivo, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for idx, cliente in enumerate(data.get('clientes', [])):
                if idx not in clientes_por_indice:
                    datos = cliente.get('datos', {})
                    if datos:
                        clientes_por_indice[idx] = datos
        
        # Aplicar a todos los meses
        for archivo in archivos_wind:
            with open(archivo, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            modificado = False
            for idx, datos_correctos in clientes_por_indice.items():
                if idx < len(data.get('clientes', [])):
                    cliente = data['clientes'][idx]
                    if cliente.get('datos') != datos_correctos:
                        cliente['datos'] = datos_correctos.copy()
                        modificado = True
            
            if modificado:
                with open(archivo, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        
        print(f"✅ Sincronización completada: {len(clientes_por_indice)} clientes")
    except Exception as e:
        print(f"⚠️  Error sincronizando clientes: {e}")

def seed_datos_if_empty():
    """If DATA_DIR points to a persistent disk and it's empty, seed it from the repo's datos_mensuales."""
    try:
        target = Path(DIRECTORIO_DATOS)
        target.mkdir(parents=True, exist_ok=True)
        has_json = any(p.suffix.lower() == '.json' for p in target.glob('*.json'))
        if has_json:
            # Si ya hay datos, sincronizar clientes
            sincronizar_clientes_startup()
            return

        source = Path(__file__).resolve().parent / 'datos_mensuales'
        if not source.exists() or not source.is_dir():
            return

        for p in source.glob('*.json'):
            if not p.is_file():
                continue
            shutil.copy2(p, target / p.name)
        
        # Después de copiar, sincronizar
        sincronizar_clientes_startup()
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
        if parsed.path == '/api/clientes_anuales':
            return self.enviar_clientes_anuales()
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
        if parsed.path == '/api/sincronizar_clientes':
            return self.sincronizar_clientes_todos_meses()
        if parsed.path == '/guardar_datos':
            return self.guardar_datos_completo()
        self.send_response(404)
        self.end_headers()

    def enviar_clientes_anuales(self):
        try:
            archivo = f"{DIRECTORIO_DATOS}/clientes_anuales_2026.json"
            if not os.path.exists(archivo):
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'No hay clientes anuales'}).encode('utf-8'))
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

    def sincronizar_clientes_todos_meses(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))
            
            hoja = payload.get('hoja', 'Diario WIND')
            clientes_datos = payload.get('clientes', [])
            
            # Sincronizar datos de clientes en TODOS los meses
            archivos_modificados = 0
            for archivo in os.listdir(DIRECTORIO_DATOS):
                if not archivo.endswith('.json'):
                    continue
                if not archivo.startswith(hoja.replace(' ', '_')):
                    continue
                if 'clientes_anuales' in archivo:
                    continue
                
                ruta = f"{DIRECTORIO_DATOS}/{archivo}"
                with open(ruta, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                modificado = False
                for idx, datos_cliente in enumerate(clientes_datos):
                    if idx < len(data.get('clientes', [])):
                        cliente_actual = data['clientes'][idx]
                        # Solo actualizar datos (nombre, apellidos), NO movimientos
                        if cliente_actual.get('datos') != datos_cliente:
                            cliente_actual['datos'] = datos_cliente
                            modificado = True
                
                if modificado:
                    with open(ruta, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
                    archivos_modificados += 1
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': True,
                'archivos_modificados': archivos_modificados
            }).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))

    def guardar_datos_mes(self, hoja, mes):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            datos = json.loads(post_data.decode('utf-8'))
            archivo = f"{DIRECTORIO_DATOS}/{hoja.replace(' ', '_')}_{mes}.json"
            with open(archivo, 'w', encoding='utf-8') as f:
                json.dump(datos, f, ensure_ascii=False, separators=(',', ':'))
            
            # SINCRONIZAR datos de clientes en todos los meses automáticamente
            try:
                clientes_datos = [c.get('datos', {}) for c in datos.get('clientes', [])]
                for archivo_mes in os.listdir(DIRECTORIO_DATOS):
                    if not archivo_mes.endswith('.json'):
                        continue
                    if not archivo_mes.startswith(hoja.replace(' ', '_')):
                        continue
                    if 'clientes_anuales' in archivo_mes:
                        continue
                    if archivo_mes == f"{hoja.replace(' ', '_')}_{mes}.json":
                        continue  # Skip el mes actual
                    
                    ruta = f"{DIRECTORIO_DATOS}/{archivo_mes}"
                    with open(ruta, 'r', encoding='utf-8') as f:
                        data_mes = json.load(f)
                    
                    modificado = False
                    for idx, datos_cliente in enumerate(clientes_datos):
                        if idx < len(data_mes.get('clientes', [])):
                            cliente_actual = data_mes['clientes'][idx]
                            if cliente_actual.get('datos') != datos_cliente:
                                cliente_actual['datos'] = datos_cliente
                                modificado = True
                    
                    if modificado:
                        with open(ruta, 'w', encoding='utf-8') as f:
                            json.dump(data_mes, f, ensure_ascii=False, separators=(',', ':'))
            except Exception as sync_error:
                print(f"⚠️ Error sincronizando clientes: {sync_error}")
            
            # ACTUALIZAR saldo_inicial_mes del mes siguiente
            try:
                # Obtener lista de meses ordenados
                archivos_hoja = sorted([f for f in os.listdir(DIRECTORIO_DATOS) 
                                       if f.startswith(hoja.replace(' ', '_')) 
                                       and f.endswith('.json')
                                       and 'clientes_anuales' not in f])
                
                # Encontrar el mes siguiente
                archivo_actual = f"{hoja.replace(' ', '_')}_{mes}.json"
                if archivo_actual in archivos_hoja:
                    idx_actual = archivos_hoja.index(archivo_actual)
                    if idx_actual < len(archivos_hoja) - 1:
                        archivo_siguiente = archivos_hoja[idx_actual + 1]
                        ruta_siguiente = f"{DIRECTORIO_DATOS}/{archivo_siguiente}"
                        
                        # Cargar mes siguiente
                        with open(ruta_siguiente, 'r', encoding='utf-8') as f:
                            data_siguiente = json.load(f)
                        
                        # Actualizar saldo_inicial_mes de cada cliente
                        modificado_siguiente = False
                        for idx, cliente_actual in enumerate(datos.get('clientes', [])):
                            if idx < len(data_siguiente.get('clientes', [])):
                                # Obtener saldo final del mes actual
                                datos_diarios = cliente_actual.get('datos_diarios', [])
                                saldos = [d.get('saldo_diario') for d in datos_diarios 
                                         if isinstance(d.get('saldo_diario'), (int, float))]
                                saldo_final = saldos[-1] if saldos else 0
                                
                                # Actualizar saldo_inicial_mes del mes siguiente
                                cliente_siguiente = data_siguiente['clientes'][idx]
                                if cliente_siguiente.get('saldo_inicial_mes') != saldo_final:
                                    cliente_siguiente['saldo_inicial_mes'] = saldo_final
                                    modificado_siguiente = True
                        
                        if modificado_siguiente:
                            with open(ruta_siguiente, 'w', encoding='utf-8') as f:
                                json.dump(data_siguiente, f, ensure_ascii=False, separators=(',', ':'))
                            print(f"✅ Saldo inicial actualizado en mes siguiente")
            except Exception as saldo_error:
                print(f"⚠️ Error actualizando saldo inicial: {saldo_error}")
            
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
