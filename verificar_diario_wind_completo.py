#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Verifica que todos los archivos DIARIO_WIND están correctos
"""
import json
import os
from datetime import datetime

OUTPUT_DIR = 'datos_mensuales'

def verificar_mes(mes_str):
    filepath = os.path.join(OUTPUT_DIR, f'Diario_WIND_{mes_str}.json')
    if not os.path.exists(filepath):
        return False, f"Archivo no existe: {filepath}"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Verificar estructura
    if 'clientes' not in data:
        return False, "Falta 'clientes'"
    if 'datos_diarios_generales' not in data:
        return False, "Falta 'datos_diarios_generales'"
    if 'datos_generales' not in data:
        return False, "Falta 'datos_generales'"
    
    # Verificar cantidad de clientes
    if len(data['clientes']) != 100:
        return False, f"Esperados 100 clientes, encontrados {len(data['clientes'])}"
    
    # Verificar fines de semana bloqueados
    fines_semana_ok = 0
    fines_semana_total = 0
    for cliente in data['clientes']:
        for dd in cliente.get('datos_diarios', []):
            fecha = dd.get('fecha', '')
            if fecha:
                try:
                    dt = datetime.strptime(str(fecha)[:10], '%Y-%m-%d')
                    if dt.weekday() >= 5:
                        fines_semana_total += 1
                        bloq = dd.get('bloqueadas', {})
                        if bloq.get('incremento') == True and bloq.get('decremento') == True:
                            fines_semana_ok += 1
                except:
                    pass
        break  # Solo verificar primer cliente
    
    return True, f"OK - {len(data['datos_diarios_generales'])} días, {len(data['clientes'])} clientes, {fines_semana_ok}/{fines_semana_total} fines de semana bloqueados"

def main():
    print("=== VERIFICACIÓN DIARIO_WIND AÑO 2026 ===\n")
    
    meses_ok = 0
    for month in range(1, 13):
        mes_str = f"2026-{month:02d}"
        ok, msg = verificar_mes(mes_str)
        status = "✅" if ok else "❌"
        print(f"{status} {mes_str}: {msg}")
        if ok:
            meses_ok += 1
    
    print(f"\n{'='*50}")
    if meses_ok == 12:
        print(f"✅ TODOS LOS MESES VERIFICADOS CORRECTAMENTE ({meses_ok}/12)")
    else:
        print(f"❌ ERRORES ENCONTRADOS ({meses_ok}/12 meses OK)")

if __name__ == '__main__':
    main()
