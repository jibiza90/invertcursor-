import json

with open('datos_completos.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

with open('verificar_resultado.txt', 'w', encoding='utf-8') as out:
    vip = d['hojas']['Diario VIP']
    gen = vip['datos_diarios_generales']
    
    out.write("=== Filas 15-25 para entender el patron ===\n\n")
    for g in gen:
        if g.get('fila') in range(15, 26):
            bloq = g.get('bloqueadas', {})
            form = g.get('formulas', {})
            out.write(f"Fila {g['fila']}:\n")
            out.write(f"  fecha: {g.get('fecha')}\n")
            out.write(f"  imp_inicial: {g.get('imp_inicial')} | bloq: {bloq.get('imp_inicial')} | formula: {form.get('imp_inicial', '-')}\n")
            out.write(f"  imp_final: {g.get('imp_final')} | bloq: {bloq.get('imp_final')} | formula: {form.get('imp_final', '-')}\n")
            out.write(f"  benef_euro: {g.get('benef_euro')} | bloq: {bloq.get('benef_euro')} | formula: {form.get('benef_euro', '-')}\n")
            out.write(f"\n")
    
    out.write("\n=== Filas 51-53 (13 enero) ===\n\n")
    for g in gen:
        if g.get('fila') in [51, 52, 53]:
            bloq = g.get('bloqueadas', {})
            form = g.get('formulas', {})
            out.write(f"Fila {g['fila']}:\n")
            out.write(f"  fecha: {g.get('fecha')}\n")
            out.write(f"  imp_inicial: {g.get('imp_inicial')} | bloq: {bloq.get('imp_inicial')} | formula: {form.get('imp_inicial', '-')}\n")
            out.write(f"  imp_final: {g.get('imp_final')} | bloq: {bloq.get('imp_final')} | formula: {form.get('imp_final', '-')}\n")
            out.write(f"  benef_euro: {g.get('benef_euro')} | bloq: {bloq.get('benef_euro')} | formula: {form.get('benef_euro', '-')}\n")
            out.write(f"\n")
