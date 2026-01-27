// Web Worker para cálculos pesados fuera del hilo principal
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    try {
        switch(type) {
            case 'recalcularSaldos':
                const result = recalcularSaldosWorker(data);
                self.postMessage({ type: 'recalcularSaldos', result });
                break;
                
            case 'calcularEstadisticas':
                const stats = calcularEstadisticasWorker(data);
                self.postMessage({ type: 'calcularEstadisticas', result: stats });
                break;
                
            case 'procesarDatosCliente':
                const clienteData = procesarDatosClienteWorker(data);
                self.postMessage({ type: 'procesarDatosCliente', result: clienteData });
                break;
                
            default:
                throw new Error(`Tipo de cálculo no soportado: ${type}`);
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
    }
};

function recalcularSaldosWorker({ hoja, ultimaFilaImpFinalManual }) {
    // Implementación optimizada de recálculo de saldos
    const resultados = [];
    
    // Procesamiento por lotes para no bloquear
    const batchSize = 100;
    for (let i = 0; i < hoja.datos_diarios_generales.length; i += batchSize) {
        const batch = hoja.datos_diarios_generales.slice(i, i + batchSize);
        const batchResults = processBatch(batch, ultimaFilaImpFinalManual);
        resultados.push(...batchResults);
        
        // Permitir que el worker respire entre lotes
        if (i % (batchSize * 10) === 0) {
            setTimeout(() => {}, 0);
        }
    }
    
    return resultados;
}

function calcularEstadisticasWorker({ datosCliente, meses }) {
    // Cálculos estadísticos optimizados
    const cache = new Map();
    const resultados = [];
    
    for (const mes of meses) {
        if (cache.has(mes)) {
            resultados.push(cache.get(mes));
            continue;
        }
        
        const stats = calculateMonthStats(datosCliente, mes);
        cache.set(mes, stats);
        resultados.push(stats);
    }
    
    return resultados;
}

function procesarDatosClienteWorker({ cliente, filtros }) {
    // Procesamiento de datos de cliente con filtros
    return cliente.datos_diarios
        .filter(d => aplicarFiltros(d, filtros))
        .map(d => procesarFila(d));
}

// Funciones auxiliares optimizadas
function processBatch(batch, limite) {
    return batch.map(fila => {
        if (fila.fila > limite) {
            return { ...fila, imp_inicial: null };
        }
        return calcularFilaOptimizada(fila);
    });
}

function calculateMonthStats(datos, mes) {
    const datosMes = datos.filter(d => d.mes === mes);
    const incrementos = datosMes.reduce((sum, d) => sum + (d.incremento || 0), 0);
    const decrementos = datosMes.reduce((sum, d) => sum + (d.decremento || 0), 0);
    
    return {
        mes,
        incrementos,
        decrementos,
        total: incrementos - decrementos
    };
}

function aplicarFiltros(dato, filtros) {
    return (!filtros.minFila || dato.fila >= filtros.minFila) &&
           (!filtros.maxFila || dato.fila <= filtros.maxFila) &&
           (!filtros.conMovimientos || dato.incremento || dato.decremento);
}

function procesarFila(fila) {
    return {
        ...fila,
        procesado: true,
        timestamp: Date.now()
    };
}

function calcularFilaOptimizada(fila) {
    // Cálculos optimizados con precomputación
    const fa = calcularFAOptimizado(fila.fila);
    return {
        ...fila,
        fa,
        calculado: true
    };
}

function calcularFAOptimizado(fila) {
    // Versión optimizada de cálculo de FA
    return Math.max(0, fila - 14);
}
