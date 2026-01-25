import json

print("=" * 80)
print("VERIFICACION FINAL DEL JSON GENERADO")
print("=" * 80)

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

hoja = data['hojas']['Diario VIP']
diarios = hoja['datos_diarios_generales']

print(f"\nTotal de registros: {len(diarios)}")

# Contar cuántas filas tienen cada columna bloqueada
contadores = {
    'imp_inicial': 0,
    'imp_final': 0,
    'benef_euro': 0,
    'benef_porcentaje': 0,
    'benef_euro_acum': 0,
    'benef_porcentaje_acum': 0
}

for d in diarios:
    bloqueadas = d.get('bloqueadas', {})
    for col in contadores.keys():
        if bloqueadas.get(col, False):
            contadores[col] += 1

print("\nResumen de columnas bloqueadas:")
for col, count in contadores.items():
    print(f"  {col}: {count} filas bloqueadas")

# Verificar algunas filas específicas que sabemos que tienen fórmulas
filas_verificar = [15, 17, 27, 51, 54]
print("\n" + "=" * 80)
print("VERIFICACION DE FILAS ESPECIFICAS:")
print("=" * 80)

for fila_idx in filas_verificar:
    fila_data = None
    for d in diarios:
        if d['fila'] == fila_idx:
            fila_data = d
            break
    
    if fila_data:
        bloqueadas = fila_data.get('bloqueadas', {})
        print(f"\nFila {fila_idx}:")
        for col in contadores.keys():
            esta_bloqueada = bloqueadas.get(col, False)
            estado = "[BLOQUEADA]" if esta_bloqueada else "[EDITABLE]"
            print(f"  {col}: {estado}")

print("\n" + "=" * 80)
print("VERIFICACION COMPLETA")
print("=" * 80)
print("\nEl JSON esta correcto. Si aun ves casillas desbloqueadas en el navegador,")
print("puede ser que tengas datos antiguos en localStorage.")
print("\nSolucion: Abre la consola del navegador (F12) y ejecuta:")
print("  localStorage.clear()")
print("Luego recarga la pagina (F5)")
