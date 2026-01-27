import json

with open('datos_mensuales/Diario_Xavi_2026.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Clientes: {len(data.get('clientes', []))}")
print(f"Dias generales: {len(data.get('datos_diarios_generales', []))}")

if data.get('clientes'):
    c = data['clientes'][0]
    print(f"\nPrimer cliente:")
    print(f"  Nombre: {c.get('nombre_cliente')}")
    print(f"  Datos diarios: {len(c.get('datos_diarios', []))}")
    
    if c.get('datos_diarios'):
        dd = c['datos_diarios'][0]
        print(f"  Primer dia - incremento: {dd.get('incremento')}")
        print(f"  Primer dia - decremento: {dd.get('decremento')}")
        print(f"  Primer dia - saldo_diario: {dd.get('saldo_diario')}")

# Verificar si hay datos no nulos
clientes_con_datos = 0
for c in data.get('clientes', []):
    for dd in c.get('datos_diarios', []):
        if dd.get('incremento') or dd.get('decremento') or dd.get('saldo_diario'):
            clientes_con_datos += 1
            break

print(f"\nClientes con datos (inc/dec/saldo): {clientes_con_datos}")

# Verificar general
dias_con_imp_final = 0
for d in data.get('datos_diarios_generales', []):
    if d.get('imp_final'):
        dias_con_imp_final += 1

print(f"Dias con imp_final: {dias_con_imp_final}")
