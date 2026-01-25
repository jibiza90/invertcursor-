import json

# Verificar TODAS las celdas que están abiertas cuando deberían estar bloqueadas
with open('datos_completos.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=" * 80)
print("VERIFICACION TODAS LAS CELDAS ABIERTAS QUE DEBERIAN ESTAR BLOQUEADAS")
print("=" * 80)

vip = data['hojas']['Diario VIP']
errores_encontrados = []

print("\n1. Datos generales (filas 3-6):")
for d in vip['datos_generales']:
    fila = d.get('fila')
    bloqueadas = d.get('bloqueadas', {})
    formulas = d.get('formulas', {})
    
    columnas = ['imp_inicial', 'imp_final', 'benef_euro', 'benef_porcentaje', 'benef_euro_acum', 'benef_porcentaje_acum']
    for col in columnas:
        tiene_formula = col in formulas and formulas[col]
        esta_bloqueada = bloqueadas.get(col, False)
        
        if tiene_formula and not esta_bloqueada:
            errores_encontrados.append(f"Fila {fila}, {col}: tiene fórmula pero NO está bloqueada")

print("\n2. Datos diarios generales (primeras 50 filas con errores):")
contador = 0
for d in vip['datos_diarios_generales']:
    fila = d.get('fila')
    bloqueadas = d.get('bloqueadas', {})
    formulas = d.get('formulas', {})
    
    columnas = ['imp_inicial', 'imp_final', 'benef_euro', 'benef_porcentaje', 'benef_euro_acum', 'benef_porcentaje_acum']
    for col in columnas:
        tiene_formula = col in formulas and formulas[col]
        esta_bloqueada = bloqueadas.get(col, False)
        
        if tiene_formula and not esta_bloqueada:
            errores_encontrados.append(f"Fila {fila}, {col}: tiene fórmula pero NO está bloqueada")
            contador += 1
            if contador <= 50:
                print(f"  Fila {fila}, {col}: tiene fórmula '{formulas[col][:50]}...' pero NO está bloqueada")

print(f"\n3. Resumen de errores: {len(errores_encontrados)} celdas con fórmulas que NO están bloqueadas")
if len(errores_encontrados) > 50:
    print(f"  (Mostrando solo las primeras 50, hay {len(errores_encontrados)} en total)")
