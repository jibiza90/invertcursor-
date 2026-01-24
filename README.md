# 📊 Diario VIP - Aplicación Web de Gestión

Aplicación web para visualizar y editar los datos del Diario VIP desde el archivo Excel.

## 🚀 Características

- ✅ Visualización de todos los clientes en vista general
- ✅ Vista detallada de cada cliente individual
- ✅ Edición de celdas no bloqueadas (solo lectura para campos protegidos)
- ✅ Búsqueda de clientes
- ✅ Guardado automático en el navegador (localStorage)
- ✅ Exportación de datos editados a JSON
- ✅ Interfaz moderna y responsive

## 📋 Requisitos

- Python 3.x
- Navegador web moderno (Chrome, Firefox, Edge, Safari)

## 🔧 Instalación

1. Asegúrate de tener instaladas las dependencias de Python:
```bash
pip install openpyxl
```

2. Extrae los datos del Excel:
```bash
python extraer_todos_datos.py
```

Esto generará el archivo `datos_completos.json` con todos los datos del Excel.

## 🎯 Uso

### Opción 1: Servidor Python (Recomendado)

1. Inicia el servidor:
```bash
python server.py
```

2. Abre tu navegador en: `http://localhost:8000/index.html`

### Opción 2: Servidor Local Alternativo

Si tienes Node.js instalado:
```bash
npx http-server -p 8000
```

O con PHP:
```bash
php -S localhost:8000
```

## 📖 Funcionalidades

### Vista General
- Muestra todos los clientes en una tabla
- Estadísticas generales (total de clientes, inversión total)
- Click en cualquier fila para ver detalles

### Vista Detalle Cliente
- Información completa del cliente seleccionado
- Tabla con todos los campos
- Edición de celdas no bloqueadas:
  - **Bloqueadas**: MES, FECHA, IMP. INICIAL (solo lectura)
  - **Editables**: BENEF. €, BENEF. %, INCREMENTO, DECREMENTO, IMP. FINAL

### Búsqueda
- Busca clientes por número, mes o fecha
- Filtrado en tiempo real

### Guardado
- Los cambios se guardan automáticamente en el navegador (localStorage)
- Botón "Guardar Cambios" para confirmar
- Botón "Exportar JSON" para descargar los datos editados

## 📁 Estructura de Archivos

```
.
├── index.html              # Página principal
├── app.js                  # Lógica de la aplicación
├── server.py               # Servidor HTTP simple
├── extraer_todos_datos.py  # Script para extraer datos del Excel
├── datos_completos.json    # Datos extraídos del Excel (generado)
├── static/
│   ├── styles.css         # Estilos base
│   └── app.css            # Estilos de la aplicación
└── README.md              # Este archivo
```

## 🔒 Celdas Bloqueadas vs Editables

### Celdas Bloqueadas (Solo Lectura)
- MES
- FECHA
- IMP. INICIAL
- Columnas sin nombre identificable

### Celdas Editables
- IMP. FINAL
- BENEF. €
- BENEF. %
- INCREMENTO
- DECREMENTO
- Otros campos numéricos

## 💾 Almacenamiento

Los cambios se guardan en el **localStorage** del navegador. Para limpiar los datos guardados:

1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Application" (Chrome) o "Storage" (Firefox)
3. Local Storage → `http://localhost:8000`
4. Elimina la clave `datosEditados`

## 🛠️ Desarrollo

Para modificar qué celdas están bloqueadas, edita el archivo `extraer_todos_datos.py`:

```python
columnas_bloqueadas = ['MES', 'FECHA', 'IMP. INICIAL']
```

Luego vuelve a ejecutar:
```bash
python extraer_todos_datos.py
```

## 📝 Notas

- La aplicación funciona completamente en el navegador, no requiere servidor backend
- Los datos originales del Excel se mantienen intactos
- Los cambios solo se guardan localmente en el navegador
- Para compartir cambios, usa la función "Exportar JSON"

## 🐛 Solución de Problemas

**Error al cargar datos:**
- Asegúrate de haber ejecutado `python extraer_todos_datos.py`
- Verifica que `datos_completos.json` existe en el directorio

**Los cambios no se guardan:**
- Verifica que el navegador tenga habilitado localStorage
- Revisa la consola del navegador (F12) para errores

**El servidor no inicia:**
- Verifica que el puerto 8000 no esté en uso
- Cambia el puerto en `server.py` si es necesario

## 📄 Licencia

Este proyecto es de uso interno.
