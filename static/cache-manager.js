// Sistema de cache inteligente con memoización y LRU
class CacheManager {
    constructor(maxSize = 1000, ttl = 300000) { // 5 minutos TTL por defecto
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.accessOrder = [];
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }
    
    // Generar clave de cache optimizada
    generateKey(prefix, ...args) {
        const keyData = args.map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, Object.keys(arg).sort());
            }
            return String(arg);
        });
        return `${prefix}:${keyData.join(':')}`;
    }
    
    // Obtener valor del cache
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            this.stats.misses++;
            return null;
        }
        
        // Verificar TTL
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }
        
        // Actualizar orden de acceso (LRU)
        this.updateAccessOrder(key);
        this.stats.hits++;
        
        return item.data;
    }
    
    // Guardar valor en cache
    set(key, data, customTtl = null) {
        const ttl = customTtl || this.ttl;
        const expiry = Date.now() + ttl;
        
        // Evict si es necesario
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }
        
        this.cache.set(key, {
            data,
            expiry,
            timestamp: Date.now()
        });
        
        this.updateAccessOrder(key);
    }
    
    // Actualizar orden de acceso
    updateAccessOrder(key) {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        this.accessOrder.push(key);
    }
    
    // Evict LRU (Least Recently Used)
    evictLRU() {
        if (this.accessOrder.length === 0) return;
        
        const lruKey = this.accessOrder.shift();
        this.cache.delete(lruKey);
        this.stats.evictions++;
    }
    
    // Limpiar cache expirado
    cleanup() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => {
            this.cache.delete(key);
            const index = this.accessOrder.indexOf(key);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
        });
        
        return expiredKeys.length;
    }
    
    // Limpiar cache completo
    clear() {
        this.cache.clear();
        this.accessOrder = [];
        this.stats = { hits: 0, misses: 0, evictions: 0 };
    }
    
    // Obtener estadísticas
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
            size: this.cache.size,
            maxSize: this.maxSize
        };
    }
    
    // Memoización de funciones
    memoize(fn, ttl = null) {
        const cache = new Map();
        
        return (...args) => {
            const key = JSON.stringify(args);
            const cached = cache.get(key);
            
            if (cached && (ttl === null || Date.now() - cached.timestamp < ttl)) {
                return cached.result;
            }
            
            const result = fn(...args);
            cache.set(key, {
                result,
                timestamp: Date.now()
            });
            
            return result;
        };
    }
}

// Cache especializado para cálculos de clientes
class ClienteCache {
    constructor() {
        this.saldos = new CacheManager(500, 600000); // 10 minutos
        this.estadisticas = new CacheManager(200, 300000); // 5 minutos
        this.renders = new CacheManager(100, 60000); // 1 minuto
    }
    
    // Cache de saldos calculados
    getSaldos(clienteId, hoja, fila) {
        const key = this.saldos.generateKey('saldos', clienteId, hoja, fila);
        return this.saldos.get(key);
    }
    
    setSaldos(clienteId, hoja, fila, data) {
        const key = this.saldos.generateKey('saldos', clienteId, hoja, fila);
        this.saldos.set(key, data);
    }
    
    // Cache de estadísticas
    getEstadisticas(clienteId, tipo, params) {
        const key = this.estadisticas.generateKey('stats', clienteId, tipo, params);
        return this.estadisticas.get(key);
    }
    
    setEstadisticas(clienteId, tipo, params, data) {
        const key = this.estadisticas.generateKey('stats', clienteId, tipo, params);
        this.estadisticas.set(key, data);
    }
    
    // Cache de renders
    getRender(componentId, props) {
        const key = this.renders.generateKey('render', componentId, props);
        return this.renders.get(key);
    }
    
    setRender(componentId, props, html) {
        const key = this.renders.generateKey('render', componentId, props);
        this.renders.set(key, html);
    }
    
    // Limpiar caches de un cliente específico
    clearCliente(clienteId) {
        // Implementar limpieza específica por cliente
        this.saldos.clear();
        this.estadisticas.clear();
        this.renders.clear();
    }
    
    // Obtener estadísticas generales
    getStats() {
        return {
            saldos: this.saldos.getStats(),
            estadisticas: this.estadisticas.getStats(),
            renders: this.renders.getStats()
        };
    }
}

// Instancia global del cache
const cacheManager = new ClienteCache();

// Auto-limpieza periódica
setInterval(() => {
    cacheManager.saldos.cleanup();
    cacheManager.estadisticas.cleanup();
    cacheManager.renders.cleanup();
}, 60000); // Cada minuto

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CacheManager, ClienteCache, cacheManager };
} else {
    window.CacheManager = CacheManager;
    window.ClienteCache = ClienteCache;
    window.cacheManager = cacheManager;
}
