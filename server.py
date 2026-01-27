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
from urllib.parse import urlparse, unquote
from pathlib import Path
import shutil

PORT = int(os.environ.get('PORT', '8000'))
DIRECTORIO_DATOS = os.environ.get('DATA_DIR', 'datos_mensuales')
ARCHIVO_DATOS_EDITADOS = os.environ.get('EDITADOS_PATH', 'datos_editados.json')

os.makedirs(DIRECTORIO_DATOS, exist_ok=True)

def diagnosticar_mes(nombre_hoja, mes):
    """Diagnosticar datos de un mes específico."""
    archivo = os.path.join(DIRECTORIO_DATOS, f'{nombre_hoja}_{mes}.json')
    if not os.path.exists(archivo):
        return {'error': f'Archivo no encontrado: {archivo}'}
    
    with open(archivo, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    diagnostico = {
        'archivo': archivo,
        'clientes_count': len(data.get('clientes', [])),
        'datos_generales_count': len(data.get('datos_generales', [])),
        'datos_diarios_generales_count': len(data.get('datos_diarios_generales', [])),
        'clientes': []
    }
    
    for idx, cliente in enumerate(data.get('clientes', [])):
        datos_diarios = cliente.get('datos_diarios', [])
        datos_con_fecha = [d for d in datos_diarios if d.get('fecha') and d.get('fecha') != 'FECHA']
        datos_con_saldo = [d for d in datos_con_fecha if isinstance(d.get('saldo_diario'), (int, float))]
        
        cliente_info = {
            'indice': idx,
            'numero_cliente': cliente.get('numero_cliente'),
            'saldo_inicial_mes': cliente.get('saldo_inicial_mes'),
            'incrementos_total': cliente.get('incrementos_total'),
            'decrementos_total': cliente.get('decrementos_total'),
            'datos_diarios_count': len(datos_diarios),
            'datos_con_fecha_count': len(datos_con_fecha),
            'datos_con_saldo_count': len(datos_con_saldo),
            'primera_fecha': datos_con_fecha[0].get('fecha') if datos_con_fecha else None,
            'ultima_fecha': datos_con_fecha[-1].get('fecha') if datos_con_fecha else None
        }
        diagnostico['clientes'].append(cliente_info)
    
    return diagnostico

def sincronizar_clientes_startup():
    """Sincronizar datos de clientes y arrastre de saldo en todos los meses al iniciar el servidor."""
    try:
        target = Path(DIRECTORIO_DATOS)
        archivos_wind = sorted(target.glob('Diario_WIND_2026-*.json'))
        
        if len(archivos_wind) == 0:
            return
        
        print("🔄 Sincronizando datos de clientes y arrastre de saldo...")
        
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
        
        # Aplicar datos de clientes y arrastre de saldo
        datos_meses = []
        for archivo in archivos_wind:
            with open(archivo, 'r', encoding='utf-8') as f:
                data = json.load(f)
            datos_meses.append((archivo, data))
        
        for i, (archivo, data) in enumerate(datos_meses):
            modificado = False
            
            # Sincronizar datos de clientes
            for idx, datos_correctos in clientes_por_indice.items():
                if idx < len(data.get('clientes', [])):
                    cliente = data['clientes'][idx]
                    if cliente.get('datos') != datos_correctos:
                        cliente['datos'] = datos_correctos.copy()
                        modificado = True
            
            # Sincronizar arrastre de saldo desde mes anterior
            if i > 0:
                _, data_anterior = datos_meses[i-1]
                for idx, cliente in enumerate(data.get('clientes', [])):
                    if idx < len(data_anterior.get('clientes', [])):
                        cliente_anterior = data_anterior['clientes'][idx]
                        
                        # Obtener saldo final del mes anterior
                        # PRIORIDAD: último saldo_diario > saldo_actual > 0
                        datos_diarios = cliente_anterior.get('datos_diarios', [])
                        saldos = [d.get('saldo_diario') for d in datos_diarios 
                                 if isinstance(d.get('saldo_diario'), (int, float))]
                        
                        # Usar el último saldo_diario si existe (incluso si es 0)
                        if len(saldos) > 0:
                            saldo_final_anterior = saldos[-1]
                        elif isinstance(cliente_anterior.get('saldo_actual'), (int, float)):
                            # Solo si NO hay datos_diarios, usar saldo_actual
                            saldo_final_anterior = cliente_anterior.get('saldo_actual')
                        else:
                            saldo_final_anterior = 0
                        
                        # Actualizar saldo_inicial_mes si es diferente
                        if cliente.get('saldo_inicial_mes') != saldo_final_anterior:
                            cliente['saldo_inicial_mes'] = saldo_final_anterior
                            modificado = True
            
            if modificado:
                with open(archivo, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        
        print(f"✅ Sincronización completada: {len(clientes_por_indice)} clientes, arrastre de saldo actualizado")
    except Exception as e:
        print(f"⚠️  Error sincronizando: {e}")

def seed_datos_if_empty():
    """Copiar archivos faltantes de datos_mensuales a DATA_DIR y sincronizar."""
    try:
        target = Path(DIRECTORIO_DATOS)
        target.mkdir(parents=True, exist_ok=True)
        
        source = Path(__file__).resolve().parent / 'datos_mensuales'
        if not source.exists() or not source.is_dir():
            print("⚠️  No se encontró carpeta datos_mensuales en el repo")
            return

        # Copiar TODOS los archivos que falten (no solo si está vacío)
        archivos_copiados = 0
        for p in source.glob('*.json'):
            if not p.is_file():
                continue
            target_file = target / p.name
            if not target_file.exists():
                print(f"📋 Copiando archivo faltante: {p.name}")
                shutil.copy2(p, target_file)
                archivos_copiados += 1
        
        if archivos_copiados > 0:
            print(f"✅ {archivos_copiados} archivos copiados a {target}")
        
        # Sincronizar clientes después de copiar
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
        if parsed.path == '/api/diagnostico_arrastre':
            return self.diagnostico_arrastre()
        if parsed.path == '/api/diagnostico_enero':
            return self.diagnostico_enero()
        if parsed.path == '/api/diagnostico_enero_general':
            return self.diagnostico_enero_general()
        if parsed.path.startswith('/api/diagnostico_mes/'):
            match = re.match(r'/api/diagnostico_mes/([^/]+)/(\d{4}-\d{2})', parsed.path)
            if match:
                hoja = match.group(1).replace('_', ' ')
                mes = match.group(2)
                return self.enviar_diagnostico_mes(hoja, mes)
        if parsed.path.startswith('/api/datos/'):
            decoded_path = unquote(parsed.path)
            # Soportar tanto YYYY-MM (mensual) como YYYY (anual)
            match = re.match(r'/api/datos/([^/]+)/(\d{4}(?:-\d{2})?)', decoded_path)
            if match:
                hoja = match.group(1).replace('_', ' ')
                mes = match.group(2)
                return self.enviar_datos_mes(hoja, mes)
        return super().do_GET()
    
    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/guardar/'):
            # Soportar tanto YYYY-MM (mensual) como YYYY (anual)
            match = re.match(r'/api/guardar/([^/]+)/(\d{4}(?:-\d{2})?)', parsed.path)
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

    def enviar_diagnostico_mes(self, hoja, mes):
        try:
            resultado = diagnosticar_mes(hoja, mes)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(resultado, ensure_ascii=False, indent=2).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
    
    def enviar_clientes_anuales(self):
        try:
            archivo = f"{DIRECTORIO_DATOS}/clientes_anuales_2026.json"
            if not os.path.exists(archivo):
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'No encontrado'}).encode('utf-8'))
                return
            with open(archivo, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
    
    def diagnostico_arrastre(self):
        try:
            resultado = {
                'enero': {},
                'febrero': {},
                'diagnostico': []
            }
            
            # Cargar enero
            archivo_enero = f"{DIRECTORIO_DATOS}/Diario_WIND_2026-01.json"
            if os.path.exists(archivo_enero):
                with open(archivo_enero, 'r', encoding='utf-8') as f:
                    enero = json.load(f)
                
                cliente1_enero = enero['clientes'][0] if len(enero.get('clientes', [])) > 0 else None
                if cliente1_enero:
                    datos_diarios = cliente1_enero.get('datos_diarios', [])
                    saldos = [d.get('saldo_diario') for d in datos_diarios if isinstance(d.get('saldo_diario'), (int, float))]
                    resultado['enero'] = {
                        'saldo_actual': cliente1_enero.get('saldo_actual'),
                        'ultimo_saldo_diario': saldos[-1] if saldos else None,
                        'total_saldos': len(saldos)
                    }
            
            # Cargar febrero
            archivo_febrero = f"{DIRECTORIO_DATOS}/Diario_WIND_2026-02.json"
            if os.path.exists(archivo_febrero):
                with open(archivo_febrero, 'r', encoding='utf-8') as f:
                    febrero = json.load(f)
                
                cliente1_febrero = febrero['clientes'][0] if len(febrero.get('clientes', [])) > 0 else None
                if cliente1_febrero:
                    resultado['febrero'] = {
                        'saldo_inicial_mes': cliente1_febrero.get('saldo_inicial_mes'),
                        'saldo_actual': cliente1_febrero.get('saldo_actual')
                    }
            
            # Diagnóstico
            if resultado['enero'] and resultado['febrero']:
                saldo_esperado = resultado['enero'].get('ultimo_saldo_diario') or resultado['enero'].get('saldo_actual') or 0
                saldo_real = resultado['febrero'].get('saldo_inicial_mes', 0)
                
                if saldo_esperado == saldo_real:
                    resultado['diagnostico'].append('✅ Arrastre correcto')
                else:
                    resultado['diagnostico'].append(f'❌ ERROR: Esperado {saldo_esperado}, Real {saldo_real}')
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(resultado, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
    
    def diagnostico_enero(self):
        try:
            resultado = {
                'clientes': []
            }
            
            # Cargar enero
            archivo_enero = f"{DIRECTORIO_DATOS}/Diario_WIND_2026-01.json"
            if not os.path.exists(archivo_enero):
                resultado['error'] = 'Archivo de enero no encontrado'
            else:
                with open(archivo_enero, 'r', encoding='utf-8') as f:
                    enero = json.load(f)
                
                # Analizar cada cliente
                for idx, cliente in enumerate(enero.get('clientes', [])):
                    datos = cliente.get('datos', {})
                    nombre = datos.get('NOMBRE', {}).get('valor', '') if isinstance(datos.get('NOMBRE'), dict) else ''
                    apellidos = datos.get('APELLIDOS', {}).get('valor', '') if isinstance(datos.get('APELLIDOS'), dict) else ''
                    nombre_completo = f"{nombre} {apellidos}".strip() or f"Cliente {idx+1}"
                    
                    # Obtener todos los días con saldo
                    datos_diarios = cliente.get('datos_diarios', [])
                    dias_con_saldo = []
                    for d in datos_diarios:
                        if isinstance(d.get('saldo_diario'), (int, float)):
                            dias_con_saldo.append({
                                'fila': d.get('fila'),
                                'fecha': d.get('fecha'),
                                'incremento': d.get('incremento'),
                                'decremento': d.get('decremento'),
                                'saldo_diario': d.get('saldo_diario')
                            })
                    
                    # Ordenar por fila
                    dias_con_saldo.sort(key=lambda x: x.get('fila', 0))
                    
                    resultado['clientes'].append({
                        'numero_cliente': cliente.get('numero_cliente'),
                        'nombre': nombre_completo,
                        'saldo_actual': cliente.get('saldo_actual'),
                        'saldo_inicial_mes': cliente.get('saldo_inicial_mes'),
                        'total_dias_con_saldo': len(dias_con_saldo),
                        'primer_dia': dias_con_saldo[0] if dias_con_saldo else None,
                        'ultimo_dia': dias_con_saldo[-1] if dias_con_saldo else None,
                        'todos_los_dias': dias_con_saldo
                    })
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(resultado, ensure_ascii=False, indent=2).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
    
    def diagnostico_enero_general(self):
        try:
            resultado = {
                'datos_generales': []
            }
            
            # Cargar enero
            archivo_enero = f"{DIRECTORIO_DATOS}/Diario_WIND_2026-01.json"
            if not os.path.exists(archivo_enero):
                resultado['error'] = 'Archivo de enero no encontrado'
            else:
                with open(archivo_enero, 'r', encoding='utf-8') as f:
                    enero = json.load(f)
                
                # Obtener datos generales
                datos_generales = enero.get('datos_diarios_generales', [])
                
                # Filtrar solo días 28, 29, 30, 31 (filas 42-45)
                for d in datos_generales:
                    fila = d.get('fila')
                    if fila in [42, 43, 44, 45]:
                        resultado['datos_generales'].append({
                            'fila': fila,
                            'fecha': d.get('fecha'),
                            'imp_inicial': d.get('imp_inicial'),
                            'imp_final': d.get('imp_final'),
                            'benef_euro': d.get('benef_euro'),
                            'benef_porcentaje': d.get('benef_porcentaje')
                        })
                
                # Ordenar por fila
                resultado['datos_generales'].sort(key=lambda x: x.get('fila', 0))
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(resultado, ensure_ascii=False, indent=2).encode('utf-8'))
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
                        # Para hojas anuales (IBI), el "mes" es el año completo
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
                                # PRIORIDAD: último saldo_diario > saldo_actual > 0
                                datos_diarios = cliente_actual.get('datos_diarios', [])
                                saldos = [d.get('saldo_diario') for d in datos_diarios 
                                         if isinstance(d.get('saldo_diario'), (int, float))]
                                
                                # Usar el último saldo_diario si existe (incluso si es 0)
                                if len(saldos) > 0:
                                    saldo_final = saldos[-1]
                                elif isinstance(cliente_actual.get('saldo_actual'), (int, float)):
                                    # Solo si NO hay datos_diarios, usar saldo_actual
                                    saldo_final = cliente_actual.get('saldo_actual')
                                else:
                                    saldo_final = 0
                                
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
