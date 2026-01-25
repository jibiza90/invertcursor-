#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar que los incrementos del día 1 aparecen correctamente
en el importe inicial del día 1 en la vista general.
"""

import json
import re
from collections import defaultdict

def calcular_fa(fila_num, clientes):
    """Calcular FA (suma de incrementos - decrementos) para una fila específica"""
    suma_fa = 0
    
    for cliente in clientes:
        datos_diarios = cliente.get('datos_diarios', [])
        dato_cliente = next((d for d in datos_diarios if d.get('fila') == fila_num), None)
        
        if dato_cliente:
            incremento = dato_cliente.get('incremento', 0) or 0
            decremento = dato_cliente.get('decremento', 0) or 0
            contribucion = incremento - decremento
            suma_fa += contribucion
            
            if fila_num >= 15 and fila_num <= 20:
                print(f"  FA{fila_num}: Cliente {cliente.get('numero_cliente', '?')} - inc: {incremento}, dec: {decremento}, contrib: {contribucion}")
    
    return suma_fa

def obtener_valor_celda(referencia, hoja, fila_contexto=None):
    """Obtener valor de una celda por referencia (simulando la lógica de app.js)"""
    match = re.match(r'^([A-Z]+)(\d+)$', referencia)
    if not match:
        return None
    
    col_letra = match.group(1)
    fila_num = int(match.group(2))
    
    # Si es columna AEO o FA (ambas son equivalentes)
    if col_letra == 'AEO' or col_letra == 'FA':
        # REGLA: Cuando se evalúa AEO(N) o FA(N) desde filaContexto, buscar incrementos en filaContexto del cliente
        if fila_contexto is not None:
            print(f"  🔍 {col_letra}{fila_num} evaluado desde fila {fila_contexto} → buscando incrementos en fila {fila_contexto} del cliente")
            return calcular_fa(fila_contexto, hoja.get('clientes', []))
        else:
            print(f"  ⚠️ {col_letra}{fila_num} evaluado sin contexto, usando fila {fila_num - 1}")
            return calcular_fa(fila_num - 1, hoja.get('clientes', []))
    
    # Si es columna F (imp_final)
    if col_letra == 'F':
        datos_diarios = hoja.get('datos_diarios_generales', [])
        fila_data = next((f for f in datos_diarios if f.get('fila') == fila_num), None)
        if fila_data:
            return fila_data.get('imp_final')
    
    return None

def evaluar_formula(formula, fila_idx, hoja):
    """Evaluar fórmula de Excel (versión simplificada)"""
    if not formula or not formula.startswith('='):
        return None
    
    expr = formula[1:]  # Remover el =
    
    # Buscar referencias AEO o FA
    aeo_matches = re.findall(r'(AEO|FA)(\d+)', expr)
    if aeo_matches:
        for col_ref, fila_ref in aeo_matches:
            aeo_fila = int(fila_ref)
            valor_aeo = obtener_valor_celda(f'{col_ref}{aeo_fila}', hoja, fila_idx)
            if valor_aeo is not None:
                expr = expr.replace(f'{col_ref}{aeo_fila}', str(valor_aeo))
    
    # Buscar referencias F (imp_final)
    f_matches = re.findall(r'F(\d+)', expr)
    if f_matches:
        for f_ref in f_matches:
            f_fila = int(f_ref)
            valor_f = obtener_valor_celda(f'F{f_fila}', hoja, fila_idx)
            if valor_f is not None:
                expr = expr.replace(f'F{f_fila}', str(valor_f))
    
    # Evaluar expresión simple (solo suma por ahora)
    try:
        # Reemplazar espacios y evaluar
        expr = expr.replace(' ', '')
        resultado = eval(expr)
        return resultado
    except:
        return None

def main():
    import sys
    sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None
    
    print("=" * 80)
    print("VERIFICACIÓN: Incrementos del día 1 en importe inicial del día 1")
    print("=" * 80)
    print("Iniciando verificación...")
    
    # Cargar datos
    try:
        with open('datos_completos.json', 'r', encoding='utf-8') as f:
            datos = json.load(f)
        print("✅ JSON cargado correctamente")
    except Exception as e:
        print(f"❌ Error al cargar JSON: {e}")
        return
    
    # Buscar hoja "Diario VIP"
    hoja_vip = None
    for nombre_hoja, hoja_data in datos.get('hojas', {}).items():
        if nombre_hoja == 'Diario VIP':
            hoja_vip = hoja_data
            break
    
    if not hoja_vip:
        print("❌ No se encontró la hoja 'Diario VIP'")
        return
    
    print(f"\n✅ Hoja 'Diario VIP' encontrada")
    print(f"   Clientes: {len(hoja_vip.get('clientes', []))}")
    
    # Buscar datos del día 1 de enero (fila 15)
    datos_diarios = hoja_vip.get('datos_diarios_generales', [])
    fila_15 = next((f for f in datos_diarios if f.get('fila') == 15), None)
    
    if not fila_15:
        print("❌ No se encontró la fila 15 (día 1 de enero)")
        return
    
    print(f"\n📅 Fila 15 (día 1 de enero):")
    print(f"   Fecha: {fila_15.get('fecha')}")
    print(f"   imp_inicial actual: {fila_15.get('imp_inicial')}")
    print(f"   Fórmula: {fila_15.get('formulas', {}).get('imp_inicial', 'Sin fórmula')}")
    
    # Verificar incrementos del día 1 en todos los clientes
    print(f"\n📊 Incrementos del día 1 en clientes (fila 15):")
    suma_incrementos = 0
    suma_decrementos = 0
    
    for cliente in hoja_vip.get('clientes', []):
        datos_cliente = cliente.get('datos_diarios', [])
        dato_dia1 = next((d for d in datos_cliente if d.get('fila') == 15), None)
        
        if dato_dia1:
            incremento = dato_dia1.get('incremento', 0) or 0
            decremento = dato_dia1.get('decremento', 0) or 0
            
            if incremento > 0 or decremento > 0:
                print(f"   Cliente {cliente.get('numero_cliente', '?')}: inc={incremento}, dec={decremento}")
            
            suma_incrementos += incremento
            suma_decrementos += decremento
    
    print(f"\n   TOTAL incrementos: {suma_incrementos}")
    print(f"   TOTAL decrementos: {suma_decrementos}")
    print(f"   TOTAL (inc - dec): {suma_incrementos - suma_decrementos}")
    
    # Evaluar la fórmula del día 1
    formula_imp_inicial = fila_15.get('formulas', {}).get('imp_inicial')
    if formula_imp_inicial:
        print(f"\n🔍 Evaluando fórmula: {formula_imp_inicial}")
        print(f"   Desde fila: 15")
        
        valor_calculado = evaluar_formula(formula_imp_inicial, 15, hoja_vip)
        
        print(f"\n📈 RESULTADOS:")
        print(f"   Valor actual en JSON: {fila_15.get('imp_inicial')}")
        print(f"   Valor calculado: {valor_calculado}")
        print(f"   Incrementos esperados (FA15): {suma_incrementos - suma_decrementos}")
        
        if valor_calculado is not None:
            diferencia = abs(valor_calculado - (suma_incrementos - suma_decrementos))
            if diferencia < 0.01:
                print(f"\n✅ CORRECTO: El valor calculado coincide con los incrementos del día 1")
            else:
                print(f"\n❌ ERROR: El valor calculado NO coincide con los incrementos del día 1")
                print(f"   Diferencia: {diferencia}")
        else:
            print(f"\n❌ ERROR: No se pudo calcular el valor de la fórmula")
    else:
        print(f"\n⚠️ La fila 15 no tiene fórmula de imp_inicial")
    
    # Verificar también el día 2 para comparar
    fila_18 = next((f for f in datos_diarios if f.get('fila') == 18), None)
    if fila_18:
        print(f"\n" + "=" * 80)
        print(f"COMPARACIÓN: Día 2 (fila 18)")
        print("=" * 80)
        print(f"   Fecha: {fila_18.get('fecha')}")
        print(f"   imp_inicial actual: {fila_18.get('imp_inicial')}")
        print(f"   Fórmula: {fila_18.get('formulas', {}).get('imp_inicial', 'Sin fórmula')}")
        
        # Verificar incrementos del día 2
        suma_inc_dia2 = 0
        suma_dec_dia2 = 0
        for cliente in hoja_vip.get('clientes', []):
            datos_cliente = cliente.get('datos_diarios', [])
            dato_dia2 = next((d for d in datos_cliente if d.get('fila') == 18), None)
            if dato_dia2:
                suma_inc_dia2 += dato_dia2.get('incremento', 0) or 0
                suma_dec_dia2 += dato_dia2.get('decremento', 0) or 0
        
        print(f"   Incrementos día 2 (fila 18): {suma_inc_dia2 - suma_dec_dia2}")
        
        formula_dia2 = fila_18.get('formulas', {}).get('imp_inicial')
        if formula_dia2:
            print(f"\n   Evaluando fórmula día 2: {formula_dia2}")
            valor_dia2 = evaluar_formula(formula_dia2, 18, hoja_vip)
            print(f"   Valor calculado día 2: {valor_dia2}")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        import traceback
        print(f"❌ Error: {e}")
        traceback.print_exc()
