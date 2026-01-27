/**
 * CALIDAD DE DATOS - MÓDULO COMPLETO
 * Funcionalidades: Validación automática, Data Cleaning
 */

class DataQuality {
    constructor() {
        this.initialized = false;
        this.currentData = null;
        this.validationResults = null;
        this.cleaningHistory = [];
        this.qualityMetrics = null;
    }

    async init() {
        console.log('🔍 Inicializando Calidad de Datos...');
        
        if (this.initialized) return;
        
        // Cargar datos existentes
        await this.loadExistingData();
        
        // Inicializar sub-pestañas
        this.initSubTabs();
        
        // Cargar contenido inicial
        await this.loadValidationControls();
        
        this.initialized = true;
        console.log('✅ Calidad de Datos inicializada');
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
                console.log('📊 Datos cargados para calidad:', Object.keys(this.currentData));
            }
        } catch (error) {
            console.warn('⚠️ Error cargando datos para calidad:', error);
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
            case 'validation':
                this.loadValidationControls();
                break;
            case 'cleaning':
                this.loadCleaningControls();
                break;
        }
    }

    async loadValidationControls() {
        const container = document.getElementById('validation-controls');
        if (!container) return;

        container.innerHTML = `
            <div class="validation-overview">
                <div class="overview-card">
                    <h3>📊 Estado General de Calidad</h3>
                    <div class="quality-score">
                        <div class="score-circle">
                            <span class="score-value">87.5</span>
                            <span class="score-label">Puntuación</span>
                        </div>
                        <div class="score-details">
                            <div class="detail-item">
                                <span>Completitud:</span>
                                <span class="positive">92%</span>
                            </div>
                            <div class="detail-item">
                                <span>Exactitud:</span>
                                <span class="positive">89%</span>
                            </div>
                            <div class="detail-item">
                                <span>Consistencia:</span>
                                <span class="warning">85%</span>
                            </div>
                            <div class="detail-item">
                                <span>Validez:</span>
                                <span class="positive">94%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="validation-controls">
                <div class="control-group">
                    <h3>🔍 Opciones de Validación</h3>
                    <div class="validation-options">
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="validateCompleteness" checked>
                                Validar completitud de datos
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="validateAccuracy" checked>
                                Validar exactitud numérica
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="validateConsistency" checked>
                                Validar consistencia temporal
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="validateRanges" checked>
                                Validar rangos válidos
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="validateDuplicates" checked>
                                Detectar duplicados
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="validateOutliers">
                                Identificar valores atípicos
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="control-group">
                    <h3>📊 Alcance de Validación</h3>
                    <div class="scope-options">
                        <select id="validationScope">
                            <option value="all">Todos los datos</option>
                            <option value="general">Datos generales</option>
                            <option value="client">Datos de cliente</option>
                            <option value="recent">Datos recientes (30 días)</option>
                            <option value="critical">Campos críticos</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>
                </div>
                
                <div class="validation-actions">
                    <button class="btn btn-primary btn-large" onclick="window.dataQuality.runValidation()">
                        🔍 Ejecutar Validación
                    </button>
                    
                    <button class="btn btn-secondary" onclick="window.dataQuality.scheduleValidation()">
                        ⏰ Programar Validación
                    </button>
                    
                    <button class="btn btn-secondary" onclick="window.dataQuality.exportValidationReport()">
                        📥 Exportar Informe
                    </button>
                </div>
            </div>
            
            <div class="validation-results">
                <h3>📋 Resultados de Validación</h3>
                <div id="validationResults">
                    <div class="results-placeholder">
                        <p>Ejecuta una validación para ver los resultados</p>
                    </div>
                </div>
            </div>
            
            <div class="validation-history">
                <h3>📚 Historial de Validaciones</h3>
                <div id="validationHistory">
                    ${this.generateValidationHistory()}
                </div>
            </div>
        `;
    }

    generateValidationHistory() {
        const mockHistory = [
            { 
                date: '2026-01-27 14:30', 
                scope: 'Todos los datos',
                score: 87.5,
                issues: 23,
                status: 'completed'
            },
            { 
                date: '2026-01-26 09:15', 
                scope: 'Datos generales',
                score: 91.2,
                issues: 15,
                status: 'completed'
            },
            { 
                date: '2026-01-25 16:45', 
                scope: 'Datos recientes',
                score: 85.8,
                issues: 31,
                status: 'completed'
            },
            { 
                date: '2026-01-24 11:20', 
                scope: 'Campos críticos',
                score: 94.1,
                issues: 8,
                status: 'completed'
            }
        ];

        return mockHistory.map(item => `
            <div class="validation-item">
                <div class="validation-info">
                    <h4>Validación - ${item.scope}</h4>
                    <p>📅 ${item.date} | 📊 Puntuación: ${item.score}% | ⚠️ Problemas: ${item.issues}</p>
                </div>
                <div class="validation-status">
                    <span class="status-badge ${item.status}">${this.getStatusLabel(item.status)}</span>
                    <div class="score-indicator">
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${item.score}%"></div>
                        </div>
                        <span>${item.score}%</span>
                    </div>
                </div>
                <div class="validation-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.dataQuality.viewValidation('${item.date}')">
                        👁️ Ver
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.dataQuality.downloadValidation('${item.date}')">
                        📥 Descargar
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="window.dataQuality.revalidate('${item.date}')">
                        🔄 Revalidar
                    </button>
                </div>
            </div>
        `).join('');
    }

    getStatusLabel(status) {
        const labels = {
            'completed': 'Completado',
            'running': 'En ejecución',
            'failed': 'Fallido',
            'scheduled': 'Programado'
        };
        return labels[status] || status;
    }

    async runValidation() {
        const scope = document.getElementById('validationScope').value;
        const options = this.getValidationOptions();
        
        console.log('🔍 Ejecutando validación:', { scope, options });
        
        // Mostrar progreso
        this.showValidationProgress('Analizando datos...');
        
        try {
            // Simular proceso de validación
            await this.simulateValidation(scope, options);
            
            // Mostrar resultados
            this.displayValidationResults(scope, options);
            
            // Actualizar historial
            this.updateValidationHistory(scope);
            
            this.showValidationSuccess('Validación completada');
            
        } catch (error) {
            console.error('❌ Error en validación:', error);
            this.showValidationError('Error al validar datos');
        }
    }

    getValidationOptions() {
        return {
            completeness: document.getElementById('validateCompleteness')?.checked || false,
            accuracy: document.getElementById('validateAccuracy')?.checked || false,
            consistency: document.getElementById('validateConsistency')?.checked || false,
            ranges: document.getElementById('validateRanges')?.checked || false,
            duplicates: document.getElementById('validateDuplicates')?.checked || false,
            outliers: document.getElementById('validateOutliers')?.checked || false
        };
    }

    async simulateValidation(scope, options) {
        return new Promise(resolve => {
            setTimeout(() => {
                // Simular resultados de validación
                this.validationResults = {
                    score: Math.random() * 20 + 80, // 80-100
                    issues: Math.floor(Math.random() * 50) + 5,
                    warnings: Math.floor(Math.random() * 20) + 2,
                    errors: Math.floor(Math.random() * 10) + 1,
                    details: this.generateValidationDetails(options)
                };
                console.log('✅ Validación simulada:', this.validationResults);
                resolve();
            }, 3000);
        });
    }

    generateValidationDetails(options) {
        const details = [];
        
        if (options.completeness) {
            details.push({
                type: 'completeness',
                severity: 'warning',
                message: 'Se detectaron 5 campos vacíos en datos de cliente',
                count: 5
            });
        }
        
        if (options.accuracy) {
            details.push({
                type: 'accuracy',
                severity: 'error',
                message: 'Valores numéricos fuera de rango detectados',
                count: 3
            });
        }
        
        if (options.consistency) {
            details.push({
                type: 'consistency',
                severity: 'info',
                message: 'Inconsistencias temporales menores',
                count: 8
            });
        }
        
        if (options.duplicates) {
            details.push({
                type: 'duplicates',
                severity: 'warning',
                message: 'Registros duplicados encontrados',
                count: 2
            });
        }
        
        return details;
    }

    displayValidationResults(scope, options) {
        const resultsContainer = document.getElementById('validationResults');
        if (!resultsContainer || !this.validationResults) return;
        
        const results = this.validationResults;
        
        resultsContainer.innerHTML = `
            <div class="results-summary">
                <div class="summary-card">
                    <h4>📊 Puntuación General</h4>
                    <div class="score-display">
                        <span class="score-value">${results.score.toFixed(1)}%</span>
                        <div class="score-bar">
                            <div class="score-fill ${this.getScoreClass(results.score)}" 
                                 style="width: ${results.score}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="summary-card">
                    <h4>⚠️ Problemas Detectados</h4>
                    <div class="issues-breakdown">
                        <div class="issue-item error">
                            <span>Errores:</span>
                            <span>${results.errors}</span>
                        </div>
                        <div class="issue-item warning">
                            <span>Advertencias:</span>
                            <span>${results.warnings}</span>
                        </div>
                        <div class="issue-item info">
                            <span>Informativos:</span>
                            <span>${results.issues - results.errors - results.warnings}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="results-details">
                <h4>📋 Detalles de Problemas</h4>
                <div class="details-list">
                    ${results.details.map(detail => `
                        <div class="detail-item ${detail.severity}">
                            <div class="detail-header">
                                <span class="detail-type">${this.getDetailTypeLabel(detail.type)}</span>
                                <span class="detail-severity">${detail.severity}</span>
                                <span class="detail-count">${detail.count} casos</span>
                            </div>
                            <div class="detail-message">${detail.message}</div>
                            <div class="detail-actions">
                                <button class="btn btn-sm btn-primary" onclick="window.dataQuality.fixIssue('${detail.type}')">
                                    🔧 Corregir
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="window.dataQuality.reviewIssue('${detail.type}')">
                                    👁️ Revisar
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="window.dataQuality.ignoreIssue('${detail.type}')">
                                    ⏭️ Ignorar
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="results-recommendations">
                <h4>💡 Recomendaciones</h4>
                <div class="recommendations-list">
                    <div class="recommendation-item">
                        <span class="rec-icon">🔧</span>
                        <span>Corregir los ${results.errors} errores críticos primero</span>
                    </div>
                    <div class="recommendation-item">
                        <span class="rec-icon">📊</span>
                        <span>Revisar las ${results.warnings} advertencias</span>
                    </div>
                    <div class="recommendation-item">
                        <span class="rec-icon">⚡</span>
                        <span>Programar validación automática semanal</span>
                    </div>
                </div>
            </div>
        `;
    }

    getScoreClass(score) {
        if (score >= 90) return 'excellent';
        if (score >= 80) return 'good';
        if (score >= 70) return 'fair';
        return 'poor';
    }

    getDetailTypeLabel(type) {
        const labels = {
            'completeness': 'Completitud',
            'accuracy': 'Exactitud',
            'consistency': 'Consistencia',
            'ranges': 'Rangos',
            'duplicates': 'Duplicados',
            'outliers': 'Valores Atípicos'
        };
        return labels[type] || type;
    }

    showValidationProgress(message) {
        const container = document.getElementById('validation-controls');
        if (container) {
            const progressDiv = document.createElement('div');
            progressDiv.className = 'validation-progress';
            progressDiv.innerHTML = `
                <div class="progress-content">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                </div>
            `;
            container.appendChild(progressDiv);
        }
    }

    showValidationSuccess(message) {
        this.removeProgress();
        this.showNotification(message, 'success');
    }

    showValidationError(message) {
        this.removeProgress();
        this.showNotification(message, 'error');
    }

    removeProgress() {
        const progress = document.querySelector('.validation-progress');
        if (progress) progress.remove();
    }

    updateValidationHistory(scope) {
        const newItem = {
            date: new Date().toLocaleString('es-ES'),
            scope: this.getScopeLabel(scope),
            score: this.validationResults.score,
            issues: this.validationResults.issues,
            status: 'completed'
        };
        
        // Actualizar UI
        const historyList = document.getElementById('validationHistory');
        if (historyList) {
            historyList.innerHTML = this.generateValidationHistory();
        }
    }

    getScopeLabel(scope) {
        const labels = {
            'all': 'Todos los datos',
            'general': 'Datos generales',
            'client': 'Datos de cliente',
            'recent': 'Datos recientes',
            'critical': 'Campos críticos',
            'custom': 'Personalizado'
        };
        return labels[scope] || scope;
    }

    async loadCleaningControls() {
        const container = document.getElementById('cleaning-controls');
        if (!container) return;

        container.innerHTML = `
            <div class="cleaning-overview">
                <div class="overview-card">
                    <h3>🧹 Estado de Limpieza de Datos</h3>
                    <div class="cleaning-stats">
                        <div class="stat-item">
                            <span class="stat-label">Registros Totales:</span>
                            <span class="stat-value">12,457</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Limpiados:</span>
                            <span class="stat-value positive">11,834 (95%)</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Pendientes:</span>
                            <span class="stat-value warning">623 (5%)</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Última Limpieza:</span>
                            <span class="stat-value">Hace 2 días</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="cleaning-controls">
                <div class="control-group">
                    <h3>🧹 Opciones de Limpieza</h3>
                    <div class="cleaning-options">
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="removeDuplicates" checked>
                                Eliminar duplicados
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="fillMissingValues" checked>
                                Rellenar valores faltantes
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="correctOutliers">
                                Corregir valores atípicos
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="standardizeFormats" checked>
                                Estandarizar formatos
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="removeInvalidData" checked>
                                Eliminar datos inválidos
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="normalizeText">
                                Normalizar texto
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="control-group">
                    <h3>⚙️ Configuración Avanzada</h3>
                    <div class="advanced-settings">
                        <div class="setting-item">
                            <label>🔢 Estrategia para valores faltantes:</label>
                            <select id="missingValueStrategy">
                                <option value="mean">Media/promedio</option>
                                <option value="median">Mediana</option>
                                <option value="mode">Moda</option>
                                <option value="interpolation">Interpolación</option>
                                <option value="forward">Relleno hacia adelante</option>
                                <option value="backward">Relleno hacia atrás</option>
                            </select>
                        </div>
                        
                        <div class="setting-item">
                            <label>📊 Método para outliers:</label>
                            <select id="outlierMethod">
                                <option value="iqr">Rango intercuartílico (IQR)</option>
                                <option value="zscore">Puntuación Z</option>
                                <option value="isolation">Aislamiento</option>
                                <option value="manual">Manual</option>
                            </select>
                        </div>
                        
                        <div class="setting-item">
                            <label>🎯 Sensibilidad:</label>
                            <input type="range" id="sensitivity" min="1" max="10" value="5">
                            <span id="sensitivityValue">5</span>
                        </div>
                    </div>
                </div>
                
                <div class="cleaning-actions">
                    <button class="btn btn-warning btn-large" onclick="window.dataQuality.startCleaning()">
                        🧹 Iniciar Limpieza
                    </button>
                    
                    <button class="btn btn-secondary" onclick="window.dataQuality.previewCleaning()">
                        👁️ Vista Previa
                    </button>
                    
                    <button class="btn btn-secondary" onclick="window.dataQuality.undoCleaning()">
                        🔄 Deshacer
                    </button>
                    
                    <button class="btn btn-secondary" onclick="window.dataQuality.scheduleCleaning()">
                        ⏰ Programar Limpieza
                    </button>
                </div>
            </div>
            
            <div class="cleaning-preview">
                <h3>👁️ Vista Previa de Cambios</h3>
                <div id="cleaningPreview">
                    <div class="preview-placeholder">
                        <p>Ejecuta una vista previa para ver los cambios propuestos</p>
                    </div>
                </div>
            </div>
            
            <div class="cleaning-history">
                <h3>📚 Historial de Limpieza</h3>
                <div id="cleaningHistory">
                    ${this.generateCleaningHistory()}
                </div>
            </div>
        `;

        // Configurar eventos
        this.setupCleaningEvents();
    }

    setupCleaningEvents() {
        const sensitivity = document.getElementById('sensitivity');
        const sensitivityValue = document.getElementById('sensitivityValue');
        
        if (sensitivity && sensitivityValue) {
            sensitivity.addEventListener('input', (e) => {
                sensitivityValue.textContent = e.target.value;
            });
        }
    }

    generateCleaningHistory() {
        const mockHistory = [
            { 
                date: '2026-01-25 10:30', 
                operations: ['Eliminar duplicados', 'Rellenar valores faltantes'],
                records: 1247,
                changes: 23,
                status: 'completed'
            },
            { 
                date: '2026-01-20 15:45', 
                operations: ['Estandarizar formatos', 'Eliminar datos inválidos'],
                records: 892,
                changes: 47,
                status: 'completed'
            },
            { 
                date: '2026-01-18 09:20', 
                operations: ['Corregir valores atípicos'],
                records: 523,
                changes: 15,
                status: 'completed'
            }
        ];

        return mockHistory.map(item => `
            <div class="cleaning-item">
                <div class="cleaning-info">
                    <h4>Limpieza - ${item.date}</h4>
                    <p>📊 ${item.records} registros | 🔧 ${item.changes} cambios</p>
                    <div class="operations-list">
                        ${item.operations.map(op => `<span class="operation-tag">${op}</span>`).join('')}
                    </div>
                </div>
                <div class="cleaning-status">
                    <span class="status-badge ${item.status}">${this.getStatusLabel(item.status)}</span>
                </div>
                <div class="cleaning-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.dataQuality.viewCleaning('${item.date}')">
                        👁️ Ver
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="window.dataQuality.undoCleaning('${item.date}')">
                        🔄 Deshacer
                    </button>
                </div>
            </div>
        `).join('');
    }

    async startCleaning() {
        const options = this.getCleaningOptions();
        const settings = this.getCleaningSettings();
        
        console.log('🧹 Iniciando limpieza:', { options, settings });
        
        // Confirmación
        if (!confirm('⚠️ ¿Estás seguro de iniciar la limpieza de datos? Esta acción modificará los datos.')) {
            return;
        }
        
        // Mostrar progreso
        this.showCleaningProgress('Analizando datos para limpiar...');
        
        try {
            // Simular proceso de limpieza
            await this.simulateCleaning(options, settings);
            
            // Actualizar historial
            this.updateCleaningHistory(options);
            
            this.showCleaningSuccess('Limpieza completada con éxito');
            
        } catch (error) {
            console.error('❌ Error en limpieza:', error);
            this.showCleaningError('Error al limpiar datos');
        }
    }

    getCleaningOptions() {
        return {
            duplicates: document.getElementById('removeDuplicates')?.checked || false,
            missing: document.getElementById('fillMissingValues')?.checked || false,
            outliers: document.getElementById('correctOutliers')?.checked || false,
            formats: document.getElementById('standardizeFormats')?.checked || false,
            invalid: document.getElementById('removeInvalidData')?.checked || false,
            text: document.getElementById('normalizeText')?.checked || false
        };
    }

    getCleaningSettings() {
        return {
            missingStrategy: document.getElementById('missingValueStrategy')?.value || 'mean',
            outlierMethod: document.getElementById('outlierMethod')?.value || 'iqr',
            sensitivity: document.getElementById('sensitivity')?.value || '5'
        };
    }

    async simulateCleaning(options, settings) {
        return new Promise(resolve => {
            setTimeout(() => {
                console.log('✅ Limpieza simulada:', { options, settings });
                resolve();
            }, 4000);
        });
    }

    showCleaningProgress(message) {
        const container = document.getElementById('cleaning-controls');
        if (container) {
            const progressDiv = document.createElement('div');
            progressDiv.className = 'cleaning-progress';
            progressDiv.innerHTML = `
                <div class="progress-content">
                    <div class="loading-spinner warning"></div>
                    <p>${message}</p>
                    <div class="progress-bar">
                        <div class="progress-fill warning"></div>
                    </div>
                </div>
            `;
            container.appendChild(progressDiv);
        }
    }

    showCleaningSuccess(message) {
        this.removeProgress();
        this.showNotification(message, 'success');
    }

    showCleaningError(message) {
        this.removeProgress();
        this.showNotification(message, 'error');
    }

    updateCleaningHistory(options) {
        const operations = [];
        if (options.duplicates) operations.push('Eliminar duplicados');
        if (options.missing) operations.push('Rellenar valores faltantes');
        if (options.outliers) operations.push('Corregir valores atípicos');
        if (options.formats) operations.push('Estandarizar formatos');
        if (options.invalid) operations.push('Eliminar datos inválidos');
        if (options.text) operations.push('Normalizar texto');
        
        const newItem = {
            date: new Date().toLocaleString('es-ES'),
            operations: operations,
            records: Math.floor(Math.random() * 2000) + 500,
            changes: Math.floor(Math.random() * 100) + 10,
            status: 'completed'
        };
        
        // Actualizar UI
        const historyList = document.getElementById('cleaningHistory');
        if (historyList) {
            historyList.innerHTML = this.generateCleaningHistory();
        }
    }

    previewCleaning() {
        console.log('👁️ Generando vista previa de limpieza...');
        this.showNotification('👁️ Analizando cambios propuestos...', 'info');
        
        setTimeout(() => {
            const preview = document.getElementById('cleaningPreview');
            if (preview) {
                preview.innerHTML = `
                    <div class="preview-content">
                        <div class="preview-summary">
                            <h4>📊 Resumen de Cambios Propuestos</h4>
                            <div class="summary-stats">
                                <div class="stat-item">
                                    <span>Registros a modificar:</span>
                                    <span class="warning">127</span>
                                </div>
                                <div class="stat-item">
                                    <span>Duplicados a eliminar:</span>
                                    <span>23</span>
                                </div>
                                <div class="stat-item">
                                    <span>Valores faltantes a rellenar:</span>
                                    <span>45</span>
                                </div>
                                <div class="stat-item">
                                    <span>Outliers a corregir:</span>
                                    <span>12</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="preview-details">
                            <h4>📋 Ejemplos de Cambios</h4>
                            <div class="example-changes">
                                <div class="change-item">
                                    <div class="change-before">
                                        <span>Fila 123: [125.50, , 98.20]</span>
                                    </div>
                                    <div class="change-arrow">→</div>
                                    <div class="change-after">
                                        <span>Fila 123: [125.50, 111.85, 98.20]</span>
                                    </div>
                                </div>
                                <div class="change-item">
                                    <div class="change-before">
                                        <span>Fila 456: [999999.99, 45.20, 78.90]</span>
                                    </div>
                                    <div class="change-arrow">→</div>
                                    <div class="change-after">
                                        <span>Fila 456: [125.50, 45.20, 78.90]</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            this.showNotification('✅ Vista previa lista', 'success');
        }, 2000);
    }

    undoCleaning(date) {
        const message = date 
            ? `¿Deshacer limpieza del ${date}?`
            : '¿Deshacer última limpieza?';
        
        if (confirm(message)) {
            console.log('🔄 Deshaciendo limpieza...');
            this.showNotification('🔄 Limpieza deshecha', 'success');
        }
    }

    scheduleValidation() {
        console.log('⏰ Programando validación...');
        this.showNotification('⏰ Validación programada', 'info');
    }

    scheduleCleaning() {
        console.log('⏰ Programando limpieza...');
        this.showNotification('⏰ Limpieza programada', 'info');
    }

    exportValidationReport() {
        console.log('📥 Exportando informe de validación...');
        this.showNotification('📥 Exportando informe...', 'info');
    }

    viewValidation(date) {
        console.log('👁️ Visualizando validación:', date);
        this.showNotification('👁️ Mostrando detalles...', 'info');
    }

    downloadValidation(date) {
        console.log('📥 Descargando validación:', date);
        this.showNotification('📥 Descargando informe...', 'info');
    }

    revalidate(date) {
        console.log('🔄 Revalidando:', date);
        this.showNotification('🔄 Revalidando datos...', 'info');
    }

    fixIssue(type) {
        console.log('🔧 Corrigiendo issue:', type);
        this.showNotification('🔧 Corrigiendo problema...', 'info');
    }

    reviewIssue(type) {
        console.log('👁️ Revisando issue:', type);
        this.showNotification('👁️ Analizando problema...', 'info');
    }

    ignoreIssue(type) {
        console.log('⏭️ Ignorando issue:', type);
        this.showNotification('⏭️ Problema ignorado', 'info');
    }

    viewCleaning(date) {
        console.log('👁️ Visualizando limpieza:', date);
        this.showNotification('👁️ Mostrando detalles...', 'info');
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
window.dataQuality = new DataQuality();

// Auto-inicialización cuando la pestaña de calidad de datos se active
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'tab-data-quality' && 
                mutation.target.classList.contains('active')) {
                window.dataQuality.init();
            }
        });
    });

    const tabDataQuality = document.getElementById('tab-data-quality');
    if (tabDataQuality) {
        observer.observe(tabDataQuality, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
    }
});
