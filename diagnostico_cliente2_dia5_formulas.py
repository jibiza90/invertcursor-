import json
from datetime import datetime

ARCHIVO = r"C:\Users\Jordi\Desktop\InvertCursor\datos_mensuales\Diario_STD_2026-01.json"
CLIENTE_IDX = 1  # cliente 2 (0-index)


def parse_fecha(valor):
    if not valor:
        return None
    if isinstance(valor, str):
        try:
            return datetime.fromisoformat(valor.split(' ')[0])
        except Exception:
            return None
    return None


def main():
    with open(ARCHIVO, 'r', encoding='utf-8') as f:
        data = json.load(f)
    clientes = data.get('clientes', [])
    if len(clientes) <= CLIENTE_IDX:
        print('No existe cliente 2 en el archivo')
        return
    cliente = clientes[CLIENTE_IDX]
    filas = [d for d in cliente.get('datos_diarios', []) if d and d.get('fila') and d.get('fecha')]
    filas_dia5 = []
    for d in filas:
        fecha = parse_fecha(d.get('fecha'))
        if fecha and fecha.month == 1 and fecha.day == 5:
            filas_dia5.append(d)
    filas_dia5.sort(key=lambda x: x.get('fila', 0))
    print('Cliente 2 - 5 de enero (valores y formulas):')
    for d in filas_dia5:
        print('---')
        print('fila:', d.get('fila'), 'fecha:', d.get('fecha'))
        print('valores:', {
            'incremento': d.get('incremento'),
            'decremento': d.get('decremento'),
            'base': d.get('base'),
            'saldo_diario': d.get('saldo_diario'),
            'beneficio_diario': d.get('beneficio_diario'),
            'beneficio_diario_pct': d.get('beneficio_diario_pct'),
            'beneficio_acumulado': d.get('beneficio_acumulado'),
            'beneficio_acumulado_pct': d.get('beneficio_acumulado_pct'),
        })
        print('formulas:', d.get('formulas'))

if __name__ == '__main__':
    main()
