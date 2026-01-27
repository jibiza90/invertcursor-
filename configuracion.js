/**
 * CONFIGURACIÓN - MÓDULO PRÁCTICO REAL
 * Configuración funcional de la aplicación
 */

class Configuracion {
    constructor() {
        this.initialized = false;
        this.config = this.loadConfig();
    }

    async init() {
        console.log('⚙️ Inicializando Configuración...');
        
        if (this.initialized) return;
        
        // Cargar contenido inicial
        await this.loadConfigContent();
        
        this.initialized = true;
        console.log('✅ Configuración inicializada');
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem('portfolioConfig');
            return saved ? JSON.parse(saved) : this.getDefaultConfig();
        } catch (error) {
            console.warn('Error cargando configuración:', error);
            return this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            general: {
                idioma: 'es',
                formatoMoneda: 'EUR',
                formatoFecha: 'DD/MM/YYYY',
                decimales: 2,
                autoGuardar: true,
                notificaciones: true
            },
            visual: {
                tema: 'claro',
                fuente: 'default',
                tamañoFuente: 'medium',
                animaciones: true,
                compactMode: false
            },
            datos: {
                backupAutomatico: true,
                frecuenciaBackup: 'daily',
                retencionDatos: 365,
                cacheActivo: true,
                validacionDatos: true
            },
            exportacion: {
                formatoDefecto: 'excel',
                incluirHeaders: true,
                incluirFormulas: false,
                comprimirArchivos: false
            }
        };
    }

    async loadConfigContent() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        container.innerHTML = `
            <div class="config-header">
                <h2>⚙️ Configuración de Portfolio Manager</h2>
                <p>Personaliza tu experiencia y optimiza el rendimiento</p>
            </div>
            
            <div class="config-sections">
                <!-- Configuración PRINCIPAL - Más útil -->
                <div class="config-section important">
                    <h3>🎯 Configuración Principal</h3>
                    <div class="config-group">
                        <div class="config-item">
                            <label>📊 Vista por defecto al iniciar:</label>
                            <select id="vistaDefecto" onchange="window.configuracion.saveConfig()">
                                <option value="general" ${this.config.general.vistaDefecto === 'general' ? 'selected' : ''}>Vista General</option>
                                <option value="clientes" ${this.config.general.vistaDefecto === 'clientes' ? 'selected' : ''}>Lista de Clientes</option>
                                <option value="estadisticas" ${this.config.general.vistaDefecto === 'estadisticas' ? 'selected' : ''}>Estadísticas</option>
                            </select>
                            <small>Define qué vista se carga al abrir la aplicación</small>
                        </div>
                        
                        <div class="config-item">
                            <label>🔄 Auto-recálculo automático:</label>
                            <select id="autoRecalculo" onchange="window.configuracion.saveConfig()">
                                <option value="off" ${this.config.general.autoRecalculo === 'off' ? 'selected' : ''}>Desactivado</option>
                                <option value="slow" ${this.config.general.autoRecalculo === 'slow' ? 'selected' : ''}>Cada 30 segundos</option>
                                <option value="medium" ${this.config.general.autoRecalculo === 'medium' ? 'selected' : ''}>Cada 10 segundos</option>
                                <option value="fast" ${this.config.general.autoRecalculo === 'fast' ? 'selected' : ''}>Cada 5 segundos</option>
                            </select>
                            <small>Frecuencia de actualización automática de datos</small>
                        </div>
                        
                        <div class="config-item">
                            <label>💾 Guardado automático:</label>
                            <select id="autoGuardar" onchange="window.configuracion.saveConfig()">
                                <option value="off" ${this.config.general.autoGuardar === 'off' ? 'selected' : ''}>Desactivado</option>
                                <option value="manual" ${this.config.general.autoGuardar === 'manual' ? 'selected' : ''}>Solo al pulsar Guardar</option>
                                <option value="changes" ${this.config.general.autoGuardar === 'changes' ? 'selected' : ''}>Al hacer cambios</option>
                                <option value="continuous" ${this.config.general.autoGuardar === 'continuous' ? 'selected' : ''}>Continuo</option>
                            </select>
                            <small>Cuándo se guardan los cambios automáticamente</small>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="confirmarCambios" 
                                       ${this.config.general.confirmarCambios ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                🔒 Confirmar antes de guardar cambios importantes
                            </label>
                            <small>Pide confirmación antes de modificar datos críticos</small>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="mostrarWarnings" 
                                       ${this.config.general.mostrarWarnings ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                ⚠️ Mostrar advertencias de datos
                            </label>
                            <small>Alertas sobre datos inconsistentes o fuera de rango</small>
                        </div>
                    </div>
                </div>
                
                <!-- Configuración de Rendimiento -->
                <div class="config-section">
                    <h3>⚡ Rendimiento y Optimización</h3>
                    <div class="config-group">
                        <div class="config-item">
                            <label>📈 Límite de clientes a mostrar:</label>
                            <input type="number" id="limiteClientes" 
                                   value="${this.config.rendimiento.limiteClientes || 50}"
                                   min="10" max="500"
                                   onchange="window.configuracion.saveConfig()">
                            <small>Limita el número de clientes para mejorar el rendimiento</small>
                        </div>
                        
                        <div class="config-item">
                            <label>🗃️ Caché de cálculos:</label>
                            <select id="cacheCalculos" onchange="window.configuracion.saveConfig()">
                                <option value="off" ${this.config.rendimiento.cacheCalculos === 'off' ? 'selected' : ''}>Desactivado</option>
                                <option value="session" ${this.config.rendimiento.cacheCalculos === 'session' ? 'selected' : ''}>Por sesión</option>
                                <option value="persistent" ${this.config.rendimiento.cacheCalculos === 'persistent' ? 'selected' : ''}>Persistente</option>
                            </select>
                            <small>Almacena cálculos para acelerar navegación</small>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="virtualScroll" 
                                       ${this.config.rendimiento.virtualScroll ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                📜 Scroll virtual en tablas grandes
                            </label>
                            <small>Solo renderiza filas visibles para mejor rendimiento</small>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="lazyLoad" 
                                       ${this.config.rendimiento.lazyLoad ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                ⏳ Carga diferida de datos
                            </label>
                            <small>Carga datos solo cuando se necesitan</small>
                        </div>
                    </div>
                </div>
                
                <!-- Configuración Visual -->
                <div class="config-section">
                    <h3>🎨 Apariencia</h3>
                    <div class="config-group">
                        <div class="config-item">
                            <label>🎨 Tema:</label>
                            <select id="configTema" onchange="window.configuracion.applyTheme()">
                                <option value="default" ${this.config.visual.tema === 'default' ? 'selected' : ''}>Por defecto</option>
                                <option value="dark" ${this.config.visual.tema === 'dark' ? 'selected' : ''}>Oscuro</option>
                                <option value="light" ${this.config.visual.tema === 'light' ? 'selected' : ''}>Claro</option>
                                <option value="blue" ${this.config.visual.tema === 'blue' ? 'selected' : ''}>Azul profesional</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>📊 Tamaño de tablas:</label>
                            <select id="tamanoTablas" onchange="window.configuracion.saveConfig()">
                                <option value="compact" ${this.config.visual.tamanoTablas === 'compact' ? 'selected' : ''}>Compacto</option>
                                <option value="normal" ${this.config.visual.tamanoTablas === 'normal' ? 'selected' : ''}>Normal</option>
                                <option value="large" ${this.config.visual.tamanoTablas === 'large' ? 'selected' : ''}>Grande</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="animaciones" 
                                       ${this.config.visual.animaciones ? 'checked' : ''}
                                       onchange="window.configuracion.applyAnimations()">
                                ✨ Animaciones y transiciones
                            </label>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="coloresAlternos" 
                                       ${this.config.visual.coloresAlternos ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                🎨 Colores alternos en filas de tablas
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Configuración de Datos -->
                <div class="config-section">
                    <h3>📊 Gestión de Datos</h3>
                    <div class="config-group">
                        <div class="config-item">
                            <label>📅 Mes por defecto:</label>
                            <select id="mesDefecto" onchange="window.configuracion.saveConfig()">
                                <option value="actual" ${this.config.datos.mesDefecto === 'actual' ? 'selected' : ''}>Mes actual</option>
                                <option value="anterior" ${this.config.datos.mesDefecto === 'anterior' ? 'selected' : ''}>Mes anterior</option>
                                <option value="ultimo" ${this.config.datos.mesDefecto === 'ultimo' ? 'selected' : ''}>Último mes con datos</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>🏦 Hoja por defecto:</label>
                            <select id="hojaDefecto" onchange="window.configuracion.saveConfig()">
                                <option value="Diario STD" ${this.config.datos.hojaDefecto === 'Diario STD' ? 'selected' : ''}>Diario STD</option>
                                <option value="Diario VIP" ${this.config.datos.hojaDefecto === 'Diario VIP' ? 'selected' : ''}>Diario VIP</option>
                                <option value="Diario WIND" ${this.config.datos.hojaDefecto === 'Diario WIND' ? 'selected' : ''}>Diario WIND</option>
                                <option value="Diario Xavi" ${this.config.datos.hojaDefecto === 'Diario Xavi' ? 'selected' : ''}>Diario Xavi</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="validarDatos" 
                                       ${this.config.datos.validarDatos ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                ✅ Validar datos al cargar
                            </label>
                            <small>Comprueba integridad de datos al abrir archivos</small>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="backupAutomatico" 
                                       ${this.config.datos.backupAutomatico ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                💾 Backup automático diario
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Acciones Rápidas -->
                <div class="config-section">
                    <h3>🔧 Acciones Rápidas</h3>
                    <div class="config-actions">
                        <button class="btn btn-primary" onclick="window.configuracion.aplicarConfiguracion()">
                            ✅ Aplicar Cambios
                        </button>
                        
                        <button class="btn btn-secondary" onclick="window.configuracion.exportarConfiguracion()">
                            📥 Exportar Config
                        </button>
                        
                        <button class="btn btn-secondary" onclick="window.configuracion.importarConfiguracion()">
                            📤 Importar Config
                        </button>
                        
                        <button class="btn btn-warning" onclick="window.configuracion.reiniciarRendimiento()">
                            🔄 Optimizar Rendimiento
                        </button>
                        
                        <button class="btn btn-danger" onclick="window.configuracion.resetearTodo()">
                            🧹 Resetear Todo
                        </button>
                    </div>
                </div>
                
                <!-- Estado Actual -->
                <div class="config-section">
                    <h3>📊 Estado Actual</h3>
                    <div class="system-info">
                        <div class="info-item">
                            <label>Memoria usada:</label>
                            <span id="memoriaUsada">Calculando...</span>
                        </div>
                        <div class="info-item">
                            <label>Clientes cargados:</label>
                            <span id="clientesCargados">${window.clientesAnuales?.length || 0}</span>
                        </div>
                        <div class="info-item">
                            <label>Hoja actual:</label>
                            <span>${window.hojaActual?.nombre || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <label>Mes actual:</label>
                            <span>${window.mesActual || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <label>Último guardado:</label>
                            <span id="ultimoGuardado">No guardado</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Actualizar estado actual
        this.actualizarEstado();
    }

    saveConfig() {
        // Recoger valores del formulario - CONFIGURACIÓN PRINCIPAL
        this.config.general.vistaDefecto = document.getElementById('vistaDefecto')?.value || 'general';
        this.config.general.autoRecalculo = document.getElementById('autoRecalculo')?.value || 'medium';
        this.config.general.autoGuardar = document.getElementById('autoGuardar')?.value || 'manual';
        this.config.general.confirmarCambios = document.getElementById('confirmarCambios')?.checked || false;
        this.config.general.mostrarWarnings = document.getElementById('mostrarWarnings')?.checked || false;
        
        // CONFIGURACIÓN DE RENDIMIENTO
        this.config.rendimiento = this.config.rendimiento || {};
        this.config.rendimiento.limiteClientes = parseInt(document.getElementById('limiteClientes')?.value) || 50;
        this.config.rendimiento.cacheCalculos = document.getElementById('cacheCalculos')?.value || 'session';
        this.config.rendimiento.virtualScroll = document.getElementById('virtualScroll')?.checked || false;
        this.config.rendimiento.lazyLoad = document.getElementById('lazyLoad')?.checked || false;
        
        // CONFIGURACIÓN VISUAL
        this.config.visual.tema = document.getElementById('configTema')?.value || 'default';
        this.config.visual.tamanoTablas = document.getElementById('tamanoTablas')?.value || 'normal';
        this.config.visual.animaciones = document.getElementById('animaciones')?.checked || false;
        this.config.visual.coloresAlternos = document.getElementById('coloresAlternos')?.checked || false;
        
        // CONFIGURACIÓN DE DATOS
        this.config.datos.mesDefecto = document.getElementById('mesDefecto')?.value || 'actual';
        this.config.datos.hojaDefecto = document.getElementById('hojaDefecto')?.value || 'Diario WIND';
        this.config.datos.validarDatos = document.getElementById('validarDatos')?.checked || false;
        this.config.datos.backupAutomatico = document.getElementById('backupAutomatico')?.checked || false;
        
        // Guardar en localStorage
        localStorage.setItem('portfolioConfig', JSON.stringify(this.config));
        
        // Aplicar cambios inmediatos
        this.applyConfigChanges();
        
        this.showNotification('✅ Configuración guardada', 'success');
    }

    applyConfigChanges() {
        // Aplicar formato de moneda
        this.applyCurrencyFormat();
        
        // Aplicar formato de fecha
        this.applyDateFormat();
        
        // Aplicar decimales
        this.applyDecimals();
        
        // Actualizar timestamp
        const lastUpdate = document.getElementById('lastUpdate');
        if (lastUpdate) {
            lastUpdate.textContent = new Date().toLocaleString('es-ES');
        }
    }

    applyTheme() {
        const tema = document.getElementById('configTema')?.value || 'claro';
        this.config.visual.tema = tema;
        
        document.body.classList.remove('theme-claro', 'theme-oscuro', 'theme-auto');
        document.body.classList.add(`theme-${tema}`);
        
        // Si es auto, detectar preferencia del sistema
        if (tema === 'auto') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.toggle('theme-oscuro', isDark);
            document.body.classList.toggle('theme-claro', !isDark);
        }
        
        this.saveConfig();
    }

    applyFont() {
        const fuente = document.getElementById('configFuente')?.value || 'default';
        this.config.visual.fuente = fuente;
        
        const fontMap = {
            'default': 'Inter, system-ui, sans-serif',
            'arial': 'Arial, sans-serif',
            'helvetica': 'Helvetica, Arial, sans-serif',
            'times': 'Times New Roman, serif',
            'courier': 'Courier New, monospace'
        };
        
        document.body.style.fontFamily = fontMap[fuente] || fontMap.default;
        this.saveConfig();
    }

    applyFontSize() {
        const tamaño = document.getElementById('configTamañoFuente')?.value || 'medium';
        this.config.visual.tamañoFuente = tamaño;
        
        const sizeMap = {
            'small': '14px',
            'medium': '16px',
            'large': '18px',
            'xlarge': '20px'
        };
        
        document.body.style.fontSize = sizeMap[tamaño] || sizeMap.medium;
        this.saveConfig();
    }

    applyAnimations() {
        const activar = document.getElementById('configAnimaciones')?.checked || false;
        this.config.visual.animaciones = activar;
        
        if (activar) {
            document.body.classList.remove('no-animations');
        } else {
            document.body.classList.add('no-animations');
        }
        
        this.saveConfig();
    }

    applyCompactMode() {
        const compact = document.getElementById('configCompactMode')?.checked || false;
        this.config.visual.compactMode = compact;
        
        if (compact) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
        
        this.saveConfig();
    }

    applyCurrencyFormat() {
        // Aplicar formato de moneda a todos los elementos
        const formato = this.config.general.formatoMoneda;
        const simbolo = this.getCurrencySymbol(formato);
        
        // Actualizar elementos que muestran dinero
        document.querySelectorAll('[data-currency]').forEach(el => {
            el.textContent = simbolo + el.textContent.replace(/[€$£]/g, '');
        });
    }

    getCurrencySymbol(formato) {
        const symbols = {
            'EUR': '€',
            'USD': '$',
            'GBP': '£'
        };
        return symbols[formato] || '€';
    }

    applyDateFormat() {
        // Aplicar formato de fecha
        // Esto requeriría recorrer y formatear todas las fechas
        // Implementación simplificada
    }

    applyDecimals() {
        // Aplicar número de decimales
        const decimales = this.config.general.decimales;
        
        document.querySelectorAll('[data-decimal]').forEach(el => {
            const valor = parseFloat(el.textContent);
            if (!isNaN(valor)) {
                el.textContent = valor.toFixed(decimales);
            }
        });
    }

    resetConfig() {
        if (!confirm('¿Estás seguro de restablecer toda la configuración a los valores por defecto?')) {
            return;
        }
        
        this.config = this.getDefaultConfig();
        localStorage.setItem('portfolioConfig', JSON.stringify(this.config));
        
        // Recargar la página para aplicar cambios
        location.reload();
    }

    exportConfig() {
        const configJson = JSON.stringify(this.config, null, 2);
        const blob = new Blob([configJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio_config_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('✅ Configuración exportada', 'success');
    }

    importConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedConfig = JSON.parse(event.target.result);
                    this.config = { ...this.getDefaultConfig(), ...importedConfig };
                    localStorage.setItem('portfolioConfig', JSON.stringify(this.config));
                    
                    this.showNotification('✅ Configuración importada', 'success');
                    
                    // Recargar para aplicar cambios
                    setTimeout(() => location.reload(), 1000);
                } catch (error) {
                    this.showNotification('❌ Error al importar configuración', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    clearCache() {
        if (!confirm('¿Estás seguro de limpiar toda la caché? Esto puede ralentizar temporalmente la aplicación.')) {
            return;
        }
        
        // Limpiar localStorage excepto configuración
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key !== 'portfolioConfig') {
                localStorage.removeItem(key);
            }
        });
        
        // Limpiar sessionStorage
        sessionStorage.clear();
        
        this.showNotification('✅ Caché limpiada', 'success');
    }

    clearAllData() {
        if (!confirm('⚠️ ¡ADVERTENCIA! ¿Estás seguro de eliminar todos los datos? Esta acción no se puede deshacer.')) {
            return;
        }
        
        if (!confirm('🚨 ¿REALMENTE QUIERES ELIMINAR TODOS LOS DATOS? Se perderá toda la información.')) {
            return;
        }
        
        // Limpiar todo el almacenamiento
        localStorage.clear();
        sessionStorage.clear();
        
        // Recargar la aplicación
        location.reload();
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browserName = 'Unknown';
        
        if (ua.indexOf('Chrome') > -1) browserName = 'Chrome';
        else if (ua.indexOf('Safari') > -1) browserName = 'Safari';
        else if (ua.indexOf('Firefox') > -1) browserName = 'Firefox';
        else if (ua.indexOf('Edge') > -1) browserName = 'Edge';
        
        return browserName;
    }

    // Métodos adicionales para configuración útil
    actualizarEstado() {
        // Actualizar información del sistema
        const memoriaUsada = document.getElementById('memoriaUsada');
        if (memoriaUsada) {
            if (performance.memory) {
                const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
                const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(1);
                memoriaUsada.textContent = `${used} MB / ${total} MB`;
            } else {
                memoriaUsada.textContent = 'No disponible';
            }
        }
        
        const ultimoGuardado = document.getElementById('ultimoGuardado');
        if (ultimoGuardado) {
            const lastSave = localStorage.getItem('ultimoGuardado');
            if (lastSave) {
                ultimoGuardado.textContent = new Date(lastSave).toLocaleString('es-ES');
            }
        }
    }

    aplicarConfiguracion() {
        this.applyConfigChanges();
        this.showNotification('✅ Configuración aplicada correctamente', 'success');
    }

    exportarConfiguracion() {
        const configJson = JSON.stringify(this.config, null, 2);
        const blob = new Blob([configJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio_config_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('✅ Configuración exportada', 'success');
    }

    importarConfiguracion() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedConfig = JSON.parse(event.target.result);
                    this.config = { ...this.getDefaultConfig(), ...importedConfig };
                    localStorage.setItem('portfolioConfig', JSON.stringify(this.config));
                    
                    this.showNotification('✅ Configuración importada', 'success');
                    
                    // Recargar para aplicar cambios
                    setTimeout(() => location.reload(), 1000);
                } catch (error) {
                    this.showNotification('❌ Error al importar configuración', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    reiniciarRendimiento() {
        // Limpiar caché
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        
        // Limpiar localStorage no esencial
        const keysToKeep = ['portfolioConfig'];
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
            if (!keysToKeep.includes(key)) {
                localStorage.removeItem(key);
            }
        });
        
        this.showNotification('🔄 Rendimiento optimizado', 'success');
    }

    resetearTodo() {
        if (!confirm('⚠️ ¡ADVERTENCIA! ¿Estás seguro de eliminar toda la configuración y datos?')) {
            return;
        }
        
        if (!confirm('🚨 ¿REALMENTE QUIERES ELIMINAR TODO? Se perderá toda la información.')) {
            return;
        }
        
        // Limpiar todo el almacenamiento
        localStorage.clear();
        sessionStorage.clear();
        
        // Recargar la aplicación
        location.reload();
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
window.configuracion = new Configuracion();

// Auto-inicialización cuando la pestaña de configuración se active
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'tab-settings' && 
                mutation.target.classList.contains('active')) {
                window.configuracion.init();
            }
        });
    });

    const tabSettings = document.getElementById('tab-settings');
    if (tabSettings) {
        observer.observe(tabSettings, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
    }
});
