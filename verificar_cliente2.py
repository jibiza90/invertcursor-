#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verificar fórmulas del cliente 2 en Diario STD
"""

import json

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

hoja_std = datos.get('hojas', {}).get('Diario STD')
if not hoja_std:
    print("No se encontró Diario STD")
    exit(1)

clientes = hoja_std.get('clientes', [])
datos_diarios = hoja_std.get('datos_diarios_generales', [])

# Cliente 2 (índice 1)
if len(clientes) > 1:
    cliente2 = clientes[1]
    numero = cliente2.get('numero_cliente')
    
    print("="*80)
    print(f"CLIENTE {numero} (Cliente 2)")
    print("="*80)
    
    datos_diarios_cliente = cliente2.get('datos_diarios', [])
    
    # Buscar fila 15 (día 1, primera fila)
    dato15 = [d for d in datos_diarios_cliente if d.get('fila') == 15]
    if dato15:
        d15 = dato15[0]
        print(f"\nFila 15 (día 1, primera fila):")
        print(f"  incremento: {d15.get('incremento')}")
        print(f"  decremento: {d15.get('decremento')}")
        formulas = d15.get('formulas', {})
        print(f"  Fórmulas:")
        for campo, formula in formulas.items():
            print(f"    {campo}: {formula}")
    
    # Buscar fila 17 (día 1, tercera fila - donde debería calcularse el beneficio)
    dato17 = [d for d in datos_diarios_cliente if d.get('fila') == 17]
    if dato17:
        d17 = dato17[0]
        print(f"\nFila 17 (día 1, tercera fila):")
        print(f"  incremento: {d17.get('incremento')}")
        print(f"  decremento: {d17.get('decremento')}")
        print(f"  base: {d17.get('base')}")
        print(f"  saldo_diario: {d17.get('saldo_diario')}")
        print(f"  beneficio_diario: {d17.get('beneficio_diario')}")
        print(f"  beneficio_diario_pct: {d17.get('beneficio_diario_pct')}")
        print(f"  beneficio_acumulado: {d17.get('beneficio_acumulado')}")
        print(f"  beneficio_acumulado_pct: {d17.get('beneficio_acumulado_pct')}")
        formulas = d17.get('formulas', {})
        print(f"\n  Fórmulas:")
        for campo, formula in formulas.items():
            print(f"    {campo}: {formula}")
    
    # Verificar valores de la vista general que necesita el cliente
    fila17_general = [d for d in datos_diarios if d.get('fila') == 17]
    if fila17_general:
        f17 = fila17_general[0]
        print(f"\nVISTA GENERAL - Fila 17 (necesaria para fórmulas del cliente):")
        print(f"  imp_final (F17): {f17.get('imp_final')}")
        print(f"  benef_porcentaje (H17): {f17.get('benef_porcentaje')}")
