import json
from datetime import datetime, timedelta

year = 2026
num_clientes = 100
fecha_inicio = datetime(year, 1, 1)
num_dias = 365
fila_inicio = 15

datos = {
    "datos_generales": [],
    "datos_diarios_generales": [],
    "clientes": []
}

# Generar días
for i in range(num_dias):
    fecha = fecha_inicio + timedelta(days=i)
    fila = fila_inicio + i
    es_finde = fecha.weekday() in [5, 6]
    
    datos["datos_diarios_generales"].append({
        "fila": fila,
        "fecha": fecha.strftime("%Y-%m-%d 00:00:00"),
        "imp_inicial": None,
        "imp_final": None,
        "benef_euro": None,
        "benef_porcentaje": None,
        "benef_euro_acum": None,
        "benef_porcentaje_acum": None,
        "bloqueadas": {
            "imp_inicial": True,
            "imp_final": es_finde,
            "benef_euro": True,
            "benef_porcentaje": True,
            "benef_euro_acum": True,
            "benef_porcentaje_acum": True
        },
        "formulas": {
            "imp_inicial": f"=F{fila-1}+SUM(N{fila}:AEL{fila})-SUM(O{fila}:AEM{fila})"
        }
    })

# Generar clientes
for nc in range(1, num_clientes + 1):
    cliente = {
        "numero_cliente": nc,
        "datos": {
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
    
    for i in range(num_dias):
        fecha = fecha_inicio + timedelta(days=i)
        fila = fila_inicio + i
        es_finde = fecha.weekday() in [5, 6]
        
        cliente["datos_diarios"].append({
            "fila": fila,
            "fecha": fecha.strftime("%Y-%m-%d 00:00:00"),
            "incremento": None,
            "decremento": None,
            "base": None,
            "saldo_diario": None,
            "beneficio_diario": None,
            "beneficio_diario_pct": None,
            "beneficio_acumulado": None,
            "beneficio_acumulado_pct": None,
            "bloqueadas": {
                "incremento": es_finde,
                "decremento": es_finde,
                "base": True,
                "saldo_diario": True,
                "beneficio_diario": True,
                "beneficio_diario_pct": True,
                "beneficio_acumulado": True,
                "beneficio_acumulado_pct": True
            },
            "formulas": {}
        })
    
    datos["clientes"].append(cliente)

# Guardar
with open("datos_mensuales/Diario_Xavi_2026.json", "w", encoding="utf-8") as f:
    json.dump(datos, f, ensure_ascii=False, indent=2)

print(f"Generado: {num_dias} dias, {num_clientes} clientes")
