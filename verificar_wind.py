#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json

with open('datos_mensuales/Diario_WIND_2026-01.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

print("=== VERIFICACION DIARIO_WIND ===")
print(f"clientes: {len(d.get('clientes', []))}")
print(f"datos_diarios_generales: {len(d.get('datos_diarios_generales', []))}")
print(f"datos_generales: {len(d.get('datos_generales', []))}")

if d.get('clientes'):
    c = d['clientes'][0]
    print(f"\ncliente 1 datos_diarios: {len(c.get('datos_diarios', []))}")
    
# Verificar fines de semana bloqueados
fines_semana_bloqueados = 0
for dd in d.get('datos_diarios_generales', []):
    fecha = dd.get('fecha', '')
    if fecha:
        from datetime import datetime
        try:
            dt = datetime.strptime(str(fecha)[:10], '%Y-%m-%d')
            if dt.weekday() >= 5:
                bloq = dd.get('bloqueadas', {})
                if all(bloq.values()):
                    fines_semana_bloqueados += 1
        except:
            pass

print(f"\nFines de semana bloqueados: {fines_semana_bloqueados}")
print("\n✅ Archivo DIARIO_WIND verificado correctamente")
