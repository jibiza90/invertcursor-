// ========================================
// SISTEMA DE INFORMES - CREADO DESDE CERO
// ========================================

class ReportsSystem {
    constructor() {
        console.log('📄 Inicializando sistema de informes básico');
        this.currentClient = null;
        this.init();
    }

    init() {
        console.log('🔧 Configurando eventos del sistema de informes');

        // Esperar a que el sistema principal esté listo
        this.waitForSystemReady().then(() => {
            console.log('✅ Sistema principal listo, inicializando informes');
            this.setupEventListeners();
            this.populateClientSelector();
        });
    }

    // Esperar a que el sistema principal esté listo
    waitForSystemReady() {
        return new Promise((resolve) => {
            const checkReady = () => {
                if (window.datosEditados && window.hojaActual) {
                    resolve();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }

    // Configurar event listeners
    setupEventListeners() {
        const clientSelect = document.getElementById('reportsClientSelect');
        const generateBtn = document.getElementById('generateReportBtn');
        const testBtn = document.getElementById('testDataBtn');

        if (clientSelect) {
            clientSelect.addEventListener('change', (e) => this.onClientChange(e.target.value));
        }

        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateReport());
        }

        if (testBtn) {
            testBtn.addEventListener('click', () => this.testDataReading());
        }
    }

    // Llenar el selector de clientes
    populateClientSelector() {
        const select = document.getElementById('reportsClientSelect');
        if (!select) return;

        // Limpiar opciones existentes
        select.innerHTML = '<option value="">-- Selecciona un cliente --</option>';

        try {
            const hoja = window.datosEditados.hojas[window.hojaActual];
            if (!hoja || !hoja.clientes) {
                console.warn('No hay datos de clientes disponibles');
                return;
            }

            // Agregar cada cliente como opción
            Object.keys(hoja.clientes).forEach(clientKey => {
                const cliente = hoja.clientes[clientKey];
                const nombreCliente = this.getClientName(cliente);
                const option = document.createElement('option');
                option.value = clientKey;
                option.textContent = `${cliente.numero_cliente} - ${nombreCliente}`;
                select.appendChild(option);
            });

            console.log(`✅ Cargados ${Object.keys(hoja.clientes).length} clientes en el selector`);

        } catch (error) {
            console.error('❌ Error al cargar clientes:', error);
            this.logDebug('Error al cargar clientes: ' + error.message);
        }
    }

    // Obtener nombre del cliente
    getClientName(cliente) {
        if (!cliente || !cliente.datos) return 'Cliente sin datos';

        const nombre = cliente.datos['NOMBRE']?.valor || '';
        const apellidos = cliente.datos['APELLIDOS']?.valor || '';

        if (nombre || apellidos) {
            return `${nombre} ${apellidos}`.trim();
        }

        return `Cliente ${cliente.numero_cliente || 'sin número'}`;
    }

    // Manejar cambio de cliente seleccionado
    onClientChange(clientKey) {
        console.log('👤 Cliente seleccionado:', clientKey);

        if (!clientKey) {
            this.currentClient = null;
            this.hideClientInfo();
            this.disableGenerateButton();
            return;
        }

        try {
            const hoja = window.datosEditados.hojas[window.hojaActual];
            const cliente = hoja.clientes[clientKey];

            if (!cliente) {
                console.error('Cliente no encontrado:', clientKey);
                this.logDebug('Cliente no encontrado en los datos');
                return;
            }

            this.currentClient = cliente;
            this.showClientInfo(cliente);
            this.enableGenerateButton();

            console.log('✅ Cliente cargado correctamente:', this.getClientName(cliente));

        } catch (error) {
            console.error('❌ Error al seleccionar cliente:', error);
            this.logDebug('Error al seleccionar cliente: ' + error.message);
        }
    }

    // Mostrar información del cliente
    showClientInfo(cliente) {
        const container = document.getElementById('clientInfo');
        const details = document.getElementById('clientDetails');

        if (!container || !details) return;

        const info = `
            <p><strong>Número:</strong> ${cliente.numero_cliente || 'N/A'}</p>
            <p><strong>Nombre:</strong> ${this.getClientName(cliente)}</p>
            <p><strong>Email:</strong> ${cliente.datos?.['EMAIL']?.valor || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${cliente.datos?.['TELEFONO']?.valor || 'N/A'}</p>
            <p><strong>Campos de datos:</strong> ${cliente.datos ? Object.keys(cliente.datos).length : 0}</p>
        `;

        details.innerHTML = info;
        container.style.display = 'block';
    }

    // Ocultar información del cliente
    hideClientInfo() {
        const container = document.getElementById('clientInfo');
        if (container) {
            container.style.display = 'none';
        }
    }

    // Habilitar botón de generar
    enableGenerateButton() {
        const btn = document.getElementById('generateReportBtn');
        if (btn) {
            btn.disabled = false;
        }
    }

    // Deshabilitar botón de generar
    disableGenerateButton() {
        const btn = document.getElementById('generateReportBtn');
        if (btn) {
            btn.disabled = true;
        }
    }

    // Probar lectura de datos
    testDataReading() {
        console.log('🧪 Probando lectura de datos...');

        this.logDebug('=== PRUEBA DE LECTURA DE DATOS ===');

        try {
            // Verificar sistema principal
            this.logDebug('Sistema principal:');
            this.logDebug('- window.datosEditados:', !!window.datosEditados);
            this.logDebug('- window.hojaActual:', window.hojaActual);

            if (!window.datosEditados || !window.hojaActual) {
                this.logDebug('❌ Sistema principal no está listo');
                return;
            }

            // Verificar hoja actual
            const hoja = window.datosEditados.hojas[window.hojaActual];
            this.logDebug('Hoja actual:', window.hojaActual);
            this.logDebug('- Hoja existe:', !!hoja);
            this.logDebug('- Tiene clientes:', !!(hoja?.clientes));

            if (!hoja?.clientes) {
                this.logDebug('❌ No hay clientes en la hoja');
                return;
            }

            // Listar clientes disponibles
            const clientKeys = Object.keys(hoja.clientes);
            this.logDebug('Clientes disponibles:', clientKeys.length);
            clientKeys.forEach(key => {
                const cliente = hoja.clientes[key];
                this.logDebug(`- ${key}: ${cliente.numero_cliente} - ${this.getClientName(cliente)}`);
            });

            // Probar cliente actual si está seleccionado
            if (this.currentClient) {
                this.logDebug('Cliente actualmente seleccionado:');
                this.logDebug('- Número:', this.currentClient.numero_cliente);
                this.logDebug('- Nombre:', this.getClientName(this.currentClient));
                this.logDebug('- Tiene datos:', !!this.currentClient.datos);

                if (this.currentClient.datos) {
                    this.logDebug('- Campos de datos:', Object.keys(this.currentClient.datos));
                }
            } else {
                this.logDebug('No hay cliente seleccionado actualmente');
            }

            this.logDebug('✅ Prueba de lectura completada');

        } catch (error) {
            console.error('❌ Error en prueba de datos:', error);
            this.logDebug('❌ Error: ' + error.message);
        }
    }

    // Generar informe básico
    generateReport() {
        if (!this.currentClient) {
            alert('Selecciona un cliente primero');
            return;
        }

        console.log('📄 Generando informe para:', this.getClientName(this.currentClient));

        // Por ahora solo mostrar un mensaje básico
        alert(`Informe generado para: ${this.getClientName(this.currentClient)}\n\nFuncionalidad completa próximamente.`);

        this.logDebug('Informe generado (básico) para cliente: ' + this.getClientName(this.currentClient));
    }

    // Registrar mensaje en el área de debug
    logDebug(message) {
        const debugArea = document.getElementById('debugOutput');
        if (debugArea) {
            const timestamp = new Date().toLocaleTimeString();
            debugArea.innerHTML += `[${timestamp}] ${message}<br>`;
            debugArea.scrollTop = debugArea.scrollHeight;
        }

        console.log('🔍 DEBUG:', message);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM listo, inicializando ReportsSystem');
    window.reportsSystem = new ReportsSystem();
});

// También inicializar cuando se active la pestaña de informes
document.addEventListener('click', (e) => {
    if (e.target.id === 'btnVistaReports' || e.target.closest('#btnVistaReports')) {
        console.log('📄 Pestaña de informes activada');
        if (window.reportsSystem) {
            window.reportsSystem.populateClientSelector();
        }
    }
});
