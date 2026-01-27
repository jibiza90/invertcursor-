// Virtual Scrolling optimizado para tablas grandes
class VirtualScrollManager {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            itemHeight: options.itemHeight || 40,
            bufferSize: options.bufferSize || 5,
            threshold: options.threshold || 50,
            ...options
        };
        
        this.items = [];
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;
        
        this.viewport = null;
        this.content = null;
        this.spacerTop = null;
        this.spacerBottom = null;
        
        this.renderCallbacks = [];
        this.isInitialized = false;
        
        this.init();
    }
    
    init() {
        this.createViewport();
        this.bindEvents();
        this.isInitialized = true;
    }
    
    createViewport() {
        // Crear estructura del virtual scroll
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-viewport';
        this.viewport.style.cssText = `
            height: 100%;
            overflow-y: auto;
            position: relative;
        `;
        
        this.content = document.createElement('div');
        this.content.className = 'virtual-content';
        this.content.style.cssText = `
            position: relative;
            width: 100%;
        `;
        
        this.spacerTop = document.createElement('div');
        this.spacerTop.className = 'virtual-spacer-top';
        this.spacerTop.style.cssText = `
            width: 100%;
            position: absolute;
            top: 0;
            left: 0;
        `;
        
        this.spacerBottom = document.createElement('div');
        this.spacerBottom.className = 'virtual-spacer-bottom';
        this.spacerBottom.style.cssText = `
            width: 100%;
            position: absolute;
            bottom: 0;
            left: 0;
        `;
        
        this.content.appendChild(this.spacerTop);
        this.content.appendChild(this.spacerBottom);
        this.viewport.appendChild(this.content);
        
        // Reemplazar contenido del container
        this.container.innerHTML = '';
        this.container.appendChild(this.viewport);
    }
    
    bindEvents() {
        // Optimizado con passive listeners
        this.viewport.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        window.addEventListener('resize', this.handleResize.bind(this), { passive: true });
        
        // Intersection Observer para renderizado lazy
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                this.handleIntersection.bind(this),
                { threshold: 0.1 }
            );
        }
    }
    
    setItems(items) {
        this.items = items;
        this.totalHeight = items.length * this.options.itemHeight;
        this.updateDimensions();
        this.render();
    }
    
    updateDimensions() {
        this.containerHeight = this.viewport.clientHeight;
        this.spacerTop.style.height = '0px';
        this.spacerBottom.style.height = '0px';
        this.content.style.height = `${this.totalHeight}px`;
    }
    
    handleScroll() {
        this.scrollTop = this.viewport.scrollTop;
        
        // Throttle con requestAnimationFrame
        if (this.scrollRAF) {
            cancelAnimationFrame(this.scrollRAF);
        }
        
        this.scrollRAF = requestAnimationFrame(() => {
            this.render();
        });
    }
    
    handleResize() {
        if (this.resizeRAF) {
            cancelAnimationFrame(this.resizeRAF);
        }
        
        this.resizeRAF = requestAnimationFrame(() => {
            this.updateDimensions();
            this.render();
        });
    }
    
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Renderizar elementos que entran en viewport
                const index = parseInt(entry.target.dataset.index);
                this.renderItem(index);
            }
        });
    }
    
    calculateVisibleRange() {
        const { itemHeight, bufferSize } = this.options;
        
        // Calcular rango visible
        const start = Math.floor(this.scrollTop / itemHeight);
        const visibleCount = Math.ceil(this.containerHeight / itemHeight);
        const end = start + visibleCount;
        
        // Añadir buffer
        this.visibleStart = Math.max(0, start - bufferSize);
        this.visibleEnd = Math.min(this.items.length - 1, end + bufferSize);
        
        return { start: this.visibleStart, end: this.visibleEnd };
    }
    
    render() {
        if (!this.isInitialized || this.items.length === 0) return;
        
        const { start, end } = this.calculateVisibleRange();
        
        // Actualizar spacers
        this.spacerTop.style.height = `${start * this.options.itemHeight}px`;
        this.spacerBottom.style.height = `${(this.items.length - end - 1) * this.options.itemHeight}px`;
        
        // Limpiar elementos existentes fuera del rango visible
        this.cleanupInvisibleElements(start, end);
        
        // Renderizar elementos visibles
        this.renderVisibleItems(start, end);
    }
    
    renderVisibleItems(start, end) {
        const fragment = document.createDocumentFragment();
        
        for (let i = start; i <= end; i++) {
            const item = this.items[i];
            if (!item) continue;
            
            const element = this.renderItem(i);
            if (element) {
                fragment.appendChild(element);
            }
        }
        
        // Insertar en batch
        if (fragment.children.length > 0) {
            this.content.appendChild(fragment);
        }
    }
    
    renderItem(index) {
        const item = this.items[index];
        if (!item) return null;
        
        // Verificar si ya existe
        let element = this.content.querySelector(`[data-virtual-index="${index}"]`);
        
        if (!element) {
            // Crear nuevo elemento
            element = document.createElement('div');
            element.dataset.virtualIndex = index;
            element.style.cssText = `
                position: absolute;
                top: ${index * this.options.itemHeight}px;
                left: 0;
                right: 0;
                height: ${this.options.itemHeight}px;
                box-sizing: border-box;
            `;
            
            // Renderizar contenido del item
            this.renderItemContent(element, item, index);
            
            // Añadir al observer si existe
            if (this.intersectionObserver) {
                this.intersectionObserver.observe(element);
            }
        }
        
        return element;
    }
    
    renderItemContent(element, item, index) {
        // Template method para sobreescribir
        element.innerHTML = `
            <div class="virtual-item" data-index="${index}">
                ${this.renderItemTemplate(item, index)}
            </div>
        `;
        
        // Ejecutar callbacks
        this.renderCallbacks.forEach(callback => {
            callback(element, item, index);
        });
    }
    
    renderItemTemplate(item, index) {
        // Sobreescribir en implementación específica
        return `<div>Item ${index}: ${JSON.stringify(item)}</div>`;
    }
    
    cleanupInvisibleElements(start, end) {
        const elements = this.content.querySelectorAll('[data-virtual-index]');
        
        elements.forEach(element => {
            const index = parseInt(element.dataset.virtualIndex);
            
            if (index < start || index > end) {
                // Remover del observer
                if (this.intersectionObserver) {
                    this.intersectionObserver.unobserve(element);
                }
                
                // Remover del DOM
                element.remove();
            }
        });
    }
    
    scrollToIndex(index, alignment = 'auto') {
        if (index < 0 || index >= this.items.length) return;
        
        const scrollTop = index * this.options.itemHeight;
        
        switch (alignment) {
            case 'start':
                this.viewport.scrollTop = scrollTop;
                break;
            case 'center':
                this.viewport.scrollTop = scrollTop - (this.containerHeight / 2) + (this.options.itemHeight / 2);
                break;
            case 'end':
                this.viewport.scrollTop = scrollTop - this.containerHeight + this.options.itemHeight;
                break;
            default:
                this.viewport.scrollTop = scrollTop;
        }
    }
    
    scrollToTop() {
        this.viewport.scrollTop = 0;
    }
    
    scrollToBottom() {
        this.viewport.scrollTop = this.totalHeight;
    }
    
    // API para callbacks de renderizado
    onRender(callback) {
        this.renderCallbacks.push(callback);
    }
    
    // Métodos de utilidad
    getVisibleRange() {
        return { start: this.visibleStart, end: this.visibleEnd };
    }
    
    getScrollPosition() {
        return this.scrollTop;
    }
    
    getTotalHeight() {
        return this.totalHeight;
    }
    
    getItemCount() {
        return this.items.length;
    }
    
    // Destructor
    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        if (this.scrollRAF) {
            cancelAnimationFrame(this.scrollRAF);
        }
        
        if (this.resizeRAF) {
            cancelAnimationFrame(this.resizeRAF);
        }
        
        this.renderCallbacks = [];
        this.items = [];
    }
}

// Virtual Scroll específico para tablas de clientes
class ClienteVirtualScroll extends VirtualScrollManager {
    constructor(container, options = {}) {
        super(container, {
            itemHeight: 35, // Altura de fila de cliente
            bufferSize: 10,
            ...options
        });
    }
    
    renderItemTemplate(item, index) {
        const cliente = item.cliente;
        const saldo = item.saldo;
        const proporcion = item.proporcion;
        
        return `
            <div class="cliente-virtual-row" data-cliente-index="${index}">
                <div class="cliente-virtual-cell cliente-numero">${cliente.numero_cliente || index + 1}</div>
                <div class="cliente-virtual-cell cliente-nombre">${cliente.nombre || 'Sin nombre'}</div>
                <div class="cliente-virtual-cell cliente-saldo ${saldo >= 0 ? 'positive' : 'negative'}">
                    ${this.formatearMoneda(saldo)}
                </div>
                <div class="cliente-virtual-cell cliente-proporcion">${proporcion || '—'}</div>
            </div>
        `;
    }
    
    formatearMoneda(valor) {
        if (typeof valor !== 'number') return '—';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(valor);
    }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VirtualScrollManager, ClienteVirtualScroll };
} else {
    window.VirtualScrollManager = VirtualScrollManager;
    window.ClienteVirtualScroll = ClienteVirtualScroll;
}
