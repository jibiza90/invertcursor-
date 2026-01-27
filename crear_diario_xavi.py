#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de Diario Xavi 2026 (anual, 365 días continuos)

Reglas:
- 365 días desde 2026-01-01 hasta 2026-12-31
- 100 clientes
- Fin de semana: sábado y domingo tienen inc/dec bloqueados y general arrastra
- Estructura similar a WIND pero sin memoria (solo se guardan campos editables)
"""

import json
from datetime import datetime, timedelta

def generar_diario_xavi_2026():
    """Genera el JSON anual completo de Diario Xavi para 2026"""
    
    # Configuración
    year = 2026
    num_clientes = 100
    fecha_inicio = datetime(year, 1, 1)
    fecha_fin = datetime(year, 12, 31)
    
    # Calcular número de días
    num_dias = (fecha_fin - fecha_inicio).days + 1
    
    print(f"Generando Diario Xavi {year} con {num_dias} días y {num_clientes} clientes...")
    
    # Estructura base
    datos = {
        "datos_generales": [],
        "datos_diarios_generales": [],
        "clientes": []
    }
    
    # ========== DATOS GENERALES (filas resumen 3-6) ==========
    # Fila 3: totales del año
    datos["datos_generales"].append({
        "fila": 3,
        "fecha": f"{year}-01-01 00:00:00",
        "imp_inicial": None,
        "imp_final": None,
        "benef_euro": None,
        "benef_porcentaje": None,
        "benef_euro_acum": None,
        "benef_porcentaje_acum": None,
        "bloqueadas": {
            "imp_inicial": True,
            "imp_final": True,
            "benef_euro": True,
            "benef_porcentaje": True,
            "benef_euro_acum": True,
            "benef_porcentaje_acum": True
        },
        "formulas": {
            "imp_inicial": "=AEO11",
            "imp_final": "=AEO1124"
        }
    })
    
    # Fila 4: movimientos netos
    datos["datos_generales"].append({
        "fila": 4,
        "fecha": f"{year}-12-31 00:00:00",
        "imp_inicial": None,
        "imp_final": None,
        "benef_euro": None,
        "benef_porcentaje": None,
        "benef_euro_acum": None,
        "benef_porcentaje_acum": None,
        "bloqueadas": {
            "imp_inicial": True,
            "imp_final": True,
            "benef_euro": True,
            "benef_porcentaje": True,
            "benef_euro_acum": True,
            "benef_porcentaje_acum": True
        },
        "formulas": {
            "imp_inicial": "=AEO8",
            "imp_final": "=SUM(AEM15:AEM1120)-SUM(AEN15:AEN1120)+AEO1128"
        }
    })
    
    # Fila 5: beneficios totales
    datos["datos_generales"].append({
        "fila": 5,
        "fecha": None,
        "imp_inicial": None,
        "imp_final": None,
        "benef_euro": None,
        "benef_porcentaje": None,
        "benef_euro_acum": None,
        "benef_porcentaje_acum": None,
        "bloqueadas": {
            "imp_inicial": True,
            "imp_final": True,
            "benef_euro": True,
            "benef_porcentaje": True,
            "benef_euro_acum": True,
            "benef_porcentaje_acum": True
        },
        "formulas": {
            "imp_inicial": "=SUBTOTAL(9,G17:G1120)",
            "imp_final": "=AEO1128"
        }
    })
    
    # Fila 6: rentabilidad
    datos["datos_generales"].append({
        "fila": 6,
        "fecha": None,
        "imp_inicial": None,
        "imp_final": None,
        "benef_euro": None,
        "benef_porcentaje": None,
        "benef_euro_acum": None,
        "benef_porcentaje_acum": None,
        "bloqueadas": {
            "imp_inicial": True,
            "imp_final": True,
            "benef_euro": True,
            "benef_porcentaje": True,
            "benef_euro_acum": True,
            "benef_porcentaje_acum": True
        },
        "formulas": {
            "imp_inicial": "=IF(E3<>0,E5/E3,0)",
            "imp_final": "=IF(F3<>0,F5/F3,0)"
        }
    })
    
    # ========== DATOS DIARIOS GENERALES (365 días) ==========
    fila_actual = 15
    
    for dia in range(num_dias):
        fecha = fecha_inicio + timedelta(days=dia)
        fecha_str = fecha.strftime("%Y-%m-%d 00:00:00")
        dia_semana = fecha.weekday()  # 0=lunes, 5=sábado, 6=domingo
        es_finde = dia_semana in [5, 6]
        
        # Fórmula de imp_inicial
        if fila_actual == 15:
            # Primer día del año: suma de saldos iniciales de clientes
            formula_imp_inicial = f"=SUM(N{fila_actual}:AEL{fila_actual})-SUM(O{fila_actual}:AEM{fila_actual})"
        else:
            # Días siguientes: imp_final anterior + movimientos del día
            formula_imp_inicial = f"=F{fila_actual-1}+SUM(N{fila_actual}:AEL{fila_actual})-SUM(O{fila_actual}:AEM{fila_actual})"
        
        datos["datos_diarios_generales"].append({
            "fila": fila_actual,
            "fecha": fecha_str,
            "imp_inicial": None,
            "imp_final": None,
            "benef_euro": None,
            "benef_porcentaje": None,
            "benef_euro_acum": None,
            "benef_porcentaje_acum": None,
            "bloqueadas": {
                "imp_inicial": True,
                "imp_final": es_finde,  # Bloqueado en fin de semana
                "benef_euro": True,
                "benef_porcentaje": True,
                "benef_euro_acum": True,
                "benef_porcentaje_acum": True
            },
            "formulas": {
                "imp_inicial": formula_imp_inicial
            }
        })
        
        fila_actual += 1
    
    # ========== CLIENTES (100) ==========
    for num_cliente in range(1, num_clientes + 1):
        cliente = {
            "numero_cliente": num_cliente,
            "datos": {
                "nombre": f"CLIENTE {num_cliente}",
                "NOMBRE": {"valor": ""},
                "APELLIDOS": {"valor": ""},
                "TELEFONO": {"valor": ""},
                "GARANTIA_INICIAL": {"valor": ""},
                "GARANTIA": {"valor": ""}
            },
            "incrementos_total": 0,
            "decrementos_total": 0,
            "saldo_actual": 0,
            "saldo_inicial_mes": 0,
            "datos_diarios": []
        }
        
        # Datos diarios del cliente (365 días)
        fila_actual = 15
        
        for dia in range(num_dias):
            fecha = fecha_inicio + timedelta(days=dia)
            fecha_str = fecha.strftime("%Y-%m-%d 00:00:00")
            dia_semana = fecha.weekday()
            es_finde = dia_semana in [5, 6]
            
            cliente["datos_diarios"].append({
                "fila": fila_actual,
                "fecha": fecha_str,
                "incremento": None,
                "decremento": None,
                "base": None,
                "saldo_diario": None,
                "beneficio_diario": None,
                "beneficio_diario_pct": None,
                "beneficio_acumulado": None,
                "beneficio_acumulado_pct": None,
                "bloqueadas": {
                    "incremento": es_finde,  # Bloqueado en fin de semana
                    "decremento": es_finde,  # Bloqueado en fin de semana
                    "base": True,
                    "saldo_diario": True,
                    "beneficio_diario": True,
                    "beneficio_diario_pct": True,
                    "beneficio_acumulado": True,
                    "beneficio_acumulado_pct": True
                },
                "formulas": {}
            })
            
            fila_actual += 1
        
        datos["clientes"].append(cliente)
    
    # Guardar JSON
    import os
    output_path = "datos_mensuales/Diario_Xavi_2026.json"
    
    # Verificar que el directorio existe
    os.makedirs("datos_mensuales", exist_ok=True)
    
    print(f"Guardando en: {os.path.abspath(output_path)}")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Generado: {output_path}")
    print(f"  - {len(datos['datos_generales'])} filas generales resumen")
    print(f"  - {len(datos['datos_diarios_generales'])} días")
    print(f"  - {len(datos['clientes'])} clientes")
    print(f"  - Total filas por cliente: {len(datos['clientes'][0]['datos_diarios'])}")
    
    # Verificar fin de semana
    fines_semana = [d for d in datos["datos_diarios_generales"] 
                    if datetime.strptime(d["fecha"], "%Y-%m-%d %H:%M:%S").weekday() in [5, 6]]
    print(f"  - Días de fin de semana: {len(fines_semana)} (imp_final bloqueado)")
    
    return datos

if __name__ == "__main__":
    generar_diario_xavi_2026()
