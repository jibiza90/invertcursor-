import os
import sys

print("Iniciando script...")
print(f"Directorio actual: {os.getcwd()}")
print(f"Archivo existe: {os.path.exists('JIG 120126 v1 JIG.xlsx')}")

try:
    import pandas as pd
    print("pandas importado correctamente")
    
    excel_file = 'JIG 120126 v1 JIG.xlsx'
    xls = pd.ExcelFile(excel_file)
    print(f"Hojas encontradas: {xls.sheet_names}")
    
    # Buscar Diario_VIP
    for sheet in xls.sheet_names:
        if 'Diario_VIP' in sheet or 'Diario VIP' in sheet or 'diario_vip' in sheet.lower():
            print(f"\nHoja encontrada: {sheet}")
            df = pd.read_excel(excel_file, sheet_name=sheet)
            print(f"Filas: {len(df)}, Columnas: {len(df.columns)}")
            print(f"Columnas: {list(df.columns)}")
            print("\nPrimeras 5 filas:")
            print(df.head().to_string())
            
            # Buscar cliente 1
            print("\nBuscando cliente 1...")
            for col in df.columns:
                try:
                    if df[col].dtype in ['int64', 'float64', 'int32', 'float32']:
                        cliente_1 = df[df[col] == 1]
                        if len(cliente_1) > 0:
                            print(f"\nCliente 1 encontrado en columna '{col}':")
                            print(cliente_1.to_string())
                            break
                except:
                    pass
            
            # Si no encontramos, mostrar primera fila
            if len(df) > 0:
                print("\nPrimera fila completa:")
                for key, value in df.iloc[0].items():
                    print(f"  {key}: {value}")
            break
    else:
        print("No se encontró la hoja Diario_VIP")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
