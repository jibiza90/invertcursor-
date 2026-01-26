/**
 * Funciones de cálculo de saldos y beneficios
 * @module core/calculadora
 */

/**
 * Calcula el saldo diario basándose en el saldo anterior y movimientos
 * @param {number} saldoAnterior - Saldo del día anterior
 * @param {number} incremento - Incremento del día (depósito)
 * @param {number} decremento - Decremento del día (retiro)
 * @param {number} beneficio - Beneficio calculado del día
 * @returns {number} - Saldo resultante
 */
function calcularSaldoDiario(saldoAnterior, incremento, decremento, beneficio) {
    const sa = typeof saldoAnterior === 'number' ? saldoAnterior : 0;
    const inc = typeof incremento === 'number' ? incremento : 0;
    const dec = typeof decremento === 'number' ? decremento : 0;
    const ben = typeof beneficio === 'number' ? beneficio : 0;
    return sa + inc - dec + ben;
}

/**
 * Calcula el beneficio en euros basándose en imp_inicial e imp_final
 * @param {number} impInicial - Importe inicial del día
 * @param {number} impFinal - Importe final del día
 * @param {number} incremento - Incremento del día
 * @param {number} decremento - Decremento del día
 * @returns {number} - Beneficio en euros
 */
function calcularBeneficioEuro(impInicial, impFinal, incremento, decremento) {
    const ini = typeof impInicial === 'number' ? impInicial : 0;
    const fin = typeof impFinal === 'number' ? impFinal : 0;
    const inc = typeof incremento === 'number' ? incremento : 0;
    const dec = typeof decremento === 'number' ? decremento : 0;
    
    // Si no hay imp_final, no hay beneficio calculable
    if (fin === 0 && ini === 0) return 0;
    
    // Beneficio = imp_final - imp_inicial - incrementos + decrementos
    return fin - ini - inc + dec;
}

/**
 * Calcula el beneficio en porcentaje
 * @param {number} beneficioEuro - Beneficio en euros
 * @param {number} impInicial - Importe inicial (base para el porcentaje)
 * @returns {number} - Beneficio como decimal (0.05 = 5%)
 */
function calcularBeneficioPorcentaje(beneficioEuro, impInicial) {
    const ben = typeof beneficioEuro === 'number' ? beneficioEuro : 0;
    const ini = typeof impInicial === 'number' ? impInicial : 0;
    
    if (ini === 0 || !isFinite(ini)) return 0;
    return ben / ini;
}

/**
 * Calcula el beneficio de un cliente basándose en la rentabilidad general
 * @param {number} saldoAnterior - Saldo del cliente del día anterior
 * @param {number} rentabilidadGeneral - Rentabilidad general del día (decimal)
 * @returns {number} - Beneficio del cliente en euros
 */
function calcularBeneficioCliente(saldoAnterior, rentabilidadGeneral) {
    const sa = typeof saldoAnterior === 'number' ? saldoAnterior : 0;
    const rent = typeof rentabilidadGeneral === 'number' ? rentabilidadGeneral : 0;
    
    if (sa <= 0) return 0;
    return sa * rent;
}

/**
 * Calcula el FA (Factor de Ajuste) diario
 * @param {number} incremento - Incremento del día
 * @param {number} decremento - Decremento del día
 * @returns {number} - FA = incremento - decremento
 */
function calcularFA(incremento, decremento) {
    const inc = typeof incremento === 'number' ? incremento : 0;
    const dec = typeof decremento === 'number' ? decremento : 0;
    return inc - dec;
}

/**
 * Redistribuye el imp_final entre clientes según sus saldos
 * @param {number} impFinalGeneral - Importe final general a distribuir
 * @param {Array<{saldo: number}>} clientes - Array de clientes con sus saldos
 * @returns {Array<number>} - Array de importes distribuidos por cliente
 */
function redistribuirImpFinal(impFinalGeneral, clientes) {
    if (!Array.isArray(clientes) || clientes.length === 0) return [];
    if (typeof impFinalGeneral !== 'number' || impFinalGeneral <= 0) {
        return clientes.map(() => 0);
    }
    
    const sumaSaldos = clientes.reduce((sum, c) => {
        const s = typeof c.saldo === 'number' ? Math.max(0, c.saldo) : 0;
        return sum + s;
    }, 0);
    
    if (sumaSaldos === 0) {
        // Distribuir equitativamente si no hay saldos
        const parte = impFinalGeneral / clientes.length;
        return clientes.map(() => parte);
    }
    
    return clientes.map(c => {
        const saldo = typeof c.saldo === 'number' ? Math.max(0, c.saldo) : 0;
        return (saldo / sumaSaldos) * impFinalGeneral;
    });
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Calculadora = {
        calcularSaldoDiario,
        calcularBeneficioEuro,
        calcularBeneficioPorcentaje,
        calcularBeneficioCliente,
        calcularFA,
        redistribuirImpFinal
    };
}
