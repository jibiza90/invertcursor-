#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '.')
from crear_diario_xavi import generar_diario_xavi_2026

print("Iniciando regeneración de Diario Xavi...")
try:
    generar_diario_xavi_2026()
    print("Regeneración completada exitosamente")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
