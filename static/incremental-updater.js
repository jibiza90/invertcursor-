// Sistema de actualizaciones incrementales
class IncrementalUpdater {
    constructor() {
        this.lastUpdate = null;
        this.pendingUpdates = new Map();
        this.updateQueue = [];
        this.isProcessing = false;
        this.subscribers = new Map();
        this.updateInterval = 5000; // 5 segundos por defecto
        
        // Cache de estado anterior para detectar cambios
        this.previousState = {
            clientes: new Map(),
            saldos: new Map(),
            estadisticas: new Map(),
            general: new Map()
        };
        
        // Estadísticas
        this.stats = {
            totalUpdates: 0,
            skippedUpdates: 0,
            partialUpdates: 0,
            fullUpdates: 0
        };
        
        this.init();
    }
    
    init() {
        // Iniciar polling incremental
        this.startIncrementalPolling();
        
        // Suscribirse a cambios locales
        this.subscribeToLocalChanges();
        
        console.log('🔄 Incremental Updater inicializado');
    }
    
    // Generar diff entre estado anterior y nuevo
    generateDiff(oldState, newState) {
        const diff = {
            timestamp: Date.now(),
            changes: {
                added: [],
                modified: [],
                deleted: []
            },
            metadata: {
                totalChanges: 0,
                affectedEntities: []
            }
        };
        
        // Detectar cambios en clientes
        const clientChanges = this.detectChanges(oldState.clientes, newState.clientes, 'cliente');
        diff.changes.added.push(...clientChanges.added);
        diff.changes.modified.push(...clientChanges.modified);
        diff.changes.deleted.push(...clientChanges.deleted);
        
        // Detectar cambios en saldos
        const saldoChanges = this.detectChanges(oldState.saldos, newState.saldos, 'saldo');
        diff.changes.added.push(...saldoChanges.added);
        diff.changes.modified.push(...saldoChanges.modified);
        diff.changes.deleted.push(...saldoChanges.deleted);
        
        // Calcular metadata
        diff.metadata.totalChanges = diff.changes.added.length + diff.changes.modified.length + diff.changes.deleted.length;
        diff.metadata.affectedEntities = [...new Set([
            ...diff.changes.added.map(c => c.id),
            ...diff.changes.modified.map(c => c.id),
            ...diff.changes.deleted.map(c => c.id)
        ])];
        
        return diff;
    }
    
    // Detectar cambios entre dos estados
    detectChanges(oldMap, newMap, entityType) {
        const changes = {
            added: [],
            modified: [],
            deleted: []
        };
        
        // Detectar nuevos y modificados
        for (const [id, newValue] of newMap.entries()) {
            const oldValue = oldMap.get(id);
            
            if (!oldValue) {
                // Nuevo elemento
                changes.added.push({
                    id,
                    type: entityType,
                    data: newValue,
                    action: 'add'
                });
            } else if (!this.deepEqual(oldValue, newValue)) {
                // Elemento modificado
                const fieldChanges = this.getFieldChanges(oldValue, newValue);
                changes.modified.push({
                    id,
                    type: entityType,
                    data: newValue,
                    changes: fieldChanges,
                    action: 'update'
                });
            }
        }
        
        // Detectar eliminados
        for (const [id, oldValue] of oldMap.entries()) {
            if (!newMap.has(id)) {
                changes.deleted.push({
                    id,
                    type: entityType,
                    data: oldValue,
                    action: 'delete'
                });
            }
        }
        
        return changes;
    }
    
    // Obtener cambios específicos entre dos objetos
    getFieldChanges(oldObj, newObj) {
        const changes = {};
        
        for (const key in newObj) {
            if (oldObj[key] !== newObj[key]) {
                changes[key] = {
                    old: oldObj[key],
                    new: newObj[key]
                };
            }
        }
        
        return changes;
    }
    
    // Comparación profunda de objetos
    deepEqual(obj1, obj2) {
        if (obj1 === obj2) return true;
        
        if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) {
            return obj1 === obj2;
        }
        
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        for (const key of keys1) {
            if (!keys2.includes(key) || !this.deepEqual(obj1[key], obj2[key])) {
                return false;
            }
        }
        
        return true;
    }
    
    // Aplicar diff al DOM
    applyDiff(diff) {
        if (diff.metadata.totalChanges === 0) {
            this.stats.skippedUpdates++;
            return;
        }
        
        console.log(`🔄 Aplicando ${diff.metadata.totalChanges} cambios incrementales`);
        
        // Agrupar cambios por tipo para optimizar
        const changesByType = this.groupChangesByType(diff.changes);
        
        // Aplicar cambios de clientes
        if (changesByType.cliente) {
            this.applyClientChanges(changesByType.cliente);
        }
        
        // Aplicar cambios de saldos
        if (changesByType.saldo) {
            this.applySaldoChanges(changesByType.saldo);
        }
        
        // Aplicar cambios generales
        if (changesByType.general) {
            this.applyGeneralChanges(changesByType.general);
        }
        
        this.stats.partialUpdates++;
        this.stats.totalUpdates += diff.metadata.totalChanges;
        
        // Notificar a suscriptores
        this.notifySubscribers(diff);
    }
    
    // Agrupar cambios por tipo
    groupChangesByType(changes) {
        const grouped = {};
        
        [...changes.added, ...changes.modified, ...changes.deleted].forEach(change => {
            if (!grouped[change.type]) {
                grouped[change.type] = {
                    added: [],
                    modified: [],
                    deleted: []
                };
            }
            grouped[change.type][change.action].push(change);
        });
        
        return grouped;
    }
    
    // Aplicar cambios de clientes
    applyClientChanges(clientChanges) {
        // Actualizar tarjetas de clientes
        clientChanges.added.forEach(change => {
            this.addClientCard(change);
        });
        
        clientChanges.modified.forEach(change => {
            this.updateClientCard(change);
        });
        
        clientChanges.deleted.forEach(change => {
            this.removeClientCard(change);
        });
    }
    
    // Aplicar cambios de saldos
    applySaldoChanges(saldoChanges) {
        saldoChanges.modified.forEach(change => {
            this.updateSaldoDisplay(change);
        });
    }
    
    // Aplicar cambios generales
    applyGeneralChanges(generalChanges) {
        generalChanges.modified.forEach(change => {
            this.updateGeneralDisplay(change);
        });
    }
    
    // Añadir tarjeta de cliente
    addClientCard(change) {
        const container = document.getElementById('clientesCards');
        if (!container) return;
        
        const card = this.createClientCard(change.data);
        container.appendChild(card);
        
        // Animación de entrada
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 10);
    }
    
    // Actualizar tarjeta de cliente
    updateClientCard(change) {
        const selector = `[data-cliente-id="${change.id}"]`;
        const card = document.querySelector(selector);
        
        if (!card) return;
        
        // Actualizar solo los campos que cambiaron
        Object.entries(change.changes).forEach(([field, changeInfo]) => {
            const element = card.querySelector(`[data-field="${field}"]`);
            if (element) {
                element.textContent = changeInfo.new;
                
                // Animación sutil para highlight
                element.style.transition = 'background-color 0.3s ease';
                element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                setTimeout(() => {
                    element.style.backgroundColor = '';
                }, 1000);
            }
        });
    }
    
    // Eliminar tarjeta de cliente
    removeClientCard(change) {
        const selector = `[data-cliente-id="${change.id}"]`;
        const card = document.querySelector(selector);
        
        if (!card) return;
        
        // Animación de salida
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateX(-100%)';
        
        setTimeout(() => {
            card.remove();
        }, 300);
    }
    
    // Actualizar display de saldo
    updateSaldoDisplay(change) {
        const elements = document.querySelectorAll(`[data-saldo-id="${change.id}"]`);
        
        elements.forEach(element => {
            const oldValue = element.textContent;
            const newValue = this.formatMoneda(change.data.saldo);
            
            if (oldValue !== newValue) {
                element.textContent = newValue;
                
                // Animación de cambio
                element.style.transition = 'all 0.3s ease';
                element.style.transform = 'scale(1.1)';
                element.style.color = change.data.saldo >= 0 ? '#48bb78' : '#f56565';
                
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 200);
            }
        });
    }
    
    // Actualizar display general
    updateGeneralDisplay(change) {
        // Implementar según necesites
        console.log('Actualizando display general:', change);
    }
    
    // Crear tarjeta de cliente (simplificado)
    createClientCard(clientData) {
        const card = document.createElement('div');
        card.className = 'cliente-card-mini';
        card.dataset.clienteId = clientData.id;
        
        card.innerHTML = `
            <div class="cliente-card-title">${clientData.nombre || `Cliente ${clientData.id}`}</div>
            <div class="cliente-card-row">
                <div class="cliente-card-k">Saldo</div>
                <div class="cliente-card-v" data-field="saldo" data-saldo-id="${clientData.id}">
                    ${this.formatMoneda(clientData.saldo)}
                </div>
            </div>
        `;
        
        return card;
    }
    
    // Formatear moneda
    formatMoneda(valor) {
        if (typeof valor !== 'number') return '—';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(valor);
    }
    
    // Iniciar polling incremental
    startIncrementalPolling() {
        setInterval(() => {
            this.checkForUpdates();
        }, this.updateInterval);
    }
    
    // Verificar actualizaciones
    async checkForUpdates() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        try {
            // Obtener estado actual
            const currentState = this.captureCurrentState();
            
            // Generar diff
            const diff = this.generateDiff(this.previousState, currentState);
            
            // Aplicar cambios si hay alguno
            if (diff.metadata.totalChanges > 0) {
                this.applyDiff(diff);
                
                // Actualizar estado anterior
                this.previousState = currentState;
            }
            
        } catch (error) {
            console.error('Error en actualización incremental:', error);
        } finally {
            this.isProcessing = false;
        }
    }
    
    // Capturar estado actual
    captureCurrentState() {
        const state = {
            clientes: new Map(),
            saldos: new Map(),
            estadisticas: new Map(),
            general: new Map()
        };
        
        // Capturar estado de clientes
        if (window.datosEditados && window.datosEditados.hojas) {
            const hoja = window.datosEditados.hojas[window.hojaActual];
            if (hoja && hoja.clientes) {
                hoja.clientes.forEach((cliente, index) => {
                    state.clientes.set(index.toString(), {
                        id: index.toString(),
                        nombre: cliente.datos?.NOMBRE?.valor,
                        saldo: this.calculateClientSaldo(cliente),
                        garantia: cliente.datos?.GARANTIA_INICIAL?.valor
                    });
                    
                    state.saldos.set(index.toString(), {
                        id: index.toString(),
                        saldo: this.calculateClientSaldo(cliente)
                    });
                });
            }
        }
        
        // Capturar estado general
        state.general.set('hojaActual', window.hojaActual);
        state.general.set('totalClientes', state.clientes.size);
        
        return state;
    }
    
    // Calcular saldo de cliente
    calculateClientSaldo(cliente) {
        if (!cliente.datos_diarios) return 0;
        
        const lastData = cliente.datos_diarios
            .filter(d => d && (d.saldo_diario !== null || d.imp_final !== null))
            .sort((a, b) => (b.fila || 0) - (a.fila || 0))[0];
            
        return lastData ? (lastData.saldo_diario || lastData.imp_final || 0) : 0;
    }
    
    // Suscribirse a cambios locales
    subscribeToLocalChanges() {
        // Escuchar cambios en inputs
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('info-cliente-input')) {
                this.scheduleUpdate('local_input', e.target);
            }
        });
        
        // Escuchar cambios en selects
        document.addEventListener('change', (e) => {
            if (e.target.id === 'selectorHoja') {
                this.scheduleUpdate('hoja_change', e.target);
            }
        });
    }
    
    // Programar actualización
    scheduleUpdate(type, element) {
        const key = `${type}_${Date.now()}`;
        this.pendingUpdates.set(key, { type, element, timestamp: Date.now() });
        
        // Procesar después de un breve delay
        setTimeout(() => {
            this.processPendingUpdates();
        }, 100);
    }
    
    // Procesar actualizaciones pendientes
    processPendingUpdates() {
        if (this.pendingUpdates.size === 0) return;
        
        const updates = Array.from(this.pendingUpdates.values());
        this.pendingUpdates.clear();
        
        // Agrupar actualizaciones similares
        const grouped = this.groupUpdates(updates);
        
        // Procesar cada grupo
        Object.values(grouped).forEach(group => {
            this.processUpdateGroup(group);
        });
    }
    
    // Agrupar actualizaciones
    groupUpdates(updates) {
        const grouped = {};
        
        updates.forEach(update => {
            const key = update.type;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(update);
        });
        
        return grouped;
    }
    
    // Procesar grupo de actualizaciones
    processUpdateGroup(group) {
        // Procesar solo la última actualización de cada tipo
        const latest = group[group.length - 1];
        
        switch (latest.type) {
            case 'local_input':
                this.handleInputChange(latest.element);
                break;
            case 'hoja_change':
                this.handleHojaChange(latest.element);
                break;
        }
    }
    
    // Manejar cambio de input
    handleInputChange(element) {
        // Forzar actualización incremental inmediata
        this.checkForUpdates();
    }
    
    // Manejar cambio de hoja
    handleHojaChange(element) {
        // Limpiar estado anterior al cambiar de hoja
        this.previousState = {
            clientes: new Map(),
            saldos: new Map(),
            estadisticas: new Map(),
            general: new Map()
        };
        
        // Forzar actualización completa
        setTimeout(() => {
            this.checkForUpdates();
        }, 500);
    }
    
    // Sistema de suscriptores
    subscribe(eventType, callback) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        this.subscribers.get(eventType).push(callback);
    }
    
    // Notificar suscriptores
    notifySubscribers(diff) {
        this.subscribers.forEach((callbacks, eventType) => {
            callbacks.forEach(callback => {
                try {
                    callback(diff);
                } catch (error) {
                    console.error('Error en suscriptor:', error);
                }
            });
        });
    }
    
    // Obtener estadísticas
    getStats() {
        return {
            ...this.stats,
            pendingUpdates: this.pendingUpdates.size,
            isProcessing: this.isProcessing,
            subscribers: this.subscribers.size
        };
    }
    
    // Configurar intervalo de actualización
    setUpdateInterval(interval) {
        this.updateInterval = interval;
    }
    
    // Forzar actualización completa
    forceFullUpdate() {
        this.previousState = {
            clientes: new Map(),
            saldos: new Map(),
            estadisticas: new Map(),
            general: new Map()
        };
        
        this.stats.fullUpdates++;
        this.checkForUpdates();
    }
}

// Instancia global
const incrementalUpdater = new IncrementalUpdater();

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IncrementalUpdater, incrementalUpdater };
} else {
    window.IncrementalUpdater = IncrementalUpdater;
    window.incrementalUpdater = incrementalUpdater;
}
