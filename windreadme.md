# WINDREADME — Especificación completa de **Diario WIND** (Portfolio Manager)

Este documento describe **al máximo detalle** el funcionamiento de **Diario WIND** tal y como está implementado en este repositorio (frontend `app.js` + `index.html` + backend `server.py` + JSONs `datos_mensuales/Diario_WIND_YYYY-MM.json`).

El objetivo es que un programador pueda reconstruir Diario WIND (UI, lógica y persistencia) **sin tener que interpretar el Excel**.

---

## 1) Visión general (qué es Diario WIND)

**Diario WIND** es una hoja (sheet) mensual que mantiene:

- **Vista General (portfolio)** con:
  - `imp_inicial`
  - `imp_final` (**editable por el usuario**)
  - beneficios diarios y acumulados (calculados)
  - y una lógica clave: al escribir `imp_final` del general, el sistema **redistribuye** los saldos de todos los clientes para que la suma de saldos del día coincida con ese `imp_final`.

- **Vista Cliente (detalle)** donde cada cliente tiene:
  - `incremento` (editable)
  - `decremento` (editable)
  - campos calculados: `base`, `saldo_diario`, `beneficio_diario`, etc.

- Pestañas auxiliares:
  - **Clientes** (listado con KPIs)
  - **Info Clientes** (edición de datos: nombre/apellidos/garantía…)
  - **Comisión** (cálculo y desglose de comisiones)
  - **Estadísticas** (Chart.js + tabla)

**Regla central de negocio**:
- El **General manda**: `imp_final` (general) es el “cierre/valor total del portfolio” para un día.
- Los **clientes** se recalculan y, en WIND, se **redistribuye** el beneficio total del día proporcionalmente a la base de cada cliente para que:
  - `SUM(saldo_diario_clientes) == imp_final_general` (cuando hay `imp_final` válido)

---

## 2) Arquitectura de persistencia (JSON por mes)

### 2.1 Archivo
Formato: `datos_mensuales/Diario_WIND_YYYY-MM.json`

Ejemplo: `datos_mensuales/Diario_WIND_2026-01.json`

El frontend carga/guarda **un JSON por hoja y mes**.

---

## 3) Estructura de datos: esquema del JSON de Diario WIND

En `Diario_WIND_2026-01.json` se observan estas claves principales:

- `datos_generales: Array<RowGeneralResumen>`
- `datos_diarios_generales: Array<RowGeneralDiaria>`
- `clientes: Array<Cliente>`

> Nota: en estos JSONs no aparece un campo explícito `hoja`/`mes` dentro del JSON (al menos en el ejemplo inspeccionado). La identidad hoja/mes va en el nombre de archivo.

### 3.1 Tipo `RowGeneralResumen` (`datos_generales`)
Corresponde a las filas resumen 3–6 del Excel.

Campos por fila:
- `fila: number` (3,4,5,6)
- `fecha: string | null` (en el ejemplo, fila 3 y 4 llevan fecha; 5 y 6 null)
- `imp_inicial: number | null`
- `imp_final: number | null`
- `benef_euro: number | null`
- `benef_porcentaje: number | null`
- `benef_euro_acum: number | null`
- `benef_porcentaje_acum: number | null`
- `bloqueadas: { [campo: string]: boolean }`
- `formulas: { [campo: string]: string }`

Bloqueos típicos (observado):
- `imp_inicial: true`
- `imp_final: true`
- Beneficios resumen (en el ejemplo): `benef_euro`, `benef_porcentaje`, `benef_euro_acum`, `benef_porcentaje_acum` aparecen como `false` (editables) en el JSON, pero en la UI se tratan como bloqueadas si hay fórmula.

Fórmulas observadas (enero 2026):
- Fila 3:
  - `imp_inicial = "=AEO11"`
  - `imp_final = "=AEO1124"`
- Fila 4:
  - `imp_inicial = "=AEO8"`
  - `imp_final = "=SUM(AEM15:AEM1120)-SUM(AEN15:AEN1120)+AEO1128"`
- Fila 5:
  - `imp_inicial = "=SUBTOTAL(9,G17:G1120)"`
  - `imp_final = "=AEO1128"`
- Fila 6:
  - `imp_inicial = "=IF(E3<>0,E5/E3,0)"`
  - `imp_final = "=IF(F3<>0,F5/F3,0)"`

> Importante: aunque el JSON tenga `formulas`, la app también recalcula algunos campos de forma programática.

### 3.2 Tipo `RowGeneralDiaria` (`datos_diarios_generales`)
Filas 15..1120 en la app (aunque mensualmente son menos días, el JSON mantiene rango Excel amplio).

Campos por fila:
- `fila: number` (ej: 15 = 2026-01-01)
- `fecha: string` (`"YYYY-MM-DD 00:00:00"`) o `'FECHA'` en cabeceras si existieran
- `imp_inicial: number | null` (normalmente calculado)
- `imp_final: number | null` (**editable por el usuario en WIND**)
- `benef_euro: number | null` (calculado cuando hay `imp_final`)
- `benef_porcentaje: number | null` (calculado cuando hay `imp_final`)
- `benef_euro_acum: number | null` (calculado)
- `benef_porcentaje_acum: number | null` (calculado)
- `bloqueadas: { imp_inicial:boolean, imp_final:boolean, benef_euro:boolean, ... }`
- `formulas: { imp_inicial?: string, ... }`

Bloqueos típicos observados:
- `imp_inicial: true`
- `imp_final: false` (editable)
- Beneficios: `true` (calculados)

Fórmula de `imp_inicial` observada:
- Fila 15 (día 1 del mes):
  - `imp_inicial = "=SUM(N15:AEL15)-SUM(O15:AEM15)"`
- Fila 16:
  - `imp_inicial = "=F15+SUM(N16:AEL16)-SUM(O16:AEM16)"`
- Fila 17:
  - `imp_inicial = "=F16+SUM(N17:AEL17)-SUM(O17:AEM17)"`

Patrón:
- `imp_inicial(fila_dia) = imp_final(fila_anterior) + SUM(incrementos_clientes_en_fila) - SUM(decrementos_clientes_en_fila)`

Donde:
- SUM(incrementos) es un rango horizontal tipo `SUM(Nxx:AELxx)`
- SUM(decrementos) es un rango horizontal tipo `SUM(Oxx:AEMxx)`

### 3.3 Tipo `Cliente` (`clientes[]`)
Campos:
- `numero_cliente: number`
- `datos: object` con campos de info:
  - `nombre: string` (ej. "CLIENTE 1")
  - `NOMBRE: { valor: string }`
  - `APELLIDOS: { valor: string }`
  - `TELEFONO: { valor: string }`
  - `GARANTIA_INICIAL: { valor: string }`
  - `GARANTIA: { valor: string }` (se mantiene por compatibilidad)
- `incrementos_total: number`
- `decrementos_total: number`
- `saldo_actual: number`
- `saldo_inicial_mes: number` (aparece al final de cada cliente en el JSON; el backend lo usa para arrastre)
- `datos_diarios: Array<RowClienteDiario>`

### 3.4 Tipo `RowClienteDiario` (`clientes[i].datos_diarios[]`)
Campos:
- `fila: number`
- `fecha: string` (`"YYYY-MM-DD 00:00:00"`)
- `incremento: number | null` (**editable**)
- `decremento: number | null` (**editable**, con validación de no exceder saldo)
- `base: number | null` (calculado)
- `saldo_diario: number | null` (calculado)
- `beneficio_diario: number | null` (calculado)
- `beneficio_diario_pct: number | null` (calculado)
- `beneficio_acumulado: number | null` (calculado)
- `beneficio_acumulado_pct: number | null` (calculado)
- `bloqueadas: { incremento:boolean, decremento:boolean, base:boolean, ... }`
- `formulas: object` (en WIND en el JSON aparece `{}` en las filas inspeccionadas; el cálculo real se hace programáticamente)

Bloqueos típicos observados:
- `incremento: false`
- `decremento: false`
- resto `true`

---

## 4) Reglas de cálculo (lógica de negocio)

### 4.1 Regla de “celda manual” en general
En `app.js`:
- `esCeldaManualGeneral(filaData, columna)` define si un campo general es manual:
  - manual si **no** tiene fórmula y **no** está marcado bloqueado.

Esto es crítico en WIND:
- `imp_final` de `datos_diarios_generales` suele ser manual.

### 4.2 Cálculo de `imp_inicial` general (diario)
Hay 2 fuentes:
- Fórmulas Excel en JSON (`formulas.imp_inicial`).
- Recalculo programático:
  - `recalcularImpInicialSync(hoja)` recorre filas y calcula `imp_inicial` hasta un límite (`ultimaFilaImpFinalManual`).

Criterio de límite:
- Para WIND se calcula hasta la última fila donde hay `imp_final` manual.

Base del día 1:
- Usa `hoja._impFinalMesAnterior` como “imp_final del mes anterior” (arrastre).

### 4.3 FA (columna “FA/AEO”): suma de movimientos del día
En `app.js`:
- `calcularFA(filaNum, hoja)` calcula para un día:
  - para cada cliente, encuentra todas las filas del mismo día (por fecha) y toma el **máximo incremento** y **máximo decremento** del día.
  - contribución del cliente = `incCliente - decCliente`
  - FA = suma de contribuciones

Se usa en evaluación de fórmulas:
- `obtenerValorCelda` reconoce referencias `FAxx` y `AEOxx` y devuelve `calcularFA(filaContexto, ...)`.

### 4.4 Beneficios generales (diarios)
En `app.js`:
- `recalcularBeneficiosGeneralesDesdeFila(filaInicio, hoja)`:
  - solo calcula si hay `imp_final` manual numérico.
  - `benef_euro = imp_final - imp_inicial`
  - `benef_porcentaje = benef_euro / imp_inicial` (si `imp_inicial != 0`)
  - `benef_euro_acum` acumulado aditivo
  - `benef_porcentaje_acum` acumulado TWR:
    - `calcularPctAcumuladoTWR(prev, diario) = (1+prev)*(1+diario) - 1`

Si NO hay `imp_final`:
- limpia `benef_*` a null.

### 4.5 Cálculo de clientes (WIND) y redistribución
**WIND tiene una lógica especial**: el general fija `imp_final` y el beneficio total del día se reparte.

Función principal:
- `redistribuirSaldosClientesWIND(hoja)`

Esquema conceptual:
1) Identifica filas generales con `imp_final` numérico (>0).
2) Para cada fila con `imp_final`:
   - Para cada cliente, calcula la **base** del día:
     - `base = lastSaldo + incremento - decremento`
   - Suma bases positivas: `sumaBase`.
   - Beneficio total a repartir:
     - `beneficioTotal = imp_final_general - sumaBase`
   - Para cada cliente con base>0:
     - `beneficioCliente = beneficioTotal * (base / sumaBase)`
     - `beneficio_pct = beneficioCliente / base`
     - `saldo_diario = base + beneficioCliente`
     - acumula `beneficio_acumulado` y calcula `%` acumulado.

Notas:
- Arrastre por mes anterior se lee “directo del JSON anterior” (cache), vía:
  - `obtenerSaldoClienteMesAnteriorDirecto(numeroCliente)`
  - `obtenerAcumIncClienteMesAnteriorDirecto(numeroCliente)`
  - `obtenerAcumDecClienteMesAnteriorDirecto(numeroCliente)`

### 4.6 Incrementos/Decrementos del cliente: reglas de edición
- Campos editables: `incremento`, `decremento`.
- Validación decremento:
  - `decremento` no puede exceder el saldo disponible calculado (`calcularSaldoActualCliente`).
  - si excede, se muestra un modal/alerta (`mostrarAlertaSaldoExcedido`).

Propagación intra-día:
- Al editar incremento/decremento, el sistema propaga a la “2ª fila del día” si existe (para compatibilidad con fórmulas que referencian la segunda fila). Ver `actualizarDatoDiario`.

### 4.7 Comisión (5%)
Regla:
- Comisión del 5% solo sobre la parte de decrementos que exceda los incrementos acumulados.

Funciones:
- `calcularComisionDeDecrementoEnFila(cliente, filaObjetivo, overrideDecremento, clienteIdx)`
- `calcularDetalleComisionesCobradas(cliente, clienteIdx)`

### 4.8 Fin de semana (arrastre)
Existe lógica que copia valores del viernes a sábado y domingo (general):
- Busca viernes, halla sábado y domingo por fecha.
- Copia `imp_inicial` y `imp_final` como el `imp_final` del viernes.
- Beneficios del finde se ponen 0 y acumulados se mantienen.

El lunes se calculará como:
- `imp_inicial_lunes = imp_final_domingo + FA_lunes`.

---

## 5) Evaluación de fórmulas tipo Excel

La app soporta un subconjunto de Excel:

### 5.1 Fórmulas generales
- `evaluarFormula(formula, filaIdx, hoja)`
  - Sustituye referencias `A1` por valores con `obtenerValorCelda`.
  - Convierte operadores: `<>` → `!=`, `=` → `==` (en comparaciones).
  - Implementa `IF(...)` (a JS ternario) y funciones `SUM(...)`, `SUBTOTAL(9,...)`.
  - Para celdas vacías usa 0.

Rangos:
- `evaluarRango(rango, hoja)`
  - Soporta rangos verticales tipo `G17:G1120`.
  - Soporta rangos horizontales tipo `N15:AEL15` sumando incrementos de todos los clientes en esa fila.
  - `O15:AEM15` suma decrementos.

### 5.2 Fórmulas de cliente
- `evaluarFormulaCliente(formula, filaIdx, clienteIdx, hoja)`
  - Resuelve `SUM(colXrowStart:colXrowEnd)` para rangos verticales de cliente.
  - Para referencias de columnas generales (E..J) usa `obtenerValorCelda`.
  - Para columnas de cliente (K en adelante) usa `obtenerValorCeldaCliente`.

Mapeo clave cliente (columna → campo) por bloques de 8:
- offset 0: `incremento`
- offset 1: `decremento`
- offset 2: `base`
- offset 3: `saldo_diario`
- offset 4: `beneficio_diario`
- offset 5: `beneficio_diario_pct`
- offset 6: `beneficio_acumulado`
- offset 7: `beneficio_acumulado_pct`

---

## 6) UI — pantallas, botones, IDs y comportamiento

### 6.1 Layout principal (`index.html`)
Elementos clave:
- Selector de hoja: `#selectorHoja`
- Selector mes: `#selectorMes`
- Navegación mes:
  - `#btnMesAnterior`
  - `#btnMesSiguiente`
- Selector cliente: `#selectorCliente`
- Acciones:
  - `#btnUndo`, `#btnRedo`
  - `#btnActualizarTodo` (recalcular)
  - `#btnGuardar`
  - `#btnExportar`

Vistas (contenedores):
- `#vistaGeneral`
- `#vistaClientes`
- `#vistaDetalle`
- `#vistaInfoClientes`
- `#vistaComision`
- `#vistaEstadisticas`

Navegación lateral:
- `#btnVistaGeneral`
- `#btnVistaClientes`
- `#btnVistaInfoClientes`
- `#btnVistaComision`
- `#btnVistaEstadisticas`

### 6.2 Vista General
Controles:
- filtros fechas: `#fechaDesde`, `#fechaHasta`, `#btnAplicarFiltro`, `#btnLimpiarFiltroFechas`
- limpiar datos: `#btnLimpiarFiltro`
- toggle resumen/completo: `#btnToggleVista`

Tabla:
- `#tablaGeneral` con `#theadGeneral` y `#tbodyGeneral`

Reglas UI:
- fines de semana se marcan con `.row-weekend`.
- columnas:
  - Fecha
  - Importe Inicial
  - Importe Final (input editable)
  - Beneficios (bloqueados si fórmula/bloqueada)

### 6.3 Vista Detalle Cliente
Botones:
- `#btnVolver`
- `#btnVolverGeneral`
- `#btnEliminarCliente`
- `#btnEstadisticasCliente`

Tabla detalle:
- `#tablaDetalle` con `#theadDetalle` y `#tbodyDetalle`

Entradas:
- `incremento`, `decremento` como inputs tipo texto numérico formateado.

Validaciones:
- decremento no puede exceder saldo.

### 6.4 Vista Info Clientes
- Buscador: `#buscarInfoCliente`
- Tabs:
  - `#tabSTD`, `#tabVIP`, `#tabWIND`, `#tabXavi` (en este repo ya aparece Xavi)

Permite editar:
- NOMBRE, APELLIDOS, TELEFONO, GARANTIA_INICIAL (y mantiene GARANTIA).

### 6.5 Vista Comisión
- Buscador: `#buscarComision`
- Tabs:
  - `#tabSTDComision`, `#tabVIPComision`, `#tabWINDComision`, `#tabXaviComision`

### 6.6 Vista Estadísticas
- Tabs:
  - `#tabSTDStats`, `#tabVIPStats`, `#tabWINDStats`, `#tabXaviStats`
- Chart.js:
  - `#chartRentabilidad`
  - `#chartComparativa`

---

## 7) Backend — endpoints y comportamiento (`server.py`)

Puerto por defecto: `8000`.

Endpoints principales:

### 7.1 `GET /api/meses`
Devuelve un JSON:
- `{ "Diario WIND": ["2026-01", "2026-02", ...], "Diario VIP": [...], ... }`

El backend lista los archivos `*.json` del directorio `datos_mensuales/` y extrae `hoja` y `mes` del nombre.

### 7.2 `GET /api/datos/<HOJA>/<YYYY-MM>`
Ejemplo:
- `/api/datos/Diario_WIND/2026-01`

Devuelve el JSON mensual correspondiente.

### 7.3 `POST /api/guardar/<HOJA>/<YYYY-MM>`
Guarda el JSON recibido como:
- `datos_mensuales/<HOJA>_<YYYY-MM>.json`

Además:
- sincroniza `clientes[].datos` en todos los meses de la misma hoja
- actualiza `saldo_inicial_mes` del mes siguiente a partir del saldo final del mes actual

### 7.4 Otros endpoints (diagnóstico)
- `/api/diagnostico_arrastre`
- `/api/diagnostico_enero`
- `/api/diagnostico_enero_general`
- `/api/diagnostico_mes/<hoja>/<YYYY-MM>`
- `/api/clientes_anuales`

---

## 8) Guardado (frontend)

Función:
- `guardarDatosAutomatico(numFormulasGenerales = 0, numFormulasClientes = 0)`

Comportamiento importante en WIND:
- Antes de guardar, recalcula:
  - `recalcularTotalesGenerales(hoja)`
  - `recalcularImpInicialSync(hoja)`
  - `recalcularBeneficiosGeneralesDesdeFila(15, hoja)`
- Para cada cliente recalcula totales y persiste:
  - `incrementos_total`, `decrementos_total`
  - `saldo_actual` (saldo final del mes)
  - y copia valores calculados a campos `_saldo_diario_guardado`, `_beneficio_acum_guardado`, `_beneficio_diario_guardado` (para estadísticas históricas)

Endpoint usado:
- `POST /api/guardar/${hojaActual.replace(/\s/g,'_')}/${mesActual}`

---

## 9) Reglas de mapeo Excel ↔ modelo

### 9.1 General (columnas)
- Col E (5): `imp_inicial`
- Col F (6): `imp_final`
- Col G (7): `benef_euro`
- Col H (8): `benef_porcentaje`
- Col I (9): `benef_euro_acum`
- Col J (10): `benef_porcentaje_acum`

### 9.2 Cliente (bloques de 8 columnas desde K)
- K: incremento
- L: decremento
- M: base
- N: saldo_diario
- O: beneficio_diario
- P: beneficio_diario_pct
- Q: beneficio_acumulado
- R: beneficio_acumulado_pct

Cada cliente ocupa 8 columnas y el índice se calcula:
- `clienteIdx = floor((colNum - 11) / 8)`

### 9.3 SUM horizontales en General
- `SUM(Nfila:AELfila)` suma incrementos de todos los clientes.
- `SUM(Ofila:AEMfila)` suma decrementos de todos los clientes.

---

## 10) Puntos críticos / edge-cases

- **Mes anterior**: el arrastre de saldos e incrementos/decrementos acumulados debe leer del JSON anterior.
- **0 vs null**: la UI trata muchos ceros como “vacío” para no mostrar datos falsos.
- **Duplicados por día**: hay días con varias filas; se normaliza usando “max por día” para inc/dec en `FA`.
- **Validación de decremento**: no permitir retirar más del saldo.
- **Redistribución**: solo redistribuye cuando hay `imp_final` numérico > 0.

---

## 11) Checklist para implementar Diario WIND desde cero

1) Backend:
   - listar meses por hoja
   - servir JSON por hoja/mes
   - guardar JSON y sincronizar datos cliente + saldo_inicial_mes siguiente

2) Frontend:
   - Vistas + navegación
   - Tabla general (imp_final editable)
   - Tabla cliente (inc/dec editables)
   - Cálculos:
     - imp_inicial general
     - beneficios general
     - cálculo cliente
     - redistribución WIND
   - Guardado automático

---

Fin del documento.
