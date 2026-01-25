import pandas as pd
import json

try:
    excel_file = 'JIG 120126 v1 JIG.xlsx'
    
    # Obtener todas las hojas disponibles
    xls = pd.ExcelFile(excel_file)
    print("Hojas disponibles:")
    for sheet in xls.sheet_names:
        print(f"  - {sheet}")
    print()
    
    # Buscar la hoja Diario_VIP
    sheet_name = None
    for sheet in xls.sheet_names:
        if 'Diario_VIP' in sheet or 'Diario VIP' in sheet or 'diario_vip' in sheet.lower():
            sheet_name = sheet
            break
    
    if sheet_name is None:
        print("ERROR: No se encontró la hoja 'Diario_VIP'")
        print("Hojas disponibles:")
        for sheet in xls.sheet_names:
            print(f"  - {sheet}")
    else:
        print(f"Leyendo la hoja: {sheet_name}")
        print()
        
        # Leer la hoja Diario_VIP
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        
        print(f"Dimensiones: {df.shape[0]} filas x {df.shape[1]} columnas")
        print()
        print("Columnas:")
        for col in df.columns:
            print(f"  - {col}")
        print()
        
        print("=" * 80)
        print("TODOS LOS DATOS DE LA HOJA Diario_VIP:")
        print("=" * 80)
        print()
        
        # Mostrar todas las filas
        pd.set_option('display.max_columns', None)
        pd.set_option('display.max_rows', None)
        pd.set_option('display.width', None)
        pd.set_option('display.max_colwidth', None)
        
        print(df.to_string())
        print()
        
        # Intentar encontrar cliente 1
        print("=" * 80)
        print("BÚSQUEDA DEL CLIENTE 1:")
        print("=" * 80)
        print()
        
        # Buscar columnas relacionadas con cliente
        client_cols = [col for col in df.columns if any(term in col.lower() for term in ['cliente', 'client', 'id', 'codigo', 'cod'])]
        
        if client_cols:
            print(f"Columnas relacionadas con cliente: {client_cols}")
            for col in client_cols:
                try:
                    cliente_1 = df[df[col] == 1]
                    if not cliente_1.empty:
                        print(f"\nCliente 1 encontrado (columna '{col}'):")
                        print(cliente_1.to_string())
                except:
                    pass
        
        # Mostrar primera fila completa
        if len(df) > 0:
            print("\nPrimera fila completa:")
            print(df.iloc[0].to_dict())
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
