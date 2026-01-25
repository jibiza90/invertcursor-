#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test que simula el flujo completo del navegador:
1. Cargar datos
2. Modificar incremento del cliente 1
3. Guardar
4. Recargar y verificar
"""
import json
import urllib.request
import time

BASE_URL = 'http://localhost:8000'

def http_get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode('utf-8'))

def http_post(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode('utf-8'))

def test_browser_flow():
    print("=" * 60)
    print("TEST: FLUJO COMPLETO DEL NAVEGADOR")
    print("=" * 60)
    
    # 1. Cargar datos (como hace el navegador al iniciar)
    print("\n1. CARGAR DATOS INICIALES")
    datos = http_get(f'{BASE_URL}/api/datos/Diario_WIND/2026-01')
    print(f"   Clientes: {len(datos.get('clientes', []))}")
    
    # Verificar estado inicial del cliente 1, fila 15
    cliente1 = datos['clientes'][0]
    dia1 = next((d for d in cliente1['datos_diarios'] if d['fila'] == 15), None)
    print(f"   Cliente 1, fila 15, incremento inicial: {dia1.get('incremento') if dia1 else 'NO ENCONTRADO'}")
    
    # 2. Modificar incremento (como hace el usuario)
    print("\n2. MODIFICAR INCREMENTO A 5000€")
    if dia1:
        dia1['incremento'] = 5000
        print(f"   Nuevo valor: {dia1['incremento']}")
    
    # 3. Guardar (como hace guardarDatosAutomatico)
    print("\n3. GUARDAR DATOS")
    resultado = http_post(f'{BASE_URL}/api/guardar/Diario_WIND/2026-01', datos)
    print(f"   Resultado: {resultado}")
    
    # 4. Esperar un momento
    time.sleep(0.5)
    
    # 5. Recargar datos (como hace el navegador al refrescar)
    print("\n4. RECARGAR DATOS (SIMULA F5)")
    datos_recargados = http_get(f'{BASE_URL}/api/datos/Diario_WIND/2026-01')
    
    cliente1_recargado = datos_recargados['clientes'][0]
    dia1_recargado = next((d for d in cliente1_recargado['datos_diarios'] if d['fila'] == 15), None)
    inc_recargado = dia1_recargado.get('incremento') if dia1_recargado else None
    
    print(f"   Cliente 1, fila 15, incremento después de recargar: {inc_recargado}")
    
    if inc_recargado == 5000:
        print("\n✅ TEST PASADO: Los datos persisten correctamente")
    else:
        print(f"\n❌ TEST FALLIDO: Esperado 5000, obtenido {inc_recargado}")
    
    # 6. Verificar archivo en disco
    print("\n5. VERIFICAR ARCHIVO EN DISCO")
    with open('datos_mensuales/Diario_WIND_2026-01.json', 'r', encoding='utf-8') as f:
        datos_disco = json.load(f)
    
    cliente1_disco = datos_disco['clientes'][0]
    dia1_disco = next((d for d in cliente1_disco['datos_diarios'] if d['fila'] == 15), None)
    inc_disco = dia1_disco.get('incremento') if dia1_disco else None
    
    print(f"   Incremento en archivo: {inc_disco}")
    
    if inc_disco == 5000:
        print("   ✅ Archivo guardado correctamente")
    else:
        print(f"   ❌ Archivo NO actualizado (esperado 5000, obtenido {inc_disco})")
    
    # 7. Verificar imp_inicial calculado
    print("\n6. VERIFICAR IMP_INICIAL CALCULADO")
    dia1_general = next((d for d in datos_recargados['datos_diarios_generales'] if d['fila'] == 15), None)
    if dia1_general:
        formula = dia1_general.get('formulas', {}).get('imp_inicial')
        print(f"   Fórmula imp_inicial: {formula}")
        
        # Calcular manualmente
        suma_inc = 0
        for cliente in datos_recargados['clientes']:
            d = next((x for x in cliente['datos_diarios'] if x['fila'] == 15), None)
            if d:
                suma_inc += d.get('incremento') or 0
        
        print(f"   Suma de incrementos fila 15: {suma_inc}")
        print(f"   imp_inicial debería ser: {suma_inc}")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETADO")
    print("=" * 60)
    print("\nSi el test pasa pero el navegador no funciona, el problema está en el JavaScript.")
    print("Abre la consola del navegador (F12) y busca errores o logs de 'guardarDatosAutomatico'")

if __name__ == '__main__':
    test_browser_flow()
