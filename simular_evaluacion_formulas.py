#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para simular exactamente la lógica de evaluación de fórmulas del cliente 2
y ver qué está pasando paso a paso
"""

import json
import re

# Cargar JSON
with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

hoja_std = datos.get('hojas', {}).get('Diario STD')

print("="*80)
print("SIMULACIÓN DE EVALUACIÓN DE FÓRMULAS DEL CLIENTE 2")
print("="*80)

clientes = hoja_std.get('clientes', [])
if len(clientes) < 2:
    print("ERROR: No hay suficientes clientes")
    exit(1)

cliente1 = clientes[0]
cliente2 = clientes[1]

datos_diarios_cliente1 = cliente1.get('datos_diarios', [])
datos_diarios_cliente2 = cliente2.get('datos_diarios', [])

datos_diarios_generales = hoja_std.get('datos_diarios_generales', [])

# Función para convertir letra de columna a número (simulando JavaScript)
def letra_a_numero(letra):
    num = 0
    for i, c in enumerate(letra):
        num = num * 26 + (ord(c) - 64)
    return num

# Función para obtener valor de celda general (simulando obtenerValorCelda)
def obtener_valor_general(ref, fila_idx):
    match = re.match(r'^([A-Z]+)(\d+)$', ref)
    if not match:
        return None
    
    col_letra = match.group(1)
    fila_num = int(match.group(2))
    
    # Buscar en datos generales
    dato = [d for d in datos_diarios_generales if d.get('fila') == fila_num]
    if not dato:
        return None
    
    dato = dato[0]
    
    # Mapear columna a campo
    col_num = letra_a_numero(col_letra)
    campo_map = {
        5: 'imp_inicial',   # E
        6: 'imp_final',     # F
        7: 'benef_euro',    # G
        8: 'benef_porcentaje',  # H
        9: 'benef_euro_acum',   # I
        10: 'benef_porcentaje_acum'  # J
    }
    
    campo = campo_map.get(col_num)
    if campo:
        return dato.get(campo)
    
    return None

# Función para obtener valor de celda de cliente (simulando obtenerValorCeldaCliente)
def obtener_valor_cliente(ref, fila_idx, cliente_idx_actual):
    match = re.match(r'^([A-Z]+)(\d+)$', ref)
    if not match:
        return None
    
    col_letra = match.group(1)
    fila_num = int(match.group(2))
    
    # Convertir letra a número
    col_num = letra_a_numero(col_letra)
    
    # Determinar qué cliente corresponde a esta columna
    # Clientes empiezan en columna 11 (K), cada cliente ocupa 8 columnas
    cliente_idx = (col_num - 11) // 8
    offset_columna = (col_num - 11) % 8
    
    if cliente_idx < 0:
        return None
    
    # Obtener cliente correcto
    if cliente_idx >= len(clientes):
        return None
    
    cliente = clientes[cliente_idx]
    datos_diarios_cliente = cliente.get('datos_diarios', [])
    fila_data_cliente = [d for d in datos_diarios_cliente if d.get('fila') == fila_num]
    
    if not fila_data_cliente:
        return None
    
    fila_data = fila_data_cliente[0]
    
    # Mapear offset de columna a campo
    campo_map = {
        0: 'incremento',
        1: 'decremento',
        2: 'base',
        3: 'saldo_diario',
        4: 'beneficio_diario',
        5: 'beneficio_diario_pct',
        6: 'beneficio_acumulado',
        7: 'beneficio_acumulado_pct'
    }
    
    campo = campo_map.get(offset_columna)
    if campo:
        return fila_data.get(campo)
    
    return None

# Simular evaluación de fórmula del cliente 2, fila 17
fila = 17
cliente_idx = 1  # Cliente 2

dato17_cliente2 = [d for d in datos_diarios_cliente2 if d.get('fila') == fila]
if not dato17_cliente2:
    print("ERROR: No se encontró fila 17 del cliente 2")
    exit(1)

dato17 = dato17_cliente2[0]
formulas = dato17.get('formulas', {})

print(f"\nFila {fila} del Cliente 2:")
print(f"  Valores actuales:")
print(f"    incremento (S15): {obtener_valor_cliente('S15', fila, cliente_idx)}")
print(f"    decremento (T16): {obtener_valor_cliente('T16', fila, cliente_idx)}")
print(f"    base: {dato17.get('base')}")
print(f"    saldo_diario: {dato17.get('saldo_diario')}")
print(f"    beneficio_diario: {dato17.get('beneficio_diario')}")
print(f"    beneficio_diario_pct: {dato17.get('beneficio_diario_pct')}")

print(f"\nFórmulas:")
for campo, formula in formulas.items():
    print(f"  {campo}: {formula}")

# Simular evaluación de base = IF(N17<>0,S15-T16,0)
print(f"\n{'='*80}")
print("EVALUACIÓN PASO A PASO:")
print(f"{'='*80}")

# 1. Evaluar base = IF(N17<>0,S15-T16,0)
print(f"\n1. Evaluar BASE = IF(N17<>0,S15-T16,0):")
print(f"   - N17 es columna N (14), que es saldo_diario del Cliente 1 en fila 17")

n17_valor = obtener_valor_cliente('N17', fila, 0)  # Cliente 1 (índice 0)
print(f"   - N17 (saldo_diario Cliente 1, fila 17) = {n17_valor}")

s15_valor = obtener_valor_cliente('S15', fila, cliente_idx)  # Cliente 2
t16_valor = obtener_valor_cliente('T16', fila, cliente_idx)  # Cliente 2

print(f"   - S15 (incremento Cliente 2, fila 15) = {s15_valor}")
print(f"   - T16 (decremento Cliente 2, fila 16) = {t16_valor}")

# Evaluar IF
if n17_valor and n17_valor != 0:
    inc = s15_valor or 0
    dec = t16_valor or 0
    base_calculada = inc - dec
    print(f"   - IF({n17_valor}<>0, {inc}-{dec}, 0) = {base_calculada}")
else:
    base_calculada = 0
    print(f"   - IF({n17_valor}<>0, {s15_valor}-{t16_valor}, 0) = 0 (porque N17 es 0 o null)")

print(f"   - Valor actual en JSON: {dato17.get('base')}")
print(f"   - ¿Debería cambiar? {abs((dato17.get('base') or 0) - base_calculada) > 0.01}")

# 2. Evaluar beneficio_diario_pct = IF(U17<>0,P17,0)
print(f"\n2. Evaluar BENEFICIO_DIARIO_PCT = IF(U17<>0,P17,0):")
print(f"   - U17 es base del Cliente 2 en fila 17 = {base_calculada}")
print(f"   - P17 es columna P (16), que es benef_porcentaje del Cliente 1 en fila 17")

p17_valor = obtener_valor_cliente('P17', fila, 0)  # Cliente 1
print(f"   - P17 (beneficio_diario_pct Cliente 1, fila 17) = {p17_valor}")

# Pero espera, P17 puede ser también benef_porcentaje de la vista general (H17)
h17_valor = obtener_valor_general('H17', fila)
print(f"   - H17 (benef_porcentaje vista general, fila 17) = {h17_valor}")

# La fórmula dice P17, pero puede que se refiera a H17
# Déjame verificar qué es realmente P17 en Excel
if base_calculada and base_calculada != 0:
    beneficio_diario_pct_calculado = p17_valor or h17_valor or 0
    print(f"   - IF({base_calculada}<>0, {beneficio_diario_pct_calculado}, 0) = {beneficio_diario_pct_calculado}")
else:
    beneficio_diario_pct_calculado = 0
    print(f"   - IF({base_calculada}<>0, {p17_valor or h17_valor}, 0) = 0")

print(f"   - Valor actual en JSON: {dato17.get('beneficio_diario_pct')}")

# 3. Evaluar beneficio_diario = U17*X17
print(f"\n3. Evaluar BENEFICIO_DIARIO = U17*X17:")
print(f"   - U17 (base) = {base_calculada}")
print(f"   - X17 (beneficio_diario_pct) = {beneficio_diario_pct_calculado}")

x17_valor = obtener_valor_cliente('X17', fila, cliente_idx)
print(f"   - X17 (beneficio_diario_pct Cliente 2, fila 17) = {x17_valor}")

# Usar el valor calculado de beneficio_diario_pct
beneficio_diario_calculado = base_calculada * beneficio_diario_pct_calculado
print(f"   - Cálculo: {base_calculada} * {beneficio_diario_pct_calculado} = {beneficio_diario_calculado}")
print(f"   - Valor actual en JSON: {dato17.get('beneficio_diario')}")

# 4. Evaluar saldo_diario = IF(U17<>0,U17+W17,0)
print(f"\n4. Evaluar SALDO_DIARIO = IF(U17<>0,U17+W17,0):")
w17_valor = obtener_valor_cliente('W17', fila, cliente_idx)
print(f"   - W17 (beneficio_diario Cliente 2, fila 17) = {w17_valor}")

if base_calculada and base_calculada != 0:
    saldo_diario_calculado = base_calculada + beneficio_diario_calculado
    print(f"   - IF({base_calculada}<>0, {base_calculada}+{beneficio_diario_calculado}, 0) = {saldo_diario_calculado}")
else:
    saldo_diario_calculado = 0
    print(f"   - IF({base_calculada}<>0, {base_calculada}+{beneficio_diario_calculado}, 0) = 0")

print(f"   - Valor actual en JSON: {dato17.get('saldo_diario')}")

print(f"\n{'='*80}")
print("RESUMEN:")
print(f"{'='*80}")
print(f"Si pones incremento=1000 en S15 del Cliente 2:")
print(f"  - N17 debe ser != 0 para que se calcule base")
print(f"  - base debería ser: 1000 - (decremento en T16)")
print(f"  - beneficio_diario_pct debería ser: P17 o H17 (benef_porcentaje)")
print(f"  - beneficio_diario debería ser: base * beneficio_diario_pct")
print(f"  - saldo_diario debería ser: base + beneficio_diario")

# Verificar qué valores tiene realmente el Cliente 1 en fila 17
print(f"\n{'='*80}")
print("VALORES DEL CLIENTE 1 EN FILA 17 (necesarios para N17 y P17):")
print(f"{'='*80}")
dato17_cliente1 = [d for d in datos_diarios_cliente1 if d.get('fila') == fila]
if dato17_cliente1:
    d17_c1 = dato17_cliente1[0]
    print(f"  saldo_diario (N17): {d17_c1.get('saldo_diario')}")
    print(f"  beneficio_diario_pct (P17): {d17_c1.get('beneficio_diario_pct')}")

# Verificar valores de la vista general
print(f"\n{'='*80}")
print("VALORES DE LA VISTA GENERAL EN FILA 17:")
print(f"{'='*80}")
dato17_general = [d for d in datos_diarios_generales if d.get('fila') == fila]
if dato17_general:
    d17_gen = dato17_general[0]
    print(f"  imp_final (F17): {d17_gen.get('imp_final')}")
    print(f"  benef_porcentaje (H17): {d17_gen.get('benef_porcentaje')}")
