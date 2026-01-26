import json

with open('datos_mensuales/Diario_WIND_2026-04.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

c1 = d['clientes'][0]
print("=== Cliente 1 Abril ===")
print(f"saldo_actual: {c1.get('saldo_actual')}")
print(f"incrementos_total: {c1.get('incrementos_total')}")
print(f"decrementos_total: {c1.get('decrementos_total')}")

# Verificar datos diarios con valores
dd = [x for x in c1.get('datos_diarios', []) if x.get('fila', 0) >= 15 and x.get('fila', 0) <= 30]
print("\nPrimeras filas con datos:")
for x in dd[:5]:
    print(f"  fila {x.get('fila')}: saldo={x.get('saldo_diario')}, base={x.get('base')}, inc={x.get('incremento')}, dec={x.get('decremento')}")

# Verificar marzo para comparar
with open('datos_mensuales/Diario_WIND_2026-03.json', 'r', encoding='utf-8') as f:
    d3 = json.load(f)

c1_mar = d3['clientes'][0]
print("\n=== Cliente 1 Marzo (ultimo saldo) ===")
print(f"saldo_actual: {c1_mar.get('saldo_actual')}")

# Buscar ultima fila con saldo
dd3 = sorted([x for x in c1_mar.get('datos_diarios', []) if x.get('saldo_diario') is not None], key=lambda x: x.get('fila', 0), reverse=True)
if dd3:
    ult = dd3[0]
    print(f"Ultima fila con saldo: fila {ult.get('fila')}, saldo={ult.get('saldo_diario')}")
