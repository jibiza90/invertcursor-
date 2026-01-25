#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verificar que el JSON generado tenga el patrón correcto
"""

import json
import sys
from datetime import datetime
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

hoja_vip = datos.get('hojas', {}).get('Diario VIP')
datos_diarios = hoja_vip.get('datos_diarios_generales', [])

# Agrupar por fecha
fechas_agrupadas = defaultdict(list)
for dato in datos_diarios[:30]:
    fecha = dato.get('fecha')
    if fecha:
        fecha_str = str(fecha).split()[0] if ' ' in str(fecha) else str(fecha)
        fechas_agrupadas[fecha_str].append(dato)

print("="*80)
print("VERIFICACIÓN DEL PATRÓN EN JSON GENERADO")
print("="*80)

for fecha_str, datos_dia in sorted(fechas_agrupadas.items())[:3]:
    datos_dia_ordenados = sorted(datos_dia, key=lambda x: x.get('fila', 0))
    print(f"\n{'='*80}")
    print(f"Fecha: {fecha_str}")
    print(f"Total filas: {len(datos_dia_ordenados)}")
    print(f"{'='*80}")
    
    for idx, dato in enumerate(datos_dia_ordenados, 1):
        fila = dato.get('fila')
        bloqueadas = dato.get('bloqueadas', {})
        print(f"\n  Fila {fila} (posición {idx} del día):")
        print(f"    IMP_FINAL: {'🔒 BLOQUEADA' if bloqueadas.get('imp_final') else '✏️ EDITABLE'}")
        print(f"    BENEF_EURO: {'🔒 BLOQUEADA' if bloqueadas.get('benef_euro') else '✏️ EDITABLE'}")
        print(f"    BENEF_PORCENTAJE: {'🔒 BLOQUEADA' if bloqueadas.get('benef_porcentaje') else '✏️ EDITABLE'}")
        print(f"    BENEF_EURO_ACUM: {'🔒 BLOQUEADA' if bloqueadas.get('benef_euro_acum') else '✏️ EDITABLE'}")
        print(f"    BENEF_PORCENTAJE_ACUM: {'🔒 BLOQUEADA' if bloqueadas.get('benef_porcentaje_acum') else '✏️ EDITABLE'}")
