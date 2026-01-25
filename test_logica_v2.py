#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TEST DE LOGICA COMPLETO - Sin colores para Windows
"""

import json
import os
import sys

# Forzar encoding UTF-8
sys.stdout.reconfigure(encoding='utf-8')

def cargar_datos():
    ruta = os.path.join(os.path.dirname(__file__), 'datos_editados.json')
    if not os.path.exists(ruta):
        print(f"ERROR: No se encontro {ruta}")
        return None
    with open(ruta, 'r', encoding='utf-8') as f:
        return json.load(f)

def calcular_FA(fila, clientes):
    """Suma de (incrementos - decrementos) de todos los clientes en una fila"""
    suma = 0
    for cliente in clientes:
        for d in cliente.get('datos_diarios', []):
            if d.get('fila') == fila:
                inc = d.get('incremento') or 0
                dec = d.get('decremento') or 0
                suma += inc - dec
                break
    return suma

def main():
    output = []
    output.append("="*60)
    output.append("VERIFICACION COMPLETA DEL SISTEMA")
    output.append("="*60)
    
    datos = cargar_datos()
    if not datos:
        output.append("ERROR: No se pudieron cargar datos")
        print("\n".join(output))
        return
    
    errores_totales = []
    
    for nombre_hoja, hoja in datos.get('hojas', {}).items():
        output.append(f"\n{'='*60}")
        output.append(f"HOJA: {nombre_hoja}")
        output.append("="*60)
        
        clientes = hoja.get('clientes', [])
        datos_gen = hoja.get('datos_diarios_generales', [])
        
        output.append(f"Clientes: {len(clientes)}")
        output.append(f"Filas generales: {len(datos_gen)}")
        
        if len(clientes) == 0:
            output.append("  (Sin clientes)")
            continue
        
        # Ordenar datos generales
        datos_gen_ord = sorted([d for d in datos_gen if d.get('fila', 0) >= 15], 
                               key=lambda x: x.get('fila', 0))
        
        # 1. VERIFICAR FILA 15 (dia 1)
        output.append("\n--- Verificando fila 15 (dia 1) ---")
        fila15 = next((d for d in datos_gen if d.get('fila') == 15), None)
        if fila15:
            imp_inicial = fila15.get('imp_inicial')
            fa = calcular_FA(15, clientes)
            output.append(f"  imp_inicial: {imp_inicial}")
            output.append(f"  FA (suma incrementos): {fa}")
            if imp_inicial is not None and abs((imp_inicial or 0) - fa) > 0.01:
                output.append(f"  ERROR: imp_inicial != FA")
                errores_totales.append(f"{nombre_hoja} Fila 15: imp_inicial != FA")
            else:
                output.append(f"  OK: imp_inicial = FA")
        
        # 2. VERIFICAR CASCADA
        output.append("\n--- Verificando cascada imp_inicial ---")
        imp_final_anterior = None
        filas_con_imp_final = []
        
        for fila_data in datos_gen_ord[:20]:  # Solo primeras 20 filas
            fila = fila_data.get('fila')
            imp_inicial = fila_data.get('imp_inicial')
            imp_final = fila_data.get('imp_final')
            
            if imp_final is not None:
                filas_con_imp_final.append(fila)
            
            if fila == 15:
                imp_final_anterior = imp_final
                continue
            
            if imp_inicial is not None:
                fa = calcular_FA(fila, clientes)
                
                if imp_final_anterior is not None:
                    esperado = imp_final_anterior + fa
                    diff = abs(imp_inicial - esperado)
                    if diff > 0.01:
                        output.append(f"  Fila {fila}: imp_inicial={imp_inicial:.2f}, esperado={esperado:.2f} (ERROR)")
                        errores_totales.append(f"{nombre_hoja} Fila {fila}: imp_inicial incorrecto")
                    else:
                        output.append(f"  Fila {fila}: imp_inicial={imp_inicial:.2f} OK")
            
            if imp_final is not None:
                imp_final_anterior = imp_final
        
        output.append(f"\n  Filas con imp_final: {filas_con_imp_final}")
        
        # 3. VERIFICAR BENEFICIOS SOLO SI HAY IMP_FINAL
        output.append("\n--- Verificando beneficios ---")
        for fila_data in datos_gen_ord[:20]:
            fila = fila_data.get('fila')
            imp_final = fila_data.get('imp_final')
            benef_euro = fila_data.get('benef_euro')
            benef_pct = fila_data.get('benef_porcentaje')
            
            if imp_final is None:
                # No deberia haber beneficios
                tiene_benef = (benef_euro is not None and benef_euro != 0) or \
                              (benef_pct is not None and benef_pct != 0)
                if tiene_benef:
                    output.append(f"  Fila {fila}: tiene beneficios SIN imp_final (ERROR)")
                    errores_totales.append(f"{nombre_hoja} Fila {fila}: beneficio sin imp_final")
            else:
                output.append(f"  Fila {fila}: imp_final={imp_final:.2f}, benef={benef_euro}")
        
        # 4. VERIFICAR CLIENTES
        output.append("\n--- Verificando clientes ---")
        
        # Encontrar limites
        ultima_fila_mov = 0
        for c in clientes:
            for d in c.get('datos_diarios', []):
                if (d.get('incremento') or 0) > 0 or (d.get('decremento') or 0) > 0:
                    if d.get('fila', 0) > ultima_fila_mov:
                        ultima_fila_mov = d.get('fila', 0)
        
        ultima_fila_imp_final = 0
        for d in datos_gen:
            if d.get('imp_final') is not None:
                if d.get('fila', 0) > ultima_fila_imp_final:
                    ultima_fila_imp_final = d.get('fila', 0)
        
        limite = max(ultima_fila_mov, ultima_fila_imp_final)
        output.append(f"  Ultima fila con movimientos: {ultima_fila_mov}")
        output.append(f"  Ultima fila con imp_final: {ultima_fila_imp_final}")
        output.append(f"  Limite de calculo: {limite}")
        
        for idx, cliente in enumerate(clientes):
            output.append(f"\n  Cliente {idx + 1}:")
            datos_cliente = sorted([d for d in cliente.get('datos_diarios', []) if d.get('fila', 0) >= 15],
                                   key=lambda x: x.get('fila', 0))
            
            saldo_anterior = 0
            filas_con_datos = []
            
            for d in datos_cliente[:30]:
                fila = d.get('fila')
                inc = d.get('incremento') or 0
                dec = d.get('decremento') or 0
                base = d.get('base')
                saldo = d.get('saldo_diario')
                
                # Verificar filas fuera del limite
                if fila > limite:
                    if base is not None or saldo is not None:
                        output.append(f"    Fila {fila}: FUERA DEL LIMITE pero tiene base={base}, saldo={saldo} (ERROR)")
                        errores_totales.append(f"{nombre_hoja} Cliente {idx+1} Fila {fila}: datos fuera del limite")
                    continue
                
                if inc > 0 or dec > 0:
                    filas_con_datos.append(fila)
                    base_esperada = saldo_anterior + inc - dec
                    
                    if base is not None:
                        if abs(base - base_esperada) > 0.01:
                            output.append(f"    Fila {fila}: inc={inc}, dec={dec}, base={base:.2f}, esperada={base_esperada:.2f} (ERROR)")
                            errores_totales.append(f"{nombre_hoja} Cliente {idx+1} Fila {fila}: base incorrecta")
                        else:
                            output.append(f"    Fila {fila}: inc={inc}, dec={dec}, base={base:.2f} OK")
                
                if saldo is not None:
                    saldo_anterior = saldo
            
            output.append(f"    Filas con movimientos: {filas_con_datos}")
    
    # SIMULACION
    output.append("\n" + "="*60)
    output.append("SIMULACION DE MES COMPLETO")
    output.append("="*60)
    
    output.append("\nEscenario:")
    output.append("  Dia 1: Cliente1 +5000, Cliente2 +2000, rentabilidad +2%")
    output.append("  Dia 2: Sin movimientos, rentabilidad -1%")
    output.append("  Dia 5: Cliente2 +1000, rentabilidad +1.5%")
    output.append("  Dia 10: Cliente1 -1000, rentabilidad +0.5%")
    
    # Dia 1
    c1_saldo = 5000 * 1.02  # 5100
    c2_saldo = 2000 * 1.02  # 2040
    imp_final_1 = 7000 * 1.02  # 7140
    output.append(f"\nDia 1:")
    output.append(f"  General: imp_inicial=7000, imp_final={imp_final_1:.2f}")
    output.append(f"  Cliente1: base=5000, saldo={c1_saldo:.2f}")
    output.append(f"  Cliente2: base=2000, saldo={c2_saldo:.2f}")
    output.append(f"  Suma saldos: {c1_saldo + c2_saldo:.2f} vs imp_final={imp_final_1:.2f}")
    
    # Dia 2
    c1_base_2 = c1_saldo
    c1_saldo_2 = c1_base_2 * 0.99  # -1%
    c2_base_2 = c2_saldo
    c2_saldo_2 = c2_base_2 * 0.99
    imp_inicial_2 = imp_final_1
    imp_final_2 = imp_inicial_2 * 0.99
    output.append(f"\nDia 2:")
    output.append(f"  General: imp_inicial={imp_inicial_2:.2f}, imp_final={imp_final_2:.2f}")
    output.append(f"  Cliente1: base={c1_base_2:.2f}, saldo={c1_saldo_2:.2f}")
    output.append(f"  Cliente2: base={c2_base_2:.2f}, saldo={c2_saldo_2:.2f}")
    output.append(f"  Suma saldos: {c1_saldo_2 + c2_saldo_2:.2f} vs imp_final={imp_final_2:.2f}")
    
    # Verificar que suma de saldos = imp_final
    diff = abs((c1_saldo_2 + c2_saldo_2) - imp_final_2)
    if diff > 0.01:
        output.append(f"  ERROR: suma saldos != imp_final")
    else:
        output.append(f"  OK: suma saldos = imp_final")
    
    # RESUMEN FINAL
    output.append("\n" + "="*60)
    output.append("RESUMEN FINAL")
    output.append("="*60)
    
    if len(errores_totales) == 0:
        output.append("\n*** TODAS LAS VERIFICACIONES PASARON ***")
    else:
        output.append(f"\n*** SE ENCONTRARON {len(errores_totales)} ERRORES ***")
        output.append("\nLista de errores:")
        for i, err in enumerate(errores_totales, 1):
            output.append(f"  {i}. {err}")
    
    # Imprimir todo
    resultado = "\n".join(output)
    print(resultado)
    
    # Guardar a archivo
    with open('resultado_test.txt', 'w', encoding='utf-8') as f:
        f.write(resultado)
    
    print(f"\nResultados guardados en resultado_test.txt")
    
    return len(errores_totales)

if __name__ == '__main__':
    exit(main())
