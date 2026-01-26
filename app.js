// ============================================================================
// CONSTANTES DE LA APLICACIÓN
// ============================================================================
const CONFIG = {
    // Límites de filas de datos diarios (excluyendo cabeceras y resúmenes)
    FILA_DATOS_INICIO: 15,
    FILA_DATOS_FIN: 1120,
    
    // Tolerancias numéricas para comparaciones
    TOLERANCIA_DECIMAL: 0.0001,
    TOLERANCIA_VALIDACION: 0.01,
    
    // Intervalos de tiempo (ms)
    AUTO_UPDATE_INTERVAL: 8000,
    DEBOUNCE_DELAY: 350,
    
    // Versión de la aplicación
    VERSION: 'V2.9.18'
};

// Helper: Filtrar datos diarios válidos (filas entre INICIO y FIN, con fecha válida)
function filtrarDatosValidos(datosDiarios, requiereFecha = true) {
    return (datosDiarios || []).filter(d => {
        if (!d || typeof d.fila !== 'number') return false;
        if (d.fila < CONFIG.FILA_DATOS_INICIO || d.fila > CONFIG.FILA_DATOS_FIN) return false;
        if (requiereFecha) {
            if (!d.fecha) return false;
            if (typeof d.fecha === 'string' && d.fecha.toUpperCase() === 'FECHA') return false;
        }
        return true;
    });
}

// Helper: Verificar si una fila está en rango válido
function esFilaValida(fila) {
    return typeof fila === 'number' && fila >= CONFIG.FILA_DATOS_INICIO && fila <= CONFIG.FILA_DATOS_FIN;
}

// ============================================================================
// ESTADO DE LA APLICACIÓN
// ============================================================================

// Datos de la aplicación
let datosCompletos = null;
let datosEditados = null;
let clientesAnuales = null; // Lista de clientes del año (independiente del mes)
let hojaActual = 'Diario WIND';
let mesActual = null;
let mesesDisponibles = {};
let clienteActual = null;
let hojaInfoClientes = 'Diario STD'; // Hoja seleccionada en Info Clientes
let vistaActual = 'general';
let requiereRecalculoImpInicial = false;

let __actualizarTodoPromise = null;

let __lastAutoUpdateTs = 0;
let __autoUpdateScheduled = false;

let __dirtyRecalculoMasivo = true;
let __recalculoVersion = 0;

let __navDetalleSeq = 0;

let __loadingOverlayCount = 0;

let historialCambios = [];
let indiceHistorial = -1;
let __isUndoRedo = false;
let __infoClienteExpandido = null;

function actualizarBotonesUndoRedo() {
    const btnUndo = document.getElementById('btnUndo');
    const btnRedo = document.getElementById('btnRedo');
    if (btnUndo) btnUndo.disabled = indiceHistorial < 0;
    if (btnRedo) btnRedo.disabled = indiceHistorial >= historialCambios.length - 1;
}

function debounce(fn, waitMs, stateKey) {
    if (!window.__debounceTimers) window.__debounceTimers = {};
    const timers = window.__debounceTimers;
    if (timers[stateKey]) clearTimeout(timers[stateKey]);
    timers[stateKey] = setTimeout(fn, waitMs);
}

function marcarDirtyRecalculoMasivo() {
    __dirtyRecalculoMasivo = true;
    __recalculoVersion++;
    __cacheSaldosWindKey = null;
}

function yieldToBrowser() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

function nextFrame() {
    return new Promise(resolve => {
        requestAnimationFrame(() => resolve());
    });
}

function programarAutoActualizarVistaActual() {
    const ahora = Date.now();
    const minIntervalMs = 8000;
    if (ahora - __lastAutoUpdateTs < minIntervalMs) return;
    if (__autoUpdateScheduled) return;

    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

    __autoUpdateScheduled = true;
    debounce(async () => {
        __autoUpdateScheduled = false;
        const ahora2 = Date.now();
        if (ahora2 - __lastAutoUpdateTs < minIntervalMs) return;
        if (__actualizarTodoPromise) return;
        const el2 = document.activeElement;
        if (el2 && (el2.tagName === 'INPUT' || el2.tagName === 'TEXTAREA' || el2.isContentEditable)) return;
        __lastAutoUpdateTs = ahora2;
        try {
            await autoActualizarVistaActual();
        } catch (e) {
            console.warn('autoActualizarVistaActual error:', e);
        }
    }, 350, 'autoActualizarVistaActual');
}

function extraerEventosClientePorCampo(cliente, campo) {
    const out = [];
    const datos = (cliente?.datos_diarios || [])
        .filter(d => d && d.fila >= 15 && d.fila <= 1120 && d.fecha && !(typeof d.fecha === 'string' && d.fecha.toUpperCase() === 'FECHA'))
        .sort((a, b) => (a.fila || 0) - (b.fila || 0));
    const seen = new Set();
    datos.forEach(d => {
        const v = d[campo];
        if (typeof v !== 'number' || !isFinite(v) || v === 0) return;
        const key = `${d.fecha}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ fecha: d.fecha, fila: d.fila, valor: v });
    });
    return out;
}

function prepararInputEdicion(input) {
    if (!input || input.dataset && input.dataset.__prepEdicion === '1') return;
    input.dataset.__prepEdicion = '1';

    input.addEventListener('focus', () => {
        input.dataset.prevValue = input.value;
        input.dataset.prevValorNumerico = input.dataset.valorNumerico ?? '';
        input.dataset.overwritePending = '1';
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            input.value = input.dataset.prevValue ?? input.value;
            if (input.dataset.prevValorNumerico !== undefined) {
                input.dataset.valorNumerico = input.dataset.prevValorNumerico;
            }
            input.dataset.skipCommitOnce = '1';
            e.preventDefault();
            input.blur();
            return;
        }

        const overwritePending = input.dataset.overwritePending === '1';
        if (!overwritePending) return;

        const key = e.key;
        const esCharNumero = /^[0-9]$/.test(key) || key === ',' || key === '.' || key === '-';
        if (esCharNumero) {
            input.value = '';
            input.dataset.valorNumerico = '';
            input.dataset.overwritePending = '0';
        }
    });
}

function agregarAlHistorial(tipoEntidad, datos) {
    if (__isUndoRedo) return;

    // Si hay "rehacer" disponible, descartarlo al registrar un cambio nuevo
    if (indiceHistorial < historialCambios.length - 1) {
        historialCambios = historialCambios.slice(0, indiceHistorial + 1);
    }

    if (tipoEntidad === 'correccion') {
        historialCambios.push({
            tipo: 'correccion',
            tipoEntidad: 'correccion',
            datos
        });
    } else {
        historialCambios.push({
            tipo: 'edicion',
            tipoEntidad,
            hoja: datos?.hoja || hojaActual,
            clienteIdx: datos?.clienteIdx,
            fila: datos?.fila,
            campo: datos?.campo,
            valorAnterior: datos?.valorAnterior,
            valorNuevo: datos?.valorNuevo
        });
    }

    indiceHistorial = historialCambios.length - 1;
    actualizarBotonesUndoRedo();
}

async function aplicarCambioHistorial(cambio, usarValorNuevo) {
    if (!cambio) return;

    __isUndoRedo = true;
    try {
        if (cambio.tipo === 'correccion') {
            const error = cambio.datos?.error;
            const valor = usarValorNuevo ? error?.valorEsperado : cambio.datos?.valorAnterior;
            if (!error) return;

            if (error.tipo === 'general') {
                const hoja = datosEditados?.hojas?.[error.hoja];
                const filaData = hoja?.datos_diarios_generales?.find(d => d.fila === error.fila);
                if (filaData) {
                    filaData[error.campo] = valor;
                    actualizarCeldaEnUI(error.fila, error.campo, valor);
                }
            } else if (error.tipo === 'cliente') {
                const hoja = datosEditados?.hojas?.[error.hoja];
                const cliente = hoja?.clientes?.[error.clienteIdx];
                const dato = cliente?.datos_diarios?.find(d => d.fila === error.fila);
                if (dato) {
                    dato[error.campo] = valor;
                }
            }

            await guardarDatosAutomatico(0, 1);
            return;
        }

        if (cambio.tipo !== 'edicion') return;
        const hojaNombre = cambio.hoja || hojaActual;

        if (cambio.tipoEntidad === 'general') {
            const valor = usarValorNuevo ? cambio.valorNuevo : cambio.valorAnterior;
            await actualizarDatoGeneral(cambio.fila, cambio.campo, valor);
            return;
        }

        if (cambio.tipoEntidad === 'cliente') {
            const valor = usarValorNuevo ? cambio.valorNuevo : cambio.valorAnterior;
            const hoja = datosEditados?.hojas?.[hojaNombre];
            const cliente = hoja?.clientes?.[cambio.clienteIdx];
            const datoCliente = cliente?.datos_diarios?.find(d => d.fila === cambio.fila);
            if (!hoja || !cliente || !datoCliente) return;

            datoCliente[cambio.campo] = valor;

            if (cambio.campo === 'decremento') {
                const mismaFecha = datoCliente.fecha;
                const filasMismaFecha = (cliente.datos_diarios || [])
                    .filter(d => d.fecha === mismaFecha && d.fila >= 15 && d.fila <= 1120)
                    .map(d => d.fila)
                    .sort((a, b) => a - b);
                const posicionEnDia = filasMismaFecha.indexOf(datoCliente.fila);
                if (posicionEnDia === 0 && filasMismaFecha.length > 1) {
                    const segundaFilaNum = filasMismaFecha[1];
                    const segundaFila = (cliente.datos_diarios || []).find(d => d.fila === segundaFilaNum);
                    if (segundaFila) {
                        segundaFila.decremento = valor;
                    }
                }
            }

            if (cambio.campo === 'incremento' || cambio.campo === 'decremento') {
                recalcularTotalesCliente(cliente);
                requiereRecalculoImpInicial = true;
            }

            await recalcularFormulasPorCambioClienteEnHoja(cambio.clienteIdx, cambio.fila, cambio.campo, hojaNombre);

            if (vistaActual === 'detalle' && clienteActual === cambio.clienteIdx) {
                void mostrarTablaEditableCliente(hoja.clientes[cambio.clienteIdx], hoja, cambio.clienteIdx);
            }

            await guardarDatosAutomatico(0, 1);
            return;
        }
    } finally {
        __isUndoRedo = false;
        actualizarBotonesUndoRedo();
    }
}

// Sistema de validación
let erroresDetectados = []; // Errores encontrados en validación
let paginaActualErrores = 0; // Página actual del modal de errores
const ERRORES_POR_PAGINA = 5; // Errores a mostrar por página

// Obtener errores ignorados del localStorage
function obtenerErroresIgnorados() {
    try {
        return JSON.parse(localStorage.getItem('erroresIgnorados') || '[]');
    } catch {
        return [];
    }
}

let __cacheSaldosWindKey = null;
function recalcularSaldosTodosClientesEnMemoria(hoja) {
    if (!hoja || !hoja.clientes) return;
    hoja.clientes.forEach((_, idx) => {
        recalcularSaldosClienteEnMemoria(hoja, idx);
    });
}

function recalcularSaldosClienteEnMemoria(hoja, clienteIdx) {
    const cliente = hoja?.clientes?.[clienteIdx];
    if (!cliente || !cliente.datos_diarios) return;

    const datosDiariosGenerales = hoja?.datos_diarios_generales || [];
    const datosDiariosGeneralesAlt = hoja?.datos_diarios || [];
    const datosGeneralesParaImpFinal = (Array.isArray(datosDiariosGenerales) && datosDiariosGenerales.length > 0)
        ? datosDiariosGenerales
        : datosDiariosGeneralesAlt;
    const ultimaFilaImpFinal = obtenerUltimaFilaImpFinalManual(hoja);

    // Map rápido fila->datoGeneral para acceder a benef_porcentaje/imp_final
    const mapGeneralPorFila = new Map();
    (datosGeneralesParaImpFinal || []).forEach(d => {
        if (d && typeof d.fila === 'number') mapGeneralPorFila.set(d.fila, d);
    });
    
    console.log(`🔍 Recalculando cliente - datos generales disponibles: ${mapGeneralPorFila.size} filas`);

    const rows = cliente.datos_diarios
        .filter(d => d && typeof d.fila === 'number' && d.fila >= 15 && d.fila <= 1120)
        .sort((a, b) => (a.fila || 0) - (b.fila || 0));

    // Límite: última fila de CÁLCULO con actividad (cualquier inc/dec/benef en el día)
    const gruposPorFecha = new Map();
    rows.forEach(d => {
        const k = d?.fecha ? (normalizarFechaKey(d.fecha) || String(d.fecha).split(' ')[0]) : '';
        if (!k) return;
        const g = gruposPorFecha.get(k) || { rows: [] };
        g.rows.push(d);
        gruposPorFecha.set(k, g);
    });

    let last = 0;
    let hayMovimientosCliente = false;
    let lastMovimientoFila = 0;
    gruposPorFecha.forEach(g => {
        g.rows.sort((a, b) => (a.fila || 0) - (b.fila || 0));
        const filaCalculo = g.rows[g.rows.length - 1]?.fila || 0;
        const hayActividad = g.rows.some(r => {
            const inc = typeof r.incremento === 'number' ? r.incremento : 0;
            const dec = typeof r.decremento === 'number' ? r.decremento : 0;
            // CRÍTICO: La actividad debe basarse SOLO en entradas del usuario.
            // Si usamos campos calculados (beneficios/saldos), un valor antiguo puede impedir la limpieza.
            return inc !== 0 || dec !== 0;
        });
        if (hayActividad) {
            hayMovimientosCliente = true;
            lastMovimientoFila = Math.max(lastMovimientoFila, filaCalculo);
        }
    });

    // Si el cliente no tiene movimientos (inc/dec), verificar si tiene saldo_inicial_mes
    // Si tiene saldo inicial > 0, calcular hasta el último imp_final para mostrar arrastre
    const tieneSaldoInicial = cliente.saldo_inicial_mes && typeof cliente.saldo_inicial_mes === 'number' && cliente.saldo_inicial_mes > 0;
    
    if (hayMovimientosCliente) {
        last = Math.max(lastMovimientoFila, ultimaFilaImpFinal);
    } else if (tieneSaldoInicial && ultimaFilaImpFinal > 0) {
        // Cliente sin movimientos pero con saldo inicial: calcular hasta última fila con imp_final
        last = ultimaFilaImpFinal;
        console.log(`  Cliente sin movimientos pero con saldo_inicial_mes=${cliente.saldo_inicial_mes}, calculando hasta fila ${last}`);
    }

    // CRÍTICO: nunca calcular más allá de la última fila escrita en general (imp_final manual)
    // PERO si el cliente tiene saldo_inicial_mes, debe calcular al menos hasta donde haya imp_final
    if (ultimaFilaImpFinal > 0) {
        if (last > 0) {
            last = Math.min(last, ultimaFilaImpFinal);
        } else if (tieneSaldoInicial) {
            // Cliente sin movimientos pero con saldo inicial: calcular hasta última fila con imp_final
            last = ultimaFilaImpFinal;
        }
    }

    // Si no hay actividad ni saldo inicial, limpiar cualquier arrastre (evita "fantasmas" en clientes nuevos)
    if (last === 0) {
        for (const d of rows) {
            const campos = ['base', 'saldo_diario', 'beneficio_diario', 'beneficio_diario_pct', 'beneficio_acumulado', 'beneficio_acumulado_pct'];
            campos.forEach(c => {
                if (d[c] !== null && d[c] !== undefined) d[c] = null;
            });
        }
        return;
    }

    // Recalcular solo filas de CÁLCULO (última fila del día), aplicando inc(1ª fila) y dec(2ª fila)
    // Usar saldo_inicial_mes que debería estar actualizado por aplicarArrastreAnualAlCargar
    let saldoAnterior = (typeof cliente.saldo_inicial_mes === 'number' && isFinite(cliente.saldo_inicial_mes)) ? cliente.saldo_inicial_mes : 0;
    let benefAcumAnterior = 0;
    let inversionAcum = 0;
    const gruposOrdenados = Array.from(gruposPorFecha.values())
        .filter(g => g.rows && g.rows.length > 0)
        .sort((a, b) => (a.rows[0]?.fila || 0) - (b.rows[0]?.fila || 0));

    for (const g of gruposOrdenados) {
        g.rows.sort((a, b) => (a.fila || 0) - (b.fila || 0));
        const filaCalculo = g.rows[g.rows.length - 1];
        if (!filaCalculo || (filaCalculo.fila || 0) > last) break;

        const inc = g.rows.reduce((m, r) => {
            const v = typeof r.incremento === 'number' ? r.incremento : 0;
            return Math.max(m, v);
        }, 0);
        const dec = g.rows.reduce((m, r) => {
            const v = typeof r.decremento === 'number' ? r.decremento : 0;
            return Math.max(m, v);
        }, 0);

        inversionAcum += inc;

        const datoGeneral = mapGeneralPorFila.get(filaCalculo.fila);
        const tieneImpFinalGeneral = esImpFinalConValorGeneral(datoGeneral);
        const benefPct = (datoGeneral && typeof datoGeneral.benef_porcentaje === 'number' && isFinite(datoGeneral.benef_porcentaje))
            ? datoGeneral.benef_porcentaje
            : 0;

        // Log para diagnóstico
        if (filaCalculo.fila === 15 || !datoGeneral) {
            console.log(`  Fila ${filaCalculo.fila}: datoGeneral=${!!datoGeneral}, imp_final=${datoGeneral?.imp_final}, benef_pct=${benefPct}, tieneImpFinal=${tieneImpFinalGeneral}`);
        }

        // En WIND (y en general), si hay imp_final general, el beneficio del día se calcula por % sobre base.
        // Si no hay imp_final general, no hay beneficios.
        const ben = tieneImpFinalGeneral ? ((saldoAnterior + inc - dec) * benefPct) : 0;

        const base = saldoAnterior + inc - dec;
        const saldo = base + ben;
        filaCalculo.base = base;
        filaCalculo.saldo_diario = saldo;

        if (tieneImpFinalGeneral) {
            filaCalculo.beneficio_diario = ben;
            filaCalculo.beneficio_diario_pct = benefPct;
            benefAcumAnterior += ben;
            filaCalculo.beneficio_acumulado = benefAcumAnterior;
            filaCalculo.beneficio_acumulado_pct = inversionAcum > 0 ? (benefAcumAnterior / inversionAcum) : 0;
        } else {
            filaCalculo.beneficio_diario = null;
            filaCalculo.beneficio_diario_pct = null;
            filaCalculo.beneficio_acumulado = benefAcumAnterior > 0 ? benefAcumAnterior : null;
            filaCalculo.beneficio_acumulado_pct = null;
        }

        saldoAnterior = saldo;
    }

    // COPIAR saldo a fines de semana (sábado y domingo) SIN movimientos
    // Recorrer TODAS las filas y copiar el saldo del día anterior si es fin de semana sin incrementos/decrementos
    for (let i = 0; i < rows.length; i++) {
        const d = rows[i];
        if (!d || !d.fecha) continue;
        if (last > 0 && d.fila > last) continue;
        
        const fecha = new Date(d.fecha);
        const diaSemana = fecha.getDay(); // 0=domingo, 6=sábado
        
        // Si es sábado (6) o domingo (0) Y no tiene movimientos (sin incremento ni decremento)
        const tieneMovimientos = (typeof d.incremento === 'number' && d.incremento !== 0) || 
                                (typeof d.decremento === 'number' && d.decremento !== 0);
        
        if ((diaSemana === 0 || diaSemana === 6) && !tieneMovimientos) {
            // Buscar el último saldo válido anterior
            let saldoAnteriorValido = null;
            
            // CRÍTICO: Si no hay filas anteriores en este mes (primer día del mes),
            // usar saldo_inicial_mes en lugar de buscar en rows
            let hayFilasAnteriores = false;
            for (let j = i - 1; j >= 0; j--) {
                if (rows[j] && typeof rows[j].saldo_diario === 'number') {
                    saldoAnteriorValido = rows[j].saldo_diario;
                    hayFilasAnteriores = true;
                    break;
                }
            }
            
            // Si no hay filas anteriores con saldo, usar saldo_inicial_mes
            if (!hayFilasAnteriores && typeof cliente.saldo_inicial_mes === 'number') {
                saldoAnteriorValido = cliente.saldo_inicial_mes;
            }
            
            // Si encontramos un saldo anterior, copiarlo
            if (saldoAnteriorValido !== null) {
                d.saldo_diario = saldoAnteriorValido;
                d.base = saldoAnteriorValido;
            }
        }
    }

    // Limpiar todo lo que quede después de la última actividad
    for (const d of rows) {
        if (d.fila <= last) continue;
        const campos = ['base', 'saldo_diario', 'beneficio_diario', 'beneficio_diario_pct', 'beneficio_acumulado', 'beneficio_acumulado_pct'];
        campos.forEach(c => {
            if (d[c] !== null && d[c] !== undefined) d[c] = null;
        });
    }
}

function obtenerKeyComisionManual(ev) {
    const f = ev?.fecha ? String(ev.fecha).split(' ')[0] : '';
    const fila = ev?.fila !== undefined && ev?.fila !== null ? String(ev.fila) : '';
    return `${f}_${fila}`;
}

function obtenerEstadoManualComision(cliente, key) {
    const map = cliente?.comisiones_manual;
    if (!map || typeof map !== 'object') return null;
    const v = map[key];
    if (v === true) return true;
    if (v === false) return false;
    return null;
}

async function toggleEstadoManualComision(hojaNombre, clienteIdx, key, nuevoEstado) {
    const cliente = datosEditados?.hojas?.[hojaNombre]?.clientes?.[clienteIdx];
    if (!cliente) return;
    if (!cliente.comisiones_manual || typeof cliente.comisiones_manual !== 'object') {
        cliente.comisiones_manual = {};
    }
    const actual = cliente.comisiones_manual[key];
    if (actual === nuevoEstado) {
        delete cliente.comisiones_manual[key];
    } else {
        cliente.comisiones_manual[key] = nuevoEstado;
    }
    await guardarDatosAutomatico(0, 0);
    if (vistaActual === 'comision') {
        mostrarComision();
    }
}

function inicializarInspectorCeldas() {
    if (window.__inspectorCeldasInicializado) return;
    window.__inspectorCeldasInicializado = true;

    let hoverTimer = null;
    let tooltip = null;
    let activeEl = null;

    function limpiar() {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
        if (activeEl) {
            activeEl.classList.remove('cell-inspect-active');
            activeEl = null;
        }
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
    }

    function formatMoney(n) {
        if (typeof n !== 'number' || Number.isNaN(n)) return '0';
        try {
            return formatearMoneda(n);
        } catch {
            return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }

    function crearTooltip(html, x, y) {
        if (tooltip) tooltip.remove();
        tooltip = document.createElement('div');
        tooltip.className = 'cell-inspector-tooltip';
        tooltip.innerHTML = html;
        document.body.appendChild(tooltip);

        const margin = 12;
        const rect = tooltip.getBoundingClientRect();
        let left = x + margin;
        let top = y + margin;
        if (left + rect.width > window.innerWidth - margin) left = Math.max(margin, x - rect.width - margin);
        if (top + rect.height > window.innerHeight - margin) top = Math.max(margin, y - rect.height - margin);
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    function calcularDesgloseSaldo(hojaNombre, clienteIdx, fila) {
        const hoja = datosEditados?.hojas?.[hojaNombre];
        const cliente = hoja?.clientes?.[clienteIdx];
        const rows = (cliente?.datos_diarios || [])
            .filter(d => d && typeof d.fila === 'number' && d.fila >= 15 && d.fila <= 1120)
            .sort((a, b) => (a.fila || 0) - (b.fila || 0));

        const actual = rows.find(d => d.fila === fila) || null;
        if (!actual) return null;

        let saldoAnterior = (cliente && typeof cliente.saldo_inicial_mes === 'number' && isFinite(cliente.saldo_inicial_mes)) ? cliente.saldo_inicial_mes : 0;
        for (const d of rows) {
            if (d.fila >= fila) break;
            if (typeof d.saldo_diario === 'number') saldoAnterior = d.saldo_diario;
        }

        const inc = typeof actual.incremento === 'number' ? actual.incremento : 0;
        const dec = typeof actual.decremento === 'number' ? actual.decremento : 0;
        const benef = typeof actual.beneficio_diario === 'number' ? actual.beneficio_diario : 0;
        const base = saldoAnterior + inc - dec;
        const saldoCalculado = base + benef;
        const saldoActual = typeof actual.saldo_diario === 'number' ? actual.saldo_diario : null;

        return {
            saldoAnterior,
            inc,
            dec,
            benef,
            base,
            saldoCalculado,
            saldoActual,
            fecha: actual.fecha || ''
        };
    }

    function obtenerRefsDeFormula(formula) {
        if (!formula || typeof formula !== 'string') return [];
        const refs = new Set();
        const re = /\b([A-Z]{1,3}\d+)\b/g;
        let m;
        while ((m = re.exec(formula)) !== null) {
            refs.add(m[1]);
        }
        // FA / AEO también
        const reFA = /\b(FA\d+)\b/g;
        while ((m = reFA.exec(formula)) !== null) {
            refs.add(m[1]);
        }
        const reAEO = /\b(AEO\d+)\b/g;
        while ((m = reAEO.exec(formula)) !== null) {
            refs.add(m[1]);
        }
        return Array.from(refs);
    }

    function obtenerValoresRefsGeneral(formula, filaContexto, hoja) {
        const refs = obtenerRefsDeFormula(formula);
        const out = [];
        refs.forEach(ref => {
            const v = obtenerValorCelda(ref, hoja, filaContexto);
            out.push({ ref, valor: typeof v === 'number' ? v : 0 });
        });
        return out;
    }

    function obtenerValoresRefsCliente(formula, filaContexto, clienteIdx, hoja) {
        const refs = obtenerRefsDeFormula(formula);
        const out = [];
        refs.forEach(ref => {
            // Si la referencia es de cliente (K en adelante), usar obtenerValorCeldaCliente
            const col = ref.match(/^([A-Z]+)\d+$/)?.[1] || '';
            const esGeneral = ['A','B','C','D','E','F','G','H','I','J'].includes(col[0]);
            let v = 0;
            if (esGeneral) {
                v = obtenerValorCelda(ref, hoja, filaContexto);
            } else {
                v = obtenerValorCeldaCliente(ref, filaContexto, clienteIdx, hoja);
            }
            out.push({ ref, valor: typeof v === 'number' ? v : 0 });
        });
        return out;
    }

    document.addEventListener('mouseover', (e) => {
        const el = e.target?.closest?.('[data-inspect="saldo_diario"]');
        if (!el) return;
        // Excluir celdas editables (con input)
        if (el.querySelector && el.querySelector('input')) return;
        if (activeEl && el === activeEl) return;

        limpiar();
        hoverTimer = setTimeout(() => {
            const hojaNombre = el.dataset.hoja || hojaActual;
            const hoja = datosEditados?.hojas?.[hojaNombre];
            const fila = parseInt(el.dataset.fila);

            activeEl = el;
            activeEl.classList.add('cell-inspect-active');

            // CLIENTE
            if (el.dataset.clienteIdx !== undefined && el.dataset.campo) {
                const clienteIdx = parseInt(el.dataset.clienteIdx);
                const campo = el.dataset.campo;
                const cliente = hoja?.clientes?.[clienteIdx];
                const dato = cliente?.datos_diarios?.find(d => d.fila === fila);
                if (!dato) return;

                // Caso especial saldo_diario: desglose directo
                if (campo === 'saldo_diario') {
                    const desglose = calcularDesgloseSaldo(hojaNombre, clienteIdx, fila);
                    if (!desglose) return;
                    const html = `
                        <div class="t-title">Saldo Diario (Fila ${fila})</div>
                        <div class="t-row"><span class="t-k">Saldo anterior</span><span class="t-v">${formatMoney(desglose.saldoAnterior)}</span></div>
                        <div class="t-row"><span class="t-k">Incremento</span><span class="t-v">${formatMoney(desglose.inc)}</span></div>
                        <div class="t-row"><span class="t-k">Decremento</span><span class="t-v">${formatMoney(desglose.dec)}</span></div>
                        <div class="t-row"><span class="t-k">Benef. diario</span><span class="t-v">${formatMoney(desglose.benef)}</span></div>
                        <div class="t-row"><span class="t-k">Resultado</span><span class="t-v">${formatMoney(desglose.saldoCalculado)}</span></div>
                    `;
                    const r = el.getBoundingClientRect();
                    crearTooltip(html, r.right, r.top);
                    return;
                }

                return;
            }
            // No mostrar para otras celdas
        }, 2000);
    });

    document.addEventListener('mouseout', (e) => {
        const el = e.target?.closest?.('[data-inspect="saldo_diario"]');
        if (!el) return;
        limpiar();
    });

    window.addEventListener('scroll', limpiar, true);
    window.addEventListener('resize', limpiar);
}

// Guardar error como ignorado
function guardarErrorIgnorado(error) {
    const ignorados = obtenerErroresIgnorados();
    const clave = `${error.hoja}_${error.tipo}_${error.fila}_${error.campo}`;
    if (!ignorados.includes(clave)) {
        ignorados.push(clave);
        localStorage.setItem('erroresIgnorados', JSON.stringify(ignorados));
    }
}

// Verificar si un error está ignorado
function esErrorIgnorado(error) {
    const ignorados = obtenerErroresIgnorados();
    const clave = `${error.hoja}_${error.tipo}_${error.fila}_${error.campo}`;
    return ignorados.includes(clave);
}

// Cargar clientes anuales (independientes del mes)
async function cargarClientesAnuales() {
    try {
        const response = await fetch('/api/clientes_anuales', { cache: 'no-store' });
        if (!response.ok) {
            console.warn('⚠️ No se pudieron cargar clientes anuales, usando datos mensuales');
            return;
        }
        const data = await response.json();
        clientesAnuales = data.clientes || [];
        console.log('✅ Clientes anuales cargados:', clientesAnuales.length);
    } catch (error) {
        console.warn('⚠️ Error al cargar clientes anuales:', error);
    }
}

// Mostrar loading overlay
function mostrarLoadingOverlay() {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        // Crear overlay si no existe (fue removido)
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
                <div class="loading-text">Cargando...</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    __loadingOverlayCount++;
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    void overlay.offsetHeight;
}

// Ocultar loading overlay
function ocultarLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        __loadingOverlayCount = Math.max(0, (__loadingOverlayCount || 0) - 1);
        if (__loadingOverlayCount === 0) {
            overlay.classList.add('hidden');
        }
    }
}

function setLoadingOverlayText(texto) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    const el = overlay.querySelector('.loading-text');
    if (el) el.textContent = texto;
}

// Ocultar sidebar automáticamente en móviles
function ocultarSidebarEnMovil() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
    }
}

// Ocultar sidebar al navegar (para todas las pantallas)
function ocultarSidebarAlNavegar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.add('collapsed');
    }
}

// Inicialización
async function inicializarApp() {
    try {
        console.log('🚀 Iniciando aplicación...');
        await cargarMeses();
        console.log('✅ Meses cargados:', mesesDisponibles);
        await cargarClientesAnuales();
        await cargarDatos();
        console.log('✅ Datos cargados');
        inicializarEventos();
        console.log('✅ Eventos inicializados');

        await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'init' });
        mostrarVistaGeneral();
        console.log('✅ Vista general mostrada');
        
        // Ocultar loading y sidebar en móvil
        ocultarLoadingOverlay();
        ocultarSidebarEnMovil();
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        mostrarNotificacion('Error al iniciar la aplicación. Recarga la página.', 'error');
        ocultarLoadingOverlay();
    }
}

async function mostrarVistaGeneralAuto() {
    mostrarLoadingOverlay();
    try {
        await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'nav_general' });
        mostrarVistaGeneral();
        ocultarSidebarAlNavegar();
    } finally {
        ocultarLoadingOverlay();
    }
}

async function mostrarVistaClientesAuto() {
    mostrarLoadingOverlay();
    try {
        await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'nav_clientes' });
        mostrarVistaClientes();
        ocultarSidebarAlNavegar();
    } finally {
        ocultarLoadingOverlay();
    }
}

async function mostrarVistaInfoClientesAuto() {
    mostrarLoadingOverlay();
    try {
        await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'nav_infoClientes' });
        mostrarVistaInfoClientes();
        ocultarSidebarAlNavegar();
    } finally {
        ocultarLoadingOverlay();
    }
}

async function mostrarVistaComisionAuto() {
    mostrarLoadingOverlay();
    try {
        await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'nav_comision' });
        mostrarVistaComision();
        ocultarSidebarAlNavegar();
    } finally {
        ocultarLoadingOverlay();
    }
}

async function autoActualizarVistaActual() {
    await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'focus_or_visibility' });
    if (vistaActual === 'general') {
        mostrarVistaGeneral();
        return;
    }
    if (vistaActual === 'clientes') {
        mostrarVistaClientes();
        return;
    }
    if (vistaActual === 'detalle' && clienteActual !== null && clienteActual !== undefined) {
        const idx = parseInt(clienteActual);
        if (!isNaN(idx)) {
            void renderDetalleCliente(idx);
        }
    }
}

function calcularPctAcumuladoTWR(pctAcumAnterior, pctDiario) {
    const a = typeof pctAcumAnterior === 'number' ? pctAcumAnterior : 0;
    const d = typeof pctDiario === 'number' ? pctDiario : 0;
    return (1 + a) * (1 + d) - 1;
}

function recalcularBeneficiosGeneralesDesdeFila(filaInicio, hoja) {
    const datosDiarios = hoja?.datos_diarios_generales || [];
    const filasOrdenadas = [...datosDiarios]
        .filter(d => d && d.fila >= 15 && d.fila <= 1120)
        .sort((a, b) => (a.fila || 0) - (b.fila || 0));

    const idxInicio = filasOrdenadas.findIndex(d => (d.fila || 0) >= filaInicio);
    if (idxInicio === -1) return;

    let benefEuroAcumAnterior = 0;
    let benefPctAcumAnterior = 0;
    for (let i = idxInicio - 1; i >= 0; i--) {
        const d = filasOrdenadas[i];
        if (typeof d.benef_euro_acum === 'number') {
            benefEuroAcumAnterior = d.benef_euro_acum;
            break;
        }
    }
    for (let i = idxInicio - 1; i >= 0; i--) {
        const d = filasOrdenadas[i];
        if (typeof d.benef_porcentaje_acum === 'number') {
            benefPctAcumAnterior = d.benef_porcentaje_acum;
            break;
        }
    }

    for (let i = idxInicio; i < filasOrdenadas.length; i++) {
        const filaData = filasOrdenadas[i];
        const tieneImpFinal = !!(esCeldaManualGeneral(filaData, 'imp_final') && typeof filaData.imp_final === 'number' && isFinite(filaData.imp_final));

        if (!tieneImpFinal) {
            const campos = ['benef_euro', 'benef_porcentaje', 'benef_euro_acum', 'benef_porcentaje_acum'];
            campos.forEach(c => {
                if (filaData[c] !== null && filaData[c] !== undefined) {
                    filaData[c] = null;
                    actualizarCeldaEnUI(filaData.fila, c, null);
                }
            });
            continue;
        }

        const impInicial = typeof filaData.imp_inicial === 'number' ? filaData.imp_inicial : 0;
        const impFinal = filaData.imp_final;
        const benefEuro = impFinal - impInicial;
        const benefPct = impInicial !== 0 ? benefEuro / impInicial : 0;
        const benefEuroAcum = benefEuroAcumAnterior + benefEuro;
        const benefPctAcum = calcularPctAcumuladoTWR(benefPctAcumAnterior, benefPct);

        if (filaData.benef_euro !== benefEuro) {
            filaData.benef_euro = benefEuro;
            actualizarCeldaEnUI(filaData.fila, 'benef_euro', benefEuro);
        }
        if (filaData.benef_porcentaje !== benefPct) {
            filaData.benef_porcentaje = benefPct;
            actualizarCeldaEnUI(filaData.fila, 'benef_porcentaje', benefPct);
        }
        if (filaData.benef_euro_acum !== benefEuroAcum) {
            filaData.benef_euro_acum = benefEuroAcum;
            actualizarCeldaEnUI(filaData.fila, 'benef_euro_acum', benefEuroAcum);
        }
        if (filaData.benef_porcentaje_acum !== benefPctAcum) {
            filaData.benef_porcentaje_acum = benefPctAcum;
            actualizarCeldaEnUI(filaData.fila, 'benef_porcentaje_acum', benefPctAcum);
        }

        benefEuroAcumAnterior = benefEuroAcum;
        benefPctAcumAnterior = benefPctAcum;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
    inicializarApp();
}

function obtenerImporteFinalGeneral(hoja) {
    if (!hoja) return null;
    const datos = hoja?.datos_diarios_generales || [];
    for (let i = datos.length - 1; i >= 0; i--) {
        const dato = datos[i];
        if (dato?.fila >= 15 && dato?.fila <= 1120 && dato?.fecha && dato?.fecha !== 'FECHA') {
            if (typeof dato.imp_final === 'number') {
                return dato.imp_final;
            }
        }
    }
    return null;
}

function obtenerSaldoClienteEnFecha(cliente, fechaObjetivo) {
    if (!cliente || !fechaObjetivo) return null;
    const tsObjetivo = parsearFechaValor(fechaObjetivo)?.getTime();
    if (!tsObjetivo) return null;

    const datos = (cliente.datos_diarios || [])
        .filter(d => d && d.fila >= 15 && d.fila <= 1120 && d.fecha && d.fecha !== 'FECHA')
        .filter(d => typeof d.saldo_diario === 'number');

    if (datos.length === 0) return null;

    let mejor = null;
    for (const d of datos) {
        const ts = parsearFechaValor(d.fecha)?.getTime() || 0;
        if (ts === 0 || ts > tsObjetivo) continue;
        if (!mejor) {
            mejor = d;
            continue;
        }
        const tsMejor = parsearFechaValor(mejor.fecha)?.getTime() || 0;
        if (ts > tsMejor || (ts === tsMejor && (d.fila || 0) > (mejor.fila || 0))) {
            mejor = d;
        }
    }

    return mejor ? mejor.saldo_diario : null;
}

function obtenerTotalSaldosClientesEnFecha(hoja, fechaObjetivo) {
    if (!hoja || !hoja.clientes || !fechaObjetivo) return null;
    let suma = 0;
    let count = 0;
    hoja.clientes.forEach(cliente => {
        const saldo = obtenerSaldoClienteEnFecha(cliente, fechaObjetivo);
        if (typeof saldo === 'number') {
            suma += saldo;
            count++;
        }
    });
    return count > 0 && suma !== 0 ? suma : null;
}

function obtenerUltimaFechaSaldoCliente(cliente) {
    const datosDiarios = (cliente?.datos_diarios || [])
        .filter(d => d && d.fila >= 15 && d.fila <= 1120 && d.fecha && d.fecha !== 'FECHA')
        .filter(d => typeof d.saldo_diario === 'number');

    if (datosDiarios.length === 0) return null;

    datosDiarios.sort((a, b) => {
        const fechaA = parsearFechaValor(a.fecha)?.getTime() || 0;
        const fechaB = parsearFechaValor(b.fecha)?.getTime() || 0;
        if (fechaA !== fechaB) return fechaA - fechaB;
        return (a.fila || 0) - (b.fila || 0);
    });

    return datosDiarios[datosDiarios.length - 1].fecha;
}

async function cargarMeses() {
    try {
        const response = await fetch('/api/meses', { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo cargar meses');
        mesesDisponibles = await response.json();
        if (!mesActual) {
            const lista = mesesDisponibles[hojaActual] || [];
            mesActual = lista.length > 0 ? lista[0] : null;
        }
        if (!mesActual) {
            const hojasDisponibles = Object.keys(mesesDisponibles);
            for (const hoja of hojasDisponibles) {
                const lista = mesesDisponibles[hoja] || [];
                if (lista.length > 0) {
                    hojaActual = hoja;
                    mesActual = lista[0];
                    break;
                }
            }
        }
        actualizarSelectorMes();
    } catch (error) {
        console.error('Error al cargar meses:', error);
        mostrarNotificacion('Error al cargar meses disponibles', 'error');
    }
}

function normalizarFechaKey(valor) {
    const fecha = parsearFechaValor(valor);
    if (!fecha) return null;
    return fecha.toISOString().split('T')[0];
}

function obtenerPrimeraFilaPorFechaCliente(cliente) {
    const primeraFilaPorFecha = new Map();
    (cliente.datos_diarios || []).forEach(dato => {
        if (!dato || dato.fila < 15 || dato.fila > 1120) return;
        if (!dato.fecha || (typeof dato.fecha === 'string' && dato.fecha.toUpperCase() === 'FECHA')) return;
        const filaActual = primeraFilaPorFecha.get(dato.fecha);
        if (filaActual === undefined || dato.fila < filaActual) {
            primeraFilaPorFecha.set(dato.fecha, dato.fila);
        }
    });
    return primeraFilaPorFecha;
}

function obtenerUltimoAcumuladoGeneral(hoja, fechaObjetivo = null) {
    const datosDiarios = hoja?.datos_diarios_generales || [];
    const acumulados = datosDiarios
        .filter(d => d && d.fila >= 15 && d.fila <= 1120 && d.fecha && d.fecha !== 'FECHA')
        .filter(d => typeof d.benef_euro_acum === 'number' || typeof d.benef_porcentaje_acum === 'number');

    if (acumulados.length === 0) return null;

    const fechaObjetivoStr = fechaObjetivo ? normalizarFechaKey(fechaObjetivo) : null;
    const acumuladosFiltrados = fechaObjetivoStr
        ? acumulados.filter(d => {
            const fechaDato = normalizarFechaKey(d.fecha);
            return fechaDato && fechaDato === fechaObjetivoStr;
        })
        : acumulados;

    if (acumuladosFiltrados.length === 0) return null;

    acumuladosFiltrados.sort((a, b) => {
        const fechaA = parsearFechaValor(a.fecha)?.getTime() || 0;
        const fechaB = parsearFechaValor(b.fecha)?.getTime() || 0;
        if (fechaA !== fechaB) return fechaA - fechaB;
        return (a.fila || 0) - (b.fila || 0);
    });

    return acumuladosFiltrados[acumuladosFiltrados.length - 1];
}

function obtenerUltimoAcumuladoCliente(cliente, fechaObjetivo = null) {
    const datosDiarios = (cliente.datos_diarios || [])
        .filter(d => d && d.fila >= 15 && d.fila <= 1120 && d.fecha && d.fecha !== 'FECHA')
        .filter(d => typeof d.beneficio_acumulado === 'number' || typeof d.beneficio_acumulado_pct === 'number');

    if (datosDiarios.length === 0) return null;

    const fechaObjetivoStr = fechaObjetivo ? normalizarFechaKey(fechaObjetivo) : null;
    const datosFiltrados = fechaObjetivoStr
        ? datosDiarios.filter(d => {
            const fechaDato = normalizarFechaKey(d.fecha);
            return fechaDato && fechaDato === fechaObjetivoStr;
        })
        : datosDiarios;

    if (datosFiltrados.length === 0) return null;

    datosFiltrados.sort((a, b) => {
        const fechaA = parsearFechaValor(a.fecha)?.getTime() || 0;
        const fechaB = parsearFechaValor(b.fecha)?.getTime() || 0;
        if (fechaA !== fechaB) return fechaA - fechaB;
        return (a.fila || 0) - (b.fila || 0);
    });

    return datosFiltrados[datosFiltrados.length - 1];
}

function esCeldaManualGeneral(filaData, columna) {
    const tieneFormula = filaData.formulas && filaData.formulas[columna] && filaData.formulas[columna].trim() !== '';
    const estaBloqueada = filaData.bloqueadas && filaData.bloqueadas[columna] === true;
    return !tieneFormula && !estaBloqueada;
}

function obtenerSaldoAnteriorImpFinalManualGeneral(hoja, fila) {
    if (!hoja || typeof fila !== 'number') return 0;
    const datos = hoja.datos_diarios_generales || [];
    for (let f = fila - 1; f >= 15; f--) {
        const d = datos.find(x => x && x.fila === f);
        if (!d) continue;
        if (!d.fecha || d.fecha === 'FECHA') continue;
        if (esCeldaManualGeneral(d, 'imp_final') && typeof d.imp_final === 'number' && isFinite(d.imp_final)) {
            return d.imp_final;
        }
    }
    return typeof hoja._impFinalMesAnterior === 'number' ? hoja._impFinalMesAnterior : 0;
}

function esImpFinalConValorGeneral(filaData) {
    return !!(filaData && filaData.fecha && filaData.fecha !== 'FECHA' &&
        typeof filaData.imp_final === 'number' && isFinite(filaData.imp_final));
}

function obtenerUltimaFilaImpFinalManual(hoja) {
    const datosDiarios = hoja?.datos_diarios_generales || [];
    let maxFila = 0;
    datosDiarios.forEach(d => {
        if (!d || typeof d.fila !== 'number') return;
        if (d.fila < 15 || d.fila > 1120) return;
        if (!d.fecha || d.fecha === 'FECHA') return;
        // CRÍTICO: Solo considerar imp_final REALMENTE manual (editable). Ignorar valores bloqueados.
        if (!(esCeldaManualGeneral(d, 'imp_final') && esImpFinalConValorGeneral(d))) return;
        maxFila = Math.max(maxFila, d.fila);
    });
    return maxFila;
}

function obtenerUltimaFechaImpFinalManual(hoja) {
    const datosDiarios = hoja?.datos_diarios_generales || [];
    const manuales = datosDiarios
        .filter(d => d && d.fila >= 15 && d.fila <= 1120)
        // CRÍTICO: Solo imp_final manual (editable). Ignorar bloqueados.
        .filter(d => esCeldaManualGeneral(d, 'imp_final') && esImpFinalConValorGeneral(d));

    if (manuales.length === 0) return null;

    manuales.sort((a, b) => {
        const fechaA = parsearFechaValor(a.fecha)?.getTime() || 0;
        const fechaB = parsearFechaValor(b.fecha)?.getTime() || 0;
        if (fechaA !== fechaB) return fechaA - fechaB;
        return (a.fila || 0) - (b.fila || 0);
    });

    return manuales[manuales.length - 1].fecha;
}

function actualizarSelectorMes() {
    const selectorMes = document.getElementById('selectorMes');
    if (!selectorMes) return;
    selectorMes.innerHTML = '';
    const meses = mesesDisponibles[hojaActual] || [];
    if (meses.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Sin meses --';
        selectorMes.appendChild(option);
        mesActual = null;
        return;
    }
    if (!mesActual || !meses.includes(mesActual)) {
        mesActual = meses[0];
    }
    meses.forEach(mes => {
        const option = document.createElement('option');
        option.value = mes;
        option.textContent = formatearMesLabel(mes);
        if (mes === mesActual) option.selected = true;
        selectorMes.appendChild(option);
    });
    selectorMes.value = mesActual;
    actualizarNavegacionMes();
}

function formatearMesLabel(mes) {
    if (!mes || !/\d{4}-\d{2}/.test(mes)) return mes || '-- Mes --';
    const [anio, mesNum] = mes.split('-');
    const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const idx = parseInt(mesNum, 10) - 1;
    if (idx < 0 || idx >= nombres.length) return mes;
    return `${nombres[idx]} ${anio}`;
}

function actualizarNavegacionMes() {
    const btnAnterior = document.getElementById('btnMesAnterior');
    const btnSiguiente = document.getElementById('btnMesSiguiente');
    const meses = mesesDisponibles[hojaActual] || [];
    if (!btnAnterior || !btnSiguiente) return;
    const idx = meses.indexOf(mesActual);
    btnAnterior.disabled = idx <= 0;
    btnSiguiente.disabled = idx === -1 || idx >= meses.length - 1;
}

async function cambiarMesAnterior() {
    const meses = mesesDisponibles[hojaActual] || [];
    const idx = meses.indexOf(mesActual);
    if (idx > 0) {
        // Guardar vista y cliente actual ANTES de cambiar
        const vistaAnterior = vistaActual;
        const clienteAnterior = clienteActual;
        
        mesActual = meses[idx - 1];
        const selectorMes = document.getElementById('selectorMes');
        if (selectorMes) selectorMes.value = mesActual;
        await cargarDatos();
        requiereRecalculoImpInicial = true;
        actualizarNavegacionMes();
        await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'cambiarMesAnterior' });
        
        // Restaurar la vista anterior
        restaurarVistaAnterior(vistaAnterior, clienteAnterior);
    }
}

async function cambiarMesSiguiente() {
    const meses = mesesDisponibles[hojaActual] || [];
    const idx = meses.indexOf(mesActual);
    if (idx !== -1 && idx < meses.length - 1) {
        // Guardar vista y cliente actual ANTES de cambiar
        const vistaAnterior = vistaActual;
        const clienteAnterior = clienteActual;
        
        mesActual = meses[idx + 1];
        const selectorMes = document.getElementById('selectorMes');
        if (selectorMes) selectorMes.value = mesActual;
        await cargarDatos();
        requiereRecalculoImpInicial = true;
        actualizarNavegacionMes();
        await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'cambiarMesSiguiente' });
        
        // Restaurar la vista anterior
        restaurarVistaAnterior(vistaAnterior, clienteAnterior);
    }
}

// Función auxiliar para restaurar la vista después de cambiar de mes
function restaurarVistaAnterior(vistaAnterior, clienteAnterior) {
    if (vistaAnterior === 'detalle' && clienteAnterior !== null) {
        void renderDetalleCliente(clienteAnterior);
    } else if (vistaAnterior === 'clientes') {
        mostrarVistaClientes();
    } else if (vistaAnterior === 'infoClientes' || vistaAnterior === 'info') {
        mostrarVistaInfoClientes();
    } else if (vistaAnterior === 'comision') {
        mostrarVistaComision();
    } else {
        mostrarVistaGeneral();
    }
}

// Función auxiliar para preservar campos bloqueadas y fórmulas al sincronizar
function preservarBloqueadas(datosOriginales, datosEditados) {
    // Recorrer todas las hojas
    for (const nombreHoja in datosOriginales.hojas) {
        if (!datosEditados.hojas[nombreHoja]) {
            datosEditados.hojas[nombreHoja] = JSON.parse(JSON.stringify(datosOriginales.hojas[nombreHoja]));
            continue;
        }
        
        const hojaOriginal = datosOriginales.hojas[nombreHoja];
        const hojaEditada = datosEditados.hojas[nombreHoja];
        
        // Preservar bloqueadas y fórmulas en datos diarios generales
        if (hojaOriginal.datos_diarios_generales && hojaEditada.datos_diarios_generales) {
            // Crear un mapa por número de fila para búsqueda rápida
            const mapaOriginal = {};
            hojaOriginal.datos_diarios_generales.forEach(d => {
                if (d && d.fila !== undefined) {
                    mapaOriginal[d.fila] = d;
                }
            });
            
            // Sincronizar bloqueadas y fórmulas por número de fila
            hojaEditada.datos_diarios_generales.forEach(editado => {
                if (editado && editado.fila !== undefined) {
                    const original = mapaOriginal[editado.fila];
                    if (original) {
                        // Preservar el campo bloqueadas del original
                        if (original.bloqueadas) {
                            editado.bloqueadas = JSON.parse(JSON.stringify(original.bloqueadas));
                        }
                        // CRÍTICO: Preservar también las fórmulas
                        if (original.formulas) {
                            editado.formulas = JSON.parse(JSON.stringify(original.formulas));
                        }
                    }
                }
            });
        }
        
        // Preservar bloqueadas y fórmulas en datos generales
        if (hojaOriginal.datos_generales && hojaEditada.datos_generales) {
            // Crear un mapa por número de fila para búsqueda rápida
            const mapaOriginal = {};
            hojaOriginal.datos_generales.forEach(d => {
                if (d && d.fila !== undefined) {
                    mapaOriginal[d.fila] = d;
                }
            });
            
            // Sincronizar bloqueadas y fórmulas por número de fila
            hojaEditada.datos_generales.forEach(editado => {
                if (editado && editado.fila !== undefined) {
                    const original = mapaOriginal[editado.fila];
                    if (original) {
                        // CRÍTICO: SIEMPRE preservar bloqueadas y fórmulas del original
                        if (original.bloqueadas) {
                            editado.bloqueadas = JSON.parse(JSON.stringify(original.bloqueadas));
                        } else {
                            editado.bloqueadas = {};
                        }
                        // CRÍTICO: Preservar también las fórmulas - ESTO ES CRÍTICO
                        if (original.formulas) {
                            editado.formulas = JSON.parse(JSON.stringify(original.formulas));
                        } else {
                            editado.formulas = {};
                        }
                    }
                }
            });
        }
        
        // Preservar bloqueadas y fórmulas en clientes
        if (hojaOriginal.clientes && hojaEditada.clientes) {
            hojaOriginal.clientes.forEach((clienteOriginal, idx) => {
                if (idx < hojaEditada.clientes.length) {
                    const clienteEditado = hojaEditada.clientes[idx];
                    
                    // Preservar bloqueadas y fórmulas en datos_diarios de cada cliente
                    if (clienteOriginal.datos_diarios && clienteEditado.datos_diarios) {
                        const mapaOriginal = {};
                        clienteOriginal.datos_diarios.forEach(d => {
                            if (d && d.fila !== undefined) {
                                mapaOriginal[d.fila] = d;
                            }
                        });
                        
                        clienteEditado.datos_diarios.forEach(editado => {
                            if (editado && editado.fila !== undefined) {
                                const original = mapaOriginal[editado.fila];
                                if (original) {
                                    if (original.bloqueadas) {
                                        editado.bloqueadas = JSON.parse(JSON.stringify(original.bloqueadas));
                                    }
                                    // CRÍTICO: Preservar también las fórmulas del cliente
                                    if (original.formulas) {
                                        editado.formulas = JSON.parse(JSON.stringify(original.formulas));
                                    }
                                }
                            }
                        });
                    }
                }
            });
        }
    }
}

// Guardar datos automáticamente (por mes)
async function guardarDatosAutomatico(numFormulasGenerales = 0, numFormulasClientes = 0) {
    console.log('💾 guardarDatosAutomatico llamado');
    console.log('   hojaActual:', hojaActual);
    console.log('   mesActual:', mesActual);
    console.log('   datosEditados existe:', !!datosEditados);
    
    if (!datosEditados || !mesActual) {
        console.warn('⚠️ No se puede guardar: datosEditados o mesActual no definidos');
        return;
    }

    const hoja = datosEditados?.hojas?.[hojaActual];
    if (!hoja) {
        console.warn('⚠️ No se puede guardar: hoja no encontrada en datosEditados');
        return;
    }

    // CRÍTICO: Antes de guardar, recalcular generales para persistir imp_inicial/beneficios coherentes.
    // Evita que un mes quede guardado con base 0 (y contamine cálculos de clientes).
    try {
        recalcularTotalesGenerales(hoja);
        recalcularImpInicialSync(hoja);
        recalcularBeneficiosGeneralesDesdeFila(15, hoja);
    } catch (e) {
        console.warn('⚠️ Error recalculando generales antes de guardar:', e);
    }
    
    // Debug: verificar que los datos del cliente están actualizados
    if (hoja.clientes && hoja.clientes[0]) {
        const cliente1 = hoja.clientes[0];
        const dia1 = cliente1.datos_diarios?.find(d => d.fila === 15);
        if (dia1) {
            console.log('   Cliente 1, fila 15, incremento:', dia1.incremento);
        }
    }
    
    // CRÍTICO: Asegurar que saldo_inicial_mes se persista para el arrastre entre meses
    // Y calcular saldo_actual (saldo final del mes) para que el próximo mes lo use
    if (hoja.clientes) {
        hoja.clientes.forEach((cliente, idx) => {
            if (!cliente) return;
            
            // Si saldo_inicial_mes no está definido, usar 0 como fallback
            if (cliente.saldo_inicial_mes === undefined || cliente.saldo_inicial_mes === null) {
                cliente.saldo_inicial_mes = 0;
            }
            
            // IMPORTANTE: Calcular saldo_actual (saldo final del mes) para el próximo mes
            const saldoFinal = obtenerSaldoFinalClienteDeMes(cliente);
            cliente.saldo_actual = saldoFinal;
            
            console.log(`   Cliente ${idx + 1}: saldo_inicial_mes=${cliente.saldo_inicial_mes}, saldo_actual=${saldoFinal}`);
        });
    }
    
    const url = `/api/guardar/${hojaActual.replace(/\s/g, '_')}/${mesActual}`;
    console.log('   URL:', url);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(hoja)
        });
        
        const resultado = await response.json();
        console.log('   Respuesta servidor:', resultado);
        
        if (resultado.status === 'ok' || resultado.success) {
            console.log('✅ Datos guardados correctamente');
        } else {
            console.error('❌ Error al guardar:', resultado.error || resultado.message);
            mostrarNotificacion('Error al guardar: ' + (resultado.error || resultado.message), 'error');
        }
    } catch (error) {
        console.error('❌ Error al guardar en servidor:', error);
        mostrarNotificacion('Error de conexión al guardar', 'error');
    }
}

// Cargar datos desde el JSON mensual
async function cargarDatos() {
    if (!mesActual) {
        const meses = mesesDisponibles[hojaActual] || [];
        mesActual = meses.length > 0 ? meses[0] : null;
    }
    if (!mesActual) {
        mostrarNotificacion('Selecciona un mes válido', 'error');
        return;
    }
    
    console.log(`📥 Cargando datos: ${hojaActual} ${mesActual}`);
    
    try {
        // Cargar solo la hoja actual para mayor velocidad y fiabilidad
        const response = await fetch(`/api/datos/${hojaActual.replace(/\s/g, '_')}/${mesActual}`, { cache: 'no-store' });
        
        if (!response.ok) {
            throw new Error(`No hay datos para ${hojaActual} ${mesActual}`);
        }
        
        const data = await response.json();

        await aplicarArrastreAnualAlCargar(hojaActual, mesActual, data);
        
        // Inicializar estructuras si no existen
        if (!datosCompletos) datosCompletos = { hojas: {} };
        if (!datosEditados) datosEditados = { hojas: {} };
        
        datosCompletos.hojas[hojaActual] = data;
        datosEditados.hojas[hojaActual] = JSON.parse(JSON.stringify(data));

        __dirtyRecalculoMasivo = true;
        __recalculoVersion++;
        __cacheSaldosWindKey = null;
        
        preservarBloqueadas(datosCompletos, datosEditados);
        
        const totalClientes = data?.clientes?.length || 0;
        const totalDiarios = data?.datos_diarios_generales?.length || 0;
        
        console.log(`✅ Datos cargados: ${totalClientes} clientes, ${totalDiarios} días`);
        
        mostrarNotificacion(`${hojaActual} ${mesActual} | ${totalClientes} clientes`, 'success');
        
        actualizarSelectorClientes();
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        mostrarNotificacion('Error al cargar los datos: ' + error.message, 'error');
    }
}

function obtenerMesAnteriorDeHoja(nombreHoja, mes) {
    const lista = mesesDisponibles?.[nombreHoja] || [];
    const idx = lista.indexOf(mes);
    if (idx <= 0) return null;
    return lista[idx - 1] || null;
}

function obtenerSaldoFinalClienteDeMes(cliente) {
    // Buscar último saldo_diario válido en datos_diarios CON FECHA ESCRITA
    const datos = (cliente?.datos_diarios || [])
        .filter(d => d && d.fila >= 15 && d.fila <= 1120 && 
                d.fecha && d.fecha !== 'FECHA' && // Solo filas con fecha escrita
                typeof d.saldo_diario === 'number')
        .sort((a, b) => (a.fila || 0) - (b.fila || 0));
    
    if (datos.length > 0) {
        const ultimo = datos[datos.length - 1];
        console.log(`   - Cliente saldo final: ${ultimo.saldo_diario} (fila ${ultimo.fila}, fecha ${ultimo.fecha})`);
        return ultimo.saldo_diario;
    }
    
    // CRÍTICO: Si no hay saldos diarios (cliente sin movimientos), 
    // el saldo final es el saldo_inicial_mes (arrastre sin cambios)
    // NO usar saldo_actual porque puede tener valor viejo de antes de borrar movimientos
    if (typeof cliente?.saldo_inicial_mes === 'number' && cliente.saldo_inicial_mes > 0) {
        console.log(`   - Cliente sin movimientos, saldo final = saldo_inicial_mes: ${cliente.saldo_inicial_mes}`);
        return cliente.saldo_inicial_mes;
    }
    
    // Cliente sin saldo inicial y sin movimientos = saldo 0
    console.log(`   - Cliente sin saldo inicial ni movimientos, saldo final = 0`);
    return 0;
}

async function aplicarArrastreAnualAlCargar(nombreHoja, mes, dataMes) {
    if (!dataMes || !Array.isArray(dataMes.clientes)) return;
    const mesAnterior = obtenerMesAnteriorDeHoja(nombreHoja, mes);
    if (!mesAnterior) {
        (dataMes.clientes || []).forEach((c, idx) => {
            if (!c) return;
            c._acumPrevInc = 0;
            c._acumPrevDec = 0;
            c.saldo_inicial_mes = 0;
            c.numero_cliente = typeof c.numero_cliente === 'number' ? c.numero_cliente : (idx + 1);
            c.columna_inicio = 11 + (idx * 8);
        });
        return;
    }

    try {
        const respPrev = await fetch(`/api/datos/${nombreHoja.replace(/\s/g, '_')}/${mesAnterior}`, { cache: 'no-store' });
        if (!respPrev.ok) {
            return;
        }
        const dataPrev = await respPrev.json();
        const prevClientes = Array.isArray(dataPrev?.clientes) ? dataPrev.clientes : [];

        // Asegurar clientes de todo el año: si faltan clientes en este mes, copiarlos del mes anterior
        if (prevClientes.length > dataMes.clientes.length) {
            for (let i = dataMes.clientes.length; i < prevClientes.length; i++) {
                const base = prevClientes[i];
                if (!base) continue;
                const nuevo = JSON.parse(JSON.stringify(base));
                if (nuevo.datos_diarios && Array.isArray(nuevo.datos_diarios)) {
                    nuevo.datos_diarios.forEach(filaData => {
                        if (!filaData) return;
                        if (typeof filaData.incremento === 'number') filaData.incremento = null;
                        if (typeof filaData.decremento === 'number') filaData.decremento = null;
                        ['base', 'saldo_diario', 'beneficio_diario', 'beneficio_diario_pct', 'beneficio_acumulado', 'beneficio_acumulado_pct']
                            .forEach(campo => {
                                if (filaData[campo] !== null && filaData[campo] !== undefined) filaData[campo] = null;
                            });
                    });
                }
                nuevo.incrementos_total = 0;
                nuevo.decrementos_total = 0;
                nuevo.saldo_actual = 0;
                dataMes.clientes.push(nuevo);
            }
        }

        // Arrastre de info y acumulados/saldo desde mes anterior
        dataMes.clientes.forEach((c, idx) => {
            if (!c) return;
            const prev = prevClientes[idx];
            
            // CRÍTICO: NUNCA sobrescribir datos de clientes que ya existen
            // Solo copiar si el cliente actual NO tiene datos (nombre/apellidos vacíos)
            if (prev && prev.datos && (!c.datos || Object.keys(c.datos).length === 0)) {
                // Solo copiar si realmente no hay datos
                const datosActuales = c.datos || {};
                const nombreActual = datosActuales['NOMBRE']?.valor || datosActuales['nombre'] || '';
                const apellidosActual = datosActuales['APELLIDOS']?.valor || datosActuales['apellidos'] || '';
                
                // Solo copiar si NO tiene nombre ni apellidos
                if (!nombreActual && !apellidosActual) {
                    c.datos = JSON.parse(JSON.stringify(prev.datos));
                }
            }

            const prevInc = prev && typeof prev.incrementos_total === 'number' ? prev.incrementos_total : 0;
            const prevDec = prev && typeof prev.decrementos_total === 'number' ? prev.decrementos_total : 0;
            console.log(`📊 Cliente ${idx + 1} - Calculando saldo_inicial_mes desde mes anterior:`);
            const prevSaldo = prev ? obtenerSaldoFinalClienteDeMes(prev) : 0;
            c._acumPrevInc = prevInc;
            c._acumPrevDec = prevDec;
            c.saldo_inicial_mes = prevSaldo;
            console.log(`   -> saldo_inicial_mes asignado: ${prevSaldo}`);

            c.numero_cliente = typeof c.numero_cliente === 'number' ? c.numero_cliente : (idx + 1);
            c.columna_inicio = 11 + (idx * 8);
        });
        
        // ARRASTRE COMPLETO DEL MES ANTERIOR
        const datosGenPrev = dataPrev.datos_diarios_generales || [];
        const datosGeneralesPrev = dataPrev.datos_generales || [];
        
        // 1. Último imp_final del mes anterior
        const ultimoImpFinalMesAnterior = obtenerUltimoImpFinalDeDatosGenerales(datosGenPrev);
        
        // 2. Inversión inicial acumulada (fila 3 del mes anterior)
        const fila3Prev = datosGeneralesPrev.find(d => d.fila === 3);
        const inversionInicialAcumulada = fila3Prev?.imp_inicial || fila3Prev?.imp_final || 0;
        
        // 3. Beneficio acumulado (última fila con benef_euro_acum)
        const ultimoBenefAcum = obtenerUltimoBeneficioAcumulado(datosGenPrev);
        const ultimoBenefPctAcum = obtenerUltimoBeneficioPctAcumulado(datosGenPrev);
        
        console.log(`📅 Arrastre entre meses desde ${mesAnterior}:`);
        console.log(`   - Último imp_final: ${ultimoImpFinalMesAnterior}`);
        console.log(`   - Inversión inicial acumulada: ${inversionInicialAcumulada}`);
        console.log(`   - Beneficio € acumulado: ${ultimoBenefAcum}`);
        console.log(`   - Beneficio % acumulado: ${ultimoBenefPctAcum}`);
        
        // Guardar para usarlo en recálculos
        dataMes._impFinalMesAnterior = ultimoImpFinalMesAnterior || 0;
        dataMes._inversionInicialAcumulada = inversionInicialAcumulada || 0;
        dataMes._benefEuroAcumAnterior = ultimoBenefAcum || 0;
        dataMes._benefPctAcumAnterior = ultimoBenefPctAcum || 0;
    } catch (e) {
        console.warn('⚠️ No se pudo aplicar arrastre anual:', e);
    }
}

// Obtener el último imp_final válido de datos generales
function obtenerUltimoImpFinalDeDatosGenerales(datosGen) {
    if (!datosGen || !Array.isArray(datosGen)) return null;
    
    const datosOrdenados = datosGen
        .filter(d => d && d.fila >= 15 && d.fila <= 1120 && d.fecha && d.fecha !== 'FECHA')
        .sort((a, b) => (b.fila || 0) - (a.fila || 0)); // Ordenar descendente por fila

    // 1) Último imp_final numérico (incluye fines de semana bloqueados) => candidato a "cierre"
    let ultimoAny = null;
    for (const d of datosOrdenados) {
        if (typeof d.imp_final === 'number' && isFinite(d.imp_final) && d.imp_final > 0) {
            ultimoAny = d.imp_final;
            break;
        }
    }

    // 2) Último imp_final manual (editable) => referencia humana
    let ultimoManual = null;
    for (const d of datosOrdenados) {
        if (esCeldaManualGeneral(d, 'imp_final') && typeof d.imp_final === 'number' && isFinite(d.imp_final) && d.imp_final > 0) {
            ultimoManual = d.imp_final;
            break;
        }
    }

    // Regla:
    // - Si hay manual, y el último "any" coincide (fin de semana que repite) => usar any.
    // - Si hay manual pero el último any es distinto (valor bloqueado basura) => usar manual.
    // - Si no hay manual, usar any.
    if (typeof ultimoManual === 'number') {
        if (typeof ultimoAny === 'number' && Math.abs(ultimoAny - ultimoManual) < 0.01) return ultimoAny;
        return ultimoManual;
    }
    return ultimoAny;
}

// Obtener el último beneficio € acumulado del mes
function obtenerUltimoBeneficioAcumulado(datosGen) {
    if (!datosGen || !Array.isArray(datosGen)) return 0;
    
    const datosOrdenados = datosGen
        .filter(d => d && d.fila >= 15 && d.fila <= 1120 && d.fecha && d.fecha !== 'FECHA')
        .sort((a, b) => (b.fila || 0) - (a.fila || 0));
    
    for (const d of datosOrdenados) {
        if (typeof d.benef_euro_acum === 'number' && isFinite(d.benef_euro_acum)) {
            return d.benef_euro_acum;
        }
    }
    
    return 0;
}

// Obtener el último beneficio % acumulado del mes
function obtenerUltimoBeneficioPctAcumulado(datosGen) {
    if (!datosGen || !Array.isArray(datosGen)) return 0;
    
    const datosOrdenados = datosGen
        .filter(d => d && d.fila >= 15 && d.fila <= 1120 && d.fecha && d.fecha !== 'FECHA')
        .sort((a, b) => (b.fila || 0) - (a.fila || 0));
    
    for (const d of datosOrdenados) {
        if (typeof d.benef_porcentaje_acum === 'number' && isFinite(d.benef_porcentaje_acum)) {
            return d.benef_porcentaje_acum;
        }
    }
    
    return 0;
}

// Inicializar eventos
function inicializarEventos() {
    document.getElementById('selectorHoja').addEventListener('change', cambiarHoja);
    const selectorMes = document.getElementById('selectorMes');
    if (selectorMes) {
        selectorMes.addEventListener('change', cambiarMes);
    }
    const btnMesAnterior = document.getElementById('btnMesAnterior');
    const btnMesSiguiente = document.getElementById('btnMesSiguiente');
    if (btnMesAnterior) btnMesAnterior.addEventListener('click', cambiarMesAnterior);
    if (btnMesSiguiente) btnMesSiguiente.addEventListener('click', cambiarMesSiguiente);
    document.getElementById('selectorCliente').addEventListener('change', seleccionarCliente);
    document.getElementById('btnGuardar').addEventListener('click', guardarCambios);
    document.getElementById('btnExportar').addEventListener('click', exportarJSON);
    document.getElementById('btnVolver').addEventListener('click', () => { void mostrarVistaClientesAuto(); });
    document.getElementById('btnVolverGeneral').addEventListener('click', () => { void mostrarVistaGeneralAuto(); });
    document.getElementById('btnVolverGeneralDesdeClientes').addEventListener('click', () => { void mostrarVistaGeneralAuto(); });
    document.getElementById('confirmarGuardar').addEventListener('click', confirmarGuardar);
    document.getElementById('cancelarGuardar').addEventListener('click', cerrarModal);
    
    // Navegación
    document.getElementById('btnVistaGeneral').addEventListener('click', () => { void mostrarVistaGeneralAuto(); });
    document.getElementById('btnVistaClientes').addEventListener('click', () => { void mostrarVistaClientesAuto(); });
    
    // Info Clientes
    const btnVistaInfoClientes = document.getElementById('btnVistaInfoClientes');
    if (btnVistaInfoClientes) {
        btnVistaInfoClientes.addEventListener('click', () => { void mostrarVistaInfoClientesAuto(); });
    }
    
    // Vista Comisión
    const btnVistaComision = document.getElementById('btnVistaComision');
    if (btnVistaComision) {
        btnVistaComision.addEventListener('click', () => { void mostrarVistaComisionAuto(); });
    }
    
    // Vista Estadísticas
    const btnVistaEstadisticas = document.getElementById('btnVistaEstadisticas');
    if (btnVistaEstadisticas) {
        btnVistaEstadisticas.addEventListener('click', () => { void mostrarVistaEstadisticasAuto(); });
    }
    
    // Estadísticas del Cliente
    const btnEstadisticasCliente = document.getElementById('btnEstadisticasCliente');
    if (btnEstadisticasCliente) {
        btnEstadisticasCliente.addEventListener('click', () => { mostrarEstadisticasCliente(); });
    }
    
    // Tabs para seleccionar hoja en Info Clientes
    const tabSTD = document.getElementById('tabSTD');
    const tabVIP = document.getElementById('tabVIP');
    const tabWIND = document.getElementById('tabWIND');
    if (tabSTD) {
        tabSTD.addEventListener('click', () => cambiarHojaInfoClientes('Diario STD'));
    }
    if (tabVIP) {
        tabVIP.addEventListener('click', () => cambiarHojaInfoClientes('Diario VIP'));
    }
    if (tabWIND) {
        tabWIND.addEventListener('click', () => cambiarHojaInfoClientes('Diario WIND'));
    }
    
    // Tabs para seleccionar hoja en Comisión
    const tabSTDComision = document.getElementById('tabSTDComision');
    const tabVIPComision = document.getElementById('tabVIPComision');
    const tabWINDComision = document.getElementById('tabWINDComision');
    if (tabSTDComision) {
        tabSTDComision.addEventListener('click', () => cambiarHojaComision('Diario STD'));
    }
    if (tabVIPComision) {
        tabVIPComision.addEventListener('click', () => cambiarHojaComision('Diario VIP'));
    }
    if (tabWINDComision) {
        tabWINDComision.addEventListener('click', () => cambiarHojaComision('Diario WIND'));
    }
    
    // Tabs para seleccionar hoja en Estadísticas
    const tabSTDStats = document.getElementById('tabSTDStats');
    const tabVIPStats = document.getElementById('tabVIPStats');
    const tabWINDStats = document.getElementById('tabWINDStats');
    if (tabSTDStats) {
        tabSTDStats.addEventListener('click', () => cambiarHojaEstadisticas('Diario STD'));
    }
    if (tabVIPStats) {
        tabVIPStats.addEventListener('click', () => cambiarHojaEstadisticas('Diario VIP'));
    }
    if (tabWINDStats) {
        tabWINDStats.addEventListener('click', () => cambiarHojaEstadisticas('Diario WIND'));
    }
    
    // Selector de tipo de gráfico
    const tipoGrafico = document.getElementById('tipoGrafico');
    if (tipoGrafico) {
        tipoGrafico.addEventListener('change', () => {
            if (vistaActual === 'estadisticas') actualizarTipoGrafico();
        });
    }
    
    const buscarInfoCliente = document.getElementById('buscarInfoCliente');
    if (buscarInfoCliente) {
        buscarInfoCliente.addEventListener('input', filtrarInfoClientes);
    }

    const buscarComision = document.getElementById('buscarComision');
    if (buscarComision) {
        buscarComision.addEventListener('input', () => {
            if (vistaActual !== 'comision') return;
            debounce(() => {
                if (vistaActual === 'comision') mostrarComision();
            }, 180, 'buscarComision');
        });
    }

    const btnUndo = document.getElementById('btnUndo');
    if (btnUndo) {
        btnUndo.addEventListener('click', () => {
            void deshacer();
        });
    }
    const btnRedo = document.getElementById('btnRedo');
    if (btnRedo) {
        btnRedo.addEventListener('click', () => {
            void rehacer();
        });
    }
    actualizarBotonesUndoRedo();
    
    // Atajos de teclado globales
    document.addEventListener('keydown', manejarAtajosTeclado);
    
    // Filtros de fecha
    document.getElementById('btnAplicarFiltro').addEventListener('click', aplicarFiltroFechas);
    document.getElementById('btnLimpiarFiltro').addEventListener('click', limpiarDatosUsuarioMesActualConConfirmacion);
    const btnLimpiarFiltroFechas = document.getElementById('btnLimpiarFiltroFechas');
    if (btnLimpiarFiltroFechas) {
        btnLimpiarFiltroFechas.addEventListener('click', limpiarFiltroFechas);
    }
    document.getElementById('btnToggleVista').addEventListener('click', toggleVistaResumen);
    
    inicializarInspectorCeldas();

    window.addEventListener('focus', () => {
        programarAutoActualizarVistaActual();
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            programarAutoActualizarVistaActual();
        }
    });
    window.addEventListener('pageshow', () => {
        programarAutoActualizarVistaActual();
    });

    const btnActualizarTodo = document.getElementById('btnActualizarTodo');
    if (btnActualizarTodo) {
        btnActualizarTodo.addEventListener('click', actualizarTodoElDiario);
    }

    const btnAgregarCliente = document.getElementById('btnAgregarCliente');
    if (btnAgregarCliente) {
        btnAgregarCliente.addEventListener('click', agregarNuevoClienteDesdeUI);
    }

    const ordenClientes = document.getElementById('ordenClientes');
    if (ordenClientes) {
        ordenClientes.addEventListener('change', () => {
            if (vistaActual === 'clientes') {
                renderVistaClientes();
            }
        });
    }

    const buscarCliente = document.getElementById('buscarCliente');
    if (buscarCliente) {
        buscarCliente.addEventListener('input', () => {
            if (vistaActual !== 'clientes') return;
            debounce(() => {
                if (vistaActual === 'clientes') renderVistaClientes();
            }, 180, 'buscarCliente');
        });
    }

    const selectorPlantillaCliente = document.getElementById('selectorPlantillaCliente');
    if (selectorPlantillaCliente) {
        selectorPlantillaCliente.addEventListener('change', () => {
            if (vistaActual === 'clientes') {
                renderVistaClientes();
            }
        });
    }

    inicializarHoverScaleDelay();

    const btnEliminarCliente = document.getElementById('btnEliminarCliente');
    if (btnEliminarCliente) {
        btnEliminarCliente.addEventListener('click', () => {
            void eliminarClienteActualDesdeUI();
        });
    }
}

function inicializarHoverScaleDelay() {
    if (window.__hoverScaleDelayInicializado) return;
    window.__hoverScaleDelayInicializado = true;

    const timers = new WeakMap();

    function clear(el) {
        const t = timers.get(el);
        if (t) {
            clearTimeout(t);
            timers.delete(el);
        }
        el.classList.remove('hover-scale');
    }

    document.addEventListener('mouseover', (e) => {
        const el = e.target?.closest?.('.cliente-card-mini, .summary-card-premium');
        if (!el) return;
        clear(el);
        const t = setTimeout(() => {
            el.classList.add('hover-scale');
        }, 2000);
        timers.set(el, t);
    });

    document.addEventListener('mouseout', (e) => {
        const el = e.target?.closest?.('.cliente-card-mini, .summary-card-premium');
        if (!el) return;
        clear(el);
    });
}

// Cambiar hoja
async function cambiarHoja() {
    mostrarLoadingOverlay();
    try {
        const nuevoValor = document.getElementById('selectorHoja').value;
        console.log('🔄 cambiarHoja: de', hojaActual, 'a', nuevoValor);
        
        if (nuevoValor === hojaActual) {
            console.log('⏭️ Misma hoja, no hay cambio');
            ocultarLoadingOverlay();
            return;
        }
        
        hojaActual = nuevoValor;
        clienteActual = null;
        const selectorCliente = document.getElementById('selectorCliente');
        if (selectorCliente) selectorCliente.value = '';
        
        // Obtener primer mes disponible para la nueva hoja
        const mesesNuevaHoja = mesesDisponibles[hojaActual] || [];
        mesActual = mesesNuevaHoja.length > 0 ? mesesNuevaHoja[0] : null;
        
        actualizarSelectorMes();
        await cargarDatos();
        requiereRecalculoImpInicial = true;
        await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'cambiarHoja' });
        mostrarVistaGeneral();
        mostrarNotificacion(`Cambiado a ${hojaActual}`, 'success');
        console.log('✅ cambiarHoja: completado para', hojaActual);
    } catch (error) {
        console.error('❌ Error al cambiar hoja:', error);
        mostrarNotificacion('Error al cambiar hoja', 'error');
    } finally {
        ocultarLoadingOverlay();
    }
}

async function cambiarMes() {
    mostrarLoadingOverlay();
    try {
        const selectorMes = document.getElementById('selectorMes');
        mesActual = selectorMes ? selectorMes.value : mesActual;
        
        // Guardar vista y cliente actual ANTES de cambiar
        const vistaAnterior = vistaActual;
        const clienteAnterior = clienteActual;
        
        await cargarDatos();
        requiereRecalculoImpInicial = true;
        actualizarNavegacionMes();
        await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'cambiarMes' });
        
        // Restaurar la vista anterior en lugar de siempre ir a general
        restaurarVistaAnterior(vistaAnterior, clienteAnterior);
        
        // Scroll al día 1 (fila 15)
        setTimeout(() => {
            const fila15 = document.querySelector('[data-fila="15"]');
            if (fila15) {
                fila15.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);
    } finally {
        ocultarLoadingOverlay();
    }
}

// Variables para vista general
let vistaResumen = false; // false = completo (todos los días), true = resumen (4 filas)
let fechaDesdeFiltro = null;
let fechaHastaFiltro = null;

// Funciones de filtro y vista
function aplicarFiltroFechas() {
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;
    
    fechaDesdeFiltro = fechaDesde ? new Date(fechaDesde) : null;
    fechaHastaFiltro = fechaHasta ? new Date(fechaHasta) : null;
    
    mostrarVistaGeneral();
    mostrarNotificacion('Filtro aplicado', 'success');
}

function limpiarFiltroFechas() {
    document.getElementById('fechaDesde').value = '';
    document.getElementById('fechaHasta').value = '';
    fechaDesdeFiltro = null;
    fechaHastaFiltro = null;
    mostrarVistaGeneral();
    mostrarNotificacion('Filtro limpiado', 'success');
}

function toggleVistaResumen() {
    vistaResumen = !vistaResumen;
    const btn = document.getElementById('btnToggleVista');
    btn.textContent = vistaResumen ? 'Ver Todos los Días' : 'Ver Resumen';
    mostrarVistaGeneral();
    mostrarNotificacion(vistaResumen ? 'Mostrando resumen (4 filas)' : 'Mostrando todos los días', 'success');
}

// Mostrar vista general
function mostrarVistaGeneral() {
    vistaActual = 'general';
    
    // Resetear cliente seleccionado y selector
    clienteActual = null;
    const selectorCliente = document.getElementById('selectorCliente');
    if (selectorCliente) selectorCliente.value = '';
    
    // Ocultar TODAS las otras vistas
    document.getElementById('vistaGeneral').classList.add('active');
    document.getElementById('vistaClientes').classList.remove('active');
    document.getElementById('vistaDetalle').classList.remove('active');
    const vistaInfo = document.getElementById('vistaInfoClientes');
    if (vistaInfo) vistaInfo.classList.remove('active');
    const vistaComision = document.getElementById('vistaComision');
    if (vistaComision) vistaComision.classList.remove('active');
    const vistaEstadisticas = document.getElementById('vistaEstadisticas');
    if (vistaEstadisticas) vistaEstadisticas.classList.remove('active');
    
    // Actualizar botones
    document.getElementById('btnVistaGeneral').classList.add('active');
    document.getElementById('btnVistaClientes').classList.remove('active');
    const btnInfo = document.getElementById('btnVistaInfoClientes');
    if (btnInfo) btnInfo.classList.remove('active');
    const btnComision = document.getElementById('btnVistaComision');
    if (btnComision) btnComision.classList.remove('active');
    const btnEstadisticas = document.getElementById('btnVistaEstadisticas');
    if (btnEstadisticas) btnEstadisticas.classList.remove('active');
    
    if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[hojaActual]) {
        return;
    }
    
    const hoja = datosEditados.hojas[hojaActual];
    const datosGenerales = hoja.datos_generales || [];
    const datosDiarios = hoja.datos_diarios_generales || [];
    
    // IMPORTANTE: Recalcular totales generales antes de mostrar
    recalcularTotalesGenerales(hoja);
    
    // Recalcular imp_inicial/beneficios SIEMPRE antes de mostrar (sync)
    // Esto asegura que los valores estén actualizados sin necesidad de pulsar Actualizar
    recalcularImpInicialSync(hoja);
    requiereRecalculoImpInicial = false;
    
    // REDISTRIBUCIÓN AUTOMÁTICA PARA DIARIO WIND
    // Mantiene imp_final del general fijo y redistribuye saldos proporcionalmente entre clientes
    if (hojaActual === 'Diario WIND') {
        setTimeout(() => redistribuirSaldosClientesWIND(hoja), 100);
    }
    
    // Mostrar tarjetas de resumen premium
    mostrarTarjetasResumen(datosGenerales, datosDiarios);
    
    // Mostrar tabla según vista seleccionada
    const filtroActivo = !!(fechaDesdeFiltro || fechaHastaFiltro);
    if (vistaResumen && !filtroActivo) {
        mostrarTablaResumen(datosGenerales);
    } else {
        if (datosDiarios && datosDiarios.length > 0) {
            mostrarTablaCompleta(datosDiarios);
        } else {
            mostrarNotificacion('No hay datos diarios disponibles', 'error');
            mostrarTablaResumen(datosGenerales);
        }
    }
}

// Recalcular totales de las filas 3-6
function recalcularTotalesGenerales(hoja) {
    const datosGenerales = hoja.datos_generales || [];
    
    // Fila 3: Inversión Inicial = Inversión acumulada del mes anterior + Suma de incrementos de este mes
    // IMPORTANTE: El año es continuo, los meses no se reinician
    const fila3 = datosGenerales.find(d => d.fila === 3);
    if (fila3 && hoja.clientes) {
        // Inversión acumulada del mes anterior
        const inversionAcumuladaAnterior = hoja._inversionInicialAcumulada || 0;
        
        // Sumar incrementos de este mes
        let sumaIncrementosMes = 0;
        hoja.clientes.forEach(cliente => {
            if (cliente.datos_diarios) {
                cliente.datos_diarios.forEach(dato => {
                    // Solo contar incrementos válidos (filas 15-1120, numéricos)
                    if (dato.fila >= 15 && dato.fila <= 1120 &&
                        dato.incremento !== null && 
                        dato.incremento !== undefined && 
                        typeof dato.incremento === 'number' &&
                        dato.incremento > 0) {
                        sumaIncrementosMes += dato.incremento;
                    }
                });
            }
        });
        
        // Total = acumulado anterior + incrementos de este mes
        const inversionTotal = inversionAcumuladaAnterior + sumaIncrementosMes;
        fila3.imp_inicial = inversionTotal;
        fila3.imp_final = inversionTotal;
        console.log(`✓ Fila 3 (Inversión Inicial): ${inversionTotal} (anterior: ${inversionAcumuladaAnterior} + este mes: ${sumaIncrementosMes})`);
    }
    
    // Fila 4: Importe Final = Última casilla de imp_final escrita (con su fecha)
    const fila4 = datosGenerales.find(d => d.fila === 4);
    if (fila4) {
        const datosDiarios = hoja.datos_diarios_generales || [];
        let ultimoImpFinal = null;
        let ultimaFecha = null;
        // Buscar desde el final hacia atrás, solo filas válidas (15-1120) y manuales
        for (let i = datosDiarios.length - 1; i >= 0; i--) {
            const dato = datosDiarios[i];
            if (dato.fila >= 15 && dato.fila <= 1120 && esCeldaManualGeneral(dato, 'imp_final') && esImpFinalConValorGeneral(dato)) {
                ultimoImpFinal = dato.imp_final;
                ultimaFecha = dato.fecha;
                break;
            }
        }
        if (ultimoImpFinal !== null) {
            fila4.imp_final = ultimoImpFinal;
            fila4.fecha = ultimaFecha;
            console.log(`✓ Fila 4 (Importe Final): ${ultimoImpFinal} (${ultimaFecha})`);
        } else {
            console.warn('⚠️ No se encontró imp_final válido para Fila 4');
        }
    }
    
    // Fila 5: Beneficio Total = Importe Final - Inversión Inicial (puede ser negativo)
    const fila5 = datosGenerales.find(d => d.fila === 5);
    if (fila5 && fila3 && fila4) {
        let beneficio = null;
        const fechaObjetivo = obtenerUltimaFechaImpFinalManual(hoja);
        const ultimoAcumulado = obtenerUltimoAcumuladoGeneral(hoja, fechaObjetivo);
        beneficio = ultimoAcumulado ? ultimoAcumulado.benef_euro_acum : null;
        if (beneficio === null) {
            const inversionInicial = fila3.imp_inicial || 0;
            const importeFinal = fila4.imp_final || 0;
            beneficio = importeFinal - inversionInicial;
        }
        fila5.imp_final = beneficio;
        fila5.imp_inicial = beneficio;
        console.log(`✓ Fila 5 (Beneficio Total): ${beneficio}`);
    }
    
    // Fila 6: Rentabilidad = (Beneficio Total / Inversión Inicial) * 100 (puede ser negativo)
    const fila6 = datosGenerales.find(d => d.fila === 6);
    if (fila6 && fila3 && fila5) {
        const inversionInicial = fila3.imp_inicial || 0;
        let rentabilidad = null;
        const fechaObjetivo = obtenerUltimaFechaImpFinalManual(hoja);
        const ultimoAcumulado = obtenerUltimoAcumuladoGeneral(hoja, fechaObjetivo);
        rentabilidad = ultimoAcumulado ? ultimoAcumulado.benef_porcentaje_acum : null;
        if (rentabilidad === null) {
            const beneficioTotal = fila5.imp_final || 0;
            if (inversionInicial !== 0) {
                rentabilidad = beneficioTotal / inversionInicial;
            } else if (beneficioTotal !== 0) {
                rentabilidad = beneficioTotal > 0 ? Infinity : -Infinity;
            }
        }
        fila6.imp_final = rentabilidad;
        fila6.imp_inicial = rentabilidad;
        console.log(`✓ Fila 6 (Rentabilidad): ${rentabilidad !== null ? (rentabilidad * 100).toFixed(2) + '%' : 'N/A'}`);
    }
    
    // Recalcular otras fórmulas si las hay
    datosGenerales.forEach(filaData => {
        if (!filaData.formulas || filaData.fila <= 6) return; // Ya procesamos 3-6
        
        Object.keys(filaData.formulas).forEach(columnaConFormula => {
            const formula = filaData.formulas[columnaConFormula];
            const nuevoValor = evaluarFormula(formula, filaData.fila, hoja);
            
            if (nuevoValor !== null) {
                const valorAnterior = filaData[columnaConFormula];
                if (valorAnterior !== nuevoValor) {
                    console.log(`Recalculando Total Fila ${filaData.fila}, ${columnaConFormula}: ${valorAnterior} -> ${nuevoValor}`);
                    filaData[columnaConFormula] = nuevoValor;
                }
            }
        });
    });
}

// Actualizar tarjetas de resumen (llamar cuando cambien los datos)
function actualizarTarjetasResumen() {
    if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[hojaActual]) {
        return;
    }
    
    const hoja = datosEditados.hojas[hojaActual];
    const datosGenerales = hoja.datos_generales || [];
    mostrarTarjetasResumen(datosGenerales);
}

// Mostrar tarjetas de resumen premium
function mostrarTarjetasResumen(datosGenerales, datosDiariosOverride = null) {
    const summaryCards = document.getElementById('summaryCards');
    
    if (!datosGenerales || datosGenerales.length === 0) {
        summaryCards.innerHTML = '';
        return;
    }
    
    const hoja = datosEditados?.hojas?.[hojaActual];
    
    // 1. INVERSIÓN INICIAL = Suma de TODOS los incrementos de TODOS los clientes
    // IMPORTANTE: Sumar directamente desde datos_diarios, no desde incrementos_total
    // porque incrementos_total puede no estar actualizado
    let inversionInicial = 0;
    let fechaInversionInicial = null;
    if (hoja && hoja.clientes) {
        hoja.clientes.forEach(cliente => {
            if (cliente.datos_diarios) {
                cliente.datos_diarios.forEach(dato => {
                    // Solo contar incrementos válidos (filas 15-1120, numéricos)
                    if (dato.fila >= 15 && dato.fila <= 1120 &&
                        dato.incremento !== null && 
                        dato.incremento !== undefined && 
                        typeof dato.incremento === 'number' &&
                        dato.incremento > 0) {
                        inversionInicial += dato.incremento;
                        // Buscar la fecha del primer incremento para mostrar
                        if (!fechaInversionInicial && dato.fecha) {
                            fechaInversionInicial = dato.fecha;
                        }
                    }
                });
            }
        });
    }
    
    // 2. IMPORTE FINAL = Última casilla de imp_final escrita (con su fecha)
    let importeFinal = null;
    let fechaImporteFinal = null;
    const datosDiarios = datosDiariosOverride || hoja?.datos_diarios_generales || [];

    // Si hay filtro de fechas, calcular sobre los días filtrados
    let datosDiariosParaResumen = datosDiarios;
    if (fechaDesdeFiltro || fechaHastaFiltro) {
        datosDiariosParaResumen = datosDiarios.filter(dato => {
            if (!dato || !dato.fecha) return false;
            const fechaDato = parsearFechaValor(dato.fecha);
            if (!fechaDato) return false;
            if (fechaDesdeFiltro && fechaDato < fechaDesdeFiltro) return false;
            if (fechaHastaFiltro && fechaDato > fechaHastaFiltro) return false;
            return true;
        });
    }
    // Buscar desde el final hacia atrás la última casilla con imp_final MANUAL (editable) y válido
    // Filtrar solo filas dentro del rango válido (15-1120) y con fecha válida
    for (let i = datosDiariosParaResumen.length - 1; i >= 0; i--) {
        const dato = datosDiariosParaResumen[i];
        // Verificar que esté en rango válido, tenga fecha y tenga imp_final válido
        if (dato.fila >= 15 && dato.fila <= 1120 &&
            dato.fecha && 
            dato.fecha !== 'FECHA' &&
            esCeldaManualGeneral(dato, 'imp_final') &&
            dato.imp_final !== null && 
            dato.imp_final !== undefined && 
            typeof dato.imp_final === 'number' &&
            dato.imp_final !== 0) {
            importeFinal = dato.imp_final;
            fechaImporteFinal = dato.fecha;
            break;
        }
    }
    
    // Si no se encontró, buscar cualquier imp_final MANUAL válido (incluso si es 0)
    if (importeFinal === null) {
        for (let i = datosDiariosParaResumen.length - 1; i >= 0; i--) {
            const dato = datosDiariosParaResumen[i];
            if (dato.fila >= 15 && dato.fila <= 1120 &&
                dato.fecha && 
                dato.fecha !== 'FECHA' &&
                esCeldaManualGeneral(dato, 'imp_final') &&
                dato.imp_final !== null && 
                dato.imp_final !== undefined && 
                typeof dato.imp_final === 'number') {
                importeFinal = dato.imp_final;
                fechaImporteFinal = dato.fecha;
                break;
            }
        }
    }
    
    // 3. BENEFICIO TOTAL = benef_euro_acum de la última fecha con imp_final escrito
    // 4. RENTABILIDAD = benef_porcentaje_acum de la última fecha con imp_final escrito
    let beneficioTotal = null;
    let rentabilidad = null;
    
    // Buscar la última fila con imp_final MANUAL y obtener sus acumulados
    for (let i = datosDiariosParaResumen.length - 1; i >= 0; i--) {
        const dato = datosDiariosParaResumen[i];
        if (dato.fila >= 15 && dato.fila <= 1120 &&
            dato.fecha && dato.fecha !== 'FECHA' &&
            esCeldaManualGeneral(dato, 'imp_final') &&
            typeof dato.imp_final === 'number') {
            // Encontramos la última fila con imp_final, usar sus acumulados
            if (typeof dato.benef_euro_acum === 'number') {
                beneficioTotal = dato.benef_euro_acum;
            }
            if (typeof dato.benef_porcentaje_acum === 'number') {
                rentabilidad = dato.benef_porcentaje_acum;
            }
            break;
        }
    }
    
    // Fallback si no hay acumulados: calcular desde imp_final - inversión
    if (beneficioTotal === null && importeFinal !== null && inversionInicial !== null) {
        beneficioTotal = importeFinal - inversionInicial;
    }
    if (rentabilidad === null && beneficioTotal !== null && inversionInicial > 0) {
        rentabilidad = beneficioTotal / inversionInicial;
    }
    
    // Determinar clases CSS
    const claseBeneficio = beneficioTotal !== null ? (beneficioTotal >= 0 ? 'positive' : 'negative') : '';
    const claseRentabilidad = rentabilidad !== null && isFinite(rentabilidad) 
        ? (rentabilidad >= 0 ? 'positive' : 'negative') 
        : '';
    
    summaryCards.innerHTML = `
        <div class="summary-card-premium">
            <div class="card-icon">💰</div>
            <div class="card-content">
                <div class="card-label">Inversión Inicial</div>
                <div class="card-value">${inversionInicial > 0 ? formatearMoneda(inversionInicial) : '-'}</div>
                <div class="card-date">${fechaInversionInicial ? formatearFecha(fechaInversionInicial) : ''}</div>
            </div>
        </div>
        <div class="summary-card-premium">
            <div class="card-icon">📈</div>
            <div class="card-content">
                <div class="card-label">Importe Final</div>
                <div class="card-value">${importeFinal !== null ? formatearMoneda(importeFinal) : '-'}</div>
                <div class="card-date">${fechaImporteFinal ? formatearFecha(fechaImporteFinal) : ''}</div>
            </div>
        </div>
        <div class="summary-card-premium">
            <div class="card-icon">💎</div>
            <div class="card-content">
                <div class="card-label">Beneficio Total</div>
                <div class="card-value ${claseBeneficio}">${beneficioTotal !== null ? formatearMoneda(beneficioTotal) : '-'}</div>
            </div>
        </div>
        <div class="summary-card-premium">
            <div class="card-icon">📊</div>
            <div class="card-content">
                <div class="card-label">Rentabilidad</div>
                <div class="card-value ${claseRentabilidad}">${rentabilidad !== null && isFinite(rentabilidad) ? formatearPorcentaje(rentabilidad) : (rentabilidad === Infinity ? '∞' : rentabilidad === -Infinity ? '-∞' : '-')}</div>
            </div>
        </div>
    `;
}

// Mostrar tabla resumen (solo 4 filas)
function mostrarTablaResumen(datosGenerales) {
    const thead = document.getElementById('theadGeneral');
    const tbody = document.getElementById('tbodyGeneral');
    const container = document.getElementById('tablaGeneralContainer');
    
    container.style.display = 'block';
    
    thead.innerHTML = `
        <tr>
            <th class="th-general th-fecha">Fecha</th>
            <th class="th-general th-imp-inicial">Importe Inicial</th>
            <th class="th-general th-imp-final">Importe Final</th>
            <th class="th-general th-benef-euro">Beneficio €</th>
            <th class="th-general th-benef-pct">Beneficio %</th>
            <th class="th-general th-benef-euro-acum">Beneficio € Acumulado</th>
            <th class="th-general th-benef-pct-acum">Beneficio % Acumulado</th>
        </tr>
    `;
    
    tbody.innerHTML = '';
    
    const nombresFilas = {
        3: 'Inversión Inicial',
        4: 'Importe Final',
        5: 'Beneficio Total',
        6: 'Rentabilidad'
    };
    
    datosGenerales.forEach((filaData, index) => {
        const tr = document.createElement('tr');
        tr.className = 'animate-slide-in';
        tr.style.animationDelay = `${index * 0.05}s`;
        
        // Fecha
        const tdFecha = document.createElement('td');
        if (filaData.fecha) {
            tdFecha.textContent = formatearFecha(filaData.fecha);
        } else {
            tdFecha.textContent = nombresFilas[filaData.fila] || `Fila ${filaData.fila}`;
            tdFecha.style.fontWeight = '600';
            tdFecha.style.color = 'var(--accent-gold)';
        }
        tdFecha.className = 'cell-locked';
        tr.appendChild(tdFecha);
        
        // Resto de columnas (mismo código que antes)
        agregarCeldasFilaGeneral(tr, filaData);
        
        tbody.appendChild(tr);
    });
}

// Mostrar tabla completa (todos los días)
function mostrarTablaCompleta(datosDiarios) {
    const thead = document.getElementById('theadGeneral');
    const tbody = document.getElementById('tbodyGeneral');
    const container = document.getElementById('tablaGeneralContainer');
    
    container.style.display = 'block';
    
    thead.innerHTML = `
        <tr>
            <th class="th-general th-fecha">Fecha</th>
            <th class="th-general th-imp-inicial">Importe Inicial</th>
            <th class="th-general th-imp-final">Importe Final</th>
            <th class="th-general th-benef-euro">Beneficio €</th>
            <th class="th-general th-benef-pct">Beneficio %</th>
            <th class="th-general th-benef-euro-acum">Beneficio € Acumulado</th>
            <th class="th-general th-benef-pct-acum">Beneficio % Acumulado</th>
        </tr>
    `;
    
    tbody.innerHTML = '';
    
    // Filtrar por fechas si hay filtros
    let datosFiltrados = datosDiarios;
    if (fechaDesdeFiltro || fechaHastaFiltro) {
        datosFiltrados = datosDiarios.filter(dato => {
            if (!dato.fecha) return false;
            const fechaDato = parsearFechaValor(dato.fecha);
            if (!fechaDato) return false;
            if (fechaDesdeFiltro && fechaDato < fechaDesdeFiltro) return false;
            if (fechaHastaFiltro && fechaDato > fechaHastaFiltro) return false;
            return true;
        });
    }
    
    if (datosFiltrados.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.textContent = 'No hay datos para el rango de fechas seleccionado';
        td.style.textAlign = 'center';
        td.style.padding = '40px';
        td.style.color = 'var(--text-tertiary)';
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        // NO forzar nada - solo mostrar lo que el usuario ha escrito
        datosFiltrados.forEach((filaData, index) => {
            const tr = document.createElement('tr');
            tr.className = 'animate-slide-in';
            tr.style.animationDelay = `${Math.min(index * 0.01, 2)}s`; // Limitar delay máximo

            const fechaFila = parsearFechaValor(filaData.fecha);
            if (fechaFila) {
                const d = fechaFila.getDay();
                if (d === 0 || d === 6) {
                    tr.classList.add('row-weekend');
                }
            }
            
            // Fecha
            const tdFecha = document.createElement('td');
            tdFecha.textContent = formatearFecha(filaData.fecha);
            tdFecha.className = 'cell-locked';
            tr.appendChild(tdFecha);
            
            // Resto de columnas - Respetar exactamente lo que dice el JSON (ya está correcto según Excel)
            agregarCeldasFilaGeneral(tr, filaData);
            
            tbody.appendChild(tr);
        });
        
        mostrarNotificacion(`${datosFiltrados.length} registros mostrados`, 'success');
    }
}

// Función auxiliar para agregar celdas
function agregarCeldasFilaGeneral(tr, filaData) {
    // Función auxiliar para crear celda editable o bloqueada
    function crearCeldaEditable(columna, valor, esPorcentaje = false, step = '0.01') {
        const td = document.createElement('td');
        // CRÍTICO: Bloquear si tiene fórmula O si está marcada como bloqueada
        // Respetar exactamente lo que dice el JSON (ya está correcto según Excel)
        const tieneFormula = filaData.formulas && filaData.formulas[columna] && filaData.formulas[columna].trim() !== '';
        const estaMarcadaBloqueada = filaData.bloqueadas && filaData.bloqueadas[columna] === true;
        const bloqueado = tieneFormula || estaMarcadaBloqueada;
        
        // IMPORTANTE: Tratar 0 como vacío si la casilla no tiene valor real
        // Un valor es "vacío" si es null, undefined, o 0 en casillas calculadas
        const esValorVacio = valor === null || valor === undefined || (valor === 0 && columna !== 'imp_final' && columna !== 'imp_inicial');
        
        if (bloqueado) {
            // BLOQUEADA (tiene fórmula)
            if (esValorVacio) {
                td.textContent = '-';
            } else if (esPorcentaje) {
                td.textContent = formatearPorcentaje(valor);
            } else {
                td.textContent = formatearMoneda(valor);
            }
            td.dataset.inspect = columna;
            td.dataset.context = 'general';
            td.dataset.columna = columna;
            td.dataset.fila = `${filaData.fila}`;
            if (columna === 'imp_final') {
                td.className = 'cell-locked right highlight-imp-final';
            } else if (columna === 'imp_inicial') {
                td.className = 'cell-locked right highlight-imp-inicial';
            } else {
                td.className = 'cell-locked right';
            }
        } else {
            // EDITABLE (no tiene fórmula) - SIEMPRE crear input aunque el valor sea null
            const input = document.createElement('input');
            input.type = 'text';
            input.inputMode = esPorcentaje ? 'decimal' : 'decimal';
            input.className = 'editable-cell formatted-number';
            // IMPORTANTE: Si el valor es 0, también mostrar vacío (el usuario borró la casilla)
            const mostrarVacio = valor === null || valor === undefined || valor === 0;
            input.value = mostrarVacio ? '' : formatearNumeroInput(valor);
            input.dataset.fila = filaData.fila;
            input.dataset.columna = columna;
            input.dataset.valorNumerico = mostrarVacio ? '' : valor;
            if (esPorcentaje) {
                input.dataset.esPorcentaje = 'true';
            }
            
            // NO formatear mientras escribe para evitar encallos
            // Solo formatear y actualizar al salir de la casilla
            input.addEventListener('blur', async (e) => {
                if (e.target.dataset.skipCommitOnce === '1') {
                    e.target.dataset.skipCommitOnce = '0';
                    return;
                }
                // Si no hubo edición real, no tocar nada (evita que TAB cambie valores)
                const prevValue = e.target.dataset.prevValue;
                const prevNum = e.target.dataset.prevValorNumerico;
                const curValue = e.target.value;
                const curNum = e.target.dataset.valorNumerico;
                if (prevValue !== undefined && curValue === prevValue && String(curNum ?? '') === String(prevNum ?? '')) {
                    e.target.dataset.overwritePending = '0';
                    return;
                }

                e.target.dataset.overwritePending = '0';
                // Formatear antes de actualizar
                formatearInputNumero(e.target);
                
                // CRÍTICO: Si el usuario borra el contenido (input vacío), establecer valor a null
                const inputVacio = e.target.value.trim() === '';
                let nuevoValor = null;
                
                if (!inputVacio) {
                    nuevoValor = e.target.dataset.valorNumerico !== '' ? parseFloat(e.target.dataset.valorNumerico) : null;
                    if (isNaN(nuevoValor)) nuevoValor = null;
                    if (esPorcentaje && nuevoValor !== null) {
                        nuevoValor = nuevoValor / 100; // Convertir de porcentaje a decimal
                    }
                }
                
                console.log(`🗑️ Borrado detectado en ${columna} fila ${filaData.fila}: inputVacio=${inputVacio}, nuevoValor=${nuevoValor}`);
                
                // MARCAR que el usuario borró este campo para evitar restauración automática
                if (columna === 'imp_final') {
                    if (inputVacio) {
                        filaData._userDeletedImpFinal = true;
                        filaData._impFinalSource = 'user_cleared';
                        console.log(`🔒 Marcando fila ${filaData.fila} como imp_final borrado por usuario`);
                    } else {
                        filaData._userDeletedImpFinal = false;
                        filaData._impFinalSource = 'user';
                    }
                }
                
                // Actualizar el dato y recalcular fórmulas automáticamente
                await actualizarDatoGeneral(filaData.fila, columna, nuevoValor);
                e.target.classList.add('cell-modified');
            });
            prepararInputEdicion(input);
            td.appendChild(input);
            if (columna === 'imp_final') {
                td.className = 'cell-editable right highlight-imp-final';
            } else if (columna === 'imp_inicial') {
                td.className = 'cell-editable right highlight-imp-inicial';
            } else {
                td.className = 'cell-editable right';
            }
        }
        return td;
    }
    
    // Importe Inicial (con tooltip detallado)
    // CRÍTICO: No mostrar imp_inicial después de la última fecha con imp_final escrito
    const hoja = datosEditados?.hojas?.[hojaActual];
    const ultimaFilaImpFinal = hoja ? obtenerUltimaFilaImpFinalManual(hoja) : 0;
    const mostrarImpInicial = (ultimaFilaImpFinal === 0 || filaData.fila <= ultimaFilaImpFinal);
    const impInicialVisible = mostrarImpInicial ? filaData.imp_inicial : null;
    const tdImpInicial = crearCeldaEditable('imp_inicial', impInicialVisible);
    
    // Añadir tooltip con desglose del importe inicial
    tdImpInicial.addEventListener('mouseenter', function(e) {
        const fila = filaData.fila;
        const hoja = datosEditados?.hojas?.[hojaActual];
        if (!hoja) return;
        
        // Obtener saldo anterior REAL (último imp_final manual anterior o imp_final mes anterior)
        const saldoAnterior = obtenerSaldoAnteriorImpFinalManualGeneral(hoja, fila);
        
        // Obtener incrementos y decrementos de este día
        const clientes = hoja.clientes || [];
        const incrementos = [];
        const decrementos = [];
        
        clientes.forEach((cliente, idx) => {
            const datoCliente = cliente.datos_diarios?.find(d => d.fila === fila);
            if (datoCliente) {
                const nombre = cliente?.datos?.['NOMBRE']?.valor || '';
                const apellidos = cliente?.datos?.['APELLIDOS']?.valor || '';
                const nombreCompleto = (nombre || apellidos) ? `${nombre} ${apellidos}`.trim() : `Cliente ${idx + 1}`;
                
                if (typeof datoCliente.incremento === 'number' && datoCliente.incremento !== 0) {
                    incrementos.push({ nombre: nombreCompleto, valor: datoCliente.incremento });
                }
                if (typeof datoCliente.decremento === 'number' && datoCliente.decremento !== 0) {
                    decrementos.push({ nombre: nombreCompleto, valor: datoCliente.decremento });
                }
            }
        });
        
        const totalIncrementos = incrementos.reduce((sum, inc) => sum + inc.valor, 0);
        const totalDecrementos = decrementos.reduce((sum, dec) => sum + dec.valor, 0);
        const total = saldoAnterior + totalIncrementos - totalDecrementos;
        
        // Crear contenido del tooltip
        let tooltipHTML = '<div style="text-align: left; min-width: 250px;">';
        tooltipHTML += `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Desglose Importe Inicial</div>`;
        tooltipHTML += `<div style="margin-bottom: 6px;">Saldo día anterior: <span style="float: right; font-weight: 600;">${formatearMoneda(saldoAnterior)}</span></div>`;
        
        if (incrementos.length > 0) {
            tooltipHTML += `<div style="margin-top: 8px; font-weight: bold; color: #10b981;">Incrementos:</div>`;
            incrementos.forEach(inc => {
                tooltipHTML += `<div style="margin-left: 10px; font-size: 0.9em;">• ${inc.nombre}: <span style="float: right;">${formatearMoneda(inc.valor)}</span></div>`;
            });
            tooltipHTML += `<div style="margin-left: 10px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #10b981;">Total: <span style="float: right; font-weight: 600;">${formatearMoneda(totalIncrementos)}</span></div>`;
        }
        
        if (decrementos.length > 0) {
            tooltipHTML += `<div style="margin-top: 8px; font-weight: bold; color: #ef4444;">Decrementos:</div>`;
            decrementos.forEach(dec => {
                tooltipHTML += `<div style="margin-left: 10px; font-size: 0.9em;">• ${dec.nombre}: <span style="float: right;">${formatearMoneda(dec.valor)}</span></div>`;
            });
            tooltipHTML += `<div style="margin-left: 10px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #ef4444;">Total: <span style="float: right; font-weight: 600;">${formatearMoneda(totalDecrementos)}</span></div>`;
        }
        
        tooltipHTML += `<div style="margin-top: 12px; padding-top: 8px; border-top: 2px solid #333; font-weight: bold; font-size: 1.1em;">Total: <span style="float: right;">${formatearMoneda(total)}</span></div>`;
        tooltipHTML += '</div>';
        
        // Crear y mostrar tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.innerHTML = tooltipHTML;
        tooltip.style.cssText = `
            position: fixed;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 13px;
            max-width: 400px;
            pointer-events: none;
        `;
        
        document.body.appendChild(tooltip);
        
        // Usar position fixed para mejor control
        tooltip.style.position = 'fixed';
        
        // Obtener posición de la celda en viewport (sin scroll)
        const rect = e.target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Calcular espacio disponible
        const espacioAbajo = window.innerHeight - rect.bottom;
        const espacioArriba = rect.top;
        
        let left = rect.left;
        let top;
        
        // PRIMERO intentar arriba si estamos en la mitad inferior de la pantalla
        // o si no hay espacio abajo
        if (rect.top > window.innerHeight / 2 || espacioAbajo < tooltipRect.height + 20) {
            // Mostrar ARRIBA
            top = rect.top - tooltipRect.height - 10;
            // Si se sale por arriba, mostrar abajo
            if (top < 10) {
                top = rect.bottom + 10;
            }
        } else {
            // Mostrar abajo
            top = rect.bottom + 10;
        }
        
        // Ajustar horizontal para que no se salga
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (left < 10) {
            left = 10;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        
        // Guardar referencia para eliminar después
        tdImpInicial._tooltip = tooltip;
    });
    
    tdImpInicial.addEventListener('mouseleave', function() {
        if (tdImpInicial._tooltip) {
            tdImpInicial._tooltip.remove();
            tdImpInicial._tooltip = null;
        }
    });
    
    tr.appendChild(tdImpInicial);
    
    // Importe Final - Solo mostrar si es manual (escrito por el usuario)
    const esManual = esCeldaManualGeneral(filaData, 'imp_final');
    const impFinalVisible = esManual ? filaData.imp_final : null;
    // Normalizar origen del imp_final para el tooltip
    if (impFinalVisible === null || impFinalVisible === undefined) {
        filaData._impFinalSource = 'empty';
    } else {
        filaData._impFinalSource = 'user';
    }
    const tdImpFinal = crearCeldaEditable('imp_final', impFinalVisible);
    
    // Tooltip para imp_final con origen del valor
    let impFinalTooltipTimeout = null;
    tdImpFinal.addEventListener('mouseenter', function(e) {
        if (impFinalTooltipTimeout) clearTimeout(impFinalTooltipTimeout);
        impFinalTooltipTimeout = setTimeout(() => {
            const tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            const source = filaData._impFinalSource || (typeof filaData.imp_final === 'number' ? 'user' : 'empty');
            let sourceText = 'Origen: desconocido';
            if (source === 'user') sourceText = 'Origen: escrito por el usuario';
            if (source === 'user_cleared') sourceText = 'Origen: borrado por el usuario';
            if (source === 'empty') sourceText = 'Origen: vacío (sin dato)';
            tooltip.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 6px;">Importe Final</div>
                <div>${sourceText}</div>
            `;
            tooltip.style.cssText = `
                position: fixed;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 10px 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-size: 12px;
                max-width: 320px;
                pointer-events: none;
            `;
            document.body.appendChild(tooltip);
            const rect = e.target.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            let left = rect.left;
            let top = rect.top - tooltipRect.height - 10;
            if (top < 10) {
                top = rect.bottom + 10;
            }
            if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
            }
            if (left < 10) left = 10;
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
            tdImpFinal._tooltip = tooltip;
        }, 1200);
    });
    tdImpFinal.addEventListener('mouseleave', function() {
        if (impFinalTooltipTimeout) {
            clearTimeout(impFinalTooltipTimeout);
            impFinalTooltipTimeout = null;
        }
        if (tdImpFinal._tooltip) {
            tdImpFinal._tooltip.remove();
            tdImpFinal._tooltip = null;
        }
    });
    tr.appendChild(tdImpFinal);
    
    // Beneficio € (puede ser texto o número)
    const tdBenefEuro = document.createElement('td');
    if (typeof filaData.benef_euro === 'string') {
        tdBenefEuro.textContent = filaData.benef_euro;
        tdBenefEuro.className = 'cell-locked';
        tdBenefEuro.style.fontWeight = '600';
    } else {
        // CRÍTICO: Bloquear si tiene fórmula O si está marcada como bloqueada
        const tieneFormula = filaData.formulas && filaData.formulas.benef_euro && filaData.formulas.benef_euro.trim() !== '';
        const estaMarcadaBloqueada = filaData.bloqueadas && filaData.bloqueadas.benef_euro === true;
        const bloqueado = tieneFormula || estaMarcadaBloqueada;
        
        // Debug: verificar si debería estar bloqueada
        if (tieneFormula && !estaMarcadaBloqueada) {
            console.warn(`⚠️ Fila ${filaData.fila}, benef_euro: tiene fórmula pero NO está marcada como bloqueada en JSON`);
        }
        if (bloqueado) {
            tdBenefEuro.textContent = filaData.benef_euro !== null && filaData.benef_euro !== undefined ? formatearMoneda(filaData.benef_euro) : '-';
            tdBenefEuro.className = 'cell-locked right';
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.inputMode = 'decimal';
            input.className = 'editable-cell formatted-number';
            input.value = filaData.benef_euro !== null && filaData.benef_euro !== undefined ? formatearNumeroInput(filaData.benef_euro) : '';
            input.dataset.fila = filaData.fila;
            input.dataset.columna = 'benef_euro';
            input.dataset.valorNumerico = filaData.benef_euro !== null && filaData.benef_euro !== undefined ? filaData.benef_euro : '';
            
            // NO formatear mientras escribe para evitar encallos
            // Solo formatear y actualizar al salir de la casilla
            input.addEventListener('blur', async (e) => {
                if (e.target.dataset.skipCommitOnce === '1') {
                    e.target.dataset.skipCommitOnce = '0';
                    return;
                }
                e.target.dataset.overwritePending = '0';
                // Formatear antes de actualizar
                formatearInputNumero(e.target);
                
                const nuevoValor = e.target.dataset.valorNumerico !== '' ? parseFloat(e.target.dataset.valorNumerico) : null;
                if (isNaN(nuevoValor)) nuevoValor = null;
                await actualizarDatoGeneral(filaData.fila, 'benef_euro', nuevoValor);
                e.target.classList.add('cell-modified');
            });
            prepararInputEdicion(input);
            tdBenefEuro.appendChild(input);
            tdBenefEuro.className = 'cell-editable right';
        }
    }
    tr.appendChild(tdBenefEuro);
    
    // Beneficio %
    tr.appendChild(crearCeldaEditable('benef_porcentaje', filaData.benef_porcentaje, true, '0.0001'));
    
    // Beneficio € Acumulado
    tr.appendChild(crearCeldaEditable('benef_euro_acum', filaData.benef_euro_acum));
    
    // Beneficio % Acumulado
    tr.appendChild(crearCeldaEditable('benef_porcentaje_acum', filaData.benef_porcentaje_acum, true, '0.0001'));
}

// Formatear valor general
function formatearValorGeneral(valor) {
    if (valor === null || valor === undefined) return '-';
    
    if (typeof valor === 'number') {
        if (valor > 1000) {
            return formatearMoneda(valor);
        } else if (valor < 1 && valor > 0) {
            return formatearPorcentaje(valor);
        } else {
            return valor.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 4});
        }
    }
    
    // Si es texto como "TOTAL € INVERSION", mantenerlo
    const valorStr = valor.toString();
    if (valorStr.includes('TOTAL') || valorStr.includes('INVERSION') || valorStr.includes('BENEFICIO')) {
        return valorStr;
    }
    
    return valorStr;
}

// Recálculo síncrono de imp_inicial para Vista General
// Se ejecuta SIEMPRE antes de mostrar la vista para asegurar valores correctos
function recalcularImpInicialSync(hoja) {
    if (!hoja) return;
    const datosGen = hoja.datos_diarios_generales || [];
    
    // Calcular límite: última fila con imp_final manual
    const ultimaFilaImpFinalManual = obtenerUltimaFilaImpFinalManual(hoja);
    let ultimaFilaConIncremento = 0;
    (hoja.clientes || []).forEach(c => {
        (c.datos_diarios || []).forEach(d => {
            if ((typeof d.incremento === 'number' && d.incremento > 0) || 
                (typeof d.decremento === 'number' && d.decremento > 0)) {
                ultimaFilaConIncremento = Math.max(ultimaFilaConIncremento, d.fila);
            }
        });
    });
    const maxFilaConFecha = datosGen.reduce((max, d) => {
        if (!d || typeof d.fila !== 'number') return max;
        if (d.fila < 15 || d.fila > 1120) return max;
        if (!d.fecha || d.fecha === 'FECHA') return max;
        return Math.max(max, d.fila);
    }, 0);
    const limiteCalculo = (hojaActual === 'Diario WIND' && ultimaFilaImpFinalManual > 0)
        ? ultimaFilaImpFinalManual
        : Math.max(
            (ultimaFilaImpFinalManual > 0 ? (ultimaFilaImpFinalManual + 1) : 0),
            ultimaFilaConIncremento,
            maxFilaConFecha
        );
    if (limiteCalculo === 0) return;
    
    // Recalcular imp_inicial para cada fila hasta el límite
    const datosGenOrd = datosGen.filter(d => d.fila >= 15 && d.fila <= limiteCalculo).sort((a, b) => a.fila - b.fila);
    
    console.log(`📊 recalcularImpInicialSync: procesando ${datosGenOrd.length} filas hasta límite ${limiteCalculo}`);
    
    // ARRASTRE ENTRE MESES: usar imp_final del mes anterior como base
    const impFinalMesAnterior = hoja._impFinalMesAnterior || 0;
    let ultimoImpFinal = impFinalMesAnterior;
    
    if (impFinalMesAnterior > 0) {
        console.log(`📅 Usando imp_final del mes anterior como base: ${impFinalMesAnterior}`);
    }
    
    for (const filaData of datosGenOrd) {
        const fila = filaData.fila;
        const fa = calcularFA(fila, hoja);
        
        // CRÍTICO: Solo calcular imp_inicial hasta la última fila con imp_final
        if (hojaActual === 'Diario WIND' && ultimaFilaImpFinalManual > 0 && fila > ultimaFilaImpFinalManual) {
            // Limpiar imp_inicial después de la última fecha con imp_final
            filaData.imp_inicial = null;
            continue;
        }
        
        if (fila === 15) {
            // Primera fila: imp_inicial = imp_final_mes_anterior + FA (o solo FA si no hay mes anterior)
            const nuevoImpInicial = impFinalMesAnterior + fa;
            if (nuevoImpInicial > 0 || fa > 0 || filaData.imp_inicial !== null) {
                filaData.imp_inicial = nuevoImpInicial > 0 ? nuevoImpInicial : fa;
            }
            // CRÍTICO: Solo avanzar el saldo anterior con imp_final manual (editable)
            if (esCeldaManualGeneral(filaData, 'imp_final') && typeof filaData.imp_final === 'number') {
                ultimoImpFinal = filaData.imp_final;
            }
        } else {
            // Filas siguientes: imp_inicial = imp_final(anterior) + FA
            const nuevoImpInicial = ultimoImpFinal + fa;
            if (nuevoImpInicial !== 0 || filaData.imp_inicial !== null) {
                filaData.imp_inicial = nuevoImpInicial;
            }
            
            // NO copiar imp_final automáticamente - solo usar lo que el usuario escribe
            // CRÍTICO: Solo usar imp_final manual (editable) como nuevo saldo anterior
            if (esCeldaManualGeneral(filaData, 'imp_final') && typeof filaData.imp_final === 'number') {
                ultimoImpFinal = filaData.imp_final;
            }
        }
    }

    // CRÍTICO: Limpiar imp_inicial de TODAS las filas después de la última con imp_final
    if (hojaActual === 'Diario WIND' && ultimaFilaImpFinalManual > 0) {
        for (const d of datosGen) {
            if (d && d.fila > ultimaFilaImpFinalManual) {
                d.imp_inicial = null;
            }
        }
    }
    
    // Limpiar imp_inicial FUTURO para que no aparezca relleno cuando aún no toca
    for (const d of datosGen) {
        if (!d || typeof d.fila !== 'number') continue;
        if (d.fila < 15 || d.fila > 1120) continue;
        if (d.fila <= limiteCalculo) continue;
        if (d.imp_inicial !== null && d.imp_inicial !== undefined) {
            d.imp_inicial = null;
            actualizarCeldaEnUI(d.fila, 'imp_inicial', null);
        }
    }
}

// Calcular FA (columna FA) para una fila específica
// FA = suma de (incrementos - decrementos) de TODOS los clientes para el DÍA de esa fila
// IMPORTANTE: Busca en TODAS las filas del día, no solo en la fila específica
function calcularFA(filaNum, hoja) {
    if (!hoja || !hoja.clientes) return 0;
    
    // Obtener la fecha del día correspondiente a esta fila
    const datosGen = hoja.datos_diarios_generales || [];
    const filaGeneral = datosGen.find(d => d.fila === filaNum);
    const fechaDia = filaGeneral?.fecha ? (normalizarFechaKey(filaGeneral.fecha) || String(filaGeneral.fecha).split(' ')[0]) : null;
    
    let sumaFA = 0;
    
    // Sumar incrementos - decrementos de todos los clientes para este DÍA
    hoja.clientes.forEach((cliente, idx) => {
        const datosCliente = cliente.datos_diarios || [];
        
        // Buscar TODAS las filas del cliente que correspondan a este día
        let incCliente = 0;
        let decCliente = 0;
        
        datosCliente.forEach(d => {
            // Si tenemos fecha del día, comparar por fecha; si no, comparar por fila
            let esDelDia = false;
            if (fechaDia && d.fecha) {
                const fechaFila = normalizarFechaKey(d.fecha) || String(d.fecha).split(' ')[0];
                esDelDia = fechaFila === fechaDia;
            } else {
                esDelDia = d.fila === filaNum;
            }
            
            if (esDelDia) {
                const inc = typeof d.incremento === 'number' ? d.incremento : 0;
                const dec = typeof d.decremento === 'number' ? d.decremento : 0;
                // Tomar el máximo (por si hay duplicados en diferentes filas del día)
                incCliente = Math.max(incCliente, inc);
                decCliente = Math.max(decCliente, dec);
            }
        });
        
        const contribucion = incCliente - decCliente;
        sumaFA += contribucion;
    });
    
    return sumaFA;
}

// Calcular EY o EZ (columnas EY/EZ) para una fila específica
// EY = suma de saldos_diario de todos los clientes para esa fila
// EZ = suma de decrementos de todos los clientes para esa fila
function calcularEYoEZ(filaNum, colLetra, hoja) {
    if (!hoja || !hoja.clientes) return 0;
    
    let suma = 0;
    
    hoja.clientes.forEach(cliente => {
        const datoCliente = cliente.datos_diarios?.find(d => d.fila === filaNum);
        if (datoCliente) {
            if (colLetra === 'EY') {
                // EY = suma de saldos_diario
                const saldo = typeof datoCliente.saldo_diario === 'number' ? datoCliente.saldo_diario : 0;
                suma += saldo || 0;
            } else if (colLetra === 'EZ') {
                // EZ = suma de decrementos
                const decremento = typeof datoCliente.decremento === 'number' ? datoCliente.decremento : 0;
                suma += decremento || 0;
            }
        }
    });
    
    return suma;
}

// Función auxiliar para obtener valor de una celda por referencia (ej: F17, E15)
// También maneja referencias a FA (columna FA = suma de incrementos/decrementos de clientes)
function obtenerValorCelda(referencia, hoja, filaContexto = null) {
    // Convertir referencia Excel a fila y columna (ej: F17 -> fila 17, columna 6)
    const match = referencia.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    
    const colLetra = match[1];
    const filaNum = parseInt(match[2]);
    
    // Convertir letra de columna a número (A=1, B=2, ..., E=5, F=6, G=7, H=8, I=9, J=10)
    let colNum = 0;
    for (let i = 0; i < colLetra.length; i++) {
        colNum = colNum * 26 + (colLetra.charCodeAt(i) - 64);
    }
    
    // Mapear columnas a campos
    const columnaMap = {
        5: 'imp_inicial',   // E
        6: 'imp_final',     // F
        7: 'benef_euro',    // G
        8: 'benef_porcentaje', // H
        9: 'benef_euro_acum',  // I
        10: 'benef_porcentaje_acum' // J
    };
    
    // Si es columna FA, calcular dinámicamente desde los clientes
    // FA = suma de (incrementos - decrementos) de todos los clientes para esa fila
    if (colLetra === 'FA') {
        const hojaEditada = datosEditados?.hojas?.[hojaActual] || hoja;
        
        // Si tenemos el contexto de la fila desde la que se evalúa la fórmula
        // usar ese contexto para buscar incrementos en la misma fila del cliente
        if (filaContexto !== null) {
            // Buscar incrementos en la fila del cliente correspondiente al día (misma fila que filaContexto)
            // Debug para días importantes (días 1-2)
            if (filaContexto >= 15 && filaContexto <= 20) {
                console.log(`🔍 FA${filaNum} evaluado desde fila ${filaContexto} → buscando incrementos en fila ${filaContexto} del cliente`);
            }
            const resultado = calcularFA(filaContexto, hojaEditada);
            if (filaContexto >= 15 && filaContexto <= 20) {
                console.log(`  ✅ FA${filaNum} = ${resultado} (suma de incrementos-decrementos en fila ${filaContexto} del cliente)`);
            }
            return resultado;
        } else {
            // Si no hay contexto, usar la fila de FA menos 1 (comportamiento por defecto para compatibilidad)
            // Pero esto no debería ocurrir en el flujo normal
            console.warn(`⚠️ FA${filaNum} evaluado sin contexto de fila, usando fila ${filaNum - 1}`);
            return calcularFA(filaNum - 1, hojaEditada);
        }
    }
    
    // Si es columna AEO (columna 157 = FA), calcular dinámicamente desde los clientes
    // AEO es equivalente a FA, es la suma de incrementos-decrementos
    // IMPORTANTE: Cuando la fórmula es imp_inicial = AEO16 (fila 15 general), AEO16 debería buscar incrementos
    // de la fila 15 del cliente (donde está el incremento del día 1), no de la fila 16.
    // REGLA: Cuando se evalúa AEO(N) desde la fila general del día D, buscar incrementos en la fila del cliente del día D (misma fila).
    // - Día 1: fila 15 general evalúa AEO16 → buscar incrementos en fila 15 del cliente
    // - Día 2: fila 18 general evalúa AEO19 → buscar incrementos en fila 18 del cliente
    // La relación es: AEO(N) cuando se evalúa desde filaContexto busca en filaContexto del cliente
    if (colLetra === 'AEO') {
        const hojaEditada = datosEditados?.hojas?.[hojaActual] || hoja;
        
        // Si tenemos el contexto de la fila desde la que se evalúa la fórmula
        // usar ese contexto para buscar incrementos en la misma fila del cliente
        if (filaContexto !== null) {
            // Buscar incrementos en la fila del cliente correspondiente al día (misma fila que filaContexto)
            // Debug para días importantes (días 1-2)
            if (filaContexto >= 15 && filaContexto <= 20) {
                console.log(`🔍 AEO${filaNum} evaluado desde fila ${filaContexto} → buscando incrementos en fila ${filaContexto} del cliente`);
            }
            const resultado = calcularFA(filaContexto, hojaEditada);
            if (filaContexto >= 15 && filaContexto <= 20) {
                console.log(`  ✅ AEO${filaNum} = ${resultado} (suma de incrementos-decrementos en fila ${filaContexto} del cliente)`);
            }
            return resultado;
        } else {
            // Si no hay contexto, usar la fila de AEO menos 1 (comportamiento por defecto para compatibilidad)
            // Pero esto no debería ocurrir en el flujo normal
            console.warn(`⚠️ AEO${filaNum} evaluado sin contexto de fila, usando fila ${filaNum - 1}`);
            return calcularFA(filaNum - 1, hojaEditada);
        }
    }
    
    // Si es columna EY o EZ, calcular desde los clientes
    // EY = suma de saldos_diario de todos los clientes para esa fila
    // EZ = suma de decrementos de todos los clientes para esa fila (o algo similar)
    if (colLetra === 'EY' || colLetra === 'EZ') {
        const hojaEditada = datosEditados?.hojas?.[hojaActual] || hoja;
        return calcularEYoEZ(filaNum, colLetra, hojaEditada);
    }
    
    const campo = columnaMap[colNum];
    if (!campo) return null;
    
    // Usar datosEditados SIEMPRE si está disponible, incluso si se pasa hoja como parámetro
    // Esto asegura que siempre obtengamos los valores más actualizados
    const hojaEditada = datosEditados?.hojas?.[hojaActual] || hoja;
    let filaData = null;
    
    if (hojaEditada) {
        // Buscar en datos generales primero
        filaData = hojaEditada.datos_generales?.find(f => f.fila === filaNum);
        if (!filaData) {
            filaData = hojaEditada.datos_diarios_generales?.find(f => f.fila === filaNum);
        }
    }
    
    // Fallback a hoja original solo si datosEditados no está disponible
    if (!filaData && hoja && hoja !== hojaEditada) {
        filaData = hoja?.datos_generales?.find(f => f.fila === filaNum);
        if (!filaData) {
            filaData = hoja?.datos_diarios_generales?.find(f => f.fila === filaNum);
        }
    }
    
    if (filaData && filaData[campo] !== undefined && filaData[campo] !== null) {
        return filaData[campo];
    }
    
    // Si el valor es 0, también devolverlo (no null)
    if (filaData && filaData[campo] === 0) {
        return 0;
    }
    
    return null;
}

// Convertir IF de Excel a ternario de JS (función global para uso en evaluarFormula y evaluarFormulaCliente)
function convertirIFaTernario(expresion) {
    const upper = expresion.toUpperCase();
    const idx = upper.indexOf('IF(');
    if (idx === -1) return expresion;
    
    // Buscar el cierre del IF balanceando paréntesis
    const openParen = idx + 2; // posición del '(' en "IF("
    if (expresion[openParen] !== '(') return expresion;
    
    let nivel = 1; // ya estamos dentro de IF(
    let fin = -1;
    for (let i = openParen + 1; i < expresion.length; i++) {
        const ch = expresion[i];
        if (ch === '(') nivel++;
        if (ch === ')') nivel--;
        if (nivel === 0) { fin = i; break; }
    }
    if (fin === -1) return expresion; // no balanceado
    
    const before = expresion.slice(0, idx);
    const dentro = expresion.slice(openParen + 1, fin); // contenido dentro de IF(...)
    const after = expresion.slice(fin + 1);
    
    // Separar en cond, true, false por comas de nivel 0
    let partes = [];
    let actual = '';
    nivel = 0;
    for (let i = 0; i < dentro.length; i++) {
        const ch = dentro[i];
        if (ch === '(') nivel++;
        if (ch === ')') nivel--;
        if (ch === ',' && nivel === 0) {
            partes.push(actual);
            actual = '';
        } else {
            actual += ch;
        }
    }
    partes.push(actual);
    if (partes.length < 3) return expresion; // formato inesperado
    
    const cond = convertirIFaTernario(partes[0]);
    const valT = convertirIFaTernario(partes[1]);
    const valF = convertirIFaTernario(partes.slice(2).join(',')); // por si hay comas adicionales
    
    const ternario = `((${cond})?(${valT}):(${valF}))`;
    return convertirIFaTernario(before + ternario + after);
}

// Evaluar fórmula de Excel (versión mejorada y robusta)
function evaluarFormula(formula, filaIdx, hoja) {
    if (!formula || !formula.startsWith('=')) {
        return null;
    }
    
    // Remover el =
    let expr = formula.substring(1);
    
    // Primero, reemplazar referencias de celdas con valores
    const referenciaRegex = /([A-Z]+\d+)/g;
    const referenciasUnicas = new Set();
    let match;
    
    // Encontrar todas las referencias únicas
    while ((match = referenciaRegex.exec(expr)) !== null) {
        referenciasUnicas.add(match[0]);
    }
    
    // Reemplazar cada referencia con su valor (de más larga a más corta para evitar conflictos)
    const referenciasOrdenadas = Array.from(referenciasUnicas).sort((a, b) => b.length - a.length);
    referenciasOrdenadas.forEach(ref => {
        const valor = obtenerValorCelda(ref, hoja, filaIdx);
        // IMPORTANTE: Si el valor es null o undefined, usar 0 para las fórmulas
        // porque en Excel, una celda vacía se trata como 0 en operaciones matemáticas
        const valorStr = (valor !== null && valor !== undefined) ? valor.toString() : '0';
        // Reemplazar todas las ocurrencias de esta referencia
        expr = expr.split(ref).join(valorStr);
    });
    
    // Convertir operadores de Excel a JavaScript
    expr = expr.replace(/<>/g, '!=');
    expr = expr.replace(/(?<![=!<>])=(?![=<>])/g, '==');
    
    // Manejar funciones IF de manera recursiva (desde las más internas hacia afuera)
    function evaluarIF(expresion) {
        let resultado = expresion;
        let cambio = true;
        let iteraciones = 0;
        const maxIteraciones = 10; // Evitar bucles infinitos
        
        while (cambio && iteraciones < maxIteraciones) {
            cambio = false;
            iteraciones++;
            
            // Buscar IF más interno (sin IF dentro)
            const ifRegex = /IF\s*\(([^,()]+(?:\([^)]*\)[^,()]*)*),([^,()]+(?:\([^)]*\)[^,()]*)*),([^)]+)\)/;
            resultado = resultado.replace(ifRegex, (match, condicion, valorVerdadero, valorFalso) => {
                cambio = true;
                try {
                    // Evaluar condición
                    const condEval = eval(condicion);
                    return condEval ? valorVerdadero.trim() : valorFalso.trim();
                } catch (e) {
                    console.warn('Error al evaluar condición IF:', condicion, e);
                    return valorFalso.trim();
                }
            });
        }
        return resultado;
    }
    
    expr = evaluarIF(expr);
    
    // Manejar funciones SUM y SUBTOTAL antes de evaluar
    function evaluarSUM(expresion) {
        const sumRegex = /SUM\(([^)]+)\)/g;
        return expresion.replace(sumRegex, (match, rango) => {
            try {
                // Evaluar el rango (ej: G17:G1120)
                const valores = evaluarRango(rango, hoja);
                const suma = valores.reduce((acc, val) => acc + (val || 0), 0);
                return suma.toString();
            } catch (e) {
                console.warn('Error al evaluar SUM:', rango, e);
                return '0';
            }
        });
    }
    
    function evaluarSUBTOTAL(expresion) {
        const subtotalRegex = /SUBTOTAL\s*\(\s*(\d+)\s*,\s*([^)]+)\s*\)/g;
        return expresion.replace(subtotalRegex, (match, funcionNum, rango) => {
            try {
                // SUBTOTAL(9, ...) es SUM
                if (funcionNum === '9') {
                    const valores = evaluarRango(rango, hoja);
                    const suma = valores.reduce((acc, val) => acc + (val || 0), 0);
                    return suma.toString();
                }
                // Otros tipos de SUBTOTAL no implementados aún
                console.warn('SUBTOTAL función', funcionNum, 'no implementada');
                return '0';
            } catch (e) {
                console.warn('Error al evaluar SUBTOTAL:', rango, e);
                return '0';
            }
        });
    }
    
    // Evaluar SUM y SUBTOTAL
    expr = evaluarSUM(expr);
    expr = evaluarSUBTOTAL(expr);
    
    // Convertir IF de Excel a ternario de JS
    expr = convertirIFaTernario(expr);
    
    // Evaluar la expresión final
    try {
        const resultado = eval(expr);
        if (typeof resultado === 'number' && !isNaN(resultado) && isFinite(resultado)) {
            return resultado;
        }
        return null;
    } catch (error) {
        console.warn('Error al evaluar fórmula:', formula, 'Expresión procesada:', expr, error);
        return null;
    }
}

// Evaluar un rango de celdas (ej: G17:G1120 o N15:AEL15 para incrementos de clientes)
function evaluarRango(rango, hoja) {
    // Limpiar espacios
    rango = rango.trim();
    
    // Si el rango es inválido (como "0:0" o vacío), devolver 0
    if (!rango || rango === '0:0' || /^\d+:\d+$/.test(rango)) {
        return [0];
    }
    
    const match = rango.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) {
        // Si no es un rango válido, intentar evaluar como número
        const num = parseFloat(rango);
        if (!isNaN(num)) {
            return [num];
        }
        return [0];
    }
    
    const colInicio = match[1];
    const filaInicio = parseInt(match[2]);
    const colFin = match[3];
    const filaFin = parseInt(match[4]);
    
    // Convertir letras de columna a número
    function columnaANumero(letra) {
        let num = 0;
        for (let i = 0; i < letra.length; i++) {
            num = num * 26 + (letra.charCodeAt(i) - 64);
        }
        return num;
    }
    
    const colNumInicio = columnaANumero(colInicio);
    const colNumFin = columnaANumero(colFin);
    
    // IMPORTANTE: Si es un rango horizontal de una sola fila (ej: N15:AEL15)
    // y las columnas están en el rango de clientes (>=14 que es N), 
    // sumar incrementos o decrementos de todos los clientes para esa fila
    if (filaInicio === filaFin && colNumInicio >= 14) {
        const fila = filaInicio;
        const hojaEditada = datosEditados?.hojas?.[hojaActual] || hoja;
        
        // Determinar si es incrementos (columnas pares desde N=14) o decrementos (columnas impares desde O=15)
        // N=14 (incremento cliente 1), O=15 (decremento cliente 1), P=16 (base cliente 1)...
        // Cada cliente ocupa 8 columnas: incremento, decremento, base, saldo, benef, benef%, acum, acum%
        // Cliente 1: N(14), O(15), P(16), Q(17), R(18), S(19), T(20), U(21)
        // Cliente 2: V(22), W(23), X(24), Y(25), Z(26), AA(27), AB(28), AC(29)
        
        // Si colInicio es N (14) y colFin es AEL (814 aprox), sumar todos los incrementos
        // Si colInicio es O (15) y colFin es AEM (815 aprox), sumar todos los decrementos
        const esIncrementos = (colNumInicio % 8 === 6); // N=14: 14%8=6, V=22: 22%8=6
        const esDecrementos = (colNumInicio % 8 === 7); // O=15: 15%8=7, W=23: 23%8=7
        
        let suma = 0;
        if (hojaEditada && hojaEditada.clientes) {
            hojaEditada.clientes.forEach((cliente, idx) => {
                const datoCliente = cliente.datos_diarios?.find(d => d.fila === fila);
                if (datoCliente) {
                    if (esIncrementos || colInicio === 'N') {
                        const inc = typeof datoCliente.incremento === 'number' ? datoCliente.incremento : 0;
                        suma += inc;
                    } else if (esDecrementos || colInicio === 'O') {
                        const dec = typeof datoCliente.decremento === 'number' ? datoCliente.decremento : 0;
                        suma += dec;
                    }
                }
            });
        }
        
        console.log(`📊 evaluarRango ${rango}: suma=${suma} (${esIncrementos ? 'incrementos' : esDecrementos ? 'decrementos' : 'desconocido'})`);
        return [suma];
    }
    
    // Si es columna EY o EZ, calcular desde los clientes
    if (colInicio === 'EY' || colInicio === 'EZ') {
        const valores = [];
        for (let fila = filaInicio; fila <= filaFin; fila++) {
            const valor = calcularEYoEZ(fila, colInicio, hoja);
            valores.push(valor || 0);
        }
        return valores;
    }
    
    // Mapear columnas a campos
    const columnaMap = {
        5: 'imp_inicial',   7: 'benef_euro',    9: 'benef_euro_acum',
        6: 'imp_final',     8: 'benef_porcentaje', 10: 'benef_porcentaje_acum'
    };
    
    const campo = columnaMap[colNumInicio];
    if (!campo) {
        console.warn('Columna', colInicio, 'no mapeada para rango', rango);
        return [0];
    }
    
    const valores = [];
    const datosDiarios = hoja.datos_diarios_generales || [];
    
    for (let fila = filaInicio; fila <= filaFin; fila++) {
        const filaData = datosDiarios.find(f => f.fila === fila);
        if (filaData && filaData[campo] !== null && filaData[campo] !== undefined) {
            valores.push(Number(filaData[campo]) || 0);
        }
    }
    
    return valores;
}

// Obtener valor de celda de cliente por referencia (ej: K17, L17, M17, N17, etc.)
// IMPORTANTE: Detecta automáticamente qué cliente corresponde a la columna
function obtenerValorCeldaCliente(referencia, filaIdx, clienteIdxActual, hoja) {
    const match = referencia.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    
    const colLetra = match[1];
    const filaNum = parseInt(match[2]);
    
    // Convertir letra de columna a número
    let colNum = 0;
    for (let i = 0; i < colLetra.length; i++) {
        colNum = colNum * 26 + (colLetra.charCodeAt(i) - 64);
    }
    
    // Determinar qué cliente corresponde a esta columna
    // Clientes empiezan en columna 11 (K), cada cliente ocupa 8 columnas
    const clienteIdx = Math.floor((colNum - 11) / 8);
    const offsetColumna = (colNum - 11) % 8;
    
    // Validar que el índice de cliente es válido
    if (clienteIdx < 0) return null;
    
    // Usar datosEditados para obtener valores actualizados
    const hojaEditada = datosEditados?.hojas?.[hojaActual];
    let filaDataCliente = null;
    
    if (hojaEditada && hojaEditada.clientes) {
        const clientes = hojaEditada.clientes || [];
        if (clienteIdx >= 0 && clienteIdx < clientes.length) {
            const cliente = clientes[clienteIdx];
            const datosDiariosCliente = cliente.datos_diarios || [];
            filaDataCliente = datosDiariosCliente.find(d => d.fila === filaNum);
        }
    }
    
    // Fallback a hoja si datosEditados no está disponible o no se encontró
    if (!filaDataCliente) {
        const clientes = hoja?.clientes || [];
        if (clienteIdx < 0 || clienteIdx >= clientes.length) return null;
        const cliente = clientes[clienteIdx];
        const datosDiariosCliente = cliente.datos_diarios || [];
        filaDataCliente = datosDiariosCliente.find(d => d.fila === filaNum);
    }
    
    if (!filaDataCliente) return null;
    
    // Mapear offset de columna a campo
    const campoMap = {
        0: 'incremento',      // K, S, AA...
        1: 'decremento',      // L, T, AB...
        2: 'base',            // M, U, AC...
        3: 'saldo_diario',    // N, V, AD...
        4: 'beneficio_diario', // O, W, AE...
        5: 'beneficio_diario_pct', // P, X, AF...
        6: 'beneficio_acumulado', // Q, Y, AG...
        7: 'beneficio_acumulado_pct' // R, Z, AH...
    };
    
    const campo = campoMap[offsetColumna];
    
    if (!campo) return null;
    
    const valor = filaDataCliente[campo];
    return valor !== null && valor !== undefined ? valor : null;
}

// Recalcular fórmulas dependientes cuando cambia un valor (con recálculo en cascada)
async function recalcularFormulasDependientes(filaIdx, columnaModificada, hoja) {
    const datosDiarios = hoja.datos_diarios_generales || [];
    const datosGenerales = hoja.datos_generales || [];
    const todasLasFilas = [...datosGenerales, ...datosDiarios];
    
    const referenciaModificada = obtenerReferenciaCelda(filaIdx, columnaModificada);
    if (!referenciaModificada) {
        console.log('No se pudo obtener referencia para:', filaIdx, columnaModificada);
        return;
    }
    
    console.log('Recalculando fórmulas dependientes de:', referenciaModificada);
    
    // Conjunto de celdas ya recalculadas para evitar bucles infinitos
    const recalculadas = new Set();
    
    // Función recursiva para recalcular en cascada (datos generales)
    function recalcularRecursivo() {
        let huboCambios = true;
        let iteracion = 0;
        const maxIteraciones = 20; // Evitar bucles infinitos
        
        // AÑADIR LA CELDA MODIFICADA A RECALCULADAS desde el principio para que otras fórmulas la detecten
        const colModificada = obtenerColumnaDeReferencia(referenciaModificada);
        if (colModificada) {
            recalculadas.add(`${filaIdx}_${colModificada}`);
            console.log(`Celda modificada ${referenciaModificada} añadida a recalculadas como: ${filaIdx}_${colModificada}`);
        }
        
        while (huboCambios && iteracion < maxIteraciones) {
            huboCambios = false;
            iteracion++;
            
            todasLasFilas.forEach(filaData => {
                if (!filaData.formulas) return;
                
                Object.keys(filaData.formulas).forEach(columnaConFormula => {
                    const formula = filaData.formulas[columnaConFormula];
                    const claveCelda = `${filaData.fila}_${columnaConFormula}`;
                    
                    // Verificar si la fórmula hace referencia a alguna celda modificada o recalculada
                    const referenciaRegex = /([A-Z]+\d+)/g;
                    const referenciasEnFormula = formula.match(referenciaRegex) || [];
                    
                    const necesitaRecalculo = referenciasEnFormula.some(ref => {
                        // Si la fórmula referencia la celda modificada directamente
                        if (ref === referenciaModificada) {
                            console.log(`Fila ${filaData.fila}, ${columnaConFormula}: fórmula referencia directamente ${ref}`);
                            return true;
                        }
                        
                        // Si la fórmula referencia una celda que fue recalculada
                        const refFila = parseInt(ref.match(/\d+/)[0]);
                        const refCol = obtenerColumnaDeReferencia(ref);
                        if (refCol) {
                            const refClave = `${refFila}_${refCol}`;
                            if (recalculadas.has(refClave)) {
                                console.log(`Fila ${filaData.fila}, ${columnaConFormula}: fórmula referencia ${ref} (${refClave}) que fue recalculada`);
                                return true;
                            }
                        }
                        
                        return false;
                    });
                    
                    if (necesitaRecalculo && !recalculadas.has(claveCelda)) {
                        const valorAnterior = filaData[columnaConFormula];
                        const nuevoValor = evaluarFormula(formula, filaData.fila, hoja);
                        
                        // Comparar valores numéricos con tolerancia para evitar problemas de precisión
                        const valoresDiferentes = valorAnterior === null || 
                                                 valorAnterior === undefined ||
                                                 Math.abs(nuevoValor - (valorAnterior || 0)) > 0.0001;
                        
                        if (nuevoValor !== null && valoresDiferentes) {
                            console.log(`Recalculando Fila ${filaData.fila}, ${columnaConFormula}: ${valorAnterior} -> ${nuevoValor}`);
                            
                            // Preservar bloqueadas y fórmulas antes de actualizar
                            const hojaOriginal = datosCompletos.hojas[hojaActual];
                            const datosOriginalesDiarios = hojaOriginal?.datos_diarios_generales || [];
                            const datosOriginalesGenerales = hojaOriginal?.datos_generales || [];
                            const filaOriginal = [...datosOriginalesGenerales, ...datosOriginalesDiarios].find(f => f.fila === filaData.fila);
                            
                            if (filaOriginal) {
                                if (filaOriginal.bloqueadas) {
                                    filaData.bloqueadas = JSON.parse(JSON.stringify(filaOriginal.bloqueadas));
                                }
                                if (filaOriginal.formulas) {
                                    filaData.formulas = JSON.parse(JSON.stringify(filaOriginal.formulas));
                                }
                            }
                            
                            filaData[columnaConFormula] = nuevoValor;
                            recalculadas.add(claveCelda);
                            huboCambios = true;
                            
                            // Actualizar la UI
                            actualizarCeldaEnUI(filaData.fila, columnaConFormula, nuevoValor);
                        }
                    }
                });
            });
        }
    }
    
    // Primero recalcular datos generales
    recalcularRecursivo();
    
    console.log(`Celdas generales recalculadas (${recalculadas.size}):`, Array.from(recalculadas).slice(0, 10).join(', '), '...');
    
    // Luego recalcular TODOS los clientes que dependen de los datos generales
    // IMPORTANTE: Hacer múltiples pasadas porque un cliente puede depender de otro
    const clientes = hoja.clientes || [];
    console.log(`Recalculando fórmulas para ${clientes.length} clientes...`);
    
    // Hacer múltiples pasadas hasta que no haya cambios (máximo 10 pasadas)
    let totalClientesRecalculados = 0;
    let huboCambiosEnPasada = true;
    let pasada = 0;
    const maxPasadas = 10;
    const recalculadasClientes = new Set();
    
    while (huboCambiosEnPasada && pasada < maxPasadas) {
        huboCambiosEnPasada = false;
        pasada++;
        
        clientes.forEach((cliente, clienteIdx) => {
            const cantidadRecalculada = recalcularFormulasClientes(
                cliente, 
                clienteIdx, 
                referenciaModificada, 
                hoja, 
                recalculadas,
                recalculadasClientes
            );
            if (cantidadRecalculada > 0) {
                huboCambiosEnPasada = true;
                totalClientesRecalculados += cantidadRecalculada;
            }
        });
    }
    
    console.log(`Recálculo completado en ${pasada} pasadas. Generales: ${recalculadas.size}, Clientes: ${totalClientesRecalculados}`);
    
    // Actualizar tarjetas de resumen (totales en la parte superior)
    actualizarTarjetasResumen();
    
    // Guardar automáticamente en el servidor (como Google Drive)
    await guardarDatosAutomatico(recalculadas.size, totalClientesRecalculados);
}

// Recalcular fórmulas de un cliente específico cuando cambian los datos generales
// Retorna la cantidad de celdas recalculadas
// IMPORTANTE: recalculadasClientes es un Set compartido entre todos los clientes
function recalcularFormulasClientes(cliente, clienteIdx, referenciaModificadaGeneral, hoja, recalculadasGenerales, recalculadasClientes) {
    const datosDiariosCliente = cliente.datos_diarios || [];
    let totalRecalculadas = 0;
    
    // Convertir columna a índice de cliente y campo
    function obtenerClienteYCampoDesdeReferencia(ref) {
        const m = ref.match(/^([A-Z]+)(\d+)$/);
        if (!m) return null;
        const colLetra = m[1];
        const filaNum = parseInt(m[2]);
        
        // Convertir letra a número
        let colNum = 0;
        for (let i = 0; i < colLetra.length; i++) {
            colNum = colNum * 26 + (colLetra.charCodeAt(i) - 64);
        }
        
        // Verificar si es columna de cliente (>= 11)
        if (colNum < 11) return null;
        
        const clienteRefIdx = Math.floor((colNum - 11) / 8);
        const offset = (colNum - 11) % 8;
        
        const campoMap = {
            0: 'incremento',
            1: 'decremento',
            2: 'base',
            3: 'saldo_diario',
            4: 'beneficio_diario',
            5: 'beneficio_diario_pct',
            6: 'beneficio_acumulado',
            7: 'beneficio_acumulado_pct'
        };
        
        return {
            clienteIdx: clienteRefIdx,
            campo: campoMap[offset],
            fila: filaNum
        };
    }
    
    datosDiariosCliente.forEach(filaDataCliente => {
        if (!filaDataCliente.formulas) return;
        
        Object.keys(filaDataCliente.formulas).forEach(campoConFormula => {
            const formula = filaDataCliente.formulas[campoConFormula];
            const claveCelda = `${filaDataCliente.fila}_cliente${clienteIdx}_${campoConFormula}`;
            
            // Ya se recalculó en esta pasada
            if (recalculadasClientes.has(claveCelda)) return;
            
            // Extraer todas las referencias de la fórmula
            const referenciaRegex = /([A-Z]+\d+)/g;
            const referenciasEnFormula = formula.match(referenciaRegex) || [];
            
            // Verificar si necesita recálculo
            const necesitaRecalculo = referenciasEnFormula.some(ref => {
                const colLetra = ref.match(/^([A-Z]+)/)[1];
                const refFila = parseInt(ref.match(/\d+/)[0]);
                
                // Verificar si referencia columnas generales (E-J)
                if (['E', 'F', 'G', 'H', 'I', 'J'].includes(colLetra)) {
                    // Si referencia la celda modificada directamente
                    if (referenciaModificadaGeneral && ref === referenciaModificadaGeneral) {
                        return true;
                    }
                    
                    // Si referencia una celda general que fue recalculada
                    const refCol = obtenerColumnaDeReferencia(ref);
                    if (refCol) {
                        const refClave = `${refFila}_${refCol}`;
                        if (recalculadasGenerales && recalculadasGenerales.has(refClave)) {
                            return true;
                        }
                    }
                    return false;
                }
                
                // Verificar si referencia celda de CUALQUIER cliente
                const refInfo = obtenerClienteYCampoDesdeReferencia(ref);
                if (refInfo && refInfo.campo) {
                    const refClave = `${refInfo.fila}_cliente${refInfo.clienteIdx}_${refInfo.campo}`;
                    if (recalculadasClientes.has(refClave)) {
                        return true;
                    }
                    
                    // IMPORTANTE: Si la referencia es del mismo cliente y es incremento/decremento,
                    // y hay una celda modificada del mismo tipo en una fila cercana (dentro de ±2 filas),
                    // también recalcular porque las fórmulas pueden tener dependencias indirectas
                    if (refInfo.clienteIdx === clienteIdx && 
                        (refInfo.campo === 'incremento' || refInfo.campo === 'decremento')) {
                        // Buscar si hay alguna celda modificada del mismo tipo en filas cercanas
                        for (const claveMod of recalculadasClientes) {
                            const matchMod = claveMod.match(/^(\d+)_cliente(\d+)_(.+)$/);
                            if (matchMod) {
                                const filaMod = parseInt(matchMod[1]);
                                const clienteModIdx = parseInt(matchMod[2]);
                                const campoMod = matchMod[3];
                                
                                // Si es el mismo cliente, mismo tipo de campo (incremento/decremento),
                                // y la fila está cerca (dentro de ±2 filas), recalcular
                                if (clienteModIdx === clienteIdx && 
                                    campoMod === refInfo.campo &&
                                    Math.abs(filaMod - refInfo.fila) <= 2) {
                                    return true;
                                }
                            }
                        }
                    }
                }
                
                return false;
            });
            
            if (necesitaRecalculo) {
                const valorAnterior = filaDataCliente[campoConFormula];
                const nuevoValor = evaluarFormulaCliente(formula, filaDataCliente.fila, clienteIdx, hoja);
                
                const valoresDiferentes = valorAnterior === null || 
                                         valorAnterior === undefined ||
                                         Math.abs(nuevoValor - (valorAnterior || 0)) > 0.0001;
                
                if (nuevoValor !== null && valoresDiferentes) {
                    // Preservar bloqueadas y fórmulas
                    const hojaOriginal = datosCompletos.hojas[hojaActual];
                    if (hojaOriginal && hojaOriginal.clientes && hojaOriginal.clientes[clienteIdx]) {
                        const clienteOriginal = hojaOriginal.clientes[clienteIdx];
                        const filaOriginalCliente = (clienteOriginal.datos_diarios || []).find(d => d.fila === filaDataCliente.fila);
                        if (filaOriginalCliente) {
                            if (filaOriginalCliente.bloqueadas) {
                                filaDataCliente.bloqueadas = JSON.parse(JSON.stringify(filaOriginalCliente.bloqueadas));
                            }
                            if (filaOriginalCliente.formulas) {
                                filaDataCliente.formulas = JSON.parse(JSON.stringify(filaOriginalCliente.formulas));
                            }
                        }
                    }
                    
                    filaDataCliente[campoConFormula] = nuevoValor;
                    recalculadasClientes.add(claveCelda);
                    totalRecalculadas++;
                    
                    // Actualizar UI si está visible
                    actualizarCeldaClienteEnUI(clienteIdx, filaDataCliente.fila, campoConFormula, nuevoValor);
                }
            }
        });
    });
    
    return totalRecalculadas;
}

// Evaluar fórmula de cliente (que puede referenciar tanto datos generales como del cliente)
function evaluarFormulaCliente(formula, filaIdx, clienteIdx, hoja) {
    if (!formula || !formula.startsWith('=')) {
        return null;
    }
    
    let expr = formula.substring(1);
    
    // IMPORTANTE: Manejar funciones SUM con rangos ANTES de reemplazar referencias individuales
    // Ejemplo: SUM(S937:S1026) debe calcularse como suma del rango, no como SUM(0:0)
    const sumRegex = /SUM\(([A-Z]+\d+):([A-Z]+\d+)\)/gi;
    let sumMatch;
    while ((sumMatch = sumRegex.exec(expr)) !== null) {
        const inicioRef = sumMatch[1]; // Ej: S937
        const finRef = sumMatch[2];    // Ej: S1026
        
        // Calcular la suma del rango
        const sumaRango = calcularSumaRango(inicioRef, finRef, filaIdx, clienteIdx, hoja);
        const sumaStr = sumaRango !== null ? sumaRango.toString() : '0';
        
        // Reemplazar toda la función SUM con el resultado
        expr = expr.replace(sumMatch[0], sumaStr);
    }
    
    // Reemplazar referencias de celdas individuales con valores
    const referenciaRegex = /([A-Z]+\d+)/g;
    const referenciasUnicas = new Set();
    let match;
    
    while ((match = referenciaRegex.exec(expr)) !== null) {
        referenciasUnicas.add(match[0]);
    }
    
    // Reemplazar cada referencia
    const referenciasOrdenadas = Array.from(referenciasUnicas).sort((a, b) => b.length - a.length);
    referenciasOrdenadas.forEach(ref => {
        const colLetra = ref.match(/^([A-Z]+)/)[1];
        let valor = null;
        
        // Si es columna general (E-J), usar obtenerValorCelda con hojaEditada
        // IMPORTANTE: Usar datosEditados para obtener valores actualizados de la vista general
        if (['E', 'F', 'G', 'H', 'I', 'J'].includes(colLetra)) {
            // Usar hojaEditada (datosEditados) para obtener valores actualizados
            const hojaEditada = datosEditados?.hojas?.[hojaActual] || hoja;
            valor = obtenerValorCelda(ref, hojaEditada, filaIdx);
        } else {
            // Si es columna de cliente (K en adelante), usar obtenerValorCeldaCliente
            // IMPORTANTE: obtenerValorCeldaCliente puede buscar en cualquier cliente,
            // no solo en el cliente actual, porque las fórmulas pueden referenciar otros clientes
            valor = obtenerValorCeldaCliente(ref, filaIdx, clienteIdx, hoja);
        }
        
        const valorStr = valor !== null && valor !== undefined ? valor.toString() : '0';
        expr = expr.split(ref).join(valorStr);
    });
    
    // DEBUG: Log de la expresión antes de evaluar (solo para fórmulas importantes)
    if (formula.includes('IF') || formula.includes('SUM')) {
        console.log(`🔍 evaluarFormulaCliente: fórmula="${formula}", expresión="${expr}"`);
    }
    
    // Convertir operadores de Excel a JavaScript
    expr = expr.replace(/<>/g, '!=');
    expr = expr.replace(/(?<![=!<>])=(?![=<>])/g, '==');
    
    // IMPORTANTE: Manejar valores null/undefined en comparaciones
    // En Excel, null/undefined se trata como 0 en comparaciones numéricas
    // Pero también necesitamos manejar el caso donde una comparación con 0 puede ser problemática
    // Reemplazar comparaciones con null/undefined por comparaciones con 0
    expr = expr.replace(/null/g, '0');
    expr = expr.replace(/undefined/g, '0');
    
    // DEBUG: Log detallado para fórmulas importantes
    if (formula.includes('IF') && (formula.includes('N17') || formula.includes('S15') || formula.includes('T16'))) {
        console.log(`🔍 evaluarFormulaCliente DETALLADO:`);
        console.log(`   Fórmula original: ${formula}`);
        console.log(`   Expresión después de reemplazar: ${expr}`);
    }
    
    // Manejar funciones IF -> ternario JS (case-insensitive)
    expr = convertirIFaTernario(expr);
    
    // DEBUG: Log después de convertir IF
    if (formula.includes('IF') && (formula.includes('N17') || formula.includes('S15') || formula.includes('T16'))) {
        console.log(`   Expresión después de convertir IF: ${expr}`);
    }
    
    // DEBUG: Log de la expresión después de convertir IF (solo para fórmulas importantes)
    if (formula.includes('IF') || formula.includes('SUM')) {
        console.log(`🔍 evaluarFormulaCliente: expresión después de convertir IF="${expr}"`);
    }
    
    // Evaluar la expresión final
    try {
        const resultado = eval(expr);
        if (typeof resultado === 'number' && !isNaN(resultado) && isFinite(resultado)) {
            return resultado;
        }
        // Si el resultado es 0, también devolverlo (no null)
        if (resultado === 0) {
            return 0;
        }
        console.warn('⚠️ evaluarFormulaCliente: resultado no numérico válido:', resultado, 'para fórmula:', formula, 'expresión:', expr);
        return null;
    } catch (error) {
        console.warn('Error al evaluar fórmula de cliente:', formula, 'Expresión:', expr, error);
        return null;
    }
}

// Calcular la suma de un rango de celdas (ej: S937:S1026)
function calcularSumaRango(inicioRef, finRef, filaIdx, clienteIdx, hoja) {
    const matchInicio = inicioRef.match(/^([A-Z]+)(\d+)$/);
    const matchFin = finRef.match(/^([A-Z]+)(\d+)$/);
    
    if (!matchInicio || !matchFin) return null;
    
    const colLetraInicio = matchInicio[1];
    const filaInicio = parseInt(matchInicio[2]);
    const filaFin = parseInt(matchFin[2]);
    
    // Verificar que es la misma columna
    if (colLetraInicio !== matchFin[1]) return null;
    
    // Verificar que las filas están en orden
    if (filaInicio > filaFin) return null;
    
    let suma = 0;
    
    // Sumar todas las celdas del rango
    for (let fila = filaInicio; fila <= filaFin; fila++) {
        const ref = colLetraInicio + fila;
        let valor = null;
        
        // Determinar si es columna general o de cliente
        if (['E', 'F', 'G', 'H', 'I', 'J'].includes(colLetraInicio)) {
            const hojaEditada = datosEditados?.hojas?.[hojaActual] || hoja;
            valor = obtenerValorCelda(ref, hojaEditada, filaIdx);
        } else {
            valor = obtenerValorCeldaCliente(ref, filaIdx, clienteIdx, hoja);
        }
        
        if (valor !== null && valor !== undefined && typeof valor === 'number') {
            suma += valor;
        }
    }
    
    return suma;
}

// Calcular saldo actual del cliente (último valor de saldo_diario o cálculo directo)
function calcularSaldoActualCliente(cliente) {
    const datosDiarios = cliente.datos_diarios || [];
    
    // Ordenar por fila
    const datosOrdenados = datosDiarios
        .filter(d => d.fila >= 15 && d.fila <= 1120)
        .sort((a, b) => (a.fila || 0) - (b.fila || 0));
    
    if (datosOrdenados.length === 0) {
        return (cliente && typeof cliente.saldo_inicial_mes === 'number') ? cliente.saldo_inicial_mes : 0;
    }
    
    // MÉTODO 1: Buscar el último saldo_diario válido
    const datosConSaldo = datosOrdenados.filter(d => 
        d.saldo_diario !== null && d.saldo_diario !== undefined && typeof d.saldo_diario === 'number'
    );
    
    if (datosConSaldo.length > 0) {
        const ultimoConSaldo = datosConSaldo[datosConSaldo.length - 1];
        console.log(`💰 Saldo cliente (último saldo_diario en fila ${ultimoConSaldo.fila}): ${ultimoConSaldo.saldo_diario}`);
        return ultimoConSaldo.saldo_diario;
    }
    
    // MÉTODO 2: Calcular saldo manualmente si no hay saldo_diario guardado
    // Saldo = saldo_inicial_mes + (inc_acum - dec_acum) + beneficios
    let sumaIncrementos = typeof cliente._acumPrevInc === 'number' ? cliente._acumPrevInc : 0;
    let sumaDecrementos = typeof cliente._acumPrevDec === 'number' ? cliente._acumPrevDec : 0;
    let sumaBeneficios = 0;
    
    datosOrdenados.forEach(d => {
        if (typeof d.incremento === 'number') sumaIncrementos += d.incremento;
        if (typeof d.decremento === 'number') sumaDecrementos += d.decremento;
        if (typeof d.beneficio_diario === 'number') sumaBeneficios += d.beneficio_diario;
    });
    
    const saldoInicial = (cliente && typeof cliente.saldo_inicial_mes === 'number') ? cliente.saldo_inicial_mes : 0;
    const saldoCalculado = saldoInicial + (sumaIncrementos - sumaDecrementos) + sumaBeneficios;
    console.log(`💰 Saldo cliente (calculado): inc=${sumaIncrementos}, dec=${sumaDecrementos}, benef=${sumaBeneficios} => ${saldoCalculado}`);
    return saldoCalculado;
}

// Calcular comisión (5%) atribuible al decremento de una fila concreta.
// La comisión se aplica solo a la parte del decremento que excede los incrementos acumulados.
function calcularComisionDeDecrementoEnFila(cliente, filaObjetivo, overrideDecremento = undefined) {
    if (!cliente || !cliente.datos_diarios) return 0;

    let acumuladoIncrementos = typeof cliente._acumPrevInc === 'number' ? cliente._acumPrevInc : 0;
    let acumuladoDecrementos = typeof cliente._acumPrevDec === 'number' ? cliente._acumPrevDec : 0;
    let comisionFila = 0;
    const primeraFilaPorFecha = obtenerPrimeraFilaPorFechaCliente(cliente);

    const datosOrdenados = [...cliente.datos_diarios]
        .filter(d => d && d.fila >= 15 && d.fila <= 1120)
        .sort((a, b) => a.fila - b.fila);

    for (const dato of datosOrdenados) {
        if (primeraFilaPorFecha.get(dato.fecha) !== dato.fila) {
            continue;
        }
        const inc = (typeof dato.incremento === 'number' && !isNaN(dato.incremento)) ? dato.incremento : 0;
        let dec = (typeof dato.decremento === 'number' && !isNaN(dato.decremento)) ? dato.decremento : 0;

        if (dato.fila === filaObjetivo && overrideDecremento !== undefined) {
            dec = (typeof overrideDecremento === 'number' && !isNaN(overrideDecremento)) ? overrideDecremento : 0;
        }

        acumuladoIncrementos += inc;

        const excesoAnterior = Math.max(0, acumuladoDecrementos - acumuladoIncrementos);
        acumuladoDecrementos += dec;
        const excesoHastaAqui = Math.max(0, acumuladoDecrementos - acumuladoIncrementos);

        if (dato.fila === filaObjetivo && dec > 0) {
            const excesoDeEsteDecremento = Math.max(0, excesoHastaAqui - excesoAnterior);
            comisionFila = excesoDeEsteDecremento * 0.05;
            break;
        }
    }

    return comisionFila;
}

// Mostrar alerta de saldo excedido
let inputActivoAntesSaldoExcedido = null;
let alertaSaldoExcedidoActiva = false;
let ignorarProximoBlurDecremento = false;
let timeoutAlertaSaldo = null;

function mostrarAlertaSaldoExcedido(saldoActual, decrementoIntentado, inputOrigen = null) {
    // Evitar mostrar si ya está activa
    if (alertaSaldoExcedidoActiva) return;
    alertaSaldoExcedidoActiva = true;
    
    // Guardar el input de origen
    inputActivoAntesSaldoExcedido = inputOrigen || document.activeElement;
    
    // Limpiar timeout anterior si existe
    if (timeoutAlertaSaldo) {
        clearTimeout(timeoutAlertaSaldo);
        timeoutAlertaSaldo = null;
    }
    
    // Eliminar contenedor anterior si existe
    const existente = document.getElementById('alertaSaldoExcedido');
    if (existente) existente.remove();
    
    // Crear nuevo contenedor
    const alertaContainer = document.createElement('div');
    alertaContainer.id = 'alertaSaldoExcedido';
    alertaContainer.className = 'alerta-saldo-excedido';
    document.body.appendChild(alertaContainer);
    
    const diferencia = decrementoIntentado - saldoActual;
    
    alertaContainer.innerHTML = `
        <div class="alerta-saldo-content">
            <div class="alerta-saldo-icon">⚠️</div>
            <div class="alerta-saldo-titulo">SALDO EXCEDIDO</div>
            <div class="alerta-saldo-mensaje">
                No puedes retirar más dinero del disponible.
            </div>
            <div class="alerta-saldo-detalles">
                <div class="alerta-detalle-item">
                    <span class="alerta-label">Saldo Disponible:</span>
                    <span class="alerta-value">${formatearMoneda(saldoActual)}</span>
                </div>
                <div class="alerta-detalle-item">
                    <span class="alerta-label">Decremento Intentado:</span>
                    <span class="alerta-value negative">${formatearMoneda(decrementoIntentado)}</span>
                </div>
                <div class="alerta-detalle-item">
                    <span class="alerta-label">Exceso:</span>
                    <span class="alerta-value negative">${formatearMoneda(diferencia)}</span>
                </div>
            </div>
            <button class="alerta-saldo-btn" id="btnCerrarAlertaSaldo" type="button">ENTENDIDO</button>
        </div>
    `;
    
    // Forzar reflow antes de añadir clase show
    alertaContainer.offsetHeight;
    alertaContainer.classList.add('show');
    
    // Handler para el botón - usar onclick directo
    const btnCerrar = document.getElementById('btnCerrarAlertaSaldo');
    if (btnCerrar) {
        btnCerrar.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔴 Botón ENTENDIDO pulsado');
            cerrarAlertaSaldoExcedidoReal();
        };
    }
    
    // Handler para click fuera
    alertaContainer.onclick = function(e) {
        if (!e.target.closest('.alerta-saldo-content')) {
            cerrarAlertaSaldoExcedidoReal();
        }
    };
    
    // Handler para teclas
    const keyHandler = function(e) {
        if (e.key === 'Escape' || e.key === 'Enter') {
            cerrarAlertaSaldoExcedidoReal();
            document.removeEventListener('keydown', keyHandler);
        }
    };
    document.addEventListener('keydown', keyHandler);
    
    // Guardar referencia al handler para limpiarlo después
    alertaContainer.keyHandler = keyHandler;
    
    // Auto-cerrar después de 10 segundos
    timeoutAlertaSaldo = setTimeout(() => {
        cerrarAlertaSaldoExcedidoReal();
    }, 10000);
}

// Función real de cierre
function cerrarAlertaSaldoExcedidoReal() {
    console.log('🔴 Cerrando alerta de saldo excedido');
    
    const alertaContainer = document.getElementById('alertaSaldoExcedido');
    if (!alertaContainer) return;
    
    // Limpiar timeout
    if (timeoutAlertaSaldo) {
        clearTimeout(timeoutAlertaSaldo);
        timeoutAlertaSaldo = null;
    }
    
    // Limpiar handler de teclas
    if (alertaContainer.keyHandler) {
        document.removeEventListener('keydown', alertaContainer.keyHandler);
    }
    
    // Marcar para ignorar próximo blur
    ignorarProximoBlurDecremento = true;
    
    // Animar cierre
    alertaContainer.classList.remove('show');
    
    // Eliminar después de la animación
    setTimeout(() => {
        if (alertaContainer.parentNode) {
            alertaContainer.remove();
        }
        alertaSaldoExcedidoActiva = false;
        
        // Devolver foco al input original
        if (inputActivoAntesSaldoExcedido && typeof inputActivoAntesSaldoExcedido.focus === 'function') {
            const inputAFocar = inputActivoAntesSaldoExcedido;
            inputActivoAntesSaldoExcedido = null;
            
            // Pequeño delay para evitar re-trigger del blur
            setTimeout(() => {
                inputAFocar.focus();
                inputAFocar.select();
            }, 50);
        }
    }, 300);
}

// Alias global para compatibilidad
window.cerrarAlertaSaldoExcedido = cerrarAlertaSaldoExcedidoReal;

function mostrarNotificacionComision(mensaje) {
    let bubble = document.getElementById('notificacionComision');
    if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = 'notificacionComision';
        bubble.className = 'notificacion notificacion-comision';
        document.body.appendChild(bubble);
    }
    bubble.textContent = mensaje;
    bubble.classList.add('show');
    clearTimeout(bubble._timer);
    bubble._timer = setTimeout(() => {
        bubble.classList.remove('show');
    }, 3500);
}

// Actualizar celda de cliente en la UI
function actualizarCeldaClienteEnUI(clienteIdx, filaIdx, campo, nuevoValor) {
    // Actualizar siempre, incluso si no estamos viendo este cliente
    // (los datos se actualizarán y se reflejarán cuando el usuario vea ese cliente)
    
    // Buscar la tabla de cliente si está visible
    const tablaCliente = document.getElementById('tablaCliente');
    if (!tablaCliente) {
        // Si no está visible, solo actualizar los datos (se reflejará cuando se vea)
        console.log(`Cliente ${clienteIdx + 1}, Fila ${filaIdx}, ${campo}: actualizado a ${nuevoValor} (tabla no visible)`);
        return;
    }
    
    // Verificar si estamos viendo este cliente
    if (clienteActual === null || clienteActual !== clienteIdx) {
        console.log(`Cliente ${clienteIdx + 1}, Fila ${filaIdx}, ${campo}: actualizado a ${nuevoValor} (cliente no visible actualmente)`);
        return;
    }
    
    const tr = tablaCliente.querySelector(`tr[data-fila="${filaIdx}"][data-cliente-idx="${clienteIdx}"]`);
    if (!tr) return;

    // Buscar la celda correspondiente al campo
    // Índices en tabla cliente:
    // 0 Fecha | 1 Incrementos | 2 Decrementos | 3 Saldo Diario | 4 Benef. Diario | 5 Benef. % | 6 Benef. Acum | 7 Benef. Acum %
    const tds = tr.querySelectorAll('td');
    const campoMap = {
        'saldo_diario': 3,
        'beneficio_diario': 4,
        'beneficio_diario_pct': 5,
        'beneficio_acumulado': 6,
        'beneficio_acumulado_pct': 7
    };

    const indiceColumna = campoMap[campo];
    if (indiceColumna === undefined || !tds[indiceColumna]) return;

    const tdObjetivo = tds[indiceColumna];
    if (campo === 'beneficio_diario_pct' || campo === 'beneficio_acumulado_pct') {
        tdObjetivo.textContent = nuevoValor !== null && nuevoValor !== undefined ? formatearPorcentaje(nuevoValor) : '-';
    } else {
        tdObjetivo.textContent = nuevoValor !== null && nuevoValor !== undefined ? formatearMoneda(nuevoValor) : '-';
    }

    // Animación visual
    tdObjetivo.style.transition = 'background-color 0.3s';
    tdObjetivo.style.backgroundColor = 'rgba(0, 122, 255, 0.12)';
    setTimeout(() => {
        tdObjetivo.style.backgroundColor = '';
    }, 450);
}

// Obtener nombre de columna desde referencia Excel (ej: F17 -> 'imp_final')
function obtenerColumnaDeReferencia(referencia) {
    const match = referencia.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    
    const colLetra = match[1];
    let colNum = 0;
    for (let i = 0; i < colLetra.length; i++) {
        colNum = colNum * 26 + (colLetra.charCodeAt(i) - 64);
    }
    
    const columnaMap = {
        5: 'imp_inicial',
        6: 'imp_final',
        7: 'benef_euro',
        8: 'benef_porcentaje',
        9: 'benef_euro_acum',
        10: 'benef_porcentaje_acum'
    };
    
    return columnaMap[colNum] || null;
}

// Obtener referencia Excel de una celda (ej: fila 17, columna 'imp_final' -> F17)
function obtenerReferenciaCelda(filaIdx, columna) {
    const columnaMap = {
        'imp_inicial': 'E',
        'imp_final': 'F',
        'benef_euro': 'G',
        'benef_porcentaje': 'H',
        'benef_euro_acum': 'I',
        'benef_porcentaje_acum': 'J'
    };
    
    const letra = columnaMap[columna];
    return letra ? letra + filaIdx : null;
}

// Actualizar celda en la UI
function actualizarCeldaEnUI(filaIdx, columna, nuevoValor) {
    // Buscar la celda en la tabla y actualizarla
    const tabla = document.getElementById('tbodyGeneral');
    if (!tabla) {
        console.log(`⚠️ actualizarCeldaEnUI: tabla no encontrada, vista actual: ${vistaActual}`);
        return;
    }
    
    const filas = tabla.querySelectorAll('tr');
    let encontrada = false;
    
    filas.forEach((tr, rowIndex) => {
        // Buscar input con data-fila o celda con data-fila
        const inputFila = tr.querySelector(`input[data-fila="${filaIdx}"]`);
        const celdaFila = tr.querySelector(`td[data-fila="${filaIdx}"]`);
        
        // También verificar por índice de fila en los datos
        const hoja = datosEditados?.hojas?.[hojaActual];
        const datosDiarios = hoja?.datos_diarios_generales || [];
        const indiceFila = datosDiarios.findIndex(d => d.fila === filaIdx);
        
        if (!inputFila && !celdaFila && rowIndex !== indiceFila) return;
        
        // Las columnas están en orden: fecha, imp_inicial, imp_final, benef_euro, benef_porcentaje, benef_euro_acum, benef_porcentaje_acum
        const columnasOrden = ['imp_inicial', 'imp_final', 'benef_euro', 'benef_porcentaje', 'benef_euro_acum', 'benef_porcentaje_acum'];
        const indiceColumna = columnasOrden.indexOf(columna);
        
        if (indiceColumna >= 0) {
            const tds = tr.querySelectorAll('td');
            // +1 porque el primer td es la fecha
            const tdObjetivo = tds[indiceColumna + 1];
            
            if (tdObjetivo) {
                encontrada = true;
                // Verificar si tiene input (editable) o es texto (bloqueada)
                const input = tdObjetivo.querySelector('input');
                if (input) {
                    // Es editable, actualizar el input
                    input.value = nuevoValor !== null && nuevoValor !== undefined ? formatearNumeroInput(nuevoValor) : '';
                    input.dataset.valorNumerico = nuevoValor !== null && nuevoValor !== undefined ? nuevoValor : '';
                    input.classList.add('cell-modified');
                } else {
                    // Es una celda bloqueada, actualizar el texto
                    if (columna === 'benef_porcentaje' || columna === 'benef_porcentaje_acum') {
                        tdObjetivo.textContent = nuevoValor !== null && nuevoValor !== undefined ? formatearPorcentaje(nuevoValor) : '-';
                    } else {
                        tdObjetivo.textContent = nuevoValor !== null && nuevoValor !== undefined ? formatearMoneda(nuevoValor) : '-';
                    }
                    // Agregar animación visual
                    tdObjetivo.style.transition = 'background-color 0.3s';
                    tdObjetivo.style.backgroundColor = 'rgba(72, 187, 120, 0.2)';
                    setTimeout(() => {
                        tdObjetivo.style.backgroundColor = '';
                    }, 500);
                }
                console.log(`✅ actualizarCeldaEnUI: fila ${filaIdx}, ${columna} = ${nuevoValor}`);
            }
        }
    });
}

// Actualizar dato general
async function actualizarDatoGeneral(filaIdx, columna, nuevoValor) {
    if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[hojaActual]) {
        return;
    }
    
    const hoja = datosEditados.hojas[hojaActual];
    
    // Buscar en datos generales (filas 3-6)
    const datosGenerales = hoja.datos_generales || [];
    let filaData = datosGenerales.find(f => f.fila === filaIdx);
    
    // Si no está en datos generales, buscar en datos diarios generales
    if (!filaData) {
        const datosDiarios = hoja.datos_diarios_generales || [];
        filaData = datosDiarios.find(f => f.fila === filaIdx);
    }
    
    if (filaData) {
        const valorAnterior = filaData[columna];
        const valoresDiferentes = (valorAnterior === null || valorAnterior === undefined) !== (nuevoValor === null || nuevoValor === undefined) ||
                                  (valorAnterior !== null && valorAnterior !== undefined && nuevoValor !== null && nuevoValor !== undefined && valorAnterior !== nuevoValor);
        if (valoresDiferentes) {
            agregarAlHistorial('general', {
                hoja: hojaActual,
                fila: filaIdx,
                campo: columna,
                valorAnterior,
                valorNuevo: nuevoValor
            });
        }

        // Preservar bloqueadas y fórmulas si existen (del original)
        const hojaOriginal = datosCompletos.hojas[hojaActual];
        let bloqueadasOriginal = null;
        let formulasOriginal = null;
        
        // Buscar en datos originales para preservar
        const datosOriginalesDiarios = hojaOriginal?.datos_diarios_generales || [];
        const datosOriginalesGenerales = hojaOriginal?.datos_generales || [];
        const filaOriginal = [...datosOriginalesGenerales, ...datosOriginalesDiarios].find(f => f.fila === filaIdx);
        
        if (filaOriginal) {
            if (filaOriginal.bloqueadas) {
                bloqueadasOriginal = JSON.parse(JSON.stringify(filaOriginal.bloqueadas));
            }
            if (filaOriginal.formulas) {
                formulasOriginal = JSON.parse(JSON.stringify(filaOriginal.formulas));
            }
        }
        
        // Actualizar el valor
        console.log(`📝 Actualizando ${columna} en fila ${filaIdx}: ${valorAnterior} -> ${nuevoValor}`);
        filaData[columna] = nuevoValor;

        marcarDirtyRecalculoMasivo();
        
        // Restaurar bloqueadas y fórmulas después de actualizar
        if (bloqueadasOriginal) {
            filaData.bloqueadas = bloqueadasOriginal;
        }
        if (formulasOriginal) {
            filaData.formulas = formulasOriginal;
        }
        
        // IMPORTANTE: Si cambia imp_final, recalcular TODAS las fórmulas de la MISMA fila (benef_euro, benef_porcentaje, etc.)
        // Y también recalcular imp_inicial del día siguiente Y todos los días siguientes en cascada
        // porque imp_inicial(día siguiente) = imp_final(día anterior) + FA(día siguiente)
        // Esto debe funcionar para CUALQUIER día, no solo el día 1
        if (columna === 'imp_final') {
            console.log(`🔄 imp_final cambiado en fila ${filaIdx} (día ${filaData.fecha}), recalculando beneficios y clientes...`);
            
            const hojaEditada = datosEditados?.hojas?.[hojaActual] || hoja;
            const fechaDia = filaData.fecha ? filaData.fecha.split(' ')[0] : null;
            const datosDiariosGen = hoja.datos_diarios_generales || [];
            
            // PRIMERO: Calcular beneficios DIRECTAMENTE (sin depender de fórmulas en datos)
            // Buscar imp_inicial del mismo día (primera fila del día)
            const filasDelDia = datosDiariosGen.filter(d => d.fecha && d.fecha.split(' ')[0] === fechaDia);
            const primeraFilaDia = filasDelDia.reduce((min, f) => (!min || f.fila < min.fila) ? f : min, null);
            const impInicial = primeraFilaDia ? primeraFilaDia.imp_inicial : null;
            const impFinal = filaData.imp_final;
            
            console.log(`🔍 Calculando beneficios para día ${fechaDia}:`);
            console.log(`   imp_inicial (fila ${primeraFilaDia?.fila}): ${impInicial}`);
            console.log(`   imp_final (fila ${filaIdx}): ${impFinal}`);
            
            if (typeof impFinal === 'number' && typeof impInicial === 'number' && impInicial !== 0) {
                // Calcular beneficio euro = imp_final - imp_inicial
                const benefEuro = impFinal - impInicial;
                // Calcular beneficio porcentaje = beneficio / imp_inicial
                const benefPorcentaje = benefEuro / impInicial;
                
                console.log(`   benef_euro: ${benefEuro}`);
                console.log(`   benef_porcentaje: ${benefPorcentaje}`);
                
                // Buscar beneficio acumulado anterior (del día anterior)
                const filasOrdenadas = [...datosDiariosGen].sort((a, b) => (a.fila || 0) - (b.fila || 0));
                const idxFilaActual = filasOrdenadas.findIndex(f => f.fila === filaIdx);
                let benefEuroAcumAnterior = 0;
                
                // Buscar el último benef_euro_acum válido antes de esta fila
                for (let i = idxFilaActual - 1; i >= 0; i--) {
                    if (typeof filasOrdenadas[i].benef_euro_acum === 'number') {
                        benefEuroAcumAnterior = filasOrdenadas[i].benef_euro_acum;
                        break;
                    }
                }
                
                const benefEuroAcum = benefEuro + benefEuroAcumAnterior;

                // Acumulado % (TWR): (1+acum_prev)*(1+benef_%_diario)-1
                let benefPctAcumAnterior = 0;
                for (let i = idxFilaActual - 1; i >= 0; i--) {
                    if (typeof filasOrdenadas[i].benef_porcentaje_acum === 'number') {
                        benefPctAcumAnterior = filasOrdenadas[i].benef_porcentaje_acum;
                        break;
                    }
                }
                const benefPorcentajeAcum = calcularPctAcumuladoTWR(benefPctAcumAnterior, benefPorcentaje);
                
                console.log(`   benef_euro_acum: ${benefEuroAcum}`);
                console.log(`   benef_porcentaje_acum: ${benefPorcentajeAcum}`);
                
                // Actualizar la fila donde se puso imp_final con los beneficios calculados
                filaData.benef_euro = benefEuro;
                filaData.benef_porcentaje = benefPorcentaje;
                filaData.benef_euro_acum = benefEuroAcum;
                filaData.benef_porcentaje_acum = benefPorcentajeAcum;
                
                // Actualizar UI
                actualizarCeldaEnUI(filaIdx, 'benef_euro', benefEuro);
                actualizarCeldaEnUI(filaIdx, 'benef_porcentaje', benefPorcentaje);
                actualizarCeldaEnUI(filaIdx, 'benef_euro_acum', benefEuroAcum);
                actualizarCeldaEnUI(filaIdx, 'benef_porcentaje_acum', benefPorcentajeAcum);
                
                console.log(`✅ Beneficios calculados y actualizados en fila ${filaIdx}`);
            }

            recalcularBeneficiosGeneralesDesdeFila(filaIdx, hoja);
            
            // SEGUNDO: También recalcular fórmulas existentes si las hay
            if (filaData.formulas) {
                Object.keys(filaData.formulas).forEach(columnaConFormula => {
                    if (columnaConFormula !== 'imp_final') {
                        if (['benef_euro', 'benef_porcentaje', 'benef_euro_acum', 'benef_porcentaje_acum'].includes(columnaConFormula)) {
                            return;
                        }
                        const formula = filaData.formulas[columnaConFormula];
                        const nuevoValor = evaluarFormula(formula, filaIdx, hojaEditada);
                        if (nuevoValor !== null && filaData[columnaConFormula] !== nuevoValor) {
                            filaData[columnaConFormula] = nuevoValor;
                            actualizarCeldaEnUI(filaIdx, columnaConFormula, nuevoValor);
                        }
                    }
                });
            }
            
            // TERCERO: Recalcular fórmulas existentes de otras filas del mismo día
            const filasDelDiaGeneral = datosDiariosGen.filter(d => d.fecha && d.fecha.split(' ')[0] === fechaDia);
            filasDelDiaGeneral.forEach(filaDiaData => {
                if (filaDiaData.formulas && filaDiaData.fila !== filaIdx) {
                    Object.keys(filaDiaData.formulas).forEach(col => {
                        if (col !== 'imp_final' && col !== 'imp_inicial') {
                            if (['benef_euro', 'benef_porcentaje', 'benef_euro_acum', 'benef_porcentaje_acum'].includes(col)) {
                                return;
                            }
                            const formula = filaDiaData.formulas[col];
                            const valorAnterior = filaDiaData[col];
                            const nuevoValor = evaluarFormula(formula, filaDiaData.fila, hojaEditada);
                            
                            if (nuevoValor !== null) {
                                const valoresDiferentes = valorAnterior === null || 
                                                         valorAnterior === undefined ||
                                                         Math.abs(nuevoValor - (valorAnterior || 0)) > 0.0001;
                                if (valoresDiferentes) {
                                    console.log(`  Fila ${filaDiaData.fila}, ${col}: ${valorAnterior} -> ${nuevoValor}`);
                                    filaDiaData[col] = nuevoValor;
                                    actualizarCeldaEnUI(filaDiaData.fila, col, nuevoValor);
                                }
                            }
                        }
                    });
                }
            });
            
            // TERCERO: Recalcular desde la fila siguiente (día siguiente) hacia adelante para actualizar imp_inicial de todos los días siguientes
            // skipImpFinal = false porque queremos recalcular todo normalmente (incluyendo imp_final si es necesario)
            await recalcularFormulasGeneralesDesdeFila(filaIdx + 1, hoja, false);
            
            // CUARTO: Calcular valores de TODOS los clientes del MISMO DÍA DIRECTAMENTE
            // IMPORTANTE: No depender de fórmulas existentes, calcular directamente
            if (hoja.clientes && hoja.clientes.length > 0) {
                const fechaDiaClientes = filaData.fecha ? filaData.fecha.split(' ')[0] : null;
                console.log(`🔄 Calculando valores de ${hoja.clientes.length} clientes para día ${fechaDiaClientes}...`);
                
                // Obtener benef_porcentaje de la vista general (ya calculado arriba)
                const benefPorcentajeGeneral = filaData.benef_porcentaje || 0;
                
                let totalCalculadosClientes = 0;
                
                for (let clienteIdx = 0; clienteIdx < hoja.clientes.length; clienteIdx++) {
                    const cliente = hoja.clientes[clienteIdx];
                    const datosDiariosCliente = cliente.datos_diarios || [];
                    
                    // Buscar la fila del cliente para este día (misma fila donde se puso imp_final)
                    const filaDataCliente = datosDiariosCliente.find(d => d.fila === filaIdx);
                    
                    if (filaDataCliente) {
                        // Obtener incremento y decremento del cliente para este día
                        const incremento = typeof filaDataCliente.incremento === 'number' ? filaDataCliente.incremento : 0;
                        const decremento = typeof filaDataCliente.decremento === 'number' ? filaDataCliente.decremento : 0;
                        
                        // Solo calcular si hay incremento o decremento, O si hay imp_final
                        if (incremento > 0 || decremento > 0 || filaData.imp_final) {
                            // Buscar saldo del día anterior
                            const datosDiariosOrdenados = [...datosDiariosCliente].sort((a, b) => (a.fila || 0) - (b.fila || 0));
                            const idxActual = datosDiariosOrdenados.findIndex(d => d.fila === filaIdx);
                            let saldoAnterior = (typeof cliente.saldo_inicial_mes === 'number' && isFinite(cliente.saldo_inicial_mes)) ? cliente.saldo_inicial_mes : 0;
                            
                            for (let i = idxActual - 1; i >= 0; i--) {
                                if (typeof datosDiariosOrdenados[i].saldo_diario === 'number') {
                                    saldoAnterior = datosDiariosOrdenados[i].saldo_diario;
                                    break;
                                }
                            }
                            
                            // Calcular base = saldo_anterior + incremento - decremento
                            const base = saldoAnterior + incremento - decremento;
                            
                            // Calcular beneficio_diario = base * benef_porcentaje_general
                            const beneficioDiario = base * benefPorcentajeGeneral;
                            
                            // Calcular saldo_diario = base + beneficio_diario
                            const saldoDiario = base + beneficioDiario;
                            
                            // Beneficio porcentaje diario = benef_porcentaje_general
                            const beneficioDiarioPct = benefPorcentajeGeneral;
                            
                            // Buscar beneficio acumulado anterior
                            let benefAcumAnterior = 0;
                            for (let i = idxActual - 1; i >= 0; i--) {
                                if (typeof datosDiariosOrdenados[i].beneficio_acumulado === 'number') {
                                    benefAcumAnterior = datosDiariosOrdenados[i].beneficio_acumulado;
                                    break;
                                }
                            }
                            
                            const beneficioAcumulado = beneficioDiario + benefAcumAnterior;
                            
                            // Acumulado % (TWR): (1+acum_prev)*(1+benef_%_diario)-1
                            let benefPctAcumAnterior = 0;
                            for (let i = idxActual - 1; i >= 0; i--) {
                                if (typeof datosDiariosOrdenados[i].beneficio_acumulado_pct === 'number') {
                                    benefPctAcumAnterior = datosDiariosOrdenados[i].beneficio_acumulado_pct;
                                    break;
                                }
                            }
                            const beneficioAcumuladoPct = calcularPctAcumuladoTWR(benefPctAcumAnterior, beneficioDiarioPct);
                            
                            // Actualizar datos del cliente
                            filaDataCliente.base = base;
                            filaDataCliente.saldo_diario = saldoDiario;
                            filaDataCliente.beneficio_diario = beneficioDiario;
                            filaDataCliente.beneficio_diario_pct = beneficioDiarioPct;
                            filaDataCliente.beneficio_acumulado = beneficioAcumulado;
                            filaDataCliente.beneficio_acumulado_pct = beneficioAcumuladoPct;
                            
                            console.log(`  Cliente ${clienteIdx + 1}, Fila ${filaIdx}: base=${base.toFixed(2)}, saldo=${saldoDiario.toFixed(2)}, benef=${beneficioDiario.toFixed(2)}`);
                            
                            // Actualizar UI
                            actualizarCeldaClienteEnUI(clienteIdx, filaIdx, 'base', base);
                            actualizarCeldaClienteEnUI(clienteIdx, filaIdx, 'saldo_diario', saldoDiario);
                            actualizarCeldaClienteEnUI(clienteIdx, filaIdx, 'beneficio_diario', beneficioDiario);
                            actualizarCeldaClienteEnUI(clienteIdx, filaIdx, 'beneficio_diario_pct', beneficioDiarioPct);
                            actualizarCeldaClienteEnUI(clienteIdx, filaIdx, 'beneficio_acumulado', beneficioAcumulado);
                            actualizarCeldaClienteEnUI(clienteIdx, filaIdx, 'beneficio_acumulado_pct', beneficioAcumuladoPct);
                            
                            totalCalculadosClientes++;
                        }
                    }
                }
                
                console.log(`✅ Calculados valores de ${totalCalculadosClientes} clientes para día ${fechaDiaClientes}`);
            }
            
            // QUINTO: Copiar automáticamente valores a fines de semana (sábado y domingo)
            // Si el día actual es VIERNES, copiar imp_final al sábado y domingo siguientes
            const fechaActual = parsearFechaValor(filaData.fecha);
            if (fechaActual) {
                const diaSemana = fechaActual.getDay(); // 0=domingo, 1=lunes, ..., 5=viernes, 6=sábado
                
                // Si es viernes (5), copiar al sábado y domingo
                if (diaSemana === 5) {
                    console.log(`📅 Es viernes, copiando imp_final=${nuevoValor} al sábado y domingo...`);
                    await copiarValorAFinDeSemana(filaIdx, nuevoValor, hoja, datosDiariosGen);
                }
            }
        } else {
            // Para otras columnas, usar el método normal
            await recalcularFormulasDependientes(filaIdx, columna, hoja);
        }

        // Guardar siempre los cambios generales
        await guardarDatosAutomatico(0, 0);
        if (!__isUndoRedo) {
            mostrarNotificacion('✓ Cambio guardado automáticamente', 'success');
        }
    } else {
        console.error('No se encontró la fila:', filaIdx, 'en', hojaActual);
    }
}

// Copiar valor de imp_final del viernes al sábado y domingo (fines de semana bloqueados)
async function copiarValorAFinDeSemana(filaViernes, valorImpFinal, hoja, datosDiariosGen) {
    const filaViernesData = datosDiariosGen.find(d => d.fila === filaViernes);
    if (!filaViernesData || !filaViernesData.fecha) return;
    
    const fechaViernes = parsearFechaValor(filaViernesData.fecha);
    if (!fechaViernes || fechaViernes.getDay() !== 5) return; // Verificar que es viernes
    
    // Calcular fechas de sábado y domingo
    const fechaSabado = new Date(fechaViernes);
    fechaSabado.setDate(fechaSabado.getDate() + 1);
    
    const fechaDomingo = new Date(fechaViernes);
    fechaDomingo.setDate(fechaDomingo.getDate() + 2);
    
    console.log(`   📅 Viernes detectado: ${filaViernesData.fecha}`);
    console.log(`   Buscando sábado y domingo...`);
    
    // Buscar filas de sábado y domingo comparando las fechas parseadas
    const filaSabadoData = datosDiariosGen.find(d => {
        if (!d.fecha) return false;
        const fechaD = parsearFechaValor(d.fecha);
        if (!fechaD) return false;
        return fechaD.getFullYear() === fechaSabado.getFullYear() &&
               fechaD.getMonth() === fechaSabado.getMonth() &&
               fechaD.getDate() === fechaSabado.getDate();
    });
    
    const filaDomingoData = datosDiariosGen.find(d => {
        if (!d.fecha) return false;
        const fechaD = parsearFechaValor(d.fecha);
        if (!fechaD) return false;
        return fechaD.getFullYear() === fechaDomingo.getFullYear() &&
               fechaD.getMonth() === fechaDomingo.getMonth() &&
               fechaD.getDate() === fechaDomingo.getDate();
    });
    
    // Obtener los acumulados del viernes para mantenerlos
    const acumEuroViernes = filaViernesData.benef_euro_acum;
    const acumPctViernes = filaViernesData.benef_porcentaje_acum;
    
    // Copiar valores al sábado
    if (filaSabadoData) {
        console.log(`   📅 Copiando a sábado fila ${filaSabadoData.fila} (${filaSabadoData.fecha})`);
        console.log(`      imp_inicial=${valorImpFinal}, imp_final=${valorImpFinal}`);
        
        filaSabadoData.imp_inicial = valorImpFinal;
        filaSabadoData.imp_final = valorImpFinal;
        filaSabadoData.benef_euro = 0;
        filaSabadoData.benef_porcentaje = 0;
        filaSabadoData.benef_euro_acum = acumEuroViernes;
        filaSabadoData.benef_porcentaje_acum = acumPctViernes;
        
        actualizarCeldaEnUI(filaSabadoData.fila, 'imp_inicial', valorImpFinal);
        actualizarCeldaEnUI(filaSabadoData.fila, 'imp_final', valorImpFinal);
        actualizarCeldaEnUI(filaSabadoData.fila, 'benef_euro', 0);
        actualizarCeldaEnUI(filaSabadoData.fila, 'benef_porcentaje', 0);
        actualizarCeldaEnUI(filaSabadoData.fila, 'benef_euro_acum', acumEuroViernes);
        actualizarCeldaEnUI(filaSabadoData.fila, 'benef_porcentaje_acum', acumPctViernes);
    } else {
        console.log(`   ⚠️ No se encontró fila de sábado`);
    }
    
    // Copiar valores al domingo
    if (filaDomingoData) {
        console.log(`   📅 Copiando a domingo fila ${filaDomingoData.fila} (${filaDomingoData.fecha})`);
        console.log(`      imp_inicial=${valorImpFinal}, imp_final=${valorImpFinal}`);
        
        filaDomingoData.imp_inicial = valorImpFinal;
        filaDomingoData.imp_final = valorImpFinal;
        filaDomingoData.benef_euro = 0;
        filaDomingoData.benef_porcentaje = 0;
        filaDomingoData.benef_euro_acum = acumEuroViernes;
        filaDomingoData.benef_porcentaje_acum = acumPctViernes;
        
        actualizarCeldaEnUI(filaDomingoData.fila, 'imp_inicial', valorImpFinal);
        actualizarCeldaEnUI(filaDomingoData.fila, 'imp_final', valorImpFinal);
        actualizarCeldaEnUI(filaDomingoData.fila, 'benef_euro', 0);
        actualizarCeldaEnUI(filaDomingoData.fila, 'benef_porcentaje', 0);
        actualizarCeldaEnUI(filaDomingoData.fila, 'benef_euro_acum', acumEuroViernes);
        actualizarCeldaEnUI(filaDomingoData.fila, 'benef_porcentaje_acum', acumPctViernes);
    } else {
        console.log(`   ⚠️ No se encontró fila de domingo`);
    }
    
    // El lunes se calculará automáticamente con recalcularFormulasGeneralesDesdeFila
    // imp_inicial_lunes = imp_final_domingo + FA_lunes
    console.log(`   ✅ Fin de semana actualizado. El lunes calculará imp_inicial = ${valorImpFinal} + FA_lunes`);
}

// Actualizar selector de clientes
function actualizarSelectorClientes() {
    const selector = document.getElementById('selectorCliente');
    selector.innerHTML = '<option value="">-- Selecciona un Cliente --</option>';
    
    if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[hojaActual]) {
        return;
    }
    
    const hoja = datosEditados.hojas[hojaActual];
    const clientes = hoja.clientes || [];
    
    clientes.forEach((cliente, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Cliente ${cliente.numero_cliente}`;
        selector.appendChild(option);
    });
}

// Seleccionar cliente desde el dropdown
function seleccionarCliente() {
    const selector = document.getElementById('selectorCliente');
    const index = parseInt(selector.value);
    
    if (isNaN(index) || index < 0) {
        return;
    }
    
    void mostrarDetalleCliente(index);
}

// Mostrar vista clientes
function mostrarVistaClientes() {
    vistaActual = 'clientes';
    
    // Ocultar TODAS las otras vistas
    document.getElementById('vistaGeneral').classList.remove('active');
    document.getElementById('vistaClientes').classList.add('active');
    document.getElementById('vistaDetalle').classList.remove('active');
    const vistaInfo = document.getElementById('vistaInfoClientes');
    if (vistaInfo) vistaInfo.classList.remove('active');
    const vistaComision = document.getElementById('vistaComision');
    if (vistaComision) vistaComision.classList.remove('active');
    const vistaEstadisticas = document.getElementById('vistaEstadisticas');
    if (vistaEstadisticas) vistaEstadisticas.classList.remove('active');
    document.getElementById('selectorCliente').value = '';
    
    // Actualizar botones
    document.getElementById('btnVistaGeneral').classList.remove('active');
    document.getElementById('btnVistaClientes').classList.add('active');
    const btnInfo = document.getElementById('btnVistaInfoClientes');
    if (btnInfo) btnInfo.classList.remove('active');
    const btnComision = document.getElementById('btnVistaComision');
    if (btnComision) btnComision.classList.remove('active');
    const btnEstadisticas = document.getElementById('btnVistaEstadisticas');
    if (btnEstadisticas) btnEstadisticas.classList.remove('active');
    
    if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[hojaActual]) {
        return;
    }
    
    const hoja = datosEditados.hojas[hojaActual];
    const clientes_calculados = hoja.clientes || [];
    
    // Actualizar estadísticas
    document.getElementById('totalClientes').textContent = clientes_calculados.length;
    
    // Actualizar selector de clientes
    actualizarSelectorClientes();

    renderVistaClientes();
}

function numeroAColumna(num) {
    let n = num;
    let s = '';
    while (n > 0) {
        const r = (n - 1) % 26;
        s = String.fromCharCode(65 + r) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

function columnaANumero(col) {
    let num = 0;
    for (let i = 0; i < col.length; i++) {
        num = num * 26 + (col.charCodeAt(i) - 64);
    }
    return num;
}

function desplazarFormulaCliente(formula, colInicioBloque, colFinBloque, deltaCols) {
    if (!formula || typeof formula !== 'string' || deltaCols === 0) return formula;

    const re = /(\$?)([A-Z]+)(\$?)(\d+):(\$?)([A-Z]+)(\$?)(\d+)|(\$?)([A-Z]+)(\$?)(\d+)/g;
    return formula.replace(re, (match, a1, col1, b1, row1, a2, col2, b2, row2, a3, col3, b3, row3) => {
        if (col1 && row1 && col2 && row2) {
            const n1 = columnaANumero(col1);
            const n2 = columnaANumero(col2);
            const nn1 = (n1 >= colInicioBloque && n1 <= colFinBloque) ? (n1 + deltaCols) : n1;
            const nn2 = (n2 >= colInicioBloque && n2 <= colFinBloque) ? (n2 + deltaCols) : n2;
            return `${a1 || ''}${numeroAColumna(nn1)}${b1 || ''}${row1}:${a2 || ''}${numeroAColumna(nn2)}${b2 || ''}${row2}`;
        }
        if (col3 && row3) {
            const n = columnaANumero(col3);
            const nn = (n >= colInicioBloque && n <= colFinBloque) ? (n + deltaCols) : n;
            return `${a3 || ''}${numeroAColumna(nn)}${b3 || ''}${row3}`;
        }
        return match;
    });
}

function obtenerSaldoActualClienteSinLogs(cliente) {
    const datos = (cliente?.datos_diarios || [])
        .filter(d => d && d.fila >= 15 && d.fila <= 1120 && typeof d.saldo_diario === 'number')
        .sort((a, b) => (a.fila || 0) - (b.fila || 0));

    if (datos.length === 0) {
        return (cliente && typeof cliente.saldo_inicial_mes === 'number') ? cliente.saldo_inicial_mes : 0;
    }
    return datos[datos.length - 1].saldo_diario;
}

function obtenerGarantiaActualCliente(cliente) {
    const datosCliente = cliente?.datos || {};
    const gIniRaw = datosCliente['GARANTIA_INICIAL']?.valor ?? datosCliente['GARANTIA']?.valor ?? 0;
    const gIni = typeof gIniRaw === 'number' ? gIniRaw : (parseFloat(gIniRaw) || 0);
    const retirado = typeof cliente?.decrementos_total === 'number' ? cliente.decrementos_total : 0;
    return Math.max(0, gIni - retirado);
}

function calcularComisionSiRetiraTodoHoy(cliente) {
    if (!cliente) return 0;
    if (!cliente.incrementos_total && cliente.datos_diarios) {
        recalcularTotalesCliente(cliente);
    }
    const inc = typeof cliente.incrementos_total === 'number' ? cliente.incrementos_total : 0;
    const dec = typeof cliente.decrementos_total === 'number' ? cliente.decrementos_total : 0;
    const saldo = obtenerSaldoActualClienteSinLogs(cliente);
    const totalDecSiRetira = dec + Math.max(0, saldo);
    const exceso = Math.max(0, totalDecSiRetira - inc);
    return exceso * 0.05;
}

function calcularDetalleComisionesCobradas(cliente) {
    if (!cliente) return { totalCobrada: 0, eventos: [] };

    if (!cliente.incrementos_total && cliente.datos_diarios) {
        recalcularTotalesCliente(cliente);
    }

    let acumuladoIncrementos = typeof cliente._acumPrevInc === 'number' ? cliente._acumPrevInc : 0;
    let acumuladoDecrementos = typeof cliente._acumPrevDec === 'number' ? cliente._acumPrevDec : 0;
    const eventos = [];

    const datosOrdenados = [...(cliente.datos_diarios || [])]
        .filter(d => d && d.fila >= 15 && d.fila <= 1120)
        .sort((a, b) => (a.fila || 0) - (b.fila || 0));

    for (const d of datosOrdenados) {
        const inc = typeof d.incremento === 'number' ? d.incremento : 0;
        const dec = typeof d.decremento === 'number' ? d.decremento : 0;

        const incPrev = acumuladoIncrementos;
        const decPrev = acumuladoDecrementos;

        acumuladoIncrementos += inc;
        acumuladoDecrementos += dec;

        if (dec > 0) {
            const excesoPrev = Math.max(0, decPrev - incPrev);
            const excesoNow = Math.max(0, acumuladoDecrementos - acumuladoIncrementos);
            const excesoEsteDecremento = Math.max(0, excesoNow - excesoPrev);
            if (excesoEsteDecremento > 0) {
                eventos.push({
                    fila: d.fila,
                    fecha: d.fecha || null,
                    decremento: dec,
                    exceso: excesoEsteDecremento,
                    comision: excesoEsteDecremento * 0.05
                });
            }
        }
    }

    const totalCobrada = eventos.reduce((acc, e) => acc + (typeof e.comision === 'number' ? e.comision : 0), 0);
    return { totalCobrada, eventos };
}

function renderVistaClientes() {
    // Usar clientes anuales si están disponibles, sino usar del mes actual
    let clientes = [];
    
    if (clientesAnuales && clientesAnuales.length > 0) {
        // MODO ANUAL: Usar lista de clientes del año completo
        clientes = clientesAnuales.map((clienteAnual, idx) => {
            // Agregar datos de TODOS los meses para este cliente
            const hoja = datosEditados?.hojas?.[hojaActual];
            const clienteMes = hoja?.clientes?.[idx];
            
            // Combinar datos anuales con datos del mes actual
            // CRÍTICO: También copiar 'datos' del mes que tiene garantía actualizada
            return {
                ...clienteAnual,
                // Datos del cliente (nombre, garantía, etc.) - priorizar datos del mes actual
                datos: clienteMes?.datos || clienteAnual?.datos || {},
                // Datos mensuales (incrementos, decrementos, saldo)
                incrementos_total: clienteMes?.incrementos_total || 0,
                decrementos_total: clienteMes?.decrementos_total || 0,
                saldo_actual: clienteMes?.saldo_actual || 0,
                datos_diarios: clienteMes?.datos_diarios || [],
                _acumPrevInc: clienteMes?._acumPrevInc || 0,
                _acumPrevDec: clienteMes?._acumPrevDec || 0,
                saldo_inicial_mes: clienteMes?.saldo_inicial_mes || 0
            };
        });
    } else {
        // MODO MENSUAL (fallback): Usar clientes del mes actual
        const hoja = datosEditados?.hojas?.[hojaActual];
        if (!hoja) return;
        clientes = hoja.clientes || [];
    }

    // Obtener hoja para cálculos de proporción
    const hoja = datosEditados?.hojas?.[hojaActual];

    const selectorPlantilla = document.getElementById('selectorPlantillaCliente');
    if (selectorPlantilla) {
        const prev = selectorPlantilla.value;
        selectorPlantilla.innerHTML = '<option value="">Plantilla: último cliente</option>';
        clientes.forEach((c, idx) => {
            const opt = document.createElement('option');
            opt.value = String(idx);
            const nombre = c?.datos?.['NOMBRE']?.valor || '';
            const apellidos = c?.datos?.['APELLIDOS']?.valor || '';
            const nombreCompleto = (nombre || apellidos) ? `${nombre} ${apellidos}`.trim() : '';
            opt.textContent = nombreCompleto ? `Cliente ${c.numero_cliente} - ${nombreCompleto}` : `Cliente ${c.numero_cliente}`;
            selectorPlantilla.appendChild(opt);
        });
        selectorPlantilla.value = prev;
    }

    const ordenSel = document.getElementById('ordenClientes');
    const orden = ordenSel?.value || 'saldo_desc';

    const qRaw = document.getElementById('buscarCliente')?.value || '';
    const q = qRaw.trim().toLowerCase();

    let items = clientes.map((c, idx) => {
        if (!c.incrementos_total && c.datos_diarios) {
            recalcularTotalesCliente(c);
        }
        const saldo = obtenerSaldoActualClienteSinLogs(c);
        const garantiaPendiente = obtenerGarantiaActualCliente(c);
        const comisionSiRetira = calcularComisionSiRetiraTodoHoy(c);

        const inc = typeof c.incrementos_total === 'number' ? c.incrementos_total : 0;
        const dec = typeof c.decrementos_total === 'number' ? c.decrementos_total : 0;
        const excesoYaRetirado = Math.max(0, dec - inc);
        const comisionCobrada = excesoYaRetirado * 0.05;
        const comisionPendiente = Math.max(0, comisionSiRetira - comisionCobrada);

        return { idx, cliente: c, saldo, garantiaPendiente, comisionSiRetira, comisionCobrada, comisionPendiente, inc, dec };
    });

    if (q) {
        items = items.filter(it => {
            const c = it.cliente;
            const nombre = String(c?.datos?.['NOMBRE']?.valor || '').toLowerCase();
            const apellidos = String(c?.datos?.['APELLIDOS']?.valor || '').toLowerCase();
            const n = String(c?.numero_cliente ?? '').toLowerCase();
            const full = `${nombre} ${apellidos}`.trim();
            return n.includes(q) || nombre.includes(q) || apellidos.includes(q) || full.includes(q);
        });
    }

    items.sort((a, b) => {
        const aNum = typeof a.cliente?.numero_cliente === 'number' ? a.cliente.numero_cliente : (a.idx + 1);
        const bNum = typeof b.cliente?.numero_cliente === 'number' ? b.cliente.numero_cliente : (b.idx + 1);
        const aSaldo = typeof a.saldo === 'number' ? a.saldo : 0;
        const bSaldo = typeof b.saldo === 'number' ? b.saldo : 0;
        const aCom = typeof a.comisionSiRetira === 'number' ? a.comisionSiRetira : 0;
        const bCom = typeof b.comisionSiRetira === 'number' ? b.comisionSiRetira : 0;
        const aGar = typeof a.garantiaPendiente === 'number' ? a.garantiaPendiente : 0;
        const bGar = typeof b.garantiaPendiente === 'number' ? b.garantiaPendiente : 0;

        switch (orden) {
            case 'numero_asc':
                return aNum - bNum;
            case 'numero_desc':
                return bNum - aNum;
            case 'saldo_asc':
                return aSaldo - bSaldo;
            case 'saldo_desc':
                return bSaldo - aSaldo;
            case 'comision_desc':
                return bCom - aCom;
            case 'comision_asc':
                return aCom - bCom;
            case 'garantia_asc':
                return aGar - bGar;
            case 'garantia_desc':
                return bGar - aGar;
            default:
                return bSaldo - aSaldo;
        }
    });

    const totalGarantias = items.reduce((acc, it) => acc + (typeof it.garantiaPendiente === 'number' ? it.garantiaPendiente : 0), 0);
    const totalComisionSiRetiran = items.reduce((acc, it) => acc + (typeof it.comisionSiRetira === 'number' ? it.comisionSiRetira : 0), 0);

    const kpiContainer = document.getElementById('clientesKpis');
    if (kpiContainer) {
        const showCom = totalComisionSiRetiran > 0;
        const showGar = totalGarantias > 0;
        kpiContainer.innerHTML = `
            <div class="summary-card-premium">
                <div class="card-icon">💸</div>
                <div class="card-content">
                    <div class="kpi-card-header">
                        <div>
                            <div class="card-label">Comisión si todos retiran hoy</div>
                            <div class="card-value">${formatearMoneda(totalComisionSiRetiran)}</div>
                        </div>
                        ${showCom ? '<button class="kpi-expand-btn" type="button" data-kpi="comision">Detalles</button>' : ''}
                    </div>
                    <div class="kpi-breakdown" id="kpiBreakdownComision"></div>
                </div>
            </div>
            <div class="summary-card-premium">
                <div class="card-icon">🛡️</div>
                <div class="card-content">
                    <div class="kpi-card-header">
                        <div>
                            <div class="card-label">Total Garantías</div>
                            <div class="card-value">${formatearMoneda(totalGarantias)}</div>
                        </div>
                        ${showGar ? '<button class="kpi-expand-btn" type="button" data-kpi="garantias">Detalles</button>' : ''}
                    </div>
                    <div class="kpi-breakdown" id="kpiBreakdownGarantias"></div>
                </div>
            </div>
        `;

        const btnCom = kpiContainer.querySelector('[data-kpi="comision"]');
        const btnGar = kpiContainer.querySelector('[data-kpi="garantias"]');
        const bdCom = document.getElementById('kpiBreakdownComision');
        const bdGar = document.getElementById('kpiBreakdownGarantias');

        if (btnCom && bdCom) {
            btnCom.addEventListener('click', () => {
                const opening = !bdCom.classList.contains('open');
                bdCom.classList.toggle('open');
                btnCom.textContent = opening ? 'Ocultar' : 'Detalles';

                if (opening && !bdCom.hasAttribute('data-loaded')) {
                    const byCom = [...items]
                        .filter(it => (it.comisionSiRetira || 0) > 0)
                        .sort((a, b) => (b.comisionSiRetira || 0) - (a.comisionSiRetira || 0));
                    if (byCom.length === 0) {
                        bdCom.innerHTML = '<div class="kpi-breakdown-sub">No hay clientes con comisión &gt; 0€.</div>';
                        bdCom.setAttribute('data-loaded', 'true');
                        return;
                    }
                    bdCom.innerHTML = byCom.map(it => {
                        const c = it.cliente;
                        const nombre = c?.datos?.['NOMBRE']?.valor || '';
                        const apellidos = c?.datos?.['APELLIDOS']?.valor || '';
                        const nombreCompleto = (nombre || apellidos) ? `${nombre} ${apellidos}`.trim() : '';
                        const title = nombreCompleto ? `Cliente ${c.numero_cliente} - ${nombreCompleto}` : `Cliente ${c.numero_cliente}`;

                        const saldo = typeof it.saldo === 'number' ? it.saldo : 0;
                        const totalRetiraHoy = it.dec + Math.max(0, saldo);
                        const excesoHoy = Math.max(0, totalRetiraHoy - it.inc);

                        return `
                            <div class="kpi-breakdown-item">
                                <div class="kpi-breakdown-title">${title}</div>
                                <div><strong>${formatearMoneda(it.comisionSiRetira)}</strong></div>
                                <div class="kpi-breakdown-sub">
                                    Invertido: ${formatearMoneda(it.inc)} | Retirado: ${formatearMoneda(it.dec)} | Saldo hoy: ${formatearMoneda(saldo)}
                                    <br>
                                    Si retira hoy: ${formatearMoneda(totalRetiraHoy)} | Exceso sobre invertido: ${formatearMoneda(excesoHoy)} | Comisión 5%: ${formatearMoneda(it.comisionSiRetira)}
                                </div>
                            </div>
                        `;
                    }).join('');
                    bdCom.setAttribute('data-loaded', 'true');
                }
            });
        }

        if (btnGar && bdGar) {
            btnGar.addEventListener('click', () => {
                const opening = !bdGar.classList.contains('open');
                bdGar.classList.toggle('open');
                btnGar.textContent = opening ? 'Ocultar' : 'Detalles';

                if (opening && !bdGar.hasAttribute('data-loaded')) {
                    const byGar = [...items]
                        .filter(it => (it.garantiaPendiente || 0) > 0)
                        .sort((a, b) => (b.garantiaPendiente || 0) - (a.garantiaPendiente || 0));
                    if (byGar.length === 0) {
                        bdGar.innerHTML = '<div class="kpi-breakdown-sub">No hay clientes con garantía &gt; 0€.</div>';
                        bdGar.setAttribute('data-loaded', 'true');
                        return;
                    }
                    bdGar.innerHTML = byGar.map(it => {
                        const c = it.cliente;
                        const nombre = c?.datos?.['NOMBRE']?.valor || '';
                        const apellidos = c?.datos?.['APELLIDOS']?.valor || '';
                        const nombreCompleto = (nombre || apellidos) ? `${nombre} ${apellidos}`.trim() : '';
                        const title = nombreCompleto ? `Cliente ${c.numero_cliente} - ${nombreCompleto}` : `Cliente ${c.numero_cliente}`;

                        const datosCliente = c?.datos || {};
                        const gIniRaw = datosCliente['GARANTIA_INICIAL']?.valor ?? datosCliente['GARANTIA']?.valor ?? 0;
                        const gIni = typeof gIniRaw === 'number' ? gIniRaw : (parseFloat(gIniRaw) || 0);
                        const retirado = typeof it.dec === 'number' ? it.dec : 0;
                        const gAct = typeof it.garantiaPendiente === 'number' ? it.garantiaPendiente : 0;

                        return `
                            <div class="kpi-breakdown-item">
                                <div class="kpi-breakdown-title">${title}</div>
                                <div><strong>${formatearMoneda(gAct)}</strong></div>
                                <div class="kpi-breakdown-sub">
                                    Garantía inicial: ${formatearMoneda(gIni)} | Retirado: ${formatearMoneda(retirado)}
                                    <br>
                                    Garantía pendiente = max(0, garantía inicial - retirado) = ${formatearMoneda(gAct)}
                                </div>
                            </div>
                        `;
                    }).join('');
                    bdGar.setAttribute('data-loaded', 'true');
                }
            });
        }
    }

    const cardsContainer = document.getElementById('clientesCards');
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';

    const fechaObjetivoProporcion = hoja ? obtenerUltimaFechaImpFinalManual(hoja) : null;
    const totalSaldosProporcion = (hoja && fechaObjetivoProporcion)
        ? obtenerTotalSaldosClientesEnFecha(hoja, fechaObjetivoProporcion)
        : null;
    const fechaObjetivoProporcionTexto = fechaObjetivoProporcion ? formatearFecha(fechaObjetivoProporcion) : null;

    const totalClientesEl = document.getElementById('totalClientes');
    if (totalClientesEl) totalClientesEl.textContent = String(items.length);

    items.forEach(it => {
        const c = it.cliente;
        const nombre = c?.datos?.['NOMBRE']?.valor || '';
        const apellidos = c?.datos?.['APELLIDOS']?.valor || '';
        const nombreCompleto = (nombre || apellidos) ? `${nombre} ${apellidos}`.trim() : '';
        const title = nombreCompleto ? `Cliente ${c.numero_cliente} - ${nombreCompleto}` : `Cliente ${c.numero_cliente}`;

        const saldoProporcion = (c && fechaObjetivoProporcion)
            ? obtenerSaldoClienteEnFecha(c, fechaObjetivoProporcion)
            : null;
        const proporcion = (totalSaldosProporcion && totalSaldosProporcion !== 0 && typeof saldoProporcion === 'number')
            ? (saldoProporcion / totalSaldosProporcion)
            : null;
        const proporcionLabel = (proporcion !== null)
            ? `${formatearPorcentaje(proporcion)}${fechaObjetivoProporcionTexto ? ` (${fechaObjetivoProporcionTexto})` : ''}`
            : '';

        const card = document.createElement('div');
        card.className = 'cliente-card-mini';
        card.dataset.clienteIndex = String(it.idx);
        card.innerHTML = `
            <div class="cliente-card-title">${title}</div>
            <div class="cliente-card-row"><div class="cliente-card-k">Saldo</div><div class="cliente-card-v ${it.saldo >= 0 ? 'positive' : 'negative'}">${formatearMoneda(it.saldo)}</div></div>
            <div class="cliente-card-row"><div class="cliente-card-k">Garantía pendiente</div><div class="cliente-card-v">${formatearMoneda(it.garantiaPendiente)}</div></div>
            <div class="cliente-card-row"><div class="cliente-card-k">Comisión (si retira)</div><div class="cliente-card-v">${formatearMoneda(it.comisionSiRetira)}</div></div>
            <div class="cliente-card-row"><div class="cliente-card-k">Comisión ya cobrada</div><div class="cliente-card-v">${formatearMoneda(it.comisionCobrada)}</div></div>
            ${proporcionLabel ? `<div class=\"cliente-card-row\"><div class=\"cliente-card-k\">Proporción del total</div><div class=\"cliente-card-v\">${proporcionLabel}</div></div>` : ''}
        `;
        card.addEventListener('click', () => {
            void mostrarDetalleCliente(it.idx);
        });
        cardsContainer.appendChild(card);
    });
}

async function agregarNuevoClienteDesdeUI() {
    const hoja = datosEditados?.hojas?.[hojaActual];
    if (!hoja) return;
    const clientes = hoja.clientes || [];
    if (clientes.length === 0) {
        mostrarNotificacion('No hay clientes para usar como plantilla', 'error');
        return;
    }

    const selectorPlantilla = document.getElementById('selectorPlantillaCliente');
    const idxPlantilla = selectorPlantilla && selectorPlantilla.value !== ''
        ? parseInt(selectorPlantilla.value)
        : (clientes.length - 1);

    const plantillaIdxSegura = !isNaN(idxPlantilla) && idxPlantilla >= 0 && idxPlantilla < clientes.length
        ? idxPlantilla
        : (clientes.length - 1);

    const plantilla = clientes[plantillaIdxSegura];
    const nuevo = JSON.parse(JSON.stringify(plantilla));

    const maxNumero = clientes.reduce((m, c) => Math.max(m, typeof c?.numero_cliente === 'number' ? c.numero_cliente : 0), 0);
    nuevo.numero_cliente = maxNumero + 1;
    nuevo.incrementos_total = 0;
    nuevo.decrementos_total = 0;
    nuevo.saldo_actual = 0;

    const nuevoIdx = clientes.length;
    const colStartPlantilla = 11 + (plantillaIdxSegura * 8);
    const colEndPlantilla = colStartPlantilla + 7;
    const deltaCols = (nuevoIdx - plantillaIdxSegura) * 8;

    if (nuevo.datos_diarios && Array.isArray(nuevo.datos_diarios)) {
        nuevo.datos_diarios.forEach(filaData => {
            if (!filaData || !filaData.formulas) return;
            Object.keys(filaData.formulas).forEach(campo => {
                filaData.formulas[campo] = desplazarFormulaCliente(filaData.formulas[campo], colStartPlantilla, colEndPlantilla, deltaCols);
            });

            // IMPORTANTE: cliente nuevo debe empezar sin actividad: dejar fórmulas pero vaciar valores
            // para evitar que se hereden importes de la plantilla.
            ['incremento', 'decremento', 'base', 'saldo_diario', 'beneficio_diario', 'beneficio_diario_pct', 'beneficio_acumulado', 'beneficio_acumulado_pct']
                .forEach(campo => {
                    if (typeof filaData[campo] === 'number') {
                        filaData[campo] = null;
                    }
                });
        });
    }

    nuevo.columna_inicio = (11 + (nuevoIdx * 8));

    clientes.push(nuevo);
    hoja.clientes = clientes;

    actualizarSelectorClientes();
    renderVistaClientes();
    await guardarDatosAutomatico(0, 0);
    mostrarNotificacion(`✓ Cliente ${nuevo.numero_cliente} agregado`, 'success');
}

async function eliminarClienteActualDesdeUI() {
    if (clienteActual === null || clienteActual === undefined) {
        mostrarNotificacion('No hay cliente seleccionado para eliminar', 'error');
        return;
    }
    const hoja = datosEditados?.hojas?.[hojaActual];
    if (!hoja || !Array.isArray(hoja.clientes)) return;

    const idx = parseInt(clienteActual);
    const cliente = hoja.clientes[idx];
    if (!cliente) return;

    const nombre = cliente?.datos?.['NOMBRE']?.valor || '';
    const apellidos = cliente?.datos?.['APELLIDOS']?.valor || '';
    const nombreCompleto = (nombre || apellidos) ? `${nombre} ${apellidos}`.trim() : '';
    const label = nombreCompleto ? `Cliente ${cliente.numero_cliente} - ${nombreCompleto}` : `Cliente ${cliente.numero_cliente}`;

    const ok = window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`);
    if (!ok) return;

    // Si borramos un cliente en medio, hay que desplazar las fórmulas de los clientes posteriores (mueven -8 columnas)
    for (let i = idx + 1; i < hoja.clientes.length; i++) {
        const c = hoja.clientes[i];
        if (!c || !Array.isArray(c.datos_diarios)) continue;
        const colStartAntes = 11 + (i * 8);
        const colEndAntes = colStartAntes + 7;
        const deltaCols = -8;
        c.datos_diarios.forEach(filaData => {
            if (!filaData || !filaData.formulas) return;
            Object.keys(filaData.formulas).forEach(campo => {
                filaData.formulas[campo] = desplazarFormulaCliente(filaData.formulas[campo], colStartAntes, colEndAntes, deltaCols);
            });
        });
    }

    hoja.clientes.splice(idx, 1);

    // Renumerar para mantener continuidad visual
    hoja.clientes.forEach((c, i) => {
        if (c) c.numero_cliente = i + 1;
        if (c) c.columna_inicio = 11 + (i * 8);
    });

    clienteActual = null;
    actualizarSelectorClientes();
    renderVistaClientes();
    mostrarVistaClientes();
    await guardarDatosAutomatico(0, 0);
    mostrarNotificacion('✓ Cliente eliminado', 'success');
}


function renderDetalleCliente(index) {
    vistaActual = 'detalle';
    clienteActual = index;
    
    document.getElementById('vistaGeneral').classList.remove('active');
    document.getElementById('vistaClientes').classList.remove('active');
    document.getElementById('vistaDetalle').classList.add('active');
    const vistaInfo = document.getElementById('vistaInfoClientes');
    if (vistaInfo) vistaInfo.classList.remove('active');
    const vistaComision = document.getElementById('vistaComision');
    if (vistaComision) vistaComision.classList.remove('active');
    const vistaEstadisticas = document.getElementById('vistaEstadisticas');
    if (vistaEstadisticas) vistaEstadisticas.classList.remove('active');
    
    // Deseleccionar todos los botones de navegación
    document.getElementById('btnVistaGeneral').classList.remove('active');
    document.getElementById('btnVistaClientes').classList.remove('active');
    const btnInfo = document.getElementById('btnVistaInfoClientes');
    if (btnInfo) btnInfo.classList.remove('active');
    const btnComision = document.getElementById('btnVistaComision');
    if (btnComision) btnComision.classList.remove('active');
    const btnEstadisticas = document.getElementById('btnVistaEstadisticas');
    if (btnEstadisticas) btnEstadisticas.classList.remove('active');
    
    document.getElementById('selectorCliente').value = index;
    
    const hoja = datosEditados.hojas[hojaActual];
    
    // Buscar el cliente en la lista de clientes calculados
    const cliente_calculado = hoja.clientes && hoja.clientes[index] ? hoja.clientes[index] : null;
    
    if (cliente_calculado) {
        // Mostrar "Cliente X - Nombre Apellidos" si tiene datos de ficha
        const datosCliente = cliente_calculado.datos || {};
        const nombre = datosCliente['NOMBRE']?.valor || '';
        const apellidos = datosCliente['APELLIDOS']?.valor || '';
        const nombreCompleto = (nombre || apellidos) ? ` - ${nombre} ${apellidos}`.trim() : '';
        document.getElementById('numeroCliente').textContent = cliente_calculado.numero_cliente + nombreCompleto;
        
        // IMPORTANTE: Recalcular TODAS las fórmulas del cliente antes de mostrarlas
        // porque las fórmulas dependen de valores de la vista general que pueden haber cambiado
        const necesitaRecalculoFormulas = cliente_calculado._lastFormulasVersion !== __recalculoVersion;
        if (necesitaRecalculoFormulas) {
            console.log(`🔄 Recalculando todas las fórmulas del cliente ${index + 1} antes de mostrar...`);
            recalcularTodasFormulasCliente(cliente_calculado, index, hoja);
            cliente_calculado._lastFormulasVersion = __recalculoVersion;
        }
        
        // Recalcular totales del cliente (filtrando filas de resumen mensual)
        recalcularTotalesCliente(cliente_calculado);

        mostrarTablaEditableCliente(cliente_calculado, hoja, index);
        // Scroll al inicio (día 1) - usar el contenedor de scroll
        setTimeout(() => {
            const scrollContainer = document.querySelector('.table-container-scroll');
            if (scrollContainer) {
                scrollContainer.scrollTop = 0;
            }
        }, 50);
    } else {
        document.getElementById('numeroCliente').textContent = index + 1;
    }
}

// Mostrar detalle del cliente
async function mostrarDetalleCliente(index) {
    const navSeq = ++__navDetalleSeq;
    mostrarLoadingOverlay();
    setLoadingOverlayText(`Cargando cliente ${index + 1}...`);
    await nextFrame();
    await yieldToBrowser();
    try {
        if (navSeq !== __navDetalleSeq) return;
        if (__dirtyRecalculoMasivo) {
            setLoadingOverlayText('Recalculando (fase 1/2)...');
            await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'nav_detalle' });
            if (navSeq !== __navDetalleSeq) return;
            if (hojaActual === 'Diario WIND' && datosEditados?.hojas?.[hojaActual]) {
                const hoja = datosEditados.hojas[hojaActual];
                setLoadingOverlayText('Recalculando (fase 2/2)...');
                await redistribuirSaldosClientesWIND(hoja);
            }
        }
        if (navSeq !== __navDetalleSeq) return;
        renderDetalleCliente(index);
    } finally {
        ocultarLoadingOverlay();
    }
}

// Recalcular TODAS las fórmulas de un cliente antes de mostrarlo
async function recalcularTodasFormulasCliente(cliente, clienteIdx, hoja) {
    const datosDiariosCliente = cliente.datos_diarios || [];
    
    // IMPORTANTE: NO recalcular campos editables (incremento, decremento, imp_final_manual)
    // Estos campos son editados por el usuario y no deben ser sobrescritos por fórmulas
    const camposEditables = ['incremento', 'decremento'];
    
    // Recalcular todas las fórmulas del cliente en orden
    datosDiariosCliente.forEach(filaDataCliente => {
        if (!filaDataCliente.formulas) return;
        
        Object.keys(filaDataCliente.formulas).forEach(campoConFormula => {
            // CRÍTICO: Saltar campos editables para no sobrescribir valores del usuario
            if (camposEditables.includes(campoConFormula)) {
                return;
            }
            
            const formula = filaDataCliente.formulas[campoConFormula];
            const valorAnterior = filaDataCliente[campoConFormula];
            
            // Evaluar la fórmula
            const nuevoValor = evaluarFormulaCliente(formula, filaDataCliente.fila, clienteIdx, hoja);
            
            if (nuevoValor !== null) {
                const valoresDiferentes = valorAnterior === null || 
                                         valorAnterior === undefined ||
                                         Math.abs(nuevoValor - (valorAnterior || 0)) > 0.0001;
                
                if (valoresDiferentes) {
                    console.log(`  Cliente ${clienteIdx + 1}, Fila ${filaDataCliente.fila}, ${campoConFormula}: ${valorAnterior} -> ${nuevoValor} (fórmula: ${formula})`);
                    filaDataCliente[campoConFormula] = nuevoValor;
                }
            } else {
                console.warn(`  ⚠️ No se pudo evaluar fórmula para cliente ${clienteIdx + 1}, fila ${filaDataCliente.fila}, ${campoConFormula}: ${formula}`);
            }
        });
    });
    
    // Hacer múltiples pasadas para capturar dependencias indirectas
    let huboCambios = true;
    let pasada = 0;
    const maxPasadas = 5;
    
    while (huboCambios && pasada < maxPasadas) {
        huboCambios = false;
        pasada++;
        
        datosDiariosCliente.forEach(filaDataCliente => {
            if (!filaDataCliente.formulas) return;
            
            Object.keys(filaDataCliente.formulas).forEach(campoConFormula => {
                // CRÍTICO: Saltar campos editables para no sobrescribir valores del usuario
                if (camposEditables.includes(campoConFormula)) {
                    return;
                }
                
                const formula = filaDataCliente.formulas[campoConFormula];
                const valorAnterior = filaDataCliente[campoConFormula];
                
                const nuevoValor = evaluarFormulaCliente(formula, filaDataCliente.fila, clienteIdx, hoja);
                
                if (nuevoValor !== null) {
                    const valoresDiferentes = valorAnterior === null || 
                                             valorAnterior === undefined ||
                                             Math.abs(nuevoValor - (valorAnterior || 0)) > 0.0001;
                    
                    if (valoresDiferentes) {
                        huboCambios = true;
                        filaDataCliente[campoConFormula] = nuevoValor;
                    }
                }
            });
        });
    }
}

// Mostrar tabla editable del cliente
function mostrarTablaEditableCliente(cliente, hoja, clienteIndex = null) {
    // Usar el índice pasado o calcular uno nuevo
    const clienteIdx = clienteIndex !== null ? clienteIndex : (hoja.clientes?.indexOf(cliente) ?? -1);
    const resumenDiv = document.getElementById('resumenCliente');
    const tablaContainer = document.getElementById('tablaDetalle').parentElement;
    
    // Mostrar resumen y tabla
    tablaContainer.style.display = 'block';
    
    // Normalizar ceros calculados cuando no hay datos del día
    (cliente.datos_diarios || []).forEach(dato => {
        if (!dato || dato.fila < 15 || dato.fila > 1120) return;
        const sinEntradas = (dato.incremento === null || dato.incremento === undefined) &&
            (dato.decremento === null || dato.decremento === undefined) &&
            (dato.base === null || dato.base === undefined);
        if (!sinEntradas) return;
        if (dato.formulas && Object.keys(dato.formulas).length > 0) {
            ['base', 'saldo_diario', 'beneficio_diario', 'beneficio_diario_pct', 'beneficio_acumulado', 'beneficio_acumulado_pct']
                .forEach(campo => {
                    if (dato[campo] === 0) {
                        dato[campo] = null;
                    }
                });
        }
    });

    // CRÍTICO: usar la hoja que se está mostrando (parámetro `hoja`), no depender de `hojaActual`.
    // Esto evita que se recalculen saldos en una hoja distinta y queden valores viejos en la UI.
    const hojaEnUso = hoja || datosEditados?.hojas?.[hojaActual] || null;
    if (hojaEnUso && hojaActual === 'Diario WIND') {
        const key = `${hojaActual}|${mesActual || ''}|${__recalculoVersion}`;
        if (__dirtyRecalculoMasivo || __cacheSaldosWindKey !== key) {
            recalcularSaldosTodosClientesEnMemoria(hojaEnUso);
            __cacheSaldosWindKey = key;
        } else {
            recalcularSaldosClienteEnMemoria(hojaEnUso, clienteIdx);
        }
    } else if (hojaEnUso) {
        recalcularSaldosClienteEnMemoria(hojaEnUso, clienteIdx);
    }
    const fechaObjetivoCliente = hojaEnUso
        ? obtenerUltimaFechaImpFinalManual(hojaEnUso)
        : null;

    // Saldo del cliente en la fecha objetivo (misma fecha que el imp_final manual)
    // Esto es clave para que la suma de proporciones sea 100%.
    let saldoActual = null;
    let saldoActualFila = null;
    if (fechaObjetivoCliente) {
        const tsObjetivo = parsearFechaValor(fechaObjetivoCliente)?.getTime() || 0;
        const datosDiariosValidos = (cliente.datos_diarios || [])
            .filter(d => d && d.fila >= 15 && d.fila <= 1120 && d.fecha && d.fecha !== 'FECHA')
            .filter(d => typeof d.saldo_diario === 'number')
            .filter(d => (parsearFechaValor(d.fecha)?.getTime() || 0) <= tsObjetivo)
            .sort((a, b) => {
                const ta = parsearFechaValor(a.fecha)?.getTime() || 0;
                const tb = parsearFechaValor(b.fecha)?.getTime() || 0;
                if (ta !== tb) return ta - tb;
                return (a.fila || 0) - (b.fila || 0);
            });
        if (datosDiariosValidos.length > 0) {
            const ultimoConSaldo = datosDiariosValidos[datosDiariosValidos.length - 1];
            saldoActual = ultimoConSaldo.saldo_diario;
            saldoActualFila = ultimoConSaldo.fila;
        }
    }
    const ultimoAcumuladoCliente = obtenerUltimoAcumuladoCliente(cliente, fechaObjetivoCliente);
    const ultimoBeneficio = ultimoAcumuladoCliente && typeof ultimoAcumuladoCliente.beneficio_acumulado === 'number'
        ? ultimoAcumuladoCliente
        : null;
    const ultimoBeneficioPct = ultimoAcumuladoCliente && typeof ultimoAcumuladoCliente.beneficio_acumulado_pct === 'number'
        ? ultimoAcumuladoCliente
        : null;
    const fechaObjetivoProporcionCliente = fechaObjetivoCliente;
    const saldoEnFechaProporcion = fechaObjetivoProporcionCliente
        ? obtenerSaldoClienteEnFecha(cliente, fechaObjetivoProporcionCliente)
        : null;
    const totalSaldosEnFechaProporcion = (hojaEnUso && fechaObjetivoProporcionCliente)
        ? obtenerTotalSaldosClientesEnFecha(hojaEnUso, fechaObjetivoProporcionCliente)
        : null;
    const proporcion = (totalSaldosEnFechaProporcion && totalSaldosEnFechaProporcion !== 0 && typeof saldoEnFechaProporcion === 'number')
        ? (saldoEnFechaProporcion / totalSaldosEnFechaProporcion)
        : null;

    // Mostrar resumen de totales
    resumenDiv.style.display = 'block';
    const claseBeneficioCliente = ultimoBeneficio && typeof ultimoBeneficio.beneficio_acumulado === 'number'
        ? (ultimoBeneficio.beneficio_acumulado >= 0 ? 'positive' : 'negative')
        : '';
    const claseRentabilidadCliente = ultimoBeneficioPct && typeof ultimoBeneficioPct.beneficio_acumulado_pct === 'number'
        ? (ultimoBeneficioPct.beneficio_acumulado_pct >= 0 ? 'positive' : 'negative')
        : '';

    const incEventos = extraerEventosClientePorCampo(cliente, 'incremento');
    const decEventos = extraerEventosClientePorCampo(cliente, 'decremento');

    resumenDiv.innerHTML = `
        <div class="summary-cards-premium">
            <div class="summary-card-premium">
                <div class="card-icon">💰</div>
                <div class="card-content">
                    <div class="kpi-card-header">
                        <div>
                            <div class="card-label">Incrementos</div>
                            <div class="card-value positive">${formatearMoneda(cliente.incrementos_total)}</div>
                        </div>
                        <button class="kpi-expand-btn" type="button" data-detalle-kpi="inc">Detalles</button>
                    </div>
                    <div class="kpi-breakdown" id="detalleBreakdownInc"></div>
                </div>
            </div>
            <div class="summary-card-premium">
                <div class="card-icon">🏦</div>
                <div class="card-content">
                    <div class="kpi-card-header">
                        <div>
                            <div class="card-label">Decrementos</div>
                            <div class="card-value negative">${formatearMoneda(cliente.decrementos_total)}</div>
                        </div>
                        <button class="kpi-expand-btn" type="button" data-detalle-kpi="dec">Detalles</button>
                    </div>
                    <div class="kpi-breakdown" id="detalleBreakdownDec"></div>
                </div>
            </div>
            <div class="summary-card-premium">
                <div class="card-icon">💎</div>
                <div class="card-content">
                    <div class="card-label">Beneficio Acumulado</div>
                    <div class="card-value ${claseBeneficioCliente}">${ultimoBeneficio ? formatearMoneda(ultimoBeneficio.beneficio_acumulado) : '-'}</div>
                </div>
            </div>
            <div class="summary-card-premium">
                <div class="card-icon">📊</div>
                <div class="card-content">
                    <div class="card-label">Rentabilidad</div>
                    <div class="card-value ${claseRentabilidadCliente}">${ultimoBeneficioPct ? formatearPorcentaje(ultimoBeneficioPct.beneficio_acumulado_pct) : '-'}</div>
                </div>
            </div>
            <div class="summary-card-premium">
                <div class="card-icon">📈</div>
                <div class="card-content">
                    <div class="card-label">Saldo Actual</div>
                    <div class="card-value">${saldoActual !== null ? formatearMoneda(saldoActual) : '-'}</div>
                </div>
            </div>
            <div class="summary-card-premium">
                <div class="card-icon">🧮</div>
                <div class="card-content">
                    <div class="card-label">Proporción del Total</div>
                    <div class="card-value">${proporcion !== null && totalSaldosEnFechaProporcion !== null ? `${formatearPorcentaje(proporcion)} (${formatearMoneda(saldoEnFechaProporcion || 0)} / ${formatearMoneda(totalSaldosEnFechaProporcion)})` : (proporcion !== null ? formatearPorcentaje(proporcion) : '-')}</div>
                </div>
            </div>
        </div>
    `;

    const btnInc = resumenDiv.querySelector('[data-detalle-kpi="inc"]');
    const btnDec = resumenDiv.querySelector('[data-detalle-kpi="dec"]');
    const bdInc = document.getElementById('detalleBreakdownInc');
    const bdDec = document.getElementById('detalleBreakdownDec');

    if (btnInc && bdInc) {
        btnInc.addEventListener('click', () => {
            const opening = !bdInc.classList.contains('open');
            bdInc.classList.toggle('open');
            btnInc.textContent = opening ? 'Ocultar' : 'Detalles';
            if (opening && !bdInc.hasAttribute('data-loaded')) {
                if (incEventos.length === 0) {
                    bdInc.innerHTML = '<div class="kpi-breakdown-sub">No hay incrementos en el rango.</div>';
                } else {
                    bdInc.innerHTML = incEventos.map(ev => {
                        const fecha = ev.fecha ? formatearFecha(ev.fecha) : '-';
                        return `
                            <div class="kpi-breakdown-item">
                                <div class="kpi-breakdown-title">${fecha}</div>
                                <div><strong>${formatearMoneda(ev.valor)}</strong></div>
                            </div>
                        `;
                    }).join('');
                }
                bdInc.setAttribute('data-loaded', 'true');
            }
        });
    }

    if (btnDec && bdDec) {
        btnDec.addEventListener('click', () => {
            const opening = !bdDec.classList.contains('open');
            bdDec.classList.toggle('open');
            btnDec.textContent = opening ? 'Ocultar' : 'Detalles';
            if (opening && !bdDec.hasAttribute('data-loaded')) {
                if (decEventos.length === 0) {
                    bdDec.innerHTML = '<div class="kpi-breakdown-sub">No hay decrementos en el rango.</div>';
                } else {
                    bdDec.innerHTML = decEventos.map(ev => {
                        const fecha = ev.fecha ? formatearFecha(ev.fecha) : '-';
                        return `
                            <div class="kpi-breakdown-item">
                                <div class="kpi-breakdown-title">${fecha}</div>
                                <div><strong>${formatearMoneda(ev.valor)}</strong></div>
                            </div>
                        `;
                    }).join('');
                }
                bdDec.setAttribute('data-loaded', 'true');
            }
        });
    }
    
    // Construir tabla con datos diarios
    const thead = document.getElementById('theadDetalle');
    const tbody = document.getElementById('tbodyDetalle');
    
    // Obtener letras de columna para este cliente específico
    const columnaInicio = cliente.columna_inicio;
    const letrasColumna = [];
    for (let i = 0; i < 8; i++) {
        letrasColumna.push(numeroALetra(columnaInicio + i));
    }
    
    thead.innerHTML = `
        <tr>
            <th class="th-general th-fecha">Fecha</th>
            <th class="th-general th-inc">Incrementos</th>
            <th class="th-general th-dec">Decrementos</th>
            <th class="th-general th-saldo">Saldo Diario</th>
            <th class="th-general th-benef-euro">Benef. €</th>
            <th class="th-general th-benef-pct">Benef. %</th>
            <th class="th-general th-benef-euro-acum">Benef. € Acum.</th>
            <th class="th-general th-benef-pct-acum">Benef. % Acum.</th>
        </tr>
    `;
    
    tbody.innerHTML = '';
    
    // Asegurar que saldo_diario mostrado coincide con el cálculo (evita mostrar saldo_anterior)
    recalcularSaldosClienteEnMemoria(hoja, clienteIdx);

    // Ordenar datos diarios por fecha
    const datosDiarios = cliente.datos_diarios || [];

    const datosDiariosGenerales = hoja?.datos_diarios_generales || [];
    const ultimaFilaImpFinalGeneral = datosDiariosGenerales.reduce((m, d) => {
        if (!d || typeof d.fila !== 'number') return m;
        if (d.fila < 15 || d.fila > 1120) return m;
        if (!esImpFinalConValorGeneral(d)) return m;
        return Math.max(m, d.fila);
        return m;
    }, 0);
    
    // Filtrar solo datos diarios reales:
    // - Con fecha válida (no null/undefined)
    // - Dentro del rango de filas de datos diarios (15-1120)
    // - No son headers repetidos (donde fecha es string "FECHA")
    // - Deduplicar por número de fila (evitar filas repetidas)
    const filasVistas = new Set();
    const datosConFecha = datosDiarios.filter(d => {
        // Debe tener fecha
        if (d.fecha === null || d.fecha === undefined) return false;
        // Debe estar en el rango de datos diarios (excluir filas de resumen mensual)
        if (d.fila < 15 || d.fila > 1120) return false;
        // No debe ser un header repetido (donde fecha es literalmente "FECHA")
        if (typeof d.fecha === 'string' && d.fecha.toUpperCase() === 'FECHA') return false;
        // Deduplicar: si ya vimos esta fila, ignorarla
        if (filasVistas.has(d.fila)) return false;
        filasVistas.add(d.fila);
        return true;
    }).sort((a, b) => (a.fila || 0) - (b.fila || 0));
    
    // Agrupar por día - usar SOLO las primeras 3 filas de cada fecha (evitar duplicados de resumen)
    // Primero, agrupar todas las filas por fecha normalizada
    const gruposPorFecha = new Map();
    datosConFecha.forEach(d => {
        const k = d?.fecha ? (normalizarFechaKey(d.fecha) || String(d.fecha).split(' ')[0]) : '';
        if (!k) return;
        if (!gruposPorFecha.has(k)) {
            gruposPorFecha.set(k, []);
        }
        gruposPorFecha.get(k).push(d);
    });
    
    // Para cada fecha, quedarse SOLO con las 3 filas de menor número (las originales, no las de resumen)
    const grupos = new Map();
    gruposPorFecha.forEach((filas, fechaKey) => {
        // Ordenar por número de fila y tomar solo las 3 primeras
        filas.sort((a, b) => (a.fila || 0) - (b.fila || 0));
        const filasUnicas = filas.slice(0, 3); // Máximo 3 filas por día (inc, dec, calc)
        grupos.set(fechaKey, { key: fechaKey, rows: filasUnicas });
    });

    // Ordenar grupos por fecha cronológica (no por número de fila)
    const gruposOrdenados = Array.from(grupos.values()).sort((a, b) => {
        // Comparar por fecha real
        const fechaA = a.rows[0]?.fecha ? parsearFechaValor(a.rows[0].fecha) : null;
        const fechaB = b.rows[0]?.fecha ? parsearFechaValor(b.rows[0].fecha) : null;
        if (!fechaA && !fechaB) return 0;
        if (!fechaA) return 1;
        if (!fechaB) return -1;
        return fechaA.getTime() - fechaB.getTime();
    });

    for (let gi = 0; gi < gruposOrdenados.length; gi++) {
        const g = gruposOrdenados[gi];
        g.rows.sort((a, b) => (a.fila || 0) - (b.fila || 0));
        g.filaCalculo = g.rows[g.rows.length - 1];
        g.filaInc = g.rows[0];
        g.filaDec = g.rows.length > 1 ? g.rows[1] : g.rows[0];
        g.posByFila = new Map(g.rows.map((r, idx) => [r.fila, idx]));
        g.hayActividad = g.rows.some(r => {
            const inc = typeof r.incremento === 'number' ? r.incremento : 0;
            const dec = typeof r.decremento === 'number' ? r.decremento : 0;
            return inc !== 0 || dec !== 0;
        });
    }

    let ultimaFilaActividad = 0;
    gruposOrdenados.forEach(g => {
        if (g.hayActividad && g.filaCalculo?.fila) {
            ultimaFilaActividad = Math.max(ultimaFilaActividad, g.filaCalculo.fila);
        }
    });
    const ultimaFilaMostrar = ultimaFilaActividad > 0
        ? Math.max(ultimaFilaActividad, ultimaFilaImpFinalGeneral)
        : ultimaFilaImpFinalGeneral; // Si no hay actividad pero hay imp_final, mostrar hasta ahí

    // CRÍTICO: Si el cliente tiene saldo_inicial_mes, debe mostrar valores aunque no tenga movimientos
    const tieneSaldoInicial = cliente.saldo_inicial_mes && 
        typeof cliente.saldo_inicial_mes === 'number' && 
        cliente.saldo_inicial_mes > 0;

    let haEmpezado = false;
    for (let gi = 0; gi < gruposOrdenados.length; gi++) {
        const g = gruposOrdenados[gi];
        if (!haEmpezado && g.hayActividad) haEmpezado = true;
        const dentroRangoActividad = ultimaFilaMostrar > 0 && (g.filaCalculo?.fila || 0) <= ultimaFilaMostrar;
        // Mostrar valores si: (ha empezado con movimientos) O (tiene saldo inicial y está dentro del rango)
        const mostrarValores = (haEmpezado && dentroRangoActividad) || (tieneSaldoInicial && dentroRangoActividad);
        const calcRow = g.filaCalculo;

        for (let ri = 0; ri < g.rows.length; ri++) {
            const dato = g.rows[ri];
            const tr = document.createElement('tr');
            tr.dataset.fila = `${dato.fila}`;
            tr.dataset.clienteIdx = `${clienteIdx}`;

        const fechaDato = parsearFechaValor(dato.fecha);
        if (fechaDato) {
            const d = fechaDato.getDay();
            if (d === 0 || d === 6) {
                tr.classList.add('row-weekend');
            }
        }
        
        // Determinar posición de la fila dentro del día (1ª, 2ª o 3ª fila)
        // Según el Excel: Incrementos van en 1ª fila, Decrementos en 2ª fila, Cálculos en 3ª fila
        const posicionEnDia = g.posByFila?.get(dato.fila) ?? 0;
        const esPrimeraFilaDelDia = posicionEnDia === 0;
        const esSegundaFilaDelDia = posicionEnDia === 1;
        
        // Fecha
        const tdFecha = document.createElement('td');
        tdFecha.textContent = formatearFecha(dato.fecha);
        tdFecha.className = 'cell-locked';
        tr.appendChild(tdFecha);
        
        // Incrementos (K) - EDITABLE solo en la 1ª fila del día
        const tdIncremento = document.createElement('td');
        const estaBloqueadoIncremento = (dato.bloqueadas && dato.bloqueadas.incremento === true) || !esPrimeraFilaDelDia;
        
        if (estaBloqueadoIncremento) {
            // BLOQUEADO: mostrar como texto
            tdIncremento.textContent = dato.incremento !== null && dato.incremento !== undefined ? 
                                     formatearMoneda(dato.incremento) : '-';
            const incHighlight = (typeof dato.incremento === 'number' && isFinite(dato.incremento) && dato.incremento !== 0) ? ' cell-inc-highlight' : '';
            tdIncremento.className = 'cell-locked right col-inc' + incHighlight;
            tdIncremento.dataset.inspect = 'incremento';
            tdIncremento.dataset.campo = 'incremento';
            tdIncremento.dataset.fila = `${dato.fila}`;
            tdIncremento.dataset.clienteIdx = `${clienteIdx}`;
            tdIncremento.dataset.hoja = hojaActual;
            tdIncremento.title = 'Bloqueado (tiene fórmula)';
        } else {
            // EDITABLE: crear input
            const inputIncremento = document.createElement('input');
            inputIncremento.type = 'text';
            inputIncremento.inputMode = 'decimal';
            inputIncremento.className = 'editable-cell formatted-number';
            inputIncremento.value = dato.incremento !== null && dato.incremento !== undefined ? formatearNumeroInput(dato.incremento) : '';
            inputIncremento.dataset.campo = 'incremento';
            inputIncremento.dataset.fila = dato.fila;
            inputIncremento.dataset.fecha = dato.fecha;
            inputIncremento.dataset.valorNumerico = dato.incremento !== null && dato.incremento !== undefined ? dato.incremento : '';
            
            // NO formatear mientras escribe para evitar encallos
            // Solo formatear y actualizar al salir de la casilla
            // IMPORTANTE: Usar el índice del cliente que ya tenemos (no indexOf)
            inputIncremento.dataset.clienteIdx = clienteIdx;
            
            // CRÍTICO: Guardar la hoja en el input para usarla en el blur
            inputIncremento.dataset.hoja = hojaActual;
            
            inputIncremento.addEventListener('blur', (e) => {
                console.log(`📥 BLUR INCREMENTO INICIADO - valor raw: "${e.target.value}", valorNumerico antes: "${e.target.dataset.valorNumerico}"`);
                if (e.target.dataset.skipCommitOnce === '1') {
                    console.log('⏭️ skipCommitOnce activo, saltando');
                    e.target.dataset.skipCommitOnce = '0';
                    return;
                }
                e.target.dataset.overwritePending = '0';
                // Formatear antes de actualizar
                formatearInputNumero(e.target);
                console.log(`📊 Después de formatear - valor: "${e.target.value}", valorNumerico: "${e.target.dataset.valorNumerico}"`);
                // Obtener referencias FRESCAS de datosEditados usando la HOJA GUARDADA
                const idx = parseInt(e.target.dataset.clienteIdx);
                const fila = parseInt(e.target.dataset.fila);
                const hojaInput = e.target.dataset.hoja || hojaActual;
                const clienteFresco = datosEditados?.hojas?.[hojaInput]?.clientes?.[idx];
                const datoFresco = clienteFresco?.datos_diarios?.find(d => d.fila === fila);
                console.log(`🔍 Blur incremento: hoja=${hojaInput}, clienteIdx=${idx}, fila=${fila}, cliente=${!!clienteFresco}, dato=${!!datoFresco}, valorAnterior=${datoFresco?.incremento}`);
                if (clienteFresco && datoFresco) {
                    void actualizarDatoDiario(e.target, clienteFresco, datoFresco, hojaInput);
                } else {
                    console.error(`❌ No se encontró cliente o dato: hoja=${hojaInput}, idx=${idx}, fila=${fila}`);
                    console.error(`   Hojas disponibles: ${Object.keys(datosEditados?.hojas || {}).join(', ')}`);
                    console.error(`   Clientes en ${hojaInput}: ${datosEditados?.hojas?.[hojaInput]?.clientes?.length || 0}`);
                }
            });

            prepararInputEdicion(inputIncremento);
            
            tdIncremento.appendChild(inputIncremento);
            const incHighlight = (typeof dato.incremento === 'number' && isFinite(dato.incremento) && dato.incremento !== 0) ? ' cell-inc-highlight' : '';
            tdIncremento.className = 'cell-editable right col-inc' + incHighlight;
        }
        tr.appendChild(tdIncremento);
        
        // Decrementos (L) - EDITABLE solo en la 1ª fila del día (igual que incrementos)
        const tdDecremento = document.createElement('td');
        const estaBloqueadoDecremento = (dato.bloqueadas && dato.bloqueadas.decremento === true) || !esPrimeraFilaDelDia;
        
        if (estaBloqueadoDecremento) {
            // BLOQUEADO: mostrar como texto
            tdDecremento.textContent = dato.decremento !== null && dato.decremento !== undefined ? 
                                     formatearMoneda(dato.decremento) : '-';
            const decHighlight = (typeof dato.decremento === 'number' && isFinite(dato.decremento) && dato.decremento !== 0) ? ' cell-dec-highlight' : '';
            tdDecremento.className = 'cell-locked right col-dec' + decHighlight;
            tdDecremento.dataset.inspect = 'decremento';
            tdDecremento.dataset.campo = 'decremento';
            tdDecremento.dataset.fila = `${dato.fila}`;
            tdDecremento.dataset.clienteIdx = `${clienteIdx}`;
            tdDecremento.dataset.hoja = hojaActual;
            tdDecremento.title = 'Bloqueado (tiene fórmula)';
        } else {
            // EDITABLE: crear input
            const inputDecremento = document.createElement('input');
            inputDecremento.type = 'text';
            inputDecremento.inputMode = 'decimal';
            inputDecremento.className = 'editable-cell formatted-number';
            inputDecremento.value = dato.decremento !== null && dato.decremento !== undefined ? formatearNumeroInput(dato.decremento) : '';
            inputDecremento.dataset.campo = 'decremento';
            inputDecremento.dataset.fila = dato.fila;
            inputDecremento.dataset.fecha = dato.fecha;
            inputDecremento.dataset.valorNumerico = dato.decremento !== null && dato.decremento !== undefined ? dato.decremento : '';
            
            // NO formatear mientras escribe para evitar encallos
            // Solo formatear y actualizar al salir de la casilla
            // IMPORTANTE: Usar el índice del cliente que ya tenemos (no indexOf)
            inputDecremento.dataset.clienteIdx = clienteIdx;
            
            // CRÍTICO: Guardar la hoja en el input para usarla en el blur
            inputDecremento.dataset.hoja = hojaActual;
            
            inputDecremento.addEventListener('blur', (e) => {
                if (e.target.dataset.skipCommitOnce === '1') {
                    e.target.dataset.skipCommitOnce = '0';
                    return;
                }
                e.target.dataset.overwritePending = '0';
                // Formatear antes de actualizar
                formatearInputNumero(e.target);
                // Obtener referencias FRESCAS de datosEditados usando la HOJA GUARDADA
                const idx = parseInt(e.target.dataset.clienteIdx);
                const fila = parseInt(e.target.dataset.fila);
                const hojaInput = e.target.dataset.hoja || hojaActual;
                const clienteFresco = datosEditados?.hojas?.[hojaInput]?.clientes?.[idx];
                const datoFresco = clienteFresco?.datos_diarios?.find(d => d.fila === fila);
                console.log(`🔍 Blur decremento: hoja=${hojaInput}, clienteIdx=${idx}, fila=${fila}, cliente encontrado=${!!clienteFresco}, dato encontrado=${!!datoFresco}`);
                if (clienteFresco && datoFresco) {
                    void actualizarDatoDiario(e.target, clienteFresco, datoFresco, hojaInput);
                } else {
                    console.error(`❌ No se encontró cliente o dato: hoja=${hojaInput}, idx=${idx}, fila=${fila}`);
                }
            });

            prepararInputEdicion(inputDecremento);
            
            tdDecremento.appendChild(inputDecremento);
            const decHighlight = (typeof dato.decremento === 'number' && isFinite(dato.decremento) && dato.decremento !== 0) ? ' cell-dec-highlight' : '';
            tdDecremento.className = 'cell-editable right col-dec' + decHighlight;
        }
        tr.appendChild(tdDecremento);
        
        // IMPORTANTE: Recalcular fórmulas ANTES de mostrar los valores
        // Esto asegura que los valores mostrados estén actualizados
        // HACERLO EN MÚLTIPLES PASADAS para capturar dependencias entre fórmulas
        if (dato.formulas && hojaActual !== 'Diario WIND') {
            const hoja = datosEditados.hojas[hojaActual];
            if (clienteIdx !== -1) {
                // Hacer múltiples pasadas para recalcular fórmulas en el orden correcto
                let huboCambios = true;
                let pasada = 0;
                const maxPasadas = 10;
                
                while (huboCambios && pasada < maxPasadas) {
                    huboCambios = false;
                    pasada++;
                    
                    // Recalcular TODAS las fórmulas de esta fila en cada pasada
                    Object.keys(dato.formulas).forEach(campoConFormula => {
                        const formula = dato.formulas[campoConFormula];
                        const valorAnterior = dato[campoConFormula];
                        
                        const valorCalculado = evaluarFormulaCliente(formula, dato.fila, clienteIdx, hoja);
                        if (valorCalculado !== null) {
                            const valoresDiferentes = valorAnterior === null || 
                                                     valorAnterior === undefined ||
                                                     Math.abs(valorCalculado - (valorAnterior || 0)) > 0.0001;
                            
                            if (valoresDiferentes) {
                                dato[campoConFormula] = valorCalculado;
                                huboCambios = true;
                            }
                        }
                    });
                }
            }
        }
        
        // Saldo Diario (N) - SIEMPRE BLOQUEADO (columna M-R)
        const tdSaldo = document.createElement('td');
        const saldoVisible = mostrarValores ? (calcRow?.saldo_diario ?? null) : null;
        tdSaldo.textContent = saldoVisible !== null && saldoVisible !== undefined ? 
                             formatearMoneda(saldoVisible) : '-';
        tdSaldo.className = saldoVisible !== null && saldoVisible !== undefined
            ? 'cell-locked cell-saldo-highlight'
            : 'cell-locked';
        tdSaldo.dataset.inspect = 'saldo_diario';
        tdSaldo.dataset.campo = 'saldo_diario';
        tdSaldo.dataset.fila = `${dato.fila}`;
        tdSaldo.dataset.clienteIdx = `${clienteIdx}`;
        tdSaldo.dataset.hoja = hojaActual;
        tdSaldo.title = 'Calculado automáticamente con fórmulas';
        tr.appendChild(tdSaldo);

        // Beneficio Diario (O) - SIEMPRE BLOQUEADO (columna M-R)
        const tdBenefD = document.createElement('td');
        const benefVisible = mostrarValores ? (calcRow?.beneficio_diario ?? null) : null;
        tdBenefD.textContent = benefVisible !== null && benefVisible !== undefined ?
                               formatearMoneda(benefVisible) : '-';
        tdBenefD.className = 'cell-locked';
        tdBenefD.dataset.inspect = 'beneficio_diario';
        tdBenefD.dataset.campo = 'beneficio_diario';
        tdBenefD.dataset.fila = `${dato.fila}`;
        tdBenefD.dataset.clienteIdx = `${clienteIdx}`;
        tdBenefD.dataset.hoja = hojaActual;
        tdBenefD.title = 'Calculado automáticamente con fórmulas';
        tr.appendChild(tdBenefD);

        // Beneficio % Diario (P) - SIEMPRE BLOQUEADO (columna M-R)
        const tdBenefDPct = document.createElement('td');
        const benefPctVisible = mostrarValores ? (calcRow?.beneficio_diario_pct ?? null) : null;
        tdBenefDPct.textContent = benefPctVisible !== null && benefPctVisible !== undefined ?
                                 formatearPorcentaje(benefPctVisible) : '-';
        tdBenefDPct.className = 'cell-locked';
        tdBenefDPct.dataset.inspect = 'beneficio_diario_pct';
        tdBenefDPct.dataset.campo = 'beneficio_diario_pct';
        tdBenefDPct.dataset.fila = `${dato.fila}`;
        tdBenefDPct.dataset.clienteIdx = `${clienteIdx}`;
        tdBenefDPct.dataset.hoja = hojaActual;
        tdBenefDPct.title = 'Calculado automáticamente con fórmulas';
        tr.appendChild(tdBenefDPct);

        // Beneficio Acumulado (Q) - SIEMPRE BLOQUEADO (columna M-R)
        const tdBenefA = document.createElement('td');
        const benefAcumVisible = mostrarValores ? (calcRow?.beneficio_acumulado ?? null) : null;
        tdBenefA.textContent = benefAcumVisible !== null && benefAcumVisible !== undefined ?
                               formatearMoneda(benefAcumVisible) : '-';
        tdBenefA.className = 'cell-locked';
        tdBenefA.dataset.inspect = 'beneficio_acumulado';
        tdBenefA.dataset.campo = 'beneficio_acumulado';
        tdBenefA.dataset.fila = `${dato.fila}`;
        tdBenefA.dataset.clienteIdx = `${clienteIdx}`;
        tdBenefA.dataset.hoja = hojaActual;
        tdBenefA.title = 'Calculado automáticamente con fórmulas';
        tr.appendChild(tdBenefA);

        // Beneficio Acumulado % (R) - SIEMPRE BLOQUEADO (columna M-R)
        const tdBenefAPct = document.createElement('td');
        const benefAcumPctVisible = mostrarValores ? (calcRow?.beneficio_acumulado_pct ?? null) : null;
        tdBenefAPct.textContent = benefAcumPctVisible !== null && benefAcumPctVisible !== undefined ? 
                                 formatearPorcentaje(benefAcumPctVisible) : '-';
        tdBenefAPct.className = 'cell-locked';
        tdBenefAPct.dataset.inspect = 'beneficio_acumulado_pct';
        tdBenefAPct.dataset.campo = 'beneficio_acumulado_pct';
        tdBenefAPct.dataset.fila = `${dato.fila}`;
        tdBenefAPct.dataset.clienteIdx = `${clienteIdx}`;
        tdBenefAPct.dataset.hoja = hojaActual;
        tdBenefAPct.title = 'Calculado automáticamente con fórmulas';
        tr.appendChild(tdBenefAPct);
        
            tbody.appendChild(tr);
        }
    }
}

// Recalcular totales del cliente cuando se edita incremento/decremento
// IMPORTANTE: Solo procesar filas de datos diarios reales (filas 15-1120), 
// ignorando headers repetidos y tablas de resumen mensual
function recalcularTotalesCliente(cliente) {
    if (!cliente.datos_diarios) return;
    
    let sumaIncrementos = typeof cliente._acumPrevInc === 'number' ? cliente._acumPrevInc : 0;
    let sumaDecrementos = typeof cliente._acumPrevDec === 'number' ? cliente._acumPrevDec : 0;
    const primeraFilaPorFecha = obtenerPrimeraFilaPorFechaCliente(cliente);
    
    cliente.datos_diarios.forEach(dato => {
        // Ignorar filas fuera del rango de datos diarios (15-1120)
        // Las filas >= 1121 son resumen mensual que duplican los datos
        if (dato.fila < 15 || dato.fila > 1120) return;
        
        // Ignorar filas sin fecha válida
        if (!dato.fecha) return;
        
        // Ignorar filas donde los valores son strings (headers repetidos)
        if (typeof dato.incremento === 'string' || typeof dato.decremento === 'string') return;
        
        if (primeraFilaPorFecha.get(dato.fecha) !== dato.fila) return;

        // Sumar incrementos
        if (dato.incremento !== null && dato.incremento !== undefined && typeof dato.incremento === 'number') {
            sumaIncrementos += dato.incremento;
        }
        
        // Sumar decrementos
        if (dato.decremento !== null && dato.decremento !== undefined && typeof dato.decremento === 'number') {
            sumaDecrementos += dato.decremento;
        }
    });
    
    cliente.incrementos_total = sumaIncrementos;
    cliente.decrementos_total = sumaDecrementos;
    
    // Actualizar el resumen si está visible
    const resumenDiv = document.getElementById('resumenCliente');
    if (resumenDiv && resumenDiv.style.display !== 'none') {
        const hoja = datosEditados.hojas[hojaActual];
        const clienteIndex = hoja.clientes?.indexOf(cliente) ?? clienteActual;
        void mostrarTablaEditableCliente(cliente, hoja, clienteIndex);
    }
}

// Wrapper que usa la hoja especificada
async function recalcularFormulasPorCambioClienteEnHoja(clienteIdx, filaIdx, campo, nombreHoja) {
    if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[nombreHoja]) {
        console.warn(`⚠️ Hoja ${nombreHoja} no encontrada`);
        return;
    }
    const hoja = datosEditados.hojas[nombreHoja];
    await recalcularFormulasPorCambioClienteInterno(clienteIdx, filaIdx, campo, hoja, nombreHoja);
}

async function recalcularFormulasPorCambioCliente(clienteIdx, filaIdx, campo) {
    if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[hojaActual]) {
        return;
    }
    const hoja = datosEditados.hojas[hojaActual];
    await recalcularFormulasPorCambioClienteInterno(clienteIdx, filaIdx, campo, hoja, hojaActual);
}

async function recalcularFormulasPorCambioClienteInterno(clienteIdx, filaIdx, campo, hoja, nombreHoja) {
    const clientes = hoja.clientes || [];
    if (clienteIdx < 0 || clienteIdx >= clientes.length) return;
    
    const cliente = clientes[clienteIdx];
    const claveModificada = `${filaIdx}_cliente${clienteIdx}_${campo}`;
    
    // IMPORTANTE: Cuando cambia incremento/decremento, recalcular TODAS las fórmulas del cliente
    // porque las fórmulas pueden tener dependencias indirectas (ej: fórmula en fila 17 usa K15-L16,
    // pero si cambia K16, puede afectar otras fórmulas que luego afectan la fila 17)
    // Por eso, marcamos la celda modificada y luego hacemos múltiples pasadas hasta que no haya cambios
    
    // Si es incremento o decremento, recalcular TODAS las fórmulas de TODOS los clientes
    // porque las fórmulas pueden depender de otros clientes (ej: Cliente 2 base = IF(N17<>0,S15-T16,0)
    // depende de N17 que es saldo_diario del Cliente 1)
    const esIncrementoDecremento = campo === 'incremento' || campo === 'decremento';
    
    // Declarar totalRecalculadas en el scope de la función
    let totalRecalculadas = 0;
    
    // IMPORTANTE: Cuando cambia incremento/decremento en CUALQUIER cliente, recalcular TODOS los clientes
    // porque las fórmulas pueden tener dependencias cruzadas
    // CLAVE: Recalcular desde la fila modificada hacia adelante EN ORDEN
    if (esIncrementoDecremento) {
        console.log(`🔄 Cambio en ${campo} del cliente ${clienteIdx + 1}, fila ${filaIdx} - Recalculando DIRECTAMENTE desde esta fila hacia adelante...`);
        
        // MÉTODO DIRECTO: Calcular valores sin depender de fórmulas
        // Para cada cliente, recalcular base, saldo_diario, beneficio_diario SOLO en filas con datos
        
        // Primero: encontrar la última fila con imp_final en general (límite de cálculos)
        const datosGenOrdenados = [...(hoja.datos_diarios_generales || [])]
            .filter(d => d.fila >= 15 && d.fila <= 1120)
            .sort((a, b) => a.fila - b.fila);
        
        const ultimaFilaConImpFinal = obtenerUltimaFilaImpFinalManual(hoja);
        
        console.log(`   Última fila con imp_final en general: ${ultimaFilaConImpFinal}`);
        
        clientes.forEach((clienteItem, idxActual) => {
            const datosOrdenados = [...(clienteItem.datos_diarios || [])]
                .filter(d => d.fila >= 15 && d.fila <= 1120)
                .sort((a, b) => a.fila - b.fila);
            
            // Encontrar filas del cliente que tienen incremento o decremento
            const filasConMovimientos = new Set();
            let ultimaFilaConMovimiento = 0;
            datosOrdenados.forEach(d => {
                const tieneInc = typeof d.incremento === 'number' && d.incremento > 0;
                const tieneDec = typeof d.decremento === 'number' && d.decremento > 0;
                if (tieneInc || tieneDec) {
                    filasConMovimientos.add(d.fila);
                    if (d.fila > ultimaFilaConMovimiento) {
                        ultimaFilaConMovimiento = d.fila;
                    }
                }
            });
            
            // Límite: no calcular más allá de la última fila con datos relevantes
            // Si el cliente no tiene movimientos, no tocamos nada de ese cliente.
            if (nombreHoja === 'Diario WIND' && ultimaFilaConMovimiento === 0) {
                return;
            }

            // Límite: si el cliente ha empezado, propagar hasta la última fila con imp_final general
            // (en WIND también hay % diario por hoja general, así que deben verse beneficios y saldo propagado).
            const limiteCalculo = Math.max(ultimaFilaConMovimiento, ultimaFilaConImpFinal);
            
            let saldoAnterior = (typeof clienteItem.saldo_inicial_mes === 'number' && isFinite(clienteItem.saldo_inicial_mes)) ? clienteItem.saldo_inicial_mes : 0;
            let benefAcumAnterior = 0;
            let inversionAcum = 0;
            
            // Encontrar el saldo anterior a la fila modificada
            for (const d of datosOrdenados) {
                if (d.fila >= filaIdx) break;
                if (typeof d.saldo_diario === 'number') {
                    saldoAnterior = d.saldo_diario;
                }
                if (typeof d.beneficio_acumulado === 'number') {
                    benefAcumAnterior = d.beneficio_acumulado;
                }
                if (typeof d.incremento === 'number') {
                    inversionAcum += d.incremento;
                }
            }
            
            // Recalcular desde la fila modificada hacia adelante
            for (const filaDataCliente of datosOrdenados) {
                if (filaDataCliente.fila < filaIdx) continue;
                
                // IMPORTANTE: No calcular más allá del límite
                if (filaDataCliente.fila > limiteCalculo) {
                    // Limpiar valores de filas que no deberían tener cálculos
                    if (filaDataCliente.base !== null || filaDataCliente.saldo_diario !== null) {
                        filaDataCliente.base = null;
                        filaDataCliente.saldo_diario = null;
                        filaDataCliente.beneficio_diario = null;
                        filaDataCliente.beneficio_diario_pct = null;
                        filaDataCliente.beneficio_acumulado = null;
                        filaDataCliente.beneficio_acumulado_pct = null;
                        console.log(`  🧹 Cliente ${idxActual + 1}, Fila ${filaDataCliente.fila}: limpiando (fuera de límite)`);
                    }
                    continue;
                }
                
                const inc = typeof filaDataCliente.incremento === 'number' ? filaDataCliente.incremento : 0;
                const dec = typeof filaDataCliente.decremento === 'number' ? filaDataCliente.decremento : 0;

                inversionAcum += inc;
                
                // SOLO calcular si:
                // 1. Esta fila tiene incremento o decremento, O
                // 2. Hay filas anteriores con movimientos (para propagar el saldo)
                const tieneMovimiento = inc > 0 || dec > 0;
                const hayMovimientosAnteriores = ultimaFilaConMovimiento > 0 && filaDataCliente.fila >= 15;
                
                if (!tieneMovimiento && !hayMovimientosAnteriores) {
                    continue; // No hay nada que calcular
                }
                
                // Obtener benef_porcentaje de la vista general para esta fila
                const datoGeneral = hoja.datos_diarios_generales?.find(g => g.fila === filaDataCliente.fila);
                const tieneImpFinalGeneral = esImpFinalConValorGeneral(datoGeneral);
                const benefPct = tieneImpFinalGeneral ? (datoGeneral?.benef_porcentaje || 0) : 0;
                const esDiarioWind = nombreHoja === 'Diario WIND';
                
                // Calcular base = saldo_anterior + incremento - decremento
                const base = saldoAnterior + inc - dec;
                
                // Beneficio diario = base * benef_porcentaje_general (si hay imp_final general)
                const beneficioDiario = tieneImpFinalGeneral ? (base * benefPct) : 0;
                
                // Calcular saldo_diario
                // saldo_diario = saldo_anterior + incremento - decremento + beneficio_diario
                const saldoDiario = base + beneficioDiario;
                
                // Calcular beneficio acumulado (solo relevante fuera de WIND)
                const beneficioAcumulado = benefAcumAnterior + beneficioDiario;

                // Calcular % acumulado (ROI sobre inversión acumulada HASTA la fecha)
                const beneficioAcumuladoParaPct = (typeof filaDataCliente.beneficio_acumulado === 'number')
                    ? filaDataCliente.beneficio_acumulado
                    : beneficioAcumulado;
                const benefAcumPct = inversionAcum > 0 ? (beneficioAcumuladoParaPct / inversionAcum) : 0;
                
                // Actualizar valores
                const cambioBase = filaDataCliente.base !== base;
                const cambioSaldo = filaDataCliente.saldo_diario !== saldoDiario;
                
                if (cambioBase || cambioSaldo) {
                    // Diario WIND: saldo_diario = saldo_anterior + incremento - decremento
                    // (null/undefined -> 0). Es decir: saldo_diario = base
                    filaDataCliente.base = base;
                    filaDataCliente.saldo_diario = saldoDiario;
                    
                    if (tieneImpFinalGeneral) {
                        filaDataCliente.beneficio_diario = beneficioDiario;
                        filaDataCliente.beneficio_diario_pct = benefPct;
                        filaDataCliente.beneficio_acumulado = beneficioAcumulado;
                        filaDataCliente.beneficio_acumulado_pct = benefAcumPct;
                    } else {
                        filaDataCliente.beneficio_diario = null;
                        filaDataCliente.beneficio_diario_pct = null;
                        filaDataCliente.beneficio_acumulado = benefAcumAnterior > 0 ? benefAcumAnterior : null;
                        filaDataCliente.beneficio_acumulado_pct = null;
                    }
                    
                    totalRecalculadas++;
                    console.log(`  ✅ Cliente ${idxActual + 1}, Fila ${filaDataCliente.fila}: base=${base.toFixed(2)}, saldo=${saldoDiario.toFixed(2)}`);
                    
                    if (clienteActual === idxActual) {
                        actualizarCeldaClienteEnUI(idxActual, filaDataCliente.fila, 'base', base);
                        actualizarCeldaClienteEnUI(idxActual, filaDataCliente.fila, 'saldo_diario', saldoDiario);
                        if (typeof filaDataCliente.beneficio_acumulado_pct === 'number') {
                            actualizarCeldaClienteEnUI(idxActual, filaDataCliente.fila, 'beneficio_acumulado_pct', filaDataCliente.beneficio_acumulado_pct);
                        }
                    }
                }
                
                // Actualizar para la siguiente iteración
                saldoAnterior = saldoDiario;
                if (!esDiarioWind) {
                    benefAcumAnterior = beneficioAcumulado;
                }
            }
        });
        
        console.log(`✅ Recalculadas ${totalRecalculadas} celdas de TODOS los clientes desde fila ${filaIdx}`);
    } else {
        // Para otros campos, usar la lógica normal solo del cliente actual
        let huboCambios = true;
        let pasada = 0;
        const maxPasadas = 10;
        const recalculadasClientes = new Set([claveModificada]);
        
        while (huboCambios && pasada < maxPasadas) {
            huboCambios = false;
            pasada++;
            
            const recalculadasEnPasada = recalcularFormulasClientes(
                cliente,
                clienteIdx,
                null,
                hoja,
                new Set(),
                recalculadasClientes
            );
            if (recalculadasEnPasada > 0) {
                huboCambios = true;
                totalRecalculadas += recalculadasEnPasada;
            }
        }
        
        console.log(`✅ Recalculadas ${totalRecalculadas} fórmulas del cliente en ${pasada} pasadas`);
    }
    
    // 2. Recalcular fórmulas generales que dependen de FA
    // IMPORTANTE: Cuando cambia incremento/decremento en fila X del cliente del día D:
    // - Afecta FA en fila X (suma de incrementos-decrementos de todos los clientes en esa fila)
    // - La fórmula del día siguiente usa FA: F(día siguiente) = F(día anterior final) + FA(día siguiente)
    // - Ejemplo: Si cambio decremento del día 14, afecta FA del día 14, y el imp_inicial del día 14 debe recalcularse
    
    const datoCliente = cliente.datos_diarios?.find(d => d.fila === filaIdx);
    if (!datoCliente || !datoCliente.fecha) {
        console.log(`⚠️ No se encontró fecha para fila ${filaIdx} del cliente, recalculando desde fila ${filaIdx}`);
        // IMPORTANTE: Cuando cambia incremento/decremento, solo recalcular imp_inicial, NO modificar imp_final
        await recalcularFormulasGeneralesDesdeFila(filaIdx, hoja, true);
        return;
    }
    
    const datosDiarios = hoja.datos_diarios_generales || [];
    const fechaCliente = datoCliente.fecha.split(' ')[0];
    
    // Buscar la fila del día ACTUAL que tiene imp_inicial (esta es la que se ve afectada)
    // IMPORTANTE: Con la nueva lógica de obtenerValorCelda, cuando se evalúa AEO(N) desde la fila general del día D,
    // siempre buscará incrementos en la fila del cliente del día D (misma fila).
    // Por lo tanto, cuando cambia un incremento en la fila X del cliente del día D, simplemente necesitamos
    // encontrar la fila general del día D que tiene imp_inicial con fórmula y recalcular desde ahí.
    
    // Buscar la fila general del mismo día que tiene imp_inicial
    // IMPORTANTE: Fila 15 (día 1) no tiene fórmula definida pero SÍ tiene imp_inicial calculado desde FA
    const filaImpInicialAfectada = datosDiarios.find(f => {
        if (!f.fecha) return false;
        const fechaGeneral = f.fecha.split(' ')[0];
        if (fechaGeneral !== fechaCliente) return false;
        // Fila 15 es especial: no tiene fórmula pero sí calcula imp_inicial desde FA
        if (f.fila === 15) return true;
        // Otras filas: verificar si tienen fórmula de imp_inicial
        return f.formulas && f.formulas.imp_inicial;
    });
    
    if (filaImpInicialAfectada) {
        console.log(`📅 Cambio en día ${fechaCliente} (fila cliente ${filaIdx}) -> Recalculando imp_inicial del día ${fechaCliente} (fila ${filaImpInicialAfectada.fila})`);
        // IMPORTANTE: Cuando cambia incremento/decremento, solo recalcular imp_inicial, NO modificar imp_final
        await recalcularFormulasGeneralesDesdeFila(filaImpInicialAfectada.fila, hoja, true);
    } else {
        // Fallback: buscar cualquier fila con esa fecha
        const filaAlternativa = datosDiarios.find(f => {
            if (!f.fecha) return false;
            return f.fecha.split(' ')[0] === fechaCliente;
        });
        if (filaAlternativa) {
            console.log(`📅 Cambio en día ${fechaCliente} -> Recalculando desde fila ${filaAlternativa.fila} (alternativa)`);
            // IMPORTANTE: Cuando cambia incremento/decremento, solo recalcular imp_inicial, NO modificar imp_final
            await recalcularFormulasGeneralesDesdeFila(filaAlternativa.fila, hoja, true);
        } else {
            console.log(`⚠️ No se encontró fila general para fecha ${fechaCliente}, recalculando desde fila ${filaIdx}`);
            // IMPORTANTE: Cuando cambia incremento/decremento, solo recalcular imp_inicial, NO modificar imp_final
            await recalcularFormulasGeneralesDesdeFila(filaIdx, hoja, true);
        }
    }
    
    await guardarDatosAutomatico(0, totalRecalculadas);
}

// Recalcular fórmulas generales que dependen de FA desde una fila específica
// IMPORTANTE: Cuando cambia incremento/decremento de cliente, afecta FA y por tanto las fórmulas generales
// skipImpFinal: si es true, NO recalcular imp_final (solo recalcular imp_inicial cuando cambia incremento)
async function recalcularFormulasGeneralesDesdeFila(filaInicio, hoja, skipImpFinal = false) {
    const datosDiarios = hoja.datos_diarios_generales || [];
    
    console.log(`🔄 Recalculando fórmulas generales desde fila ${filaInicio}${skipImpFinal ? ' (sin modificar imp_final)' : ''}...`);
    
    // IMPORTANTE: Calcular el límite de filas con datos
    const ultimaFilaConImpFinalManual = obtenerUltimaFilaImpFinalManual(hoja);
    let ultimaFilaConIncremento = 0;
    (hoja.clientes || []).forEach(c => {
        (c.datos_diarios || []).forEach(d => {
            if (d.incremento || d.decremento) ultimaFilaConIncremento = Math.max(ultimaFilaConIncremento, d.fila);
        });
    });
    const limiteCalculo = Math.max((ultimaFilaConImpFinalManual > 0 ? (ultimaFilaConImpFinalManual + 1) : 0), ultimaFilaConIncremento);
    console.log(`   Límite de cálculo: fila ${limiteCalculo}`);
    
    // Recalcular en cascada desde la fila afectada hacia adelante
    // Hacer múltiples pasadas hasta que no haya cambios (máximo 10 pasadas)
    let huboCambios = true;
    let pasada = 0;
    const maxPasadas = 10;
    let totalCambios = 0;
    
    while (huboCambios && pasada < maxPasadas) {
        huboCambios = false;
        pasada++;
        
        // PRIMERO: NO recalcular imp_final automáticamente.
        // imp_final debe ser siempre manual en vista general.
        
        // SEGUNDO: Recalcular fórmulas (imp_inicial, etc.) SOLO hasta el límite
        for (let fila = filaInicio; fila <= limiteCalculo; fila++) {
            const filaData = datosDiarios.find(f => f.fila === fila);
            if (!filaData) continue;
            
            // CASO ESPECIAL: Fila 15 (día 1)
            if (fila === 15) {
                const sumaFA = calcularFA(fila, hoja);
                const valorAnterior = filaData.imp_inicial;
                // En WIND, el día 1 debe partir del cierre del mes anterior + FA
                const baseMesAnterior = (hojaActual === 'Diario WIND' && typeof hoja._impFinalMesAnterior === 'number' && isFinite(hoja._impFinalMesAnterior))
                    ? hoja._impFinalMesAnterior
                    : 0;
                const nuevoValor = baseMesAnterior + sumaFA;

                // SIEMPRE actualizar si hay diferencia (incluyendo null/undefined vs número)
                const valorAnteriorNum = typeof valorAnterior === 'number' ? valorAnterior : 0;
                if (nuevoValor !== valorAnteriorNum || valorAnterior === null || valorAnterior === undefined) {
                    console.log(`  Fila 15 (día 1): imp_inicial ${valorAnterior} -> ${nuevoValor} (base_mes_anterior=${baseMesAnterior} + FA=${sumaFA})`);
                    filaData.imp_inicial = nuevoValor;
                    huboCambios = true;
                    totalCambios++;
                    actualizarCeldaEnUI(fila, 'imp_inicial', nuevoValor);
                }
                continue; // Siguiente fila
            }
            
            // IMPORTANTE: Si NO hay imp_final en esta fila, LIMPIAR los valores de beneficio
            // Los beneficios solo deben existir si hay imp_final
            const tieneImpFinal = esImpFinalConValorGeneral(filaData);
            
            if (!tieneImpFinal) {
                // Limpiar beneficios si no hay imp_final
                const camposBeneficio = ['benef_euro', 'benef_porcentaje', 'benef_euro_acum', 'benef_porcentaje_acum'];
                camposBeneficio.forEach(campo => {
                    if (filaData[campo] !== null && filaData[campo] !== undefined) {
                        console.log(`  Fila ${fila}: limpiando ${campo} (no hay imp_final)`);
                        filaData[campo] = null;
                        actualizarCeldaEnUI(fila, campo, null);
                        huboCambios = true;
                        totalCambios++;
                    }
                });
            }
            
            // Si tiene fórmulas, recalcularlas (pero NO beneficios si no hay imp_final)
            if (filaData.formulas && filaData.formulas.imp_inicial) {
                const formula = filaData.formulas.imp_inicial;
                const valorAnterior = filaData.imp_inicial;
                const nuevoValor = evaluarFormula(formula, fila, hoja);
                
                if (nuevoValor !== null) {
                    const valoresDiferentes = valorAnterior === null || 
                                             valorAnterior === undefined ||
                                             Math.abs(nuevoValor - (valorAnterior || 0)) > 0.0001;
                    
                    if (valoresDiferentes) {
                        console.log(`  Fila ${fila}, imp_inicial: ${valorAnterior} -> ${nuevoValor}`);
                        filaData.imp_inicial = nuevoValor;
                        huboCambios = true;
                        totalCambios++;
                        actualizarCeldaEnUI(fila, 'imp_inicial', nuevoValor);
                    }
                }
            }
            // CASO: Filas SIN fórmula - calcular imp_inicial = último imp_final + FA
            else if (fila > 15 && filaData.fecha) {
                // Buscar el ÚLTIMO imp_final disponible (NO usar imp_inicial para evitar duplicación)
                let baseCalculo = 0;
                const datosOrdenados = [...datosDiarios].filter(d => d.fila < fila && d.fila >= 15).sort((a, b) => a.fila - b.fila);
                for (const f of datosOrdenados) {
                    if (typeof f.imp_final === 'number') {
                        baseCalculo = f.imp_final;
                    }
                }
                
                const sumaFA = calcularFA(fila, hoja);
                const nuevoValor = baseCalculo + sumaFA;
                const valorAnterior = filaData.imp_inicial;
                
                // Actualizar si hay base o FA
                if ((baseCalculo > 0 || sumaFA !== 0) && (valorAnterior !== nuevoValor && Math.abs((valorAnterior || 0) - nuevoValor) > 0.0001)) {
                    console.log(`  Fila ${fila}: imp_inicial ${valorAnterior} -> ${nuevoValor} (base=${baseCalculo} + FA=${sumaFA})`);
                    filaData.imp_inicial = nuevoValor;
                    huboCambios = true;
                    totalCambios++;
                    actualizarCeldaEnUI(fila, 'imp_inicial', nuevoValor);
                }
                
                // COPIAR imp_final del viernes al sábado/domingo si no hay movimientos
                const fechaFila = parsearFechaValor(filaData.fecha);
                if (fechaFila) {
                    const diaSemana = fechaFila.getDay(); // 0=domingo, 6=sábado
                    const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
                    const sinMovimientos = sumaFA === 0;
                    
                    if (esFinDeSemana && sinMovimientos && baseCalculo > 0) {
                        // Copiar imp_final del día anterior si no existe
                        // PERO NO si el usuario lo borró manualmente
                        const impFinalActual = filaData.imp_final;
                        if (impFinalActual !== baseCalculo && (impFinalActual === null || impFinalActual === undefined) && !filaData._userDeletedImpFinal) {
                            console.log(`  Fila ${fila} (${diaSemana === 0 ? 'domingo' : 'sábado'}): copiando imp_final ${baseCalculo} del día anterior`);
                            filaData.imp_final = baseCalculo;
                            filaData._impFinalSource = 'auto_weekend';
                            filaData._userDeletedImpFinal = false;
                            huboCambios = true;
                            totalCambios++;
                            actualizarCeldaEnUI(fila, 'imp_final', baseCalculo);
                        }
                    }
                }
            }
            
            // Recalcular otras fórmulas (beneficios, etc.) si existen
            if (filaData.formulas) {
                Object.keys(filaData.formulas).forEach(columnaConFormula => {
                    if (columnaConFormula === 'imp_final' || columnaConFormula === 'imp_inicial') {
                        return; // Ya procesado
                    }

                    if (['benef_euro', 'benef_porcentaje', 'benef_euro_acum', 'benef_porcentaje_acum'].includes(columnaConFormula)) {
                        return;
                    }
                    
                    // NO recalcular beneficios si no hay imp_final
                    const esBeneficio = ['benef_euro', 'benef_porcentaje', 'benef_euro_acum', 'benef_porcentaje_acum'].includes(columnaConFormula);
                    if (esBeneficio && !tieneImpFinal) {
                        return;
                    }
                    
                    const formula = filaData.formulas[columnaConFormula];
                    const valorAnterior = filaData[columnaConFormula];
                    const nuevoValor = evaluarFormula(formula, fila, hoja);
                    
                    if (nuevoValor !== null && nuevoValor !== valorAnterior) {
                        const valoresDiferentes = valorAnterior === null || 
                                                 valorAnterior === undefined ||
                                                 Math.abs(nuevoValor - (valorAnterior || 0)) > 0.0001;
                        
                        if (valoresDiferentes) {
                            console.log(`  Fila ${fila}, ${columnaConFormula}: ${valorAnterior} -> ${nuevoValor}`);
                            filaData[columnaConFormula] = nuevoValor;
                            huboCambios = true;
                            totalCambios++;
                            actualizarCeldaEnUI(fila, columnaConFormula, nuevoValor);
                        }
                    }
                });
            }
            
            // IMPORTANTE: Calcular imp_final del día anterior si es necesario
            // SOLO si skipImpFinal es false (no recalcular cuando cambia incremento)
            // La estructura es: cada día tiene 3 filas
            // - Fila N: imp_inicial del día (con fórmula F = F(anterior)+FA)
            // - Fila N+1: (vacía)
            // - Fila N+2: imp_final del día (puede no tener fórmula)
            // 
            // Ejemplo: Día 13: F51 imp_inicial, F53 imp_final
            //         Día 14: F54 imp_inicial = F53+FA55
            //
            // Si F54 tiene fórmula imp_inicial = F53+FA55, pero F53 es null,
            // necesito calcular F53 primero = F51 + FA del día 13
            // PERO: si skipImpFinal es true, NO calcularlo (solo usar el valor existente)
            
            // Si esta fila tiene fórmula imp_inicial que referencia F(anterior), 
            // y F(anterior) es null, calcularlo primero (solo si skipImpFinal es false)
            if (!skipImpFinal && filaData.formulas && filaData.formulas.imp_inicial) {
                const formula = filaData.formulas.imp_inicial;
                // Buscar referencia a fila anterior (ej: F53 en fórmula F54 = F53+FA55)
                const match = formula.match(/F(\d+)/);
                if (match) {
                    const filaAnterior = parseInt(match[1]);
                    const filaAnteriorData = datosDiarios.find(f => f.fila === filaAnterior);
                    
                    // Si la fila anterior tiene imp_final null, calcularlo
                    if (filaAnteriorData && 
                        (filaAnteriorData.imp_final === null || filaAnteriorData.imp_final === undefined) &&
                        (!filaAnteriorData.formulas || !filaAnteriorData.formulas.imp_final)) {
                        
                        // Buscar el imp_inicial del mismo día que la fila anterior
                        const fechaAnterior = filaAnteriorData.fecha;
                        const filaImpInicialAnterior = datosDiarios.find(f => 
                            f.fecha === fechaAnterior && 
                            f.imp_inicial !== null && 
                            f.imp_inicial !== undefined &&
                            f.formulas && 
                            f.formulas.imp_inicial
                        );
                        
                        if (filaImpInicialAnterior) {
                            // imp_final = imp_inicial + FA del día
                            // FA se calcula para la fila siguiente (ej: FA52 para día 13 fila 51)
                            const faFila = filaAnterior + 1; // FA52 para F51, FA55 para F54
                            const faValor = calcularFA(faFila, hoja);
                            const nuevoImpFinal = filaImpInicialAnterior.imp_inicial + faValor;
                            
                            if (Math.abs(nuevoImpFinal - (filaAnteriorData.imp_final || filaImpInicialAnterior.imp_inicial || 0)) > 0.0001) {
                                filaAnteriorData.imp_final = nuevoImpFinal;
                                huboCambios = true;
                                totalCambios++;
                                console.log(`  Fila ${filaAnterior} (imp_final calculado): ${filaImpInicialAnterior.imp_inicial} + FA${faFila}(${faValor}) = ${nuevoImpFinal}`);
                                actualizarCeldaEnUI(filaAnterior, 'imp_final', nuevoImpFinal);
                            }
                        }
                    }
                }
            }
        }
    }
    
    console.log(`✓ Recalculación completada: ${totalCambios} cambios en ${pasada} pasadas`);
    
    // CRÍTICO: Tras recalcular imp_inicial (por cambios en incrementos/decrementos),
    // recalcular también beneficios/acumulados para que no queden valores antiguos.
    recalcularBeneficiosGeneralesDesdeFila(filaInicio, hoja);

    // Recalcular totales generales (filas 3-6) que dependen de SUMs y totales
    recalcularTotalesGenerales(hoja);
    
    // Actualizar tarjetas de resumen en la vista general
    if (vistaActual === 'general') {
        actualizarTarjetasResumen();
    }
}

// Actualizar dato diario
// hojaExplicita: si se pasa, usar esa hoja en lugar de hojaActual (importante para evitar bugs)
async function actualizarDatoDiario(input, cliente, datoDiario, hojaExplicita = null) {
    const campo = input.dataset.campo;
    const esPorcentaje = input.dataset.esPorcentaje === 'true';
    const hojaParaUsar = hojaExplicita || hojaActual;
    
    // DEBUG DETALLADO
    const valorEnInput = input.value;
    const valorNumericoDataset = input.dataset.valorNumerico;
    console.log(`📝 actualizarDatoDiario INICIO:`);
    console.log(`   campo=${campo}, fila=${datoDiario.fila}, hoja=${hojaParaUsar}`);
    console.log(`   input.value="${valorEnInput}", dataset.valorNumerico="${valorNumericoDataset}"`);
    console.log(`   valorActualEnDato=${datoDiario[campo]}`);
    
    // Guardar estado anterior para historial
    const estadoAnterior = {
        tipo: 'cliente',
        clienteIdx: datosEditados?.hojas?.[hojaParaUsar]?.clientes?.indexOf(cliente) ?? -1,
        hoja: hojaParaUsar,
        fila: datoDiario.fila,
        campo: campo,
        valorAnterior: datoDiario[campo]
    };
    
    // Si es un input formateado, usar el valor numérico guardado
    let nuevoValor = null;
    if (input.classList.contains('formatted-number')) {
        nuevoValor = input.dataset.valorNumerico !== '' ? parseFloat(input.dataset.valorNumerico) : null;
        if (isNaN(nuevoValor)) nuevoValor = null;
    } else {
        // Para inputs normales, desformatear el texto
        nuevoValor = desformatearNumero(input.value.trim());
    }
    
    // Validar según el tipo
    let validacion;
    if (esPorcentaje) {
        validacion = validarPorcentaje(nuevoValor);
    } else if (campo === 'incremento' || campo === 'decremento') {
        validacion = validarNumero(nuevoValor, 0); // No negativos
    } else {
        validacion = validarNumero(nuevoValor);
    }
    
    if (!validacion.valido) {
        mostrarNotificacion(`Error de validación: ${validacion.error}`, 'error');
        input.focus();
        return;
    }
    
    nuevoValor = validacion.valor;
    
    // VALIDACIÓN ESPECIAL: Si es decremento, verificar que no exceda el saldo actual
    // Pero ignorar si acabamos de cerrar el modal de saldo excedido
    if (campo === 'decremento' && nuevoValor !== null && nuevoValor !== undefined && nuevoValor > 0) {
        // Si debemos ignorar este blur (acabamos de cerrar el modal), resetear bandera y continuar
        if (ignorarProximoBlurDecremento) {
            ignorarProximoBlurDecremento = false;
            // El valor ya fue restaurado, no hacer nada más
            return;
        }
        
        // Calcular saldo actual ANTES de aplicar el decremento
        const saldoActual = calcularSaldoActualCliente(cliente);
        
        // Si el decremento excede el saldo actual, mostrar alerta y cancelar
        if (nuevoValor > saldoActual) {
            mostrarAlertaSaldoExcedido(saldoActual, nuevoValor, input);
            // Restaurar el valor anterior en el input
            const valorAnterior = datoDiario[campo];
            if (input.classList.contains('formatted-number')) {
                input.value = valorAnterior !== null && valorAnterior !== undefined ? formatearNumeroInput(valorAnterior) : '';
                input.dataset.valorNumerico = valorAnterior !== null && valorAnterior !== undefined ? valorAnterior : '';
            } else {
                input.value = valorAnterior !== null && valorAnterior !== undefined ? formatearMoneda(valorAnterior) : '';
            }
            // NO hacer focus aquí, el modal lo hará al cerrarse
            return;
        }
    }
    
    // IMPORTANTE: Comparar valores considerando null/undefined como equivalentes
    // Esto asegura que cuando se quita un incremento (pone null), se detecte el cambio
    const valorAnterior = datoDiario[campo];
    const valoresDiferentes = (valorAnterior === null || valorAnterior === undefined) !== (nuevoValor === null || nuevoValor === undefined) ||
                              (valorAnterior !== null && valorAnterior !== undefined && nuevoValor !== null && nuevoValor !== undefined && valorAnterior !== nuevoValor);
    
    console.log(`🔄 Comparación: anterior=${valorAnterior} (${typeof valorAnterior}), nuevo=${nuevoValor} (${typeof nuevoValor}), diferentes=${valoresDiferentes}`);
    
    // Actualizar el valor en el dato diario
    if (valoresDiferentes) {
        console.log(`📝 Actualizando ${campo} del cliente: fila ${datoDiario.fila}, valor anterior: ${valorAnterior}, nuevo valor: ${nuevoValor}`);

        if (campo === 'incremento' || campo === 'decremento') {
            marcarDirtyRecalculoMasivo();
        }
        
        // Agregar al historial antes de cambiar
        estadoAnterior.valorNuevo = nuevoValor;
        agregarAlHistorial('cliente', estadoAnterior);
        
        datoDiario[campo] = nuevoValor;
        
        // DEBUG: Verificar que el cambio se aplicó correctamente
        console.log(`✅ Valor actualizado en datoDiario: ${campo} = ${datoDiario[campo]}`);
        
        // Verificar que el cliente está en datosEditados
        const hojaVerif = datosEditados?.hojas?.[hojaParaUsar];
        if (hojaVerif && hojaVerif.clientes) {
            const clienteEnDatos = hojaVerif.clientes.find(c => c === cliente);
            if (clienteEnDatos) {
                const datoEnDatos = clienteEnDatos.datos_diarios?.find(d => d.fila === datoDiario.fila);
                if (datoEnDatos) {
                    console.log(`✅ Verificación: datosEditados[${hojaParaUsar}].clientes[x].datos_diarios[fila=${datoDiario.fila}].${campo} = ${datoEnDatos[campo]}`);
                }
            }
        }
        
        if (campo === 'incremento' || campo === 'decremento') {
            requiereRecalculoImpInicial = true;
        }
        
        input.classList.add('cell-modified');
        
        // IMPORTANTE: Propagar movimientos a la 2ª fila del día para compatibilidad con fórmulas
        // (algunos cálculos referencian la fila 2: K16/L16, K19/L19, etc.)
        if (campo === 'decremento' || campo === 'incremento') {
            const datosDiarios = cliente.datos_diarios || [];
            const mismaFecha = datoDiario.fecha;
            const filasMismaFecha = datosDiarios
                .filter(d => d.fecha === mismaFecha && d.fila >= 15 && d.fila <= 1120)
                .map(d => d.fila)
                .sort((a, b) => a - b);
            
            const posicionEnDia = filasMismaFecha.indexOf(datoDiario.fila);
            
            // Si es la 1ª fila del día (posición 0), propagar a la 2ª fila (posición 1)
            if (posicionEnDia === 0 && filasMismaFecha.length > 1) {
                const segundaFilaNum = filasMismaFecha[1];
                const segundaFila = datosDiarios.find(d => d.fila === segundaFilaNum);
                if (segundaFila) {
                    if (campo === 'decremento') {
                        console.log(`📋 Propagando decremento de fila ${datoDiario.fila} a fila ${segundaFilaNum}: ${nuevoValor}`);
                        segundaFila.decremento = nuevoValor;
                    } else {
                        console.log(`📋 Propagando incremento de fila ${datoDiario.fila} a fila ${segundaFilaNum}: ${nuevoValor}`);
                        segundaFila.incremento = nuevoValor;
                    }
                }
            }
        }
        
        // Si es incremento o decremento, recalcular totales del cliente
        if (campo === 'incremento' || campo === 'decremento') {
            recalcularTotalesCliente(cliente);
            
            // Si es decremento, mostrar aviso de comisión
            if (campo === 'decremento') {
                if (nuevoValor !== null && nuevoValor !== undefined && nuevoValor > 0) {
                    const comisionDecremento = calcularComisionDeDecrementoEnFila(cliente, datoDiario.fila, nuevoValor);
                    if (comisionDecremento > 0) {
                        mostrarNotificacionComision(`Comisión: ${formatearMoneda(comisionDecremento)}`);
                    } else {
                        mostrarNotificacionComision('Este decremento no lleva comisión');
                    }
                }
                
                // Actualizar garantía actual en Info Clientes si está visible
                if (vistaActual === 'infoClientes') {
                    const hojaInfo = hojaInfoClientes || 'Diario STD';
                    const clienteIdxEnInfo = datosEditados?.hojas?.[hojaInfo]?.clientes?.indexOf(cliente);
                    if (clienteIdxEnInfo !== undefined && clienteIdxEnInfo !== -1) {
                        actualizarGarantiaActual(clienteIdxEnInfo, hojaInfo);
                    }
                }
            }
        }

        // Recalcular fórmulas del cliente y guardar en servidor
        // IMPORTANTE: Usar la hoja explícita que se pasó (hojaParaUsar), no hojaActual
        let hojaDelCliente = hojaParaUsar;
        let clienteIdx = -1;
        
        // Buscar en la hoja correcta (la que se pasó desde el input)
        let hoja = datosEditados?.hojas?.[hojaParaUsar];
        if (hoja && hoja.clientes) {
            clienteIdx = hoja.clientes.indexOf(cliente);
            if (clienteIdx === -1 && cliente?.numero_cliente !== undefined) {
                clienteIdx = hoja.clientes.findIndex(c => c.numero_cliente === cliente.numero_cliente);
            }
        }
        
        // Si no lo encontramos en la hoja esperada, buscar en TODAS las hojas (fallback)
        if (clienteIdx === -1) {
            console.warn(`⚠️ Cliente no encontrado en ${hojaParaUsar}, buscando en todas las hojas...`);
            for (const nombreHoja of Object.keys(datosEditados?.hojas || {})) {
                const h = datosEditados.hojas[nombreHoja];
                if (h && h.clientes) {
                    const idx = h.clientes.indexOf(cliente);
                    if (idx !== -1) {
                        clienteIdx = idx;
                        hojaDelCliente = nombreHoja;
                        hoja = h;
                        console.log(`📋 Cliente encontrado en hoja: ${nombreHoja}`);
                        break;
                    }
                    // Buscar por numero_cliente también
                    if (cliente?.numero_cliente !== undefined) {
                        const idxPorNum = h.clientes.findIndex(c => c.numero_cliente === cliente.numero_cliente);
                        if (idxPorNum !== -1) {
                            clienteIdx = idxPorNum;
                            hojaDelCliente = nombreHoja;
                            hoja = h;
                            console.log(`📋 Cliente encontrado por número en hoja: ${nombreHoja}`);
                            break;
                        }
                    }
                }
            }
        }
        
        console.log(`🔍 Cliente index: ${clienteIdx}, hoja: ${hojaDelCliente}, fila: ${datoDiario.fila}, campo: ${campo}`);
        
        if (clienteIdx !== -1 && hoja) {
            console.log(`🔄 Recalculando fórmulas del cliente ${clienteIdx + 1} en ${hojaDelCliente} después de cambiar ${campo} en fila ${datoDiario.fila}...`);
            
            // CRÍTICO: Recalcular saldos del cliente EN MEMORIA antes de cualquier otra cosa
            // Esto asegura que los valores se limpien/actualicen correctamente
            recalcularSaldosClienteEnMemoria(hoja, clienteIdx);
            
            // Recalcular fórmulas del cliente
            await recalcularFormulasPorCambioClienteEnHoja(clienteIdx, datoDiario.fila, campo, hojaDelCliente);
            
            // CRÍTICO: Recalcular imp_inicial de la vista general INMEDIATAMENTE
            // para que al ir a General se vean los valores correctos
            if (campo === 'incremento' || campo === 'decremento') {
                console.log(`📊 Recalculando imp_inicial de vista general...`);
                recalcularImpInicialSync(hoja);
            }
            
            // Refrescar la tabla del cliente
            if (hoja.clientes && hoja.clientes[clienteIdx]) {
                console.log(`🔄 Refrescando tabla del cliente ${clienteIdx + 1}...`);
                void mostrarTablaEditableCliente(hoja.clientes[clienteIdx], hoja, clienteIdx);
            }

            // Refrescar vistas dependientes
            if (vistaActual === 'general') {
                mostrarVistaGeneral();
            }
            if (vistaActual === 'comision') {
                mostrarComision();
            }
            
            // Guardar datos después de recalcular
            console.log(`💾 Guardando datos después de modificar cliente...`);
            await guardarDatosAutomatico(0, 1);
            mostrarNotificacion('✓ Cambio guardado automáticamente', 'success');
            console.log(`✅ Guardado completado`);
        } else {
            console.warn(`⚠️ No se encontró índice del cliente, guardando sin recalcular`);
            await guardarDatosAutomatico(0, 0);
        }
    } else {
        console.log(`ℹ️ No hubo cambios en el valor (anterior: ${valorAnterior}, nuevo: ${nuevoValor})`);
    }
}

// Mostrar información del cliente
function mostrarInfoCliente(cliente) {
    const infoDiv = document.getElementById('infoCliente');
    const datos = cliente.datos || {};
    const mes = datos['MES']?.valor || '-';
    const fecha = datos['FECHA']?.valor ? formatearFecha(datos['FECHA'].valor) : '-';
    const impInicial = datos['IMP. INICIAL']?.valor ? formatearMoneda(datos['IMP. INICIAL'].valor) : '-';
    const impFinal = datos['IMP. FINAL']?.valor ? formatearMoneda(datos['IMP. FINAL'].valor) : '-';
    
    infoDiv.innerHTML = `
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Mes:</span>
                <span class="info-value">${mes}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Fecha:</span>
                <span class="info-value">${fecha}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Importe Inicial:</span>
                <span class="info-value">${impInicial}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Importe Final:</span>
                <span class="info-value">${impFinal}</span>
            </div>
        </div>
    `;
}

// Actualizar valor del cliente
function actualizarValorCliente(input, cliente) {
    const campoId = input.dataset.campo;
    const tipo = input.dataset.tipo;
    const campoNombre = input.dataset.campoOriginal;
    
    let nuevoValor = input.value.trim();
    
    if (nuevoValor === '') {
        nuevoValor = null;
    } else {
        nuevoValor = parseFloat(nuevoValor);
        if (isNaN(nuevoValor)) {
            nuevoValor = null;
        } else if (tipo === 'porcentaje') {
            // Convertir de porcentaje a decimal para guardar
            nuevoValor = nuevoValor / 100;
        }
    }
    
    // Mapear el nombre del campo al campo real en el objeto cliente
    const campoMap = {
        'incrementos': 'incrementos_total',
        'decrementos': 'decrementos_total',
        'beneficio_diario': 'beneficio_diario',
        'beneficio_diario_pct': 'beneficio_diario_pct'
    };
    
    const campoReal = campoMap[campoId];
    if (campoReal) {
        const valorAnterior = cliente[campoReal];
        if (valorAnterior !== nuevoValor) {
            cliente[campoReal] = nuevoValor;
            input.classList.add('cell-modified');
            mostrarNotificacion('Cambio guardado localmente', 'success');
        }
    }
}

// Formatear valor
function formatearValor(valor, campo) {
    if (valor === null || valor === undefined) return '-';
    
    if (campo.includes('€') || campo.includes('IMP')) {
        return formatearMoneda(valor);
    } else if (campo.includes('%')) {
        return formatearPorcentaje(valor);
    } else if (campo === 'FECHA') {
        return formatearFecha(valor);
    }
    
    return valor.toString();
}

// Formatear moneda
// Formatear número para mostrar en input (sin símbolo €)
function formatearNumeroInput(valor) {
    if (valor === null || valor === undefined || valor === '') return '';
    const num = parseFloat(valor);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true
    }).format(num);
}

function formatearInputNumero(input) {
    let valor = input.value;
    const cursorPos = input.selectionStart;
    
    // Remover todo excepto números y separadores
    valor = valor.replace(/[^0-9,.]/g, '');

    // Normalizar a número evitando el bug: 20.000,00 -> 20,00
    const raw = valor;
    const tienePunto = raw.includes('.');
    const tieneComa = raw.includes(',');
    let normalizado = raw;
    let decimalSep = null;

    if (tienePunto && tieneComa) {
        const lastDot = raw.lastIndexOf('.');
        const lastComma = raw.lastIndexOf(',');
        decimalSep = lastComma > lastDot ? ',' : '.';
    } else if (tieneComa) {
        decimalSep = ',';
    } else if (tienePunto) {
        // Si hay un solo punto y parece decimal, usarlo como decimal; si no, es miles
        const parts = raw.split('.');
        if (parts.length === 2 && parts[1].length <= 2) {
            decimalSep = '.';
        } else {
            decimalSep = null;
        }
    }

    if (decimalSep) {
        const idx = raw.lastIndexOf(decimalSep);
        const entero = raw.slice(0, idx).replace(/[.,]/g, '');
        const dec = raw.slice(idx + 1).replace(/[.,]/g, '').slice(0, 2);
        normalizado = `${entero}.${dec}`;
    } else {
        normalizado = raw.replace(/[.,]/g, '');
    }
    
    // Convertir a número y formatear
    if (valor === '' || valor === ',') {
        input.value = '';
        input.dataset.valorNumerico = '';
        return;
    }
    
    const valorNumerico = parseFloat(normalizado);
    
    if (!isNaN(valorNumerico)) {
        // Formatear con puntos y comas
        const formateado = formatearNumeroInput(valorNumerico);
        input.value = formateado;
        input.dataset.valorNumerico = valorNumerico;
        
        // Ajustar posición del cursor (aproximada)
        setTimeout(() => {
            const nuevaPos = Math.min(cursorPos + (formateado.length - valor.length), formateado.length);
            input.setSelectionRange(nuevaPos, nuevaPos);
        }, 0);
    } else {
        // Si no es un número válido, mantener el valor pero limpiar el numérico
        input.dataset.valorNumerico = '';
    }
}

// Convertir texto formateado a número
function desformatearNumero(texto) {
    if (!texto || texto === '') return null;
    // Remover puntos (separadores de miles) y reemplazar coma por punto
    const numero = texto.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(numero);
    return isNaN(num) ? null : num;
}

function formatearMoneda(valor) {
    if (valor === null || valor === undefined) return '0,00 €';
    const num = parseFloat(valor);
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

// Formatear porcentaje
function formatearPorcentaje(valor) {
    if (valor === null || valor === undefined) return '0,00%';
    const num = parseFloat(valor);
    return (num * 100).toFixed(2) + '%';
}

// Convertir número de columna a letra (1=A, 27=AA, etc.)
function numeroALetra(num) {
    let result = "";
    while (num > 0) {
        num--;
        result = String.fromCharCode(65 + (num % 26)) + result;
        num = Math.floor(num / 26);
    }
    return result;
}

function parsearFechaValor(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return valor;
    if (typeof valor === 'string') {
        let s = valor.trim();
        if (s.includes(' ')) {
            s = s.split(' ')[0];
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const fechaISO = new Date(`${s}T00:00:00`);
            return isNaN(fechaISO.getTime()) ? null : fechaISO;
        }
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
            const [d, m, y] = s.split('/');
            const fechaDMY = new Date(`${y}-${m}-${d}T00:00:00`);
            return isNaN(fechaDMY.getTime()) ? null : fechaDMY;
        }
    }
    const fecha = new Date(valor);
    return isNaN(fecha.getTime()) ? null : fecha;
}

// Formatear fecha
function formatearFecha(valor) {
    if (!valor) return '-';
    const fecha = parsearFechaValor(valor);
    if (!fecha) return valor.toString();
    return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Guardar cambios
function guardarCambios() {
    abrirModalConfirmacion({
        title: 'Confirmar Cambios',
        message: '¿Estás seguro de que quieres guardar los cambios?',
        confirmText: 'Sí, Guardar',
        onConfirm: async () => {
            try {
                await guardarDatosAutomatico(0, 0);
                mostrarNotificacion('Todos los cambios guardados correctamente', 'success');
                if (vistaActual === 'general') {
                    mostrarVistaGeneral();
                } else if (vistaActual === 'detalle' && clienteActual !== null) {
                    const hoja = datosEditados.hojas[hojaActual];
                    const cliente = hoja.clientes && hoja.clientes[clienteActual] ? hoja.clientes[clienteActual] : null;
                    if (cliente) {
                        void mostrarTablaEditableCliente(cliente, hoja, clienteActual);
                    }
                }
            } catch (error) {
                console.error('Error al guardar:', error);
                mostrarNotificacion('Error al guardar los cambios', 'error');
            }
        }
    });
}

let __modalConfirmCallback = null;

function abrirModalConfirmacion({ title, message, confirmText, onConfirm }) {
    const modal = document.getElementById('modalConfirmacion');
    if (!modal) return;
    const h3 = modal.querySelector('h3');
    const p = modal.querySelector('p');
    const btn = document.getElementById('confirmarGuardar');
    if (h3) h3.textContent = title || 'Confirmar';
    if (p) p.textContent = message || '¿Estás seguro?';
    if (btn) btn.textContent = confirmText || 'Confirmar';
    __modalConfirmCallback = typeof onConfirm === 'function' ? onConfirm : null;
    modal.classList.add('active');
}

// Confirmar (genérico)
function confirmarGuardar() {
    const cb = __modalConfirmCallback;
    cerrarModal();
    if (cb) {
        void cb();
        return;
    }
}

// Cerrar modal
function cerrarModal() {
    const modal = document.getElementById('modalConfirmacion');
    if (modal) modal.classList.remove('active');
    __modalConfirmCallback = null;
}

async function limpiarDatosUsuarioMesActualConConfirmacion() {
    abrirModalConfirmacion({
        title: 'Confirmar limpieza',
        message: '¿Estás seguro? Esto borrará TODOS los datos introducidos por ti en este mes (incrementos, decrementos, importes finales, etc.). Las fórmulas NO se borrarán.',
        confirmText: 'Sí, Limpiar',
        onConfirm: limpiarDatosUsuarioMesActual
    });
}

async function limpiarDatosUsuarioMesActual() {
    const hoja = datosEditados?.hojas?.[hojaActual];
    if (!hoja) return;

    // 1) Limpiar datos generales / diarios: solo celdas manuales del usuario, pero también limpiar caches calculadas.
    const colsGen = ['imp_inicial', 'imp_final', 'benef_euro', 'benef_porcentaje', 'benef_euro_acum', 'benef_porcentaje_acum'];

    const limpiarRow = (row) => {
        if (!row) return;
        colsGen.forEach(col => {
            // Si el usuario puede escribir aquí (no fórmula y no bloqueada) => borrar
            if (esCeldaManualGeneral(row, col)) {
                if (row[col] !== null && row[col] !== undefined) row[col] = null;
                return;
            }
            // Si es calculada, dejarla vacía para evitar valores fantasma (se recalcula)
            if (row[col] !== null && row[col] !== undefined) {
                row[col] = null;
            }
        });
    };

    (hoja.datos_generales || []).forEach(limpiarRow);
    (hoja.datos_diarios_generales || []).forEach(limpiarRow);

    // 2) Limpiar clientes: borrar incrementos/decrementos (entradas del usuario) y limpiar campos calculados.
    const colsCalcCliente = ['base', 'saldo_diario', 'beneficio_diario', 'beneficio_diario_pct', 'beneficio_acumulado', 'beneficio_acumulado_pct'];
    (hoja.clientes || []).forEach(c => {
        (c.datos_diarios || []).forEach(d => {
            if (!d) return;
            if (typeof d.incremento === 'number') d.incremento = null;
            if (typeof d.decremento === 'number') d.decremento = null;
            colsCalcCliente.forEach(k => {
                if (d[k] !== null && d[k] !== undefined) d[k] = null;
            });
        });
        c.incrementos_total = 0;
        c.decrementos_total = 0;
        c.saldo_actual = 0;
        c._acumPrevInc = 0;
        c._acumPrevDec = 0;
        c.saldo_inicial_mes = 0;
    });

    requiereRecalculoImpInicial = true;
    await actualizarTodoElDiario({ silent: true, skipVistaRefresh: true, skipGuardar: true, reason: 'limpiar_datos_mes' });
    await guardarDatosAutomatico(0, 0);

    if (vistaActual === 'general') {
        mostrarVistaGeneral();
    } else if (vistaActual === 'clientes') {
        renderVistaClientes();
    } else if (vistaActual === 'detalle' && clienteActual !== null && clienteActual !== undefined) {
        const idx = parseInt(clienteActual);
        if (!isNaN(idx)) void renderDetalleCliente(idx);
    }

    mostrarNotificacion('Datos del mes limpiados', 'success');
}

// Exportar JSON
function exportarJSON() {
    const datosExportar = JSON.stringify(datosEditados, null, 2);
    const blob = new Blob([datosExportar], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diario_${hojaActual.toLowerCase().replace(' ', '_')}_editado.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarNotificacion('Archivo JSON exportado', 'success');
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.getElementById('notificacion');
    notificacion.textContent = mensaje;
    notificacion.className = `notificacion ${tipo}`;
    notificacion.classList.add('show');
    
    setTimeout(() => {
        notificacion.classList.remove('show');
    }, 3000);
}

// ==================== VISTA INFO CLIENTES ====================

// Cambiar hoja en Info Clientes
function cambiarHojaInfoClientes(nuevaHoja) {
    hojaInfoClientes = nuevaHoja;
    
    // Actualizar tabs activos
    const tabSTD = document.getElementById('tabSTD');
    const tabVIP = document.getElementById('tabVIP');
    const tabWIND = document.getElementById('tabWIND');
    
    if (tabSTD) tabSTD.classList.toggle('active', nuevaHoja === 'Diario STD');
    if (tabVIP) tabVIP.classList.toggle('active', nuevaHoja === 'Diario VIP');
    if (tabWIND) tabWIND.classList.toggle('active', nuevaHoja === 'Diario WIND');
    
    // Limpiar el buscador
    const buscarInput = document.getElementById('buscarInfoCliente');
    if (buscarInput) {
        buscarInput.value = '';
    }
    
    // Recargar la lista de clientes
    mostrarInfoClientes();
}

// Mostrar vista Info Clientes
function mostrarVistaInfoClientes() {
    vistaActual = 'infoClientes';

    __infoClienteExpandido = null;
    
    document.getElementById('vistaGeneral').classList.remove('active');
    document.getElementById('vistaClientes').classList.remove('active');
    document.getElementById('vistaDetalle').classList.remove('active');
    const vistaComision = document.getElementById('vistaComision');
    if (vistaComision) vistaComision.classList.remove('active');
    const vistaEstadisticas = document.getElementById('vistaEstadisticas');
    if (vistaEstadisticas) vistaEstadisticas.classList.remove('active');
    const vistaInfo = document.getElementById('vistaInfoClientes');
    if (vistaInfo) vistaInfo.classList.add('active');
    
    // Actualizar botones
    document.getElementById('btnVistaGeneral').classList.remove('active');
    document.getElementById('btnVistaClientes').classList.remove('active');
    const btnCom = document.getElementById('btnVistaComision');
    if (btnCom) btnCom.classList.remove('active');
    const btnEstadisticas = document.getElementById('btnVistaEstadisticas');
    if (btnEstadisticas) btnEstadisticas.classList.remove('active');
    const btnInfo = document.getElementById('btnVistaInfoClientes');
    if (btnInfo) btnInfo.classList.add('active');
    
    // Detectar diario actual al entrar
    hojaInfoClientes = hojaActual;
    
    // Actualizar tabs según la hoja seleccionada
    cambiarHojaInfoClientes(hojaInfoClientes);
    
    mostrarInfoClientes();
}

// Mostrar información de todos los clientes (optimizado: solo lista inicial)
function mostrarInfoClientes() {
    const container = document.getElementById('infoClientesContainer');
    if (!container) return;
    
    // Usar la hoja seleccionada en Info Clientes, no la hoja actual general
    const hojaParaMostrar = hojaInfoClientes || 'Diario STD';
    
    // MODO ANUAL: Usar clientes anuales si están disponibles
    let clientes = [];
    
    if (clientesAnuales && clientesAnuales.length > 0) {
        // Combinar clientes anuales con datos del mes actual
        const hoja = datosEditados?.hojas?.[hojaParaMostrar];
        clientes = clientesAnuales.map((clienteAnual, idx) => {
            const clienteMes = hoja?.clientes?.[idx];
            return {
                ...clienteAnual,
                // Datos del cliente (nombre, garantía, etc.) - priorizar datos del mes actual
                datos: clienteMes?.datos || clienteAnual?.datos || {},
                incrementos_total: clienteMes?.incrementos_total || 0,
                decrementos_total: clienteMes?.decrementos_total || 0,
                saldo_actual: clienteMes?.saldo_actual || 0,
                datos_diarios: clienteMes?.datos_diarios || [],
                _acumPrevInc: clienteMes?._acumPrevInc || 0,
                _acumPrevDec: clienteMes?._acumPrevDec || 0,
                saldo_inicial_mes: clienteMes?.saldo_inicial_mes || 0
            };
        });
    } else {
        // MODO MENSUAL (fallback)
        if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[hojaParaMostrar]) {
            container.innerHTML = '<div class="error-box"><p>No hay datos disponibles</p></div>';
            return;
        }
        const hoja = datosEditados.hojas[hojaParaMostrar];
        clientes = hoja.clientes || [];
    }
    
    if (clientes.length === 0) {
        container.innerHTML = '<div class="info-box"><p>No hay clientes en esta hoja</p></div>';
        return;
    }
    
    container.innerHTML = '';
    
    const q = (document.getElementById('buscarInfoCliente')?.value || '').trim().toLowerCase();

    // Obtener hoja para cálculos de proporción
    const hoja = datosEditados?.hojas?.[hojaParaMostrar];
    const fechaObjetivoProporcion = hoja ? obtenerUltimaFechaImpFinalManual(hoja) : null;
    const totalSaldosProporcion = (hoja && fechaObjetivoProporcion)
        ? obtenerTotalSaldosClientesEnFecha(hoja, fechaObjetivoProporcion)
        : null;
    const fechaObjetivoProporcionTexto = fechaObjetivoProporcion ? formatearFecha(fechaObjetivoProporcion) : null;
    
    // Crear lista simple de números de clientes
    const listaClientes = document.createElement('div');
    listaClientes.className = 'clientes-lista-simple';
    
    clientes.forEach((cliente, index) => {
        const itemCliente = document.createElement('div');
        itemCliente.className = 'cliente-item-simple';
        itemCliente.dataset.clienteIndex = index;
        
        // Obtener nombre si existe para mostrar en la lista
        const datosCliente = cliente.datos || {};
        const nombre = datosCliente['NOMBRE']?.valor || '';
        const apellidos = datosCliente['APELLIDOS']?.valor || '';
        const nombreCompleto = nombre || apellidos ? `${nombre} ${apellidos}`.trim() : '';
        
        // Formato: "Cliente 1 - Jordi Ibiza" o solo "Cliente 1" si no hay nombre
        const textoCliente = nombreCompleto 
            ? `Cliente ${index + 1} - ${nombreCompleto}`
            : `Cliente ${index + 1}`;

        const saldoProporcion = (hoja && fechaObjetivoProporcion)
            ? obtenerSaldoClienteEnFecha(cliente, fechaObjetivoProporcion)
            : null;
        const proporcion = (totalSaldosProporcion && totalSaldosProporcion !== 0 && typeof saldoProporcion === 'number')
            ? (saldoProporcion / totalSaldosProporcion)
            : null;
        const proporcionLabel = (proporcion !== null)
            ? `${formatearPorcentaje(proporcion)}${fechaObjetivoProporcionTexto ? ` (${fechaObjetivoProporcionTexto})` : ''}`
            : '';

        if (q) {
            const numStr = String(index + 1);
            const full = `${nombre} ${apellidos}`.trim().toLowerCase();
            const match = numStr.includes(q) || nombre.toLowerCase().includes(q) || apellidos.toLowerCase().includes(q) || full.includes(q);
            if (!match) return;
        }
        
        // Indicador de hoja (STD, VIP o WIND)
        let badgeHoja = '<span class="badge-std">STD</span>';
        if (hojaParaMostrar === 'Diario VIP') {
            badgeHoja = '<span class="badge-vip">VIP</span>';
        } else if (hojaParaMostrar === 'Diario WIND') {
            badgeHoja = '<span class="badge-wind">WIND</span>';
        }
        
        // Crear ID seguro sin espacios
        const hojaId = hojaParaMostrar.replace(/\s+/g, '_');
        
        itemCliente.innerHTML = `
            <div class="cliente-item-header" onclick="toggleClienteInfo(${index}, '${hojaParaMostrar}')">
                <span class="cliente-texto">${textoCliente}</span>
                ${proporcionLabel ? `<span class="cliente-proporcion">${proporcionLabel}</span>` : ''}
                ${badgeHoja}
                <span class="cliente-toggle">▶</span>
            </div>
            <div class="cliente-info-detalle" id="clienteInfo_${hojaId}_${index}" style="display: none;">
                <!-- Se llenará cuando se expanda -->
            </div>
        `;
        
        listaClientes.appendChild(itemCliente);
    });
    
    container.appendChild(listaClientes);
}

// Toggle para expandir/colapsar información del cliente (global para onclick)
window.toggleClienteInfo = function(index, hoja) {
    // Si no se pasa hoja, usar la hoja seleccionada en Info Clientes
    const hojaParaUsar = hoja || hojaInfoClientes || 'Diario STD';
    const hojaId = hojaParaUsar.replace(/\s+/g, '_');
    const detalleDiv = document.getElementById(`clienteInfo_${hojaId}_${index}`);
    const itemCliente = document.querySelector(`.cliente-item-simple[data-cliente-index="${index}"]`);
    const toggle = itemCliente ? itemCliente.querySelector('.cliente-toggle') : null;
    
    if (!detalleDiv || !itemCliente) return;

    // Colapsar el que estuviera abierto previamente (si es distinto)
    if (__infoClienteExpandido && (__infoClienteExpandido.index !== index || __infoClienteExpandido.hojaId !== hojaId)) {
        const prev = document.getElementById(`clienteInfo_${__infoClienteExpandido.hojaId}_${__infoClienteExpandido.index}`);
        const prevItem = document.querySelector(`.cliente-item-simple[data-cliente-index="${__infoClienteExpandido.index}"]`);
        const prevToggle = prevItem ? prevItem.querySelector('.cliente-toggle') : null;
        if (prev && prevItem) {
            prev.style.display = 'none';
            prevItem.classList.remove('expanded');
            if (prevToggle) prevToggle.textContent = '▶';
        }
        __infoClienteExpandido = null;
    }
    
    // Si ya está expandido, colapsar
    if (detalleDiv.style.display !== 'none') {
        detalleDiv.style.display = 'none';
        if (toggle) toggle.textContent = '▶';
        itemCliente.classList.remove('expanded');
        return;
    }
    
    // Si no está cargado, cargar la información
    if (!detalleDiv.hasAttribute('data-loaded')) {
        cargarInfoClienteDetalle(index, detalleDiv, hojaParaUsar);
        detalleDiv.setAttribute('data-loaded', 'true');
    }
    
    // Expandir
    detalleDiv.style.display = 'block';
    if (toggle) toggle.textContent = '▼';
    itemCliente.classList.add('expanded');
    __infoClienteExpandido = { index, hojaId };
};

// Cargar información detallada del cliente (solo cuando se expande)
function cargarInfoClienteDetalle(index, container, hojaParaUsar) {
    // Si no se pasa hoja, usar la hoja seleccionada en Info Clientes
    const hoja = hojaParaUsar || hojaInfoClientes || 'Diario STD';
    
    if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[hoja]) {
        return;
    }
    
    const hojaData = datosEditados.hojas[hoja];
    const clientes = hojaData.clientes || [];
    const cliente = clientes[index];
    
    if (!cliente) return;
    
    // Calcular totales si no están calculados
    if (!cliente.incrementos_total && cliente.datos_diarios) {
        recalcularTotalesCliente(cliente);
    }
    
    const invertido = cliente.incrementos_total || 0;
    const retirado = cliente.decrementos_total || 0;
    
    // Calcular saldo actual: último valor de saldo_diario numérico con FECHA ESCRITA
    let saldoActual = null;
    let saldoActualFila = null;
    const datosDiariosValidos = (cliente.datos_diarios || []).filter(d =>
        d.fila >= 15 && d.fila <= 1120 &&
        d.fecha && d.fecha !== 'FECHA' && // Solo filas con fecha escrita
        d.saldo_diario !== null && d.saldo_diario !== undefined &&
        typeof d.saldo_diario === 'number'
    );
    if (datosDiariosValidos.length > 0) {
        datosDiariosValidos.sort((a, b) => (a.fila || 0) - (b.fila || 0));
        const ultimoConSaldo = datosDiariosValidos[datosDiariosValidos.length - 1];
        saldoActual = ultimoConSaldo.saldo_diario;
        saldoActualFila = ultimoConSaldo.fila;
    }
    
    // Si no hay saldo_diario válido, usar el cálculo por defecto
    if (saldoActual === null) {
        saldoActual = invertido - retirado;
    }
    
    const fechaObjetivoProporcion = hojaData ? obtenerUltimaFechaImpFinalManual(hojaData) : null;
    const saldoEnFechaObjetivo = (fechaObjetivoProporcion && typeof obtenerSaldoClienteEnFecha === 'function')
        ? obtenerSaldoClienteEnFecha(cliente, fechaObjetivoProporcion)
        : null;
    const saldoParaProporcion = (typeof saldoEnFechaObjetivo === 'number') ? saldoEnFechaObjetivo : saldoActual;
    const totalSaldos = (hojaData && fechaObjetivoProporcion)
        ? obtenerTotalSaldosClientesEnFecha(hojaData, fechaObjetivoProporcion)
        : null;
    const proporcion = (totalSaldos && totalSaldos !== 0 && typeof saldoParaProporcion === 'number')
        ? (saldoParaProporcion / totalSaldos)
        : null;

    const fechaPropTexto = fechaObjetivoProporcion ? formatearFecha(fechaObjetivoProporcion) : null;
    const proporcionTexto = (proporcion !== null && totalSaldos !== null)
        ? `<span class="proporcion-pct">${formatearPorcentaje(proporcion)}</span> <span class="proporcion-detalle">(${formatearMoneda(saldoParaProporcion)} / ${formatearMoneda(totalSaldos)})${fechaPropTexto ? ` - ${fechaPropTexto}` : ''}</span>`
        : (proporcion !== null ? `<span class="proporcion-pct">${formatearPorcentaje(proporcion)}</span>${fechaPropTexto ? ` <span class="proporcion-detalle">${fechaPropTexto}</span>` : ''}` : '—');
    
    // Obtener datos del cliente (si existen)
    const datosCliente = cliente.datos || {};
    const garantiaInicial = datosCliente['GARANTIA_INICIAL']?.valor || datosCliente['GARANTIA']?.valor || '';
    const garantiaInicialNum = garantiaInicial ? parseFloat(garantiaInicial) : 0;
    const garantiaActual = Math.max(0, garantiaInicialNum - retirado); // Mínimo 0, nunca negativo
    const nombre = datosCliente['NOMBRE']?.valor || '';
    const apellidos = datosCliente['APELLIDOS']?.valor || '';
    const telefono = datosCliente['TELEFONO']?.valor || '';
    const email = datosCliente['EMAIL']?.valor || '';
    
    // Calcular beneficio mensual y rentabilidad mensual del cliente
    // Beneficio mensual = proporción del cliente * beneficio total general del mes
    // Rentabilidad mensual = beneficio mensual / saldo cliente
    const datosGen = hojaData.datos_diarios_generales || [];
    let beneficioMensualGeneral = 0;
    
    // Buscar el último benef_euro_acum del mes
    const datosGenOrdenados = datosGen
        .filter(d => d.fila >= 15 && d.fila <= 1120 && typeof d.benef_euro_acum === 'number')
        .sort((a, b) => b.fila - a.fila);
    
    if (datosGenOrdenados.length > 0) {
        beneficioMensualGeneral = datosGenOrdenados[0].benef_euro_acum || 0;
    }
    
    // Beneficio mensual del cliente = proporción * beneficio general
    const beneficioMensualCliente = proporcion !== null ? proporcion * beneficioMensualGeneral : 0;
    
    // Rentabilidad mensual = beneficio / saldo (si saldo > 0)
    const rentabilidadMensual = saldoActual > 0 ? (beneficioMensualCliente / saldoActual) : 0;
    
    container.innerHTML = `
        <div class="info-cliente-body">
            <div class="info-cliente-row">
                <div class="info-cliente-field editable-field">
                    <label>Nombre</label>
                    <input type="text" class="info-cliente-input" data-cliente="${index}" data-campo="NOMBRE" data-hoja="${hoja}" value="${nombre}" placeholder="Nombre">
                </div>
                <div class="info-cliente-field editable-field">
                    <label>Apellidos</label>
                    <input type="text" class="info-cliente-input" data-cliente="${index}" data-campo="APELLIDOS" data-hoja="${hoja}" value="${apellidos}" placeholder="Apellidos">
                </div>
                <div class="info-cliente-field editable-field">
                    <label>Teléfono</label>
                    <input type="tel" class="info-cliente-input" data-cliente="${index}" data-campo="TELEFONO" data-hoja="${hoja}" value="${telefono}" placeholder="Teléfono">
                </div>
                <div class="info-cliente-field editable-field">
                    <label>Email</label>
                    <input type="email" class="info-cliente-input" data-cliente="${index}" data-campo="EMAIL" data-hoja="${hoja}" value="${email}" placeholder="Email">
                </div>
            </div>
            <div class="info-cliente-row">
                <div class="info-cliente-field">
                    <label>Capital Invertido</label>
                    <div class="info-cliente-value">${formatearMoneda(invertido)}</div>
                </div>
                <div class="info-cliente-field">
                    <label>Capital Retirado</label>
                    <div class="info-cliente-value">${formatearMoneda(retirado)}</div>
                </div>
                <div class="info-cliente-field">
                    <label>Saldo Actual</label>
                    <div class="info-cliente-value ${saldoActual >= 0 ? 'positive' : 'negative'}">${formatearMoneda(saldoActual)}</div>
                </div>
                <div class="info-cliente-field">
                    <label>Proporción del Total</label>
                    <div class="info-cliente-value">${proporcionTexto}</div>
                </div>
            </div>
            <div class="info-cliente-row">
                <div class="info-cliente-field">
                    <label>Beneficio Mensual</label>
                    <div class="info-cliente-value ${beneficioMensualCliente >= 0 ? 'positive' : 'negative'}">${formatearMoneda(beneficioMensualCliente)}</div>
                </div>
                <div class="info-cliente-field">
                    <label>Rentabilidad Mensual</label>
                    <div class="info-cliente-value ${rentabilidadMensual >= 0 ? 'positive' : 'negative'}">${formatearPorcentaje(rentabilidadMensual)}</div>
                </div>
                <div class="info-cliente-field editable-field">
                    <label>Garantía Inicial</label>
                    <input type="text" class="info-cliente-input formatted-number" data-cliente="${index}" data-campo="GARANTIA_INICIAL" data-hoja="${hoja}" value="${garantiaInicial ? formatearNumeroInput(garantiaInicial) : ''}" placeholder="Garantía" data-valor-numerico="${garantiaInicialNum}">
                </div>
                <div class="info-cliente-field">
                    <label>Garantía Actual</label>
                    <div class="info-cliente-value ${garantiaActual >= 0 ? 'positive' : 'negative'}">${formatearMoneda(garantiaActual)}</div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar event listeners a los inputs
    container.querySelectorAll('.info-cliente-input').forEach(input => {
        // Si es un campo numérico (garantía inicial), formatear al perder el foco
        if (input.classList.contains('formatted-number')) {
            prepararInputEdicion(input);
            input.addEventListener('blur', (e) => {
                if (e.target.dataset.skipCommitOnce === '1') {
                    e.target.dataset.skipCommitOnce = '0';
                    return;
                }
                e.target.dataset.overwritePending = '0';
                formatearInputNumero(e.target);
                actualizarInfoCliente(e.target);
                // Recalcular garantía actual después de actualizar
                actualizarGarantiaActual(index, hoja);
            });
        } else {
            input.addEventListener('blur', (e) => {
                actualizarInfoCliente(e.target);
            });
        }
    });
    
    // Guardar referencia al contenedor para poder actualizar la garantía actual
    container.dataset.clienteIndex = index;
    container.dataset.hoja = hoja;
}

// Actualizar garantía actual cuando cambia garantía inicial o decrementos
function actualizarGarantiaActual(clienteIndex, hoja) {
    const hojaId = hoja.replace(/\s+/g, '_');
    const detalleDiv = document.getElementById(`clienteInfo_${hojaId}_${clienteIndex}`);
    if (!detalleDiv) return;
    
    if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[hoja]) {
        return;
    }
    
    const hojaData = datosEditados.hojas[hoja];
    const clientes = hojaData.clientes || [];
    const cliente = clientes[clienteIndex];
    
    if (!cliente) return;
    
    // Recalcular totales si es necesario
    if (!cliente.decrementos_total && cliente.datos_diarios) {
        recalcularTotalesCliente(cliente);
    }
    
    const retirado = cliente.decrementos_total || 0;
    const datosCliente = cliente.datos || {};
    const garantiaInicial = datosCliente['GARANTIA_INICIAL']?.valor || datosCliente['GARANTIA']?.valor || '';
    const garantiaInicialNum = garantiaInicial ? parseFloat(garantiaInicial) : 0;
    const garantiaActual = Math.max(0, garantiaInicialNum - retirado); // Mínimo 0, nunca negativo
    
    // Actualizar el valor de garantía actual en el DOM
    const garantiaActualValue = detalleDiv.querySelectorAll('.info-cliente-field');
    garantiaActualValue.forEach(field => {
        const label = field.querySelector('label');
        if (label && label.textContent.includes('Garantía Actual')) {
            const valueDiv = field.querySelector('.info-cliente-value');
            if (valueDiv) {
                valueDiv.textContent = formatearMoneda(garantiaActual);
                valueDiv.className = `info-cliente-value ${garantiaActual >= 0 ? 'positive' : 'negative'}`;
            }
        }
    });
}

// Actualizar información del cliente
async function actualizarInfoCliente(input) {
    const clienteIndex = parseInt(input.dataset.cliente);
    const campo = input.dataset.campo;
    const hojaCliente = input.dataset.hoja || hojaInfoClientes || 'Diario STD';
    let nuevoValor = input.value.trim();
    
    // Si es un campo numérico formateado, usar el valor numérico
    if (input.classList.contains('formatted-number')) {
        nuevoValor = input.dataset.valorNumerico !== '' ? input.dataset.valorNumerico : '';
    }
    
    if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[hojaCliente]) {
        return;
    }
    
    const hoja = datosEditados.hojas[hojaCliente];
    const cliente = hoja.clientes[clienteIndex];
    
    if (!cliente) return;
    
    // Inicializar datos si no existen
    if (!cliente.datos) {
        cliente.datos = {};
    }
    
    // Actualizar el valor
    // Si el campo es GARANTIA_INICIAL, también mantener GARANTIA para compatibilidad
    if (campo === 'GARANTIA_INICIAL') {
        if (!cliente.datos['GARANTIA_INICIAL']) {
            cliente.datos['GARANTIA_INICIAL'] = { valor: nuevoValor };
        } else {
            cliente.datos['GARANTIA_INICIAL'].valor = nuevoValor;
        }
        // También actualizar GARANTIA para compatibilidad hacia atrás
        if (!cliente.datos['GARANTIA']) {
            cliente.datos['GARANTIA'] = { valor: nuevoValor };
        } else {
            cliente.datos['GARANTIA'].valor = nuevoValor;
        }
        
        // Actualizar garantía actual después de cambiar garantía inicial
        actualizarGarantiaActual(clienteIndex, hojaCliente);
    } else {
        if (!cliente.datos[campo]) {
            cliente.datos[campo] = { valor: nuevoValor };
        } else {
            cliente.datos[campo].valor = nuevoValor;
        }
    }
    
    input.classList.add('cell-modified');
    
    // Guardar automáticamente
    await guardarDatosAutomatico(0, 0);
    mostrarNotificacion(`Información de ${campo.replace('_', ' ')} actualizada`, 'success');
    
    // Actualizar el texto en la lista si es nombre o apellidos (sin recargar para no cerrar fichas)
    if (campo === 'NOMBRE' || campo === 'APELLIDOS') {
        const clienteItem = document.querySelector(`.cliente-item-simple[data-cliente-index="${clienteIndex}"]`);
        if (clienteItem) {
            const textoSpan = clienteItem.querySelector('.cliente-texto');
            if (textoSpan) {
                const datosCliente = cliente.datos || {};
                const nombre = datosCliente['NOMBRE']?.valor || '';
                const apellidos = datosCliente['APELLIDOS']?.valor || '';
                const nombreCompleto = nombre || apellidos ? `${nombre} ${apellidos}`.trim() : '';
                textoSpan.textContent = nombreCompleto 
                    ? `Cliente ${clienteIndex + 1} - ${nombreCompleto}`
                    : `Cliente ${clienteIndex + 1}`;
            }
        }
    }
}

// Filtrar clientes en la vista Info
function filtrarInfoClientes() {
    const termino = document.getElementById('buscarInfoCliente').value.toLowerCase();
    const items = document.querySelectorAll('.cliente-item-simple');
    
    items.forEach(item => {
        const textoCompleto = item.querySelector('.cliente-texto')?.textContent.toLowerCase() || '';
        const badge = item.querySelector('.badge-vip, .badge-std');
        const tipoHoja = badge?.classList.contains('badge-vip') ? 'vip' : 'std';
        
        const numeroCliente = String((parseInt(item.dataset.clienteIndex) + 1) || '');
        const terminoNumero = termino.replace(/\s+/g, '');

        // Si el término es numérico, buscar por SUBSTRING: "3" => 3,13,23,33...
        const esNumero = terminoNumero !== '' && /^\d+$/.test(terminoNumero);
        const coincideNumero = esNumero && numeroCliente.includes(terminoNumero);

        // Búsqueda textual (si no es número) o adicional por texto completo
        const coincideTexto = !esNumero && (
            textoCompleto.includes(termino) ||
            (termino === 'vip' && tipoHoja === 'vip') ||
            (termino === 'std' && tipoHoja === 'std')
        );
        
        if (coincideNumero || coincideTexto || termino === '') {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// ==================== VISTA COMISIÓN ====================

// Variable para almacenar la hoja seleccionada en Comisión
let hojaComision = 'Diario STD';

// Cambiar hoja en Comisión
function cambiarHojaComision(nuevaHoja) {
    hojaComision = nuevaHoja;
    
    // Actualizar tabs activos
    const tabSTD = document.getElementById('tabSTDComision');
    const tabVIP = document.getElementById('tabVIPComision');
    const tabWIND = document.getElementById('tabWINDComision');
    
    if (tabSTD) tabSTD.classList.toggle('active', nuevaHoja === 'Diario STD');
    if (tabVIP) tabVIP.classList.toggle('active', nuevaHoja === 'Diario VIP');
    if (tabWIND) tabWIND.classList.toggle('active', nuevaHoja === 'Diario WIND');
    
    // Recargar la vista de comisión
    mostrarComision();
}

// Mostrar vista Comisión
function mostrarVistaComision() {
    vistaActual = 'comision';
    
    document.getElementById('vistaGeneral').classList.remove('active');
    document.getElementById('vistaClientes').classList.remove('active');
    document.getElementById('vistaDetalle').classList.remove('active');
    document.getElementById('vistaInfoClientes').classList.remove('active');
    const vistaEstadisticas = document.getElementById('vistaEstadisticas');
    if (vistaEstadisticas) vistaEstadisticas.classList.remove('active');
    const vistaComision = document.getElementById('vistaComision');
    if (vistaComision) vistaComision.classList.add('active');
    
    // Actualizar botones
    document.getElementById('btnVistaGeneral').classList.remove('active');
    document.getElementById('btnVistaClientes').classList.remove('active');
    document.getElementById('btnVistaInfoClientes').classList.remove('active');
    const btnEstadisticas = document.getElementById('btnVistaEstadisticas');
    if (btnEstadisticas) btnEstadisticas.classList.remove('active');
    const btnComision = document.getElementById('btnVistaComision');
    if (btnComision) btnComision.classList.add('active');
    
    hojaComision = hojaActual;
    
    // Actualizar tabs según la hoja seleccionada
    cambiarHojaComision(hojaComision);
    
    mostrarComision();
}

// Mostrar comisiones de todos los clientes
function mostrarComision() {
    const container = document.getElementById('comisionContainer');
    if (!container) return;
    
    const hojaParaMostrar = hojaComision || 'Diario STD';
    
    // MODO ANUAL: Usar clientes anuales si están disponibles
    let clientes = [];
    
    if (clientesAnuales && clientesAnuales.length > 0) {
        // Combinar clientes anuales con datos del mes actual
        const hoja = datosEditados?.hojas?.[hojaParaMostrar];
        clientes = clientesAnuales.map((clienteAnual, idx) => {
            const clienteMes = hoja?.clientes?.[idx];
            return {
                ...clienteAnual,
                // Datos del cliente (nombre, garantía, etc.) - priorizar datos del mes actual
                datos: clienteMes?.datos || clienteAnual?.datos || {},
                incrementos_total: clienteMes?.incrementos_total || 0,
                decrementos_total: clienteMes?.decrementos_total || 0,
                saldo_actual: clienteMes?.saldo_actual || 0,
                datos_diarios: clienteMes?.datos_diarios || [],
                _acumPrevInc: clienteMes?._acumPrevInc || 0,
                _acumPrevDec: clienteMes?._acumPrevDec || 0,
                saldo_inicial_mes: clienteMes?.saldo_inicial_mes || 0
            };
        });
    } else {
        // MODO MENSUAL (fallback)
        if (!datosEditados || !datosEditados.hojas || !datosEditados.hojas[hojaParaMostrar]) {
            container.innerHTML = '<div class="error-box"><p>No hay datos disponibles</p></div>';
            return;
        }
        const hoja = datosEditados.hojas[hojaParaMostrar];
        clientes = hoja.clientes || [];
    }
    
    if (clientes.length === 0) {
        container.innerHTML = '<div class="info-box"><p>No hay clientes en esta hoja</p></div>';
        return;
    }
    
    container.innerHTML = '';

    const q = (document.getElementById('buscarComision')?.value || '').trim().toLowerCase();
    
    // Crear lista de clientes con información de comisiones
    const listaComisiones = document.createElement('div');
    listaComisiones.className = 'comisiones-lista';
    let totalComisionAcumulada = 0;
    let totalComisionSiRetiran = 0;
    
    clientes.forEach((cliente, index) => {
        // Calcular totales si no están calculados
        if (!cliente.incrementos_total && cliente.datos_diarios) {
            recalcularTotalesCliente(cliente);
        }
        
        const incrementosTotal = cliente.incrementos_total || 0;
        const decrementosTotal = cliente.decrementos_total || 0;

        const saldoActual = obtenerSaldoActualClienteSinLogs(cliente);
        const comisionSiRetiraHoy = calcularComisionSiRetiraTodoHoy(cliente);
        const detalleCobrado = calcularDetalleComisionesCobradas(cliente);
        const comisionCobrada = detalleCobrado.totalCobrada;
        const eventosComision = detalleCobrado.eventos || [];
        const ultimaComisionRetirada = eventosComision.length > 0 ? (eventosComision[eventosComision.length - 1].comision || 0) : 0;

        totalComisionAcumulada += comisionCobrada;
        totalComisionSiRetiran += comisionSiRetiraHoy;
        
        // Obtener nombre del cliente
        const datosCliente = cliente.datos || {};
        const nombre = datosCliente['NOMBRE']?.valor || '';
        const apellidos = datosCliente['APELLIDOS']?.valor || '';
        const nombreCompleto = nombre || apellidos ? `${nombre} ${apellidos}`.trim() : '';
        const textoCliente = nombreCompleto 
            ? `Cliente ${index + 1} - ${nombreCompleto}`
            : `Cliente ${index + 1}`;

        if (q) {
            const numStr = String(index + 1);
            const full = `${nombre} ${apellidos}`.trim().toLowerCase();
            const match = numStr.includes(q) || nombre.toLowerCase().includes(q) || apellidos.toLowerCase().includes(q) || full.includes(q);
            if (!match) return;
        }
        
        const esVIP = hojaParaMostrar === 'Diario VIP';
        const badgeHoja = esVIP ? '<span class="badge-vip">VIP</span>' : '<span class="badge-std">STD</span>';
        
        const itemComision = document.createElement('div');
        itemComision.className = 'comision-item';
        
        itemComision.innerHTML = `
            <div class="comision-header">
                <div class="comision-cliente-info">
                    <span class="comision-cliente-numero">${textoCliente}</span>
                    ${badgeHoja}
                </div>
                <button class="kpi-expand-btn" type="button" data-comision-expand="${index}">Detalles</button>
            </div>
            <div class="comision-body">
                <div class="comision-row">
                    <div class="comision-field">
                        <label>Incrementos Total:</label>
                        <div class="comision-value">${formatearMoneda(incrementosTotal)}</div>
                    </div>
                    <div class="comision-field">
                        <label>Decrementos Total:</label>
                        <div class="comision-value">${formatearMoneda(decrementosTotal)}</div>
                    </div>
                    <div class="comision-field">
                        <label>Saldo actual:</label>
                        <div class="comision-value ${saldoActual >= 0 ? 'positive' : 'negative'}">${formatearMoneda(saldoActual)}</div>
                    </div>
                </div>
                <div class="comision-row">
                    <div class="comision-field">
                        <label>Comisión ya cobrada:</label>
                        <div class="comision-value ${comisionCobrada > 0 ? 'positive' : ''}">${formatearMoneda(comisionCobrada)}</div>
                    </div>
                    <div class="comision-field">
                        <label>Comisión si retira hoy:</label>
                        <div class="comision-value ${comisionSiRetiraHoy > 0 ? 'positive' : ''}">${formatearMoneda(comisionSiRetiraHoy)}</div>
                    </div>
                    <div class="comision-field">
                        <label>Comisión pendiente:</label>
                        <div class="comision-value ${ultimaComisionRetirada > 0 ? 'positive' : ''}">${formatearMoneda(ultimaComisionRetirada)}</div>
                    </div>
                </div>
                <div class="kpi-breakdown" id="comisionBreakdown_${index}"></div>
            </div>
        `;

        const btnExpand = itemComision.querySelector(`[data-comision-expand="${index}"]`);
        const breakdown = itemComision.querySelector(`#comisionBreakdown_${index}`);
        if (btnExpand && breakdown) {
            btnExpand.addEventListener('click', (e) => {
                e.stopPropagation();
                const opening = !breakdown.classList.contains('open');
                breakdown.classList.toggle('open');
                btnExpand.textContent = opening ? 'Ocultar' : 'Detalles';

                if (opening) {
                    const eventos = eventosComision;
                    if (eventos.length === 0) {
                        breakdown.innerHTML = '<div class="kpi-breakdown-sub">No hay comisiones calculadas todavía.</div>';
                    } else {
                        breakdown.innerHTML = eventos.map(ev => {
                            const fecha = ev.fecha ? formatearFecha(ev.fecha) : '-';
                            const key = obtenerKeyComisionManual(ev);
                            const estado = obtenerEstadoManualComision(cliente, key);
                            const clsOk = estado === true ? ' active' : '';
                            const clsNo = estado === false ? ' active' : '';
                            return `
                                <div class="kpi-breakdown-item">
                                    <div class="kpi-breakdown-title">${fecha}</div>
                                    <div><strong>${formatearMoneda(ev.comision)}</strong></div>
                                    <div class="kpi-breakdown-sub">
                                        Decremento: ${formatearMoneda(ev.decremento)} | Exceso cobrado: ${formatearMoneda(ev.exceso)}
                                    </div>
                                    <div class="comision-manual-controls">
                                        <button type="button" class="comision-manual-btn ok${clsOk}" data-hoja="${hojaParaMostrar}" data-cliente="${index}" data-key="${key}" data-estado="true">✓</button>
                                        <button type="button" class="comision-manual-btn no${clsNo}" data-hoja="${hojaParaMostrar}" data-cliente="${index}" data-key="${key}" data-estado="false">✗</button>
                                    </div>
                                </div>
                            `;
                        }).join('');

                        breakdown.querySelectorAll('.comision-manual-btn').forEach(b => {
                            b.addEventListener('click', (evClick) => {
                                evClick.stopPropagation();
                                const hojaN = b.dataset.hoja;
                                const cIdx = parseInt(b.dataset.cliente);
                                const key = b.dataset.key;
                                const estado = b.dataset.estado === 'true';
                                void toggleEstadoManualComision(hojaN, cIdx, key, estado);
                            });
                        });
                    }
                }
            });
        }
        
        listaComisiones.appendChild(itemComision);
    });

    const itemMaster = document.createElement('div');
    itemMaster.className = 'comision-item comision-item-master';
    itemMaster.innerHTML = `
        <div class="comision-header">
            <div class="comision-cliente-info">
                <span class="comision-cliente-numero">MASTER - Total Comisiones</span>
                <span class="badge-std">GLOBAL</span>
            </div>
            <span class="comision-badge-green">💰 ${formatearMoneda(totalComisionAcumulada)}</span>
        </div>
        <div class="comision-body">
            <div class="comision-row">
                <div class="comision-field">
                    <label>Comisión Acumulada Total (5%):</label>
                    <div class="comision-value positive">${formatearMoneda(totalComisionAcumulada)}</div>
                </div>
                <div class="comision-field">
                    <label>Comisión si todos retiran hoy:</label>
                    <div class="comision-value positive">${formatearMoneda(totalComisionSiRetiran)}</div>
                </div>
            </div>
        </div>
    `;
    listaComisiones.prepend(itemMaster);
    
    container.appendChild(listaComisiones);
}

// ==================== VISTA ESTADÍSTICAS PREMIUM ====================

let hojaEstadisticas = 'Diario STD';
let chartRentabilidad = null;
let chartComparativa = null;
let datosEstadisticasCache = {};
let vistaAcumulado = false;

function cambiarHojaEstadisticas(nuevaHoja) {
    hojaEstadisticas = nuevaHoja;
    
    const tabSTD = document.getElementById('tabSTDStats');
    const tabVIP = document.getElementById('tabVIPStats');
    const tabWIND = document.getElementById('tabWINDStats');
    
    if (tabSTD) tabSTD.classList.toggle('active', nuevaHoja === 'Diario STD');
    if (tabVIP) tabVIP.classList.toggle('active', nuevaHoja === 'Diario VIP');
    if (tabWIND) tabWIND.classList.toggle('active', nuevaHoja === 'Diario WIND');
    
    mostrarEstadisticas();
}

function mostrarVistaEstadisticas() {
    vistaActual = 'estadisticas';
    
    document.getElementById('vistaGeneral').classList.remove('active');
    document.getElementById('vistaClientes').classList.remove('active');
    document.getElementById('vistaDetalle').classList.remove('active');
    document.getElementById('vistaInfoClientes').classList.remove('active');
    const vistaComision = document.getElementById('vistaComision');
    if (vistaComision) vistaComision.classList.remove('active');
    const vistaEstadisticas = document.getElementById('vistaEstadisticas');
    if (vistaEstadisticas) vistaEstadisticas.classList.add('active');
    
    document.getElementById('btnVistaGeneral').classList.remove('active');
    document.getElementById('btnVistaClientes').classList.remove('active');
    document.getElementById('btnVistaInfoClientes').classList.remove('active');
    const btnComision = document.getElementById('btnVistaComision');
    if (btnComision) btnComision.classList.remove('active');
    const btnEstadisticas = document.getElementById('btnVistaEstadisticas');
    if (btnEstadisticas) btnEstadisticas.classList.add('active');
    
    hojaEstadisticas = hojaActual;
    inicializarEventosEstadisticas();
    cambiarHojaEstadisticas(hojaEstadisticas);
}

function inicializarEventosEstadisticas() {
    const periodoSelect = document.getElementById('periodoStats');
    if (periodoSelect && !periodoSelect.dataset.initialized) {
        periodoSelect.addEventListener('change', () => mostrarEstadisticas());
        periodoSelect.dataset.initialized = 'true';
    }
    
    const btnMensual = document.getElementById('btnVistaMensual');
    const btnAcumulado = document.getElementById('btnVistaAcumulado');
    if (btnMensual && !btnMensual.dataset.initialized) {
        btnMensual.addEventListener('click', () => {
            vistaAcumulado = false;
            btnMensual.classList.add('active');
            btnAcumulado.classList.remove('active');
            mostrarEstadisticas();
        });
        btnMensual.dataset.initialized = 'true';
    }
    if (btnAcumulado && !btnAcumulado.dataset.initialized) {
        btnAcumulado.addEventListener('click', () => {
            vistaAcumulado = true;
            btnAcumulado.classList.add('active');
            btnMensual.classList.remove('active');
            mostrarEstadisticas();
        });
        btnAcumulado.dataset.initialized = 'true';
    }
    
    const benchmarkInput = document.getElementById('benchmarkInput');
    if (benchmarkInput && !benchmarkInput.dataset.initialized) {
        benchmarkInput.addEventListener('change', () => mostrarEstadisticas());
        benchmarkInput.dataset.initialized = 'true';
    }
    
    const btnExportar = document.getElementById('btnExportarGrafico');
    if (btnExportar && !btnExportar.dataset.initialized) {
        btnExportar.addEventListener('click', exportarGrafico);
        btnExportar.dataset.initialized = 'true';
    }
}

async function mostrarVistaEstadisticasAuto() {
    mostrarVistaEstadisticas();
}

async function mostrarEstadisticas() {
    const container = document.getElementById('statsSummary');
    if (!container) return;
    
    const hojaParaMostrar = hojaEstadisticas || 'Diario STD';
    let meses = mesesDisponibles[hojaParaMostrar] || [];
    
    const periodo = document.getElementById('periodoStats')?.value || 'all';
    if (periodo !== 'all') {
        const numMeses = parseInt(periodo);
        meses = meses.slice(-numMeses);
    }
    
    if (meses.length === 0) {
        container.innerHTML = '<div class="info-box"><p>No hay meses disponibles para esta hoja</p></div>';
        return;
    }
    
    const rentabilidadMeses = await calcularRentabilidadPorMes(hojaParaMostrar, meses);
    datosEstadisticasCache[hojaParaMostrar] = rentabilidadMeses;
    
    const benchmark = parseFloat(document.getElementById('benchmarkInput')?.value) || 2;
    
    renderizarGraficoPremium(rentabilidadMeses, benchmark);
    renderizarResumenEstadisticas(container, rentabilidadMeses);
    renderizarIndicadoresAvanzados(rentabilidadMeses);
    renderizarTablaDetallada(rentabilidadMeses, benchmark);
    renderizarComparativaHojas();
    renderizarTopClientes();
    renderizarProyeccion(rentabilidadMeses);
}

async function calcularRentabilidadPorMes(hoja, meses) {
    const resultados = [];
    let benefAcumAnual = 0;
    
    for (const mes of meses) {
        try {
            const response = await fetch(`/api/datos/${encodeURIComponent(hoja)}/${mes}`, { cache: 'no-store' });
            if (!response.ok) {
                resultados.push({ mes, rentabilidad: 0, benefAcumAnual });
                continue;
            }
            const data = await response.json();
            
            const datosGenerales = data.datos_diarios_generales || [];
            const datosConBenef = datosGenerales
                .filter(d => d && d.fila >= 15 && d.fila <= 1120)
                .filter(d => typeof d.benef_porcentaje === 'number' && isFinite(d.benef_porcentaje));
            
            const rentabilidadMes = datosConBenef.reduce((sum, d) => sum + (d.benef_porcentaje * 100), 0);
            benefAcumAnual += rentabilidadMes;
            
            resultados.push({
                mes,
                rentabilidad: rentabilidadMes,
                benefAcumAnual: benefAcumAnual,
                diasOperados: datosConBenef.length
            });
        } catch (error) {
            console.warn(`Error cargando datos de ${mes}:`, error);
            resultados.push({ mes, rentabilidad: 0, benefAcumAnual, diasOperados: 0 });
        }
    }
    
    return resultados;
}

function renderizarGraficoPremium(datos, benchmark) {
    const canvas = document.getElementById('chartRentabilidad');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const tipoGrafico = document.getElementById('tipoGrafico')?.value || 'bar';
    
    if (chartRentabilidad) {
        chartRentabilidad.destroy();
    }
    
    const labels = datos.map(d => {
        const [year, month] = d.mes.split('-');
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return meses[parseInt(month) - 1] + ' ' + year.slice(2);
    });
    
    const valores = vistaAcumulado ? datos.map(d => d.benefAcumAnual) : datos.map(d => d.rentabilidad);
    const benchmarkLine = vistaAcumulado ? datos.map((d, i) => benchmark * (i + 1)) : datos.map(() => benchmark);
    
    const datasets = [{
        label: vistaAcumulado ? 'Acumulado %' : 'Rentabilidad %',
        data: valores,
        backgroundColor: tipoGrafico === 'bar' ? valores.map(v => {
            if (v >= benchmark) return 'rgba(0, 255, 136, 0.8)';
            if (v >= 0) return 'rgba(0, 212, 255, 0.8)';
            return 'rgba(255, 107, 107, 0.8)';
        }) : 'rgba(0, 212, 255, 0.1)',
        borderColor: tipoGrafico === 'line' ? 'rgb(0, 212, 255)' : valores.map(v => v >= 0 ? 'rgb(0, 255, 136)' : 'rgb(255, 107, 107)'),
        borderWidth: 2,
        fill: tipoGrafico === 'line',
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 10,
        pointBackgroundColor: 'rgb(0, 212, 255)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderRadius: 8,
        order: 1
    }];
    
    if (tipoGrafico !== 'radar') {
        datasets.push({
            label: 'Benchmark ' + benchmark + '%',
            data: benchmarkLine,
            type: 'line',
            borderColor: 'rgba(255, 215, 0, 0.8)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            order: 0
        });
        
        if (!vistaAcumulado && datos.length > 2) {
            const tendencia = calcularLineaTendencia(valores);
            datasets.push({
                label: 'Tendencia',
                data: tendencia,
                type: 'line',
                borderColor: 'rgba(102, 126, 234, 0.6)',
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
                order: 0
            });
        }
    }
    
    const config = {
        type: tipoGrafico,
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: 'rgba(255,255,255,0.7)', font: { size: 11 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 46, 0.95)',
                    titleFont: { size: 14, weight: 'bold' },
                    titleColor: '#fff',
                    bodyFont: { size: 13 },
                    bodyColor: 'rgba(255,255,255,0.8)',
                    padding: 16,
                    cornerRadius: 12,
                    displayColors: false,
                    callbacks: {
                        title: (items) => items[0]?.label || '',
                        label: function(context) {
                            if (context.datasetIndex > 0) return null;
                            const idx = context.dataIndex;
                            const d = datos[idx];
                            const vsBenchmark = d.rentabilidad - benchmark;
                            return [
                                `Rentabilidad: ${d.rentabilidad.toFixed(4)}%`,
                                `Acumulado: ${d.benefAcumAnual.toFixed(4)}%`,
                                `vs Benchmark: ${vsBenchmark >= 0 ? '+' : ''}${vsBenchmark.toFixed(4)}%`,
                                `Días operados: ${d.diasOperados}`
                            ];
                        }
                    }
                }
            },
            scales: tipoGrafico !== 'radar' ? {
                y: {
                    beginAtZero: !vistaAcumulado,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        callback: (v) => v.toFixed(2) + '%',
                        color: 'rgba(255,255,255,0.6)',
                        font: { size: 11 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(255,255,255,0.8)',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            } : {}
        },
        plugins: [{
            id: 'customLabels',
            afterDatasetsDraw: function(chart) {
                if (tipoGrafico !== 'bar') return;
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach((bar, index) => {
                    const value = chart.data.datasets[0].data[index];
                    ctx.save();
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = value >= 0 ? 'bottom' : 'top';
                    const y = value >= 0 ? bar.y - 8 : bar.y + 8;
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 4;
                    ctx.fillText(value.toFixed(2) + '%', bar.x, y);
                    ctx.restore();
                });
            }
        }]
    };
    
    chartRentabilidad = new Chart(ctx, config);
}

function calcularLineaTendencia(valores) {
    const n = valores.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i; sumY += valores[i];
        sumXY += i * valores[i]; sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return valores.map((_, i) => slope * i + intercept);
}

function actualizarTipoGrafico() {
    mostrarEstadisticas();
}

function renderizarResumenEstadisticas(container, datos) {
    if (datos.length === 0) {
        container.innerHTML = '<div class="info-box"><p>No hay datos disponibles</p></div>';
        return;
    }
    
    const ultimoDato = datos[datos.length - 1];
    const acumuladoAnual = ultimoDato?.benefAcumAnual || 0;
    const mejorMes = datos.reduce((best, d) => d.rentabilidad > best.rentabilidad ? d : best, datos[0]);
    const peorMes = datos.reduce((worst, d) => d.rentabilidad < worst.rentabilidad ? d : worst, datos[0]);
    const promedio = acumuladoAnual / datos.length;
    const mesesPositivos = datos.filter(d => d.rentabilidad > 0).length;
    
    const formatMes = (mes) => {
        const [year, month] = mes.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return meses[parseInt(month) - 1] + ' ' + year;
    };
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Rentabilidad Acumulada</div>
            <div class="stat-value ${acumuladoAnual >= 0 ? 'positive' : 'negative'}">${acumuladoAnual.toFixed(4)}%</div>
            <div class="stat-detail">${datos.length} meses analizados</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Promedio Mensual</div>
            <div class="stat-value ${promedio >= 0 ? 'positive' : 'negative'}">${promedio.toFixed(4)}%</div>
            <div class="stat-detail">${mesesPositivos}/${datos.length} meses positivos</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Mejor Mes</div>
            <div class="stat-value positive">+${mejorMes.rentabilidad.toFixed(4)}%</div>
            <div class="stat-detail">${formatMes(mejorMes.mes)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Peor Mes</div>
            <div class="stat-value ${peorMes.rentabilidad >= 0 ? 'positive' : 'negative'}">${peorMes.rentabilidad.toFixed(4)}%</div>
            <div class="stat-detail">${formatMes(peorMes.mes)}</div>
        </div>
    `;
}

function renderizarIndicadoresAvanzados(datos) {
    const container = document.getElementById('statsIndicators');
    if (!container || datos.length < 2) {
        if (container) container.innerHTML = '';
        return;
    }
    
    const rentabilidades = datos.map(d => d.rentabilidad);
    const media = rentabilidades.reduce((a, b) => a + b, 0) / rentabilidades.length;
    const varianza = rentabilidades.reduce((sum, r) => sum + Math.pow(r - media, 2), 0) / rentabilidades.length;
    const volatilidad = Math.sqrt(varianza);
    
    let maxDrawdown = 0, peak = datos[0].benefAcumAnual;
    for (const d of datos) {
        if (d.benefAcumAnual > peak) peak = d.benefAcumAnual;
        const drawdown = peak - d.benefAcumAnual;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    const sharpe = volatilidad > 0 ? (media / volatilidad) : 0;
    const winRate = (datos.filter(d => d.rentabilidad > 0).length / datos.length) * 100;
    const consistencia = 100 - (volatilidad / Math.abs(media || 1)) * 10;
    
    container.innerHTML = `
        <div class="indicator-item">
            <div class="indicator-label">Volatilidad</div>
            <div class="indicator-value ${volatilidad > 3 ? 'danger' : volatilidad > 1.5 ? 'warning' : ''}">${volatilidad.toFixed(2)}%</div>
        </div>
        <div class="indicator-item">
            <div class="indicator-label">Max Drawdown</div>
            <div class="indicator-value ${maxDrawdown > 5 ? 'danger' : maxDrawdown > 2 ? 'warning' : ''}">${maxDrawdown.toFixed(2)}%</div>
        </div>
        <div class="indicator-item">
            <div class="indicator-label">Ratio Sharpe</div>
            <div class="indicator-value">${sharpe.toFixed(2)}</div>
        </div>
        <div class="indicator-item">
            <div class="indicator-label">Win Rate</div>
            <div class="indicator-value">${winRate.toFixed(0)}%</div>
        </div>
        <div class="indicator-item">
            <div class="indicator-label">Consistencia</div>
            <div class="indicator-value ${consistencia < 50 ? 'warning' : ''}">${Math.max(0, Math.min(100, consistencia)).toFixed(0)}%</div>
        </div>
    `;
}

function renderizarTablaDetallada(datos, benchmark) {
    const tbody = document.getElementById('statsTableBody');
    if (!tbody) return;
    
    const formatMes = (mes) => {
        const [year, month] = mes.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return meses[parseInt(month) - 1] + ' ' + year;
    };
    
    tbody.innerHTML = datos.map((d, i) => {
        const vsBench = d.rentabilidad - benchmark;
        const prevRent = i > 0 ? datos[i - 1].rentabilidad : d.rentabilidad;
        const trend = d.rentabilidad > prevRent ? 'trend-up' : d.rentabilidad < prevRent ? 'trend-down' : 'trend-flat';
        
        return `
            <tr>
                <td>${formatMes(d.mes)}</td>
                <td class="${d.rentabilidad >= 0 ? 'positive' : 'negative'}">${d.rentabilidad.toFixed(4)}%</td>
                <td class="${d.benefAcumAnual >= 0 ? 'positive' : 'negative'}">${d.benefAcumAnual.toFixed(4)}%</td>
                <td class="${vsBench >= 0 ? 'positive' : 'negative'}">${vsBench >= 0 ? '+' : ''}${vsBench.toFixed(4)}%</td>
                <td class="${trend}"></td>
            </tr>
        `;
    }).join('');
}

async function renderizarComparativaHojas() {
    const canvas = document.getElementById('chartComparativa');
    if (!canvas) return;
    
    if (chartComparativa) {
        chartComparativa.destroy();
    }
    
    const hojas = ['Diario STD', 'Diario VIP', 'Diario WIND'];
    const colores = ['#00d4ff', '#ffd700', '#ff6b6b'];
    const datasets = [];
    
    for (let i = 0; i < hojas.length; i++) {
        const hoja = hojas[i];
        const meses = mesesDisponibles[hoja] || [];
        if (meses.length === 0) continue;
        
        let datos = datosEstadisticasCache[hoja];
        if (!datos) {
            datos = await calcularRentabilidadPorMes(hoja, meses);
            datosEstadisticasCache[hoja] = datos;
        }
        
        datasets.push({
            label: hoja.replace('Diario ', ''),
            data: datos.map(d => d.benefAcumAnual),
            borderColor: colores[i],
            backgroundColor: colores[i] + '20',
            fill: false,
            tension: 0.4,
            pointRadius: 4
        });
    }
    
    if (datasets.length === 0) return;
    
    const maxLen = Math.max(...datasets.map(d => d.data.length));
    const labels = Array.from({ length: maxLen }, (_, i) => `Mes ${i + 1}`);
    
    chartComparativa = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: 'rgba(255,255,255,0.7)' }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.6)', callback: v => v.toFixed(1) + '%' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                }
            }
        }
    });
}

function renderizarTopClientes() {
    const container = document.getElementById('topClientsList');
    if (!container) return;
    
    const hoja = datosEditados?.hojas?.[hojaEstadisticas];
    if (!hoja || !hoja.clientes) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.5)">No hay datos de clientes disponibles</p>';
        return;
    }
    
    const clientesConRent = hoja.clientes
        .map((c, i) => ({
            nombre: c.nombre || `Cliente ${i + 1}`,
            rentabilidad: c.rentabilidad || 0,
            saldo: c.saldo_actual || 0
        }))
        .filter(c => c.saldo > 0)
        .sort((a, b) => b.rentabilidad - a.rentabilidad)
        .slice(0, 10);
    
    if (clientesConRent.length === 0) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.5)">No hay datos suficientes</p>';
        return;
    }
    
    container.innerHTML = clientesConRent.map((c, i) => {
        const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';
        return `
            <div class="top-client-item">
                <div class="top-client-rank ${rankClass}">${i + 1}</div>
                <div class="top-client-info">
                    <div class="top-client-name">${c.nombre}</div>
                    <div class="top-client-detail">Saldo: ${formatearMoneda(c.saldo)}</div>
                </div>
                <div class="top-client-value">+${c.rentabilidad.toFixed(2)}%</div>
            </div>
        `;
    }).join('');
}

function renderizarProyeccion(datos) {
    const container = document.getElementById('statsProjection');
    if (!container || datos.length === 0) return;
    
    const ultimoDato = datos[datos.length - 1];
    const promMensual = ultimoDato.benefAcumAnual / datos.length;
    const mesesRestantes = 12 - datos.length;
    const proyeccionAnual = ultimoDato.benefAcumAnual + (promMensual * mesesRestantes);
    
    container.innerHTML = `
        <h3>🎯 Proyección Anual</h3>
        <div class="projection-value">${proyeccionAnual.toFixed(2)}%</div>
        <div class="projection-detail">
            Si mantiene el promedio de ${promMensual.toFixed(2)}%/mes durante ${mesesRestantes} meses restantes
        </div>
    `;
}

function exportarGrafico() {
    const canvas = document.getElementById('chartRentabilidad');
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `estadisticas_${hojaEstadisticas.replace(' ', '_')}_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    mostrarNotificacion('Gráfico exportado correctamente', 'success');
}

// ==================== ESTADÍSTICAS DEL CLIENTE ====================

let chartClienteRentabilidad = null;
let chartClienteEvolucion = null;

async function mostrarEstadisticasCliente() {
    if (clienteActual === null || clienteActual === undefined) {
        mostrarNotificacion('Selecciona un cliente primero', 'warning');
        return;
    }
    
    const hoja = datosEditados?.hojas?.[hojaActual];
    if (!hoja || !hoja.clientes || !hoja.clientes[clienteActual]) {
        mostrarNotificacion('No hay datos del cliente', 'warning');
        return;
    }
    
    const cliente = hoja.clientes[clienteActual];
    const datosCliente = cliente.datos || {};
    const nombre = datosCliente['NOMBRE']?.valor || '';
    const apellidos = datosCliente['APELLIDOS']?.valor || '';
    const nombreCompleto = nombre || apellidos ? `${nombre} ${apellidos}`.trim() : `Cliente ${clienteActual + 1}`;
    
    // Crear modal con loading
    const modalExistente = document.querySelector('.modal-stats-client');
    if (modalExistente) modalExistente.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal-stats-client';
    modal.innerHTML = `
        <div class="modal-stats-client-content">
            <div class="modal-stats-client-header">
                <h2>📊 Estadísticas de ${nombreCompleto}</h2>
                <button class="modal-stats-client-close" onclick="this.closest('.modal-stats-client').remove()">×</button>
            </div>
            <div id="clientStatsContent" style="text-align: center; padding: 3rem;">
                <div class="spinner-ring"></div>
                <p style="color: rgba(255,255,255,0.6); margin-top: 1rem;">Cargando estadísticas de todos los meses...</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar al hacer click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Cargar datos de todos los meses del cliente
    try {
        const meses = mesesDisponibles[hojaActual] || [];
        const datosClienteMeses = await calcularRentabilidadClientePorMes(hojaActual, clienteActual, meses);
        
        // Calcular KPIs totales (desde primer incremento hasta última fecha)
        const kpisTotales = calcularKPIsTotalesCliente(datosClienteMeses);
        
        // Renderizar contenido
        renderizarContenidoEstadisticasCliente(nombreCompleto, kpisTotales, datosClienteMeses);
    } catch (error) {
        console.error('Error cargando estadísticas del cliente:', error);
        document.getElementById('clientStatsContent').innerHTML = `
            <p style="color: #ff6b6b;">Error al cargar las estadísticas: ${error.message}</p>
        `;
    }
}

async function calcularRentabilidadClientePorMes(hoja, clienteIndex, meses) {
    const resultados = [];
    let benefAcumTotal = 0;
    let saldoInicialPrimero = null;
    let saldoFinalUltimo = 0;
    let incrementosTotales = 0;
    let decrementosTotales = 0;
    
    for (const mes of meses) {
        try {
            const response = await fetch(`/api/datos/${encodeURIComponent(hoja)}/${mes}`, { cache: 'no-store' });
            if (!response.ok) continue;
            
            const data = await response.json();
            const clientes = data.clientes || [];
            const clienteData = clientes[clienteIndex];
            
            if (!clienteData) continue;
            
            const datosDiarios = clienteData.datos_diarios || [];
            
            // Filtrar filas válidas con benef_porcentaje
            const datosConBenef = datosDiarios
                .filter(d => d && d.fila >= 15 && d.fila <= 1120)
                .filter(d => typeof d.benef_porcentaje === 'number' && isFinite(d.benef_porcentaje));
            
            if (datosConBenef.length === 0) continue;
            
            // Sumar rentabilidad del mes
            const rentabilidadMes = datosConBenef.reduce((sum, d) => sum + (d.benef_porcentaje * 100), 0);
            benefAcumTotal += rentabilidadMes;
            
            // Obtener saldo inicial del mes (primera fila con imp_inicial)
            const primeraFila = datosConBenef.sort((a, b) => a.fila - b.fila)[0];
            const ultimaFila = datosConBenef.sort((a, b) => b.fila - a.fila)[0];
            
            const saldoInicialMes = clienteData.saldo_inicial_mes || primeraFila?.imp_inicial || 0;
            const saldoFinalMes = ultimaFila?.imp_final || clienteData.saldo_actual || 0;
            
            // Guardar saldo inicial del primer mes con datos
            if (saldoInicialPrimero === null && saldoInicialMes > 0) {
                saldoInicialPrimero = saldoInicialMes;
            }
            
            saldoFinalUltimo = saldoFinalMes;
            incrementosTotales += clienteData.incrementos_total || 0;
            decrementosTotales += clienteData.decrementos_total || 0;
            
            resultados.push({
                mes,
                rentabilidad: rentabilidadMes,
                benefAcumTotal: benefAcumTotal,
                saldoInicial: saldoInicialMes,
                saldoFinal: saldoFinalMes,
                incrementos: clienteData.incrementos_total || 0,
                decrementos: clienteData.decrementos_total || 0,
                diasOperados: datosConBenef.length
            });
        } catch (error) {
            console.warn(`Error cargando datos del cliente para ${mes}:`, error);
        }
    }
    
    // Añadir totales a los resultados
    resultados._totales = {
        saldoInicialPrimero: saldoInicialPrimero || 0,
        saldoFinalUltimo,
        incrementosTotales,
        decrementosTotales,
        benefAcumTotal
    };
    
    return resultados;
}

function calcularKPIsTotalesCliente(datosClienteMeses) {
    const totales = datosClienteMeses._totales || {};
    const saldoInicial = totales.saldoInicialPrimero || 0;
    const saldoFinal = totales.saldoFinalUltimo || 0;
    const incrementos = totales.incrementosTotales || 0;
    const decrementos = totales.decrementosTotales || 0;
    
    // Beneficio = saldo final - saldo inicial - incrementos + decrementos
    const beneficioEuro = saldoFinal - saldoInicial - incrementos + decrementos;
    
    // Rentabilidad total
    const rentabilidadTotal = totales.benefAcumTotal || 0;
    
    // Mejor y peor mes
    const mesesConDatos = datosClienteMeses.filter(m => m.diasOperados > 0);
    const mejorMes = mesesConDatos.length > 0 ? mesesConDatos.reduce((a, b) => a.rentabilidad > b.rentabilidad ? a : b) : null;
    const peorMes = mesesConDatos.length > 0 ? mesesConDatos.reduce((a, b) => a.rentabilidad < b.rentabilidad ? a : b) : null;
    const promedioMensual = mesesConDatos.length > 0 ? rentabilidadTotal / mesesConDatos.length : 0;
    
    return {
        saldoInicial,
        saldoFinal,
        incrementos,
        decrementos,
        beneficioEuro,
        rentabilidadTotal,
        mejorMes,
        peorMes,
        promedioMensual,
        mesesOperados: mesesConDatos.length
    };
}

function renderizarContenidoEstadisticasCliente(nombreCompleto, kpis, datosMeses) {
    const container = document.getElementById('clientStatsContent');
    if (!container) return;
    
    const mesesConDatos = datosMeses.filter(m => m.diasOperados > 0);
    
    container.innerHTML = `
        <div class="client-stats-kpis">
            <div class="client-stat-card">
                <div class="label">Saldo Inicial (Total)</div>
                <div class="value">${formatearMoneda(kpis.saldoInicial)}</div>
            </div>
            <div class="client-stat-card">
                <div class="label">Saldo Actual</div>
                <div class="value">${formatearMoneda(kpis.saldoFinal)}</div>
            </div>
            <div class="client-stat-card">
                <div class="label">Incrementos Totales</div>
                <div class="value positive">+${formatearMoneda(kpis.incrementos)}</div>
            </div>
            <div class="client-stat-card">
                <div class="label">Decrementos Totales</div>
                <div class="value negative">-${formatearMoneda(kpis.decrementos)}</div>
            </div>
            <div class="client-stat-card">
                <div class="label">Beneficio Total €</div>
                <div class="value ${kpis.beneficioEuro >= 0 ? 'positive' : 'negative'}">${kpis.beneficioEuro >= 0 ? '+' : ''}${formatearMoneda(kpis.beneficioEuro)}</div>
            </div>
            <div class="client-stat-card">
                <div class="label">Rentabilidad Total</div>
                <div class="value ${kpis.rentabilidadTotal >= 0 ? 'positive' : 'negative'}">${kpis.rentabilidadTotal >= 0 ? '+' : ''}${kpis.rentabilidadTotal.toFixed(4)}%</div>
            </div>
        </div>
        
        <div class="client-stats-kpis" style="margin-top: 1rem;">
            <div class="client-stat-card">
                <div class="label">Mejor Mes</div>
                <div class="value positive">${kpis.mejorMes ? formatearMesCorto(kpis.mejorMes.mes) + ': +' + kpis.mejorMes.rentabilidad.toFixed(2) + '%' : '-'}</div>
            </div>
            <div class="client-stat-card">
                <div class="label">Peor Mes</div>
                <div class="value negative">${kpis.peorMes ? formatearMesCorto(kpis.peorMes.mes) + ': ' + kpis.peorMes.rentabilidad.toFixed(2) + '%' : '-'}</div>
            </div>
            <div class="client-stat-card">
                <div class="label">Promedio Mensual</div>
                <div class="value ${kpis.promedioMensual >= 0 ? 'positive' : 'negative'}">${kpis.promedioMensual.toFixed(2)}%</div>
            </div>
            <div class="client-stat-card">
                <div class="label">Meses Operados</div>
                <div class="value">${kpis.mesesOperados}</div>
            </div>
        </div>
        
        <div class="client-chart-container">
            <h3>📊 Rentabilidad Mensual</h3>
            <div class="client-chart-wrapper">
                <canvas id="chartClienteRentabilidad"></canvas>
            </div>
        </div>
        
        <div class="client-chart-container">
            <h3>📈 Evolución del Patrimonio</h3>
            <div class="client-chart-wrapper">
                <canvas id="chartClienteEvolucion"></canvas>
            </div>
        </div>
    `;
    
    // Renderizar gráficos
    setTimeout(() => {
        renderizarGraficoRentabilidadCliente(mesesConDatos);
        renderizarGraficoEvolucionCliente(mesesConDatos);
    }, 100);
}

function formatearMesCorto(mes) {
    const [year, month] = mes.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[parseInt(month) - 1] + ' ' + year.slice(2);
}

function renderizarGraficoRentabilidadCliente(datos) {
    const canvas = document.getElementById('chartClienteRentabilidad');
    if (!canvas || datos.length === 0) return;
    
    if (chartClienteRentabilidad) {
        chartClienteRentabilidad.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    const labels = datos.map(d => formatearMesCorto(d.mes));
    const valores = datos.map(d => d.rentabilidad);
    
    chartClienteRentabilidad = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rentabilidad %',
                data: valores,
                backgroundColor: valores.map(v => v >= 0 ? 'rgba(0, 255, 136, 0.8)' : 'rgba(255, 107, 107, 0.8)'),
                borderColor: valores.map(v => v >= 0 ? 'rgb(0, 255, 136)' : 'rgb(255, 107, 107)'),
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1000, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 46, 0.95)',
                    titleFont: { size: 14, weight: 'bold' },
                    titleColor: '#fff',
                    bodyFont: { size: 13 },
                    bodyColor: 'rgba(255,255,255,0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => {
                            const idx = ctx.dataIndex;
                            const d = datos[idx];
                            return [
                                `Rentabilidad: ${d.rentabilidad.toFixed(4)}%`,
                                `Acumulado: ${d.benefAcumTotal.toFixed(4)}%`,
                                `Días operados: ${d.diasOperados}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: 'rgba(255,255,255,0.6)',
                        callback: (v) => v.toFixed(2) + '%'
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                }
            }
        },
        plugins: [{
            id: 'datalabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const value = dataset.data[index];
                        ctx.fillStyle = value >= 0 ? '#00ff88' : '#ff6b6b';
                        ctx.font = 'bold 11px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = value >= 0 ? 'bottom' : 'top';
                        const y = value >= 0 ? bar.y - 5 : bar.y + 5;
                        ctx.fillText(value.toFixed(2) + '%', bar.x, y);
                    });
                });
            }
        }]
    });
}

function renderizarGraficoEvolucionCliente(datos) {
    const canvas = document.getElementById('chartClienteEvolucion');
    if (!canvas || datos.length === 0) return;
    
    if (chartClienteEvolucion) {
        chartClienteEvolucion.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    const labels = datos.map(d => formatearMesCorto(d.mes));
    const saldos = datos.map(d => d.saldoFinal);
    
    // Calcular gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0.0)');
    
    chartClienteEvolucion = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Patrimonio',
                data: saldos,
                borderColor: '#00d4ff',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#00d4ff',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1000, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 46, 0.95)',
                    titleFont: { size: 14, weight: 'bold' },
                    titleColor: '#fff',
                    bodyFont: { size: 13 },
                    bodyColor: 'rgba(255,255,255,0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => {
                            const idx = ctx.dataIndex;
                            const d = datos[idx];
                            return [
                                `Patrimonio: ${formatearMoneda(d.saldoFinal)}`,
                                `Incrementos: +${formatearMoneda(d.incrementos)}`,
                                `Decrementos: -${formatearMoneda(d.decrementos)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: 'rgba(255,255,255,0.6)',
                        callback: (v) => formatearMoneda(v)
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                }
            }
        }
    });
}

// ==================== RECALCULAR DIARIO WIND ====================

function recalcularDiarioWind(hoja) {
    // Esta función existía para lógica antigua de recálculo específico.
    // Mantenerla ligera y segura para no romper la carga de la app.
    if (!hoja) return;
    // Si se quiere forzar un recálculo completo de diario, usar el botón "Actualizar".
}

// Deshacer
async function deshacer() {
    if (indiceHistorial < 0 || historialCambios.length === 0) {
        mostrarNotificacion('No hay cambios para deshacer', 'info');
        return;
    }
    
    const cambio = historialCambios[indiceHistorial];
    await aplicarCambioHistorial(cambio, false);
    indiceHistorial--;
    actualizarBotonesUndoRedo();
    mostrarNotificacion('✓ Cambio deshecho', 'success');
    
    // Refrescar vista
    if (vistaActual === 'general') mostrarVistaGeneral();
    else if (vistaActual === 'detalle' && clienteActual !== null) {
        const hoja = datosEditados?.hojas?.[hojaActual];
        if (hoja?.clientes?.[clienteActual]) {
            void mostrarTablaEditableCliente(hoja.clientes[clienteActual], hoja, clienteActual);
        }
    }
}

// Rehacer
async function rehacer() {
    if (indiceHistorial >= historialCambios.length - 1) {
        mostrarNotificacion('No hay cambios para rehacer', 'info');
        return;
    }
    
    indiceHistorial++;
    const cambio = historialCambios[indiceHistorial];
    await aplicarCambioHistorial(cambio, true);
    actualizarBotonesUndoRedo();
    mostrarNotificacion('✓ Cambio rehecho', 'success');
}

// ==================== ATAJOS DE TECLADO ====================

function manejarAtajosTeclado(e) {
    // Ctrl+S: Guardar
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const btnGuardar = document.getElementById('btnGuardar');
        if (btnGuardar) {
            btnGuardar.click();
        }
        return;
    }
    
    // Ctrl+F: Buscar (en Info Clientes)
    if (e.ctrlKey && e.key === 'f') {
        if (vistaActual === 'infoClientes') {
            e.preventDefault();
            const searchInput = document.getElementById('buscarInfoCliente');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        return;
    }
    
    // Esc: Cerrar búsqueda
    if (e.key === 'Escape' && vistaActual === 'infoClientes') {
        const searchInput = document.getElementById('buscarInfoCliente');
        if (searchInput && document.activeElement === searchInput) {
            searchInput.value = '';
            filtrarInfoClientes();
        }
    }
    
    // Ctrl+Z: Deshacer
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        void deshacer();
        return;
    }
    
    // Ctrl+Y o Ctrl+Shift+Z: Rehacer
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        void rehacer();
        return;
    }
}

// ==================== VALIDACIÓN DE DATOS ====================

function validarNumero(valor, min = null, max = null) {
    if (valor === null || valor === undefined || valor === '') {
        return { valido: true, valor: null }; // Vacío es válido
    }
    
    const num = parseFloat(valor);
    if (isNaN(num)) {
        return { valido: false, error: 'Debe ser un número válido' };
    }
    
    if (min !== null && num < min) {
        return { valido: false, error: `Debe ser mayor o igual a ${min}` };
    }
    
    if (max !== null && num > max) {
        return { valido: false, error: `Debe ser menor o igual a ${max}` };
    }
    
    return { valido: true, valor: num };
}

function validarPorcentaje(valor) {
    const validacion = validarNumero(valor, -100, 100);
    if (!validacion.valido) {
        return validacion;
    }
    return { valido: true, valor: validacion.valor !== null ? validacion.valor / 100 : null };
}

// ==================== SISTEMA DE VALIDACIÓN EN CASCADA ====================

// Validar todos los datos en cascada al cargar
async function validarDatosEnCascada() {
    erroresDetectados = [];
    paginaActualErrores = 0;
    
    if (!datosEditados || !datosEditados.hojas) {
        return erroresDetectados;
    }
    
    console.log('🔍 Iniciando validación en cascada...');
    
    for (const nombreHoja of Object.keys(datosEditados.hojas)) {
        const hoja = datosEditados.hojas[nombreHoja];
        const erroresHoja = validarHojaCompleta(nombreHoja, hoja);
        erroresDetectados.push(...erroresHoja);
    }
    
    // Filtrar errores ya ignorados
    erroresDetectados = erroresDetectados.filter(e => !esErrorIgnorado(e));
    
    return erroresDetectados;
}

// Validar una hoja completa
function validarHojaCompleta(nombreHoja, hoja) {
    const errores = [];
    const clientes = hoja.clientes || [];
    const datosGen = hoja.datos_diarios_generales || [];
    
    if (clientes.length === 0) return errores;
    
    // Ordenar datos generales por fila
    const datosGenOrd = datosGen.filter(d => d.fila >= 15 && d.fila <= 1120).sort((a, b) => a.fila - b.fila);
    
    // 1. Verificar fila 15 (día 1) - imp_inicial = suma de incrementos
    const fila15 = datosGen.find(d => d.fila === 15);
    if (fila15) {
        const faCalculado = calcularFA(15, hoja);
        const impInicialActual = fila15.imp_inicial;
        
        if (impInicialActual !== null && impInicialActual !== undefined && 
            Math.abs(impInicialActual - faCalculado) > 0.01) {
            errores.push({
                hoja: nombreHoja,
                tipo: 'general',
                fila: 15,
                campo: 'imp_inicial',
                valorActual: impInicialActual,
                valorEsperado: faCalculado,
                descripcion: `Fila 15: imp_inicial=${formatearMoneda(impInicialActual)} debería ser ${formatearMoneda(faCalculado)} (suma de incrementos)`
            });
        }
    }
    
    // 2. Verificar cascada de imp_inicial en todas las filas
    let ultimoImpFinal = null;
    for (const filaData of datosGenOrd) {
        const fila = filaData.fila;
        
        if (fila === 15) {
            if (typeof filaData.imp_final === 'number') {
                ultimoImpFinal = filaData.imp_final;
            }
            continue;
        }
        
        // Verificar imp_inicial
        if (ultimoImpFinal !== null && typeof filaData.imp_inicial === 'number') {
            const fa = calcularFA(fila, hoja);
            const esperado = ultimoImpFinal + fa;
            
            if (Math.abs(filaData.imp_inicial - esperado) > 0.01) {
                errores.push({
                    hoja: nombreHoja,
                    tipo: 'general',
                    fila: fila,
                    campo: 'imp_inicial',
                    valorActual: filaData.imp_inicial,
                    valorEsperado: esperado,
                    descripcion: `Fila ${fila}: imp_inicial=${formatearMoneda(filaData.imp_inicial)} debería ser ${formatearMoneda(esperado)} (${formatearMoneda(ultimoImpFinal)} + FA=${fa})`
                });
            }
        }
        
        // Verificar beneficios solo si hay imp_final
        const tieneImpFinal = typeof filaData.imp_final === 'number';
        
        if (!tieneImpFinal) {
            // No debería haber beneficios
            const camposBenef = ['benef_euro', 'benef_porcentaje', 'benef_euro_acum', 'benef_porcentaje_acum'];
            for (const campo of camposBenef) {
                if (filaData[campo] !== null && filaData[campo] !== undefined && filaData[campo] !== 0) {
                    errores.push({
                        hoja: nombreHoja,
                        tipo: 'general',
                        fila: fila,
                        campo: campo,
                        valorActual: filaData[campo],
                        valorEsperado: null,
                        descripcion: `Fila ${fila}: ${campo}=${filaData[campo]} no debería existir sin imp_final`
                    });
                }
            }
        }
        
        if (typeof filaData.imp_final === 'number') {
            ultimoImpFinal = filaData.imp_final;
        }
    }
    
    // 3. Verificar clientes
    // Encontrar límite de cálculos
    let ultimaFilaMov = 0;
    let ultimaFilaImpFinal = 0;
    
    for (const c of clientes) {
        for (const d of (c.datos_diarios || [])) {
            if ((d.incremento || 0) > 0 || (d.decremento || 0) > 0) {
                if (d.fila > ultimaFilaMov) ultimaFilaMov = d.fila;
            }
        }
    }
    
    ultimaFilaImpFinal = obtenerUltimaFilaImpFinalManual(hoja);
    
    const limite = Math.max(ultimaFilaMov, ultimaFilaImpFinal);
    
    // Verificar cada cliente
    clientes.forEach((cliente, idx) => {
        const datosCliente = (cliente.datos_diarios || [])
            .filter(d => d.fila >= 15)
            .sort((a, b) => a.fila - b.fila);
        
        let saldoAnterior = (cliente && typeof cliente.saldo_inicial_mes === 'number' && isFinite(cliente.saldo_inicial_mes)) ? cliente.saldo_inicial_mes : 0;
        
        for (const d of datosCliente) {
            const fila = d.fila;
            
            // No verificar filas fuera del límite
            if (fila > limite) {
                if (d.base !== null && d.base !== undefined) {
                    errores.push({
                        hoja: nombreHoja,
                        tipo: 'cliente',
                        clienteIdx: idx,
                        fila: fila,
                        campo: 'base',
                        valorActual: d.base,
                        valorEsperado: null,
                        descripcion: `Cliente ${idx+1} Fila ${fila}: tiene base=${formatearMoneda(d.base)} fuera del límite de cálculos`
                    });
                }
                continue;
            }
            
            const inc = d.incremento || 0;
            const dec = d.decremento || 0;
            
            if (inc > 0 || dec > 0) {
                const baseEsperada = saldoAnterior + inc - dec;
                
                if (d.base !== null && d.base !== undefined && Math.abs(d.base - baseEsperada) > 0.01) {
                    errores.push({
                        hoja: nombreHoja,
                        tipo: 'cliente',
                        clienteIdx: idx,
                        fila: fila,
                        campo: 'base',
                        valorActual: d.base,
                        valorEsperado: baseEsperada,
                        descripcion: `Cliente ${idx+1} Fila ${fila}: base=${formatearMoneda(d.base)} debería ser ${formatearMoneda(baseEsperada)}`
                    });
                }
            }
            
            if (typeof d.saldo_diario === 'number') {
                saldoAnterior = d.saldo_diario;
            }
        }
    });
    
    return errores;
}

// Mostrar modal con errores de validación (con paginación)
function mostrarModalErroresValidacion(errores) {
    if (errores.length === 0) return;
    
    renderizarModalErrores();
}

// Renderizar el contenido del modal de errores
function renderizarModalErrores() {
    // Eliminar modal existente
    const modalExistente = document.getElementById('modalValidacion');
    if (modalExistente) modalExistente.remove();
    
    const totalPaginas = Math.ceil(erroresDetectados.length / ERRORES_POR_PAGINA);
    const inicio = paginaActualErrores * ERRORES_POR_PAGINA;
    const fin = Math.min(inicio + ERRORES_POR_PAGINA, erroresDetectados.length);
    const erroresPagina = erroresDetectados.slice(inicio, fin);
    
    const modal = document.createElement('div');
    modal.className = 'modal-validacion-overlay';
    modal.id = 'modalValidacion';
    
    const listaErrores = erroresPagina.map((e, i) => {
        const indexReal = inicio + i;
        return `
        <div class="error-item" data-index="${indexReal}">
            <div class="error-hoja">${e.hoja}</div>
            <div class="error-descripcion">${e.descripcion}</div>
            <div class="error-acciones">
                <button class="btn-corregir" onclick="corregirError(${indexReal})">✓ Corregir</button>
                <button class="btn-ignorar" onclick="ignorarErrorYActualizar(${indexReal})">✗ Ignorar siempre</button>
            </div>
        </div>
    `}).join('');
    
    const paginacion = totalPaginas > 1 ? `
        <div class="paginacion-errores">
            <button class="btn-pagina" onclick="cambiarPaginaErrores(-1)" ${paginaActualErrores === 0 ? 'disabled' : ''}>← Anterior</button>
            <span class="pagina-info">Página ${paginaActualErrores + 1} de ${totalPaginas}</span>
            <button class="btn-pagina" onclick="cambiarPaginaErrores(1)" ${paginaActualErrores >= totalPaginas - 1 ? 'disabled' : ''}>Siguiente →</button>
        </div>
    ` : '';
    
    modal.innerHTML = `
        <div class="modal-validacion">
            <div class="modal-validacion-header">
                <h3>Revisión de Datos</h3>
                <p>${erroresDetectados.length} inconsistencias encontradas</p>
            </div>
            <div class="modal-validacion-body">
                ${listaErrores}
                ${paginacion}
            </div>
            <div class="modal-validacion-footer">
                <button class="btn-corregir-todos" onclick="corregirTodosErrores()">✓ Corregir todos</button>
                <button class="btn-ignorar-todos" onclick="ignorarTodosYCerrar()">✗ Ignorar todos</button>
                <button class="btn-cerrar" onclick="cerrarModalValidacion()">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    agregarEstilosValidacion();
}

// Cambiar página de errores
window.cambiarPaginaErrores = function(direccion) {
    const totalPaginas = Math.ceil(erroresDetectados.length / ERRORES_POR_PAGINA);
    paginaActualErrores = Math.max(0, Math.min(totalPaginas - 1, paginaActualErrores + direccion));
    renderizarModalErrores();
};

// Agregar estilos del modal de validación
function agregarEstilosValidacion() {
    if (document.getElementById('estilosValidacion')) return;
    
    const estilos = document.createElement('style');
    estilos.id = 'estilosValidacion';
    estilos.textContent = `
        .modal-validacion-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.4);
            backdrop-filter: blur(8px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        .modal-validacion {
            background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 16px;
            padding: 32px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            border: 1px solid rgba(0,0,0,0.1);
        }
        .modal-validacion-header {
            text-align: center;
            margin-bottom: 24px;
        }
        .modal-validacion-header h3 {
            color: #1a1a2e;
            margin: 0 0 8px 0;
            font-size: 1.5rem;
            font-weight: 700;
        }
        .modal-validacion-header p {
            color: #6b7280;
            margin: 0;
            font-size: 0.9rem;
        }
        .modal-validacion-body {
            margin: 20px 0;
        }
        .error-item {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .error-hoja {
            font-size: 0.7rem;
            font-weight: 600;
            color: #c9a227;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
        }
        .error-item.corregido {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-color: #a7f3d0;
        }
        .error-item.ignorado {
            opacity: 0.5;
            background: #f3f4f6;
        }
        .error-descripcion {
            color: #374151;
            margin-bottom: 12px;
            font-size: 0.9rem;
            line-height: 1.5;
        }
        .error-acciones {
            display: flex;
            gap: 8px;
        }
        .btn-corregir, .btn-corregir-todos {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.2s;
        }
        .btn-corregir:hover, .btn-corregir-todos:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
        }
        .btn-ignorar, .btn-ignorar-todos {
            background: #f3f4f6;
            color: #4b5563;
            border: 1px solid #d1d5db;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        .btn-ignorar:hover, .btn-ignorar-todos:hover {
            background: #e5e7eb;
        }
        .btn-cerrar {
            background: #1a1a2e;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 600;
        }
        .modal-validacion-footer {
            display: flex;
            justify-content: center;
            gap: 12px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .paginacion-errores {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 16px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
        }
        .btn-pagina {
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85rem;
            color: #374151;
            transition: all 0.2s;
        }
        .btn-pagina:hover:not(:disabled) {
            background: #e5e7eb;
        }
        .btn-pagina:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .pagina-info {
            color: #6b7280;
            font-size: 0.9rem;
        }
        .btn-deshacer-flotante {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%);
            color: #1a1a2e;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: 0 4px 20px rgba(201, 162, 39, 0.4);
            z-index: 9999;
            display: none;
        }
        .btn-deshacer-flotante:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 24px rgba(201, 162, 39, 0.5);
        }
        .btn-deshacer-flotante.visible {
            display: block;
        }
    `;
    document.head.appendChild(estilos);
}

// Corregir un error específico
window.corregirError = function(index) {
    const error = erroresDetectados[index];
    if (!error) return;
    
    // Guardar valor anterior para undo
    const valorAnterior = error.valorActual;
    
    // Aplicar corrección
    if (error.tipo === 'general') {
        const hoja = datosEditados.hojas[error.hoja];
        const filaData = hoja.datos_diarios_generales.find(d => d.fila === error.fila);
        if (filaData) {
            filaData[error.campo] = error.valorEsperado;
            actualizarCeldaEnUI(error.fila, error.campo, error.valorEsperado);
        }
    } else if (error.tipo === 'cliente') {
        const hoja = datosEditados.hojas[error.hoja];
        const cliente = hoja.clientes[error.clienteIdx];
        if (cliente) {
            const dato = cliente.datos_diarios.find(d => d.fila === error.fila);
            if (dato) {
                dato[error.campo] = error.valorEsperado;
            }
        }
    }
    
    // Guardar en historial para poder deshacer
    agregarAlHistorial('correccion', {
        error: error,
        valorAnterior: valorAnterior
    });
    
    // Marcar como corregido en UI
    const errorItem = document.querySelector(`.error-item[data-index="${index}"]`);
    if (errorItem) {
        errorItem.classList.add('corregido');
        errorItem.querySelector('.error-acciones').innerHTML = '<span style="color: #22c55e;">✓ Corregido</span>';
    }
    
    // Mostrar botón de deshacer
    mostrarBotonDeshacer();
    
    // Guardar datos
    guardarDatosAutomatico(0, 1);
};

// Ignorar un error y guardarlo en localStorage
window.ignorarError = function(index) {
    const error = erroresDetectados[index];
    if (error) {
        guardarErrorIgnorado(error);
    }
    const errorItem = document.querySelector(`.error-item[data-index="${index}"]`);
    if (errorItem) {
        errorItem.classList.add('ignorado');
        errorItem.querySelector('.error-acciones').innerHTML = '<span style="color: #6b7280;">✓ Ignorado permanentemente</span>';
    }
};

// Ignorar error y actualizar modal (quita el error de la lista)
window.ignorarErrorYActualizar = function(index) {
    const error = erroresDetectados[index];
    if (error) {
        guardarErrorIgnorado(error);
        // Quitar de la lista actual
        erroresDetectados.splice(index, 1);
        // Ajustar página si es necesario
        const totalPaginas = Math.ceil(erroresDetectados.length / ERRORES_POR_PAGINA);
        if (paginaActualErrores >= totalPaginas && paginaActualErrores > 0) {
            paginaActualErrores--;
        }
        // Re-renderizar o cerrar si no quedan errores
        if (erroresDetectados.length === 0) {
            cerrarModalValidacion();
            mostrarNotificacion('Todas las inconsistencias han sido procesadas', 'success');
        } else {
            renderizarModalErrores();
        }
    }
};

// Ignorar todos los errores y cerrar
window.ignorarTodosYCerrar = function() {
    erroresDetectados.forEach(error => guardarErrorIgnorado(error));
    erroresDetectados = [];
    cerrarModalValidacion();
    mostrarNotificacion('Todas las inconsistencias han sido ignoradas', 'info');
};

// Corregir todos los errores
window.corregirTodosErrores = async function() {
    for (let i = 0; i < Math.min(erroresDetectados.length, 10); i++) {
        corregirError(i);
    }
    
    // Si hay más errores, corregirlos también
    if (erroresDetectados.length > 10) {
        for (let i = 10; i < erroresDetectados.length; i++) {
            const error = erroresDetectados[i];
            if (error.tipo === 'general') {
                const hoja = datosEditados.hojas[error.hoja];
                const filaData = hoja.datos_diarios_generales.find(d => d.fila === error.fila);
                if (filaData) {
                    filaData[error.campo] = error.valorEsperado;
                    actualizarCeldaEnUI(error.fila, error.campo, error.valorEsperado);
                }
            } else if (error.tipo === 'cliente') {
                const hoja = datosEditados.hojas[error.hoja];
                const cliente = hoja.clientes[error.clienteIdx];
                if (cliente) {
                    const dato = cliente.datos_diarios.find(d => d.fila === error.fila);
                    if (dato) {
                        dato[error.campo] = error.valorEsperado;
                    }
                }
            }
        }
    }
    
    await guardarDatosAutomatico(0, erroresDetectados.length);
    cerrarModalValidacion();
    mostrarNotificacion(`✓ ${erroresDetectados.length} errores corregidos`, 'success');
    mostrarBotonDeshacer();
};

// Cerrar modal de validación (funciona para ambos modales)
window.cerrarModalValidacion = function() {
    // Cerrar modal de validación general
    const modal = document.getElementById('modalValidacion');
    if (modal) {
        modal.remove();
    }
    // Cerrar modal de inconsistencia detallada
    const modalInc = document.getElementById('modalInconsistencia');
    if (modalInc) {
        modalInc.remove();
    }
    // Quitar botón de volver si existe
    const btnVolver = document.getElementById('btnVolverInconsistencia');
    if (btnVolver) {
        btnVolver.remove();
    }
    // Quitar remarcado de celdas
    document.querySelectorAll('.celda-inconsistencia-remarcada').forEach(el => {
        el.classList.remove('celda-inconsistencia-remarcada');
        el.style.animation = '';
    });
};

// Mostrar botón flotante para deshacer
function mostrarBotonDeshacer() {
    let btn = document.getElementById('btnDeshacerFlotante');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btnDeshacerFlotante';
        btn.className = 'btn-deshacer-flotante';
        btn.innerHTML = '↩ Deshacer correcciones';
        btn.onclick = deshacerUltimaCorreccion;
        document.body.appendChild(btn);
    }
    btn.classList.add('visible');
    
    // Ocultar después de 30 segundos
    setTimeout(() => {
        btn.classList.remove('visible');
    }, 30000);
}

// Deshacer última corrección
function deshacerUltimaCorreccion() {
    if (historialCambios.length === 0) {
        mostrarNotificacion('No hay cambios para deshacer', 'info');
        return;
    }
    
    const ultimoCambio = historialCambios[historialCambios.length - 1];
    if (ultimoCambio.tipo !== 'correccion') {
        // Usar el deshacer normal
        deshacer();
        return;
    }
    
    const error = ultimoCambio.datos.error;
    const valorAnterior = ultimoCambio.datos.valorAnterior;
    
    // Restaurar valor anterior
    if (error.tipo === 'general') {
        const hoja = datosEditados.hojas[error.hoja];
        const filaData = hoja.datos_diarios_generales.find(d => d.fila === error.fila);
        if (filaData) {
            filaData[error.campo] = valorAnterior;
            actualizarCeldaEnUI(error.fila, error.campo, valorAnterior);
        }
    } else if (error.tipo === 'cliente') {
        const hoja = datosEditados.hojas[error.hoja];
        const cliente = hoja.clientes[error.clienteIdx];
        if (cliente) {
            const dato = cliente.datos_diarios.find(d => d.fila === error.fila);
            if (dato) {
                dato[error.campo] = valorAnterior;
            }
        }
    }
    
    historialCambios.pop();
    guardarDatosAutomatico(0, 1);
    mostrarNotificacion('✓ Corrección deshecha', 'success');
}

// ==================== ACTUALIZAR TODO EL DIARIO ====================

// Recalcular TODAS las casillas del diario actual (general + clientes)
async function actualizarTodoElDiario(opts = {}) {
    if (__actualizarTodoPromise) return __actualizarTodoPromise;
    __actualizarTodoPromise = (async () => {
        const silent = !!opts.silent;
        const skipVistaRefresh = !!opts.skipVistaRefresh;
        const skipGuardar = !!opts.skipGuardar;
        const hoja = datosEditados?.hojas?.[hojaActual];
        if (!hoja) {
            if (!silent) {
                mostrarNotificacion('No hay datos para actualizar', 'error');
            }
            return;
        }
        if (!silent) {
            mostrarNotificacion('⟳ Actualizando todas las casillas...', 'info');
        }
        console.log(`🔄 Actualizando todo el diario: ${hojaActual}`);

        __cacheSaldosWindKey = null;

        let cambiosRealizados = 0;
        const clientes = hoja.clientes || [];
        const datosGen = hoja.datos_diarios_generales || [];

        await yieldToBrowser();

        for (let i = 0; i < clientes.length; i++) {
            recalcularSaldosClienteEnMemoria(hoja, i);
            recalcularTotalesCliente(clientes[i]);
            cambiosRealizados++;

            if (i > 0 && (i % 2) === 0) {
                await yieldToBrowser();
            }
        }

        recalcularImpInicialSync(hoja);
        recalcularBeneficiosGeneralesDesdeFila(15, hoja);

        if (hojaActual !== 'Diario WIND') {
            const benefPctPorFila = new Map();
            (hoja.datos_diarios_generales || []).forEach(d => {
                if (!d || d.fila < 15 || d.fila > 1120) return;
                if (typeof d.imp_final !== 'number') return;
                if (typeof d.benef_porcentaje === 'number') {
                    benefPctPorFila.set(d.fila, d.benef_porcentaje);
                }
            });

            for (let i = 0; i < clientes.length; i++) {
                const cliente = clientes[i];
                const rows = (cliente.datos_diarios || [])
                    .filter(d => d && d.fila >= 15 && d.fila <= 1120)
                    .sort((a, b) => (a.fila || 0) - (b.fila || 0));

                let saldoAnterior = (cliente && typeof cliente.saldo_inicial_mes === 'number' && isFinite(cliente.saldo_inicial_mes)) ? cliente.saldo_inicial_mes : 0;
                let benefAcumAnterior = 0;
                let inversionAcum = 0;

                for (let r = 0; r < rows.length; r++) {
                    const d = rows[r];
                    const inc = typeof d.incremento === 'number' ? d.incremento : 0;
                    const dec = typeof d.decremento === 'number' ? d.decremento : 0;

                    inversionAcum += inc;

                    const base = saldoAnterior + inc - dec;
                    const pctDia = benefPctPorFila.get(d.fila);

                    if (typeof pctDia === 'number') {
                        const benefDia = base * pctDia;
                        const saldo = base + benefDia;
                        const benefAcum = benefAcumAnterior + benefDia;
                        const benefPctAcum = inversionAcum > 0 ? (benefAcum / inversionAcum) : 0;

                        if (d.base !== base) {
                            d.base = base;
                            cambiosRealizados++;
                        }
                        if (d.beneficio_diario !== benefDia) {
                            d.beneficio_diario = benefDia;
                            cambiosRealizados++;
                        }
                        if (d.beneficio_diario_pct !== pctDia) {
                            d.beneficio_diario_pct = pctDia;
                            cambiosRealizados++;
                        }
                        if (d.saldo_diario !== saldo) {
                            d.saldo_diario = saldo;
                            cambiosRealizados++;
                        }
                        if (d.beneficio_acumulado !== benefAcum) {
                            d.beneficio_acumulado = benefAcum;
                            cambiosRealizados++;
                        }
                        if (d.beneficio_acumulado_pct !== benefPctAcum) {
                            d.beneficio_acumulado_pct = benefPctAcum;
                            cambiosRealizados++;
                        }

                        saldoAnterior = saldo;
                        benefAcumAnterior = benefAcum;
                    } else {
                        if (d.base !== base) {
                            d.base = base;
                            cambiosRealizados++;
                        }
                        if (d.saldo_diario !== base) {
                            d.saldo_diario = base;
                            cambiosRealizados++;
                        }
                        const campos = ['beneficio_diario', 'beneficio_diario_pct', 'beneficio_acumulado', 'beneficio_acumulado_pct'];
                        campos.forEach(c => {
                            if (d[c] !== null && d[c] !== undefined) {
                                d[c] = null;
                                cambiosRealizados++;
                            }
                        });
                        saldoAnterior = base;
                    }

                    if (r > 0 && (r % 80) === 0) {
                        await yieldToBrowser();
                    }
                }

                if (i > 0 && (i % 2) === 0) {
                    await yieldToBrowser();
                }
            }
        } else {
            for (let i = 0; i < clientes.length; i++) {
                const cliente = clientes[i];
                const rows = (cliente.datos_diarios || [])
                    .filter(d => d && d.fila >= 15 && d.fila <= 1120)
                    .sort((a, b) => (a.fila || 0) - (b.fila || 0));

                let inversionAcum = 0;
                let benefAcum = 0;

                for (let r = 0; r < rows.length; r++) {
                    const d = rows[r];
                    const inc = typeof d.incremento === 'number' ? d.incremento : 0;
                    inversionAcum += inc;

                    if (typeof d.beneficio_acumulado === 'number') {
                        benefAcum = d.beneficio_acumulado;
                    } else {
                        const benefDia = typeof d.beneficio_diario === 'number' ? d.beneficio_diario : 0;
                        benefAcum += benefDia;
                    }

                    const pctAcum = inversionAcum > 0 ? (benefAcum / inversionAcum) : 0;
                    if (d.beneficio_acumulado_pct !== pctAcum) {
                        d.beneficio_acumulado_pct = pctAcum;
                        cambiosRealizados++;
                    }

                    if (r > 0 && (r % 100) === 0) {
                        await yieldToBrowser();
                    }
                }

                if (i > 0 && (i % 2) === 0) {
                    await yieldToBrowser();
                }
            }
        }

        if (!skipGuardar && cambiosRealizados > 0) {
            await guardarDatosAutomatico(0, cambiosRealizados);
        }

        if (!silent) {
            if (cambiosRealizados > 0) {
                mostrarNotificacion(`✓ ${cambiosRealizados} casillas actualizadas`, 'success');
            } else {
                mostrarNotificacion('✓ Todas las casillas están correctas', 'success');
            }
        }

        __dirtyRecalculoMasivo = false;

        if (!skipVistaRefresh) {
            if (vistaActual === 'general') {
                mostrarVistaGeneral();
            } else if (vistaActual === 'clientes') {
                mostrarVistaClientes();
            }
        }
    })().finally(() => {
        __actualizarTodoPromise = null;
    });
    return __actualizarTodoPromise;
}

// ==================== ANALIZAR INCONSISTENCIAS UNA A UNA ====================

let indiceInconsistenciaActual = 0;

// Analizar inconsistencias mostrando una por una con explicación
async function analizarInconsistenciasUnaAUna() {
    // Ejecutar validación
    const errores = await validarDatosEnCascada();
    
    if (errores.length === 0) {
        mostrarNotificacion('✓ No se encontraron inconsistencias', 'success');
        return;
    }
    
    indiceInconsistenciaActual = 0;
    mostrarInconsistenciaDetallada(errores, 0);
}

// Variable para guardar el índice de inconsistencia actual (para volver después de VER)
let indiceInconsistenciaParaVolver = null;

// Mostrar una inconsistencia con explicación detallada
function mostrarInconsistenciaDetallada(errores, indice) {
    const error = errores[indice];
    if (!error) return;
    
    // Guardar índice para poder volver
    indiceInconsistenciaParaVolver = indice;
    
    // Eliminar modal existente
    const modalExistente = document.getElementById('modalInconsistencia');
    if (modalExistente) modalExistente.remove();
    
    // Generar explicación detallada
    let explicacion = '';
    let ubicacion = '';
    
    if (error.tipo === 'general') {
        ubicacion = `<strong>Campo:</strong> ${error.campo}`;
        if (error.campo === 'imp_inicial') {
            if (error.fila === 15) {
                explicacion = `El importe inicial debe ser igual a la <strong>suma de todos los incrementos de clientes</strong> en ese día.`;
            } else {
                explicacion = `El importe inicial debe ser igual al <strong>importe final del día anterior + FA</strong> (suma incrementos - decrementos).`;
            }
        } else if (error.campo.includes('benef')) {
            explicacion = `Los beneficios solo deben existir si hay un importe final definido para ese día.`;
        }
    } else if (error.tipo === 'cliente') {
        ubicacion = `<strong>Cliente ${error.clienteIdx + 1}</strong> · Campo: ${error.campo}`;
        explicacion = `La base del cliente se calcula como: <strong>saldo anterior + incremento - decremento</strong>.`;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-validacion-overlay';
    modal.id = 'modalInconsistencia';
    
    modal.innerHTML = `
        <div class="modal-validacion" style="max-width: 600px;">
            <div class="modal-validacion-header">
                <h3>Inconsistencia ${indice + 1} de ${errores.length}</h3>
                <p style="color: #bf8c30; font-weight: 600;">${error.hoja}</p>
            </div>
            <div class="modal-validacion-body">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                    <div style="font-size: 0.9rem; color: #515154;">${ubicacion}</div>
                    <button class="btn-ver-celda" onclick="verCeldaInconsistencia(${indice})">👁 VER</button>
                </div>
                <div style="background: #f5f5f7; padding: 14px; border-radius: 10px; margin-bottom: 16px; font-size: 0.9rem; color: #515154;">
                    ${explicacion}
                </div>
                <div style="display: flex; gap: 20px; justify-content: center; padding: 12px 0;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.65rem; color: #86868b; text-transform: uppercase; margin-bottom: 4px;">Actual</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #ff3b30;">${error.valorActual !== null ? formatearMoneda(error.valorActual) : '—'}</div>
                    </div>
                    <div style="font-size: 1.5rem; color: #d2d2d7;">→</div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.65rem; color: #86868b; text-transform: uppercase; margin-bottom: 4px;">Correcto</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #34c759;">${error.valorEsperado !== null ? formatearMoneda(error.valorEsperado) : '—'}</div>
                    </div>
                </div>
            </div>
            <div class="modal-validacion-footer" style="flex-wrap: wrap; gap: 8px;">
                <button class="btn-corregir" onclick="corregirYSiguiente(${indice})">✓ Corregir</button>
                <button class="btn-ignorar" onclick="ignorarYSiguiente(${indice})">✗ Ignorar</button>
                ${indice > 0 ? `<button class="btn-pagina" onclick="mostrarInconsistenciaDetallada(erroresDetectados, ${indice - 1})">←</button>` : ''}
                ${indice < errores.length - 1 ? `<button class="btn-pagina" onclick="mostrarInconsistenciaDetallada(erroresDetectados, ${indice + 1})">→</button>` : ''}
                <button class="btn-cerrar" onclick="cerrarModalValidacion()">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    agregarEstilosValidacion();
}

// Ver la celda de una inconsistencia (navegar y remarcar)
window.verCeldaInconsistencia = function(indice) {
    const error = erroresDetectados[indice];
    if (!error) return;
    
    // Ocultar modal temporalmente (no eliminarlo)
    const modal = document.getElementById('modalInconsistencia');
    if (modal) modal.style.display = 'none';
    
    // Cambiar a la hoja correcta si es necesario
    if (error.hoja !== hojaActual) {
        const selector = document.getElementById('selectorHoja');
        if (selector) {
            selector.value = error.hoja;
            // Cambiar hoja y luego navegar
            cambiarHoja().then(() => {
                navegarACeldaInconsistencia(error, indice);
            });
            return;
        }
    }
    
    navegarACeldaInconsistencia(error, indice);
};

// Navegar a la celda y remarcarla
function navegarACeldaInconsistencia(error, indice) {
    if (error.tipo === 'general') {
        // Ir a vista general
        mostrarVistaGeneral();
        
        // Esperar a que se renderice y buscar la celda
        setTimeout(() => {
            remarcarCeldaGeneral(error.fila, error.campo, indice);
        }, 300);
        
    } else if (error.tipo === 'cliente') {
        // Ir a vista del cliente
        void mostrarDetalleCliente(error.clienteIdx);
        
        // Esperar a que se renderice y buscar la celda
        setTimeout(() => {
            remarcarCeldaCliente(error.fila, error.campo, indice);
        }, 300);
    }
}

// Remarcar celda en vista general
function remarcarCeldaGeneral(fila, campo, indice) {
    const tabla = document.getElementById('tbodyGeneral');
    if (!tabla) {
        mostrarBotonVolverInconsistencia(indice);
        return;
    }
    
    // Mapeo de campo a índice de columna (0=fecha, 1=imp_inicial, 2=imp_final, etc.)
    const columnaIndex = {
        'imp_inicial': 1,
        'imp_final': 2,
        'benef_euro': 3,
        'benef_porcentaje': 4,
        'benef_euro_acum': 5,
        'benef_porcentaje_acum': 6
    };
    
    const colIdx = columnaIndex[campo];
    
    const filas = tabla.querySelectorAll('tr');
    for (const tr of filas) {
        // Buscar inputs con data-fila
        const inputs = tr.querySelectorAll('input');
        for (const input of inputs) {
            if (parseInt(input.dataset.fila) === fila && (input.dataset.columna === campo || input.dataset.campo === campo)) {
                remarcarYMostrarBotonVolver(input.parentElement || input, indice);
                return;
            }
        }
        
        // Buscar celdas por índice de columna
        const celdas = tr.querySelectorAll('td');
        if (colIdx !== undefined && celdas[colIdx]) {
            const input = celdas[colIdx].querySelector('input');
            if (input && parseInt(input.dataset.fila) === fila) {
                remarcarYMostrarBotonVolver(celdas[colIdx], indice);
                return;
            }
            // Si es celda bloqueada, verificar la fila
            const primerInput = tr.querySelector('input');
            if (primerInput && parseInt(primerInput.dataset.fila) === fila) {
                remarcarYMostrarBotonVolver(celdas[colIdx], indice);
                return;
            }
        }
    }
    
    mostrarBotonVolverInconsistencia(indice);
}

// Remarcar celda en vista cliente
function remarcarCeldaCliente(fila, campo, indice) {
    const tabla = document.getElementById('tbodyDetalle');
    if (!tabla) return;
    
    const filas = tabla.querySelectorAll('tr');
    for (const tr of filas) {
        const inputs = tr.querySelectorAll('input');
        for (const input of inputs) {
            if (parseInt(input.dataset.fila) === fila && input.dataset.campo === campo) {
                remarcarYMostrarBotonVolver(input, indice);
                return;
            }
        }
    }
    
    mostrarBotonVolverInconsistencia(indice);
}

// Remarcar elemento y mostrar botón volver
function remarcarYMostrarBotonVolver(elemento, indice) {
    // Scroll al elemento
    elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Añadir clase de remarcado
    elemento.classList.add('celda-inconsistencia-remarcada');
    
    // Pulsar/animar
    elemento.style.animation = 'pulsoInconsistencia 1s ease-in-out 3';
    
    // Mostrar botón flotante para volver
    mostrarBotonVolverInconsistencia(indice);
}

// Mostrar botón flotante para volver al análisis
function mostrarBotonVolverInconsistencia(indice) {
    // Eliminar botón existente
    const btnExistente = document.getElementById('btnVolverInconsistencia');
    if (btnExistente) btnExistente.remove();
    
    const btn = document.createElement('button');
    btn.id = 'btnVolverInconsistencia';
    btn.className = 'btn-volver-inconsistencia';
    btn.innerHTML = '← Volver al análisis';
    btn.onclick = () => {
        // Quitar remarcado de celdas
        document.querySelectorAll('.celda-inconsistencia-remarcada').forEach(el => {
            el.classList.remove('celda-inconsistencia-remarcada');
            el.style.animation = '';
        });
        
        // Eliminar este botón
        btn.remove();
        
        // Mostrar modal de nuevo
        const modal = document.getElementById('modalInconsistencia');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            // Si el modal se eliminó, recrearlo
            mostrarInconsistenciaDetallada(erroresDetectados, indice);
        }
    };
    
    document.body.appendChild(btn);
}

// Corregir y pasar a la siguiente
window.corregirYSiguiente = function(indice) {
    corregirError(indice);
    
    // Si hay más errores, mostrar el siguiente
    if (indice < erroresDetectados.length - 1) {
        setTimeout(() => mostrarInconsistenciaDetallada(erroresDetectados, indice + 1), 300);
    } else {
        cerrarModalValidacion();
        mostrarNotificacion('✓ Todas las inconsistencias procesadas', 'success');
    }
};

// Ignorar y pasar a la siguiente
window.ignorarYSiguiente = function(indice) {
    const error = erroresDetectados[indice];
    if (error) {
        guardarErrorIgnorado(error);
    }
    
    // Si hay más errores, mostrar el siguiente
    if (indice < erroresDetectados.length - 1) {
        setTimeout(() => mostrarInconsistenciaDetallada(erroresDetectados, indice + 1), 300);
    } else {
        cerrarModalValidacion();
        mostrarNotificacion('✓ Todas las inconsistencias procesadas', 'success');
    }
};

// ============================================================================
// REDISTRIBUCIÓN AUTOMÁTICA PARA DIARIO WIND
// ============================================================================

async function redistribuirSaldosClientesWIND(hoja) {
    if (!hoja || !hoja.clientes) return;
    
    console.log('🔄 WIND: Iniciando redistribución automática de saldos...');
    
    const datosGen = hoja.datos_diarios_generales || [];
    let recalculosRealizados = 0;
    let redistribucionesRealizadas = 0;
    
    // 1. RECALCULAR CLIENTES CON SALDO INICIAL PERO SIN DATOS
    for (let idx = 0; idx < hoja.clientes.length; idx++) {
        const cliente = hoja.clientes[idx];
        if (!cliente) continue;
        
        const tieneSaldoInicial = cliente.saldo_inicial_mes && 
            typeof cliente.saldo_inicial_mes === 'number' && 
            cliente.saldo_inicial_mes > 0;
        
        if (!tieneSaldoInicial) continue;
        
        const datosDiarios = cliente.datos_diarios || [];
        const datosConSaldo = datosDiarios.filter(d => 
            d && typeof d.saldo_diario === 'number' && isFinite(d.saldo_diario)
        );
        
        if (datosConSaldo.length === 0) {
            console.log(`🔧 Recalculando cliente ${cliente.numero_cliente || (idx + 1)} con saldo inicial ${cliente.saldo_inicial_mes.toFixed(2)}€`);
            recalcularClienteCompleto(
                cliente,
                hoja,
                hoja.datos_generales,
                hoja.datos_diarios_generales,
                null,
                'Diario WIND'
            );
            recalculosRealizados++;
        }
        if (idx > 0 && (idx % 2) === 0) {
            await yieldToBrowser();
        }
    }
    
    // 2. REDISTRIBUIR SALDOS PARA MANTENER IMP_FINAL FIJO
    // Por cada fila con imp_final, verificar que la suma de saldos de clientes = imp_final
    const datosConImpFinal = datosGen.filter(d => 
        d && d.fila >= 15 && d.fila <= 1120 && 
        d.fecha && d.fecha !== 'FECHA' &&
        typeof d.imp_final === 'number' && isFinite(d.imp_final) && d.imp_final > 0
    );

    const datosConImpFinalOrd = [...datosConImpFinal].sort((a, b) => (a.fila || 0) - (b.fila || 0));

    // Precomputar estructuras por cliente para evitar filtros/sorts repetidos
    const estadoClientes = hoja.clientes.map(cliente => {
        const rows = (cliente?.datos_diarios || [])
            .filter(d => d && typeof d.fila === 'number' && d.fila >= 15 && d.fila <= 1120)
            .sort((a, b) => (a.fila || 0) - (b.fila || 0));
        const mapPorFila = new Map();
        rows.forEach(r => {
            mapPorFila.set(r.fila, r);
        });
        return {
            cliente,
            rows,
            mapPorFila,
            ptr: 0,
            lastSaldo: (cliente && typeof cliente.saldo_inicial_mes === 'number' && isFinite(cliente.saldo_inicial_mes)) ? cliente.saldo_inicial_mes : 0,
            cumBenef: 0,
            cumInv: (cliente && typeof cliente.saldo_inicial_mes === 'number' && isFinite(cliente.saldo_inicial_mes)) ? cliente.saldo_inicial_mes : 0
        };
    });

    for (let gIdx = 0; gIdx < datosConImpFinalOrd.length; gIdx++) {
        const datoGen = datosConImpFinalOrd[gIdx];
        const fila = datoGen.fila;
        const impFinalGeneral = datoGen.imp_final;
        
        // Recopilar clientes activos en esta fila
        const clientesActivos = [];
        for (let idx = 0; idx < estadoClientes.length; idx++) {
            const st = estadoClientes[idx];
            const cliente = st.cliente;
            if (!cliente) continue;
            const datoCliente = st.mapPorFila.get(fila);
            if (!datoCliente) continue;

            while (st.ptr < st.rows.length && (st.rows[st.ptr]?.fila || 0) < fila) {
                const r = st.rows[st.ptr];
                if (typeof r?.saldo_diario === 'number' && isFinite(r.saldo_diario)) {
                    st.lastSaldo = r.saldo_diario;
                }
                if (typeof r?.beneficio_diario === 'number' && isFinite(r.beneficio_diario)) {
                    st.cumBenef += r.beneficio_diario;
                }
                const incPtr = typeof r?.incremento === 'number' ? r.incremento : 0;
                st.cumInv += incPtr;
                st.ptr++;
            }

            const inc = typeof datoCliente.incremento === 'number' ? datoCliente.incremento : 0;
            const dec = typeof datoCliente.decremento === 'number' ? datoCliente.decremento : 0;
            const base = st.lastSaldo + inc - dec;

            clientesActivos.push({
                cliente,
                datoCliente,
                base,
                idx,
                st
            });

            if (idx > 0 && (idx % 3) === 0) {
                await yieldToBrowser();
            }
        }
        
        if (clientesActivos.length === 0) {
            continue;
        }
        
        // Calcular suma de bases (sin beneficios)
        const sumaBase = clientesActivos.reduce((sum, c) => sum + c.base, 0);
        
        // El beneficio total a repartir es: imp_final - suma_base
        const beneficioTotal = impFinalGeneral - sumaBase;
        
        // Redistribuir beneficio proporcionalmente según la base de cada cliente
        if (sumaBase > 0 && Math.abs(beneficioTotal) > 0.01) {
            for (let i = 0; i < clientesActivos.length; i++) {
                const { cliente, datoCliente, base, st } = clientesActivos[i];
                const proporcion = base / sumaBase;
                const beneficioCliente = beneficioTotal * proporcion;
                const beneficioPct = base > 0 ? (beneficioCliente / base) : 0;
                
                // Actualizar datos del cliente
                datoCliente.beneficio_diario = beneficioCliente;
                datoCliente.beneficio_diario_pct = beneficioPct;
                datoCliente.saldo_diario = base + beneficioCliente;
                
                // Actualizar beneficio acumulado
                const benefAcumPrev = st ? st.cumBenef : 0;
                datoCliente.beneficio_acumulado = benefAcumPrev + beneficioCliente;
                
                // Calcular inversión acumulada para beneficio % acumulado
                const inversionAcum = st ? (st.cumInv + (typeof datoCliente.incremento === 'number' ? datoCliente.incremento : 0)) : (cliente.saldo_inicial_mes || 0);
                
                datoCliente.beneficio_acumulado_pct = inversionAcum > 0 
                    ? (datoCliente.beneficio_acumulado / inversionAcum) 
                    : 0;
                if (i > 0 && (i % 3) === 0) {
                    await yieldToBrowser();
                }
            }
            
            redistribucionesRealizadas++;
        }
        if (gIdx > 0 && (gIdx % 2) === 0) {
            await yieldToBrowser();
        }
    }
    
    if (recalculosRealizados > 0 || redistribucionesRealizadas > 0) {
        console.log(`✅ WIND: ${recalculosRealizados} cliente(s) recalculado(s), ${redistribucionesRealizadas} fila(s) redistribuida(s)`);
        
        // Refrescar vista si estamos en vista de cliente
        if (vistaActual === 'detalle' && clienteActual !== null) {
            const hoja = datosEditados.hojas[hojaActual];
            if (hoja && hoja.clientes && hoja.clientes[clienteActual]) {
                void renderDetalleCliente(clienteActual);
            }
        }
    } else {
        console.log('✅ WIND: No se requirieron ajustes');
    }
}

// FUNCIÓN ANTIGUA DE VALIDACIÓN (MANTENIDA PARA REFERENCIA)
function validarYCorregirAutomaticoWIND_OLD(hoja) {
    if (!hoja || !hoja.clientes) return;
    
    const problemas = [];
    let recalculosRealizados = 0;
    
    // 1. VALIDAR REPARTO DE IMP_FINAL A CLIENTES
    const datosGen = hoja.datos_diarios_generales || [];
    const datosConImpFinal = datosGen.filter(d => 
        d && d.fila >= 15 && d.fila <= 1120 && 
        d.fecha && d.fecha !== 'FECHA' &&
        typeof d.imp_final === 'number' && isFinite(d.imp_final) && d.imp_final > 0
    );
    
    if (datosConImpFinal.length > 0) {
        // Verificar que los clientes tengan datos diarios calculados
        let clientesSinDatos = 0;
        let clientesConSaldoInicial = 0;
        
        hoja.clientes.forEach((cliente, idx) => {
            if (!cliente) return;
            
            const tieneSaldoInicial = cliente.saldo_inicial_mes && 
                typeof cliente.saldo_inicial_mes === 'number' && 
                cliente.saldo_inicial_mes > 0;
            
            const datosDiarios = cliente.datos_diarios || [];
            const datosConSaldo = datosDiarios.filter(d => 
                d && typeof d.saldo_diario === 'number' && isFinite(d.saldo_diario)
            );
            
            if (tieneSaldoInicial) {
                clientesConSaldoInicial++;
                
                if (datosConSaldo.length === 0) {
                    clientesSinDatos++;
                    problemas.push({
                        tipo: 'cliente_sin_datos',
                        cliente: idx + 1,
                        saldo_inicial: cliente.saldo_inicial_mes,
                        mensaje: `Cliente ${cliente.numero_cliente || (idx + 1)} tiene saldo inicial ${cliente.saldo_inicial_mes.toFixed(2)}€ pero no tiene datos diarios calculados`
                    });
                    
                    // AUTO-CORRECCIÓN: Recalcular cliente
                    console.log(`🔧 Auto-corrección: Recalculando cliente ${cliente.numero_cliente || (idx + 1)}`);
                    recalcularClienteCompleto(
                        cliente,
                        hoja,
                        hoja.datos_generales,
                        hoja.datos_diarios_generales,
                        null,
                        'Diario WIND'
                    );
                    recalculosRealizados++;
                }
            }
        });
        
        if (clientesSinDatos > 0) {
            console.log(`⚠️ WIND: ${clientesSinDatos} de ${clientesConSaldoInicial} clientes con saldo inicial no tenían datos calculados`);
        }
    }
    
    // 2. VALIDAR SUMA DE SALDOS DE CLIENTES VS IMP_FINAL GENERAL
    datosConImpFinal.forEach(datoGen => {
        const fila = datoGen.fila;
        const impFinalGeneral = datoGen.imp_final;
        
        let sumaSaldosClientes = 0;
        let clientesEnFila = 0;
        
        hoja.clientes.forEach(cliente => {
            if (!cliente || !cliente.datos_diarios) return;
            
            const datoCliente = cliente.datos_diarios.find(d => d && d.fila === fila);
            if (datoCliente && typeof datoCliente.saldo_diario === 'number' && isFinite(datoCliente.saldo_diario)) {
                sumaSaldosClientes += datoCliente.saldo_diario;
                clientesEnFila++;
            }
        });
        
        const diferencia = Math.abs(impFinalGeneral - sumaSaldosClientes);
        const tolerancia = 0.01; // 1 céntimo de tolerancia por errores de redondeo
        
        if (diferencia > tolerancia && clientesEnFila > 0) {
            problemas.push({
                tipo: 'desbalance_reparto',
                fila: fila,
                fecha: datoGen.fecha,
                imp_final_general: impFinalGeneral,
                suma_clientes: sumaSaldosClientes,
                diferencia: diferencia,
                mensaje: `Fila ${fila}: Imp Final General (${impFinalGeneral.toFixed(2)}€) ≠ Suma Clientes (${sumaSaldosClientes.toFixed(2)}€). Diferencia: ${diferencia.toFixed(2)}€`
            });
        }
    });
    
    // 3. VALIDAR ARRASTRE DE SALDO ENTRE DÍAS
    hoja.clientes.forEach((cliente, idx) => {
        if (!cliente || !cliente.datos_diarios) return;
        
        const datosOrdenados = cliente.datos_diarios
            .filter(d => d && d.fila >= 15 && d.fila <= 1120 && 
                    typeof d.saldo_diario === 'number' && isFinite(d.saldo_diario))
            .sort((a, b) => (a.fila || 0) - (b.fila || 0));
        
        for (let i = 1; i < datosOrdenados.length; i++) {
            const anterior = datosOrdenados[i - 1];
            const actual = datosOrdenados[i];
            
            const inc = typeof actual.incremento === 'number' ? actual.incremento : 0;
            const dec = typeof actual.decremento === 'number' ? actual.decremento : 0;
            const ben = typeof actual.beneficio_diario === 'number' ? actual.beneficio_diario : 0;
            
            const saldoEsperado = anterior.saldo_diario + inc - dec + ben;
            const diferencia = Math.abs(actual.saldo_diario - saldoEsperado);
            
            if (diferencia > 0.01) {
                problemas.push({
                    tipo: 'arrastre_incorrecto',
                    cliente: idx + 1,
                    fila: actual.fila,
                    saldo_anterior: anterior.saldo_diario,
                    saldo_actual: actual.saldo_diario,
                    saldo_esperado: saldoEsperado,
                    diferencia: diferencia,
                    mensaje: `Cliente ${cliente.numero_cliente || (idx + 1)}, Fila ${actual.fila}: Saldo ${actual.saldo_diario.toFixed(2)}€ ≠ Esperado ${saldoEsperado.toFixed(2)}€`
                });
            }
        }
    });
    
    // MOSTRAR RESULTADOS
    if (recalculosRealizados > 0) {
        mostrarNotificacion(`🔧 Auto-corrección: ${recalculosRealizados} cliente(s) recalculado(s)`, 'info');
    }
    
    if (problemas.length > 0) {
        const problemasGraves = problemas.filter(p => 
            p.tipo === 'desbalance_reparto' || p.tipo === 'arrastre_incorrecto'
        );
        
        if (problemasGraves.length > 0) {
            console.warn('⚠️ WIND: Problemas detectados:', problemasGraves);
            mostrarNotificacionValidacionWIND(problemasGraves);
        }
    } else if (recalculosRealizados === 0) {
        console.log('✅ WIND: Validación OK - No se detectaron problemas');
    }
}

function mostrarNotificacionValidacionWIND(problemas) {
    const resumen = {};
    problemas.forEach(p => {
        resumen[p.tipo] = (resumen[p.tipo] || 0) + 1;
    });
    
    let mensaje = '⚠️ WIND: ';
    const tipos = [];
    if (resumen.desbalance_reparto) tipos.push(`${resumen.desbalance_reparto} desbalance(s) de reparto`);
    if (resumen.arrastre_incorrecto) tipos.push(`${resumen.arrastre_incorrecto} error(es) de arrastre`);
    
    mensaje += tipos.join(', ');
    
    // Mostrar notificación persistente
    const notif = document.getElementById('notificacion');
    if (notif) {
        notif.textContent = mensaje;
        notif.className = 'notificacion warning show';
        notif.style.cursor = 'pointer';
        notif.onclick = () => {
            mostrarDetalleProblemasWIND(problemas);
        };
        
        // No auto-ocultar, dejar que el usuario la cierre
        setTimeout(() => {
            if (notif.classList.contains('show')) {
                notif.textContent += ' (Click para ver detalles)';
            }
        }, 3000);
    }
}

function mostrarDetalleProblemasWIND(problemas) {
    let html = '<div style="max-height: 400px; overflow-y: auto; padding: 10px;">';
    html += '<h3>⚠️ Problemas detectados en Diario WIND</h3>';
    html += '<p>Se encontraron las siguientes inconsistencias:</p>';
    html += '<ul style="text-align: left; margin: 10px 0;">';
    
    problemas.slice(0, 10).forEach(p => {
        html += `<li style="margin: 5px 0; font-size: 0.9em;">${p.mensaje}</li>`;
    });
    
    if (problemas.length > 10) {
        html += `<li style="margin: 5px 0; color: #888;">... y ${problemas.length - 10} más</li>`;
    }
    
    html += '</ul>';
    html += '<p style="margin-top: 15px;">Recomendación: Pulsa el botón "⟳ Actualizar" para forzar un recálculo completo.</p>';
    html += '</div>';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            ${html}
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="this.closest('.modal').remove(); document.getElementById('btnActualizarTodo').click();">⟳ Recalcular Todo</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}
