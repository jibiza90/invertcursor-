#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Genera datos mensuales vacíos para DIARIO_WIND para todo el año 2026.
- 100 clientes
- 12 meses (enero a diciembre 2026)
- Fines de semana bloqueados
"""
import json
import os
from copy import deepcopy
from datetime import datetime, timedelta
import calendar

OUTPUT_DIR = 'datos_mensuales'
NUM_CLIENTES = 100
YEAR = 2026


def es_fin_de_semana(fecha_str):
    if not fecha_str:
        return False
    try:
        fecha = datetime.strptime(str(fecha_str)[:10], '%Y-%m-%d')
        return fecha.weekday() >= 5  # 5=sábado, 6=domingo
    except Exception:
        return False


def bloquear_todo(bloqueadas):
    """Pone todos los campos de bloqueadas a True"""
    if not bloqueadas:
        return bloqueadas
    return {k: True for k in bloqueadas.keys()}


def generar_mes(year, month):
    """Genera datos para un mes específico"""
    mes_str = f"{year}-{month:02d}"
    
    # Calcular días del mes
    num_dias = calendar.monthrange(year, month)[1]
    
    # Estructura de datos_generales (cabecera)
    datos_generales = [
        {
            "fila": 3,
            "fecha": f"{mes_str}-01 00:00:00",
            "imp_inicial": None,
            "imp_final": None,
            "benef_euro": "TOTAL € INVERSION",
            "benef_porcentaje": None,
            "benef_euro_acum": None,
            "benef_porcentaje_acum": None,
            "bloqueadas": {"imp_inicial": True, "imp_final": True, "benef_euro": False, "benef_porcentaje": False, "benef_euro_acum": False, "benef_porcentaje_acum": False},
            "formulas": {"imp_inicial": "=AEO11", "imp_final": "=AEO1124"}
        },
        {
            "fila": 4,
            "fecha": f"{mes_str}-06 00:00:00",
            "imp_inicial": None,
            "imp_final": None,
            "benef_euro": "TOTAL € INVERSION+BENEFICIOS",
            "benef_porcentaje": None,
            "benef_euro_acum": None,
            "benef_porcentaje_acum": None,
            "bloqueadas": {"imp_inicial": True, "imp_final": True, "benef_euro": False, "benef_porcentaje": False, "benef_euro_acum": False, "benef_porcentaje_acum": False},
            "formulas": {"imp_inicial": "=AEO8", "imp_final": "=SUM(AEM15:AEM1120)-SUM(AEN15:AEN1120)+AEO1128"}
        },
        {
            "fila": 5,
            "fecha": None,
            "imp_inicial": None,
            "imp_final": None,
            "benef_euro": "TOTAL € BENEFICIO",
            "benef_porcentaje": None,
            "benef_euro_acum": None,
            "benef_porcentaje_acum": None,
            "bloqueadas": {"imp_inicial": True, "imp_final": True, "benef_euro": False, "benef_porcentaje": False, "benef_euro_acum": False, "benef_porcentaje_acum": False},
            "formulas": {"imp_inicial": "=SUBTOTAL(9,G17:G1120)", "imp_final": "=AEO1128"}
        },
        {
            "fila": 6,
            "fecha": None,
            "imp_inicial": None,
            "imp_final": None,
            "benef_euro": "TOTAL % BENEFICIO",
            "benef_porcentaje": None,
            "benef_euro_acum": None,
            "benef_porcentaje_acum": None,
            "bloqueadas": {"imp_inicial": True, "imp_final": True, "benef_euro": False, "benef_porcentaje": False, "benef_euro_acum": False, "benef_porcentaje_acum": False},
            "formulas": {"imp_inicial": "=IF(E3<>0,E5/E3,0)", "imp_final": "=IF(F3<>0,F5/F3,0)"}
        }
    ]
    
    # Generar datos_diarios_generales para cada día del mes
    datos_diarios_generales = []
    fila_base = 15
    for dia in range(1, num_dias + 1):
        fecha = datetime(year, month, dia)
        fecha_str = fecha.strftime('%Y-%m-%d 00:00:00')
        es_finde = fecha.weekday() >= 5
        
        bloqueadas_general = {
            "imp_inicial": True,
            "imp_final": False,  # EDITABLE para que usuario pueda poner importe final del día
            "benef_euro": True,
            "benef_porcentaje": True,
            "benef_euro_acum": True,
            "benef_porcentaje_acum": True
        }
        
        # Fórmula imp_inicial: imp_final del día anterior + incrementos del día - decrementos del día
        # Para el primer día (fila 15), no hay día anterior, así que es 0 + incrementos - decrementos
        fila_actual = fila_base + dia - 1
        if dia == 1:
            # Primer día: imp_inicial = 0 + incrementos - decrementos
            formula_imp_inicial = f"=SUM(N{fila_actual}:AEL{fila_actual})-SUM(O{fila_actual}:AEM{fila_actual})"
        else:
            # Días siguientes: imp_final anterior + incrementos - decrementos
            fila_anterior = fila_actual - 1
            formula_imp_inicial = f"=F{fila_anterior}+SUM(N{fila_actual}:AEL{fila_actual})-SUM(O{fila_actual}:AEM{fila_actual})"
        
        # Bloquear fines de semana completamente
        if es_finde:
            bloqueadas_general = {
                "imp_inicial": True,
                "imp_final": True,
                "benef_euro": True,
                "benef_porcentaje": True,
                "benef_euro_acum": True,
                "benef_porcentaje_acum": True
            }
        
        dato_general = {
            "fila": fila_actual,
            "fecha": fecha_str,
            "imp_inicial": None,
            "imp_final": None,
            "benef_euro": None,
            "benef_porcentaje": None,
            "benef_euro_acum": None,
            "benef_porcentaje_acum": None,
            "bloqueadas": bloqueadas_general,
            "formulas": {"imp_inicial": formula_imp_inicial}
        }
        datos_diarios_generales.append(dato_general)
    
    # Generar 100 clientes
    clientes = []
    for i in range(1, NUM_CLIENTES + 1):
        cliente = {
            'numero_cliente': i,
            'datos': {'nombre': f'CLIENTE {i}'},
            'incrementos_total': 0,
            'decrementos_total': 0,
            'saldo_actual': None,
            'datos_diarios': []
        }
        
        # Generar datos_diarios para cada día del mes
        for dia in range(1, num_dias + 1):
            fecha = datetime(year, month, dia)
            fecha_str = fecha.strftime('%Y-%m-%d 00:00:00')
            es_finde = fecha.weekday() >= 5
            
            bloqueadas_cliente = {
                'incremento': es_finde,
                'decremento': es_finde,
                'base': True,
                'saldo_diario': True,
                'beneficio_diario': True,
                'beneficio_diario_pct': True,
                'beneficio_acumulado': True,
                'beneficio_acumulado_pct': True
            }
            
            dato_diario = {
                'fila': fila_base + dia - 1,
                'fecha': fecha_str,
                'incremento': None,
                'decremento': None,
                'base': None,
                'saldo_diario': None,
                'beneficio_diario': None,
                'beneficio_diario_pct': None,
                'beneficio_acumulado': None,
                'beneficio_acumulado_pct': None,
                'bloqueadas': bloqueadas_cliente,
                'formulas': {}
            }
            cliente['datos_diarios'].append(dato_diario)
        
        clientes.append(cliente)
    
    return {
        'datos_generales': datos_generales,
        'datos_diarios_generales': datos_diarios_generales,
        'clientes': clientes
    }


def main():
    print(f"Generando DIARIO_WIND para todo el año {YEAR}...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    total_archivos = 0
    total_size = 0
    
    for month in range(1, 13):
        mes_str = f"{YEAR}-{month:02d}"
        output_path = os.path.join(OUTPUT_DIR, f'Diario_WIND_{mes_str}.json')
        
        datos_mes = generar_mes(YEAR, month)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(datos_mes, f, ensure_ascii=False, separators=(',', ':'))
        
        size_kb = os.path.getsize(output_path) / 1024
        total_size += size_kb
        total_archivos += 1
        
        # Contar fines de semana bloqueados
        fines_semana = sum(1 for d in datos_mes['datos_diarios_generales'] 
                          if es_fin_de_semana(d.get('fecha')))
        
        print(f"   ✓ {mes_str}: {len(datos_mes['datos_diarios_generales'])} días, {fines_semana} fines de semana bloqueados, {size_kb:.1f} KB")
    
    print(f"\n✅ DIARIO_WIND generado para {total_archivos} meses")
    print(f"   - Clientes por mes: {NUM_CLIENTES}")
    print(f"   - Tamaño total: {total_size:.1f} KB")


if __name__ == '__main__':
    main()
