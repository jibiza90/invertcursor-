#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar EXACTAMENTE qué está pasando cuando se evalúa la fórmula base del Cliente 2
"""

import json
import re

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

hoja_std = datos.get('hojas', {}).get('Diario STD')
clientes = hoja_std.get('clientes', [])
cliente1 = clientes[0]
cliente2 = clientes[1]

datos_diarios_cliente1 = cliente1.get('datos_diarios', [])
datos_diarios_cliente2 = cliente2.get('datos_diarios', [])

def letra_a_numero(letra):
    num = 0
    for c in letra:
        num = num * 26 + (ord(c) - 64)
    return num

def obtener_valor_cliente(ref, cliente_idx_actual):
    match = re.match(r'^([A-Z]+)(\d+)$', ref)
    if not match:
        return None
    col_letra = match.group(1)
    fila_num = int(match.group(2))
    col_num = letra_a_numero(col_letra)
    cliente_idx = (col_num - 11) // 8
    offset_columna = (col_num - 11) % 8
    if cliente_idx < 0 or cliente_idx >= len(clientes):
        return None
    cliente = clientes[cliente_idx]
    datos_diarios_cliente = cliente.get('datos_diarios', [])
    fila_data = [d for d in datos_diarios_cliente if d.get('fila') == fila_num]
    if not fila_data:
        return None
    fila_data = fila_data[0]
    campo_map = {0: 'incremento', 1: 'decremento', 2: 'base', 3: 'saldo_diario',
                 4: 'beneficio_diario', 5: 'beneficio_diario_pct',
                 6: 'beneficio_acumulado', 7: 'beneficio_acumulado_pct'}
    campo = campo_map.get(offset_columna)
    if campo:
        return fila_data.get(campo)
    return None

print("="*80)
print("DIAGNOSTICO COMPLETO DEL PROBLEMA")
print("="*80)

# Simular poner incremento=1000
fila_incremento = 15
cliente_idx = 1
dato15 = [d for d in datos_diarios_cliente2 if d.get('fila') == fila_incremento][0]
dato15['incremento'] = 1000

fila_calculo = 17
dato17 = [d for d in datos_diarios_cliente2 if d.get('fila') == fila_calculo][0]

print(f"\n1. VALORES ACTUALES:")
print(f"   S15 (incremento Cliente 2, fila 15): {obtener_valor_cliente('S15', cliente_idx)}")
print(f"   T16 (decremento Cliente 2, fila 16): {obtener_valor_cliente('T16', cliente_idx)}")
print(f"   N17 (saldo_diario Cliente 1, fila 17): {obtener_valor_cliente('N17', 0)}")

print(f"\n2. FORMULA BASE:")
formula_base = dato17.get('formulas', {}).get('base', '')
print(f"   {formula_base}")

print(f"\n3. EVALUACION:")
n17 = obtener_valor_cliente('N17', 0) or 0
s15 = obtener_valor_cliente('S15', cliente_idx) or 0
t16 = obtener_valor_cliente('T16', cliente_idx) or 0

print(f"   N17 = {n17}")
print(f"   S15 = {s15}")
print(f"   T16 = {t16}")
print(f"   IF({n17}<>0, {s15}-{t16}, 0)")

if n17 != 0:
    base_calculada = s15 - t16
    print(f"   = {s15}-{t16} = {base_calculada}")
else:
    base_calculada = 0
    print(f"   = 0 (porque N17 es 0)")

print(f"\n4. PROBLEMA IDENTIFICADO:")
if n17 == 0:
    print(f"   ERROR: N17 (saldo_diario Cliente 1) es 0")
    print(f"   ERROR: Por eso la formula siempre devuelve 0")
    print(f"   ERROR: Aunque pongas incremento=1000 en S15, base siempre sera 0")
    print(f"\n   SOLUCIONES POSIBLES:")
    print(f"   A) El Cliente 1 debe tener saldo_diario != 0 en fila 17")
    print(f"   B) La formula deberia ser diferente (sin la condicion N17<>0)")
    print(f"   C) Cuando se pone incremento, tambien deberia actualizarse N17")
else:
    print(f"   OK: N17 es {n17}, deberia funcionar")
    print(f"   base deberia ser: {base_calculada}")

print(f"\n5. VERIFICAR SI HAY OTRA INTERPRETACION:")
print(f"   ¿La formula realmente requiere N17<>0?")
print(f"   ¿O deberia calcularse directamente S15-T16?")

# Verificar si hay alguna forma de que N17 tenga valor
dato17_cliente1 = [d for d in datos_diarios_cliente1 if d.get('fila') == fila_calculo]
if dato17_cliente1:
    d17_c1 = dato17_cliente1[0]
    print(f"\n   Cliente 1, fila 17:")
    print(f"     base: {d17_c1.get('base')}")
    print(f"     saldo_diario: {d17_c1.get('saldo_diario')}")
    print(f"     beneficio_diario: {d17_c1.get('beneficio_diario')}")
    
    # Verificar si el Cliente 1 tiene incrementos
    dato15_cliente1 = [d for d in datos_diarios_cliente1 if d.get('fila') == 15]
    if dato15_cliente1:
        print(f"     incremento fila 15: {dato15_cliente1[0].get('incremento')}")
