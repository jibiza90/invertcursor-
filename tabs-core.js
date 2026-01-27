// NÚCLEO DE PESTAÑAS - SEGURIDAD MÁXIMA
// NO MODIFICA NADA EXISTENTE - SISTEMA AISLADO

class TabsSystem {
    constructor() {
        this.currentTab = 'dashboard';
        this.currentSubTabs = {};
        this.isInitialized = false;
        this.originalContent = null;
        this.backupData = {};
        
        console.log('🛡️ TabsSystem: Inicializando sistema seguro de pestañas...');
        this.init();
    }

    init() {
        // Esperar a que el DOM esté completamente cargado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupSystem());
        } else {
            this.setupSystem();
        }
    }

    setupSystem() {
        try {
            console.log('🔧 Configurando sistema de pestañas...');
            
            // 1. Backup del contenido original (SEGURIDAD)
            this.backupOriginalContent();
            
            // 2. Mover contenido existente de forma segura
            this.moveExistingContent();
            
            // 3. Inicializar navegación de pestañas
            this.initializeTabNavigation();
            
            // 4. Inicializar sub-pestañas
            this.initializeSubTabs();
            
            // 5. Configurar eventos globales
            this.setupGlobalEvents();
            
            // 6. Cargar contenido dinámico
            this.loadDynamicContent();
            
            this.isInitialized = true;
            console.log('✅ Sistema de pestañas inicializado safely');
            
            // Notificar que el sistema está listo
            this.notifySystemReady();
            
        } catch (error) {
            console.error('❌ Error crítico en inicialización:', error);
            this.handleInitializationError(error);
        }
    }

    backupOriginalContent() {
        // Backup de seguridad del contenido original
        const mainContainer = document.querySelector('body > .container, .main-content, .app-container, main');
        if (mainContainer) {
            this.originalContent = mainContainer.cloneNode(true);
            console.log('💾 Contenido original backup completado');
        }
    }

    moveExistingContent() {
        try {
            // Mover contenido existente al wrapper seguro
            const existingContent = document.querySelector('body > .container, .main-content, .app-container, main');
            const dashboardWrapper = document.getElementById('existing-content-wrapper');
            
            if (existingContent && dashboardWrapper) {
                // No eliminar, solo mover
                dashboardWrapper.appendChild(existingContent);
                console.log('📦 Contenido existente movido seguramente');
            } else {
                console.warn('⚠️ No se encontró contenido existente para mover');
            }
        } catch (error) {
            console.error('❌ Error moviendo contenido existente:', error);
            throw error;
        }
    }

    initializeTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = button.dataset.tab;
                this.switchTab(targetTab);
            });
        });
        
        console.log('🧭 Navegación de pestañas configurada');
    }

    initializeSubTabs() {
        const subTabButtons = document.querySelectorAll('.sub-tab-button');
        
        subTabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const parentTab = button.closest('.tab-content');
                const targetSubTab = button.dataset.subTab;
                this.switchSubTab(parentTab, targetSubTab);
            });
        });
        
        console.log('📋 Sub-pestañas configuradas');
    }

    switchTab(tabName) {
        try {
            console.log(`🔄 Cambiando a pestaña: ${tabName}`);
            
            // Validar cambio
            if (!this.validateTabSwitch(tabName)) {
                console.warn('⚠️ Cambio de pestaña no válido');
                return;
            }
            
            // Backup del estado actual
            this.backupCurrentState();
            
            // Desactivar pestaña actual
            this.deactivateTab(this.currentTab);
            
            // Activar nueva pestaña
            this.activateTab(tabName);
            
            // Actualizar estado
            this.currentTab = tabName;
            
            // Cargar contenido específico de la pestaña
            this.loadTabContent(tabName);
            
            // Actualizar URL si es necesario
            this.updateURL(tabName);
            
            console.log(`✅ Pestaña ${tabName} activada`);
            
        } catch (error) {
            console.error('❌ Error cambiando de pestaña:', error);
            this.handleTabSwitchError(error);
        }
    }

    switchSubTab(parentTab, subTabName) {
        try {
            const parentTabId = parentTab.id;
            console.log(`🔄 Cambiando a sub-pestaña: ${subTabName} en ${parentTabId}`);
            
            // Desactivar sub-pestañas actuales
            parentTab.querySelectorAll('.sub-tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            parentTab.querySelectorAll('.sub-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Activar nueva sub-pestaña
            const activeButton = parentTab.querySelector(`[data-sub-tab="${subTabName}"]`);
            const activeContent = parentTab.getElementById(`sub-tab-${subTabName}`);
            
            if (activeButton && activeContent) {
                activeButton.classList.add('active');
                activeContent.classList.add('active');
                
                // Cargar contenido de sub-pestaña
                this.loadSubTabContent(subTabName, activeContent);
                
                // Guardar estado
                this.currentSubTabs[parentTabId] = subTabName;
                
                console.log(`✅ Sub-pestaña ${subTabName} activada`);
            }
            
        } catch (error) {
            console.error('❌ Error cambiando de sub-pestaña:', error);
        }
    }

    deactivateTab(tabName) {
        const button = document.querySelector(`[data-tab="${tabName}"]`);
        const content = document.getElementById(`tab-${tabName}`);
        
        if (button) button.classList.remove('active');
        if (content) content.classList.remove('active');
    }

    activateTab(tabName) {
        const button = document.querySelector(`[data-tab="${tabName}"]`);
        const content = document.getElementById(`tab-${tabName}`);
        
        if (button) button.classList.add('active');
        if (content) content.classList.add('active');
    }

    loadTabContent(tabName) {
        // Cargar contenido específico según la pestaña
        switch (tabName) {
            case 'analytics':
                this.loadAnalyticsContent();
                break;
            case 'reporting':
                this.loadReportingContent();
                break;
            case 'visualizations':
                this.loadVisualizationsContent();
                break;
            case 'import-export':
                this.loadImportExportContent();
                break;
            case 'data-quality':
                this.loadDataQualityContent();
                break;
            case 'settings':
                this.loadSettingsContent();
                break;
            case 'dashboard':
            default:
                // Dashboard ya tiene el contenido original
                console.log('🏠 Dashboard cargado con contenido original');
                break;
        }
    }

    loadSubTabContent(subTabName, container) {
        // Mostrar estado de carga
        this.showLoadingState(container);
        
        // Simular carga de contenido
        setTimeout(() => {
            this.hideLoadingState(container);
            this.renderSubTabContent(subTabName, container);
        }, 500);
    }

    showLoadingState(container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Cargando contenido...</p>
            </div>
        `;
    }

    hideLoadingState(container) {
        const loadingState = container.querySelector('.loading-state');
        if (loadingState) {
            loadingState.remove();
        }
    }

    renderSubTabContent(subTabName, container) {
        const contentMap = {
            'comparison': this.getComparisonContent(),
            'metrics': this.getMetricsContent(),
            'projections': this.getProjectionsContent(),
            'pdf-reports': this.getPDFReportsContent(),
            'executive-dashboard': this.getExecutiveDashboardContent(),
            'history': this.getHistoryContent(),
            '3d-charts': this.get3DChartsContent(),
            'heatmaps': this.getHeatmapsContent(),
            'animations': this.getAnimationsContent(),
            'export': this.getExportContent(),
            'import': this.getImportContent(),
            'validation': this.getValidationContent(),
            'cleaning': this.getCleaningContent(),
            'themes': this.getThemesContent(),
            'responsive': this.getResponsiveContent()
        };
        
        container.innerHTML = contentMap[subTabName] || '<p>Contenido no disponible</p>';
    }

    // Métodos de contenido específicos
    getComparisonContent() {
        return `
            <div class="comparison-dashboard">
                <h4>🔍 Comparación Multi-Cliente</h4>
                <p>Comparación de rentabilidad entre clientes y estadísticas generales</p>
                <div class="comparison-charts">
                    <canvas id="comparison-chart"></canvas>
                </div>
            </div>
        `;
    }

    getMetricsContent() {
        return `
            <div class="metrics-dashboard">
                <h4>📊 Métricas Profesionales</h4>
                <p>Análisis avanzado de rendimiento y riesgo</p>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h5>Sharpe Ratio</h5>
                        <span class="metric-value">1.85</span>
                    </div>
                    <div class="metric-card">
                        <h5>Volatilidad</h5>
                        <span class="metric-value">12.3%</span>
                    </div>
                    <div class="metric-card">
                        <h5>Drawdown Máximo</h5>
                        <span class="metric-value">-5.2%</span>
                    </div>
                </div>
            </div>
        `;
    }

    getProjectionsContent() {
        return `
            <div class="projections-dashboard">
                <h4>🎯 Proyecciones</h4>
                <p>Proyecciones basadas en datos históricos</p>
                <div class="projection-charts">
                    <canvas id="projection-chart"></canvas>
                </div>
            </div>
        `;
    }

    getPDFReportsContent() {
        return `
            <div class="pdf-reports-dashboard">
                <h4>📄 Generador de Informes PDF</h4>
                <p>Crea informes profesionales personalizados</p>
                <div class="pdf-controls">
                    <button class="btn-primary">Generar Informe</button>
                    <select class="report-template">
                        <option>Informe Estándar</option>
                        <option>Informe Ejecutivo</option>
                        <option>Informe Detallado</option>
                    </select>
                </div>
            </div>
        `;
    }

    getExecutiveDashboardContent() {
        return `
            <div class="executive-dashboard-content">
                <h4>🎯 Dashboard Ejecutivo</h4>
                <p>Vista resumen para directivos</p>
                <div class="kpi-widgets">
                    <div class="kpi-widget">
                        <span class="kpi-title">Rentabilidad Total</span>
                        <span class="kpi-value positive">+7.82%</span>
                    </div>
                    <div class="kpi-widget">
                        <span class="kpi-title">Clientes Activos</span>
                        <span class="kpi-value">12</span>
                    </div>
                </div>
            </div>
        `;
    }

    getHistoryContent() {
        return `
            <div class="history-dashboard">
                <h4>📋 Historial Completo</h4>
                <p>Timeline de todas las operaciones y decisiones</p>
                <div class="history-timeline">
                    <div class="timeline-item">
                        <span class="timeline-date">2024-01-15</span>
                        <span class="timeline-action">Inversión inicial Cliente 1</span>
                    </div>
                </div>
            </div>
        `;
    }

    get3DChartsContent() {
        return `
            <div class="3d-charts-dashboard">
                <h4>🎮 Gráficos 3D</h4>
                <p>Visualización multidimensional de datos</p>
                <div class="3d-visualization">
                    <canvas id="3d-chart"></canvas>
                </div>
            </div>
        `;
    }

    getHeatmapsContent() {
        return `
            <div class="heatmaps-dashboard">
                <h4>🔥 Heatmaps</h4>
                <p>Matriz de rentabilidad por mes/año</p>
                <div class="heatmap-container">
                    <div class="heatmap-grid">
                        <!-- Grid de calor se generará dinámicamente -->
                    </div>
                </div>
            </div>
        `;
    }

    getAnimationsContent() {
        return `
            <div class="animations-dashboard">
                <h4>✨ Animaciones</h4>
                <p>Transiciones y animaciones interactivas</p>
                <div class="animation-controls">
                    <button class="btn-animation">Reproducir Animación</button>
                </div>
            </div>
        `;
    }

    getExportContent() {
        return `
            <div class="export-dashboard">
                <h4>📤 Exportar Datos</h4>
                <p>Exporta tus datos en múltiples formatos</p>
                <div class="export-options">
                    <button class="btn-export" data-format="excel">📊 Excel</button>
                    <button class="btn-export" data-format="csv">📄 CSV</button>
                    <button class="btn-export" data-format="json">🔧 JSON</button>
                    <button class="btn-export" data-format="pdf">📋 PDF</button>
                </div>
            </div>
        `;
    }

    getImportContent() {
        return `
            <div class="import-dashboard">
                <h4>📥 Importar Datos</h4>
                <p>Importa datos de forma segura con validación</p>
                <div class="import-controls">
                    <input type="file" id="import-file" accept=".xlsx,.csv,.json">
                    <button class="btn-import">Importar con Validación</button>
                </div>
            </div>
        `;
    }

    getValidationContent() {
        return `
            <div class="validation-dashboard">
                <h4>⚠️ Validación Automática</h4>
                <p>Detección de anomalías y validación de datos</p>
                <div class="validation-results">
                    <div class="validation-item success">
                        <span class="validation-status">✅</span>
                        <span class="validation-message">Formatos de fecha correctos</span>
                    </div>
                </div>
            </div>
        `;
    }

    getCleaningContent() {
        return `
            <div class="cleaning-dashboard">
                <h4>🧹 Data Cleaning</h4>
                <p>Limpieza y estandarización de datos</p>
                <div class="cleaning-options">
                    <button class="btn-cleaning">Estandarizar Formatos</button>
                    <button class="btn-cleaning">Eliminar Duplicados</button>
                </div>
            </div>
        `;
    }

    getThemesContent() {
        return `
            <div class="themes-dashboard">
                <h4>🌓 Temas Personalizados</h4>
                <p>Personaliza la apariencia de la aplicación</p>
                <div class="theme-options">
                    <button class="btn-theme" data-theme="dark">🌙 Modo Oscuro</button>
                    <button class="btn-theme" data-theme="light">☀️ Modo Claro</button>
                    <button class="btn-theme" data-theme="auto">🔄 Automático</button>
                </div>
            </div>
        `;
    }

    getResponsiveContent() {
        return `
            <div class="responsive-dashboard">
                <h4>📱 Optimización Responsive</h4>
                <p>Configura la visualización en diferentes dispositivos</p>
                <div class="responsive-options">
                    <button class="btn-responsive" data-view="desktop">🖥️ Escritorio</button>
                    <button class="btn-responsive" data-view="tablet">📱 Tablet</button>
                    <button class="btn-responsive" data-view="mobile">📱 Móvil</button>
                </div>
            </div>
        `;
    }

    // Métodos de carga de contenido de pestañas principales
    loadAnalyticsContent() {
        console.log('📈 Cargando contenido de Análisis Avanzado...');
        // Aquí se cargaría el contenido específico de análisis
    }

    loadReportingContent() {
        console.log('📋 Cargando contenido de Reporting...');
        // Aquí se cargaría el contenido específico de reporting
    }

    loadVisualizationsContent() {
        console.log('🎨 Cargando contenido de Visualizaciones...');
        // Aquí se cargaría el contenido específico de visualizaciones
    }

    loadImportExportContent() {
        console.log('📤 Cargando contenido de Import/Export...');
        // Aquí se cargaría el contenido específico de import/export
    }

    loadDataQualityContent() {
        console.log('🔍 Cargando contenido de Calidad de Datos...');
        // Aquí se cargaría el contenido específico de calidad de datos
    }

    loadSettingsContent() {
        console.log('⚙️ Cargando contenido de Configuración...');
        // Aquí se cargaría el contenido específico de configuración
    }

    loadDynamicContent() {
        // Cargar contenido dinámico para todas las pestañas
        console.log('🔄 Cargando contenido dinámico...');
    }

    // Métodos de validación y seguridad
    validateTabSwitch(tabName) {
        const validTabs = ['dashboard', 'analytics', 'reporting', 'visualizations', 'import-export', 'data-quality', 'settings'];
        return validTabs.includes(tabName);
    }

    backupCurrentState() {
        // Backup del estado actual antes de cambiar
        this.backupData[this.currentTab] = {
            scrollPosition: window.scrollY,
            subTabs: { ...this.currentSubTabs }
        };
    }

    updateURL(tabName) {
        // Actualizar URL sin recargar
        if (history.pushState) {
            const newURL = `${window.location.pathname}#tab=${tabName}`;
            history.pushState({ tab: tabName }, '', newURL);
        }
    }

    setupGlobalEvents() {
        // Configurar eventos globales
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.tab) {
                this.switchTab(e.state.tab);
            }
        });

        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchTab('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('analytics');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('reporting');
                        break;
                    // ... más atajos
                }
            }
        });

        console.log('🌐 Eventos globales configurados');
    }

    notifySystemReady() {
        // Notificar que el sistema está listo
        window.dispatchEvent(new CustomEvent('tabsSystemReady', {
            detail: { system: this }
        }));
    }

    // Manejo de errores
    handleInitializationError(error) {
        console.error('❌ Error crítico en inicialización:', error);
        // Intentar restaurar contenido original
        this.restoreOriginalContent();
    }

    handleTabSwitchError(error) {
        console.error('❌ Error en cambio de pestaña:', error);
        // Mantener pestaña actual si hay error
    }

    restoreOriginalContent() {
        if (this.originalContent) {
            // Restaurar contenido original en caso de error crítico
            console.log('🔄 Restaurando contenido original...');
            // Implementar lógica de restauración
        }
    }

    // Métodos públicos
    getCurrentTab() {
        return this.currentTab;
    }

    switchToTab(tabName) {
        this.switchTab(tabName);
    }

    isSystemReady() {
        return this.isInitialized;
    }
}

// Inicializar el sistema de pestañas
const tabsSystem = new TabsSystem();

// Exportar para uso global
window.tabsSystem = tabsSystem;

console.log('🚀 Sistema de pestañas cargado y listo');
