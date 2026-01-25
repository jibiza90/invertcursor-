import json
import os

# Cargar datos
with open('datos_completos.json', 'r', encoding='utf-8') as f:
    datos = json.load(f)

os.makedirs('datos_mensuales', exist_ok=True)

MES = '2026-01'

for nombre_hoja, hoja in datos['hojas'].items():
    datos_mes = {
        'datos_generales': hoja.get('datos_generales', []),
        'datos_diarios_generales': [],
        'clientes': []
    }
    
    # Filtrar datos generales del mes
    for dato in hoja.get('datos_diarios_generales', []):
        if dato.get('fecha', '').startswith(MES):
            datos_mes['datos_diarios_generales'].append(dato)
    
    # Filtrar clientes
    for cliente in hoja.get('clientes', []):
        cliente_mes = {
            'numero_cliente': cliente.get('numero_cliente'),
            'datos': cliente.get('datos', {}),
            'incrementos_total': cliente.get('incrementos_total', 0),
            'decrementos_total': cliente.get('decrementos_total', 0),
            'saldo_actual': cliente.get('saldo_actual'),
            'datos_diarios': []
        }
        for dato in cliente.get('datos_diarios', []):
            if dato.get('fecha', '').startswith(MES):
                cliente_mes['datos_diarios'].append(dato)
        datos_mes['clientes'].append(cliente_mes)
    
    # Guardar
    archivo = f"datos_mensuales/{nombre_hoja.replace(' ', '_')}_{MES}.json"
    with open(archivo, 'w', encoding='utf-8') as f:
        json.dump(datos_mes, f, ensure_ascii=False, separators=(',', ':'))

# Crear indice
indice = {'hojas': list(datos['hojas'].keys()), 'meses': [MES]}
with open('datos_mensuales/indice.json', 'w', encoding='utf-8') as f:
    json.dump(indice, f, ensure_ascii=False, indent=2)

with open('datos_mensuales/OK.txt', 'w') as f:
    f.write('Archivos creados correctamente')
