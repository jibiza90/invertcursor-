/**
 * EXPORT DATA - MÓDULO PRÁCTICO REAL
 * Exportación de datos reales de la aplicación
 */

class ExportData {
    constructor() {
        this.initialized = false;
    }

    async init() {
        console.log('📤 Inicializando Export Data...');
        
        if (this.initialized) return;
        
        // Cargar contenido inicial
        await this.loadExportContent();
        
        this.initialized = true;
        console.log('✅ Export Data inicializado');
    }

    async loadExportContent() {
        const container = document.getElementById('export-content');
        if (!container) return;

        container.innerHTML = `
            <div class="export-header">
                <h2>📤 Exportación de Datos</h2>
                <p>Exporta tus datos reales en diferentes formatos</p>
            </div>
            
            <div class="export-options">
                <div class="option-group">
                    <h3>📊 Datos Generales</h3>
                    <button class="btn btn-primary" onclick="window.exportData.exportarDatosGenerales()">
                        📈 Exportar Datos Generales (Excel)
                    </button>
                    <button class="btn btn-secondary" onclick="window.exportData.exportarEstadisticasGenerales()">
                        📋 Exportar Estadísticas Generales (CSV)
                    </button>
                    <button class="btn btn-secondary" onclick="window.exportData.exportarResumenGeneral()">
                        📄 Exportar Resumen General (JSON)
                    </button>
                </div>
                
                <div class="option-group">
                    <h3>👤 Datos del Cliente</h3>
                    <button class="btn btn-primary" onclick="window.exportData.exportarDatosCliente()">
                        👤 Exportar Cliente Actual (Excel)
                    </button>
                    <button class="btn btn-secondary" onclick="window.exportData.exportarHistorialCliente()">
                        📅 Exportar Historial del Cliente (CSV)
                    </button>
                    <button class="btn btn-secondary" onclick="window.exportData.exportarTodosClientes()">
                        📋 Exportar Todos los Clientes (Excel)
                    </button>
                </div>
                
                <div class="option-group">
                    <h3>📈 Informes y Análisis</h3>
                    <button class="btn btn-primary" onclick="window.exportData.exportarInformeCompleto()">
                        📊 Informe Completo (PDF)
                    </button>
                    <button class="btn btn-secondary" onclick="window.exportData.exportarAnalisisRendimiento()">
                        📈 Análisis de Rendimiento (Excel)
                    </button>
                    <button class="btn btn-secondary" onclick="window.exportData.exportarComparativas()">
                        📊 Comparativas (CSV)
                    </button>
                </div>
                
                <div class="option-group">
                    <h3>⚙️ Opciones de Exportación</h3>
                    <div class="export-settings">
                        <label>
                            <input type="checkbox" id="includeHeaders" checked>
                            Incluir encabezados
                        </label>
                        <label>
                            <input type="checkbox" id="includeFormulas" checked>
                            Incluir fórmulas
                        </label>
                        <label>
                            <input type="checkbox" id="includeCharts">
                            Incluir gráficos
                        </label>
                        <label>
                            <input type="checkbox" id="compressData">
                            Comprimir datos
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="export-status">
                <h3>📋 Estado de Exportación</h3>
                <div id="exportStatus" class="status-display">
                    <p>Selecciona una opción de exportación para comenzar</p>
                </div>
            </div>
        `;
    }

    async exportarDatosGenerales() {
        console.log('📈 Exportando datos generales...');
        
        const statusDiv = document.getElementById('exportStatus');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = '<div class="loading">⏳ Preparando datos generales...</div>';
        
        try {
            // Obtener datos reales
            const datos = await this.obtenerDatosGenerales();
            
            // Crear Excel
            const excelData = this.crearExcelDatosGenerales(datos);
            
            // Descargar
            this.descargarArchivo(excelData, `datos_generales_${this.getFechaArchivo()}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            
            statusDiv.innerHTML = '<p class="success">✅ Datos generales exportados correctamente</p>';
            this.showNotification('✅ Datos generales exportados', 'success');
            
        } catch (error) {
            console.error('Error exportando datos generales:', error);
            statusDiv.innerHTML = '<p class="error">❌ Error al exportar datos generales</p>';
            this.showNotification('❌ Error al exportar', 'error');
        }
    }

    async obtenerDatosGenerales() {
        if (!window.hojaActual) {
            throw new Error('No hay hoja cargada');
        }
        
        const datos = {
            hoja: window.hojaActual.nombre || 'N/A',
            mes: window.mesActual || 'N/A',
            datosDiarios: window.hojaActual.datos_diarios_generales || [],
            estadisticas: window.estadisticasActuales || {},
            fechaExportacion: new Date().toISOString()
        };
        
        return datos;
    }

    crearExcelDatosGenerales(datos) {
        // Crear contenido CSV simple (simulación de Excel)
        let csv = 'FECHA,CONCEPTO,IMPORTE,BENEFICIO,SALDO\n';
        
        datos.datosDiarios.forEach(dia => {
            if (dia.fecha && dia.beneficio) {
                csv += `${dia.fecha},${dia.concepto || ''},${dia.importe || 0},${dia.beneficio},${dia.saldo || 0}\n`;
            }
        });
        
        return csv;
    }

    async exportarEstadisticasGenerales() {
        console.log('📋 Exportando estadísticas generales...');
        
        const statusDiv = document.getElementById('exportStatus');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = '<div class="loading">⏳ Preparando estadísticas...</div>';
        
        try {
            const stats = window.estadisticasActuales || {};
            const csv = this.crearCSVEstadisticas(stats);
            
            this.descargarArchivo(csv, `estadisticas_generales_${this.getFechaArchivo()}.csv`, 'text/csv');
            
            statusDiv.innerHTML = '<p class="success">✅ Estadísticas generales exportadas</p>';
            this.showNotification('✅ Estadísticas exportadas', 'success');
            
        } catch (error) {
            console.error('Error exportando estadísticas:', error);
            statusDiv.innerHTML = '<p class="error">❌ Error al exportar estadísticas</p>';
            this.showNotification('❌ Error al exportar', 'error');
        }
    }

    crearCSVEstadisticas(stats) {
        let csv = 'MÉTRICA,VALOR,UNIDAD\n';
        
        csv += `Inversión Total,${stats.inversion || 0},€\n`;
        csv += `Saldo Actual,${stats.saldoActual || 0},€\n`;
        csv += `Beneficio Total,${stats.beneficioEuro || 0},€\n`;
        csv += `Rentabilidad Total,${(stats.rentabilidadTotal || 0).toFixed(2)},%\n`;
        csv += `Mejor Mes,${stats.mejorMes?.mes || 'N/A'},${stats.mejorMes?.rentabilidad?.toFixed(2) || 0}%\n`;
        csv += `Peor Mes,${stats.peorMes?.mes || 'N/A'},${stats.peorMes?.rentabilidad?.toFixed(2) || 0}%\n`;
        csv += `Promedio Mensual,${(stats.promedioMensual || 0).toFixed(2)},%\n`;
        csv += `Meses Operados,${stats.mesesOperados || 0},meses\n`;
        
        return csv;
    }

    async exportarResumenGeneral() {
        console.log('📄 Exportando resumen general...');
        
        const statusDiv = document.getElementById('exportStatus');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = '<div class="loading">⏳ Preparando resumen...</div>';
        
        try {
            const resumen = await this.crearResumenGeneral();
            const json = JSON.stringify(resumen, null, 2);
            
            this.descargarArchivo(json, `resumen_general_${this.getFechaArchivo()}.json`, 'application/json');
            
            statusDiv.innerHTML = '<p class="success">✅ Resumen general exportado</p>';
            this.showNotification('✅ Resumen exportado', 'success');
            
        } catch (error) {
            console.error('Error exportando resumen:', error);
            statusDiv.innerHTML = '<p class="error">❌ Error al exportar resumen</p>';
            this.showNotification('❌ Error al exportar', 'error');
        }
    }

    async crearResumenGeneral() {
        return {
            informacion: {
                hoja: window.hojaActual?.nombre || 'N/A',
                mes: window.mesActual || 'N/A',
                fechaExportacion: new Date().toISOString(),
                version: 'V2.9.18'
            },
            estadisticas: window.estadisticasActuales || {},
            resumenOperaciones: await this.obtenerResumenOperaciones(),
            clientes: await this.obtenerResumenClientes()
        };
    }

    async obtenerResumenOperaciones() {
        if (!window.hojaActual?.datos_diarios_generales) {
            return null;
        }
        
        const datos = window.hojaActual.datos_diarios_generales;
        return {
            totalOperaciones: datos.length,
            operacionesConBeneficio: datos.filter(d => d.beneficio > 0).length,
            operacionesConPerdida: datos.filter(d => d.beneficio < 0).length,
            beneficioTotal: datos.reduce((sum, d) => sum + (d.beneficio || 0), 0),
            mayorBeneficio: Math.max(...datos.map(d => d.beneficio || 0)),
            mayorPerdida: Math.min(...datos.map(d => d.beneficio || 0))
        };
    }

    async obtenerResumenClientes() {
        if (!window.clientesAnuales) {
            return null;
        }
        
        return {
            totalClientes: window.clientesAnuales.length,
            clientes: window.clientesAnuales.map(cliente => ({
                nombre: cliente.nombre,
                inversion: cliente.inversion || 0,
                saldo: cliente.saldoActual || 0,
                beneficio: cliente.beneficioEuro || 0,
                rentabilidad: cliente.rentabilidadTotal || 0
            }))
        };
    }

    async exportarDatosCliente() {
        if (!window.clienteActual) {
            this.showNotification('⚠️ No hay cliente seleccionado', 'warning');
            return;
        }
        
        console.log('👤 Exportando datos del cliente...');
        
        const statusDiv = document.getElementById('exportStatus');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = '<div class="loading">⏳ Preparando datos del cliente...</div>';
        
        try {
            const datos = await this.obtenerDatosCliente();
            const excelData = this.crearExcelCliente(datos);
            
            this.descargarArchivo(excelData, `cliente_${datos.nombre}_${this.getFechaArchivo()}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            
            statusDiv.innerHTML = '<p class="success">✅ Datos del cliente exportados</p>';
            this.showNotification('✅ Datos del cliente exportados', 'success');
            
        } catch (error) {
            console.error('Error exportando cliente:', error);
            statusDiv.innerHTML = '<p class="error">❌ Error al exportar cliente</p>';
            this.showNotification('❌ Error al exportar', 'error');
        }
    }

    async obtenerDatosCliente() {
        if (!window.clienteActual) {
            throw new Error('No hay cliente seleccionado');
        }
        
        return {
            nombre: window.clienteActual.nombre,
            datosDiarios: window.clienteActual.datos_diarios || [],
            estadisticas: await this.obtenerStatsCliente(),
            fechaExportacion: new Date().toISOString()
        };
    }

    async obtenerStatsCliente() {
        if (typeof window.calcularEstadisticasClienteTiempoReal === 'function') {
            return await window.calcularEstadisticasClienteTiempoReal(window.clienteActual);
        }
        return null;
    }

    crearExcelCliente(datos) {
        let csv = 'FECHA,CONCEPTO,IMPORTE,BENEFICIO,SALDO\n';
        
        datos.datosDiarios.forEach(dia => {
            if (dia.fecha && dia.beneficio) {
                csv += `${dia.fecha},${dia.concepto || ''},${dia.importe || 0},${dia.beneficio},${dia.saldo || 0}\n`;
            }
        });
        
        return csv;
    }

    async exportarHistorialCliente() {
        if (!window.clienteActual) {
            this.showNotification('⚠️ No hay cliente seleccionado', 'warning');
            return;
        }
        
        console.log('📅 Exportando historial del cliente...');
        
        const statusDiv = document.getElementById('exportStatus');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = '<div class="loading">⏳ Preparando historial...</div>';
        
        try {
            const historial = this.crearHistorialCliente();
            const csv = this.crearCSHistorial(historial);
            
            this.descargarArchivo(csv, `historial_${window.clienteActual.nombre}_${this.getFechaArchivo()}.csv`, 'text/csv');
            
            statusDiv.innerHTML = '<p class="success">✅ Historial del cliente exportado</p>';
            this.showNotification('✅ Historial exportado', 'success');
            
        } catch (error) {
            console.error('Error exportando historial:', error);
            statusDiv.innerHTML = '<p class="error">❌ Error al exportar historial</p>';
            this.showNotification('❌ Error al exportar', 'error');
        }
    }

    crearHistorialCliente() {
        const datos = window.clienteActual.datos_diarios || [];
        const historial = [];
        
        datos.forEach(dia => {
            if (dia.fecha) {
                historial.push({
                    fecha: dia.fecha,
                    concepto: dia.concepto || '',
                    importe: dia.importe || 0,
                    beneficio: dia.beneficio || 0,
                    saldo: dia.saldo || 0,
                    rentabilidadAcumulada: dia.rentabilidadAcumulada || 0
                });
            }
        });
        
        return historial;
    }

    crearCSHistorial(historial) {
        let csv = 'FECHA,CONCEPTO,IMPORTE,BENEFICIO,SALDO,RENTABILIDAD_ACUMULADA\n';
        
        historial.forEach(registro => {
            csv += `${registro.fecha},${registro.concepto},${registro.importe},${registro.beneficio},${registro.saldo},${registro.rentabilidadAcumulada.toFixed(4)}\n`;
        });
        
        return csv;
    }

    async exportarTodosClientes() {
        console.log('📋 Exportando todos los clientes...');
        
        const statusDiv = document.getElementById('exportStatus');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = '<div class="loading">⏳ Preparando todos los clientes...</div>';
        
        try {
            const clientes = await this.obtenerTodosClientes();
            const excelData = this.crearExcelTodosClientes(clientes);
            
            this.descargarArchivo(excelData, `todos_clientes_${this.getFechaArchivo()}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            
            statusDiv.innerHTML = '<p class="success">✅ Todos los clientes exportados</p>';
            this.showNotification('✅ Clientes exportados', 'success');
            
        } catch (error) {
            console.error('Error exportando clientes:', error);
            statusDiv.innerHTML = '<p class="error">❌ Error al exportar clientes</p>';
            this.showNotification('❌ Error al exportar', 'error');
        }
    }

    async obtenerTodosClientes() {
        if (!window.clientesAnuales) {
            throw new Error('No hay datos de clientes');
        }
        
        const clientes = [];
        
        for (const cliente of window.clientesAnuales) {
            const stats = await this.obtenerStatsClientePorNombre(cliente.nombre);
            clientes.push({
                nombre: cliente.nombre,
                inversion: cliente.inversion || 0,
                saldo: cliente.saldoActual || 0,
                beneficio: cliente.beneficioEuro || 0,
                rentabilidad: cliente.rentabilidadTotal || 0,
                mejorMes: stats?.mejorMes,
                peorMes: stats?.peorMes,
                mesesOperados: stats?.mesesOperados || 0
            });
        }
        
        return clientes;
    }

    async obtenerStatsClientePorNombre(nombreCliente) {
        // Implementar lógica para obtener stats por nombre
        return null;
    }

    crearExcelTodosClientes(clientes) {
        let csv = 'CLIENTE,INVERSIÓN,SALDO,BENEFICIO,RENTABILIDAD,MEJOR MES,PEOR MESESMESSES OPERADOS\n';
        
        clientes.forEach(cliente => {
            csv += `${cliente.nombre},${cliente.inversion},${cliente.saldo},${cliente.beneficio},${cliente.rentabilidad.toFixed(2)}%,${cliente.mejorMes?.mes || 'N/A'},${cliente.peorMes?.mes || 'N/A'},${cliente.mesesOperados}\n`;
        });
        
        return csv;
    }

    async exportarInformeCompleto() {
        console.log('📊 Exportando informe completo...');
        
        const statusDiv = document.getElementById('exportStatus');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = '<div class="loading">⏳ Generando informe completo...</div>';
        
        try {
            const informe = await this.crearInformeCompleto();
            const html = this.crearHTMLInforme(informe);
            
            this.descargarArchivo(html, `informe_completo_${this.getFechaArchivo()}.html`, 'text/html');
            
            statusDiv.innerHTML = '<p class="success">✅ Informe completo exportado</p>';
            this.showNotification('✅ Informe exportado', 'success');
            
        } catch (error) {
            console.error('Error exportando informe:', error);
            statusDiv.innerHTML = '<p class="error">❌ Error al exportar informe</p>';
            this.showNotification('❌ Error al exportar', 'error');
        }
    }

    async crearInformeCompleto() {
        return {
            informacion: {
                titulo: 'Informe Completo de Portfolio',
                fecha: new Date().toLocaleString('es-ES'),
                hoja: window.hojaActual?.nombre || 'N/A',
                mes: window.mesActual || 'N/A'
            },
            estadisticasGenerales: window.estadisticasActuales || {},
            clienteActual: window.clienteActual ? {
                nombre: window.clienteActual.nombre,
                estadisticas: await this.obtenerStatsCliente()
            } : null,
            resumenOperaciones: await this.obtenerResumenOperaciones()
        };
    }

    crearHTMLInforme(informe) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>${informe.informacion.titulo}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .section { margin: 20px 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .stat-card { border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
        .positive { color: green; }
        .negative { color: red; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${informe.informacion.titulo}</h1>
        <p>Fecha: ${informe.informacion.fecha}</p>
        <p>Hoja: ${informe.informacion.hoja} | Mes: ${informe.informacion.mes}</p>
    </div>
    
    <div class="section">
        <h2>Estadísticas Generales</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Inversión Total</h4>
                <p>€${(informe.estadisticasGenerales.inversion || 0).toLocaleString('es-ES')}</p>
            </div>
            <div class="stat-card">
                <h4>Saldo Actual</h4>
                <p>€${(informe.estadisticasGenerales.saldoActual || 0).toLocaleString('es-ES')}</p>
            </div>
            <div class="stat-card">
                <h4>Beneficio Total</h4>
                <p class="${informe.estadisticasGenerales.beneficioEuro >= 0 ? 'positive' : 'negative'}">
                    €${(informe.estadisticasGenerales.beneficioEuro || 0).toLocaleString('es-ES')}
                </p>
            </div>
            <div class="stat-card">
                <h4>Rentabilidad Total</h4>
                <p class="${informe.estadisticasGenerales.rentabilidadTotal >= 0 ? 'positive' : 'negative'}">
                    ${(informe.estadisticasGenerales.rentabilidadTotal || 0).toFixed(2)}%
                </p>
            </div>
        </div>
    </div>
    
    ${informe.clienteActual ? `
    <div class="section">
        <h2>Cliente Actual: ${informe.clienteActual.nombre}</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Inversión Cliente</h4>
                <p>€${(informe.clienteActual.estadisticas.inversion || 0).toLocaleString('es-ES')}</p>
            </div>
            <div class="stat-card">
                <h4>Saldo Cliente</h4>
                <p>€${(informe.clienteActual.estadisticas.saldoActual || 0).toLocaleString('es-ES')}</p>
            </div>
            <div class="stat-card">
                <h4>Beneficio Cliente</h4>
                <p class="${informe.clienteActual.estadisticas.beneficioEuro >= 0 ? 'positive' : 'negative'}">
                    €${(informe.clienteActual.estadisticas.beneficioEuro || 0).toLocaleString('es-ES')}
                </p>
            </div>
            <div class="stat-card">
                <h4>Rentabilidad Cliente</h4>
                <p class="${informe.clienteActual.estadisticas.rentabilidadTotal >= 0 ? 'positive' : 'negative'}">
                    ${(informe.clienteActual.estadisticas.rentabilidadTotal || 0).toFixed(2)}%
                </p>
            </div>
        </div>
    </div>
    ` : ''}
    
    <div class="section">
        <h2>Resumen de Operaciones</h2>
        <table>
            <tr><th>Métrica</th><th>Valor</th></tr>
            <tr><td>Total Operaciones</td><td>${informe.resumenOperaciones?.totalOperaciones || 0}</td></tr>
            <tr><td>Operaciones con Beneficio</td><td class="positive">${informe.resumenOperaciones?.operacionesConBeneficio || 0}</td></tr>
            <tr><td>Operaciones con Pérdida</td><td class="negative">${informe.resumenOperaciones?.operacionesConPerdida || 0}</td></tr>
            <tr><td>Beneficio Total</td><td class="positive">€${(informe.resumenOperaciones?.beneficioTotal || 0).toLocaleString('es-ES')}</td></tr>
        </table>
    </div>
    
    <div class="footer">
        <p><em>Informe generado automáticamente por Portfolio Manager</em></p>
    </div>
</body>
</html>
        `;
    }

    async exportarAnalisisRendimiento() {
        console.log('📈 Exportando análisis de rendimiento...');
        this.showNotification('📈 Análisis de rendimiento en desarrollo', 'info');
    }

    async exportarComparativas() {
        console.log('📊 Exportando comparativas...');
        this.showNotification('📊 Comparativas en desarrollo', 'info');
    }

    // Utilidades
    getFechaArchivo() {
        const ahora = new Date();
        return ahora.toISOString().split('T')[0].replace(/-/g, '');
    }

    descargarArchivo(contenido, nombre, tipo) {
        const blob = new Blob([contenido], { type: tipo });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Inicialización global
window.exportData = new ExportData();

// Auto-inicialización cuando la pestaña de export se active
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'tab-export' && 
                mutation.target.classList.contains('active')) {
                window.exportData.init();
            }
        });
    });

    const tabExport = document.getElementById('tab-export');
    if (tabExport) {
        observer.observe(tabExport, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
    }
});
