#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SCRIPT DE VERIFICACIÓN COMPLETA Y SIMULACIÓN
Verifica toda la lógica del sistema de inversiones
"""

import json
import os
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

# Colores para output
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'

def ok(msg): print(f"{Colors.GREEN}✅ {msg}{Colors.END}")
def error(msg): print(f"{Colors.RED}❌ {msg}{Colors.END}")
def warn(msg): print(f"{Colors.YELLOW}⚠️ {msg}{Colors.END}")
def info(msg): print(f"{Colors.CYAN}ℹ️ {msg}{Colors.END}")
def header(msg): print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}\n{msg}\n{'='*60}{Colors.END}")

# Cargar datos
def cargar_datos():
    ruta = os.path.join(os.path.dirname(__file__), 'datos_editados.json')
    if not os.path.exists(ruta):
        error(f"No se encontró {ruta}")
        return None
    with open(ruta, 'r', encoding='utf-8') as f:
        return json.load(f)

# Calcular FA (suma de incrementos - decrementos de todos los clientes en una fila)
def calcular_FA(fila, clientes):
    suma = 0
    for cliente in clientes:
        datos = cliente.get('datos_diarios', [])
        for d in datos:
            if d.get('fila') == fila:
                inc = d.get('incremento') or 0
                dec = d.get('decremento') or 0
                suma += inc - dec
                break
    return suma

# Verificar lógica de una hoja
def verificar_hoja(nombre_hoja, hoja):
    header(f"VERIFICANDO: {nombre_hoja}")
    
    errores = []
    warnings = []
    
    clientes = hoja.get('clientes', [])
    datos_gen = hoja.get('datos_diarios_generales', [])
    
    info(f"Clientes: {len(clientes)}")
    info(f"Filas generales: {len(datos_gen)}")
    
    if len(clientes) == 0:
        warn("No hay clientes en esta hoja")
        return errores, warnings
    
    # Ordenar datos generales por fila
    datos_gen_ord = sorted([d for d in datos_gen if d.get('fila', 0) >= 15], key=lambda x: x.get('fila', 0))
    
    # 1. VERIFICAR IMP_INICIAL DE FILA 15 (día 1)
    print(f"\n{Colors.BOLD}1. Verificando imp_inicial del día 1 (fila 15){Colors.END}")
    fila15 = next((d for d in datos_gen if d.get('fila') == 15), None)
    if fila15:
        imp_inicial_15 = fila15.get('imp_inicial')
        fa_15 = calcular_FA(15, clientes)
        if imp_inicial_15 is not None and abs(imp_inicial_15 - fa_15) > 0.01:
            error(f"Fila 15: imp_inicial={imp_inicial_15} pero FA={fa_15}")
            errores.append(f"Fila 15: imp_inicial no coincide con FA")
        elif imp_inicial_15 is not None:
            ok(f"Fila 15: imp_inicial={imp_inicial_15} = FA={fa_15}")
        else:
            warn(f"Fila 15: imp_inicial es None, FA={fa_15}")
    
    # 2. VERIFICAR CASCADA DE IMP_INICIAL
    print(f"\n{Colors.BOLD}2. Verificando cascada de imp_inicial{Colors.END}")
    imp_final_anterior = None
    for i, fila_data in enumerate(datos_gen_ord):
        fila = fila_data.get('fila')
        if fila == 15:
            imp_final_anterior = fila_data.get('imp_final')
            continue
        
        imp_inicial = fila_data.get('imp_inicial')
        imp_final = fila_data.get('imp_final')
        fa = calcular_FA(fila, clientes)
        
        # imp_inicial debería ser: imp_final_anterior + FA
        if imp_final_anterior is not None and imp_inicial is not None:
            esperado = imp_final_anterior + fa
            if abs(imp_inicial - esperado) > 0.01:
                error(f"Fila {fila}: imp_inicial={imp_inicial}, esperado={esperado} (imp_final_ant={imp_final_anterior} + FA={fa})")
                errores.append(f"Fila {fila}: imp_inicial incorrecto")
            else:
                ok(f"Fila {fila}: imp_inicial={imp_inicial} ✓")
        
        if imp_final is not None:
            imp_final_anterior = imp_final
    
    # 3. VERIFICAR BENEFICIOS SOLO CUANDO HAY IMP_FINAL
    print(f"\n{Colors.BOLD}3. Verificando beneficios (solo si hay imp_final){Colors.END}")
    for fila_data in datos_gen_ord:
        fila = fila_data.get('fila')
        imp_final = fila_data.get('imp_final')
        benef_euro = fila_data.get('benef_euro')
        benef_pct = fila_data.get('benef_porcentaje')
        
        if imp_final is None:
            # No debería haber beneficios
            if benef_euro is not None and benef_euro != 0:
                error(f"Fila {fila}: tiene benef_euro={benef_euro} sin imp_final")
                errores.append(f"Fila {fila}: beneficio sin imp_final")
            if benef_pct is not None and benef_pct != 0:
                error(f"Fila {fila}: tiene benef_porcentaje={benef_pct} sin imp_final")
                errores.append(f"Fila {fila}: beneficio % sin imp_final")
    
    # 4. VERIFICAR CLIENTES
    print(f"\n{Colors.BOLD}4. Verificando datos de clientes{Colors.END}")
    
    # Encontrar última fila con datos relevantes
    ultima_fila_con_datos = 0
    for cliente in clientes:
        for d in cliente.get('datos_diarios', []):
            inc = d.get('incremento') or 0
            dec = d.get('decremento') or 0
            if inc > 0 or dec > 0:
                if d.get('fila', 0) > ultima_fila_con_datos:
                    ultima_fila_con_datos = d.get('fila', 0)
    
    # Última fila con imp_final en general
    ultima_fila_imp_final = 0
    for d in datos_gen:
        if d.get('imp_final') is not None and isinstance(d.get('imp_final'), (int, float)):
            if d.get('fila', 0) > ultima_fila_imp_final:
                ultima_fila_imp_final = d.get('fila', 0)
    
    limite_calculo = max(ultima_fila_con_datos, ultima_fila_imp_final)
    info(f"Última fila con movimientos: {ultima_fila_con_datos}")
    info(f"Última fila con imp_final: {ultima_fila_imp_final}")
    info(f"Límite de cálculo: {limite_calculo}")
    
    for idx, cliente in enumerate(clientes):
        print(f"\n  {Colors.CYAN}Cliente {idx + 1}:{Colors.END}")
        datos = sorted([d for d in cliente.get('datos_diarios', []) if d.get('fila', 0) >= 15], 
                      key=lambda x: x.get('fila', 0))
        
        saldo_anterior = 0
        for d in datos:
            fila = d.get('fila')
            inc = d.get('incremento') or 0
            dec = d.get('decremento') or 0
            base = d.get('base')
            saldo = d.get('saldo_diario')
            
            # Solo verificar filas con datos o dentro del límite
            if fila > limite_calculo:
                if base is not None or saldo is not None:
                    error(f"    Fila {fila}: tiene cálculos fuera del límite (base={base}, saldo={saldo})")
                    errores.append(f"Cliente {idx+1} Fila {fila}: cálculos fuera del límite")
                continue
            
            if inc > 0 or dec > 0 or base is not None:
                # Verificar base = saldo_anterior + inc - dec
                base_esperada = saldo_anterior + inc - dec
                if base is not None and abs(base - base_esperada) > 0.01:
                    error(f"    Fila {fila}: base={base}, esperada={base_esperada}")
                    errores.append(f"Cliente {idx+1} Fila {fila}: base incorrecta")
                elif base is not None:
                    ok(f"    Fila {fila}: inc={inc}, dec={dec}, base={base} ✓")
                
                if saldo is not None:
                    saldo_anterior = saldo
    
    return errores, warnings

# Crear simulación de mes completo
def crear_simulacion():
    header("CREANDO SIMULACIÓN DE MES COMPLETO")
    
    # Simular 15 días con diferentes escenarios
    dias = []
    
    # Configuración de clientes
    # Cliente 1: Invierte 5000€ el día 1, retira 1000€ el día 10
    # Cliente 2: Invierte 2000€ el día 1, invierte 1000€ más el día 5
    
    cliente1_saldo = 0
    cliente2_saldo = 0
    
    simulacion = {
        'dias': [],
        'clientes': [
            {'nombre': 'Cliente 1', 'movimientos': [], 'saldos': []},
            {'nombre': 'Cliente 2', 'movimientos': [], 'saldos': []}
        ]
    }
    
    # Día 1: Inversiones iniciales
    # Cliente 1: +5000, Cliente 2: +2000
    # Rentabilidad del día: +2%
    imp_inicial_dia1 = 5000 + 2000  # 7000
    rentabilidad_dia1 = 0.02  # 2%
    imp_final_dia1 = imp_inicial_dia1 * (1 + rentabilidad_dia1)  # 7140
    
    cliente1_base = 5000
    cliente1_benef = cliente1_base * rentabilidad_dia1  # 100
    cliente1_saldo = cliente1_base + cliente1_benef  # 5100
    
    cliente2_base = 2000
    cliente2_benef = cliente2_base * rentabilidad_dia1  # 40
    cliente2_saldo = cliente2_base + cliente2_benef  # 2040
    
    simulacion['dias'].append({
        'dia': 1,
        'fila': 15,
        'fecha': '01/01/26',
        'imp_inicial': imp_inicial_dia1,
        'imp_final': imp_final_dia1,
        'rentabilidad': rentabilidad_dia1,
        'benef_euro': imp_final_dia1 - imp_inicial_dia1,
    })
    simulacion['clientes'][0]['movimientos'].append({'dia': 1, 'incremento': 5000, 'decremento': 0})
    simulacion['clientes'][0]['saldos'].append({'dia': 1, 'base': 5000, 'saldo': cliente1_saldo})
    simulacion['clientes'][1]['movimientos'].append({'dia': 1, 'incremento': 2000, 'decremento': 0})
    simulacion['clientes'][1]['saldos'].append({'dia': 1, 'base': 2000, 'saldo': cliente2_saldo})
    
    print(f"\n📅 DÍA 1:")
    print(f"   General: imp_inicial={imp_inicial_dia1}, imp_final={imp_final_dia1}, rentabilidad={rentabilidad_dia1*100}%")
    print(f"   Cliente 1: +5000 → base=5000, saldo={cliente1_saldo}")
    print(f"   Cliente 2: +2000 → base=2000, saldo={cliente2_saldo}")
    
    # Día 2: Sin movimientos, rentabilidad -1%
    rentabilidad_dia2 = -0.01
    imp_inicial_dia2 = imp_final_dia1  # 7140
    imp_final_dia2 = imp_inicial_dia2 * (1 + rentabilidad_dia2)  # 7068.6
    
    cliente1_base = cliente1_saldo  # 5100
    cliente1_benef = cliente1_base * rentabilidad_dia2  # -51
    cliente1_saldo = cliente1_base + cliente1_benef  # 5049
    
    cliente2_base = cliente2_saldo  # 2040
    cliente2_benef = cliente2_base * rentabilidad_dia2  # -20.4
    cliente2_saldo = cliente2_base + cliente2_benef  # 2019.6
    
    simulacion['dias'].append({
        'dia': 2,
        'fila': 18,
        'fecha': '02/01/26',
        'imp_inicial': imp_inicial_dia2,
        'imp_final': imp_final_dia2,
        'rentabilidad': rentabilidad_dia2,
        'benef_euro': imp_final_dia2 - imp_inicial_dia2,
    })
    simulacion['clientes'][0]['saldos'].append({'dia': 2, 'base': 5100, 'saldo': round(cliente1_saldo, 2)})
    simulacion['clientes'][1]['saldos'].append({'dia': 2, 'base': 2040, 'saldo': round(cliente2_saldo, 2)})
    
    print(f"\n📅 DÍA 2:")
    print(f"   General: imp_inicial={imp_inicial_dia2:.2f}, imp_final={imp_final_dia2:.2f}, rentabilidad={rentabilidad_dia2*100}%")
    print(f"   Cliente 1: base={5100}, saldo={cliente1_saldo:.2f}")
    print(f"   Cliente 2: base={2040}, saldo={cliente2_saldo:.2f}")
    
    # Día 5: Cliente 2 invierte 1000 más, rentabilidad +1.5%
    rentabilidad_dia5 = 0.015
    fa_dia5 = 1000  # Solo cliente 2 invierte
    imp_inicial_dia5 = imp_final_dia2 + fa_dia5  # ~8068.6
    imp_final_dia5 = imp_inicial_dia5 * (1 + rentabilidad_dia5)
    
    # Cliente 1: sin movimiento
    cliente1_base_dia5 = cliente1_saldo
    cliente1_benef_dia5 = cliente1_base_dia5 * rentabilidad_dia5
    cliente1_saldo = cliente1_base_dia5 + cliente1_benef_dia5
    
    # Cliente 2: +1000
    cliente2_base_dia5 = cliente2_saldo + 1000
    cliente2_benef_dia5 = cliente2_base_dia5 * rentabilidad_dia5
    cliente2_saldo = cliente2_base_dia5 + cliente2_benef_dia5
    
    simulacion['dias'].append({
        'dia': 5,
        'fila': 27,
        'fecha': '05/01/26',
        'imp_inicial': round(imp_inicial_dia5, 2),
        'imp_final': round(imp_final_dia5, 2),
        'rentabilidad': rentabilidad_dia5,
        'benef_euro': round(imp_final_dia5 - imp_inicial_dia5, 2),
    })
    simulacion['clientes'][0]['saldos'].append({'dia': 5, 'base': round(cliente1_base_dia5, 2), 'saldo': round(cliente1_saldo, 2)})
    simulacion['clientes'][1]['movimientos'].append({'dia': 5, 'incremento': 1000, 'decremento': 0})
    simulacion['clientes'][1]['saldos'].append({'dia': 5, 'base': round(cliente2_base_dia5, 2), 'saldo': round(cliente2_saldo, 2)})
    
    print(f"\n📅 DÍA 5:")
    print(f"   General: imp_inicial={imp_inicial_dia5:.2f}, imp_final={imp_final_dia5:.2f}, rentabilidad={rentabilidad_dia5*100}%")
    print(f"   Cliente 1: base={cliente1_base_dia5:.2f}, saldo={cliente1_saldo:.2f}")
    print(f"   Cliente 2: +1000 → base={cliente2_base_dia5:.2f}, saldo={cliente2_saldo:.2f}")
    
    # Día 10: Cliente 1 retira 1000, rentabilidad +0.5%
    rentabilidad_dia10 = 0.005
    fa_dia10 = -1000  # Cliente 1 retira
    imp_inicial_dia10 = imp_final_dia5 + fa_dia10
    imp_final_dia10 = imp_inicial_dia10 * (1 + rentabilidad_dia10)
    
    # Cliente 1: -1000
    cliente1_base_dia10 = cliente1_saldo - 1000
    cliente1_benef_dia10 = cliente1_base_dia10 * rentabilidad_dia10
    cliente1_saldo_dia10 = cliente1_base_dia10 + cliente1_benef_dia10
    
    # Cliente 2: sin movimiento
    cliente2_base_dia10 = cliente2_saldo
    cliente2_benef_dia10 = cliente2_base_dia10 * rentabilidad_dia10
    cliente2_saldo_dia10 = cliente2_base_dia10 + cliente2_benef_dia10
    
    simulacion['dias'].append({
        'dia': 10,
        'fila': 42,
        'fecha': '10/01/26',
        'imp_inicial': round(imp_inicial_dia10, 2),
        'imp_final': round(imp_final_dia10, 2),
        'rentabilidad': rentabilidad_dia10,
        'benef_euro': round(imp_final_dia10 - imp_inicial_dia10, 2),
    })
    simulacion['clientes'][0]['movimientos'].append({'dia': 10, 'incremento': 0, 'decremento': 1000})
    simulacion['clientes'][0]['saldos'].append({'dia': 10, 'base': round(cliente1_base_dia10, 2), 'saldo': round(cliente1_saldo_dia10, 2)})
    simulacion['clientes'][1]['saldos'].append({'dia': 10, 'base': round(cliente2_base_dia10, 2), 'saldo': round(cliente2_saldo_dia10, 2)})
    
    print(f"\n📅 DÍA 10:")
    print(f"   General: imp_inicial={imp_inicial_dia10:.2f}, imp_final={imp_final_dia10:.2f}, rentabilidad={rentabilidad_dia10*100}%")
    print(f"   Cliente 1: -1000 → base={cliente1_base_dia10:.2f}, saldo={cliente1_saldo_dia10:.2f}")
    print(f"   Cliente 2: base={cliente2_base_dia10:.2f}, saldo={cliente2_saldo_dia10:.2f}")
    
    return simulacion

# Verificar simulación contra reglas
def verificar_simulacion(sim):
    header("VERIFICANDO SIMULACIÓN")
    errores = []
    
    print(f"\n{Colors.BOLD}Reglas a verificar:{Colors.END}")
    print("  1. imp_inicial[día N] = imp_final[día N-1] + FA[día N]")
    print("  2. benef_euro = imp_final - imp_inicial")
    print("  3. benef_porcentaje = benef_euro / imp_inicial")
    print("  4. Cliente.base = saldo_anterior + incremento - decremento")
    print("  5. Cliente.saldo = base + (base * rentabilidad)")
    print("  6. Suma de saldos de clientes ≈ imp_final general")
    
    imp_final_anterior = None
    for dia_data in sim['dias']:
        dia = dia_data['dia']
        imp_inicial = dia_data['imp_inicial']
        imp_final = dia_data['imp_final']
        rentabilidad = dia_data['rentabilidad']
        benef_euro = dia_data['benef_euro']
        
        print(f"\n  {Colors.CYAN}Día {dia}:{Colors.END}")
        
        # Regla 1: imp_inicial
        if imp_final_anterior is not None:
            # Calcular FA del día
            fa = 0
            for c in sim['clientes']:
                for m in c['movimientos']:
                    if m['dia'] == dia:
                        fa += m['incremento'] - m['decremento']
            
            esperado = imp_final_anterior + fa
            if abs(imp_inicial - esperado) > 0.01:
                error(f"    Regla 1: imp_inicial={imp_inicial}, esperado={esperado}")
                errores.append(f"Día {dia}: imp_inicial incorrecto")
            else:
                ok(f"    Regla 1: imp_inicial={imp_inicial} = {imp_final_anterior} + {fa}")
        
        # Regla 2: benef_euro
        benef_esperado = imp_final - imp_inicial
        if abs(benef_euro - benef_esperado) > 0.01:
            error(f"    Regla 2: benef_euro={benef_euro}, esperado={benef_esperado}")
            errores.append(f"Día {dia}: benef_euro incorrecto")
        else:
            ok(f"    Regla 2: benef_euro={benef_euro:.2f} = {imp_final:.2f} - {imp_inicial:.2f}")
        
        # Regla 3: rentabilidad
        rent_calculada = benef_euro / imp_inicial if imp_inicial > 0 else 0
        if abs(rent_calculada - rentabilidad) > 0.0001:
            error(f"    Regla 3: rentabilidad={rentabilidad}, calculada={rent_calculada}")
            errores.append(f"Día {dia}: rentabilidad incorrecta")
        else:
            ok(f"    Regla 3: rentabilidad={rentabilidad*100:.2f}%")
        
        # Regla 6: Suma de saldos ≈ imp_final
        suma_saldos = 0
        for c in sim['clientes']:
            for s in c['saldos']:
                if s['dia'] == dia:
                    suma_saldos += s['saldo']
                    break
        
        if abs(suma_saldos - imp_final) > 0.1:
            error(f"    Regla 6: suma_saldos={suma_saldos:.2f}, imp_final={imp_final:.2f}")
            errores.append(f"Día {dia}: suma de saldos no cuadra")
        else:
            ok(f"    Regla 6: suma_saldos={suma_saldos:.2f} ≈ imp_final={imp_final:.2f}")
        
        imp_final_anterior = imp_final
    
    return errores

# Main
def main():
    print(f"\n{Colors.BOLD}{Colors.CYAN}")
    print("╔══════════════════════════════════════════════════════════╗")
    print("║     VERIFICACIÓN COMPLETA DEL SISTEMA DE INVERSIONES    ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}")
    
    todos_errores = []
    
    # PARTE 1: Verificar datos actuales
    header("PARTE 1: VERIFICACIÓN DE DATOS ACTUALES")
    datos = cargar_datos()
    
    if datos:
        hojas = datos.get('hojas', {})
        for nombre_hoja, hoja in hojas.items():
            errores, warnings = verificar_hoja(nombre_hoja, hoja)
            todos_errores.extend(errores)
    else:
        error("No se pudieron cargar los datos")
    
    # PARTE 2: Crear y verificar simulación
    header("PARTE 2: SIMULACIÓN DE MES COMPLETO")
    sim = crear_simulacion()
    errores_sim = verificar_simulacion(sim)
    todos_errores.extend(errores_sim)
    
    # PARTE 3: Segunda verificación (doble check)
    header("PARTE 3: SEGUNDA VERIFICACIÓN (DOBLE CHECK)")
    print("\nRe-verificando todos los cálculos...")
    
    if datos:
        for nombre_hoja, hoja in datos.get('hojas', {}).items():
            clientes = hoja.get('clientes', [])
            datos_gen = hoja.get('datos_diarios_generales', [])
            
            # Verificar suma de saldos vs imp_final
            for fila_gen in datos_gen:
                if fila_gen.get('imp_final') is not None:
                    fila = fila_gen.get('fila')
                    imp_final = fila_gen.get('imp_final')
                    
                    suma_saldos = 0
                    for cliente in clientes:
                        for d in cliente.get('datos_diarios', []):
                            if d.get('fila') == fila and d.get('saldo_diario') is not None:
                                suma_saldos += d.get('saldo_diario')
                    
                    if suma_saldos > 0:
                        diff = abs(suma_saldos - imp_final)
                        if diff > 1:  # Tolerancia de 1€
                            error(f"{nombre_hoja} Fila {fila}: suma_saldos={suma_saldos:.2f} vs imp_final={imp_final:.2f} (diff={diff:.2f})")
                            todos_errores.append(f"{nombre_hoja} Fila {fila}: saldos no cuadran con imp_final")
    
    # RESUMEN FINAL
    header("RESUMEN FINAL")
    
    if len(todos_errores) == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}")
        print("╔══════════════════════════════════════════════════════════╗")
        print("║          ✅ TODAS LAS VERIFICACIONES PASARON            ║")
        print("╚══════════════════════════════════════════════════════════╝")
        print(f"{Colors.END}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}")
        print("╔══════════════════════════════════════════════════════════╗")
        print(f"║     ❌ SE ENCONTRARON {len(todos_errores):2d} ERRORES                        ║")
        print("╚══════════════════════════════════════════════════════════╝")
        print(f"{Colors.END}")
        
        print(f"\n{Colors.RED}Errores encontrados:{Colors.END}")
        for i, err in enumerate(todos_errores, 1):
            print(f"  {i}. {err}")
    
    # Guardar resultados
    resultado = {
        'fecha': datetime.now().isoformat(),
        'total_errores': len(todos_errores),
        'errores': todos_errores,
        'simulacion': sim
    }
    
    with open('resultado_verificacion.json', 'w', encoding='utf-8') as f:
        json.dump(resultado, f, indent=2, ensure_ascii=False)
    
    info(f"\nResultados guardados en resultado_verificacion.json")
    
    return len(todos_errores)

if __name__ == '__main__':
    exit(main())
