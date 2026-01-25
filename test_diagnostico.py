#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de diagnóstico para identificar problemas en DIARIO_WIND
"""
import json
import urllib.request
import urllib.error
import time

BASE_URL = 'http://localhost:8000'

def http_get(url):
    """GET request sin dependencias externas"""
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode('utf-8'))

def http_post(url, data):
    """POST request sin dependencias externas"""
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode('utf-8'))

def test_completo():
    print("=" * 60)
    print("DIAGNÓSTICO COMPLETO DIARIO_WIND")
    print("=" * 60)
    
    # 1. Verificar que el servidor responde
    print("\n1. VERIFICAR SERVIDOR")
    try:
        meses = http_get(f'{BASE_URL}/api/meses')
        print("   ✅ Servidor responde correctamente")
        print(f"   Hojas disponibles: {list(meses.keys())}")
    except Exception as e:
        print(f"   ❌ Servidor no responde: {e}")
        return
    
    # 2. Cargar datos originales de DIARIO_WIND
    print("\n2. CARGAR DATOS ORIGINALES")
    try:
        datos_originales = http_get(f'{BASE_URL}/api/datos/Diario_WIND/2026-01')
        print(f"   ✅ Datos cargados")
        print(f"   Clientes: {len(datos_originales.get('clientes', []))}")
        print(f"   Días generales: {len(datos_originales.get('datos_diarios_generales', []))}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return
    
    # 3. Verificar estructura del día 1 (fila 15)
    print("\n3. VERIFICAR ESTRUCTURA DÍA 1 (FILA 15)")
    dia1_general = None
    for d in datos_originales.get('datos_diarios_generales', []):
        if d.get('fila') == 15:
            dia1_general = d
            break
    
    if dia1_general:
        print(f"   Fecha: {dia1_general.get('fecha')}")
        print(f"   imp_inicial: {dia1_general.get('imp_inicial')}")
        print(f"   imp_final: {dia1_general.get('imp_final')}")
        print(f"   Fórmula imp_inicial: {dia1_general.get('formulas', {}).get('imp_inicial')}")
        print(f"   Bloqueado imp_inicial: {dia1_general.get('bloqueadas', {}).get('imp_inicial')}")
        print(f"   Bloqueado imp_final: {dia1_general.get('bloqueadas', {}).get('imp_final')}")
    else:
        print("   ❌ No se encontró fila 15")
    
    # 4. Verificar cliente 1, día 1
    print("\n4. VERIFICAR CLIENTE 1, DÍA 1 (FILA 15)")
    cliente1 = datos_originales.get('clientes', [{}])[0] if datos_originales.get('clientes') else None
    if cliente1:
        dia1_cliente = None
        for d in cliente1.get('datos_diarios', []):
            if d.get('fila') == 15:
                dia1_cliente = d
                break
        
        if dia1_cliente:
            print(f"   Fecha: {dia1_cliente.get('fecha')}")
            print(f"   incremento: {dia1_cliente.get('incremento')}")
            print(f"   decremento: {dia1_cliente.get('decremento')}")
            print(f"   Bloqueado incremento: {dia1_cliente.get('bloqueadas', {}).get('incremento')}")
        else:
            print("   ❌ Cliente 1 no tiene datos en fila 15")
    else:
        print("   ❌ No hay clientes")
    
    # 5. Simular: Poner 1000€ en incremento del cliente 1
    print("\n5. SIMULAR: PONER 1000€ EN INCREMENTO CLIENTE 1")
    datos_modificados = json.loads(json.dumps(datos_originales))  # Copia profunda
    
    cliente1_mod = datos_modificados['clientes'][0]
    for d in cliente1_mod.get('datos_diarios', []):
        if d.get('fila') == 15:
            d['incremento'] = 1000
            print(f"   ✅ Incremento establecido a 1000")
            break
    
    # 6. Calcular imp_inicial según fórmula
    print("\n6. CALCULAR IMP_INICIAL SEGÚN FÓRMULA")
    formula = dia1_general.get('formulas', {}).get('imp_inicial') if dia1_general else None
    print(f"   Fórmula: {formula}")
    
    # Sumar incrementos de todos los clientes en fila 15
    suma_inc = 0
    suma_dec = 0
    for cliente in datos_modificados['clientes']:
        for d in cliente.get('datos_diarios', []):
            if d.get('fila') == 15:
                suma_inc += d.get('incremento') or 0
                suma_dec += d.get('decremento') or 0
    
    imp_inicial_calculado = suma_inc - suma_dec
    print(f"   Suma incrementos fila 15: {suma_inc}")
    print(f"   Suma decrementos fila 15: {suma_dec}")
    print(f"   imp_inicial calculado: {imp_inicial_calculado}")
    
    # 7. Guardar datos modificados
    print("\n7. GUARDAR DATOS MODIFICADOS")
    try:
        resultado = http_post(f'{BASE_URL}/api/guardar/Diario_WIND/2026-01', datos_modificados)
        if resultado.get('success'):
            print("   ✅ Datos guardados correctamente")
        else:
            print(f"   ❌ Error al guardar: {resultado}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # 8. Verificar que se guardaron
    print("\n8. VERIFICAR QUE SE GUARDARON")
    time.sleep(0.5)  # Esperar un poco
    try:
        datos_recargados = http_get(f'{BASE_URL}/api/datos/Diario_WIND/2026-01')
        
        cliente1_recargado = datos_recargados['clientes'][0]
        for d in cliente1_recargado.get('datos_diarios', []):
            if d.get('fila') == 15:
                inc = d.get('incremento')
                print(f"   Incremento cliente 1, fila 15: {inc}")
                if inc == 1000:
                    print("   ✅ DATOS PERSISTIDOS CORRECTAMENTE")
                else:
                    print("   ❌ DATOS NO SE GUARDARON")
                break
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # 9. Verificar archivo en disco
    print("\n9. VERIFICAR ARCHIVO EN DISCO")
    try:
        with open('datos_mensuales/Diario_WIND_2026-01.json', 'r', encoding='utf-8') as f:
            datos_disco = json.load(f)
        
        cliente1_disco = datos_disco['clientes'][0]
        for d in cliente1_disco.get('datos_diarios', []):
            if d.get('fila') == 15:
                inc = d.get('incremento')
                print(f"   Incremento en disco: {inc}")
                if inc == 1000:
                    print("   ✅ ARCHIVO GUARDADO CORRECTAMENTE")
                else:
                    print("   ❌ ARCHIVO NO ACTUALIZADO")
                break
    except Exception as e:
        print(f"   ❌ Error leyendo archivo: {e}")
    
    print("\n" + "=" * 60)
    print("DIAGNÓSTICO COMPLETADO")
    print("=" * 60)

if __name__ == '__main__':
    test_completo()
