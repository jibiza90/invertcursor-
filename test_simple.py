#!/usr/bin/env python3
print("Script simple ejecutándose")
import json
import os

# Crear estructura básica
datos = {
    "datos_generales": [],
    "datos_diarios_generales": [],
    "clientes": [
        {
            "numero_cliente": 1,
            "datos": {
                "nombre": "Xavier Carreras"
            },
            "datos_diarios": []
        }
    ]
}

# Guardar
output_path = "datos_mensuales/Diario_Xavi_2026.json"
os.makedirs("datos_mensuales", exist_ok=True)

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(datos, f, ensure_ascii=False, indent=2)

print(f"✓ Creado: {output_path}")
