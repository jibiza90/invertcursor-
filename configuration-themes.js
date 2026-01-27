/**
 * CONFIGURACIÓN DE TEMAS - MÓDULO COMPLETO
 * Funcionalidades: Temas personalizados, Optimización Responsive
 */

class ConfigurationThemes {
    constructor() {
        this.initialized = false;
        this.currentTheme = 'auto';
        this.themes = {
            light: {
                name: 'Claro',
                primary: '#0066cc',
                secondary: '#004499',
                background: '#ffffff',
                surface: '#f8f9fa',
                text: '#333333',
                textSecondary: '#666666',
                border: '#e0e0e0',
                success: '#28a745',
                warning: '#ffc107',
                error: '#dc3545',
                info: '#17a2b8'
            },
            dark: {
                name: 'Oscuro',
                primary: '#00d4ff',
                secondary: '#00a8cc',
                background: '#1a1a2e',
                surface: '#16213e',
                text: '#ffffff',
                textSecondary: '#b0b0b0',
                border: '#3a3a5a',
                success: '#00ff88',
                warning: '#ffaa00',
                error: '#ff4444',
                info: '#00aaff'
            },
            blue: {
                name: 'Azul Profesional',
                primary: '#0052cc',
                secondary: '#003d99',
                background: '#f0f4f8',
                surface: '#ffffff',
                text: '#2c3e50',
                textSecondary: '#5a6c7d',
                border: '#d1d9e0',
                success: '#27ae60',
                warning: '#f39c12',
                error: '#e74c3c',
                info: '#3498db'
            },
            green: {
                name: 'Verde Natural',
                primary: '#27ae60',
                secondary: '#229954',
                background: '#f0fff4',
                surface: '#ffffff',
                text: '#2d5016',
                textSecondary: '#5a7c3a',
                border: '#a8d5a8',
                success: '#27ae60',
                warning: '#f39c12',
                error: '#e74c3c',
                info: '#3498db'
            },
            purple: {
                name: 'Púrpura Elegante',
                primary: '#8e44ad',
                secondary: '#7d3c98',
                background: '#f8f6fb',
                surface: '#ffffff',
                text: '#4a235a',
                textSecondary: '#7d6c8a',
                border: '#d7bde2',
                success: '#27ae60',
                warning: '#f39c12',
                error: '#e74c3c',
                info: '#3498db'
            }
        };
        this.customTheme = null;
        this.responsiveSettings = {
            mobile: { enabled: true, breakpoints: { max: 768 } },
            tablet: { enabled: true, breakpoints: { min: 769, max: 1024 } },
            desktop: { enabled: true, breakpoints: { min: 1025 } }
        };
    }

    async init() {
        console.log('⚙️ Inicializando Configuración de Temas...');
        
        if (this.initialized) return;
        
        // Cargar configuración guardada
        await this.loadSavedSettings();
        
        // Inicializar sub-pestañas
        this.initSubTabs();
        
        // Cargar contenido inicial
        await this.loadThemeControls();
        
        // Aplicar tema actual
        this.applyTheme(this.currentTheme);
        
        this.initialized = true;
        console.log('✅ Configuración de Temas inicializada');
    }

    async loadSavedSettings() {
        try {
            const saved = localStorage.getItem('portfolioThemes');
            if (saved) {
                const settings = JSON.parse(saved);
                this.currentTheme = settings.theme || 'auto';
                this.customTheme = settings.customTheme || null;
                this.responsiveSettings = settings.responsive || this.responsiveSettings;
            }
        } catch (error) {
            console.warn('⚠️ Error cargando configuración guardada:', error);
        }
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
            case 'themes':
                this.loadThemeControls();
                break;
            case 'responsive':
                this.loadResponsiveControls();
                break;
        }
    }

    async loadThemeControls() {
        const container = document.getElementById('theme-controls');
        if (!container) return;

        container.innerHTML = `
            <div class="theme-overview">
                <div class="current-theme-display">
                    <h3>🎨 Tema Actual</h3>
                    <div class="theme-preview current-theme" id="currentThemePreview">
                        <div class="preview-header">
                            <div class="preview-primary"></div>
                            <div class="preview-secondary"></div>
                        </div>
                        <div class="preview-content">
                            <div class="preview-text"></div>
                            <div class="preview-surface"></div>
                        </div>
                    </div>
                    <p id="currentThemeName">Auto (Sistema)</p>
                </div>
            </div>
            
            <div class="theme-selection">
                <h3>🎨 Temas Predefinidos</h3>
                <div class="themes-grid">
                    ${Object.entries(this.themes).map(([key, theme]) => `
                        <div class="theme-card ${key === this.currentTheme ? 'active' : ''}" 
                             data-theme="${key}" onclick="window.configurationThemes.selectTheme('${key}')">
                            <div class="theme-preview">
                                <div class="preview-header" style="background: ${theme.primary}">
                                    <div class="preview-primary" style="background: ${theme.primary}"></div>
                                    <div class="preview-secondary" style="background: ${theme.secondary}"></div>
                                </div>
                                <div class="preview-content" style="background: ${theme.background}">
                                    <div class="preview-text" style="background: ${theme.text}"></div>
                                    <div class="preview-surface" style="background: ${theme.surface}"></div>
                                </div>
                            </div>
                            <h4>${theme.name}</h4>
                            <div class="theme-colors">
                                <div class="color-dot" style="background: ${theme.primary}" title="Primario"></div>
                                <div class="color-dot" style="background: ${theme.secondary}" title="Secundario"></div>
                                <div class="color-dot" style="background: ${theme.background}" title="Fondo"></div>
                                <div class="color-dot" style="background: ${theme.text}" title="Texto"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="theme-auto-option">
                    <label>
                        <input type="radio" name="theme" value="auto" 
                               ${this.currentTheme === 'auto' ? 'checked' : ''}
                               onchange="window.configurationThemes.selectTheme('auto')">
                        🌓 Automático (seguir sistema)
                    </label>
                </div>
            </div>
            
            <div class="custom-theme-section">
                <h3>🎨 Tema Personalizado</h3>
                <div class="custom-theme-controls">
                    <div class="color-input-group">
                        <label>🎨 Color Primario:</label>
                        <input type="color" id="customPrimary" value="#0066cc">
                        <input type="text" id="customPrimaryHex" value="#0066cc" placeholder="#0066cc">
                    </div>
                    
                    <div class="color-input-group">
                        <label>🎨 Color Secundario:</label>
                        <input type="color" id="customSecondary" value="#004499">
                        <input type="text" id="customSecondaryHex" value="#004499" placeholder="#004499">
                    </div>
                    
                    <div class="color-input-group">
                        <label>🎨 Color de Fondo:</label>
                        <input type="color" id="customBackground" value="#ffffff">
                        <input type="text" id="customBackgroundHex" value="#ffffff" placeholder="#ffffff">
                    </div>
                    
                    <div class="color-input-group">
                        <label>🎨 Color de Texto:</label>
                        <input type="color" id="customText" value="#333333">
                        <input type="text" id="customTextHex" value="#333333" placeholder="#333333">
                    </div>
                    
                    <div class="custom-theme-actions">
                        <button class="btn btn-primary" onclick="window.configurationThemes.applyCustomTheme()">
                            🎨 Aplicar Tema Personalizado
                        </button>
                        
                        <button class="btn btn-secondary" onclick="window.configurationThemes.saveCustomTheme()">
                            💾 Guardar Tema
                        </button>
                        
                        <button class="btn btn-secondary" onclick="window.configurationThemes.resetCustomTheme()">
                            🔄 Restablecer
                        </button>
                    </div>
                </div>
                
                <div class="custom-theme-preview" id="customThemePreview">
                    <h4>👁️ Vista Previa</h4>
                    <div class="theme-preview">
                        <div class="preview-header">
                            <div class="preview-primary"></div>
                            <div class="preview-secondary"></div>
                        </div>
                        <div class="preview-content">
                            <div class="preview-text"></div>
                            <div class="preview-surface"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="theme-effects">
                <h3>✨ Efectos y Animaciones</h3>
                <div class="effects-controls">
                    <div class="effect-item">
                        <label>
                            <input type="checkbox" id="enableAnimations" checked>
                            🎬 Animaciones suaves
                        </label>
                    </div>
                    <div class="effect-item">
                        <label>
                            <input type="checkbox" id="enableTransitions" checked>
                            🔄 Transiciones fluidas
                        </label>
                    </div>
                    <div class="effect-item">
                        <label>
                            <input type="checkbox" id="enableShadows" checked>
                            🌑 Sombras y profundidad
                        </label>
                    </div>
                    <div class="effect-item">
                        <label>
                            <input type="checkbox" id="enableGradients">
                            🌈 Degradados
                        </label>
                    </div>
                    <div class="effect-item">
                        <label>
                            <input type="checkbox" id="enableBlur">
                            💨 Efectos de desenfoque
                        </label>
                    </div>
                </div>
                
                <div class="animation-speed">
                    <label>⚡ Velocidad de Animación:</label>
                    <input type="range" id="animationSpeed" min="1" max="10" value="5">
                    <span id="animationSpeedValue">5</span>
                </div>
            </div>
        `;

        // Configurar eventos
        this.setupThemeEvents();
        
        // Actualizar vista previa actual
        this.updateCurrentThemePreview();
    }

    setupThemeEvents() {
        // Sincronizar inputs de color
        const colorInputs = [
            { color: 'customPrimary', hex: 'customPrimaryHex' },
            { color: 'customSecondary', hex: 'customSecondaryHex' },
            { color: 'customBackground', hex: 'customBackgroundHex' },
            { color: 'customText', hex: 'customTextHex' }
        ];

        colorInputs.forEach(({ color, hex }) => {
            const colorInput = document.getElementById(color);
            const hexInput = document.getElementById(hex);
            
            if (colorInput && hexInput) {
                colorInput.addEventListener('input', (e) => {
                    hexInput.value = e.target.value;
                    this.updateCustomThemePreview();
                });
                
                hexInput.addEventListener('input', (e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        colorInput.value = e.target.value;
                        this.updateCustomThemePreview();
                    }
                });
            }
        });

        // Velocidad de animación
        const speedSlider = document.getElementById('animationSpeed');
        const speedValue = document.getElementById('animationSpeedValue');
        
        if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', (e) => {
                speedValue.textContent = e.target.value;
                this.updateAnimationSpeed(e.target.value);
            });
        }
    }

    updateCurrentThemePreview() {
        const preview = document.getElementById('currentThemePreview');
        const nameElement = document.getElementById('currentThemeName');
        
        if (!preview || !nameElement) return;
        
        let theme;
        if (this.currentTheme === 'auto') {
            // Detectar tema del sistema
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = isDark ? this.themes.dark : this.themes.light;
            nameElement.textContent = 'Auto (Sistema)';
        } else if (this.themes[this.currentTheme]) {
            theme = this.themes[this.currentTheme];
            nameElement.textContent = theme.name;
        } else if (this.customTheme) {
            theme = this.customTheme;
            nameElement.textContent = 'Personalizado';
        }
        
        if (theme) {
            this.applyThemeToPreview(preview, theme);
        }
    }

    applyThemeToPreview(preview, theme) {
        const header = preview.querySelector('.preview-header');
        const content = preview.querySelector('.preview-content');
        const primary = preview.querySelector('.preview-primary');
        const secondary = preview.querySelector('.preview-secondary');
        const text = preview.querySelector('.preview-text');
        const surface = preview.querySelector('.preview-surface');
        
        if (header) header.style.background = theme.primary;
        if (content) content.style.background = theme.background;
        if (primary) primary.style.background = theme.primary;
        if (secondary) secondary.style.background = theme.secondary;
        if (text) text.style.background = theme.text;
        if (surface) surface.style.background = theme.surface;
    }

    updateCustomThemePreview() {
        const preview = document.querySelector('#customThemePreview .theme-preview');
        if (!preview) return;
        
        const theme = {
            primary: document.getElementById('customPrimary')?.value || '#0066cc',
            secondary: document.getElementById('customSecondary')?.value || '#004499',
            background: document.getElementById('customBackground')?.value || '#ffffff',
            text: document.getElementById('customText')?.value || '#333333'
        };
        
        this.applyThemeToPreview(preview, theme);
    }

    selectTheme(themeName) {
        console.log('🎨 Seleccionando tema:', themeName);
        
        // Actualizar UI
        document.querySelectorAll('.theme-card').forEach(card => {
            card.classList.remove('active');
        });
        
        if (themeName !== 'auto') {
            const selectedCard = document.querySelector(`[data-theme="${themeName}"]`);
            if (selectedCard) selectedCard.classList.add('active');
        }
        
        // Aplicar tema
        this.applyTheme(themeName);
        
        // Guardar configuración
        this.saveSettings();
        
        this.showNotification(`🎨 Tema "${this.getThemeDisplayName(themeName)}" aplicado`, 'success');
    }

    getThemeDisplayName(themeName) {
        if (themeName === 'auto') return 'Automático';
        if (this.themes[themeName]) return this.themes[themeName].name;
        return 'Personalizado';
    }

    applyTheme(themeName) {
        this.currentTheme = themeName;
        
        let theme;
        if (themeName === 'auto') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = isDark ? this.themes.dark : this.themes.light;
            
            // Escuchar cambios en el tema del sistema
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (this.currentTheme === 'auto') {
                    theme = e.matches ? this.themes.dark : this.themes.light;
                    this.applyThemeColors(theme);
                }
            });
        } else if (this.themes[themeName]) {
            theme = this.themes[themeName];
        } else if (this.customTheme) {
            theme = this.customTheme;
        }
        
        if (theme) {
            this.applyThemeColors(theme);
        }
        
        this.updateCurrentThemePreview();
    }

    applyThemeColors(theme) {
        const root = document.documentElement;
        
        // Aplicar variables CSS
        root.style.setProperty('--primary-color', theme.primary);
        root.style.setProperty('--secondary-color', theme.secondary);
        root.style.setProperty('--background-color', theme.background);
        root.style.setProperty('--surface-color', theme.surface);
        root.style.setProperty('--text-color', theme.text);
        root.style.setProperty('--text-secondary-color', theme.textSecondary);
        root.style.setProperty('--border-color', theme.border);
        root.style.setProperty('--success-color', theme.success);
        root.style.setProperty('--warning-color', theme.warning);
        root.style.setProperty('--error-color', theme.error);
        root.style.setProperty('--info-color', theme.info);
        
        // Aplicar clase de tema
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-custom');
        if (themeName === 'dark') {
            document.body.classList.add('theme-dark');
        } else if (themeName === 'custom' || this.customTheme) {
            document.body.classList.add('theme-custom');
        } else {
            document.body.classList.add('theme-light');
        }
    }

    applyCustomTheme() {
        const theme = {
            name: 'Personalizado',
            primary: document.getElementById('customPrimary')?.value || '#0066cc',
            secondary: document.getElementById('customSecondary')?.value || '#004499',
            background: document.getElementById('customBackground')?.value || '#ffffff',
            surface: '#f8f9fa',
            text: document.getElementById('customText')?.value || '#333333',
            textSecondary: '#666666',
            border: '#e0e0e0',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
            info: '#17a2b8'
        };
        
        this.customTheme = theme;
        this.currentTheme = 'custom';
        
        this.applyThemeColors(theme);
        this.saveSettings();
        
        this.showNotification('🎨 Tema personalizado aplicado', 'success');
    }

    saveCustomTheme() {
        if (!this.customTheme) {
            this.showNotification('⚠️ Primero aplica un tema personalizado', 'warning');
            return;
        }
        
        const name = prompt('Nombre para tu tema personalizado:', 'Mi Tema');
        if (name) {
            this.customTheme.name = name;
            this.saveSettings();
            this.showNotification(`💾 Tema "${name}" guardado`, 'success');
        }
    }

    resetCustomTheme() {
        // Restablecer valores por defecto
        document.getElementById('customPrimary').value = '#0066cc';
        document.getElementById('customPrimaryHex').value = '#0066cc';
        document.getElementById('customSecondary').value = '#004499';
        document.getElementById('customSecondaryHex').value = '#004499';
        document.getElementById('customBackground').value = '#ffffff';
        document.getElementById('customBackgroundHex').value = '#ffffff';
        document.getElementById('customText').value = '#333333';
        document.getElementById('customTextHex').value = '#333333';
        
        this.updateCustomThemePreview();
        this.showNotification('🔄 Valores restablecidos', 'info');
    }

    updateAnimationSpeed(speed) {
        const duration = (11 - speed) * 0.1; // Invertir: 10 = rápido, 1 = lento
        document.documentElement.style.setProperty('--animation-duration', `${duration}s`);
    }

    async loadResponsiveControls() {
        const container = document.getElementById('responsive-controls');
        if (!container) return;

        container.innerHTML = `
            <div class="responsive-overview">
                <h3>📱 Estado Responsive Actual</h3>
                <div class="device-preview">
                    <div class="device-container">
                        <div class="device-screen" id="devicePreview">
                            <div class="preview-content">
                                <h4>Portfolio Manager</h4>
                                <p>Contenido responsive de ejemplo</p>
                                <div class="preview-buttons">
                                    <button class="btn">Botón 1</button>
                                    <button class="btn">Botón 2</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="device-controls">
                        <button class="device-btn active" data-device="desktop" onclick="window.configurationThemes.setDevice('desktop')">
                            🖥️ Desktop
                        </button>
                        <button class="device-btn" data-device="tablet" onclick="window.configurationThemes.setDevice('tablet')">
                            📱 Tablet
                        </button>
                        <button class="device-btn" data-device="mobile" onclick="window.configurationThemes.setDevice('mobile')">
                            📱 Móvil
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="responsive-settings">
                <h3>⚙️ Configuración Responsive</h3>
                <div class="settings-grid">
                    <div class="setting-group">
                        <h4>🖥️ Desktop</h4>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="desktopEnabled" checked>
                                Habilitar vista desktop
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>Ancho mínimo:</label>
                            <input type="number" id="desktopMin" value="1025" min="0">
                            <span>px</span>
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <h4>📱 Tablet</h4>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="tabletEnabled" checked>
                                Habilitar vista tablet
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>Rango:</label>
                            <input type="number" id="tabletMin" value="769" min="0">
                            <span>-</span>
                            <input type="number" id="tabletMax" value="1024" min="0">
                            <span>px</span>
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <h4>📱 Móvil</h4>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="mobileEnabled" checked>
                                Habilitar vista móvil
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>Ancho máximo:</label>
                            <input type="number" id="mobileMax" value="768" min="0">
                            <span>px</span>
                        </div>
                    </div>
                </div>
                
                <div class="responsive-actions">
                    <button class="btn btn-primary" onclick="window.configurationThemes.applyResponsiveSettings()">
                        📱 Aplicar Configuración
                    </button>
                    
                    <button class="btn btn-secondary" onclick="window.configurationThemes.testResponsive()">
                        🧪 Probar Responsive
                    </button>
                    
                    <button class="btn btn-secondary" onclick="window.configurationThemes.resetResponsive()">
                        🔄 Restablecer
                    </button>
                </div>
            </div>
            
            <div class="responsive-features">
                <h3>🎯 Características Responsive</h3>
                <div class="features-grid">
                    <div class="feature-item">
                        <label>
                            <input type="checkbox" id="adaptiveLayout" checked>
                            📐 Layout adaptativo
                        </label>
                    </div>
                    <div class="feature-item">
                        <label>
                            <input type="checkbox" id="touchOptimized" checked>
                            👆 Optimizado para tacto
                        </label>
                    </div>
                    <div class="feature-item">
                        <label>
                            <input type="checkbox" id="fluidTypography" checked>
                            📝 Tipografía fluida
                        </label>
                    </div>
                    <div class="feature-item">
                        <label>
                            <input type="checkbox" id="flexibleImages" checked>
                            🖼️ Imágenes flexibles
                        </label>
                    </div>
                    <div class="feature-item">
                        <label>
                            <input type="checkbox" id="hamburgerMenu" checked>
                            🍔 Menú hamburguesa
                        </label>
                    </div>
                    <div class="feature-item">
                        <label>
                            <input type="checkbox" id="stickyElements">
                            📌 Elementos fijos
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="responsive-testing">
                <h3>🧪 Pruebas Responsive</h3>
                <div class="testing-tools">
                    <div class="viewport-size">
                        <label>Tamaño de viewport:</label>
                        <input type="number" id="viewportWidth" value="1920" min="320" max="3840">
                        <span>×</span>
                        <input type="number" id="viewportHeight" value="1080" min="480" max="2160">
                        <button class="btn btn-sm" onclick="window.configurationThemes.setViewportSize()">
                            📏 Aplicar
                        </button>
                    </div>
                    
                    <div class="orientation-test">
                        <label>Orientación:</label>
                        <button class="btn btn-sm" onclick="window.configurationThemes.setOrientation('portrait')">
                            📱 Vertical
                        </button>
                        <button class="btn btn-sm" onclick="window.configurationThemes.setOrientation('landscape')">
                            📱 Horizontal
                        </button>
                    </div>
                    
                    <div class="density-test">
                        <label>Densidad:</label>
                        <button class="btn btn-sm" onclick="window.configurationThemes.setDensity('standard')">
                            📱 Estándar
                        </button>
                        <button class="btn btn-sm" onclick="window.configurationThemes.setDensity('high')">
                            📱 Alta
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Configurar eventos
        this.setupResponsiveEvents();
    }

    setupResponsiveEvents() {
        // Configurar inputs de responsive
        const inputs = ['desktopMin', 'tabletMin', 'tabletMax', 'mobileMax'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', () => {
                    this.validateResponsiveInputs();
                });
            }
        });
    }

    validateResponsiveInputs() {
        const desktopMin = parseInt(document.getElementById('desktopMin')?.value || 1025);
        const tabletMin = parseInt(document.getElementById('tabletMin')?.value || 769);
        const tabletMax = parseInt(document.getElementById('tabletMax')?.value || 1024);
        const mobileMax = parseInt(document.getElementById('mobileMax')?.value || 768);
        
        // Validar que los rangos sean consistentes
        if (mobileMax >= tabletMin) {
            document.getElementById('mobileMax').value = tabletMin - 1;
        }
        
        if (tabletMax >= desktopMin) {
            document.getElementById('tabletMax').value = desktopMin - 1;
        }
        
        if (tabletMin >= tabletMax) {
            document.getElementById('tabletMin').value = tabletMax - 1;
        }
    }

    setDevice(device) {
        // Actualizar botones
        document.querySelectorAll('.device-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-device="${device}"]`).classList.add('active');
        
        // Actualizar vista previa
        const preview = document.getElementById('devicePreview');
        if (!preview) return;
        
        const sizes = {
            desktop: { width: '100%', height: '400px' },
            tablet: { width: '768px', height: '400px' },
            mobile: { width: '375px', height: '400px' }
        };
        
        const size = sizes[device];
        preview.style.width = size.width;
        preview.style.height = size.height;
        preview.style.maxWidth = size.width;
        
        // Añadir clase de dispositivo
        preview.classList.remove('device-desktop', 'device-tablet', 'device-mobile');
        preview.classList.add(`device-${device}`);
    }

    applyResponsiveSettings() {
        const settings = {
            desktop: {
                enabled: document.getElementById('desktopEnabled')?.checked || false,
                min: parseInt(document.getElementById('desktopMin')?.value || 1025)
            },
            tablet: {
                enabled: document.getElementById('tabletEnabled')?.checked || false,
                min: parseInt(document.getElementById('tabletMin')?.value || 769),
                max: parseInt(document.getElementById('tabletMax')?.value || 1024)
            },
            mobile: {
                enabled: document.getElementById('mobileEnabled')?.checked || false,
                max: parseInt(document.getElementById('mobileMax')?.value || 768)
            }
        };
        
        this.responsiveSettings = settings;
        this.saveSettings();
        
        // Aplicar media queries
        this.applyResponsiveCSS(settings);
        
        this.showNotification('📱 Configuración responsive aplicada', 'success');
    }

    applyResponsiveCSS(settings) {
        // Eliminar CSS anterior
        const existingCSS = document.getElementById('responsiveCSS');
        if (existingCSS) existingCSS.remove();
        
        // Crear nuevo CSS
        let css = '';
        
        if (settings.mobile.enabled) {
            css += `
                @media (max-width: ${settings.mobile.max}px) {
                    .tabs-navigation { flex-direction: column; }
                    .tab-button { width: 100%; margin: 2px 0; }
                    .container { padding: 10px; }
                }
            `;
        }
        
        if (settings.tablet.enabled) {
            css += `
                @media (min-width: ${settings.tablet.min}px) and (max-width: ${settings.tablet.max}px) {
                    .tabs-navigation { flex-wrap: wrap; }
                    .tab-button { flex: 1 1 calc(50% - 4px); }
                }
            `;
        }
        
        if (settings.desktop.enabled) {
            css += `
                @media (min-width: ${settings.desktop.min}px) {
                    .tabs-navigation { justify-content: center; }
                    .tab-button { flex: 1; max-width: 200px; }
                }
            `;
        }
        
        // Aplicar CSS
        const style = document.createElement('style');
        style.id = 'responsiveCSS';
        style.textContent = css;
        document.head.appendChild(style);
    }

    testResponsive() {
        console.log('🧪 Iniciando pruebas responsive...');
        this.showNotification('🧪 Ejecutando pruebas responsive...', 'info');
        
        // Probar diferentes tamaños
        const sizes = [
            { width: 375, height: 667, name: 'iPhone SE' },
            { width: 768, height: 1024, name: 'iPad' },
            { width: 1920, height: 1080, name: 'Desktop' }
        ];
        
        sizes.forEach((size, index) => {
            setTimeout(() => {
                this.setViewportSize(size.width, size.height);
                this.showNotification(`📱 Probando: ${size.name} (${size.width}×${size.height})`, 'info');
            }, (index + 1) * 2000);
        });
    }

    setViewportSize() {
        const width = document.getElementById('viewportWidth')?.value || 1920;
        const height = document.getElementById('viewportHeight')?.value || 1080;
        
        const preview = document.getElementById('devicePreview');
        if (preview) {
            preview.style.width = `${width}px`;
            preview.style.height = `${height}px`;
            preview.style.maxWidth = `${width}px`;
        }
        
        this.showNotification(`📏 Viewport: ${width}×${height}`, 'info');
    }

    setOrientation(orientation) {
        const preview = document.getElementById('devicePreview');
        if (!preview) return;
        
        if (orientation === 'portrait') {
            preview.style.transform = 'rotate(0deg)';
        } else {
            preview.style.transform = 'rotate(90deg)';
        }
        
        this.showNotification(`📱 Orientación: ${orientation}`, 'info');
    }

    setDensity(density) {
        const root = document.documentElement;
        if (density === 'high') {
            root.style.setProperty('--scale-factor', '0.8');
            root.style.setProperty('--font-scale', '0.9');
        } else {
            root.style.setProperty('--scale-factor', '1');
            root.style.setProperty('--font-scale', '1');
        }
        
        this.showNotification(`📱 Densidad: ${density}`, 'info');
    }

    resetResponsive() {
        // Restablecer valores por defecto
        document.getElementById('desktopMin').value = 1025;
        document.getElementById('tabletMin').value = 769;
        document.getElementById('tabletMax').value = 1024;
        document.getElementById('mobileMax').value = 768;
        
        document.getElementById('desktopEnabled').checked = true;
        document.getElementById('tabletEnabled').checked = true;
        document.getElementById('mobileEnabled').checked = true;
        
        this.applyResponsiveSettings();
        this.showNotification('🔄 Configuración responsive restablecida', 'info');
    }

    saveSettings() {
        const settings = {
            theme: this.currentTheme,
            customTheme: this.customTheme,
            responsive: this.responsiveSettings
        };
        
        localStorage.setItem('portfolioThemes', JSON.stringify(settings));
        console.log('💾 Configuración guardada:', settings);
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
window.configurationThemes = new ConfigurationThemes();

// Auto-inicialización cuando la pestaña de configuración se active
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'tab-settings' && 
                mutation.target.classList.contains('active')) {
                window.configurationThemes.init();
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
