import json

ARCHIVO_JSON = r"C:\Users\Jordi\Desktop\InvertCursor\datos_mensuales\Diario_STD_2026-01.json"
CLIENTE_IDX = 1  # Cliente 2 (0-index)


def main():
    with open(ARCHIVO_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
    clientes = data.get('clientes', [])
    if len(clientes) <= CLIENTE_IDX:
        print('No existe cliente en JSON')
        return
    cliente = clientes[CLIENTE_IDX]
    print('cliente keys:', list(cliente.keys()))
    print('columna_inicio:', cliente.get('columna_inicio'))
    datos = cliente.get('datos', {})
    print('NOMBRE:', datos.get('NOMBRE', {}).get('valor'))
    print('APELLIDOS:', datos.get('APELLIDOS', {}).get('valor'))

if __name__ == '__main__':
    main()
