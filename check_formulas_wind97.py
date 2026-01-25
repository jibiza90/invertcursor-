import json

cur_path = 'datos_mensuales/Diario_WIND_2026-01.json'
bak_path = 'backup_formulas_20260124_173852/Diario_WIND_2026-01.json'

with open(cur_path, 'r', encoding='utf-8') as f:
    cur = json.load(f)
with open(bak_path, 'r', encoding='utf-8') as f:
    bak = json.load(f)

cur97 = next((c for c in cur.get('clientes', []) if c.get('numero_cliente') == 97), None)
bak97 = next((c for c in bak.get('clientes', []) if c.get('numero_cliente') == 97), None)

print('Cliente97 existe cur:', bool(cur97), 'bak:', bool(bak97))
if not cur97 or not bak97:
    raise SystemExit(1)

# Buscar una fila típica de cálculo (por ejemplo la primera fila >=15 que tenga formulas)
def resumen_formulas(cli, campo):
    filas = []
    for d in cli.get('datos_diarios', []):
        if not (15 <= (d.get('fila') or 0) <= 1120):
            continue
        fm = d.get('formulas') or {}
        if campo in fm:
            filas.append((d.get('fila'), fm[campo]))
    return filas

for campo in ['imp_final', 'beneficio_diario', 'beneficio_acumulado']:
    cur_f = resumen_formulas(cur97, campo)
    bak_f = resumen_formulas(bak97, campo)
    print('\nCampo:', campo)
    print('  cur formulas:', len(cur_f))
    print('  bak formulas:', len(bak_f))
    if bak_f:
        print('  ejemplo bak:', bak_f[0])
    if cur_f:
        print('  ejemplo cur:', cur_f[0])

# Comprobar si en la fila 15 hay formulas de imp_final
def get_row(cli, fila):
    return next((d for d in cli.get('datos_diarios', []) if d.get('fila') == fila), None)

r15c = get_row(cur97, 15)
r15b = get_row(bak97, 15)
print('\nFila 15 cur formulas keys:', sorted(list((r15c.get('formulas') or {}).keys())) if r15c else None)
print('Fila 15 bak formulas keys:', sorted(list((r15b.get('formulas') or {}).keys())) if r15b else None)
