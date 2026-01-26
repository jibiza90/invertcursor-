/**
 * Utilidades para manejo y formateo de números
 * @module utils/numeros
 */

/**
 * Formatea un número como moneda EUR
 * @param {number} valor - Valor a formatear
 * @param {number} decimales - Decimales a mostrar (default 2)
 * @returns {string} - Valor formateado con símbolo €
 */
function formatearMoneda(valor, decimales = 2) {
    if (typeof valor !== 'number' || !isFinite(valor)) return '-';
    return valor.toLocaleString('es-ES', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    }) + '€';
}

/**
 * Formatea un número como porcentaje
 * @param {number} valor - Valor a formatear (0.1 = 10%)
 * @param {number} decimales - Decimales a mostrar
 * @returns {string} - Valor formateado con símbolo %
 */
function formatearPorcentaje(valor, decimales = 2) {
    if (typeof valor !== 'number' || !isFinite(valor)) return '-';
    return (valor * 100).toFixed(decimales) + '%';
}

/**
 * Formatea un número con separadores de miles
 * @param {number} valor - Valor a formatear
 * @param {number} decimales - Decimales a mostrar
 * @returns {string} - Valor formateado
 */
function formatearNumero(valor, decimales = 2) {
    if (typeof valor !== 'number' || !isFinite(valor)) return '-';
    return valor.toLocaleString('es-ES', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

/**
 * Parsea un string de moneda a número
 * @param {string} texto - Texto a parsear (ej: "1.234,56€")
 * @returns {number|null} - Número parseado o null
 */
function parsearMoneda(texto) {
    if (typeof texto !== 'string') return null;
    const limpio = texto.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(limpio);
    return isNaN(num) ? null : num;
}

/**
 * Redondea un número a N decimales
 * @param {number} valor - Valor a redondear
 * @param {number} decimales - Número de decimales
 * @returns {number}
 */
function redondear(valor, decimales = 2) {
    if (typeof valor !== 'number' || !isFinite(valor)) return 0;
    const factor = Math.pow(10, decimales);
    return Math.round(valor * factor) / factor;
}

/**
 * Compara dos números con tolerancia
 * @param {number} a - Primer número
 * @param {number} b - Segundo número
 * @param {number} tolerancia - Tolerancia para comparación
 * @returns {boolean} - true si son aproximadamente iguales
 */
function sonIguales(a, b, tolerancia = 0.0001) {
    if (typeof a !== 'number' || typeof b !== 'number') return false;
    return Math.abs(a - b) < tolerancia;
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.NumerosUtils = {
        formatearMoneda,
        formatearPorcentaje,
        formatearNumero,
        parsearMoneda,
        redondear,
        sonIguales
    };
}
