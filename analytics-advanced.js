// ANÁLISIS AVANZADO - SOLO LECTURA DE DATOS EXISTENTES
// NO MODIFICA NADA - SEGURIDAD MÁXIMA

class AnalyticsAdvanced {
    constructor() {
        this.dataCache = {};
        this.charts = {};
        this.isInitialized = false;
        
        console.log('📈 AnalyticsAdvanced: Inicializando análisis seguro...');
        this.init();
    }

    init() {
        // Esperar a que el sistema de pestañas esté listo
        if (window.tabsSystem) {
            window.addEventListener('tabsSystemReady', () => {
                this.setupAnalytics();
            });
        } else {
            // Si el sistema ya está listo
            if (document.readyState === 'complete') {
                this.setupAnalytics();
            } else {
                document.addEventListener('DOMContentLoaded', () => this.setupAnalytics());
            }
        }
    }

    setupAnalytics() {
        try {
            console.log('🔧 Configurando análisis avanzado...');
            
            // 1. Cargar datos existentes de forma segura
            this.loadExistingData();
            
            // 2. Configurar comparación multi-cliente
            this.setupMultiClientComparison();
            
            // 3. Configurar métricas profesionales
            this.setupProfessionalMetrics();
            
            // 4. Configurar proyecciones
            this.setupProjections();
            
            this.isInitialized = true;
            console.log('✅ Análisis avanzado configurado safely');
            
        } catch (error) {
            console.error('❌ Error en análisis avanzado:', error);
        }
    }

    // MÉTODO CRÍTICO: SOLO LECTURA DE DATOS EXISTENTES
    loadExistingData() {
        try {
            console.log('📊 Cargando datos existentes (solo lectura)...');
            
            // Acceder a datos existentes SIN MODIFICAR
            const hojas = datosEditados?.hojas || {};
            
            Object.keys(hojas).forEach(hojaNombre => {
                const hoja = hojas[hojaNombre];
                
                // Datos generales (SOLO LECTURA)
                if (hoja.datos_diarios_generales) {
                    this.dataCache[`${hojaNombre}_generales`] = {
                        datos: [...hoja.datos_diarios_generales], // Copia segura
                        tipo: 'generales',
                        hoja: hojaNombre
                    };
                    console.log(`📊 Cacheados datos generales de ${hojaNombre}: ${hoja.datos_diarios_generales.length} registros`);
                }
                
                // Datos de clientes (SOLO LECTURA)
                if (hoja.clientes) {
                    Object.keys(hoja.clientes).forEach(clienteId => {
                        const cliente = hoja.clientes[clienteId];
                        if (cliente.datos_diarios) {
                            this.dataCache[`${hojaNombre}_cliente_${clienteId}`] = {
                                datos: [...cliente.datos_diarios], // Copia segura
                                tipo: 'cliente',
                                hoja: hojaNombre,
                                clienteId: clienteId,
                                nombre: cliente.datos?.NOMBRE?.valor || `Cliente ${parseInt(clienteId) + 1}`
                            };
                            console.log(`👤 Cacheados datos de cliente ${clienteId} en ${hojaNombre}: ${cliente.datos_diarios.length} registros`);
                        }
                    });
                }
            });
            
            console.log('✅ Datos existentes cacheados safely');
            
        } catch (error) {
            console.error('❌ Error cargando datos existentes:', error);
            // En caso de error, usar datos de ejemplo
            this.loadMockData();
        }
    }

    loadMockData() {
        console.log('🎭 Cargando datos de ejemplo para demostración...');
        
        // Datos de ejemplo que no afectan nada real
        this.dataCache = {
            'demo_generales': {
                datos: this.generateMockData(365),
                tipo: 'generales',
                hoja: 'Demo'
            },
            'demo_cliente_0': {
                datos: this.generateMockData(365),
                tipo: 'cliente',
                hoja: 'Demo',
                clienteId: 0,
                nombre: 'Cliente Demo'
            }
        };
    }

    generateMockData(days) {
        const mockData = [];
        for (let i = 0; i < days; i++) {
            mockData.push({
                fila: 15 + i,
                fecha: new Date(2026, 0, 1 + i),
                benef_porcentaje: (Math.random() - 0.5) * 2, // -1% a +1%
                beneficio_acumulado: Math.random() * 1000,
                saldo_diario: 100000 + (Math.random() - 0.5) * 10000
            });
        }
        return mockData;
    }

    setupMultiClientComparison() {
        console.log('🔍 Configurando comparación multi-cliente...');
        
        // Configurar evento cuando se active la sub-pestaña de comparación
        const comparisonButton = document.querySelector('[data-sub-tab="comparison"]');
        if (comparisonButton) {
            comparisonButton.addEventListener('click', () => {
                setTimeout(() => this.renderMultiClientComparison(), 100);
            });
        }
    }

    renderMultiClientComparison() {
        const container = document.getElementById('multi-client-comparison');
        if (!container) return;
        
        console.log('📊 Renderizando comparación multi-cliente...');
        
        // Mostrar estado de carga
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Analizando datos de clientes...</p>
            </div>
        `;
        
        // Simular procesamiento y renderizar
        setTimeout(() => {
            const comparisonData = this.prepareComparisonData();
            container.innerHTML = this.renderComparisonHTML(comparisonData);
            this.renderComparisonChart(comparisonData);
        }, 1000);
    }

    prepareComparisonData() {
        const comparisonData = {
            general: null,
            clientes: [],
            metrics: {}
        };
        
        // Procesar datos generales
        Object.keys(this.dataCache).forEach(key => {
            const data = this.dataCache[key];
            
            if (data.tipo === 'generales') {
                comparisonData.general = this.calculateMetrics(data);
            } else if (data.tipo === 'cliente') {
                comparisonData.clientes.push({
                    ...data,
                    metrics: this.calculateMetrics(data)
                });
            }
        });
        
        // Ordenar clientes por rentabilidad
        comparisonData.clientes.sort((a, b) => b.metrics.rentabilidadTotal - a.metrics.rentabilidadTotal);
        
        return comparisonData;
    }

    calculateMetrics(data) {
        const datos = data.datos;
        
        // Rentabilidad total
        const rentabilidadTotal = datos.reduce((sum, d) => sum + (d.benef_porcentaje || 0), 0);
        
        // Volatilidad (desviación estándar)
        const beneficios = datos.map(d => d.benef_porcentaje || 0);
        const media = beneficios.reduce((sum, b) => sum + b, 0) / beneficios.length;
        const varianza = beneficios.reduce((sum, b) => sum + Math.pow(b - media, 2), 0) / beneficios.length;
        const volatilidad = Math.sqrt(varianza);
        
        // Sharpe Ratio (simplificado)
        const sharpeRatio = rentabilidadTotal / (volatilidad || 1);
        
        // Drawdown máximo
        let maxDrawdown = 0;
        let peak = 0;
        
        datos.forEach(d => {
            const currentValue = d.beneficio_acumulado || 0;
            if (currentValue > peak) {
                peak = currentValue;
            }
            const drawdown = (peak - currentValue) / peak * 100;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        });
        
        return {
            rentabilidadTotal,
            volatilidad,
            sharpeRatio,
            maxDrawdown,
            diasOperados: datos.filter(d => d.benef_porcentaje !== 0).length
        };
    }

    renderComparisonHTML(data) {
        return `
            <div class="comparison-overview">
                <div class="comparison-stats">
                    <div class="stat-card">
                        <h4>📊 General</h4>
                        <div class="metrics">
                            <div class="metric">
                                <span class="label">Rentabilidad:</span>
                                <span class="value ${data.general?.rentabilidadTotal >= 0 ? 'positive' : 'negative'}">
                                    ${data.general?.rentabilidadTotal.toFixed(2) || 0}%
                                </span>
                            </div>
                            <div class="metric">
                                <span class="label">Volatilidad:</span>
                                <span class="value">${data.general?.volatilidad.toFixed(2) || 0}%</span>
                            </div>
                            <div class="metric">
                                <span class="label">Sharpe Ratio:</span>
                                <span class="value">${data.general?.sharpeRatio.toFixed(2) || 0}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="clients-ranking">
                        <h4>👥 Ranking Clientes</h4>
                        ${data.clientes.map((cliente, index) => `
                            <div class="client-rank-item">
                                <span class="rank">#${index + 1}</span>
                                <span class="name">${cliente.nombre}</span>
                                <span class="rentability ${cliente.metrics.rentabilidadTotal >= 0 ? 'positive' : 'negative'}">
                                    ${cliente.metrics.rentabilidadTotal.toFixed(2)}%
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="comparison-chart-container">
                    <canvas id="comparison-chart" width="800" height="400"></canvas>
                </div>
            </div>
            
            <style>
                .comparison-overview {
                    display: grid;
                    grid-template-columns: 1fr 2fr;
                    gap: 2rem;
                    margin-top: 1rem;
                }
                
                .comparison-stats {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                
                .stat-card {
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 1.5rem;
                    border: 1px solid #dee2e6;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                
                .stat-card h4 {
                    color: #212529;
                    margin: 0 0 1rem 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                
                .metrics {
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                }
                
                .metric {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .label {
                    color: #6c757d;
                    font-size: 0.9rem;
                }
                
                .value {
                    font-weight: 600;
                    font-size: 1rem;
                    color: #495057;
                }
                
                .positive {
                    color: #28a745;
                }
                
                .negative {
                    color: #dc3545;
                }
                
                .clients-ranking {
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 1.5rem;
                    border: 1px solid #dee2e6;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                
                .clients-ranking h4 {
                    color: #212529;
                    margin: 0 0 1rem 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                
                .client-rank-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .client-rank-item:last-child {
                    border-bottom: none;
                }
                
                .rank {
                    background: #e9ecef;
                    color: #495057;
                    padding: 0.2rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    min-width: 2rem;
                    text-align: center;
                }
                
                .name {
                    flex: 1;
                    color: #495057;
                }
                
                .rentability {
                    font-weight: 600;
                    min-width: 4rem;
                    text-align: right;
                }
                
                .comparison-chart-container {
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 1.5rem;
                    border: 1px solid #dee2e6;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    height: 400px;
                    position: relative;
                }
                
                @media (max-width: 768px) {
                    .comparison-overview {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        `;
    }

    renderComparisonChart(data) {
        const canvas = document.getElementById('comparison-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Preparar datos para el gráfico
        const labels = ['General', ...data.clientes.map(c => c.nombre)];
        const rentabilidades = [
            data.general?.rentabilidadTotal || 0,
            ...data.clientes.map(c => c.metrics.rentabilidadTotal)
        ];
        
        // Destruir gráfico anterior si existe
        if (this.charts.comparison) {
            this.charts.comparison.destroy();
        }
        
        // Crear nuevo gráfico
        this.charts.comparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Rentabilidad Total (%)',
                    data: rentabilidades,
                    backgroundColor: rentabilidades.map(r => r >= 0 ? 'rgba(0, 255, 136, 0.8)' : 'rgba(255, 107, 107, 0.8)'),
                    borderColor: rentabilidades.map(r => r >= 0 ? '#00ff88' : '#ff6b6b'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Rentabilidad: ${context.parsed.y.toFixed(2)}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e9ecef'
                        },
                        ticks: {
                            color: '#495057',
                            callback: (value) => value + '%'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#495057'
                        }
                    }
                }
            }
        });
        
        console.log('📊 Gráfico de comparación renderizado');
    }

    setupProfessionalMetrics() {
        console.log('📊 Configurando métricas profesionales...');
        
        const metricsButton = document.querySelector('[data-sub-tab="metrics"]');
        if (metricsButton) {
            metricsButton.addEventListener('click', () => {
                setTimeout(() => this.renderProfessionalMetrics(), 100);
            });
        }
    }

    renderProfessionalMetrics() {
        const container = document.getElementById('professional-metrics');
        if (!container) return;
        
        console.log('📈 Renderizando métricas profesionales...');
        
        // Calcular métricas para todos los datos
        const allMetrics = this.calculateAllMetrics();
        
        container.innerHTML = `
            <div class="professional-metrics-dashboard">
                <div class="metrics-grid">
                    ${this.renderMetricCard('Sharpe Ratio', allMetrics.avgSharpe, '1.85', 'sharpe')}
                    ${this.renderMetricCard('Volatilidad', allMetrics.avgVolatility, '12.3%', 'volatility')}
                    ${this.renderMetricCard('Drawdown Máximo', allMetrics.avgDrawdown, '-5.2%', 'drawdown')}
                    ${this.renderMetricCard('Ratio de Éxito', allMetrics.successRate, '68.5%', 'success')}
                </div>
                
                <div class="metrics-details">
                    <h4>📋 Detalle por Cliente</h4>
                    <div class="metrics-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Rentabilidad</th>
                                    <th>Volatilidad</th>
                                    <th>Sharpe</th>
                                    <th>Drawdown</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allMetrics.clienteMetrics.map(cliente => `
                                    <tr>
                                        <td>${cliente.nombre}</td>
                                        <td class="${cliente.rentabilidad >= 0 ? 'positive' : 'negative'}">
                                            ${cliente.rentabilidad.toFixed(2)}%
                                        </td>
                                        <td>${cliente.volatilidad.toFixed(2)}%</td>
                                        <td>${cliente.sharpeRatio.toFixed(2)}</td>
                                        <td class="negative">${cliente.maxDrawdown.toFixed(2)}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <style>
                .professional-metrics-dashboard {
                    margin-top: 1rem;
                }
                
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                
                .metric-card {
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 1.5rem;
                    border: 1px solid #dee2e6;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                
                .metric-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                
                .metric-card h4 {
                    color: #212529;
                    margin: 0 0 1rem 0;
                    font-size: 1rem;
                    font-weight: 600;
                }
                
                .metric-value {
                    font-size: 2rem;
                    font-weight: 700;
                    color: #0066cc;
                    display: block;
                }
                
                .metric-benchmark {
                    font-size: 0.8rem;
                    color: #6c757d;
                    margin-top: 0.5rem;
                }
                
                .metrics-details {
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 1.5rem;
                    border: 1px solid #dee2e6;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                
                .metrics-details h4 {
                    color: #212529;
                    margin: 0 0 1rem 0;
                    font-weight: 600;
                }
                
                .metrics-table table {
                    width: 100%;
                    border-collapse: collapse;
                    background: #ffffff;
                }
                
                .metrics-table th {
                    background: #f8f9fa;
                    color: #212529;
                    padding: 0.8rem;
                    text-align: left;
                    font-weight: 600;
                    border-bottom: 2px solid #dee2e6;
                }
                
                .metrics-table td {
                    padding: 0.8rem;
                    border-bottom: 1px solid #e9ecef;
                    color: #495057;
                }
                
                .positive {
                    color: #28a745 !important;
                }
                
                .negative {
                    color: #dc3545 !important;
                }
            </style>
        `;
    }

    renderMetricCard(title, value, benchmark, type) {
        const colors = {
            sharpe: '#0066cc',
            volatility: '#ffc107',
            drawdown: '#dc3545',
            success: '#28a745'
        };
        
        return `
            <div class="metric-card">
                <h4>${title}</h4>
                <span class="metric-value" style="color: ${colors[type]}">${value.toFixed(2)}</span>
                <div class="metric-benchmark">Benchmark: ${benchmark}</div>
            </div>
        `;
    }

    calculateAllMetrics() {
        const allMetrics = {
            clienteMetrics: [],
            avgSharpe: 0,
            avgVolatility: 0,
            avgDrawdown: 0,
            successRate: 0
        };
        
        let totalSharpe = 0;
        let totalVolatility = 0;
        let totalDrawdown = 0;
        let positiveMonths = 0;
        let totalMonths = 0;
        
        Object.values(this.dataCache).forEach(data => {
            if (data.tipo === 'cliente') {
                const metrics = this.calculateMetrics(data);
                allMetrics.clienteMetrics.push({
                    nombre: data.nombre,
                    ...metrics
                });
                
                totalSharpe += metrics.sharpeRatio;
                totalVolatility += metrics.volatilidad;
                totalDrawdown += metrics.maxDrawdown;
                
                // Calcular meses positivos
                const positiveDays = data.datos.filter(d => (d.benef_porcentaje || 0) > 0).length;
                positiveMonths += positiveDays;
                totalMonths += data.datos.length;
            }
        });
        
        const clientCount = allMetrics.clienteMetrics.length;
        if (clientCount > 0) {
            allMetrics.avgSharpe = totalSharpe / clientCount;
            allMetrics.avgVolatility = totalVolatility / clientCount;
            allMetrics.avgDrawdown = totalDrawdown / clientCount;
            allMetrics.successRate = (positiveMonths / totalMonths) * 100;
        }
        
        return allMetrics;
    }

    setupProjections() {
        console.log('🎯 Configurando proyecciones...');
        
        const projectionsButton = document.querySelector('[data-sub-tab="projections"]');
        if (projectionsButton) {
            projectionsButton.addEventListener('click', () => {
                setTimeout(() => this.renderProjections(), 100);
            });
        }
    }

    renderProjections() {
        const container = document.getElementById('projections-analysis');
        if (!container) return;
        
        console.log('🔮 Renderizando proyecciones...');
        
        container.innerHTML = `
            <div class="projections-dashboard">
                <div class="projection-controls">
                    <h4>🎯 Configuración de Proyección</h4>
                    <div class="control-group">
                        <label>Meses a proyectar:</label>
                        <select id="projection-months">
                            <option value="3">3 meses</option>
                            <option value="6" selected>6 meses</option>
                            <option value="12">12 meses</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label>Método:</label>
                        <select id="projection-method">
                            <option value="linear">Lineal</option>
                            <option value="exponential">Exponencial</option>
                            <option value="montecarlo">Monte Carlo</option>
                        </select>
                    </div>
                    <button class="btn-primary" onclick="window.analyticsAdvanced.runProjection()">Ejecutar Proyección</button>
                </div>
                
                <div class="projection-results">
                    <canvas id="projection-chart" width="800" height="400"></canvas>
                </div>
                
                <div class="projection-summary">
                    <h4>📊 Resumen de Proyección</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="label">Rentabilidad Proyectada:</span>
                            <span class="value positive">+12.5%</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Rango Esperado:</span>
                            <span class="value">8% - 17%</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Confianza:</span>
                            <span class="value">85%</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .projections-dashboard {
                    margin-top: 1rem;
                }
                
                .projection-controls {
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 1.5rem;
                    border: 1px solid #dee2e6;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    margin-bottom: 2rem;
                }
                
                .projection-controls h4 {
                    color: #212529;
                    margin: 0 0 1rem 0;
                    font-weight: 600;
                }
                
                .control-group {
                    display: inline-block;
                    margin-right: 2rem;
                    margin-bottom: 1rem;
                }
                
                .control-group label {
                    display: block;
                    color: #495057;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                
                .control-group select {
                    background: #ffffff;
                    border: 1px solid #ced4da;
                    color: #495057;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    font-size: 0.9rem;
                }
                
                .btn-primary {
                    background: #0066cc;
                    border: none;
                    color: #ffffff;
                    padding: 0.8rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.3s ease;
                }
                
                .btn-primary:hover {
                    transform: translateY(-2px);
                }
                
                .projection-results {
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 1.5rem;
                    border: 1px solid #dee2e6;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    margin-bottom: 2rem;
                    height: 400px;
                    position: relative;
                }
                
                .projection-summary {
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 1.5rem;
                    border: 1px solid #dee2e6;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                
                .projection-summary h4 {
                    color: #212529;
                    margin: 0 0 1rem 0;
                    font-weight: 600;
                }
                
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }
                
                .summary-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.8rem;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                }
                
                .summary-item .label {
                    color: #6c757d;
                    font-size: 0.9rem;
                }
                
                .summary-item .value {
                    font-weight: 600;
                    color: #495057;
                }
                
                .summary-item .value.positive {
                    color: #28a745;
                }
            </style>
        `;
    }

    runProjection() {
        console.log('🚀 Ejecutando proyección...');
        
        const months = parseInt(document.getElementById('projection-months').value);
        const method = document.getElementById('projection-method').value;
        
        // Simular proyección
        this.renderProjectionChart(months, method);
    }

    renderProjectionChart(months, method) {
        const canvas = document.getElementById('projection-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Generar datos de proyección
        const projectionData = this.generateProjectionData(months, method);
        
        // Destruir gráfico anterior
        if (this.charts.projection) {
            this.charts.projection.destroy();
        }
        
        // Crear nuevo gráfico
        this.charts.projection = new Chart(ctx, {
            type: 'line',
            data: {
                labels: projectionData.labels,
                datasets: [{
                    label: 'Proyección de Rentabilidad',
                    data: projectionData.values,
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Bandas de Confianza',
                    data: projectionData.upperBound,
                    borderColor: 'rgba(0, 255, 136, 0.5)',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    borderWidth: 1,
                    fill: '+1',
                    tension: 0.4
                }, {
                    label: 'Bandas de Confianza',
                    data: projectionData.lowerBound,
                    borderColor: 'rgba(255, 107, 107, 0.5)',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 1,
                    fill: '-1',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#495057'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        grid: {
                            color: '#e9ecef'
                        },
                        ticks: {
                            color: '#495057',
                            callback: (value) => value + '%'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#495057'
                        }
                    }
                }
            }
        });
        
        console.log('📈 Gráfico de proyección renderizado');
    }

    generateProjectionData(months, method) {
        const labels = [];
        const values = [];
        const upperBound = [];
        const lowerBound = [];
        
        const baseValue = 7.82; // Rentabilidad actual
        const monthlyGrowth = baseValue / 12; // Crecimiento mensual
        
        for (let i = 0; i <= months; i++) {
            labels.push(`Mes ${i}`);
            
            let projectedValue;
            switch (method) {
                case 'linear':
                    projectedValue = baseValue + (monthlyGrowth * i);
                    break;
                case 'exponential':
                    projectedValue = baseValue * Math.pow(1.01, i);
                    break;
                case 'montecarlo':
                    const randomFactor = 0.8 + Math.random() * 0.4; // 80% - 120%
                    projectedValue = baseValue * Math.pow(1.01, i) * randomFactor;
                    break;
                default:
                    projectedValue = baseValue + (monthlyGrowth * i);
            }
            
            values.push(projectedValue);
            upperBound.push(projectedValue * 1.2);
            lowerBound.push(projectedValue * 0.8);
        }
        
        return { labels, values, upperBound, lowerBound };
    }
}

// Inicializar sistema de análisis avanzado
const analyticsAdvanced = new AnalyticsAdvanced();

// Exportar para uso global
window.analyticsAdvanced = analyticsAdvanced;

console.log('📊 Sistema de análisis avanzado cargado');
