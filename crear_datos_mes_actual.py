#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script rápido para crear datos del mes actual (enero 2026)
"""
import json
import os

print("Cargando datos_completos.json...")
with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

os.makedirs('datos_mensuales', exist_ok=True)

# Solo procesar enero 2026 para empezar rápido
MES_ACTUAL = '2026-01'

for nombre_hoja, hoja in datos['hojas'].items():
    print(f"Procesando {nombre_hoja}...")
    
    datos_mes = {
        'datos_generales': hoja.get('datos_generales', []),
        'datos_diarios_generales': [],
        'clientes': []
    }
    
    # Filtrar datos_diarios_generales del mes
    for dato in hoja.get('datos_diarios_generales', []):
        fecha = dato.get('fecha', '')
        if fecha and fecha.startswith(MES_ACTUAL):
            datos_mes['datos_diarios_generales'].append(dato)
    
    # Filtrar clientes
    for cliente in hoja.get('clientes', []):
        cliente_mes = {
            'numero_cliente': cliente.get('numero_cliente'),
            'datos': cliente.get('datos', {}),
            'incrementos_total': cliente.get('incrementos_total', 0),
            'decrementos_total': cliente.get('decrementos_total', 0),
            'saldo_actual': cliente.get('saldo_actual'),
            'datos_diarios': []
        }
        
        for dato in cliente.get('datos_diarios', []):
            fecha = dato.get('fecha', '')
            if fecha and fecha.startswith(MES_ACTUAL):
                cliente_mes['datos_diarios'].append(dato)
        
        datos_mes['clientes'].append(cliente_mes)
    
    # Guardar
    archivo = f"datos_mensuales/{nombre_hoja.replace(' ', '_')}_{MES_ACTUAL}.json"
    with open(archivo, 'w', encoding='utf-8') as f:
        json.dump(datos_mes, f, ensure_ascii=False, separators=(',', ':'))
    
    tamanio = os.path.getsize(archivo) / 1024
    print(f"  ✓ {archivo} ({tamanio:.1f} KB)")

print("\n✅ Datos de enero 2026 creados!")
