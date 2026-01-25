#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sys

sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

hoja_vip = datos.get('hojas', {}).get('Diario VIP')
if not hoja_vip:
    print("ERROR: No se encontró hoja Diario VIP")
    sys.exit(1)

datos_diarios = hoja_vip.get('datos_diarios_generales', [])

print("="*80)
print("VERIFICANDO JSON GENERADO - FILAS 15-20")
print("="*80)

for fila in range(15, 21):
    dato = next((d for d in datos_diarios if d.get('fila') == fila), None)
    if not dato:
        continue
    
    print(f"\nFila {fila} (Fecha: {dato.get('fecha')}):")
    bloqueadas = dato.get('bloqueadas', {})
    formulas = dato.get('formulas', {})
    
    columnas = ['imp_inicial', 'imp_final', 'benef_euro', 'benef_porcentaje', 
                'benef_euro_acum', 'benef_porcentaje_acum']
    
    for col in columnas:
        esta_bloqueada = bloqueadas.get(col, False)
        tiene_formula = col in formulas and formulas[col]
        estado = "🔒 BLOQUEADA" if esta_bloqueada else "✏️ EDITABLE"
        if tiene_formula:
            estado += f" (fórmula: {formulas[col]})"
        print(f"  {col}: {estado}")
