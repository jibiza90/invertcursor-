// Controles para actualizaciones incrementales
class IncrementalControls {
    constructor() {
        this.isVisible = false;
        this.controls = null;
        this.toggle = null;
        this.updateInterval = null;
        
        this.init();
    }
    
    init() {
        this.createControls();
        this.createToggle();
        this.bindEvents();
        this.startAutoUpdate();
        
        console.log('🎛️ Controles incrementales inicializados');
    }
    
    createControls() {
        // Crear panel de controles
        this.controls = document.createElement('div');
        this.controls.className = 'incremental-controls hidden';
        this.controls.innerHTML = `
            <h4>⚡ Actualizaciones Incrementales</h4>
            
            <div class="incremental-stats">
                <div class="incremental-stat">
                    <span class="incremental-stat-label">Total Updates</span>
                    <span class="incremental-stat-value" id="stat-total">0</span>
                </div>
                <div class="incremental-stat">
                    <span class="incremental-stat-label">Partial</span>
                    <span class="incremental-stat-value" id="stat-partial">0</span>
                </div>
                <div class="incremental-stat">
                    <span class="incremental-stat-label">Skipped</span>
                    <span class="incremental-stat-value" id="stat-skipped">0</span>
                </div>
                <div class="incremental-stat">
                    <span class="incremental-stat-label">Full</span>
                    <span class="incremental-stat-value" id="stat-full">0</span>
                </div>
            </div>
            
            <div class="incremental-controls-buttons">
                <button class="incremental-btn primary" id="btn-force-update">
                    Forzar Update
                </button>
                <button class="incremental-btn" id="btn-toggle-mode">
                    Modo: Auto
                </button>
                <button class="incremental-btn danger" id="btn-reset-stats">
                    Reset
                </button>
            </div>
            
            <div class="incremental-status" id="status-message">
                Listo para actualizaciones
            </div>
        `;
        
        document.body.appendChild(this.controls);
    }
    
    createToggle() {
        // Crear botón toggle
        this.toggle = document.createElement('button');
        this.toggle.className = 'incremental-toggle';
        this.toggle.innerHTML = '⚡';
        this.toggle.title = 'Mostrar/Ocultar controles incrementales';
        
        document.body.appendChild(this.toggle);
    }
    
    bindEvents() {
        // Toggle panel
        this.toggle.addEventListener('click', () => {
            this.togglePanel();
        });
        
        // Forzar actualización
        const forceBtn = document.getElementById('btn-force-update');
        if (forceBtn) {
            forceBtn.addEventListener('click', () => {
                this.forceUpdate();
            });
        }
        
        // Cambiar modo
        const modeBtn = document.getElementById('btn-toggle-mode');
        if (modeBtn) {
            modeBtn.addEventListener('click', () => {
                this.toggleMode();
            });
        }
        
        // Reset stats
        const resetBtn = document.getElementById('btn-reset-stats');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetStats();
            });
        }
        
        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+I para mostrar/ocultar
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                this.togglePanel();
            }
            
            // Ctrl+Shift+U para forzar update
            if (e.ctrlKey && e.shiftKey && e.key === 'U') {
                e.preventDefault();
                this.forceUpdate();
            }
        });
    }
    
    togglePanel() {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            this.controls.classList.remove('hidden');
            this.controls.classList.add('show');
            this.updateStats();
        } else {
            this.controls.classList.add('hidden');
            this.controls.classList.remove('show');
        }
    }
    
    async forceUpdate() {
        if (!window.incrementalUpdater) {
            this.updateStatus('❌ Incremental updater no disponible', 'error');
            return;
        }
        
        this.updateStatus('⏳ Forzando actualización...', 'warning');
        
        try {
            await window.incrementalUpdater.forceFullUpdate();
            this.updateStats();
            this.updateStatus('✅ Actualización forzada completada', 'success');
        } catch (error) {
            console.error('Error en actualización forzada:', error);
            this.updateStatus('❌ Error en actualización forzada', 'error');
        }
    }
    
    toggleMode() {
        const btn = document.getElementById('btn-toggle-mode');
        if (!btn || !window.incrementalUpdater) return;
        
        const currentInterval = window.incrementalUpdater.updateInterval;
        let newInterval;
        let modeText;
        
        if (currentInterval === 1000) {
            newInterval = 5000;
            modeText = 'Modo: Normal';
        } else if (currentInterval === 5000) {
            newInterval = 10000;
            modeText = 'Modo: Lento';
        } else {
            newInterval = 1000;
            modeText = 'Modo: Rápido';
        }
        
        window.incrementalUpdater.setUpdateInterval(newInterval);
        btn.textContent = modeText;
        
        this.updateStatus(`⚡ Cambiado a ${modeText} (${newInterval}ms)`, 'success');
    }
    
    resetStats() {
        if (!window.incrementalUpdater) return;
        
        // Resetear estadísticas del updater
        window.incrementalUpdater.stats = {
            totalUpdates: 0,
            skippedUpdates: 0,
            partialUpdates: 0,
            fullUpdates: 0
        };
        
        this.updateStats();
        this.updateStatus('📊 Estadísticas reseteadas', 'success');
    }
    
    updateStats() {
        if (!window.incrementalUpdater) return;
        
        const stats = window.incrementalUpdater.getStats();
        
        // Actualizar contadores
        const totalEl = document.getElementById('stat-total');
        const partialEl = document.getElementById('stat-partial');
        const skippedEl = document.getElementById('stat-skipped');
        const fullEl = document.getElementById('stat-full');
        
        if (totalEl) totalEl.textContent = stats.totalUpdates || 0;
        if (partialEl) partialEl.textContent = stats.partialUpdates || 0;
        if (skippedEl) skippedEl.textContent = stats.skippedUpdates || 0;
        if (fullEl) fullEl.textContent = stats.fullUpdates || 0;
        
        // Actualizar estado si está procesando
        if (stats.isProcessing) {
            this.updateStatus('⏳ Procesando actualizaciones...', 'warning');
        }
    }
    
    updateStatus(message, type = 'success') {
        const statusEl = document.getElementById('status-message');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = `incremental-status ${type}`;
        
        // Resetear clase después de 3 segundos
        setTimeout(() => {
            statusEl.className = 'incremental-status';
        }, 3000);
    }
    
    startAutoUpdate() {
        // Actualizar estadísticas cada 2 segundos si el panel está visible
        this.updateInterval = setInterval(() => {
            if (this.isVisible) {
                this.updateStats();
            }
        }, 2000);
    }
    
    // Método público para mostrar notificaciones
    showNotification(message, type = 'info') {
        this.updateStatus(message, type);
        
        // Mostrar panel temporalmente si está oculto
        if (!this.isVisible) {
            this.togglePanel();
            
            // Ocultar después de 5 segundos
            setTimeout(() => {
                if (this.isVisible) {
                    this.togglePanel();
                }
            }, 5000);
        }
    }
    
    // Destructor
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.controls) {
            this.controls.remove();
        }
        
        if (this.toggle) {
            this.toggle.remove();
        }
    }
}

// Instancia global
let incrementalControls = null;

// Inicializar cuando el DOM esté listo
function initIncrementalControls() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            incrementalControls = new IncrementalControls();
        });
    } else {
        incrementalControls = new IncrementalControls();
    }
}

// Auto-inicializar
initIncrementalControls();

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IncrementalControls, incrementalControls, initIncrementalControls };
} else {
    window.IncrementalControls = IncrementalControls;
    window.incrementalControls = incrementalControls;
    window.initIncrementalControls = initIncrementalControls;
}
