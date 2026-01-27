#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para eliminar el campo 'nombre' de cliente.datos en Diario_Xavi_2026.json
"""

import json
import os

archivo = "datos_mensuales/Diario_Xavi_2026.json"

print(f"Limpiando campo 'nombre' de {archivo}...")

# Leer JSON
with open(archivo, 'r', encoding='utf-8') as f:
    datos = json.load(f)

# Eliminar campo 'nombre' de todos los clientes
clientes_modificados = 0
for cliente in datos.get('clientes', []):
    if 'datos' in cliente and 'nombre' in cliente['datos']:
        del cliente['datos']['nombre']
        clientes_modificados += 1

print(f"Clientes modificados: {clientes_modificados}")

# Guardar JSON
with open(archivo, 'w', encoding='utf-8') as f:
    json.dump(datos, f, ensure_ascii=False, indent=2)

print(f"✓ Archivo actualizado: {archivo}")
print("Campo 'nombre' eliminado de todos los clientes")
