#!/usr/bin/env python3
import json
import sys

# Forzar encoding UTF-8
sys.stdout.reconfigure(encoding='utf-8')

def main():
    resultado = []
    resultado.append("="*60)
    resultado.append("VERIFICACION DE CASCADA Y LOGICA")
    resultado.append("="*60)
    
    try:
        with open('datos_editados.json', 'r', encoding='utf-8') as f:
            datos = json.load(f)
    except Exception as e:
        resultado.append(f"Error cargando datos: {e}")
        with open('resultado_verificacion.txt', 'w', encoding='utf-8') as f:
            f.write('\n'.join(resultado))
        return
    
    hojas = list(datos.get('hojas', {}).keys())
    resultado.append(f"\nHojas: {hojas}")
    
    errores = []
    
    for hoja_nombre in hojas:
        hoja = datos['hojas'][hoja_nombre]
        resultado.append(f"\n{'='*40}")
        resultado.append(f"HOJA: {hoja_nombre}")
        resultado.append("="*40)
        
        datos_diarios = hoja.get('datos_diarios_generales', [])
        clientes = hoja.get('clientes', [])
        
        resultado.append(f"Filas diarias: {len(datos_diarios)}")
        resultado.append(f"Clientes: {len(clientes)}")
        
        # Verificar fila 15
        fila15 = next((d for d in datos_diarios if d.get('fila') == 15), None)
        if fila15:
            resultado.append(f"\nFila 15 (Dia 1):")
            resultado.append(f"  fecha: {fila15.get('fecha')}")
            resultado.append(f"  imp_inicial: {fila15.get('imp_inicial')}")
            resultado.append(f"  imp_final: {fila15.get('imp_final')}")
            resultado.append(f"  benef_euro: {fila15.get('benef_euro')}")
            resultado.append(f"  benef_porcentaje: {fila15.get('benef_porcentaje')}")
            
            # Calcular FA15
            fa15 = 0
            for idx, cliente in enumerate(clientes):
                dato_c = next((d for d in cliente.get('datos_diarios', []) if d.get('fila') == 15), None)
                if dato_c:
                    inc = dato_c.get('incremento') or 0
                    dec = dato_c.get('decremento') or 0
                    if inc > 0 or dec > 0:
                        resultado.append(f"  Cliente {idx+1}: inc={inc}, dec={dec}")
                    fa15 += (inc if isinstance(inc, (int, float)) else 0) - (dec if isinstance(dec, (int, float)) else 0)
            
            resultado.append(f"  FA15 calculado: {fa15}")
            
            imp_inicial = fila15.get('imp_inicial')
            if fa15 > 0:
                if imp_inicial is None or imp_inicial == 0:
                    errores.append(f"{hoja_nombre}: Fila 15 imp_inicial es {imp_inicial}, deberia ser {fa15}")
                    resultado.append(f"  ERROR: imp_inicial deberia ser {fa15}")
                elif abs(imp_inicial - fa15) > 0.01:
                    errores.append(f"{hoja_nombre}: Fila 15 imp_inicial={imp_inicial} != FA15={fa15}")
                    resultado.append(f"  ERROR: imp_inicial no coincide con FA15")
                else:
                    resultado.append(f"  OK: imp_inicial = FA15")
            
            # Verificar beneficios
            imp_final = fila15.get('imp_final')
            if isinstance(imp_final, (int, float)) and isinstance(imp_inicial, (int, float)) and imp_inicial > 0:
                benef_esperado = imp_final - imp_inicial
                benef_actual = fila15.get('benef_euro')
                resultado.append(f"\n  Verificando beneficios:")
                resultado.append(f"  benef_euro esperado: {benef_esperado}")
                resultado.append(f"  benef_euro actual: {benef_actual}")
                
                if benef_actual is None:
                    errores.append(f"{hoja_nombre}: Fila 15 benef_euro es None")
                    resultado.append(f"  ERROR: benef_euro no calculado")
                elif abs(benef_actual - benef_esperado) > 0.01:
                    errores.append(f"{hoja_nombre}: Fila 15 benef_euro={benef_actual} != esperado={benef_esperado}")
                    resultado.append(f"  ERROR: benef_euro incorrecto")
                else:
                    resultado.append(f"  OK: benef_euro correcto")
        
        # Verificar clientes fila 15
        resultado.append(f"\nClientes en fila 15:")
        for idx, cliente in enumerate(clientes[:5]):
            dato_c = next((d for d in cliente.get('datos_diarios', []) if d.get('fila') == 15), None)
            if dato_c:
                inc = dato_c.get('incremento') or 0
                dec = dato_c.get('decremento') or 0
                if inc > 0 or dec > 0:
                    base = dato_c.get('base')
                    saldo = dato_c.get('saldo_diario')
                    benef = dato_c.get('beneficio_diario')
                    resultado.append(f"  Cliente {idx+1}: inc={inc}, dec={dec}, base={base}, saldo={saldo}, benef={benef}")
                    
                    # Verificar base
                    base_esperada = inc - dec
                    if base is None:
                        errores.append(f"{hoja_nombre}: Cliente {idx+1} fila 15 base es None (deberia ser {base_esperada})")
                        resultado.append(f"    ERROR: base deberia ser {base_esperada}")
                    elif abs(base - base_esperada) > 0.01:
                        errores.append(f"{hoja_nombre}: Cliente {idx+1} fila 15 base={base} != esperada={base_esperada}")
                        resultado.append(f"    ERROR: base incorrecta")
    
    resultado.append(f"\n{'='*60}")
    resultado.append("RESUMEN")
    resultado.append("="*60)
    
    if errores:
        resultado.append(f"\nERRORES ENCONTRADOS: {len(errores)}")
        for e in errores:
            resultado.append(f"  - {e}")
    else:
        resultado.append("\nNo se encontraron errores!")
    
    # Escribir resultado
    with open('resultado_verificacion.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(resultado))
    
    print("Verificacion completada. Ver resultado_verificacion.txt")

if __name__ == '__main__':
    main()
