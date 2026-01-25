import json

with open('datos_mensuales/Diario_STD_2026-01.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

cliente97 = None
for idx, c in enumerate(data['clientes']):
    if c['numero_cliente'] == 97:
        cliente97 = c
        print(f"Cliente 97 encontrado en indice {idx}")
        break

if not cliente97:
    print("Cliente 97 NO encontrado")
    exit()

print(f"\nTotales:")
print(f"  incrementos_total: {cliente97.get('incrementos_total')}")
print(f"  decrementos_total: {cliente97.get('decrementos_total')}")

# Buscar formulas en incremento/decremento
print("\nBuscando formulas en incremento/decremento...")
count_formula_inc = 0
count_formula_dec = 0

for dd in cliente97['datos_diarios']:
    if dd.get('fila', 0) < 15:
        continue
    formulas = dd.get('formulas', {})
    if 'incremento' in formulas:
        count_formula_inc += 1
        if count_formula_inc <= 3:
            print(f"  FORMULA incremento en fila {dd['fila']}: {formulas['incremento']}")
    if 'decremento' in formulas:
        count_formula_dec += 1
        if count_formula_dec <= 3:
            print(f"  FORMULA decremento en fila {dd['fila']}: {formulas['decremento']}")

print(f"\nTotal formulas incremento: {count_formula_inc}")
print(f"Total formulas decremento: {count_formula_dec}")

# Buscar valores no nulos
print("\nValores actuales (no nulos):")
for dd in cliente97['datos_diarios'][:10]:
    if dd.get('fila', 0) < 15:
        continue
    inc = dd.get('incremento')
    dec = dd.get('decremento')
    if inc is not None or dec is not None:
        print(f"  Fila {dd['fila']}: inc={inc}, dec={dec}")
