import json

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

diarios = data['hojas']['Diario VIP']['datos_diarios_generales']

print("=" * 80)
print("VERIFICACION JSON - COLUMNAS DE BENEFICIOS")
print("=" * 80)

print("\nFilas que DEBERIAN tener beneficios bloqueados (con formulas):")
filas_con_formulas = [17, 20, 23, 26, 29, 32, 35, 38, 41, 44]

for fila_idx in filas_con_formulas:
    fila = [d for d in diarios if d['fila'] == fila_idx]
    if fila:
        bloqueadas = fila[0]['bloqueadas']
        benef_euro_bloqueada = bloqueadas.get('benef_euro', False)
        benef_porcentaje_bloqueada = bloqueadas.get('benef_porcentaje', False)
        benef_euro_acum_bloqueada = bloqueadas.get('benef_euro_acum', False)
        benef_porcentaje_acum_bloqueada = bloqueadas.get('benef_porcentaje_acum', False)
        
        todas_bloqueadas = benef_euro_bloqueada and benef_porcentaje_bloqueada and benef_euro_acum_bloqueada and benef_porcentaje_acum_bloqueada
        
        estado = "OK" if todas_bloqueadas else "ERROR"
        print(f"Fila {fila_idx}: {estado}")
        if not todas_bloqueadas:
            print(f"  benef_euro: {benef_euro_bloqueada}")
            print(f"  benef_porcentaje: {benef_porcentaje_bloqueada}")
            print(f"  benef_euro_acum: {benef_euro_acum_bloqueada}")
            print(f"  benef_porcentaje_acum: {benef_porcentaje_acum_bloqueada}")

print("\n" + "=" * 80)
print("RESUMEN")
print("=" * 80)
print("Si todas las filas muestran 'OK', el JSON esta correcto.")
print("Si ves 'ERROR', hay un problema en la extraccion.")
