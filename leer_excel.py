#!/usr/bin/env python
# -*- coding: utf-8 -*-
import pandas as pd
import sys

excel_file = 'JIG 120126 v1 JIG.xlsx'

try:
    # Leer Excel
    xls = pd.ExcelFile(excel_file)
    
    # Buscar hoja Diario_VIP
    sheet_name = None
    for sheet in xls.sheet_names:
        if 'Diario_VIP' in sheet or 'Diario VIP' in sheet or 'diario_vip' in sheet.lower():
            sheet_name = sheet
            break
    
    if not sheet_name:
        with open('resultado.txt', 'w', encoding='utf-8') as f:
            f.write("ERROR: No se encontró la hoja 'Diario_VIP'\n")
            f.write("Hojas disponibles:\n")
            for sheet in xls.sheet_names:
                f.write(f"  - {sheet}\n")
        sys.exit(1)
    
    # Leer la hoja
    df = pd.read_excel(excel_file, sheet_name=sheet_name)
    
    # Escribir resultados
    with open('resultado.txt', 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("INFORMACIÓN DEL CLIENTE 1 - HOJA: " + sheet_name + "\n")
        f.write("=" * 80 + "\n\n")
        
        f.write(f"Dimensiones: {df.shape[0]} filas x {df.shape[1]} columnas\n\n")
        
        f.write("Columnas disponibles:\n")
        for i, col in enumerate(df.columns, 1):
            f.write(f"  {i}. {col}\n")
        f.write("\n")
        
        f.write("=" * 80 + "\n")
        f.write("TODOS LOS DATOS:\n")
        f.write("=" * 80 + "\n\n")
        
        # Configurar pandas para mostrar todo
        pd.set_option('display.max_columns', None)
        pd.set_option('display.max_rows', None)
        pd.set_option('display.width', None)
        pd.set_option('display.max_colwidth', None)
        
        f.write(df.to_string())
        f.write("\n\n")
        
        # Buscar cliente 1
        f.write("=" * 80 + "\n")
        f.write("BÚSQUEDA DEL CLIENTE 1:\n")
        f.write("=" * 80 + "\n\n")
        
        client_cols = [col for col in df.columns if any(term in col.lower() for term in ['cliente', 'client', 'id', 'codigo', 'cod', 'numero', 'num'])]
        
        if client_cols:
            f.write(f"Columnas relacionadas con cliente: {client_cols}\n\n")
            encontrado = False
            for col in client_cols:
                try:
                    cliente_1 = df[df[col] == 1]
                    if not cliente_1.empty:
                        f.write(f"CLIENTE 1 ENCONTRADO (columna '{col}'):\n")
                        f.write("-" * 80 + "\n")
                        f.write(cliente_1.to_string())
                        f.write("\n\n")
                        f.write("Datos del Cliente 1 en formato diccionario:\n")
                        for key, value in cliente_1.iloc[0].items():
                            f.write(f"  {key}: {value}\n")
                        encontrado = True
                        break
                except Exception as e:
                    pass
            
            if not encontrado and len(df) > 0:
                f.write("No se encontró cliente con ID=1. Mostrando primera fila:\n")
                f.write("-" * 80 + "\n")
                f.write(df.iloc[0].to_string())
                f.write("\n\n")
                f.write("Datos de la primera fila:\n")
                for key, value in df.iloc[0].items():
                    f.write(f"  {key}: {value}\n")
        else:
            f.write("No se encontraron columnas relacionadas con cliente.\n")
            f.write("Mostrando primera fila completa:\n")
            f.write("-" * 80 + "\n")
            if len(df) > 0:
                f.write(df.iloc[0].to_string())
                f.write("\n\n")
                f.write("Datos de la primera fila:\n")
                for key, value in df.iloc[0].items():
                    f.write(f"  {key}: {value}\n")
    
    print("Archivo resultado.txt creado exitosamente")
    
except Exception as e:
    with open('resultado.txt', 'w', encoding='utf-8') as f:
        f.write(f"ERROR: {str(e)}\n")
        import traceback
        f.write(traceback.format_exc())
    print(f"Error: {e}")
