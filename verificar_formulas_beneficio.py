#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verificar qué fórmulas tienen benef_euro, benef_porcentaje, etc. en el Excel
"""

import json
import openpyxl

# Cargar JSON
with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

hoja_std = datos.get('hojas', {}).get('Diario STD')
if not hoja_std:
    print("No se encontró Diario STD")
    exit(1)

datos_diarios = hoja_std.get('datos_diarios_generales', [])

print("="*80)
print("FÓRMULAS DE BENEFICIO EN DIARIO STD (primeras 10 filas)")
print("="*80)

for dato in datos_diarios[:30]:
    fila = dato.get('fila')
    formulas = dato.get('formulas', {})
    
    if formulas:
        print(f"\nFila {fila}:")
        if 'benef_euro' in formulas:
            print(f"  benef_euro: {formulas['benef_euro']}")
        if 'benef_porcentaje' in formulas:
            print(f"  benef_porcentaje: {formulas['benef_porcentaje']}")
        if 'benef_euro_acum' in formulas:
            print(f"  benef_euro_acum: {formulas['benef_euro_acum']}")
        if 'benef_porcentaje_acum' in formulas:
            print(f"  benef_porcentaje_acum: {formulas['benef_porcentaje_acum']}")
