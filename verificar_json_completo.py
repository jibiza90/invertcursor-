import json
import sys

# Configurar encoding UTF-8 para stdout
sys.stdout.reconfigure(encoding='utf-8')

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

hoja = data['hojas']['Diario VIP']
diarios = hoja['datos_diarios_generales']

print("=" * 80)
print("VERIFICANDO JSON GENERADO - DETECCION DE FORMULAS")
print("=" * 80)

# Verificar filas específicas que sabemos que tienen fórmulas
filas_verificar = [15, 17, 27, 51, 54, 100, 200]

for fila_idx in filas_verificar:
    fila_data = None
    for d in diarios:
        if d['fila'] == fila_idx:
            fila_data = d
            break
    
    if fila_data:
        print(f"\nFila {fila_idx} (Fecha: {fila_data.get('fecha', 'N/A')}):")
        bloqueadas = fila_data.get('bloqueadas', {})
        
        columnas = [
            ('imp_inicial', 'E - Imp. Inicial'),
            ('imp_final', 'F - Imp. Final'),
            ('benef_euro', 'G - Benef. €'),
            ('benef_porcentaje', 'H - Benef. %'),
            ('benef_euro_acum', 'I - Benef. € Acum'),
            ('benef_porcentaje_acum', 'J - Benef. % Acum')
        ]
        
        for col_key, col_nombre in columnas:
            valor = fila_data.get(col_key)
            esta_bloqueada = bloqueadas.get(col_key, False)
            estado = "[BLOQUEADA]" if esta_bloqueada else "[EDITABLE]"
            print(f"  {col_nombre}: {valor} - {estado}")
    else:
        print(f"\nFila {fila_idx}: NO ENCONTRADA")
