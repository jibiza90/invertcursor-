#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para separar datos_completos.json en archivos mensuales
"""
import json
import os
import sys
from collections import defaultdict

def separar_por_mes():
    print("Cargando datos_completos.json...", flush=True)
    
    try:
        with open('datos_completos.json', 'r', encoding='utf-8') as f:
            datos = json.load(f)
        print(f"✓ Archivo cargado correctamente", flush=True)
    except Exception as e:
        print(f"✗ Error al cargar: {e}", flush=True)
        return
    
    # Crear directorio para datos mensuales
    os.makedirs('datos_mensuales', exist_ok=True)
    print(f"✓ Directorio datos_mensuales creado", flush=True)
    
    todos_los_meses = set()
    
    for nombre_hoja, hoja in datos['hojas'].items():
        print(f"\nProcesando hoja: {nombre_hoja}", flush=True)
        
        # Diccionario para agrupar por mes
        datos_por_mes = {}
        
        # Obtener todos los meses únicos de datos_diarios_generales
        for dato in hoja.get('datos_diarios_generales', []):
            fecha_str = dato.get('fecha', '')
            if fecha_str and isinstance(fecha_str, str) and len(fecha_str) >= 7:
                mes_key = fecha_str[:7]  # "2026-01"
                if mes_key not in datos_por_mes:
                    datos_por_mes[mes_key] = {
                        'datos_generales': list(hoja.get('datos_generales', [])),
                        'datos_diarios_generales': [],
                        'clientes': [{'numero_cliente': c.get('numero_cliente'), 
                                     'datos': c.get('datos', {}),
                                     'incrementos_total': 0,
                                     'decrementos_total': 0,
                                     'saldo_actual': None,
                                     'datos_diarios': []} 
                                    for c in hoja.get('clientes', [])]
                    }
                datos_por_mes[mes_key]['datos_diarios_generales'].append(dato)
                todos_los_meses.add(mes_key)
        
        # Agrupar datos_diarios de clientes por mes
        for idx_cliente, cliente in enumerate(hoja.get('clientes', [])):
            for dato in cliente.get('datos_diarios', []):
                fecha_str = dato.get('fecha', '')
                if fecha_str and isinstance(fecha_str, str) and len(fecha_str) >= 7:
                    mes_key = fecha_str[:7]
                    if mes_key in datos_por_mes:
                        datos_por_mes[mes_key]['clientes'][idx_cliente]['datos_diarios'].append(dato)
        
        # Guardar cada mes en un archivo separado
        for mes_key, datos_mes in datos_por_mes.items():
            nombre_archivo = f"datos_mensuales/{nombre_hoja.replace(' ', '_')}_{mes_key}.json"
            with open(nombre_archivo, 'w', encoding='utf-8') as f:
                json.dump(datos_mes, f, ensure_ascii=False, separators=(',', ':'))
            
            num_filas = len(datos_mes['datos_diarios_generales'])
            num_clientes = len([c for c in datos_mes['clientes'] if c['datos_diarios']])
            tamanio = os.path.getsize(nombre_archivo) / 1024
            print(f"  ✓ {mes_key}: {num_filas} filas, {num_clientes} clientes con datos -> {nombre_archivo} ({tamanio:.1f} KB)", flush=True)
    
    # Crear índice de meses disponibles
    meses_ordenados = sorted(list(todos_los_meses))
    indice = {
        'hojas': list(datos['hojas'].keys()),
        'meses': meses_ordenados
    }
    
    with open('datos_mensuales/indice.json', 'w', encoding='utf-8') as f:
        json.dump(indice, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Datos separados en {len(todos_los_meses)} meses", flush=True)
    print(f"📁 Archivos guardados en: datos_mensuales/", flush=True)
    print(f"📋 Meses disponibles: {', '.join(meses_ordenados)}", flush=True)

if __name__ == "__main__":
    separar_por_mes()
