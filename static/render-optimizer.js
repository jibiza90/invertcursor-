// Optimizador de renderizado con RequestAnimationFrame y batching
class RenderOptimizer {
    constructor() {
        this.pendingUpdates = new Map();
        this.rafId = null;
        this.isProcessing = false;
        this.batchSize = 50;
        this.stats = {
            totalUpdates: 0,
            batchedUpdates: 0,
            skippedUpdates: 0
        };
        
        // Prioridades de actualización
        this.priorities = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3
        };
    }
    
    // Programar actualización con prioridad
    scheduleUpdate(key, updateFn, priority = 'medium') {
        // Si ya existe una actualización pendiente con mayor prioridad, ignorar
        const existing = this.pendingUpdates.get(key);
        if (existing && this.priorities[existing.priority] <= this.priorities[priority]) {
            this.stats.skippedUpdates++;
            return;
        }
        
        this.pendingUpdates.set(key, {
            fn: updateFn,
            priority,
            timestamp: Date.now()
        });
        
        this.scheduleRender();
    }
    
    // Programar renderizado con RAF
    scheduleRender() {
        if (this.rafId || this.isProcessing) return;
        
        this.rafId = requestAnimationFrame(() => {
            this.processUpdates();
        });
    }
    
    // Procesar actualizaciones en batch
    processUpdates() {
        this.rafId = null;
        this.isProcessing = true;
        
        try {
            // Ordenar por prioridad
            const sortedUpdates = Array.from(this.pendingUpdates.entries())
                .sort(([,a], [,b]) => this.priorities[a.priority] - this.priorities[b.priority]);
            
            // Procesar en batches
            for (let i = 0; i < sortedUpdates.length; i += this.batchSize) {
                const batch = sortedUpdates.slice(i, i + this.batchSize);
                this.processBatch(batch);
                
                // Permitir que el browser respire entre batches
                if (i + this.batchSize < sortedUpdates.length) {
                    setTimeout(() => {}, 0);
                }
            }
            
            this.stats.batchedUpdates += sortedUpdates.length;
            this.pendingUpdates.clear();
            
        } catch (error) {
            console.error('Error procesando actualizaciones:', error);
        } finally {
            this.isProcessing = false;
            
            // Si hay actualizaciones pendientes, continuar
            if (this.pendingUpdates.size > 0) {
                this.scheduleRender();
            }
        }
    }
    
    // Procesar batch de actualizaciones
    processBatch(batch) {
        const fragment = document.createDocumentFragment();
        const domUpdates = [];
        
        batch.forEach(([key, update]) => {
            try {
                const result = update.fn();
                
                if (result && result.type === 'dom') {
                    domUpdates.push(result);
                } else if (result && result.type === 'html') {
                    // Actualizaciones de HTML directas
                    const element = document.querySelector(result.selector);
                    if (element) {
                        element.innerHTML = result.html;
                    }
                }
                
                this.stats.totalUpdates++;
            } catch (error) {
                console.error(`Error en actualización ${key}:`, error);
            }
        });
        
        // Aplicar actualizaciones DOM en batch
        if (domUpdates.length > 0) {
            this.applyDOMUpdates(domUpdates);
        }
    }
    
    // Aplicar actualizaciones DOM de forma optimizada
    applyDOMUpdates(updates) {
        updates.forEach(update => {
            const { element, properties, styles } = update;
            
            // Actualizar propiedades
            if (properties) {
                Object.entries(properties).forEach(([prop, value]) => {
                    element[prop] = value;
                });
            }
            
            // Actualizar estilos
            if (styles) {
                Object.assign(element.style, styles);
            }
        });
    }
    
    // Cancelar actualización específica
    cancelUpdate(key) {
        this.pendingUpdates.delete(key);
    }
    
    // Cancelar todas las actualizaciones
    cancelAllUpdates() {
        this.pendingUpdates.clear();
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.isProcessing = false;
    }
    
    // Forzar procesamiento inmediato (solo para actualizaciones críticas)
    forceUpdate(key) {
        const update = this.pendingUpdates.get(key);
        if (update) {
            try {
                update.fn();
                this.pendingUpdates.delete(key);
                this.stats.totalUpdates++;
            } catch (error) {
                console.error(`Error forzando actualización ${key}:`, error);
            }
        }
    }
    
    // Obtener estadísticas
    getStats() {
        return {
            ...this.stats,
            pendingUpdates: this.pendingUpdates.size,
            isProcessing: this.isProcessing
        };
    }
}

// Optimizador específico para tablas
class TableRenderOptimizer extends RenderOptimizer {
    constructor() {
        super();
        this.tableCache = new Map();
        this.rowCache = new Map();
        this.cellCache = new Map();
    }
    
    // Optimizar renderizado de tabla
    optimizeTableRender(tableId, data, columns) {
        const cacheKey = this.generateTableCacheKey(tableId, data, columns);
        
        // Verificar cache
        if (this.tableCache.has(cacheKey)) {
            return this.tableCache.get(cacheKey);
        }
        
        // Generar HTML optimizado
        const html = this.generateOptimizedTableHTML(data, columns);
        
        // Cache con TTL
        this.tableCache.set(cacheKey, html);
        
        // Limpiar cache periódicamente
        setTimeout(() => {
            this.tableCache.delete(cacheKey);
        }, 300000); // 5 minutos
        
        return html;
    }
    
    // Generar HTML de tabla optimizado
    generateOptimizedTableHTML(data, columns) {
        const fragment = document.createDocumentFragment();
        const table = document.createElement('table');
        table.className = 'optimized-table';
        
        // Generar header
        const thead = this.generateTableHeader(columns);
        table.appendChild(thead);
        
        // Generar body en batch
        const tbody = document.createElement('tbody');
        const batchSize = 100;
        
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const batchFragment = this.generateTableRows(batch, columns, i);
            tbody.appendChild(batchFragment);
        }
        
        table.appendChild(tbody);
        fragment.appendChild(table);
        
        return fragment;
    }
    
    // Generar header de tabla
    generateTableHeader(columns) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.title;
            th.className = `header-${column.key}`;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        return thead;
    }
    
    // Generar filas de tabla en batch
    generateTableRows(data, columns, startIndex) {
        const fragment = document.createDocumentFragment();
        
        data.forEach((rowData, index) => {
            const row = document.createElement('tr');
            row.dataset.index = startIndex + index;
            
            columns.forEach(column => {
                const cell = document.createElement('td');
                cell.className = `cell-${column.key}`;
                
                const value = rowData[column.key];
                cell.textContent = this.formatCellValue(value, column);
                
                // Aplicar clases condicionales
                if (column.className) {
                    cell.classList.add(column.className);
                }
                
                row.appendChild(cell);
            });
            
            fragment.appendChild(row);
        });
        
        return fragment;
    }
    
    // Formatear valor de celda
    formatCellValue(value, column) {
        if (value === null || value === undefined) {
            return '';
        }
        
        switch (column.type) {
            case 'currency':
                return this.formatCurrency(value);
            case 'percentage':
                return this.formatPercentage(value);
            case 'date':
                return this.formatDate(value);
            default:
                return String(value);
        }
    }
    
    // Formateadores optimizados
    formatCurrency(value) {
        if (typeof value !== 'number') return '';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(value);
    }
    
    formatPercentage(value) {
        if (typeof value !== 'number') return '';
        return `${(value * 100).toFixed(2)}%`;
    }
    
    formatDate(value) {
        if (value instanceof Date) {
            return value.toLocaleDateString('es-ES');
        }
        return String(value);
    }
    
    // Generar clave de cache para tabla
    generateTableCacheKey(tableId, data, columns) {
        const dataHash = this.hashData(data);
        const columnsHash = this.hashData(columns);
        return `${tableId}:${dataHash}:${columnsHash}`;
    }
    
    // Hash simple para datos (para cache)
    hashData(data) {
        if (!data || data.length === 0) return 'empty';
        
        const str = JSON.stringify(data.slice(0, 10)); // Solo primeros 10 para hash
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
}

// Instancia global
const renderOptimizer = new TableRenderOptimizer();

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RenderOptimizer, TableRenderOptimizer, renderOptimizer };
} else {
    window.RenderOptimizer = RenderOptimizer;
    window.TableRenderOptimizer = TableRenderOptimizer;
    window.renderOptimizer = renderOptimizer;
}
