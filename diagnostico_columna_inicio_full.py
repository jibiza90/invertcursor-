import json

ARCHIVO_JSON = r"C:\Users\Jordi\Desktop\InvertCursor\datos_editados.json"
HOJA = "Diario STD"
CLIENTE_IDX = 1  # cliente 2


def main():
    with open(ARCHIVO_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
    hoja = data.get('hojas', {}).get(HOJA)
    if not hoja:
        print('Hoja no encontrada en datos_editados.json')
        return
    clientes = hoja.get('clientes', [])
    if len(clientes) <= CLIENTE_IDX:
        print('No existe cliente en JSON')
        return
    cliente = clientes[CLIENTE_IDX]
    print('cliente keys:', list(cliente.keys()))
    print('columna_inicio:', cliente.get('columna_inicio'))
    print('numero_cliente:', cliente.get('numero_cliente'))
    datos = cliente.get('datos', {})
    print('NOMBRE:', datos.get('NOMBRE', {}).get('valor'))
    print('APELLIDOS:', datos.get('APELLIDOS', {}).get('valor'))

if __name__ == '__main__':
    main()
