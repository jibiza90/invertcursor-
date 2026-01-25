#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

h = d['hojas']['Diario VIP']
dd = h['datos_diarios_generales']

print("Verificando filas 15-17:")
for fila in [15, 16, 17]:
    dato = [x for x in dd if x['fila'] == fila][0]
    bloqueadas = dato['bloqueadas']
    print(f"\nFila {fila}:")
    print(f"  imp_final bloqueada: {bloqueadas.get('imp_final')}")
    print(f"  benef_euro bloqueada: {bloqueadas.get('benef_euro')}")
    print(f"  benef_porcentaje bloqueada: {bloqueadas.get('benef_porcentaje')}")
    print(f"  benef_euro_acum bloqueada: {bloqueadas.get('benef_euro_acum')}")
    print(f"  benef_porcentaje_acum bloqueada: {bloqueadas.get('benef_porcentaje_acum')}")
