import json

# Verificar MARZO
with open('datos_mensuales/Diario_WIND_2026-03.json', 'r', encoding='utf-8') as f:
    marzo = json.load(f)

c1_mar = marzo['clientes'][0]
print("=== MARZO Cliente 1 ===")
print(f"saldo_actual: {c1_mar.get('saldo_actual')}")
print(f"saldo_inicial_mes: {c1_mar.get('saldo_inicial_mes')}")

# Buscar ultimas filas con saldo
dd_mar = sorted([x for x in c1_mar.get('datos_diarios', []) 
                 if x.get('saldo_diario') is not None and x.get('fila', 0) >= 15], 
                key=lambda x: -x.get('fila', 0))
print("Ultimas filas con saldo en Marzo:")
for x in dd_mar[:5]:
    print(f"  fila {x.get('fila')}: saldo={x.get('saldo_diario')}")

# Verificar ABRIL
with open('datos_mensuales/Diario_WIND_2026-04.json', 'r', encoding='utf-8') as f:
    abril = json.load(f)

c1_abr = abril['clientes'][0]
print("\n=== ABRIL Cliente 1 ===")
print(f"saldo_actual: {c1_abr.get('saldo_actual')}")
print(f"saldo_inicial_mes: {c1_abr.get('saldo_inicial_mes')}")

# Buscar primeras filas con saldo
dd_abr = sorted([x for x in c1_abr.get('datos_diarios', []) 
                 if x.get('fila', 0) >= 15 and x.get('fila', 0) <= 50], 
                key=lambda x: x.get('fila', 0))
print("Primeras filas en Abril:")
for x in dd_abr[:10]:
    print(f"  fila {x.get('fila')}: saldo={x.get('saldo_diario')}, base={x.get('base')}, benef={x.get('benef_euro')}")

# Verificar datos generales de Abril (imp_final)
print("\n=== ABRIL Datos Generales ===")
dg_abr = sorted([x for x in abril.get('datos_diarios_generales', []) 
                 if x.get('fila', 0) >= 15 and x.get('fila', 0) <= 50],
                key=lambda x: x.get('fila', 0))
for x in dg_abr[:10]:
    print(f"  fila {x.get('fila')}: imp_final={x.get('imp_final')}")
