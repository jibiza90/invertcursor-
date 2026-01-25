import json
import os
import shutil
from datetime import datetime

# Campos que NO deben tener fórmulas (son editables por el usuario)
CAMPOS_EDITABLES = ['incremento', 'decremento', 'imp_final', 'imp_final_manual']

# Crear backup
backup_dir = f'backup_formulas_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
os.makedirs(backup_dir, exist_ok=True)

archivos_modificados = 0
formulas_eliminadas = 0

for filename in os.listdir('datos_mensuales'):
    if not filename.endswith('.json'):
        continue
    
    filepath = os.path.join('datos_mensuales', filename)
    
    # Backup
    shutil.copy2(filepath, os.path.join(backup_dir, filename))
    
    # Leer archivo
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    modificado = False
    
    # Procesar cada cliente
    for cliente in data.get('clientes', []):
        for dato_diario in cliente.get('datos_diarios', []):
            formulas = dato_diario.get('formulas', {})
            if not formulas:
                continue
            
            # Eliminar fórmulas de campos editables
            for campo in CAMPOS_EDITABLES:
                if campo in formulas:
                    print(f"{filename} - Cliente {cliente.get('numero_cliente')} - Fila {dato_diario.get('fila')}: Eliminando fórmula de '{campo}': {formulas[campo]}")
                    del formulas[campo]
                    formulas_eliminadas += 1
                    modificado = True
            
            # Si no quedan fórmulas, eliminar el objeto formulas
            if not formulas:
                del dato_diario['formulas']
    
    # Guardar si hubo cambios
    if modificado:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        archivos_modificados += 1
        print(f"✓ {filename} guardado")

print(f"\n{'='*60}")
print(f"RESUMEN:")
print(f"  Archivos modificados: {archivos_modificados}")
print(f"  Fórmulas eliminadas: {formulas_eliminadas}")
print(f"  Backup creado en: {backup_dir}")
print(f"{'='*60}")
