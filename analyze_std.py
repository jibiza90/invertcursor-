#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json

with open('datos_mensuales/Diario_STD_2026-01.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

print("=== ESTRUCTURA DIARIO_STD ===")
print(f"clientes: {len(d.get('clientes', []))}")
print(f"datos_diarios_generales: {len(d.get('datos_diarios_generales', []))}")
print(f"datos_generales: {len(d.get('datos_generales', []))}")

if d.get('clientes'):
    c = d['clientes'][0]
    print(f"\ncliente keys: {list(c.keys())}")
    print(f"datos_diarios cliente: {len(c.get('datos_diarios', []))}")
    if c.get('datos_diarios'):
        dd = c['datos_diarios'][0]
        print(f"dato diario keys: {list(dd.keys())}")
        print(f"formulas keys: {list(dd.get('formulas', {}).keys())}")
        print(f"bloqueadas: {dd.get('bloqueadas')}")
        print(f"ejemplo dato diario: fila={dd.get('fila')}, fecha={dd.get('fecha')}")

if d.get('datos_diarios_generales'):
    dg = d['datos_diarios_generales'][0]
    print(f"\ndato diario general keys: {list(dg.keys())}")
    print(f"formulas general keys: {list(dg.get('formulas', {}).keys())}")
    print(f"bloqueadas general: {dg.get('bloqueadas')}")
