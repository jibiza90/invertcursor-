import json

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

# Cliente 1 de Diario STD
c = d['hojas']['Diario STD']['clientes'][0]
dd = c.get('datos_diarios', [])

# Ordenar por fila
dd_sorted = sorted(dd, key=lambda x: x.get('fila', 0))

lines = ["Primeras 15 filas de datos_diarios del cliente 1 STD:"]
for x in dd_sorted[:15]:
    fila = x.get('fila')
    fecha = x.get('fecha', '')[:10] if x.get('fecha') else 'None'
    bloq_inc = x.get('bloqueadas', {}).get('incremento', 'N/A')
    bloq_dec = x.get('bloqueadas', {}).get('decremento', 'N/A')
    has_formulas = bool(x.get('formulas'))
    inc = x.get('incremento')
    dec = x.get('decremento')
    lines.append(f"Fila {fila}: fecha={fecha}, inc={inc}, dec={dec}, bloq_inc={bloq_inc}, bloq_dec={bloq_dec}, has_formulas={has_formulas}")

with open('bloqueadas_output.txt', 'w', encoding='utf-8') as out:
    out.write('\n'.join(lines))
