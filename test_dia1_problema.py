#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test para diagnosticar el problema del día 01/01/2026
"""
import json
import sys

def main():
    # Intentar cargar datos_editados.json primero, si no existe usar datos_completos.json
    try:
        with open('datos_editados.json', 'r', encoding='utf-8') as f:
            datos = json.load(f)
        print("Usando datos_editados.json")
    except:
        with open('datos_completos.json', 'r', encoding='utf-8') as f:
            datos = json.load(f)
        print("Usando datos_completos.json")
    
    hoja = datos['hojas']['Diario STD']
    
    # 1. Verificar datos_diarios_generales fila 15
    print("\n" + "="*70)
    print("1. DATOS GENERALES - FILA 15 (día 01/01/2026)")
    print("="*70)
    
    diarios = hoja.get('datos_diarios_generales', [])
    fila15 = None
    for d in diarios:
        if d.get('fila') == 15:
            fila15 = d
            break
    
    if fila15:
        print(f"   fecha: {fila15.get('fecha')}")
        print(f"   imp_inicial: {fila15.get('imp_inicial')}")
        print(f"   imp_final: {fila15.get('imp_final')}")
        print(f"   formulas: {fila15.get('formulas')}")
        print(f"   bloqueadas: {fila15.get('bloqueadas')}")
    else:
        print("   ERROR: No se encontró fila 15 en datos_diarios_generales")
    
    # 2. Verificar incrementos de clientes en fila 15
    print("\n" + "="*70)
    print("2. CLIENTES - INCREMENTOS EN FILA 15")
    print("="*70)
    
    clientes = hoja.get('clientes', [])
    print(f"   Total clientes: {len(clientes)}")
    
    suma_incrementos = 0
    for i, cliente in enumerate(clientes):
        nombre = cliente.get('nombre', f'Cliente {i+1}')
        datos_cliente = cliente.get('datos_diarios', [])
        
        # Buscar fila 15 en los datos del cliente
        fila15_cliente = None
        for d in datos_cliente:
            if d.get('fila') == 15:
                fila15_cliente = d
                break
        
        if fila15_cliente:
            inc = fila15_cliente.get('incremento')
            dec = fila15_cliente.get('decremento')
            base = fila15_cliente.get('base')
            saldo = fila15_cliente.get('saldo_diario')
            
            # Solo mostrar si tiene datos relevantes
            if inc or dec or base or saldo:
                print(f"\n   Cliente {i+1} ({nombre}):")
                print(f"      fila: {fila15_cliente.get('fila')}")
                print(f"      fecha: {fila15_cliente.get('fecha')}")
                print(f"      incremento: {inc} (tipo: {type(inc).__name__})")
                print(f"      decremento: {dec}")
                print(f"      base: {base}")
                print(f"      saldo_diario: {saldo}")
                
                if isinstance(inc, (int, float)) and inc > 0:
                    suma_incrementos += inc
        else:
            # Verificar qué filas tiene el cliente
            filas_cliente = [d.get('fila') for d in datos_cliente[:10]]
            if i < 5:  # Solo mostrar para primeros 5 clientes
                print(f"\n   Cliente {i+1}: NO tiene fila 15")
                print(f"      Primeras filas disponibles: {filas_cliente}")
    
    print(f"\n   SUMA TOTAL DE INCREMENTOS EN FILA 15: {suma_incrementos}")
    
    # 3. Verificar la fórmula esperada
    print("\n" + "="*70)
    print("3. EVALUACIÓN DE FÓRMULA imp_inicial = FA16")
    print("="*70)
    print(f"   Fórmula en fila 15: =FA16")
    print(f"   FA16 debería ser la suma de incrementos-decrementos de todos los clientes en fila 15")
    print(f"   Valor calculado: {suma_incrementos}")
    
    if fila15:
        imp_inicial_actual = fila15.get('imp_inicial')
        print(f"   Valor actual en imp_inicial: {imp_inicial_actual}")
        
        if imp_inicial_actual == 0 and suma_incrementos > 0:
            print("\n   ⚠️ PROBLEMA DETECTADO: imp_inicial es 0 pero hay incrementos!")
            print("   Posibles causas:")
            print("   1. La fórmula no se está evaluando correctamente")
            print("   2. El incremento no está en la fila esperada")
            print("   3. El tipo de dato del incremento no es numérico")
    
    # 4. Verificar estructura de filas del primer cliente
    print("\n" + "="*70)
    print("4. ESTRUCTURA DE FILAS DEL PRIMER CLIENTE")
    print("="*70)
    
    if clientes:
        cliente1 = clientes[0]
        datos_c1 = cliente1.get('datos_diarios', [])
        print(f"   Total filas: {len(datos_c1)}")
        
        # Mostrar primeras 10 filas
        print("   Primeras 10 filas:")
        for d in datos_c1[:10]:
            fila = d.get('fila')
            fecha = d.get('fecha')
            inc = d.get('incremento')
            print(f"      Fila {fila}: fecha={fecha}, incremento={inc}")

if __name__ == '__main__':
    main()
