/**
 * Utilidades para manejo de fechas
 * @module utils/fechas
 */

/**
 * Parsea un valor de fecha en varios formatos posibles
 * @param {string|number|Date} valor - Valor a parsear
 * @returns {Date|null} - Fecha parseada o null si no es válida
 */
function parsearFechaValor(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
    
    if (typeof valor === 'number') {
        // Número de serie de Excel (días desde 1900-01-01)
        if (valor > 40000 && valor < 60000) {
            const fecha = new Date((valor - 25569) * 86400000);
            return isNaN(fecha.getTime()) ? null : fecha;
        }
        return null;
    }
    
    if (typeof valor === 'string') {
        const str = valor.trim();
        if (!str || str.toUpperCase() === 'FECHA') return null;
        
        // Formato DD/MM/YYYY
        const partes = str.split('/');
        if (partes.length === 3) {
            const dia = parseInt(partes[0], 10);
            const mes = parseInt(partes[1], 10) - 1;
            const anio = parseInt(partes[2], 10);
            if (!isNaN(dia) && !isNaN(mes) && !isNaN(anio)) {
                const fecha = new Date(anio, mes, dia);
                return isNaN(fecha.getTime()) ? null : fecha;
            }
        }
        
        // Formato ISO YYYY-MM-DD
        if (str.includes('-')) {
            const fecha = new Date(str);
            return isNaN(fecha.getTime()) ? null : fecha;
        }
    }
    
    return null;
}

/**
 * Normaliza una fecha a formato key YYYY-MM-DD
 * @param {string|number|Date} valor - Valor a normalizar
 * @returns {string|null} - Key normalizada o null
 */
function normalizarFechaKey(valor) {
    const fecha = parsearFechaValor(valor);
    if (!fecha) return null;
    return fecha.toISOString().split('T')[0];
}

/**
 * Formatea una fecha para mostrar en UI
 * @param {string|number|Date} valor - Valor a formatear
 * @returns {string} - Fecha formateada DD/MM/YYYY o string vacío
 */
function formatearFechaUI(valor) {
    const fecha = parsearFechaValor(valor);
    if (!fecha) return '';
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
}

/**
 * Obtiene el nombre del día de la semana
 * @param {Date} fecha - Fecha
 * @returns {string} - Nombre del día
 */
function obtenerNombreDia(fecha) {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[fecha.getDay()];
}

/**
 * Verifica si una fecha es fin de semana
 * @param {Date} fecha - Fecha a verificar
 * @returns {boolean}
 */
function esFinDeSemana(fecha) {
    if (!fecha) return false;
    const dia = fecha.getDay();
    return dia === 0 || dia === 6;
}

// Exportar para uso global (compatibilidad con script tradicional)
if (typeof window !== 'undefined') {
    window.FechasUtils = {
        parsearFechaValor,
        normalizarFechaKey,
        formatearFechaUI,
        obtenerNombreDia,
        esFinDeSemana
    };
}
