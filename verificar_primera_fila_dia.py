#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verificar qué filas tienen la misma fecha y cuál es la primera de cada día
"""

import json
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

hoja_vip = datos.get('hojas', {}).get('Diario VIP')
datos_diarios = hoja_vip.get('datos_diarios_generales', [])

print("="*80)
print("VERIFICANDO PRIMERA FILA DE CADA DÍA")
print("="*80)

# Agrupar por fecha
fechas_agrupadas = {}
for dato in datos_diarios[:30]:  # Primeras 30 filas
    fecha = dato.get('fecha')
    fila = dato.get('fila')
    if fecha:
        fecha_str = str(fecha)
        if fecha_str not in fechas_agrupadas:
            fechas_agrupadas[fecha_str] = []
        fechas_agrupadas[fecha_str].append(fila)

for fecha_str, filas in sorted(fechas_agrupadas.items()):
    filas_ordenadas = sorted(filas)
    primera_fila = filas_ordenadas[0]
    print(f"\nFecha: {fecha_str}")
    print(f"  Filas: {filas_ordenadas}")
    print(f"  Primera fila del día: {primera_fila}")
    print(f"  Otras filas del mismo día: {filas_ordenadas[1:]}")
