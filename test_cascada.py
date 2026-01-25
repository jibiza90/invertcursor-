#!/usr/bin/env python3
"""
Script para verificar el recálculo en cascada de la aplicación.
Verifica que cuando se modifica una celda, las celdas dependientes se recalculan correctamente.
"""

import json
import os

def cargar_datos():
    """Cargar datos desde el archivo JSON"""
    ruta = os.path.join(os.path.dirname(__file__), 'datos_editados.json')
    if not os.path.exists(ruta):
        print(f"❌ No se encontró el archivo: {ruta}")
        return None
    
    with open(ruta, 'r', encoding='utf-8') as f:
        return json.load(f)

def verificar_cascada_general(hoja_nombre, datos):
    """Verificar que los valores generales se calculan en cascada correctamente"""
    print(f"\n{'='*60}")
    print(f"🔍 VERIFICANDO CASCADA EN VISTA GENERAL - {hoja_nombre}")
    print(f"{'='*60}")
    
    if hoja_nombre not in datos.get('hojas', {}):
        print(f"❌ Hoja '{hoja_nombre}' no encontrada")
        return []
    
    hoja = datos['hojas'][hoja_nombre]
    datos_diarios = hoja.get('datos_diarios_generales', [])
    clientes = hoja.get('clientes', [])
    
    errores = []
    
    # Ordenar por fila
    datos_ordenados = sorted([d for d in datos_diarios if d.get('fila', 0) >= 15], key=lambda x: x.get('fila', 0))
    
    print(f"\n📊 Total filas diarias: {len(datos_ordenados)}")
    
    # Verificar fila 15 (día 1)
    fila15 = next((d for d in datos_ordenados if d.get('fila') == 15), None)
    if fila15:
        # Calcular FA15 (suma de incrementos - decrementos de todos los clientes)
        fa15 = 0
        for cliente in clientes:
            dato_c = next((d for d in cliente.get('datos_diarios', []) if d.get('fila') == 15), None)
            if dato_c:
                inc = dato_c.get('incremento', 0) or 0
                dec = dato_c.get('decremento', 0) or 0
                fa15 += inc - dec
        
        imp_inicial_15 = fila15.get('imp_inicial')
        print(f"\n🔹 Fila 15 (Día 1):")
        print(f"   FA15 calculado: {fa15}")
        print(f"   imp_inicial actual: {imp_inicial_15}")
        
        if fa15 > 0 and imp_inicial_15 != fa15:
            errores.append(f"Fila 15: imp_inicial ({imp_inicial_15}) ≠ FA15 ({fa15})")
            print(f"   ❌ ERROR: No coinciden!")
        elif fa15 > 0:
            print(f"   ✅ Correcto")
        
        # Verificar beneficios si hay imp_final
        imp_final_15 = fila15.get('imp_final')
        if isinstance(imp_final_15, (int, float)) and isinstance(imp_inicial_15, (int, float)) and imp_inicial_15 > 0:
            benef_esperado = imp_final_15 - imp_inicial_15
            benef_actual = fila15.get('benef_euro')
            print(f"\n   imp_final: {imp_final_15}")
            print(f"   benef_euro esperado: {benef_esperado}")
            print(f"   benef_euro actual: {benef_actual}")
            
            if benef_actual is None:
                errores.append(f"Fila 15: benef_euro es None (debería ser {benef_esperado})")
                print(f"   ❌ ERROR: benef_euro no calculado!")
            elif abs(benef_actual - benef_esperado) > 0.01:
                errores.append(f"Fila 15: benef_euro ({benef_actual}) ≠ esperado ({benef_esperado})")
                print(f"   ❌ ERROR: benef_euro incorrecto!")
            else:
                print(f"   ✅ benef_euro correcto")
    
    # Verificar cascada: cada día siguiente debe tener imp_inicial = imp_final anterior + FA
    print(f"\n📊 Verificando cascada de imp_inicial...")
    
    imp_final_anterior = None
    for i, fila in enumerate(datos_ordenados[:10]):  # Solo primeras 10 filas para debug
        fila_num = fila.get('fila')
        fecha = fila.get('fecha', '')
        imp_inicial = fila.get('imp_inicial')
        imp_final = fila.get('imp_final')
        
        if fila_num == 15:
            imp_final_anterior = imp_final
            continue
        
        # Calcular FA para esta fila
        fa = 0
        for cliente in clientes:
            dato_c = next((d for d in cliente.get('datos_diarios', []) if d.get('fila') == fila_num), None)
            if dato_c:
                inc = dato_c.get('incremento', 0) or 0
                dec = dato_c.get('decremento', 0) or 0
                fa += inc - dec
        
        # Solo verificar si es primera fila del día (tiene imp_inicial definido o fórmula)
        formulas = fila.get('formulas', {})
        if 'imp_inicial' in formulas or imp_inicial is not None:
            if imp_final_anterior is not None:
                esperado = imp_final_anterior + fa
                print(f"\n   Fila {fila_num} ({fecha}):")
                print(f"      imp_final_anterior: {imp_final_anterior}, FA: {fa}")
                print(f"      imp_inicial esperado: {esperado}")
                print(f"      imp_inicial actual: {imp_inicial}")
                
                if imp_inicial is None:
                    print(f"      ⚠️ imp_inicial es None")
                elif abs(imp_inicial - esperado) > 0.01:
                    print(f"      ❌ No coincide!")
        
        if imp_final is not None:
            imp_final_anterior = imp_final
    
    return errores

def verificar_cascada_clientes(hoja_nombre, datos):
    """Verificar que los valores de clientes se calculan en cascada correctamente"""
    print(f"\n{'='*60}")
    print(f"🔍 VERIFICANDO CASCADA EN CLIENTES - {hoja_nombre}")
    print(f"{'='*60}")
    
    if hoja_nombre not in datos.get('hojas', {}):
        return []
    
    hoja = datos['hojas'][hoja_nombre]
    clientes = hoja.get('clientes', [])
    datos_diarios_gen = hoja.get('datos_diarios_generales', [])
    
    errores = []
    
    for idx, cliente in enumerate(clientes[:3]):  # Solo primeros 3 clientes
        print(f"\n📊 Cliente {idx + 1}:")
        datos_diarios = cliente.get('datos_diarios', [])
        datos_ordenados = sorted([d for d in datos_diarios if d.get('fila', 0) >= 15], key=lambda x: x.get('fila', 0))
        
        saldo_anterior = 0
        for dato in datos_ordenados[:5]:  # Solo primeras 5 filas
            fila = dato.get('fila')
            inc = dato.get('incremento', 0) or 0
            dec = dato.get('decremento', 0) or 0
            base = dato.get('base')
            saldo = dato.get('saldo_diario')
            benef = dato.get('beneficio_diario')
            
            if inc > 0 or dec > 0 or base is not None:
                print(f"\n   Fila {fila}:")
                print(f"      incremento: {inc}, decremento: {dec}")
                print(f"      base: {base}")
                print(f"      saldo_diario: {saldo}")
                print(f"      beneficio_diario: {benef}")
                
                # Verificar base = saldo_anterior + inc - dec
                base_esperada = saldo_anterior + inc - dec
                print(f"      base esperada: {base_esperada}")
                
                if base is None and (inc > 0 or dec > 0):
                    errores.append(f"Cliente {idx+1} Fila {fila}: base es None (debería ser {base_esperada})")
                    print(f"      ❌ ERROR: base no calculada!")
                
                # Obtener benef_porcentaje general
                dato_gen = next((d for d in datos_diarios_gen if d.get('fila') == fila), None)
                if dato_gen and dato_gen.get('benef_porcentaje') is not None:
                    benef_pct = dato_gen.get('benef_porcentaje')
                    if base is not None:
                        benef_esperado = base * benef_pct
                        saldo_esperado = base + benef_esperado
                        print(f"      benef_porcentaje_gen: {benef_pct}")
                        print(f"      beneficio esperado: {benef_esperado}")
                        print(f"      saldo esperado: {saldo_esperado}")
                
                if saldo is not None:
                    saldo_anterior = saldo
    
    return errores

def main():
    print("="*60)
    print("🔬 TEST DE RECÁLCULO EN CASCADA")
    print("="*60)
    
    datos = cargar_datos()
    if not datos:
        return
    
    hojas = list(datos.get('hojas', {}).keys())
    print(f"\n📋 Hojas disponibles: {hojas}")
    
    todos_errores = []
    
    for hoja in hojas:
        errores_gen = verificar_cascada_general(hoja, datos)
        errores_cli = verificar_cascada_clientes(hoja, datos)
        todos_errores.extend(errores_gen)
        todos_errores.extend(errores_cli)
    
    print(f"\n{'='*60}")
    print("📊 RESUMEN")
    print("="*60)
    
    if todos_errores:
        print(f"\n❌ Se encontraron {len(todos_errores)} errores:")
        for e in todos_errores:
            print(f"   - {e}")
    else:
        print("\n✅ No se encontraron errores de cascada!")

if __name__ == '__main__':
    main()
