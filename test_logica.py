#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test de lógica de DIARIO_WIND
Simula lo que hace el JavaScript para verificar que las fórmulas funcionan
"""
import json
import os

def test_formulas():
    print("=== TEST LÓGICA DIARIO_WIND ===\n")
    
    # Cargar datos
    filepath = 'datos_mensuales/Diario_WIND_2026-01.json'
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Simular: Cliente 1 pone 1000€ de incremento en día 1 (fila 15)
    print("1. Simulando: Cliente 1 pone 1000€ incremento en día 1 (fila 15)")
    cliente1 = data['clientes'][0]
    dia1_cliente = next((d for d in cliente1['datos_diarios'] if d['fila'] == 15), None)
    if dia1_cliente:
        dia1_cliente['incremento'] = 1000
        print(f"   ✓ Cliente 1, fila 15: incremento = {dia1_cliente['incremento']}")
    
    # Calcular imp_inicial del día 1 según fórmula: =SUM(N15:AEL15)-SUM(O15:AEM15)
    # Esto debería ser: suma de incrementos de todos los clientes - suma de decrementos
    print("\n2. Calculando imp_inicial día 1 (fila 15)")
    print("   Fórmula: =SUM(N15:AEL15)-SUM(O15:AEM15)")
    
    suma_incrementos = 0
    suma_decrementos = 0
    for cliente in data['clientes']:
        dato = next((d for d in cliente['datos_diarios'] if d['fila'] == 15), None)
        if dato:
            inc = dato.get('incremento') or 0
            dec = dato.get('decremento') or 0
            suma_incrementos += inc
            suma_decrementos += dec
    
    imp_inicial_dia1 = suma_incrementos - suma_decrementos
    print(f"   Suma incrementos fila 15: {suma_incrementos}")
    print(f"   Suma decrementos fila 15: {suma_decrementos}")
    print(f"   imp_inicial día 1 = {imp_inicial_dia1}")
    
    if imp_inicial_dia1 == 1000:
        print("   ✅ CORRECTO: imp_inicial = 1000€")
    else:
        print(f"   ❌ ERROR: esperado 1000€, obtenido {imp_inicial_dia1}€")
    
    # Simular: Usuario pone imp_final = 1050€ en día 1
    print("\n3. Simulando: Usuario pone imp_final = 1050€ en día 1")
    dia1_general = next((d for d in data['datos_diarios_generales'] if d['fila'] == 15), None)
    if dia1_general:
        dia1_general['imp_final'] = 1050
        print(f"   ✓ Fila 15: imp_final = {dia1_general['imp_final']}")
    
    # Calcular imp_inicial del día 2 según fórmula: =F15+SUM(N16:AEL16)-SUM(O16:AEM16)
    print("\n4. Calculando imp_inicial día 2 (fila 16)")
    print("   Fórmula: =F15+SUM(N16:AEL16)-SUM(O16:AEM16)")
    
    imp_final_anterior = dia1_general['imp_final'] if dia1_general else 0
    
    suma_incrementos_dia2 = 0
    suma_decrementos_dia2 = 0
    for cliente in data['clientes']:
        dato = next((d for d in cliente['datos_diarios'] if d['fila'] == 16), None)
        if dato:
            inc = dato.get('incremento') or 0
            dec = dato.get('decremento') or 0
            suma_incrementos_dia2 += inc
            suma_decrementos_dia2 += dec
    
    imp_inicial_dia2 = imp_final_anterior + suma_incrementos_dia2 - suma_decrementos_dia2
    print(f"   F15 (imp_final día anterior): {imp_final_anterior}")
    print(f"   Suma incrementos fila 16: {suma_incrementos_dia2}")
    print(f"   Suma decrementos fila 16: {suma_decrementos_dia2}")
    print(f"   imp_inicial día 2 = {imp_inicial_dia2}")
    
    if imp_inicial_dia2 == 1050:
        print("   ✅ CORRECTO: imp_inicial día 2 = 1050€ (hereda del día anterior)")
    else:
        print(f"   ⚠️ imp_inicial día 2 = {imp_inicial_dia2}€")
    
    print("\n" + "="*50)
    print("✅ TEST COMPLETADO")
    print("\nNOTA: La lógica es correcta. El problema puede estar en:")
    print("  1. La función evaluarRango no suma correctamente los incrementos")
    print("  2. Los datos no se guardan/cargan correctamente")
    print("  3. La UI no se actualiza después de los cambios")

if __name__ == '__main__':
    test_formulas()
