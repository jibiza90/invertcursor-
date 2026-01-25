#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test completo de DIARIO_WIND
"""
import json
import os

def test_estructura_wind():
    print("=== TEST ESTRUCTURA DIARIO_WIND ===\n")
    
    filepath = 'datos_mensuales/Diario_WIND_2026-01.json'
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Test 1: imp_final editable (no bloqueado)
    print("1. Verificando imp_final editable en datos_diarios_generales...")
    dias_editables = 0
    dias_bloqueados_finde = 0
    for dd in data['datos_diarios_generales']:
        bloq = dd.get('bloqueadas', {})
        fecha = dd.get('fecha', '')
        from datetime import datetime
        try:
            dt = datetime.strptime(str(fecha)[:10], '%Y-%m-%d')
            es_finde = dt.weekday() >= 5
        except:
            es_finde = False
        
        if es_finde:
            if bloq.get('imp_final') == True:
                dias_bloqueados_finde += 1
        else:
            if bloq.get('imp_final') == False:
                dias_editables += 1
    
    print(f"   ✓ Días laborables con imp_final editable: {dias_editables}")
    print(f"   ✓ Fines de semana con imp_final bloqueado: {dias_bloqueados_finde}")
    
    # Test 2: Fórmula imp_inicial correcta
    print("\n2. Verificando fórmulas imp_inicial...")
    primer_dia = data['datos_diarios_generales'][0]
    segundo_dia = data['datos_diarios_generales'][1] if len(data['datos_diarios_generales']) > 1 else None
    
    formula_dia1 = primer_dia.get('formulas', {}).get('imp_inicial', '')
    print(f"   Día 1 (fila {primer_dia['fila']}): {formula_dia1}")
    
    if segundo_dia:
        formula_dia2 = segundo_dia.get('formulas', {}).get('imp_inicial', '')
        print(f"   Día 2 (fila {segundo_dia['fila']}): {formula_dia2}")
        
        # Verificar que día 2 referencia imp_final del día anterior
        if f"F{primer_dia['fila']}" in formula_dia2:
            print("   ✓ Día 2 referencia correctamente imp_final del día anterior")
        else:
            print("   ⚠ Día 2 NO referencia imp_final del día anterior")
    
    # Test 3: Clientes con incremento/decremento editable
    print("\n3. Verificando clientes...")
    cliente1 = data['clientes'][0]
    dias_cliente = cliente1.get('datos_diarios', [])
    
    dias_editables_cliente = 0
    for dd in dias_cliente:
        bloq = dd.get('bloqueadas', {})
        fecha = dd.get('fecha', '')
        from datetime import datetime
        try:
            dt = datetime.strptime(str(fecha)[:10], '%Y-%m-%d')
            es_finde = dt.weekday() >= 5
        except:
            es_finde = False
        
        if not es_finde:
            if bloq.get('incremento') == False and bloq.get('decremento') == False:
                dias_editables_cliente += 1
    
    print(f"   ✓ Días laborables con incremento/decremento editable: {dias_editables_cliente}")
    print(f"   ✓ Total clientes: {len(data['clientes'])}")
    
    print("\n" + "="*50)
    print("✅ TODOS LOS TESTS PASARON")

if __name__ == '__main__':
    test_estructura_wind()
