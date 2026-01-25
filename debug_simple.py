import json
import sys

try:
    with open('datos_editados.json', 'r', encoding='utf-8') as f:
        datos = json.load(f)
    
    hoja = datos['hojas']['Diario STD']
    diarios = hoja.get('datos_diarios_generales', [])
    
    # Fila 15
    fila15 = next((d for d in diarios if d.get('fila') == 15), None)
    
    with open('debug_result.txt', 'w', encoding='utf-8') as out:
        out.write("FILA 15 (dia 01/01/2026):\n")
        if fila15:
            out.write(f"fecha: {fila15.get('fecha')}\n")
            out.write(f"imp_inicial: {fila15.get('imp_inicial')}\n")
            out.write(f"imp_final: {fila15.get('imp_final')}\n")
            out.write(f"formulas: {fila15.get('formulas')}\n")
            out.write(f"bloqueadas: {fila15.get('bloqueadas')}\n")
        
        # Clientes
        clientes = hoja.get('clientes', [])
        out.write(f"\nTotal clientes: {len(clientes)}\n")
        
        suma_inc = 0
        for i, c in enumerate(clientes[:10]):
            dd = c.get('datos_diarios', [])
            f15 = next((d for d in dd if d.get('fila') == 15), None)
            if f15:
                inc = f15.get('incremento', 0) or 0
                if isinstance(inc, (int, float)) and inc > 0:
                    out.write(f"Cliente {i+1}: inc={inc}\n")
                    suma_inc += inc
        
        out.write(f"\nSuma incrementos fila 15: {suma_inc}\n")
    
    print("OK - ver debug_result.txt")
except Exception as e:
    print(f"Error: {e}")
