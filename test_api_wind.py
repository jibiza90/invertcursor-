#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test del endpoint API para DIARIO_WIND
"""
import urllib.request
import json

BASE_URL = "http://localhost:8000"

def test_meses():
    print("Testing /api/meses...")
    try:
        req = urllib.request.urlopen(f"{BASE_URL}/api/meses", timeout=5)
        data = json.loads(req.read().decode('utf-8'))
        print(f"  Hojas disponibles: {list(data.keys())}")
        if 'Diario WIND' in data:
            print(f"  ✅ Diario WIND encontrado con meses: {data['Diario WIND']}")
            return True
        else:
            print(f"  ❌ Diario WIND NO encontrado")
            return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_datos_wind():
    print("\nTesting /api/datos/Diario_WIND/2026-01...")
    try:
        req = urllib.request.urlopen(f"{BASE_URL}/api/datos/Diario_WIND/2026-01", timeout=10)
        data = json.loads(req.read().decode('utf-8'))
        print(f"  Clientes: {len(data.get('clientes', []))}")
        print(f"  Datos diarios generales: {len(data.get('datos_diarios_generales', []))}")
        print(f"  ✅ Datos cargados correctamente")
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

if __name__ == '__main__':
    print("=== TEST API DIARIO_WIND ===\n")
    ok1 = test_meses()
    ok2 = test_datos_wind()
    print("\n" + "="*40)
    if ok1 and ok2:
        print("✅ TODOS LOS TESTS PASARON")
    else:
        print("❌ ALGUNOS TESTS FALLARON")
