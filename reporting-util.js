/**
 * REPORTING UTIL - MÓDULO PRÁCTICO REAL
 * Funcionalidades basadas en datos reales de la aplicación
 */

class ReportingUtil {
    constructor() {
        this.initialized = false;
    }

    async init() {
        console.log('📋 Inicializando Reporting Util...');
        
        if (this.initialized) return;
        
        // Cargar contenido inicial
        await this.loadReportingContent();
        
        this.initialized = true;
        console.log('✅ Reporting Util inicializado');
    }

    async loadReportingContent() {
        const container = document.getElementById('reporting-content');
        if (!container) return;

        container.innerHTML = `
            <div class="reporting-header">
                <h2>📋 Informes y Reportes</h2>
                <p>Generación de informes basados en datos reales</p>
            </div>
            
            <div class="reporting-actions">
                <div class="action-group">
                    <h3>📊 Informes Rápidos</h3>
                    <button class="btn btn-primary" onclick="window.reportingUtil.generarResumenMensual()">
                        📈 Resumen Mensual Actual
                    </button>
                    <button class="btn btn-primary" onclick="window.reportingUtil.generarInformeCliente()">
                        👤 Informe del Cliente Actual
                    </button>
                    <button class="btn btn-primary" onclick="window.reportingUtil.generarComparativa()">
                        📊 Comparativa General vs Cliente
                    </button>
                </div>
                
                <div class="action-group">
                    <h3>📅 Informes por Periodo</h3>
                    <select id="periodoInforme">
                        <option value="mes">Mes Actual</option>
                        <option value="trimestre">Último Trimestre</option>
                        <option value="semestre">Último Semestre</option>
                        <option value="año">Año Completo</option>
                    </select>
                    <button class="btn btn-secondary" onclick="window.reportingUtil.generarInformePeriodo()">
                        📅 Generar Informe
                    </button>
                </div>
            </div>
            
            <div class="reporting-output">
                <h3>📄 Vista Previa del Informe</h3>
                <div id="informePreview" class="informe-preview">
                    <p>Selecciona un tipo de informe para generar vista previa</p>
                </div>
                
                <div class="export-buttons" id="exportButtons" style="display: none;">
                    <button class="btn btn-success" onclick="window.reportingUtil.exportarExcel()">
                        📊 Exportar Excel
                    </button>
                    <button class="btn btn-info" onclick="window.reportingUtil.exportarCSV()">
                        📋 Exportar CSV
                    </button>
                    <button class="btn btn-warning" onclick="window.reportingUtil.imprimirInforme()">
                        🖨️ Imprimir
                    </button>
                </div>
            </div>
        `;
    }

    async generarResumenMensual() {
        console.log('📈 Generando resumen mensual...');
        
        const preview = document.getElementById('informePreview');
        const exportButtons = document.getElementById('exportButtons');
        
        if (!preview) return;
        
        // Mostrar carga
        preview.innerHTML = '<div class="loading">⏳ Generando informe...</div>';
        
        try {
            // Obtener datos reales
            const datos = await this.obtenerDatosResumenMensual();
            
            // Generar informe
            const informe = this.crearInformeResumen(datos);
            
            preview.innerHTML = informe;
            exportButtons.style.display = 'flex';
            
            this.showNotification('✅ Resumen mensual generado', 'success');
            
        } catch (error) {
            console.error('Error generando resumen:', error);
            preview.innerHTML = '<p class="error">❌ Error al generar el informe</p>';
        }
    }

    async obtenerDatosResumenMensual() {
        // Usar datos reales de la aplicación
        if (!window.hojaActual || !window.mesActual) {
            throw new Error('No hay datos cargados');
        }
        
        const datos = {
            hoja: window.hojaActual.nombre || 'N/A',
            mes: window.mesActual || 'N/A',
            clienteActual: window.clienteActual?.nombre || 'N/A',
            
            // Estadísticas generales
            statsGenerales: window.estadisticasActuales || {},
            
            // Datos del cliente actual
            statsCliente: await this.obtenerStatsCliente(),
            
            // Resumen de operaciones
            resumenOperaciones: await this.obtenerResumenOperaciones(),
            
            // Fecha de generación
            fechaGeneracion: new Date().toLocaleString('es-ES')
        };
        
        return datos;
    }

    async obtenerStatsCliente() {
        if (!window.clienteActual) return null;
        
        // Usar funciones existentes de la aplicación
        if (typeof window.calcularEstadisticasClienteTiempoReal === 'function') {
            return await window.calcularEstadisticasClienteTiempoReal(window.clienteActual);
        }
        
        return null;
    }

    async obtenerResumenOperaciones() {
        if (!window.hojaActual || !window.hojaActual.datos_diarios_generales) {
            return null;
        }
        
        const datos = window.hojaActual.datos_diarios_generales;
        const resumen = {
            totalOperaciones: datos.length,
            operacionesConBeneficio: 0,
            operacionesConPerdida: 0,
            beneficioTotal: 0,
            perdidaTotal: 0,
            mayorBeneficio: 0,
            mayorPerdida: 0
        };
        
        datos.forEach(op => {
            if (op.beneficio && op.beneficio > 0) {
                resumen.operacionesConBeneficio++;
                resumen.beneficioTotal += op.beneficio;
                if (op.beneficio > resumen.mayorBeneficio) {
                    resumen.mayorBeneficio = op.beneficio;
                }
            } else if (op.beneficio && op.beneficio < 0) {
                resumen.operacionesConPerdida++;
                resumen.perdidaTotal += Math.abs(op.beneficio);
                if (Math.abs(op.beneficio) > resumen.mayorPerdida) {
                    resumen.mayorPerdida = Math.abs(op.beneficio);
                }
            }
        });
        
        return resumen;
    }

    crearInformeResumen(datos) {
        const statsGen = datos.statsGenerales;
        const statsCli = datos.statsCliente;
        const operaciones = datos.resumenOperaciones;
        
        return `
            <div class="informe-content">
                <div class="informe-header">
                    <h2>📊 Resumen Mensual de Inversiones</h2>
                    <div class="informe-meta">
                        <p><strong>Hoja:</strong> ${datos.hoja}</p>
                        <p><strong>Mes:</strong> ${datos.mes}</p>
                        <p><strong>Generado:</strong> ${datos.fechaGeneracion}</p>
                    </div>
                </div>
                
                <div class="informe-section">
                    <h3>📈 Estadísticas Generales</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h4>Inversión Total</h4>
                            <p class="stat-value">${this.formatearMoneda(statsGen.inversion || 0)}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Saldo Actual</h4>
                            <p class="stat-value">${this.formatearMoneda(statsGen.saldoActual || 0)}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Beneficio Total</h4>
                            <p class="stat-value ${statsGen.beneficioEuro >= 0 ? 'positive' : 'negative'}">
                                ${statsGen.beneficioEuro >= 0 ? '+' : ''}${this.formatearMoneda(statsGen.beneficioEuro || 0)}
                            </p>
                        </div>
                        <div class="stat-card">
                            <h4>Rentabilidad</h4>
                            <p class="stat-value ${statsGen.rentabilidadTotal >= 0 ? 'positive' : 'negative'}">
                                ${statsGen.rentabilidadTotal >= 0 ? '+' : ''}${(statsGen.rentabilidadTotal || 0).toFixed(2)}%
                            </p>
                        </div>
                    </div>
                </div>
                
                ${statsCli ? `
                <div class="informe-section">
                    <h3>👤 Cliente Actual: ${datos.clienteActual}</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h4>Inversión Cliente</h4>
                            <p class="stat-value">${this.formatearMoneda(statsCli.inversion || 0)}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Saldo Cliente</h4>
                            <p class="stat-value">${this.formatearMoneda(statsCli.saldoActual || 0)}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Beneficio Cliente</h4>
                            <p class="stat-value ${statsCli.beneficioEuro >= 0 ? 'positive' : 'negative'}">
                                ${statsCli.beneficioEuro >= 0 ? '+' : ''}${this.formatearMoneda(statsCli.beneficioEuro || 0)}
                            </p>
                        </div>
                        <div class="stat-card">
                            <h4>Rentabilidad Cliente</h4>
                            <p class="stat-value ${statsCli.rentabilidadTotal >= 0 ? 'positive' : 'negative'}">
                                ${statsCli.rentabilidadTotal >= 0 ? '+' : ''}${(statsCli.rentabilidadTotal || 0).toFixed(2)}%
                            </p>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${operaciones ? `
                <div class="informe-section">
                    <h3>📊 Resumen de Operaciones</h3>
                    <div class="operations-table">
                        <table>
                            <tr>
                                <th>Métrica</th>
                                <th>Valor</th>
                            </tr>
                            <tr>
                                <td>Total Operaciones</td>
                                <td>${operaciones.totalOperaciones}</td>
                            </tr>
                            <tr>
                                <td>Operaciones con Beneficio</td>
                                <td class="positive">${operaciones.operacionesConBeneficio}</td>
                            </tr>
                            <tr>
                                <td>Operaciones con Pérdida</td>
                                <td class="negative">${operaciones.operacionesConPerdida}</td>
                            </tr>
                            <tr>
                                <td>Beneficio Total</td>
                                <td class="positive">+${this.formatearMoneda(operaciones.beneficioTotal)}</td>
                            </tr>
                            <tr>
                                <td>Pérdida Total</td>
                                <td class="negative">-${this.formatearMoneda(operaciones.perdidaTotal)}</td>
                            </tr>
                            <tr>
                                <td>Mayor Beneficio</td>
                                <td class="positive">+${this.formatearMoneda(operaciones.mayorBeneficio)}</td>
                            </tr>
                            <tr>
                                <td>Mayor Pérdida</td>
                                <td class="negative">-${this.formatearMoneda(operaciones.mayorPerdida)}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                ` : ''}
                
                <div class="informe-footer">
                    <p><em>Informe generado automáticamente por Portfolio Manager</em></p>
                </div>
            </div>
        `;
    }

    async generarInformeCliente() {
        if (!window.clienteActual) {
            this.showNotification('⚠️ No hay cliente seleccionado', 'warning');
            return;
        }
        
        console.log('👤 Generando informe del cliente...');
        
        const preview = document.getElementById('informePreview');
        const exportButtons = document.getElementById('exportButtons');
        
        if (!preview) return;
        
        preview.innerHTML = '<div class="loading">⏳ Generando informe del cliente...</div>';
        
        try {
            const datos = await this.obtenerDatosCliente();
            const informe = this.crearInformeCliente(datos);
            
            preview.innerHTML = informe;
            exportButtons.style.display = 'flex';
            
            this.showNotification('✅ Informe del cliente generado', 'success');
            
        } catch (error) {
            console.error('Error generando informe cliente:', error);
            preview.innerHTML = '<p class="error">❌ Error al generar el informe</p>';
        }
    }

    async obtenerDatosCliente() {
        if (!window.clienteActual) {
            throw new Error('No hay cliente seleccionado');
        }
        
        const statsCliente = await this.obtenerStatsCliente();
        const datosDiarios = window.clienteActual.datos_diarios || [];
        
        // Análisis de rendimiento mensual
        const rendimientoMensual = this.analizarRendimientoMensual(datosDiarios);
        
        return {
            nombre: window.clienteActual.nombre,
            stats: statsCliente,
            rendimientoMensual,
            fechaGeneracion: new Date().toLocaleString('es-ES')
        };
    }

    analizarRendimientoMensual(datosDiarios) {
        const meses = {};
        
        datosDiarios.forEach(dia => {
            if (!dia.fecha || !dia.beneficio) return;
            
            const mes = dia.fecha.substring(0, 7); // YYYY-MM
            
            if (!meses[mes]) {
                meses[mes] = {
                    beneficio: 0,
                    operaciones: 0,
                    positivas: 0,
                    negativas: 0
                };
            }
            
            meses[mes].beneficio += dia.beneficio;
            meses[mes].operaciones++;
            
            if (dia.beneficio > 0) {
                meses[mes].positivas++;
            } else if (dia.beneficio < 0) {
                meses[mes].negativas++;
            }
        });
        
        return meses;
    }

    crearInformeCliente(datos) {
        const stats = datos.stats;
        const rendimiento = datos.rendimientoMensual;
        
        return `
            <div class="informe-content">
                <div class="informe-header">
                    <h2>👤 Informe del Cliente: ${datos.nombre}</h2>
                    <p><strong>Generado:</strong> ${datos.fechaGeneracion}</p>
                </div>
                
                <div class="informe-section">
                    <h3>📊 Resumen General</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h4>Inversión Total</h4>
                            <p class="stat-value">${this.formatearMoneda(stats.inversion || 0)}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Saldo Actual</h4>
                            <p class="stat-value">${this.formatearMoneda(stats.saldoActual || 0)}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Beneficio Total</h4>
                            <p class="stat-value ${stats.beneficioEuro >= 0 ? 'positive' : 'negative'}">
                                ${stats.beneficioEuro >= 0 ? '+' : ''}${this.formatearMoneda(stats.beneficioEuro || 0)}
                            </p>
                        </div>
                        <div class="stat-card">
                            <h4>Rentabilidad Total</h4>
                            <p class="stat-value ${stats.rentabilidadTotal >= 0 ? 'positive' : 'negative'}">
                                ${stats.rentabilidadTotal >= 0 ? '+' : ''}${(stats.rentabilidadTotal || 0).toFixed(2)}%
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="informe-section">
                    <h3>📈 Rendimiento Mensual</h3>
                    <div class="monthly-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Mes</th>
                                    <th>Beneficio</th>
                                    <th>Operaciones</th>
                                    <th>Positivas</th>
                                    <th>Negativas</th>
                                    <th>% Éxito</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(rendimiento).map(([mes, data]) => `
                                    <tr>
                                        <td>${this.formatearMes(mes)}</td>
                                        <td class="${data.beneficio >= 0 ? 'positive' : 'negative'}">
                                            ${data.beneficio >= 0 ? '+' : ''}${this.formatearMoneda(data.beneficio)}
                                        </td>
                                        <td>${data.operaciones}</td>
                                        <td class="positive">${data.positivas}</td>
                                        <td class="negative">${data.negativas}</td>
                                        <td>${((data.positivas / data.operaciones) * 100).toFixed(1)}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="informe-footer">
                    <p><em>Informe generado automáticamente por Portfolio Manager</em></p>
                </div>
            </div>
        `;
    }

    async generarComparativa() {
        console.log('📊 Generando comparativa...');
        
        const preview = document.getElementById('informePreview');
        const exportButtons = document.getElementById('exportButtons');
        
        if (!preview) return;
        
        preview.innerHTML = '<div class="loading">⏳ Generando comparativa...</div>';
        
        try {
            const datos = await this.obtenerDatosComparativa();
            const informe = this.crearInformeComparativa(datos);
            
            preview.innerHTML = informe;
            exportButtons.style.display = 'flex';
            
            this.showNotification('✅ Comparativa generada', 'success');
            
        } catch (error) {
            console.error('Error generando comparativa:', error);
            preview.innerHTML = '<p class="error">❌ Error al generar la comparativa</p>';
        }
    }

    async obtenerDatosComparativa() {
        const statsGenerales = window.estadisticasActuales || {};
        const statsCliente = await this.obtenerStatsCliente();
        
        return {
            generales: statsGenerales,
            cliente: statsCliente,
            fechaGeneracion: new Date().toLocaleString('es-ES')
        };
    }

    crearInformeComparativa(datos) {
        const gen = datos.generales;
        cli = datos.cliente;
        
        return `
            <div class="informe-content">
                <div class="informe-header">
                    <h2>📊 Comparativa: General vs Cliente</h2>
                    <p><strong>Generado:</strong> ${datos.fechaGeneracion}</p>
                </div>
                
                <div class="informe-section">
                    <h3>📈 Comparación de Métricas</h3>
                    <div class="comparison-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Métrica</th>
                                    <th>General</th>
                                    <th>Cliente</th>
                                    <th>Diferencia</th>
                                    <th>% Variación</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Inversión</td>
                                    <td>${this.formatearMoneda(gen.inversion || 0)}</td>
                                    <td>${this.formatearMoneda(cli?.inversion || 0)}</td>
                                    <td>${this.formatearMoneda((cli?.inversion || 0) - (gen.inversion || 0))}</td>
                                    <td>${this.calcularVariacion(gen.inversion, cli?.inversion)}</td>
                                </tr>
                                <tr>
                                    <td>Saldo Actual</td>
                                    <td>${this.formatearMoneda(gen.saldoActual || 0)}</td>
                                    <td>${this.formatearMoneda(cli?.saldoActual || 0)}</td>
                                    <td>${this.formatearMoneda((cli?.saldoActual || 0) - (gen.saldoActual || 0))}</td>
                                    <td>${this.calcularVariacion(gen.saldoActual, cli?.saldoActual)}</td>
                                </tr>
                                <tr>
                                    <td>Beneficio Total</td>
                                    <td class="${gen.beneficioEuro >= 0 ? 'positive' : 'negative'}">
                                        ${gen.beneficioEuro >= 0 ? '+' : ''}${this.formatearMoneda(gen.beneficioEuro || 0)}
                                    </td>
                                    <td class="${cli?.beneficioEuro >= 0 ? 'positive' : 'negative'}">
                                        ${cli?.beneficioEuro >= 0 ? '+' : ''}${this.formatearMoneda(cli?.beneficioEuro || 0)}
                                    </td>
                                    <td class="${((cli?.beneficioEuro || 0) - (gen.beneficioEuro || 0)) >= 0 ? 'positive' : 'negative'}">
                                        ${((cli?.beneficioEuro || 0) - (gen.beneficioEuro || 0)) >= 0 ? '+' : ''}${this.formatearMoneda((cli?.beneficioEuro || 0) - (gen.beneficioEuro || 0))}
                                    </td>
                                    <td>${this.calcularVariacion(gen.beneficioEuro, cli?.beneficioEuro)}</td>
                                </tr>
                                <tr>
                                    <td>Rentabilidad</td>
                                    <td class="${gen.rentabilidadTotal >= 0 ? 'positive' : 'negative'}">
                                        ${gen.rentabilidadTotal >= 0 ? '+' : ''}${(gen.rentabilidadTotal || 0).toFixed(2)}%
                                    </td>
                                    <td class="${cli?.rentabilidadTotal >= 0 ? 'positive' : 'negative'}">
                                        ${cli?.rentabilidadTotal >= 0 ? '+' : ''}${(cli?.rentabilidadTotal || 0).toFixed(2)}%
                                    </td>
                                    <td class="${((cli?.rentabilidadTotal || 0) - (gen.rentabilidadTotal || 0)) >= 0 ? 'positive' : 'negative'}">
                                        ${((cli?.rentabilidadTotal || 0) - (gen.rentabilidadTotal || 0)) >= 0 ? '+' : ''}${((cli?.rentabilidadTotal || 0) - (gen.rentabilidadTotal || 0)).toFixed(2)}%
                                    </td>
                                    <td>${this.calcularVariacion(gen.rentabilidadTotal, cli?.rentabilidadTotal)}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="informe-footer">
                    <p><em>Comparativa generada automáticamente por Portfolio Manager</em></p>
                </div>
            </div>
        `;
    }

    async generarInformePeriodo() {
        const periodo = document.getElementById('periodoInforme')?.value;
        if (!periodo) {
            this.showNotification('⚠️ Selecciona un periodo', 'warning');
            return;
        }
        
        console.log('📅 Generando informe del periodo:', periodo);
        
        const preview = document.getElementById('informePreview');
        const exportButtons = document.getElementById('exportButtons');
        
        if (!preview) return;
        
        preview.innerHTML = `<div class="loading">⏳ Generando informe del ${periodo}...</div>`;
        
        try {
            const datos = await this.obtenerDatosPeriodo(periodo);
            const informe = this.crearInformePeriodo(datos, periodo);
            
            preview.innerHTML = informe;
            exportButtons.style.display = 'flex';
            
            this.showNotification(`✅ Informe del ${periodo} generado`, 'success');
            
        } catch (error) {
            console.error('Error generando informe periodo:', error);
            preview.innerHTML = '<p class="error">❌ Error al generar el informe</p>';
        }
    }

    async obtenerDatosPeriodo(periodo) {
        // Implementar lógica real según el periodo
        const datos = {
            periodo,
            fechaGeneracion: new Date().toLocaleString('es-ES'),
            mensaje: `Funcionalidad de informe por ${periodo} en desarrollo`
        };
        
        return datos;
    }

    crearInformePeriodo(datos, periodo) {
        return `
            <div class="informe-content">
                <div class="informe-header">
                    <h2>📅 Informe del ${periodo}</h2>
                    <p><strong>Generado:</strong> ${datos.fechaGeneracion}</p>
                </div>
                
                <div class="informe-section">
                    <p>${datos.mensaje}</p>
                    <p>Esta funcionalidad se implementará con datos reales del periodo seleccionado.</p>
                </div>
                
                <div class="informe-footer">
                    <p><em>Informe generado automáticamente por Portfolio Manager</em></p>
                </div>
            </div>
        `;
    }

    exportarExcel() {
        console.log('📊 Exportando a Excel...');
        this.showNotification('📊 Exportación a Excel en desarrollo', 'info');
    }

    exportarCSV() {
        console.log('📋 Exportando a CSV...');
        this.showNotification('📋 Exportación a CSV en desarrollo', 'info');
    }

    imprimirInforme() {
        console.log('🖨️ Imprimiendo informe...');
        window.print();
    }

    // Utilidades
    formatearMoneda(valor) {
        if (typeof valor !== 'number') return '€0';
        return '€' + valor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    formatearMes(mes) {
        const [year, month] = mes.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return meses[parseInt(month) - 1] + ' ' + year;
    }

    calcularVariacion(valor1, valor2) {
        if (!valor1 || valor1 === 0) return 'N/A';
        const variacion = ((valor2 - valor1) / valor1) * 100;
        return (variacion >= 0 ? '+' : '') + variacion.toFixed(2) + '%';
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
window.reportingUtil = new ReportingUtil();

// Auto-inicialización cuando la pestaña de reporting se active
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'tab-reporting' && 
                mutation.target.classList.contains('active')) {
                window.reportingUtil.init();
            }
        });
    });

    const tabReporting = document.getElementById('tab-reporting');
    if (tabReporting) {
        observer.observe(tabReporting, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
    }
});
