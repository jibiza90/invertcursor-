import json
import os

# Buscar cliente 97 en todos los meses
for filename in os.listdir('datos_mensuales'):
    if not filename.startswith('Diario_STD') or not filename.endswith('.json'):
        continue
    
    filepath = os.path.join('datos_mensuales', filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Buscar cliente 97
    cliente97 = None
    for c in data.get('clientes', []):
        if c.get('numero_cliente') == 97:
            cliente97 = c
            break
    
    if not cliente97:
        continue
    
    print(f"\n{'='*60}")
    print(f"Archivo: {filename}")
    print(f"{'='*60}")
    
    # Buscar fórmulas en incremento/decremento
    formulas_inc = []
    formulas_dec = []
    valores_inc = []
    valores_dec = []
    
    for dd in cliente97.get('datos_diarios', []):
        if dd.get('fila', 0) < 15 or dd.get('fila', 0) > 1120:
            continue
        
        formulas = dd.get('formulas', {})
        if 'incremento' in formulas:
            formulas_inc.append((dd['fila'], formulas['incremento']))
        if 'decremento' in formulas:
            formulas_dec.append((dd['fila'], formulas['decremento']))
        
        if dd.get('incremento') is not None and dd.get('incremento') != 0:
            valores_inc.append((dd['fila'], dd['incremento']))
        if dd.get('decremento') is not None and dd.get('decremento') != 0:
            valores_dec.append((dd['fila'], dd['decremento']))
    
    print(f"\nFÓRMULAS en incremento: {len(formulas_inc)}")
    for fila, formula in formulas_inc[:5]:
        print(f"  Fila {fila}: {formula}")
    
    print(f"\nFÓRMULAS en decremento: {len(formulas_dec)}")
    for fila, formula in formulas_dec[:5]:
        print(f"  Fila {fila}: {formula}")
    
    print(f"\nVALORES en incremento: {len(valores_inc)}")
    for fila, valor in valores_inc[:5]:
        print(f"  Fila {fila}: {valor}")
    
    print(f"\nVALORES en decremento: {len(valores_dec)}")
    for fila, valor in valores_dec[:5]:
        print(f"  Fila {fila}: {valor}")
    
    # Mostrar totales
    print(f"\nTotales del cliente:")
    print(f"  incrementos_total: {cliente97.get('incrementos_total')}")
    print(f"  decrementos_total: {cliente97.get('decrementos_total')}")
