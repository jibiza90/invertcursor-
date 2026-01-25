#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verificar cómo se relacionan las fórmulas de clientes con la vista general en Diario STD
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

print("="*80)
print("ANÁLISIS DE RELACIÓN ENTRE CLIENTES Y VISTA GENERAL")
print("="*80)

# Analizar fila 17 (día 1, tercera fila)
fila17_general = [d for d in datos_diarios if d.get('fila') == 17]
if fila17_general:
    f17 = fila17_general[0]
    print(f"\nVISTA GENERAL - Fila 17:")
    print(f"  imp_inicial: {f17.get('imp_inicial')}")
    print(f"  imp_final: {f17.get('imp_final')}")
    print(f"  benef_euro: {f17.get('benef_euro')}")
    formulas = f17.get('formulas', {})
    print(f"  Fórmulas:")
    for campo, formula in formulas.items():
        print(f"    {campo}: {formula}")

print(f"\nCLIENTES - Fila 17:")
for cliente in clientes[:3]:  # Primeros 3 clientes
    numero = cliente.get('numero_cliente')
    datos_diarios_cliente = cliente.get('datos_diarios', [])
    dato17 = [d for d in datos_diarios_cliente if d.get('fila') == 17]
    
    if dato17:
        d17 = dato17[0]
        print(f"\n  Cliente {numero}:")
        print(f"    incremento: {d17.get('incremento')}")
        print(f"    decremento: {d17.get('decremento')}")
        print(f"    base: {d17.get('base')}")
        print(f"    saldo_diario: {d17.get('saldo_diario')}")
        print(f"    beneficio_diario: {d17.get('beneficio_diario')}")
        formulas = d17.get('formulas', {})
        print(f"    Fórmulas:")
        for campo, formula in formulas.items():
            print(f"      {campo}: {formula}")

# Verificar AEO16 (suma de incrementos-decrementos de todos los clientes en fila 15)
print(f"\n{'='*80}")
print("VERIFICACIÓN DE AEO16 (suma de incrementos-decrementos en fila 15):")
print(f"{'='*80}")

suma_aeo16 = 0
for cliente in clientes:
    numero = cliente.get('numero_cliente')
    datos_diarios_cliente = cliente.get('datos_diarios', [])
    dato15 = [d for d in datos_diarios_cliente if d.get('fila') == 15]
    
    if dato15:
        d15 = dato15[0]
        incremento = d15.get('incremento') or 0
        decremento = d15.get('decremento') or 0
        contribucion = incremento - decremento
        suma_aeo16 += contribucion
        print(f"  Cliente {numero}: incremento={incremento}, decremento={decremento}, contribución={contribucion}")

print(f"\n  TOTAL AEO16 = {suma_aeo16}")
fila15_general = [d for d in datos_diarios if d.get('fila') == 15]
if fila15_general:
    imp_inicial_15 = fila15_general[0].get('imp_inicial')
    print(f"  imp_inicial fila 15 (debería ser igual a AEO16): {imp_inicial_15}")
    print(f"  ¿Coinciden? {abs(imp_inicial_15 - suma_aeo16) < 0.01 if imp_inicial_15 else 'N/A'}")
