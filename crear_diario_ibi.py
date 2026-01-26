import json
from datetime import datetime, timedelta

# Crear estructura para Diario IBI - Anual completo (1 enero - 31 diciembre 2026)
# Basado en Diario WIND pero sin meses separados

def es_fin_de_semana(fecha):
    return fecha.weekday() >= 5  # 5=sábado, 6=domingo

def crear_diario_ibi_anual():
    # Estructura base
    data = {
        "año": 2026,
        "hoja": "Diario IBI",
        "tipo": "anual",  # Marca para identificar que es anual
        "datos_generales": [],
        "datos_diarios_generales": [],
        "clientes": []
    }
    
    # Generar todas las fechas del año 2026
    fecha_inicio = datetime(2026, 1, 1)
    fecha_fin = datetime(2026, 12, 31)
    
    fila = 15  # Empezar en fila 15 como WIND
    fecha_actual = fecha_inicio
    
    while fecha_actual <= fecha_fin:
        es_finde = es_fin_de_semana(fecha_actual)
        
        dato_general = {
            "fila": fila,
            "fecha": fecha_actual.strftime("%Y-%m-%d 00:00:00"),
            "imp_inicial": None,
            "imp_final": None,
            "benef_euro": None,
            "benef_porcentaje": None,
            "benef_euro_acum": None,
            "benef_porcentaje_acum": None,
            "bloqueadas": {
                "imp_inicial": True,  # Siempre bloqueado (fórmula)
                "imp_final": es_finde,  # Bloqueado en fines de semana
                "benef_euro": True,
                "benef_porcentaje": True,
                "benef_euro_acum": True,
                "benef_porcentaje_acum": True
            },
            "formulas": {
                "imp_inicial": f"=SUM(N{fila}:AEL{fila})-SUM(O{fila}:AEM{fila})"
            }
        }
        
        data["datos_diarios_generales"].append(dato_general)
        
        fila += 1
        fecha_actual += timedelta(days=1)
    
    # Crear 100 clientes (como WIND)
    for cliente_num in range(1, 101):
        columna_inicio = 11 + ((cliente_num - 1) * 8)
        
        cliente = {
            "numero_cliente": cliente_num,
            "columna_inicio": columna_inicio,
            "datos": {
                "nombre": f"CLIENTE {cliente_num}",
                "NOMBRE": {"valor": ""},
                "APELLIDOS": {"valor": ""},
                "TELEFONO": {"valor": ""},
                "GARANTIA_INICIAL": {"valor": ""},
                "GARANTIA": {"valor": ""}
            },
            "datos_diarios": [],
            "incrementos_total": 0,
            "decrementos_total": 0,
            "saldo_actual": 0
        }
        
        # Generar datos diarios para cada fecha del año
        fila = 15
        fecha_actual = fecha_inicio
        
        while fecha_actual <= fecha_fin:
            es_finde = es_fin_de_semana(fecha_actual)
            
            dato_diario = {
                "fila": fila,
                "fecha": fecha_actual.strftime("%Y-%m-%d 00:00:00"),
                "incremento": None,
                "decremento": None,
                "base": None,
                "saldo_diario": None,
                "beneficio_diario": None,
                "beneficio_diario_pct": None,
                "beneficio_acumulado": None,
                "beneficio_acumulado_pct": None,
                "bloqueadas": {
                    "incremento": es_finde,  # Bloqueado en fines de semana
                    "decremento": es_finde,  # Bloqueado en fines de semana
                    "base": True,
                    "saldo_diario": True,
                    "beneficio_diario": True,
                    "beneficio_diario_pct": True,
                    "beneficio_acumulado": True,
                    "beneficio_acumulado_pct": True
                }
            }
            
            cliente["datos_diarios"].append(dato_diario)
            
            fila += 1
            fecha_actual += timedelta(days=1)
        
        data["clientes"].append(cliente)
    
    return data

if __name__ == "__main__":
    print("Creando Diario IBI anual 2026...")
    data = crear_diario_ibi_anual()
    
    # Guardar JSON
    with open("datos_mensuales/Diario_IBI_2026.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    
    print(f"✅ Creado Diario_IBI_2026.json")
    print(f"   - Días: {len(data['datos_diarios_generales'])}")
    print(f"   - Clientes: {len(data['clientes'])}")
    print(f"   - Filas por cliente: {len(data['clientes'][0]['datos_diarios'])}")
