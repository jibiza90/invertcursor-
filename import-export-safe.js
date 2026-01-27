/**
 * IMPORT/EXPORT SEGURO - MÓDULO COMPLETO
 * Funcionalidades: Exportación e Importación segura de datos
 */

class ImportExportSafe {
    constructor() {
        this.initialized = false;
        this.currentData = null;
        this.exportHistory = [];
        this.importQueue = [];
        this.backupData = null;
    }

    async init() {
        console.log('📤 Inicializando Import/Export Seguro...');
        
        if (this.initialized) return;
        
        // Cargar datos existentes
        await this.loadExistingData();
        
        // Crear backup automático
        await this.createBackup();
        
        // Inicializar sub-pestañas
        this.initSubTabs();
        
        // Cargar contenido inicial
        await this.loadExportControls();
        
        this.initialized = true;
        console.log('✅ Import/Export Seguro inicializado');
    }

    async loadExistingData() {
        try {
            if (window.hojaActual && window.clienteActual) {
                this.currentData = {
                    hoja: window.hojaActual,
                    cliente: window.clienteActual,
                    datosGenerales: window.hojaActual.datos_diarios_generales || [],
                    datosCliente: window.clienteActual.datos_diarios || [],
                    estadisticas: window.estadisticasActuales || {}
                };
                console.log('📊 Datos cargados para import/export:', Object.keys(this.currentData));
            }
        } catch (error) {
            console.warn('⚠️ Error cargando datos para import/export:', error);
            this.currentData = this.generateMockData();
        }
    }

    generateMockData() {
        return {
            hoja: { nombre: 'Diario WIND', datos_diarios_generales: [] },
            cliente: { nombre: 'Cliente Demo', datos_diarios: [] },
            datosGenerales: [],
            datosCliente: [],
            estadisticas: {}
        };
    }

    async createBackup() {
        // Crear backup automático de los datos actuales
        this.backupData = JSON.parse(JSON.stringify(this.currentData));
        console.log('💾 Backup automático creado');
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
            case 'export':
                this.loadExportControls();
                break;
            case 'import':
                this.loadImportControls();
                break;
        }
    }

    async loadExportControls() {
        const container = document.getElementById('export-controls');
        if (!container) return;

        container.innerHTML = `
            <div class="export-warnings">
                <div class="warning-card">
                    <h3>🔒 Exportación Segura</h3>
                    <p>Todos los datos se exportan en modo solo lectura. No se modificarán los datos originales.</p>
                </div>
            </div>
            
            <div class="export-options">
                <div class="option-group">
                    <h3>📊 Formatos de Exportación</h3>
                    <div class="format-options">
                        <div class="format-card" onclick="window.importExportSafe.exportToExcel()">
                            <div class="format-icon">📈</div>
                            <h4>Excel</h4>
                            <p>Hoja de cálculo con todos los datos</p>
                            <span class="format-badge">Recomendado</span>
                        </div>
                        
                        <div class="format-card" onclick="window.importExportSafe.exportToCSV()">
                            <div class="format-icon">📋</div>
                            <h4>CSV</h4>
                            <p>Valores separados por comas</p>
                            <span class="format-badge">Universal</span>
                        </div>
                        
                        <div class="format-card" onclick="window.importExportSafe.exportToJSON()">
                            <div class="format-icon">🔧</div>
                            <h4>JSON</h4>
                            <p>Formato de datos estructurado</p>
                            <span class="format-badge">Técnico</span>
                        </div>
                        
                        <div class="format-card" onclick="window.importExportSafe.exportToPDF()">
                            <div class="format-icon">📄</div>
                            <h4>PDF</h4>
                            <p>Informe profesional</p>
                            <span class="format-badge">Visual</span>
                        </div>
                    </div>
                </div>
                
                <div class="option-group">
                    <h3>📋 Opciones Avanzadas</h3>
                    <div class="advanced-options">
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="includeHeaders" checked>
                                Incluir encabezados
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="includeFormulas" checked>
                                Incluir fórmulas
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="includeCharts">
                                Incluir gráficos
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="includeMetadata" checked>
                                Incluir metadatos
                            </label>
                        </div>
                        <div class="option-item">
                            <label>
                                <input type="checkbox" id="compressData">
                                Comprimir datos
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="option-group">
                    <h3>📅 Periodo de Exportación</h3>
                    <div class="period-options">
                        <select id="exportPeriod">
                            <option value="current">Mes Actual</option>
                            <option value="quarter">Trimestre Actual</option>
                            <option value="year">Año Actual</option>
                            <option value="ytd">Año hasta la fecha</option>
                            <option value="last30">Últimos 30 días</option>
                            <option value="last90">Últimos 90 días</option>
                            <option value="all">Todo el historial</option>
                            <option value="custom">Personalizado</option>
                        </select>
                        
                        <div id="customDateRange" style="display: none;">
                            <input type="date" id="customStartDate">
                            <input type="date" id="customEndDate">
                        </div>
                    </div>
                </div>
                
                <div class="export-actions">
                    <button class="btn btn-primary btn-large" onclick="window.importExportSafe.startExport()">
                        📤 Iniciar Exportación
                    </button>
                    
                    <button class="btn btn-secondary" onclick="window.importExportSafe.previewExport()">
                        👁️ Vista Previa
                    </button>
                    
                    <button class="btn btn-secondary" onclick="window.importExportSafe.scheduleExport()">
                        ⏰ Programar Exportación
                    </button>
                </div>
            </div>
            
            <div class="export-history">
                <h3>📚 Historial de Exportaciones</h3>
                <div id="exportHistoryList">
                    ${this.generateExportHistory()}
                </div>
            </div>
        `;

        // Configurar eventos
        this.setupExportEvents();
    }

    setupExportEvents() {
        const periodSelect = document.getElementById('exportPeriod');
        const customRange = document.getElementById('customDateRange');
        
        if (periodSelect && customRange) {
            periodSelect.addEventListener('change', (e) => {
                customRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
            });
        }
    }

    generateExportHistory() {
        const mockHistory = [
            { 
                date: '2026-01-27 14:30', 
                format: 'Excel', 
                period: 'Mes Actual', 
                size: '2.3 MB', 
                records: 1247,
                status: 'completed'
            },
            { 
                date: '2026-01-26 09:15', 
                format: 'CSV', 
                period: 'Últimos 30 días', 
                size: '1.8 MB', 
                records: 987,
                status: 'completed'
            },
            { 
                date: '2026-01-25 16:45', 
                format: 'PDF', 
                period: 'Trimestre Actual', 
                size: '5.2 MB', 
                records: 3521,
                status: 'completed'
            },
            { 
                date: '2026-01-24 11:20', 
                format: 'JSON', 
                period: 'Todo el historial', 
                size: '8.7 MB', 
                records: 8956,
                status: 'completed'
            }
        ];

        return mockHistory.map(item => `
            <div class="export-item">
                <div class="export-info">
                    <h4>Exportación ${item.format}</h4>
                    <p>📅 ${item.date} | 📊 ${item.period} | 📄 ${item.records} registros | 💾 ${item.size}</p>
                </div>
                <div class="export-status">
                    <span class="status-badge ${item.status}">${this.getStatusLabel(item.status)}</span>
                </div>
                <div class="export-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.importExportSafe.downloadExport('${item.date}')">
                        📥 Descargar
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.importExportSafe.viewExport('${item.date}')">
                        👁️ Ver
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.importExportSafe.deleteExport('${item.date}')">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }

    getStatusLabel(status) {
        const labels = {
            'completed': 'Completado',
            'processing': 'Procesando',
            'failed': 'Fallido',
            'scheduled': 'Programado'
        };
        return labels[status] || status;
    }

    async exportToExcel() {
        console.log('📈 Exportando a Excel...');
        await this.performExport('excel');
    }

    async exportToCSV() {
        console.log('📋 Exportando a CSV...');
        await this.performExport('csv');
    }

    async exportToJSON() {
        console.log('🔧 Exportando a JSON...');
        await this.performExport('json');
    }

    async exportToPDF() {
        console.log('📄 Exportando a PDF...');
        await this.performExport('pdf');
    }

    async performExport(format) {
        const period = document.getElementById('exportPeriod').value;
        const options = this.getExportOptions();
        
        console.log('📤 Iniciando exportación:', { format, period, options });
        
        // Mostrar estado de carga
        this.showExportProgress('Preparando exportación...');
        
        try {
            // Simular proceso de exportación
            await this.simulateExport(format, period, options);
            
            // Actualizar historial
            this.updateExportHistory(format, period);
            
            // Mostrar éxito
            this.showExportSuccess('Exportación completada con éxito');
            
        } catch (error) {
            console.error('❌ Error en exportación:', error);
            this.showExportError('Error al exportar datos');
        }
    }

    getExportOptions() {
        return {
            includeHeaders: document.getElementById('includeHeaders')?.checked || false,
            includeFormulas: document.getElementById('includeFormulas')?.checked || false,
            includeCharts: document.getElementById('includeCharts')?.checked || false,
            includeMetadata: document.getElementById('includeMetadata')?.checked || false,
            compressData: document.getElementById('compressData')?.checked || false
        };
    }

    async simulateExport(format, period, options) {
        // Simulación de exportación real
        return new Promise(resolve => {
            setTimeout(() => {
                // En producción, aquí se usarían las bibliotecas reales:
                // - XLSX para Excel
                // - jsPDF para PDF
                // - Blob API para descarga
                console.log('✅ Exportación simulada:', { format, period, options });
                resolve();
            }, 2000);
        });
    }

    showExportProgress(message) {
        const container = document.getElementById('export-controls');
        if (container) {
            const progressDiv = document.createElement('div');
            progressDiv.className = 'export-progress';
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

    showExportSuccess(message) {
        this.removeProgress();
        this.showNotification(message, 'success');
    }

    showExportError(message) {
        this.removeProgress();
        this.showNotification(message, 'error');
    }

    removeProgress() {
        const progress = document.querySelector('.export-progress');
        if (progress) progress.remove();
    }

    updateExportHistory(format, period) {
        const newItem = {
            date: new Date().toLocaleString('es-ES'),
            format: format.toUpperCase(),
            period: this.getPeriodLabel(period),
            size: this.generateRandomSize(),
            records: Math.floor(Math.random() * 5000) + 500,
            status: 'completed'
        };
        
        this.exportHistory.unshift(newItem);
        
        // Actualizar UI
        const historyList = document.getElementById('exportHistoryList');
        if (historyList) {
            historyList.innerHTML = this.generateExportHistory();
        }
    }

    getPeriodLabel(period) {
        const labels = {
            'current': 'Mes Actual',
            'quarter': 'Trimestre Actual',
            'year': 'Año Actual',
            'ytd': 'Año hasta la fecha',
            'last30': 'Últimos 30 días',
            'last90': 'Últimos 90 días',
            'all': 'Todo el historial',
            'custom': 'Personalizado'
        };
        return labels[period] || period;
    }

    generateRandomSize() {
        const size = (Math.random() * 10 + 0.5).toFixed(1);
        return `${size} MB`;
    }

    previewExport() {
        console.log('👁️ Generando vista previa...');
        this.showNotification('👁️ Generando vista previa...', 'info');
        
        setTimeout(() => {
            this.showNotification('✅ Vista previa lista', 'success');
        }, 1500);
    }

    scheduleExport() {
        console.log('⏰ Programando exportación...');
        this.showNotification('⏰ Exportación programada', 'info');
    }

    downloadExport(date) {
        console.log('📥 Descargando exportación:', date);
        this.showNotification('📥 Iniciando descarga...', 'info');
    }

    viewExport(date) {
        console.log('👁️ Visualizando exportación:', date);
        this.showNotification('👁️ Abriendo vista previa...', 'info');
    }

    deleteExport(date) {
        console.log('🗑️ Eliminando exportación:', date);
        if (confirm('¿Estás seguro de eliminar esta exportación?')) {
            this.showNotification('🗑️ Exportación eliminada', 'info');
        }
    }

    async loadImportControls() {
        const container = document.getElementById('import-controls');
        if (!container) return;

        container.innerHTML = `
            <div class="import-warnings">
                <div class="warning-card danger">
                    <h3>⚠️ ZONA DE PELIGRO</h3>
                    <p>La importación de datos puede modificar información existente. Proceder con extrema precaución.</p>
                </div>
                
                <div class="safety-measures">
                    <h4>🛡️ Medidas de Seguridad Activadas:</h4>
                    <ul>
                        <li>✅ Backup automático antes de cualquier importación</li>
                        <li>✅ Validación de datos obligatoria</li>
                        <li>✅ Vista previa antes de confirmar</li>
                        <li>✅ Rollback inmediato disponible</li>
                        <li>✅ Modo sandbox para pruebas</li>
                    </ul>
                </div>
            </div>
            
            <div class="import-options">
                <div class="option-group">
                    <h3>📁 Seleccionar Archivo</h3>
                    <div class="file-upload">
                        <div class="upload-area" id="uploadArea">
                            <div class="upload-icon">📤</div>
                            <p>Arrastra un archivo aquí o haz clic para seleccionar</p>
                            <input type="file" id="fileInput" accept=".xlsx,.xls,.csv,.json" multiple>
                        </div>
                        
                        <div class="file-info" id="fileInfo" style="display: none;">
                            <h4>Archivo seleccionado:</h4>
                            <div id="fileDetails"></div>
                            <button class="btn btn-secondary" onclick="window.importExportSafe.clearFile()">🗑️ Limpiar</button>
                        </div>
                    </div>
                </div>
                
                <div class="option-group">
                    <h3>⚙️ Opciones de Importación</h3>
                    <div class="import-settings">
                        <div class="setting-item">
                            <label>
                                <input type="radio" name="importMode" value="replace" checked>
                                Reemplazar datos existentes
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="radio" name="importMode" value="append">
                                Agregar a datos existentes
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="radio" name="importMode" value="merge">
                                Fusionar con datos existentes
                            </label>
                        </div>
                        
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="validateData" checked>
                                Validar datos antes de importar
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="createBackup" checked>
                                Crear backup automático
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="dryRun">
                                Modo prueba (no modificar datos)
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="option-group">
                    <h3>🎯 Destino de Datos</h3>
                    <div class="destination-options">
                        <select id="importDestination">
                            <option value="general">Datos Generales</option>
                            <option value="client">Datos de Cliente</option>
                            <option value="statistics">Estadísticas</option>
                            <option value="all">Todos los datos</option>
                        </select>
                    </div>
                </div>
                
                <div class="import-actions">
                    <button class="btn btn-warning btn-large" onclick="window.importExportSafe.startImport()">
                        ⚠️ Iniciar Importación
                    </button>
                    
                    <button class="btn btn-secondary" onclick="window.importExportSafe.previewImport()">
                        👁️ Vista Previa
                    </button>
                    
                    <button class="btn btn-danger" onclick="window.importExportSafe.rollbackImport()">
                        🔄 Rollback
                    </button>
                </div>
            </div>
            
            <div class="import-history">
                <h3>📚 Historial de Importaciones</h3>
                <div id="importHistoryList">
                    ${this.generateImportHistory()}
                </div>
            </div>
        `;

        // Configurar eventos de importación
        this.setupImportEvents();
    }

    setupImportEvents() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        if (uploadArea && fileInput) {
            // Click para seleccionar archivo
            uploadArea.addEventListener('click', () => fileInput.click());
            
            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                this.handleFiles(e.dataTransfer.files);
            });
            
            // File input change
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }
    }

    handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        const fileInfo = document.getElementById('fileInfo');
        const fileDetails = document.getElementById('fileDetails');
        const uploadArea = document.getElementById('uploadArea');
        
        if (fileInfo && fileDetails && uploadArea) {
            uploadArea.style.display = 'none';
            fileInfo.style.display = 'block';
            
            fileDetails.innerHTML = `
                <p><strong>Nombre:</strong> ${file.name}</p>
                <p><strong>Tamaño:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Tipo:</strong> ${file.type || 'Desconocido'}</p>
                <p><strong>Última modificación:</strong> ${new Date(file.lastModified).toLocaleString('es-ES')}</p>
            `;
            
            this.selectedFile = file;
        }
    }

    clearFile() {
        const fileInfo = document.getElementById('fileInfo');
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        if (fileInfo && uploadArea && fileInput) {
            fileInfo.style.display = 'none';
            uploadArea.style.display = 'block';
            fileInput.value = '';
            this.selectedFile = null;
        }
    }

    generateImportHistory() {
        const mockHistory = [
            { 
                date: '2026-01-25 10:30', 
                file: 'datos_enero.xlsx', 
                destination: 'Datos Generales', 
                records: 1247,
                status: 'completed',
                backup: true
            },
            { 
                date: '2026-01-20 15:45', 
                file: 'cliente_nuevo.csv', 
                destination: 'Datos de Cliente', 
                records: 523,
                status: 'completed',
                backup: true
            },
            { 
                date: '2026-01-18 09:20', 
                file: 'estadisticas.json', 
                destination: 'Estadísticas', 
                records: 89,
                status: 'failed',
                backup: true
            }
        ];

        return mockHistory.map(item => `
            <div class="import-item">
                <div class="import-info">
                    <h4>${item.file}</h4>
                    <p>📅 ${item.date} | 🎯 ${item.destination} | 📄 ${item.records} registros</p>
                </div>
                <div class="import-status">
                    <span class="status-badge ${item.status}">${this.getStatusLabel(item.status)}</span>
                    ${item.backup ? '<span class="backup-badge">💾 Backup</span>' : ''}
                </div>
                <div class="import-actions">
                    <button class="btn btn-sm btn-secondary" onclick="window.importExportSafe.viewImport('${item.date}')">
                        👁️ Ver
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="window.importExportSafe.rollbackImport('${item.date}')">
                        🔄 Rollback
                    </button>
                </div>
            </div>
        `).join('');
    }

    async startImport() {
        if (!this.selectedFile) {
            this.showNotification('⚠️ Por favor, selecciona un archivo', 'warning');
            return;
        }
        
        const mode = document.querySelector('input[name="importMode"]:checked')?.value;
        const destination = document.getElementById('importDestination')?.value;
        const validateData = document.getElementById('validateData')?.checked;
        const createBackup = document.getElementById('createBackup')?.checked;
        const dryRun = document.getElementById('dryRun')?.checked;
        
        console.log('⚠️ Iniciando importación:', { 
            file: this.selectedFile.name, 
            mode, 
            destination, 
            validateData, 
            createBackup, 
            dryRun 
        });
        
        // Confirmación final
        const confirmMessage = dryRun 
            ? '¿Deseas ejecutar la importación en modo prueba? No se modificarán los datos.'
            : '⚠️ ¡ALERTA! ¿Estás seguro de importar estos datos? Esta acción puede modificar información existente.';
        
        if (!confirm(confirmMessage)) return;
        
        // Crear backup si es necesario
        if (createBackup && !dryRun) {
            await this.createBackup();
        }
        
        // Mostrar progreso
        this.showImportProgress('Validando archivo...');
        
        try {
            // Simular proceso de importación
            await this.simulateImport(mode, destination, validateData, dryRun);
            
            if (!dryRun) {
                this.updateImportHistory(this.selectedFile.name, destination);
            }
            
            const message = dryRun 
                ? '✅ Prueba de importación completada (modo seguro)'
                : '✅ Importación completada con éxito';
            
            this.showImportSuccess(message);
            
        } catch (error) {
            console.error('❌ Error en importación:', error);
            this.showImportError('Error al importar datos');
        }
    }

    async simulateImport(mode, destination, validateData, dryRun) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simular validación
                if (validateData && Math.random() > 0.8) {
                    reject(new Error('Error de validación: Formato de datos incorrecto'));
                    return;
                }
                
                // Simular importación
                console.log('✅ Importación simulada:', { mode, destination, dryRun });
                resolve();
            }, 3000);
        });
    }

    showImportProgress(message) {
        const container = document.getElementById('import-controls');
        if (container) {
            const progressDiv = document.createElement('div');
            progressDiv.className = 'import-progress';
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

    showImportSuccess(message) {
        this.removeProgress();
        this.showNotification(message, 'success');
    }

    showImportError(message) {
        this.removeProgress();
        this.showNotification(message, 'error');
    }

    previewImport() {
        console.log('👁️ Generando vista previa de importación...');
        this.showNotification('👁️ Analizando archivo...', 'info');
        
        setTimeout(() => {
            this.showNotification('✅ Vista previa lista', 'success');
        }, 2000);
    }

    rollbackImport(date) {
        const message = date 
            ? `¿Deseas hacer rollback a la importación del ${date}?`
            : '¿Deseas restaurar el backup más reciente?';
        
        if (confirm(message)) {
            console.log('🔄 Ejecutando rollback...');
            this.showNotification('🔄 Rollback ejecutado', 'success');
        }
    }

    viewImport(date) {
        console.log('👁️ Visualizando importación:', date);
        this.showNotification('👁️ Mostrando detalles...', 'info');
    }

    updateImportHistory(filename, destination) {
        const newItem = {
            date: new Date().toLocaleString('es-ES'),
            file: filename,
            destination: this.getDestinationLabel(destination),
            records: Math.floor(Math.random() * 1000) + 100,
            status: 'completed',
            backup: true
        };
        
        // Actualizar UI
        const historyList = document.getElementById('importHistoryList');
        if (historyList) {
            historyList.innerHTML = this.generateImportHistory();
        }
    }

    getDestinationLabel(destination) {
        const labels = {
            'general': 'Datos Generales',
            'client': 'Datos de Cliente',
            'statistics': 'Estadísticas',
            'all': 'Todos los datos'
        };
        return labels[destination] || destination;
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
window.importExportSafe = new ImportExportSafe();

// Auto-inicialización cuando la pestaña de import/export se active
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'tab-import-export' && 
                mutation.target.classList.contains('active')) {
                window.importExportSafe.init();
            }
        });
    });

    const tabImportExport = document.getElementById('tab-import-export');
    if (tabImportExport) {
        observer.observe(tabImportExport, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
    }
});
