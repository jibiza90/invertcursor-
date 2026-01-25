#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verificar si los clientes tienen fórmulas que dependen de F (imp_final) de la vista general
"""

import json

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

hoja_std = datos.get('hojas', {}).get('Diario STD')
if not hoja_std:
    print("No se encontró Diario STD")
    exit(1)

clientes = hoja_std.get('clientes', [])

print("="*80)
print("VERIFICANDO SI LOS CLIENTES DEPENDEN DE F (imp_final) DE LA VISTA GENERAL")
print("="*80)

for cliente in clientes[:3]:  # Primeros 3 clientes
    numero = cliente.get('numero_cliente')
    datos_diarios = cliente.get('datos_diarios', [])
    
    print(f"\nCliente {numero}:")
    formulas_con_f = []
    
    for dato in datos_diarios[:10]:  # Primeras 10 filas
        fila = dato.get('fila')
        formulas = dato.get('formulas', {})
        
        for campo, formula in formulas.items():
            if formula and 'F' in formula and formula.strip().startswith('='):
                # Verificar si referencia F de la vista general (no F3 que es un total)
                if 'F' in formula and not formula.startswith('=F3'):
                    formulas_con_f.append((fila, campo, formula))
    
    if formulas_con_f:
        print(f"  Fórmulas que referencian F:")
        for fila, campo, formula in formulas_con_f[:5]:  # Primeras 5
            print(f"    Fila {fila}, {campo}: {formula}")
    else:
        print(f"  No se encontraron fórmulas que referencien F de la vista general")
