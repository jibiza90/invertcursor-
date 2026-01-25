import json
import sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

with open('datos_mensuales/Diario_STD_2026-01.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Check datos_diarios_generales for fila 15
diarios = data.get('datos_diarios_generales', [])
print(f"Total filas en datos_diarios_generales: {len(diarios)}")

found = False
for d in diarios:
    if d.get('fila') == 15:
        print("\nFILA 15 encontrada:")
        print(f"  fecha: {d.get('fecha')}")
        print(f"  imp_inicial: {d.get('imp_inicial')}")
        print(f"  imp_final: {d.get('imp_final')}")
        print(f"  formulas: {d.get('formulas')}")
        print(f"  bloqueadas: {d.get('bloqueadas')}")
        found = True
        break

if not found:
    print("Fila 15 NO encontrada en datos_diarios_generales")
    print(f"Primeras 5 filas: {[d.get('fila') for d in diarios[:5]]}")
