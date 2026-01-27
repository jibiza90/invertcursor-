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
                <h2>⚙️ Configuración</h2>
                <p>Personaliza tu experiencia de Portfolio Manager</p>
            </div>
            
            <div class="config-sections">
                <!-- Configuración General -->
                <div class="config-section">
                    <h3>🌍 General</h3>
                    <div class="config-group">
                        <div class="config-item">
                            <label>Idioma:</label>
                            <select id="configIdioma" onchange="window.configuracion.saveConfig()">
                                <option value="es" ${this.config.general.idioma === 'es' ? 'selected' : ''}>Español</option>
                                <option value="en" ${this.config.general.idioma === 'en' ? 'selected' : ''}>English</option>
                                <option value="ca" ${this.config.general.idioma === 'ca' ? 'selected' : ''}>Català</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>Formato de Moneda:</label>
                            <select id="configMoneda" onchange="window.configuracion.saveConfig()">
                                <option value="EUR" ${this.config.general.formatoMoneda === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                                <option value="USD" ${this.config.general.formatoMoneda === 'USD' ? 'selected' : ''}>USD ($)</option>
                                <option value="GBP" ${this.config.general.formatoMoneda === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>Formato de Fecha:</label>
                            <select id="configFecha" onchange="window.configuracion.saveConfig()">
                                <option value="DD/MM/YYYY" ${this.config.general.formatoFecha === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
                                <option value="MM/DD/YYYY" ${this.config.general.formatoFecha === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
                                <option value="YYYY-MM-DD" ${this.config.general.formatoFecha === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>Decimales:</label>
                            <select id="configDecimales" onchange="window.configuracion.saveConfig()">
                                <option value="0" ${this.config.general.decimales === 0 ? 'selected' : ''}>0</option>
                                <option value="1" ${this.config.general.decimales === 1 ? 'selected' : ''}>1</option>
                                <option value="2" ${this.config.general.decimales === 2 ? 'selected' : ''}>2</option>
                                <option value="3" ${this.config.general.decimales === 3 ? 'selected' : ''}>3</option>
                                <option value="4" ${this.config.general.decimales === 4 ? 'selected' : ''}>4</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="configAutoGuardar" 
                                       ${this.config.general.autoGuardar ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                Auto-guardar cambios
                            </label>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="configNotificaciones" 
                                       ${this.config.general.notificaciones ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                Mostrar notificaciones
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Configuración Visual -->
                <div class="config-section">
                    <h3>🎨 Visual</h3>
                    <div class="config-group">
                        <div class="config-item">
                            <label>Tema:</label>
                            <select id="configTema" onchange="window.configuracion.applyTheme()">
                                <option value="claro" ${this.config.visual.tema === 'claro' ? 'selected' : ''}>Claro</option>
                                <option value="oscuro" ${this.config.visual.tema === 'oscuro' ? 'selected' : ''}>Oscuro</option>
                                <option value="auto" ${this.config.visual.tema === 'auto' ? 'selected' : ''}>Automático</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>Fuente:</label>
                            <select id="configFuente" onchange="window.configuracion.applyFont()">
                                <option value="default" ${this.config.visual.fuente === 'default' ? 'selected' : ''}>Default</option>
                                <option value="arial" ${this.config.visual.fuente === 'arial' ? 'selected' : ''}>Arial</option>
                                <option value="helvetica" ${this.config.visual.fuente === 'helvetica' ? 'selected' : ''}>Helvetica</option>
                                <option value="times" ${this.config.visual.fuente === 'times' ? 'selected' : ''}>Times New Roman</option>
                                <option value="courier" ${this.config.visual.fuente === 'courier' ? 'selected' : ''}>Courier New</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>Tamaño de Fuente:</label>
                            <select id="configTamañoFuente" onchange="window.configuracion.applyFontSize()">
                                <option value="small" ${this.config.visual.tamañoFuente === 'small' ? 'selected' : ''}>Pequeña</option>
                                <option value="medium" ${this.config.visual.tamañoFuente === 'medium' ? 'selected' : ''}>Mediana</option>
                                <option value="large" ${this.config.visual.tamañoFuente === 'large' ? 'selected' : ''}>Grande</option>
                                <option value="xlarge" ${this.config.visual.tamañoFuente === 'xlarge' ? 'selected' : ''}>Extra Grande</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="configAnimaciones" 
                                       ${this.config.visual.animaciones ? 'checked' : ''}
                                       onchange="window.configuracion.applyAnimations()">
                                Activar animaciones
                            </label>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="configCompactMode" 
                                       ${this.config.visual.compactMode ? 'checked' : ''}
                                       onchange="window.configuracion.applyCompactMode()">
                                Modo compacto
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Configuración de Datos -->
                <div class="config-section">
                    <h3>📊 Datos</h3>
                    <div class="config-group">
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="configBackupAuto" 
                                       ${this.config.datos.backupAutomatico ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                Backup automático
                            </label>
                        </div>
                        
                        <div class="config-item">
                            <label>Frecuencia de Backup:</label>
                            <select id="configFrecuenciaBackup" onchange="window.configuracion.saveConfig()">
                                <option value="hourly" ${this.config.datos.frecuenciaBackup === 'hourly' ? 'selected' : ''}>Cada hora</option>
                                <option value="daily" ${this.config.datos.frecuenciaBackup === 'daily' ? 'selected' : ''}>Diario</option>
                                <option value="weekly" ${this.config.datos.frecuenciaBackup === 'weekly' ? 'selected' : ''}>Semanal</option>
                                <option value="monthly" ${this.config.datos.frecuenciaBackup === 'monthly' ? 'selected' : ''}>Mensual</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>Retención de Datos (días):</label>
                            <input type="number" id="configRetencionDatos" 
                                   value="${this.config.datos.retencionDatos}"
                                   min="7" max="3650"
                                   onchange="window.configuracion.saveConfig()">
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="configCacheActivo" 
                                       ${this.config.datos.cacheActivo ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                Activar caché
                            </label>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="configValidacionDatos" 
                                       ${this.config.datos.validacionDatos ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                Validación automática de datos
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Configuración de Exportación -->
                <div class="config-section">
                    <h3>📤 Exportación</h3>
                    <div class="config-group">
                        <div class="config-item">
                            <label>Formato por Defecto:</label>
                            <select id="configFormatoDefecto" onchange="window.configuracion.saveConfig()">
                                <option value="excel" ${this.config.exportacion.formatoDefecto === 'excel' ? 'selected' : ''}>Excel</option>
                                <option value="csv" ${this.config.exportacion.formatoDefecto === 'csv' ? 'selected' : ''}>CSV</option>
                                <option value="json" ${this.config.exportacion.formatoDefecto === 'json' ? 'selected' : ''}>JSON</option>
                                <option value="pdf" ${this.config.exportacion.formatoDefecto === 'pdf' ? 'selected' : ''}>PDF</option>
                            </select>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="configIncludeHeaders" 
                                       ${this.config.exportacion.incluirHeaders ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                Incluir encabezados por defecto
                            </label>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="configIncludeFormulas" 
                                       ${this.config.exportacion.incluirFormulas ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                Incluir fórmulas por defecto
                            </label>
                        </div>
                        
                        <div class="config-item">
                            <label>
                                <input type="checkbox" id="configComprimirArchivos" 
                                       ${this.config.exportacion.comprimirArchivos ? 'checked' : ''}
                                       onchange="window.configuracion.saveConfig()">
                                Comprimir archivos automáticamente
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Acciones de Configuración -->
                <div class="config-section">
                    <h3>🔧 Acciones</h3>
                    <div class="config-actions">
                        <button class="btn btn-primary" onclick="window.configuracion.resetConfig()">
                            🔄 Restablecer Configuración
                        </button>
                        
                        <button class="btn btn-secondary" onclick="window.configuracion.exportConfig()">
                            📥 Exportar Configuración
                        </button>
                        
                        <button class="btn btn-secondary" onclick="window.configuracion.importConfig()">
                            📤 Importar Configuración
                        </button>
                        
                        <button class="btn btn-warning" onclick="window.configuracion.clearCache()">
                            🗑️ Limpiar Caché
                        </button>
                        
                        <button class="btn btn-danger" onclick="window.configuracion.clearAllData()">
                            🧹 Limpiar Todos los Datos
                        </button>
                    </div>
                </div>
                
                <!-- Información del Sistema -->
                <div class="config-section">
                    <h3>ℹ️ Información del Sistema</h3>
                    <div class="system-info">
                        <div class="info-item">
                            <label>Versión de la Aplicación:</label>
                            <span>V2.9.18</span>
                        </div>
                        <div class="info-item">
                            <label>Navegador:</label>
                            <span>${this.getBrowserInfo()}</span>
                        </div>
                        <div class="info-item">
                            <label>Resolución:</label>
                            <span>${window.screen.width}x${window.screen.height}</span>
                        </div>
                        <div class="info-item">
                            <label>Última Actualización:</label>
                            <span id="lastUpdate">${new Date().toLocaleString('es-ES')}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    saveConfig() {
        // Recoger valores del formulario
        this.config.general.idioma = document.getElementById('configIdioma')?.value || 'es';
        this.config.general.formatoMoneda = document.getElementById('configMoneda')?.value || 'EUR';
        this.config.general.formatoFecha = document.getElementById('configFecha')?.value || 'DD/MM/YYYY';
        this.config.general.decimales = parseInt(document.getElementById('configDecimales')?.value) || 2;
        this.config.general.autoGuardar = document.getElementById('configAutoGuardar')?.checked || false;
        this.config.general.notificaciones = document.getElementById('configNotificaciones')?.checked || false;
        
        this.config.visual.tema = document.getElementById('configTema')?.value || 'claro';
        this.config.visual.fuente = document.getElementById('configFuente')?.value || 'default';
        this.config.visual.tamañoFuente = document.getElementById('configTamañoFuente')?.value || 'medium';
        this.config.visual.animaciones = document.getElementById('configAnimaciones')?.checked || false;
        this.config.visual.compactMode = document.getElementById('configCompactMode')?.checked || false;
        
        this.config.datos.backupAutomatico = document.getElementById('configBackupAuto')?.checked || false;
        this.config.datos.frecuenciaBackup = document.getElementById('configFrecuenciaBackup')?.value || 'daily';
        this.config.datos.retencionDatos = parseInt(document.getElementById('configRetencionDatos')?.value) || 365;
        this.config.datos.cacheActivo = document.getElementById('configCacheActivo')?.checked || false;
        this.config.datos.validacionDatos = document.getElementById('configValidacionDatos')?.checked || false;
        
        this.config.exportacion.formatoDefecto = document.getElementById('configFormatoDefecto')?.value || 'excel';
        this.config.exportacion.incluirHeaders = document.getElementById('configIncludeHeaders')?.checked || false;
        this.config.exportacion.incluirFormulas = document.getElementById('configIncludeFormulas')?.checked || false;
        this.config.exportacion.comprimirArchivos = document.getElementById('configComprimirArchivos')?.checked || false;
        
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
