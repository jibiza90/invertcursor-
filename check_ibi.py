import json

with open('datos_mensuales/Diario_IBI_2026.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

dias = d.get('datos_diarios_generales', [])
filas = [x['fila'] for x in dias]
print(f"Total dias generales: {len(dias)}")
print(f"Filas: {min(filas)} - {max(filas)}")
print(f"Clientes: {len(d.get('clientes', []))}")
if d.get('clientes'):
    c0 = d['clientes'][0]
    dias_c0 = c0.get('datos_diarios', [])
    print(f"Cliente 1 dias: {len(dias_c0)}")
