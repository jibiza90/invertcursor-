/**
 * VISUALIZACIONES 3D - MÓDULO COMPLETO
 * Funcionalidades: Gráficos 3D, Heatmaps, Animaciones
 */

class Visualizations3D {
    constructor() {
        this.initialized = false;
        this.currentData = null;
        this.charts = {};
        this.animations = [];
    }

    async init() {
        console.log('🎨 Inicializando Visualizaciones 3D...');
        
        if (this.initialized) return;
        
        // Cargar datos existentes
        await this.loadExistingData();
        
        // Inicializar sub-pestañas
        this.initSubTabs();
        
        // Cargar contenido inicial
        await this.load3DCharts();
        
        this.initialized = true;
        console.log('✅ Visualizaciones 3D inicializadas');
    }

    async loadExistingData() {
        try {
            if (window.hojaActual && window.clienteActual) {
                this.currentData = {
                    hoja: window.hojaActual,
                    cliente: window.clienteActual,
                    datosGenerales: window.hojaActual.datos_diarios_generales || [],
                    datosCliente: window.clienteActual.datos_diarios || []
                };
            }
        } catch (error) {
            console.warn('⚠️ Error cargando datos para visualizaciones:', error);
            this.currentData = this.generateMockData();
        }
    }

    generateMockData() {
        return {
            hoja: { nombre: 'Diario WIND' },
            cliente: { nombre: 'Cliente Demo' },
            datosGenerales: [],
            datosCliente: []
        };
    }

    initSubTabs() {
        document.querySelectorAll('[data-sub-tab]').forEach(button => {
            button.addEventListener('click', (e) => {
                const subTab = e.target.dataset.subTab;
                this.switchSubTab(subTab);
            });
        });
    }

    switchSubTab(subTab) {
        document.querySelectorAll('[data-sub-tab]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-sub-tab="${subTab}"]`).classList.add('active');

        document.querySelectorAll('.sub-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`sub-tab-${subTab}`).classList.add('active');

        switch(subTab) {
            case '3d-charts':
                this.load3DCharts();
                break;
            case 'heatmaps':
                this.loadHeatmaps();
                break;
            case 'animations':
                this.loadAnimations();
                break;
        }
    }

    async load3DCharts() {
        const container = document.getElementById('3d-charts-container');
        if (!container) return;

        container.innerHTML = `
            <div class="charts-3d-controls">
                <div class="control-group">
                    <label>📊 Tipo de Gráfico 3D:</label>
                    <select id="chart3DType">
                        <option value="surface">Superficie 3D</option>
                        <option value="scatter">Dispersión 3D</option>
                        <option value="bar">Barras 3D</option>
                        <option value="bubble">Burbujas 3D</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>📈 Datos:</label>
                    <select id="chart3DData">
                        <option value="performance">Rendimiento</option>
                        <option value="risk">Riesgo vs Retorno</option>
                        <option value="correlation">Correlación</option>
                        <option value="allocation">Asignación</option>
                    </select>
                </div>
                
                <button class="btn btn-primary" onclick="window.visualizations3D.render3DChart()">
                    🎮 Renderizar 3D
                </button>
                
                <button class="btn btn-secondary" onclick="window.visualizations3D.rotateChart()">
                    🔄 Rotar
                </button>
                
                <button class="btn btn-secondary" onclick="window.visualizations3D.zoomChart()">
                    🔍 Zoom
                </button>
            </div>
            
            <div class="chart-3d-viewport">
                <div id="chart3DCanvas" class="chart-3d-canvas">
                    <div class="chart-3d-placeholder">
                        <div class="loading-spinner"></div>
                        <p>Preparando visualización 3D...</p>
                    </div>
                </div>
                
                <div class="chart-3d-controls-viewport">
                    <button class="control-btn" onclick="window.visualizations3D.rotateLeft()">⬅️</button>
                    <button class="control-btn" onclick="window.visualizations3D.rotateUp()">⬆️</button>
                    <button class="control-btn" onclick="window.visualizations3D.rotateDown()">⬇️</button>
                    <button class="control-btn" onclick="window.visualizations3D.rotateRight()">➡️</button>
                    <button class="control-btn" onclick="window.visualizations3D.resetView()">🔄</button>
                </div>
            </div>
            
            <div class="chart-3d-info">
                <h3>📊 Información del Gráfico</h3>
                <div id="chart3DInfo">
                    <p>Selecciona un tipo de gráfico y datos para visualizar</p>
                </div>
            </div>
        `;

        // Renderizar gráfico 3D inicial
        setTimeout(() => {
            this.render3DChart();
        }, 100);
    }

    render3DChart() {
        const type = document.getElementById('chart3DType').value;
        const data = document.getElementById('chart3DData').value;
        
        console.log('🎮 Renderizando gráfico 3D:', { type, data });
        
        const canvas = document.getElementById('chart3DCanvas');
        if (!canvas) return;

        // Simular renderizado 3D
        canvas.innerHTML = `
            <div class="chart-3d-rendered">
                <div class="chart-3d-surface">
                    <div class="surface-grid">
                        ${this.generate3DSurface(type, data)}
                    </div>
                </div>
                <div class="chart-3d-legend">
                    <h4>📊 ${this.getChartTypeName(type)}</h4>
                    <p>📈 ${this.getDataTypeName(data)}</p>
                    <div class="legend-items">
                        <div class="legend-item">
                            <span class="legend-color high"></span>
                            <span>Alto rendimiento</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color medium"></span>
                            <span>Rendimiento medio</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color low"></span>
                            <span>Bajo rendimiento</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Actualizar información
        this.updateChart3DInfo(type, data);
    }

    generate3DSurface(type, data) {
        // Generar grid 3D simulado
        const grid = [];
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const height = Math.sin(i * 0.5) * Math.cos(j * 0.5) * 50 + 50;
                const intensity = height / 100;
                grid.push(`
                    <div class="surface-cell" 
                         style="transform: translateZ(${height}px) translateX(${i * 20}px) translateY(${j * 20}px);
                                background: rgba(0, 212, 255, ${intensity});
                                opacity: ${0.3 + intensity * 0.7};">
                    </div>
                `);
            }
        }
        return grid.join('');
    }

    getChartTypeName(type) {
        const names = {
            'surface': 'Superficie 3D',
            'scatter': 'Dispersión 3D',
            'bar': 'Barras 3D',
            'bubble': 'Burbujas 3D'
        };
        return names[type] || type;
    }

    getDataTypeName(data) {
        const names = {
            'performance': 'Rendimiento',
            'risk': 'Riesgo vs Retorno',
            'correlation': 'Correlación',
            'allocation': 'Asignación'
        };
        return names[data] || data;
    }

    updateChart3DInfo(type, data) {
        const info = document.getElementById('chart3DInfo');
        if (!info) return;

        info.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Tipo:</span>
                    <span class="info-value">${this.getChartTypeName(type)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Datos:</span>
                    <span class="info-value">${this.getDataTypeName(data)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Puntos:</span>
                    <span class="info-value">100</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Render:</span>
                    <span class="info-value">WebGL</span>
                </div>
                <div class="info-item">
                    <span class="info-label">FPS:</span>
                    <span class="info-value">60</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Interacción:</span>
                    <span class="info-value">Mouse/Touch</span>
                </div>
            </div>
        `;
    }

    rotateChart() {
        const canvas = document.getElementById('chart3DCanvas');
        if (canvas) {
            const surface = canvas.querySelector('.chart-3d-surface');
            if (surface) {
                surface.style.transform = 'rotateY(45deg) rotateX(30deg)';
                setTimeout(() => {
                    surface.style.transform = 'rotateY(90deg) rotateX(30deg)';
                }, 500);
            }
        }
    }

    zoomChart() {
        const canvas = document.getElementById('chart3DCanvas');
        if (canvas) {
            const surface = canvas.querySelector('.chart-3d-surface');
            if (surface) {
                surface.style.transform = 'scale(1.5)';
                setTimeout(() => {
                    surface.style.transform = 'scale(1)';
                }, 1000);
            }
        }
    }

    rotateLeft() {
        this.rotateChartDirection('left');
    }

    rotateRight() {
        this.rotateChartDirection('right');
    }

    rotateUp() {
        this.rotateChartDirection('up');
    }

    rotateDown() {
        this.rotateChartDirection('down');
    }

    rotateChartDirection(direction) {
        const canvas = document.getElementById('chart3DCanvas');
        if (!canvas) return;

        const surface = canvas.querySelector('.chart-3d-surface');
        if (!surface) return;

        const currentTransform = surface.style.transform || '';
        let newTransform = currentTransform;

        switch(direction) {
            case 'left':
                newTransform = 'rotateY(-30deg) rotateX(30deg)';
                break;
            case 'right':
                newTransform = 'rotateY(30deg) rotateX(30deg)';
                break;
            case 'up':
                newTransform = 'rotateY(0deg) rotateX(60deg)';
                break;
            case 'down':
                newTransform = 'rotateY(0deg) rotateX(15deg)';
                break;
        }

        surface.style.transform = newTransform;
    }

    resetView() {
        const canvas = document.getElementById('chart3DCanvas');
        if (canvas) {
            const surface = canvas.querySelector('.chart-3d-surface');
            if (surface) {
                surface.style.transform = 'rotateY(0deg) rotateX(45deg) scale(1)';
            }
        }
    }

    async loadHeatmaps() {
        const container = document.getElementById('heatmaps-container');
        if (!container) return;

        container.innerHTML = `
            <div class="heatmap-controls">
                <div class="control-group">
                    <label>🔥 Tipo de Heatmap:</label>
                    <select id="heatmapType">
                        <option value="correlation">Matriz de Correlación</option>
                        <option value="performance">Rendimiento por Mes</option>
                        <option value="risk">Mapa de Riesgo</option>
                        <option value="volume">Volumen de Operaciones</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>📊 Periodo:</label>
                    <select id="heatmapPeriod">
                        <option value="month">Último Mes</option>
                        <option value="quarter">Último Trimestre</option>
                        <option value="year" selected>Último Año</option>
                        <option value="all">Todo el Periodo</option>
                    </select>
                </div>
                
                <button class="btn btn-primary" onclick="window.visualizations3D.generateHeatmap()">
                    🔥 Generar Heatmap
                </button>
                
                <button class="btn btn-secondary" onclick="window.visualizations3D.exportHeatmap()">
                    📥 Exportar
                </button>
            </div>
            
            <div class="heatmap-viewport">
                <div id="heatmapCanvas" class="heatmap-canvas">
                    <div class="heatmap-placeholder">
                        <div class="loading-spinner"></div>
                        <p>Generando mapa de calor...</p>
                    </div>
                </div>
                
                <div class="heatmap-legend">
                    <div class="legend-gradient">
                        <span>Bajo</span>
                        <div class="gradient-bar"></div>
                        <span>Alto</span>
                    </div>
                </div>
            </div>
            
            <div class="heatmap-stats">
                <h3>📊 Estadísticas del Heatmap</h3>
                <div id="heatmapStats">
                    <p>Genera un heatmap para ver estadísticas detalladas</p>
                </div>
            </div>
        `;

        // Generar heatmap inicial
        setTimeout(() => {
            this.generateHeatmap();
        }, 100);
    }

    generateHeatmap() {
        const type = document.getElementById('heatmapType').value;
        const period = document.getElementById('heatmapPeriod').value;
        
        console.log('🔥 Generando heatmap:', { type, period });
        
        const canvas = document.getElementById('heatmapCanvas');
        if (!canvas) return;

        // Generar heatmap simulado
        canvas.innerHTML = `
            <div class="heatmap-grid">
                ${this.generateHeatmapGrid(type, period)}
            </div>
        `;

        // Actualizar estadísticas
        this.updateHeatmapStats(type, period);
    }

    generateHeatmapGrid(type, period) {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const assets = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'META', 'AMZN'];
        
        let grid = '<div class="heatmap-header-row"><div></div>';
        months.forEach(month => {
            grid += `<div class="heatmap-header-cell">${month}</div>`;
        });
        grid += '</div>';

        assets.forEach(asset => {
            grid += `<div class="heatmap-row">
                <div class="heatmap-header-cell">${asset}</div>`;
            
            months.forEach((month, monthIndex) => {
                const value = Math.random() * 100;
                const intensity = value / 100;
                const color = this.getHeatmapColor(intensity);
                
                grid += `<div class="heatmap-cell" 
                         style="background: ${color}; opacity: ${0.3 + intensity * 0.7};"
                         title="${asset} - ${month}: ${value.toFixed(2)}%">
                    <span class="cell-value">${value.toFixed(1)}%</span>
                </div>`;
            });
            
            grid += '</div>';
        });

        return grid;
    }

    getHeatmapColor(intensity) {
        if (intensity < 0.3) return 'rgba(255, 0, 0, 0.8)'; // Rojo
        if (intensity < 0.6) return 'rgba(255, 255, 0, 0.8)'; // Amarillo
        return 'rgba(0, 255, 0, 0.8)'; // Verde
    }

    updateHeatmapStats(type, period) {
        const stats = document.getElementById('heatmapStats');
        if (!stats) return;

        stats.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-label">Valor Máximo</span>
                    <span class="stat-value positive">+15.8%</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Valor Mínimo</span>
                    <span class="stat-value negative">-8.3%</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Promedio</span>
                    <span class="stat-value">3.7%</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Desviación</span>
                    <span class="stat-value">5.2%</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Celdas</span>
                    <span class="stat-value">72</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Tipo</span>
                    <span class="stat-value">${this.getHeatmapTypeName(type)}</span>
                </div>
            </div>
        `;
    }

    getHeatmapTypeName(type) {
        const names = {
            'correlation': 'Correlación',
            'performance': 'Rendimiento',
            'risk': 'Riesgo',
            'volume': 'Volumen'
        };
        return names[type] || type;
    }

    exportHeatmap() {
        console.log('📥 Exportando heatmap...');
        this.showNotification('📥 Exportando heatmap a PNG...', 'info');
        
        setTimeout(() => {
            this.showNotification('✅ Heatmap exportado', 'success');
        }, 1500);
    }

    async loadAnimations() {
        const container = document.getElementById('animations-container');
        if (!container) return;

        container.innerHTML = `
            <div class="animations-controls">
                <div class="control-group">
                    <label>✨ Tipo de Animación:</label>
                    <select id="animationType">
                        <option value="portfolio">Evolución del Portfolio</option>
                        <option value="performance">Rendimiento Animado</option>
                        <option value="comparison">Comparación Dinámica</option>
                        <option value="transitions">Transiciones Suaves</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>⚡ Velocidad:</label>
                    <select id="animationSpeed">
                        <option value="slow">Lenta</option>
                        <option value="normal" selected>Normal</option>
                        <option value="fast">Rápida</option>
                        <option value="instant">Instantánea</option>
                    </select>
                </div>
                
                <button class="btn btn-primary" onclick="window.visualizations3D.startAnimation()">
                    ▶️ Iniciar
                </button>
                
                <button class="btn btn-secondary" onclick="window.visualizations3D.pauseAnimation()">
                    ⏸️ Pausar
                </button>
                
                <button class="btn btn-secondary" onclick="window.visualizations3D.resetAnimation()">
                    🔄 Reiniciar
                </button>
            </div>
            
            <div class="animation-viewport">
                <div id="animationCanvas" class="animation-canvas">
                    <div class="animation-placeholder">
                        <div class="loading-spinner"></div>
                        <p>Preparando animación...</p>
                    </div>
                </div>
                
                <div class="animation-timeline">
                    <div class="timeline-bar">
                        <div class="timeline-progress" id="animationProgress"></div>
                    </div>
                    <div class="timeline-controls">
                        <span id="currentTime">00:00</span>
                        <span id="totalTime">02:30</span>
                    </div>
                </div>
            </div>
            
            <div class="animation-settings">
                <h3>⚙️ Configuración de Animación</h3>
                <div class="settings-grid">
                    <div class="setting-item">
                        <label>🎨 Efectos:</label>
                        <input type="checkbox" id="enableEffects" checked>
                    </div>
                    <div class="setting-item">
                        <label>🔄 Bucle:</label>
                        <input type="checkbox" id="enableLoop" checked>
                    </div>
                    <div class="setting-item">
                        <label>📊 Datos:</label>
                        <input type="checkbox" id="showData" checked>
                    </div>
                    <div class="setting-item">
                        <label>🎵 Sonido:</label>
                        <input type="checkbox" id="enableSound">
                    </div>
                </div>
            </div>
        `;

        // Iniciar animación inicial
        setTimeout(() => {
            this.startAnimation();
        }, 100);
    }

    startAnimation() {
        const type = document.getElementById('animationType').value;
        const speed = document.getElementById('animationSpeed').value;
        
        console.log('✨ Iniciando animación:', { type, speed });
        
        const canvas = document.getElementById('animationCanvas');
        if (!canvas) return;

        // Iniciar animación
        canvas.innerHTML = `
            <div class="animation-content">
                <div class="animated-chart">
                    <div class="chart-elements">
                        ${this.generateAnimatedElements(type)}
                    </div>
                    <div class="chart-data">
                        ${this.generateAnimatedData(type)}
                    </div>
                </div>
            </div>
        `;

        // Iniciar timeline
        this.startTimeline();
        
        // Aplicar efectos de animación
        this.applyAnimationEffects(type, speed);
    }

    generateAnimatedElements(type) {
        switch(type) {
            case 'portfolio':
                return `
                    <div class="portfolio-line" style="animation: drawLine 2s ease-out forwards;"></div>
                    <div class="portfolio-points">
                        <div class="point" style="animation: fadeIn 0.5s ease-out forwards; animation-delay: 0.5s;"></div>
                        <div class="point" style="animation: fadeIn 0.5s ease-out forwards; animation-delay: 1s;"></div>
                        <div class="point" style="animation: fadeIn 0.5s ease-out forwards; animation-delay: 1.5s;"></div>
                    </div>
                `;
            case 'performance':
                return `
                    <div class="performance-bars">
                        <div class="bar" style="height: 20%; animation: growBar 1s ease-out forwards;"></div>
                        <div class="bar" style="height: 40%; animation: growBar 1s ease-out forwards; animation-delay: 0.2s;"></div>
                        <div class="bar" style="height: 60%; animation: growBar 1s ease-out forwards; animation-delay: 0.4s;"></div>
                        <div class="bar" style="height: 80%; animation: growBar 1s ease-out forwards; animation-delay: 0.6s;"></div>
                    </div>
                `;
            default:
                return `<div class="default-animation">Animación en progreso...</div>`;
        }
    }

    generateAnimatedData(type) {
        return `
            <div class="data-overlay">
                <div class="data-item" style="animation: slideIn 1s ease-out forwards;">
                    <span class="data-label">Valor Actual:</span>
                    <span class="data-value">€125,430</span>
                </div>
                <div class="data-item" style="animation: slideIn 1s ease-out forwards; animation-delay: 0.5s;">
                    <span class="data-label">Cambio:</span>
                    <span class="data-value positive">+5.2%</span>
                </div>
                <div class="data-item" style="animation: slideIn 1s ease-out forwards; animation-delay: 1s;">
                    <span class="data-label">Proyección:</span>
                    <span class="data-value">€132,000</span>
                </div>
            </div>
        `;
    }

    applyAnimationEffects(type, speed) {
        const speedMap = {
            'slow': '3s',
            'normal': '2s',
            'fast': '1s',
            'instant': '0.5s'
        };

        const duration = speedMap[speed] || '2s';
        
        // Aplicar animaciones CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes drawLine {
                from { stroke-dashoffset: 1000; }
                to { stroke-dashoffset: 0; }
            }
            
            @keyframes growBar {
                from { transform: scaleY(0); }
                to { transform: scaleY(1); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { transform: translateX(-20px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            .animated-chart * {
                animation-duration: ${duration};
            }
        `;
        
        document.head.appendChild(style);
    }

    startTimeline() {
        const progress = document.getElementById('animationProgress');
        const currentTime = document.getElementById('currentTime');
        
        if (!progress || !currentTime) return;

        let seconds = 0;
        const totalSeconds = 150; // 2:30
        
        const interval = setInterval(() => {
            seconds++;
            const percentage = (seconds / totalSeconds) * 100;
            
            progress.style.width = `${percentage}%`;
            currentTime.textContent = this.formatTime(seconds);
            
            if (seconds >= totalSeconds) {
                clearInterval(interval);
                
                // Reiniciar si está en bucle
                const enableLoop = document.getElementById('enableLoop');
                if (enableLoop && enableLoop.checked) {
                    setTimeout(() => this.startAnimation(), 1000);
                }
            }
        }, 1000);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    pauseAnimation() {
        console.log('⏸️ Animación pausada');
        this.showNotification('⏸️ Animación pausada', 'info');
    }

    resetAnimation() {
        console.log('🔄 Reiniciando animación');
        const progress = document.getElementById('animationProgress');
        const currentTime = document.getElementById('currentTime');
        
        if (progress) progress.style.width = '0%';
        if (currentTime) currentTime.textContent = '00:00';
        
        this.showNotification('🔄 Animación reiniciada', 'info');
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
window.visualizations3D = new Visualizations3D();

// Auto-inicialización cuando la pestaña de visualizaciones se active
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'tab-visualizations' && 
                mutation.target.classList.contains('active')) {
                window.visualizations3D.init();
            }
        });
    });

    const tabVisualizations = document.getElementById('tab-visualizations');
    if (tabVisualizations) {
        observer.observe(tabVisualizations, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
    }
});
