import pandas as pd
import json

try:
    excel_file = 'JIG 120126 v1 JIG.xlsx'
    
    # Obtener todas las hojas disponibles
    xls = pd.ExcelFile(excel_file)
    sheets_info = {"hojas_disponibles": xls.sheet_names}
    
    # Buscar la hoja Diario_VIP
    sheet_name = None
    for sheet in xls.sheet_names:
        if 'Diario_VIP' in sheet or 'Diario VIP' in sheet or 'diario_vip' in sheet.lower():
            sheet_name = sheet
            break
    
    if sheet_name:
        # Leer la hoja Diario_VIP
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        
        # Convertir a diccionario
        result = {
            "hoja_encontrada": sheet_name,
            "dimensiones": {"filas": int(df.shape[0]), "columnas": int(df.shape[1])},
            "columnas": list(df.columns),
            "datos": df.to_dict('records'),
            "datos_como_string": df.to_string()
        }
        
        # Buscar cliente 1
        client_cols = [col for col in df.columns if any(term in col.lower() for term in ['cliente', 'client', 'id', 'codigo', 'cod'])]
        result["columnas_cliente"] = client_cols
        
        cliente_1_data = None
        for col in client_cols:
            try:
                cliente_1 = df[df[col] == 1]
                if not cliente_1.empty:
                    cliente_1_data = cliente_1.to_dict('records')[0]
                    result["cliente_1"] = cliente_1_data
                    break
            except:
                pass
        
        # Si no encontramos cliente 1, usar la primera fila
        if cliente_1_data is None and len(df) > 0:
            result["cliente_1"] = df.iloc[0].to_dict()
            result["nota"] = "Se muestra la primera fila como cliente 1"
        
    else:
        result = {
            "error": "No se encontró la hoja 'Diario_VIP'",
            "hojas_disponibles": xls.sheet_names
        }
    
    # Guardar en JSON
    with open('excel_data.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2, default=str)
    
    print("Datos guardados en excel_data.json")
    
except Exception as e:
    error_result = {"error": str(e)}
    import traceback
    error_result["traceback"] = traceback.format_exc()
    with open('excel_data.json', 'w', encoding='utf-8') as f:
        json.dump(error_result, f, ensure_ascii=False, indent=2)
    print(f"Error: {e}")
