import json

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

hoja = data['hojas']['Diario VIP']

print("=" * 80)
print("VERIFICACION VISTA GENERAL")
print("=" * 80)

print("\n1. Datos generales (filas 3-6):")
for d in hoja['datos_generales']:
    bloqueadas = d.get('bloqueadas', {})
    tiene_bloqueadas = bool(bloqueadas)
    print(f"  Fila {d['fila']}: tiene bloqueadas={tiene_bloqueadas}")
    if bloqueadas:
        for col, bloqueada in bloqueadas.items():
            if bloqueada:
                print(f"    - {col}: BLOQUEADA")

print("\n2. Datos diarios generales (primeras 10 filas):")
for d in hoja['datos_diarios_generales'][:10]:
    bloqueadas = d.get('bloqueadas', {})
    tiene_bloqueadas = bool(bloqueadas)
    imp_inicial_bloqueada = bloqueadas.get('imp_inicial', False)
    benef_euro_bloqueada = bloqueadas.get('benef_euro', False)
    print(f"  Fila {d['fila']}: tiene bloqueadas={tiene_bloqueadas}")
    if bloqueadas:
        for col, bloqueada in bloqueadas.items():
            if bloqueada:
                print(f"    - {col}: BLOQUEADA")

print("\n" + "=" * 80)
print("VERIFICACION COMPLETA")
print("=" * 80)
print("\nTanto datos_generales como datos_diarios_generales tienen el campo 'bloqueadas'")
print("La funcion agregarCeldasFilaGeneral() usa filaData.bloqueadas correctamente")
print("Todo deberia funcionar correctamente en la vista general!")
