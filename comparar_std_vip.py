#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comparar fórmulas de beneficio entre Diario STD y Diario VIP
"""

import json

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

hoja_std = datos.get('hojas', {}).get('Diario STD')
hoja_vip = datos.get('hojas', {}).get('Diario VIP')

print("="*80)
print("COMPARACIÓN DE FÓRMULAS DE BENEFICIO")
print("="*80)

print("\nDIARIO STD - Fila 17:")
if hoja_std:
    datos_diarios_std = hoja_std.get('datos_diarios_generales', [])
    fila17_std = [d for d in datos_diarios_std if d.get('fila') == 17]
    if fila17_std:
        f17 = fila17_std[0]
        formulas = f17.get('formulas', {})
        bloqueadas = f17.get('bloqueadas', {})
        print(f"  imp_final: {f17.get('imp_final')}")
        print(f"  benef_euro: {f17.get('benef_euro')}")
        print(f"  benef_euro fórmula: {formulas.get('benef_euro')}")
        print(f"  benef_euro bloqueada: {bloqueadas.get('benef_euro')}")
        print(f"  benef_porcentaje: {f17.get('benef_porcentaje')}")
        print(f"  benef_porcentaje fórmula: {formulas.get('benef_porcentaje')}")
        print(f"  benef_porcentaje bloqueada: {bloqueadas.get('benef_porcentaje')}")

print("\nDIARIO VIP - Fila 17:")
if hoja_vip:
    datos_diarios_vip = hoja_vip.get('datos_diarios_generales', [])
    fila17_vip = [d for d in datos_diarios_vip if d.get('fila') == 17]
    if fila17_vip:
        f17 = fila17_vip[0]
        formulas = f17.get('formulas', {})
        bloqueadas = f17.get('bloqueadas', {})
        print(f"  imp_final: {f17.get('imp_final')}")
        print(f"  benef_euro: {f17.get('benef_euro')}")
        print(f"  benef_euro fórmula: {formulas.get('benef_euro')}")
        print(f"  benef_euro bloqueada: {bloqueadas.get('benef_euro')}")
        print(f"  benef_porcentaje: {f17.get('benef_porcentaje')}")
        print(f"  benef_porcentaje fórmula: {formulas.get('benef_porcentaje')}")
        print(f"  benef_porcentaje bloqueada: {bloqueadas.get('benef_porcentaje')}")
