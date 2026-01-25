#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para separar datos_completos.json en archivos mensuales
Ejecutar una vez para crear los archivos iniciales
"""
import json
import os
import sys

def log(msg):
    print(msg)
    sys.stdout.flush()

def separar_por_mes():
    log("=" * 60)
    log("SEPARANDO DATOS POR MES")
    log("=" * 60)
    
    # Cargar datos
    log("\n1. Cargando datos_completos.json...")
    try:
        with open('datos_completos.json', 'r', encoding='utf-8') as f:
            datos = json.load(f)
        log(f"   ✓ Cargado correctamente")
    except Exception as e:
        log(f"   ✗ Error: {e}")
        return False
    
    # Crear directorio
    log("\n2. Creando directorio datos_mensuales/...")
    os.makedirs('datos_mensuales', exist_ok=True)
    log(f"   ✓ Directorio listo")
    
    # Procesar cada hoja
    todos_los_meses = set()
    archivos_creados = []
    
    for nombre_hoja, hoja in datos['hojas'].items():
        log(f"\n3. Procesando hoja: {nombre_hoja}")
        
        # Agrupar por mes
        datos_por_mes = {}
        
        # Primero, encontrar todos los meses en datos_diarios_generales
        for dato in hoja.get('datos_diarios_generales', []):
            fecha = dato.get('fecha', '')
            if fecha and isinstance(fecha, str) and len(fecha) >= 7:
                mes = fecha[:7]  # "2026-01"
                if mes not in datos_por_mes:
                    # Inicializar estructura del mes
                    datos_por_mes[mes] = {
                        'datos_generales': list(hoja.get('datos_generales', [])),
                        'datos_diarios_generales': [],
                        'clientes': []
                    }
                    # Inicializar clientes vacíos
                    for cliente in hoja.get('clientes', []):
                        datos_por_mes[mes]['clientes'].append({
                            'numero_cliente': cliente.get('numero_cliente'),
                            'datos': cliente.get('datos', {}),
                            'incrementos_total': 0,
                            'decrementos_total': 0,
                            'saldo_actual': None,
                            'datos_diarios': []
                        })
                
                datos_por_mes[mes]['datos_diarios_generales'].append(dato)
                todos_los_meses.add(mes)
        
        log(f"   - Encontrados {len(datos_por_mes)} meses")
        
        # Ahora agregar datos_diarios de cada cliente al mes correspondiente
        for idx_cliente, cliente in enumerate(hoja.get('clientes', [])):
            for dato in cliente.get('datos_diarios', []):
                fecha = dato.get('fecha', '')
                if fecha and isinstance(fecha, str) and len(fecha) >= 7:
                    mes = fecha[:7]
                    if mes in datos_por_mes and idx_cliente < len(datos_por_mes[mes]['clientes']):
                        datos_por_mes[mes]['clientes'][idx_cliente]['datos_diarios'].append(dato)
        
        # Guardar cada mes
        for mes, datos_mes in sorted(datos_por_mes.items()):
            nombre_archivo = f"datos_mensuales/{nombre_hoja.replace(' ', '_')}_{mes}.json"
            
            with open(nombre_archivo, 'w', encoding='utf-8') as f:
                json.dump(datos_mes, f, ensure_ascii=False, separators=(',', ':'))
            
            tamanio_kb = os.path.getsize(nombre_archivo) / 1024
            num_filas = len(datos_mes['datos_diarios_generales'])
            num_clientes_con_datos = len([c for c in datos_mes['clientes'] if c['datos_diarios']])
            
            log(f"   ✓ {mes}: {num_filas} filas, {num_clientes_con_datos} clientes -> {tamanio_kb:.1f} KB")
            archivos_creados.append(nombre_archivo)
    
    # Crear índice
    log("\n4. Creando índice de meses...")
    indice = {
        'hojas': list(datos['hojas'].keys()),
        'meses': sorted(list(todos_los_meses))
    }
    with open('datos_mensuales/indice.json', 'w', encoding='utf-8') as f:
        json.dump(indice, f, ensure_ascii=False, indent=2)
    log(f"   ✓ Índice creado con {len(indice['meses'])} meses")
    
    log("\n" + "=" * 60)
    log(f"✅ COMPLETADO: {len(archivos_creados)} archivos creados")
    log(f"📁 Directorio: datos_mensuales/")
    log(f"📋 Meses: {', '.join(sorted(todos_los_meses)[:5])}..." if len(todos_los_meses) > 5 else f"📋 Meses: {', '.join(sorted(todos_los_meses))}")
    log("=" * 60)
    
    return True

if __name__ == "__main__":
    separar_por_mes()
