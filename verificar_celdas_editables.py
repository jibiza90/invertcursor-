import json

# Verificar qué celdas están marcadas como editables en el JSON
with open('datos_completos.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=" * 80)
print("VERIFICACION CELDAS EDITABLES EN VISTA GENERAL")
print("=" * 80)

vip = data['hojas']['Diario VIP']

print("\nDatos generales (filas 3-6) - BLOQUEADAS:")
for d in vip['datos_generales']:
    print(f"\nFila {d.get('fila')}:")
    bloqueadas = d.get('bloqueadas', {})
    formulas = d.get('formulas', {})
    print(f"  bloqueadas: {bloqueadas}")
    print(f"  formulas: {formulas}")
    
    # Verificar si todas las columnas con fórmulas están bloqueadas
    for col, tiene_formula in formulas.items():
        if tiene_formula:
            esta_bloqueada = bloqueadas.get(col, False)
            if not esta_bloqueada:
                print(f"  ⚠️ ERROR: Columna {col} tiene fórmula pero NO está bloqueada!")

print("\n\nDatos diarios generales (primeras 10 filas) - BLOQUEADAS:")
for d in vip['datos_diarios_generales'][:10]:
    fila = d.get('fila')
    bloqueadas = d.get('bloqueadas', {})
    formulas = d.get('formulas', {})
    
    if formulas:
        print(f"\nFila {fila}:")
        print(f"  bloqueadas: {bloqueadas}")
        print(f"  formulas: {formulas}")
        
        # Verificar si todas las columnas con fórmulas están bloqueadas
        for col, tiene_formula in formulas.items():
            if tiene_formula:
                esta_bloqueada = bloqueadas.get(col, False)
                if not esta_bloqueada:
                    print(f"  ⚠️ ERROR: Columna {col} tiene fórmula pero NO está bloqueada!")
