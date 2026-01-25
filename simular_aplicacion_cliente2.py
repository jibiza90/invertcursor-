#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import re

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

hoja_std = datos.get('hojas', {}).get('Diario STD')
clientes = hoja_std.get('clientes', [])
cliente2 = clientes[1]
datos_diarios_cliente2 = cliente2.get('datos_diarios', [])
datos_diarios_generales = hoja_std.get('datos_diarios_generales', [])

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

def obtener_valor_general(ref):
    match = re.match(r'^([A-Z]+)(\d+)$', ref)
    if not match:
        return None
    col_letra = match.group(1)
    fila_num = int(match.group(2))
    col_num = letra_a_numero(col_letra)
    dato = [d for d in datos_diarios_generales if d.get('fila') == fila_num]
    if not dato:
        return None
    dato = dato[0]
    campo_map = {5: 'imp_inicial', 6: 'imp_final', 7: 'benef_euro',
                 8: 'benef_porcentaje', 9: 'benef_euro_acum', 10: 'benef_porcentaje_acum'}
    campo = campo_map.get(col_num)
    if campo:
        return dato.get(campo)
    return None

print("="*80)
print("SIMULACION: PONER INCREMENTO EN CLIENTE 2")
print("="*80)

fila_incremento = 15
cliente_idx = 1
dato15 = [d for d in datos_diarios_cliente2 if d.get('fila') == fila_incremento][0]
print(f"\nPASO 1: Poner incremento=1000 en fila 15")
print(f"Valor anterior: {dato15.get('incremento')}")
dato15['incremento'] = 1000
print(f"Incremento actualizado: {dato15['incremento']}")

fila_calculo = 17
dato17 = [d for d in datos_diarios_cliente2 if d.get('fila') == fila_calculo][0]
formulas = dato17.get('formulas', {})

print(f"\nPASO 2: Recalcular formulas fila 17")
print(f"Formulas:")
for campo, formula in formulas.items():
    print(f"  {campo}: {formula}")

print(f"\nPASO 3: Obtener valores necesarios")
n17 = obtener_valor_cliente('N17', 0)
s15 = obtener_valor_cliente('S15', cliente_idx)
t16 = obtener_valor_cliente('T16', cliente_idx)
p17 = obtener_valor_cliente('P17', 0)
h17 = obtener_valor_general('H17')

print(f"N17 (saldo_diario Cliente 1): {n17}")
print(f"S15 (incremento Cliente 2): {s15}")
print(f"T16 (decremento Cliente 2): {t16}")
print(f"P17 (beneficio_diario_pct Cliente 1): {p17}")
print(f"H17 (benef_porcentaje general): {h17}")

print(f"\nPASO 4: Calcular formulas")
# base = IF(N17<>0,S15-T16,0)
n17_val = n17 if n17 is not None else 0
s15_val = s15 if s15 is not None else 0
t16_val = t16 if t16 is not None else 0
base = (s15_val - t16_val) if n17_val != 0 else 0
print(f"base = IF({n17_val}<>0, {s15_val}-{t16_val}, 0) = {base}")
dato17['base'] = base

# beneficio_diario_pct = IF(U17<>0,P17,0)
p17_val = p17 if p17 is not None else 0
h17_val = h17 if h17 is not None else 0
beneficio_diario_pct = p17_val if base != 0 else 0
print(f"beneficio_diario_pct = IF({base}<>0, {p17_val}, 0) = {beneficio_diario_pct}")
dato17['beneficio_diario_pct'] = beneficio_diario_pct

# beneficio_diario = U17*X17
beneficio_diario = base * beneficio_diario_pct
print(f"beneficio_diario = {base} * {beneficio_diario_pct} = {beneficio_diario}")
dato17['beneficio_diario'] = beneficio_diario

# saldo_diario = IF(U17<>0,U17+W17,0)
saldo_diario = (base + beneficio_diario) if base != 0 else 0
print(f"saldo_diario = IF({base}<>0, {base}+{beneficio_diario}, 0) = {saldo_diario}")
dato17['saldo_diario'] = saldo_diario

# beneficio_acumulado = IF(V17<>0,W17,0)
beneficio_acumulado = beneficio_diario if saldo_diario != 0 else 0
print(f"beneficio_acumulado = IF({saldo_diario}<>0, {beneficio_diario}, 0) = {beneficio_acumulado}")
dato17['beneficio_acumulado'] = beneficio_acumulado

print(f"\nRESULTADO FINAL:")
print(f"  base: {dato17.get('base')}")
print(f"  saldo_diario: {dato17.get('saldo_diario')}")
print(f"  beneficio_diario: {dato17.get('beneficio_diario')}")
print(f"  beneficio_diario_pct: {dato17.get('beneficio_diario_pct')}")
print(f"  beneficio_acumulado: {dato17.get('beneficio_acumulado')}")

print(f"\nDIAGNOSTICO:")
if n17_val == 0:
    print(f"PROBLEMA: N17 es {n17_val}, por eso base siempre sera 0")
    print(f"SOLUCION: Cliente 1 debe tener saldo_diario != 0 en fila 17")
else:
    print(f"N17 es {n17_val}, deberia funcionar")
