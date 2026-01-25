import json

# Verificar cómo se calculan los totales en la vista general
with open('datos_completos.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=" * 80)
print("VERIFICACION DE TOTALES GENERALES")
print("=" * 80)

vip = data['hojas']['Diario VIP']

print("\nDatos generales (resumen superior):")
if vip.get('datos_generales'):
    for d in vip['datos_generales']:
        print(f"  Fila {d.get('fila')}:")
        print(f"    imp_inicial: {d.get('imp_inicial')}")
        print(f"    imp_final: {d.get('imp_final')}")
        print(f"    benef_euro: {d.get('benef_euro')}")
        print(f"    benef_porcentaje: {d.get('benef_porcentaje')}")
        print(f"    benef_euro_acum: {d.get('benef_euro_acum')}")
        print(f"    benef_porcentaje_acum: {d.get('benef_porcentaje_acum')}")

print("\nDatos diarios generales (primeros 5):")
for d in vip['datos_diarios_generales'][:5]:
    print(f"  Fila {d.get('fila')}, Fecha {d.get('fecha')}:")
    print(f"    imp_inicial: {d.get('imp_inicial')}")
    print(f"    imp_final: {d.get('imp_final')}")
    print(f"    benef_euro: {d.get('benef_euro')}")
    print(f"    benef_porcentaje: {d.get('benef_porcentaje')}")
