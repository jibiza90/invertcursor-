import json
from datetime import datetime

ARCHIVO = r"C:\Users\Jordi\Desktop\InvertCursor\datos_mensuales\Diario_STD_2026-01.json"


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
    if not clientes:
        print('No hay clientes en Diario_STD_2026-01.json')
        return

    print('== Diagnóstico Diario STD (enero 2026) ==')
    inconsistencias = 0

    for idx, cliente in enumerate(clientes, start=1):
        datos = [d for d in (cliente.get('datos_diarios') or []) if d and d.get('fila') and d.get('fecha')]
        if not datos:
            continue
        datos.sort(key=lambda x: x.get('fila', 0))
        base_anterior = None
        for d in datos:
            fila = d.get('fila')
            if fila is None or fila < 15 or fila > 1120:
                continue
            fecha = parse_fecha(d.get('fecha'))
            if not fecha:
                continue
            inc = d.get('incremento') if isinstance(d.get('incremento'), (int, float)) else 0
            dec = d.get('decremento') if isinstance(d.get('decremento'), (int, float)) else 0
            base = d.get('base') if isinstance(d.get('base'), (int, float)) else None
            saldo = d.get('saldo_diario') if isinstance(d.get('saldo_diario'), (int, float)) else None

            # Reglas básicas de consistencia:
            # 1) Si no hay inc/dec y base/saldo son 0, marcar
            if inc == 0 and dec == 0 and base == 0 and saldo == 0:
                inconsistencias += 1
                print(f'[Cliente {idx}] {fecha.date()} fila {fila}: base/saldo en 0 sin movimientos')
                continue

            # 2) Si hay base previa y hay inc/dec, base debería cambiar
            if base_anterior is not None and (inc != 0 or dec != 0) and base is not None:
                esperado = base_anterior + inc - dec
                if abs(base - esperado) > 0.01:
                    inconsistencias += 1
                    print(f'[Cliente {idx}] {fecha.date()} fila {fila}: base {base} != esperado {esperado} (prev {base_anterior}, inc {inc}, dec {dec})')

            if base is not None:
                base_anterior = base

    print('Inconsistencias encontradas:', inconsistencias)

if __name__ == '__main__':
    main()
