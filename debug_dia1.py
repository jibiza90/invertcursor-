import json

# Cargar datos
with open('datos_editados.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

hoja = datos['hojas']['Diario STD']
diarios = hoja.get('datos_diarios_generales', [])

# Buscar fila 15 (día 01/01/2026)
fila15 = None
for d in diarios:
    if d.get('fila') == 15:
        fila15 = d
        break

print("=" * 60)
print("FILA 15 (día 01/01/2026) - DATOS GENERALES:")
print("=" * 60)
if fila15:
    print(f"Fecha: {fila15.get('fecha')}")
    print(f"imp_inicial: {fila15.get('imp_inicial')}")
    print(f"imp_final: {fila15.get('imp_final')}")
    print(f"benef_euro: {fila15.get('benef_euro')}")
    print(f"benef_porcentaje: {fila15.get('benef_porcentaje')}")
    print(f"Fórmulas: {fila15.get('formulas')}")
    print(f"Bloqueadas: {fila15.get('bloqueadas')}")
else:
    print("No se encontró fila 15")

# Buscar clientes y sus datos en fila 15
print("\n" + "=" * 60)
print("CLIENTES - DATOS EN FILA 15:")
print("=" * 60)
clientes = hoja.get('clientes', [])
for i, cliente in enumerate(clientes[:5]):  # Solo primeros 5 clientes
    datos_cliente = cliente.get('datos_diarios', [])
    fila15_cliente = None
    for d in datos_cliente:
        if d.get('fila') == 15:
            fila15_cliente = d
            break
    
    if fila15_cliente:
        print(f"\nCliente {i+1} ({cliente.get('nombre', 'Sin nombre')}):")
        print(f"  incremento: {fila15_cliente.get('incremento')}")
        print(f"  decremento: {fila15_cliente.get('decremento')}")
        print(f"  base: {fila15_cliente.get('base')}")
        print(f"  saldo_diario: {fila15_cliente.get('saldo_diario')}")
        print(f"  Fórmulas: {fila15_cliente.get('formulas')}")

# Verificar qué fórmula tiene imp_inicial
print("\n" + "=" * 60)
print("FÓRMULA DE IMP_INICIAL EN FILA 15:")
print("=" * 60)
if fila15 and fila15.get('formulas'):
    formula_imp_inicial = fila15.get('formulas', {}).get('imp_inicial')
    print(f"Fórmula: {formula_imp_inicial}")
else:
    print("No hay fórmula definida para imp_inicial en fila 15")

# Calcular FA (suma de incrementos de clientes en fila 15)
print("\n" + "=" * 60)
print("CÁLCULO DE FA (suma de incrementos - decrementos en fila 15):")
print("=" * 60)
suma_fa = 0
for i, cliente in enumerate(clientes):
    datos_cliente = cliente.get('datos_diarios', [])
    for d in datos_cliente:
        if d.get('fila') == 15:
            inc = d.get('incremento') or 0
            dec = d.get('decremento') or 0
            if isinstance(inc, (int, float)) and inc > 0:
                print(f"  Cliente {i+1}: incremento={inc}, decremento={dec}")
                suma_fa += inc - dec
            break

print(f"\nSUMA FA (fila 15) = {suma_fa}")
