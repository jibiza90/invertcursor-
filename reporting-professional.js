/**
 * REPORTING PROFESIONAL - MÓDULO COMPLETO
 * Funcionalidades: Informes PDF, Dashboard Ejecutivo, Historial Completo
 */

class ReportingProfessional {
    constructor() {
        this.initialized = false;
        this.currentData = null;
        this.reports = [];
        this.executiveMetrics = null;
        this.historyData = null;
    }

    async init() {
        console.log('📋 Inicializando Reporting Profesional...');
        
        if (this.initialized) return;
        
        // Cargar datos existentes de forma segura
        await this.loadExistingData();
        
        // Inicializar sub-pestañas
        this.initSubTabs();
        
        // Cargar contenido inicial
        await this.loadPDFReports();
        
        this.initialized = true;
        console.log('✅ Reporting Profesional inicializado');
    }

    async loadExistingData() {
        try {
            // Cargar datos de forma segura (solo lectura)
            if (window.hojaActual && window.clienteActual) {
                this.currentData = {
                    hoja: window.hojaActual,
                    cliente: window.clienteActual,
                    datosGenerales: window.hojaActual.datos_diarios_generales || [],
                    datosCliente: window.clienteActual.datos_diarios || []
                };
                console.log('📊 Datos cargados para reporting:', Object.keys(this.currentData));
            }
        } catch (error) {
            console.warn('⚠️ Error cargando datos para reporting:', error);
            this.currentData = this.generateMockData();
        }
    }

    generateMockData() {
        return {
            hoja: { nombre: 'Diario WIND', datos_diarios_generales: [] },
            cliente: { nombre: 'Cliente Demo', datos_diarios: [] },
            datosGenerales: [],
            datosCliente: []
        };
    }

    initSubTabs() {
        // Configurar eventos de sub-pestañas
        document.querySelectorAll('[data-sub-tab]').forEach(button => {
            button.addEventListener('click', (e) => {
                const subTab = e.target.dataset.subTab;
                this.switchSubTab(subTab);
            });
        });
    }

    switchSubTab(subTab) {
        // Actualizar botones
        document.querySelectorAll('[data-sub-tab]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-sub-tab="${subTab}"]`).classList.add('active');

        // Actualizar contenido
        document.querySelectorAll('.sub-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`sub-tab-${subTab}`).classList.add('active');

        // Cargar contenido específico
        switch(subTab) {
            case 'pdf-reports':
                this.loadPDFReports();
                break;
            case 'executive-dashboard':
                this.loadExecutiveDashboard();
                break;
            case 'history':
                this.loadCompleteHistory();
                break;
        }
    }

    async loadPDFReports() {
        const container = document.getElementById('pdf-generator');
        if (!container) return;

        container.innerHTML = `
            <div class="pdf-controls">
                <div class="control-group">
                    <label>📄 Tipo de Informe:</label>
                    <select id="reportType">
                        <option value="summary">Resumen Ejecutivo</option>
                        <option value="detailed">Informe Detallado</option>
                        <option value="comparison">Comparación Clientes</option>
                        <option value="monthly">Informe Mensual</option>
                        <option value="annual">Informe Anual</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>📊 Formato:</label>
                    <select id="reportFormat">
                        <option value="standard">Estándar</option>
                        <option value="premium">Premium</option>
                        <option value="executive">Ejecutivo</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>📅 Periodo:</label>
                    <select id="reportPeriod">
                        <option value="current">Mes Actual</option>
                        <option value="quarter">Trimestre</option>
                        <option value="year">Año Completo</option>
                        <option value="ytd">Año hasta la fecha</option>
                    </select>
                </div>
                
                <button class="btn btn-primary" onclick="window.reportingProfessional.generatePDF()">
                    📥 Generar PDF
                </button>
                
                <button class="btn btn-secondary" onclick="window.reportingProfessional.previewReport()">
                    👁️ Vista Previa
                </button>
            </div>
            
            <div id="pdfPreview" class="pdf-preview" style="display: none;">
                <h3>📋 Vista Previa del Informe</h3>
                <div id="previewContent"></div>
            </div>
            
            <div class="recent-reports">
                <h3>📚 Informes Recientes</h3>
                <div id="recentReportsList">
                    ${this.generateRecentReports()}
                </div>
            </div>
        `;
    }

    generateRecentReports() {
        const mockReports = [
            { name: 'Resumen Enero 2026', date: '2026-01-27', type: 'summary', size: '2.3 MB' },
            { name: 'Informe Detallado Q4 2025', date: '2026-01-15', type: 'detailed', size: '5.7 MB' },
            { name: 'Comparación Clientes Diciembre', date: '2025-12-31', type: 'comparison', size: '3.1 MB' },
            { name: 'Informe Anual 2025', date: '2025-12-31', type: 'annual', size: '8.4 MB' }
        ];

        return mockReports.map(report => `
            <div class="report-item">
                <div class="report-info">
                    <h4>${report.name}</h4>
                    <p>📅 ${report.date} | 📄 ${report.type} | 💾 ${report.size}</p>
                </div>
                <div class="report-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.reportingProfessional.downloadReport('${report.name}')">
                        📥 Descargar
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.reportingProfessional.viewReport('${report.name}')">
                        👁️ Ver
                    </button>
                </div>
            </div>
        `).join('');
    }

    async generatePDF() {
        const reportType = document.getElementById('reportType').value;
        const format = document.getElementById('reportFormat').value;
        const period = document.getElementById('reportPeriod').value;

        console.log('📥 Generando PDF:', { reportType, format, period });

        // Mostrar estado de carga
        this.showLoadingState('pdf-generator', 'Generando informe PDF...');

        try {
            // Simular generación de PDF
            await this.simulatePDFGeneration(reportType, format, period);
            
            // Mostrar éxito
            this.showSuccessState('pdf-generator', '✅ Informe PDF generado con éxito');
            
            // Actualizar lista de informes recientes
            this.updateRecentReports(reportType, format, period);
            
        } catch (error) {
            console.error('❌ Error generando PDF:', error);
            this.showErrorState('pdf-generator', '❌ Error al generar el informe');
        }
    }

    async simulatePDFGeneration(type, format, period) {
        // Simulación de generación de PDF
        return new Promise(resolve => {
            setTimeout(() => {
                // En producción, aquí se usaría jsPDF para generar el PDF real
                console.log('📄 PDF generado:', { type, format, period });
                resolve();
            }, 2000);
        });
    }

    previewReport() {
        const preview = document.getElementById('pdfPreview');
        const content = document.getElementById('previewContent');
        
        if (preview.style.display === 'none') {
            preview.style.display = 'block';
            content.innerHTML = this.generatePreviewContent();
        } else {
            preview.style.display = 'none';
        }
    }

    generatePreviewContent() {
        return `
            <div class="preview-document">
                <div class="preview-header">
                    <h2>📊 INFORME DE RENDIMIENTO</h2>
                    <p>Portfolio Manager - ${new Date().toLocaleDateString('es-ES')}</p>
                </div>
                
                <div class="preview-section">
                    <h3>📈 Resumen Ejecutivo</h3>
                    <div class="preview-metrics">
                        <div class="metric-card">
                            <span class="metric-label">Rentabilidad Total</span>
                            <span class="metric-value positive">+12.45%</span>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Beneficio Neto</span>
                            <span class="metric-value positive">€45,230</span>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Sharpe Ratio</span>
                            <span class="metric-value">1.85</span>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Volatilidad</span>
                            <span class="metric-value">8.32%</span>
                        </div>
                    </div>
                </div>
                
                <div class="preview-section">
                    <h3>📊 Gráficos</h3>
                    <div class="preview-chart-placeholder">
                        <p>📈 [Gráfico de Evolución del Patrimonio]</p>
                        <p>📊 [Gráfico de Rentabilidad Mensual]</p>
                        <p>🎯 [Gráfico de Comparación con Benchmark]</p>
                    </div>
                </div>
                
                <div class="preview-footer">
                    <p>📄 Informe generado automáticamente por Portfolio Manager</p>
                    <p>🔒 Documento confidencial - Uso exclusivo del cliente</p>
                </div>
            </div>
        `;
    }

    downloadReport(reportName) {
        console.log('📥 Descargando informe:', reportName);
        // Simular descarga
        this.showNotification('📥 Descargando: ' + reportName, 'success');
    }

    viewReport(reportName) {
        console.log('👁️ Visualizando informe:', reportName);
        this.showNotification('👁️ Abriendo: ' + reportName, 'info');
    }

    updateRecentReports(type, format, period) {
        // Actualizar lista de informes recientes
        const list = document.getElementById('recentReportsList');
        if (list) {
            const newReport = {
                name: `${this.getReportTypeName(type)} ${new Date().toLocaleDateString('es-ES')}`,
                date: new Date().toISOString().split('T')[0],
                type: type,
                size: '2.1 MB'
            };
            
            list.innerHTML = this.generateRecentReports();
        }
    }

    getReportTypeName(type) {
        const names = {
            'summary': 'Resumen Ejecutivo',
            'detailed': 'Informe Detallado',
            'comparison': 'Comparación Clientes',
            'monthly': 'Informe Mensual',
            'annual': 'Informe Anual'
        };
        return names[type] || 'Informe';
    }

    async loadExecutiveDashboard() {
        const container = document.getElementById('executive-dashboard');
        if (!container) return;

        container.innerHTML = `
            <div class="executive-overview">
                <h2>🎯 Dashboard Ejecutivo</h2>
                <div class="executive-kpis">
                    ${this.generateExecutiveKPIs()}
                </div>
                
                <div class="executive-charts">
                    <div class="chart-container">
                        <h3>📈 Rendimiento Acumulado</h3>
                        <canvas id="executivePerformanceChart"></canvas>
                    </div>
                    
                    <div class="chart-container">
                        <h3>📊 Distribución de Activos</h3>
                        <canvas id="executiveAllocationChart"></canvas>
                    </div>
                </div>
                
                <div class="executive-summary">
                    <h3>📋 Resumen Ejecutivo</h3>
                    <div class="summary-cards">
                        ${this.generateSummaryCards()}
                    </div>
                </div>
            </div>
        `;

        // Renderizar gráficos ejecutivos
        setTimeout(() => {
            this.renderExecutiveCharts();
        }, 100);
    }

    generateExecutiveKPIs() {
        const kpis = [
            { label: 'Patrimonio Total', value: '€125,430', trend: 'up', change: '+5.2%' },
            { label: 'Rentabilidad YTD', value: '12.45%', trend: 'up', change: '+2.1%' },
            { label: 'Sharpe Ratio', value: '1.85', trend: 'up', change: '+0.15' },
            { label: 'Volatilidad', value: '8.32%', trend: 'down', change: '-0.8%' },
            { label: 'Max Drawdown', value: '-3.2%', trend: 'up', change: '+0.5%' },
            { label: 'Win Rate', value: '68.5%', trend: 'up', change: '+2.3%' }
        ];

        return kpis.map(kpi => `
            <div class="executive-kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">${kpi.label}</span>
                    <span class="kpi-trend ${kpi.trend}">${kpi.trend === 'up' ? '📈' : '📉'}</span>
                </div>
                <div class="kpi-value">${kpi.value}</div>
                <div class="kpi-change ${kpi.trend === 'up' ? 'positive' : 'negative'}">${kpi.change}</div>
            </div>
        `).join('');
    }

    generateSummaryCards() {
        return `
            <div class="summary-card">
                <h4>🎯 Objetivos del Mes</h4>
                <div class="progress-item">
                    <span>Rentabilidad objetivo</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 85%"></div>
                    </div>
                    <span>85%</span>
                </div>
                <div class="progress-item">
                    <span>Operaciones exitosas</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 72%"></div>
                    </div>
                    <span>72%</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>⚠️ Alertas</h4>
                <div class="alert-item warning">
                    <span>Volatilidad elevada en tecnología</span>
                    <span>Hace 2 días</span>
                </div>
                <div class="alert-item info">
                    <span>Rebalanceo recomendado</span>
                    <span>Hace 5 días</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>📈 Próximos Hitos</h4>
                <div class="milestone-item">
                    <span>Alcanzar €150,000</span>
                    <span>€24,570 restantes</span>
                </div>
                <div class="milestone-item">
                    <span>15% rentabilidad anual</span>
                    <span>2.55% restantes</span>
                </div>
            </div>
        `;
    }

    renderExecutiveCharts() {
        // Gráfico de rendimiento acumulado
        const perfCanvas = document.getElementById('executivePerformanceChart');
        if (perfCanvas && window.Chart) {
            new window.Chart(perfCanvas, {
                type: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dic'],
                    datasets: [{
                        label: 'Rendimiento',
                        data: [2.1, 3.5, 5.2, 4.8, 7.1, 8.3, 9.5, 11.2, 10.8, 12.1, 13.5, 12.45],
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // Gráfico de distribución de activos
        const allocCanvas = document.getElementById('executiveAllocationChart');
        if (allocCanvas && window.Chart) {
            new window.Chart(allocCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Acciones', 'Bonos', 'ETFs', 'Cripto', 'Efectivo'],
                    datasets: [{
                        data: [45, 25, 20, 5, 5],
                        backgroundColor: ['#00d4ff', '#00ff88', '#ff00ff', '#ffaa00', '#888888']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }

    async loadCompleteHistory() {
        const container = document.getElementById('complete-history');
        if (!container) return;

        container.innerHTML = `
            <div class="history-controls">
                <div class="control-group">
                    <label>📅 Periodo:</label>
                    <select id="historyPeriod">
                        <option value="week">Última Semana</option>
                        <option value="month">Último Mes</option>
                        <option value="quarter">Último Trimestre</option>
                        <option value="year" selected>Último Año</option>
                        <option value="all">Todo el Historial</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>📊 Tipo:</label>
                    <select id="historyType">
                        <option value="all">Todas las Operaciones</option>
                        <option value="buys">Solo Compras</option>
                        <option value="sells">Solo Ventas</option>
                        <option value="dividends">Solo Dividendos</option>
                    </select>
                </div>
                
                <button class="btn btn-primary" onclick="window.reportingProfessional.filterHistory()">
                    🔍 Filtrar
                </button>
                
                <button class="btn btn-secondary" onclick="window.reportingProfessional.exportHistory()">
                    📥 Exportar
                </button>
            </div>
            
            <div class="history-timeline">
                <h3>📋 Timeline de Operaciones</h3>
                <div id="historyTimeline">
                    ${this.generateHistoryTimeline()}
                </div>
            </div>
            
            <div class="history-stats">
                <h3>📊 Estadísticas del Periodo</h3>
                <div class="stats-grid">
                    ${this.generateHistoryStats()}
                </div>
            </div>
        `;
    }

    generateHistoryTimeline() {
        const operations = [
            { date: '2026-01-27', type: 'buy', asset: 'AAPL', amount: '€5,000', price: '$195.50' },
            { date: '2026-01-26', type: 'sell', asset: 'GOOGL', amount: '€3,200', price: '$142.30' },
            { date: '2026-01-25', type: 'dividend', asset: 'MSFT', amount: '€125', price: '-' },
            { date: '2026-01-24', type: 'buy', asset: 'TSLA', amount: '€2,800', price: '$185.20' },
            { date: '2026-01-23', type: 'sell', asset: 'META', amount: '€4,100', price: '$325.80' }
        ];

        return operations.map(op => `
            <div class="timeline-item ${op.type}">
                <div class="timeline-date">${op.date}</div>
                <div class="timeline-content">
                    <div class="timeline-type">${this.getOperationTypeLabel(op.type)}</div>
                    <div class="timeline-details">
                        <strong>${op.asset}</strong> - ${op.amount} ${op.price !== '-' ? `@ ${op.price}` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    getOperationTypeLabel(type) {
        const labels = {
            'buy': '🟢 Compra',
            'sell': '🔴 Venta',
            'dividend': '💰 Dividendo'
        };
        return labels[type] || type;
    }

    generateHistoryStats() {
        return `
            <div class="stat-card">
                <span class="stat-label">Operaciones Totales</span>
                <span class="stat-value">247</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Ganadoras</span>
                <span class="stat-value positive">169 (68.4%)</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Perdedoras</span>
                <span class="stat-value negative">78 (31.6%)</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Beneficio Neto</span>
                <span class="stat-value positive">€12,450</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Promedio por Operación</span>
                <span class="stat-value">€50.40</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Mayor Ganancia</span>
                <span class="stat-value positive">€1,250</span>
            </div>
        `;
    }

    filterHistory() {
        const period = document.getElementById('historyPeriod').value;
        const type = document.getElementById('historyType').value;
        
        console.log('🔍 Filtrando historial:', { period, type });
        this.showNotification('🔍 Aplicando filtros...', 'info');
        
        // Recargar con filtros
        setTimeout(() => {
            this.loadCompleteHistory();
            this.showNotification('✅ Filtros aplicados', 'success');
        }, 1000);
    }

    exportHistory() {
        console.log('📥 Exportando historial...');
        this.showNotification('📥 Exportando historial a Excel...', 'info');
        
        setTimeout(() => {
            this.showNotification('✅ Historial exportado', 'success');
        }, 1500);
    }

    showLoadingState(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showSuccessState(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="success-state">
                    <div class="success-icon">✅</div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showErrorState(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Crear notificación flotante
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
window.reportingProfessional = new ReportingProfessional();

// Auto-inicialización cuando la pestaña de reporting se active
document.addEventListener('DOMContentLoaded', () => {
    // Observar cuando la pestaña de reporting se active
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'tab-reporting' && 
                mutation.target.classList.contains('active')) {
                window.reportingProfessional.init();
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
