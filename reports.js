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

    // Generar informe PDF (básico pero funcional)
    generateReport() {
        if (!this.currentClient) {
            alert('Selecciona un cliente primero');
            return;
        }

        // Validar que hay datos
        const datos = this.currentClient.datos || {};
        const nombre = this.getClientName(this.currentClient);
        const numero = this.currentClient.numero_cliente || 'SIN_NUM';
        const fecha = new Date();
        const fechaStr = fecha.toISOString().slice(0, 10);

        try {
            // jsPDF se expone como window.jspdf.jsPDF cuando se carga desde CDN
            const jsPDF = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null;
            if (!jsPDF) {
                alert('No se encontró jsPDF. Revisa que la librería esté cargada.');
                this.logDebug('❌ jsPDF no está disponible en window.jspdf.jsPDF');
                return;
            }

            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            const marginX = 50;
            let y = 60;

            const addLine = (text, size = 11, gap = 16) => {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(size);
                const maxWidth = 595 - marginX * 2; // A4 width in pt ~595
                const lines = doc.splitTextToSize(String(text ?? ''), maxWidth);
                doc.text(lines, marginX, y);
                y += gap * lines.length;
                if (y > 780) { // near bottom
                    doc.addPage();
                    y = 60;
                }
            };

            // Cabecera
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('Informe de Cliente', marginX, y);
            y += 26;

            addLine(`Fecha: ${fechaStr}`, 11, 16);
            addLine(`Número de cliente: ${numero}`, 11, 16);
            addLine(`Nombre: ${nombre}`, 11, 16);
            y += 10;

            doc.setDrawColor(180);
            doc.line(marginX, y, 595 - marginX, y);
            y += 20;

            // Datos principales (los más típicos)
            const camposPreferidos = [
                'NOMBRE','APELLIDOS','DNI','NIF','EMAIL','TELEFONO','DIRECCION',
                'POBLACION','PROVINCIA','CP','PAIS'
            ];

            const filas = [];
            camposPreferidos.forEach(k => {
                if (datos[k]?.valor) filas.push([k, datos[k].valor]);
            });

            // Si no hay nada de lo preferido, listar todo lo que haya
            if (filas.length === 0) {
                Object.keys(datos).forEach(k => {
                    const v = datos[k]?.valor;
                    if (v !== undefined && v !== null && String(v).trim() !== '') {
                        filas.push([k, v]);
                    }
                });
            }

            if (filas.length === 0) {
                addLine('⚠️ No se encontraron datos del cliente para incluir en el informe.', 11, 16);
                this.logDebug('⚠️ Cliente sin datos: no hay campos con valor en cliente.datos');
            } else {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.text('Datos del cliente', marginX, y);
                y += 18;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(11);

                filas.forEach(([k, v]) => {
                    addLine(`${k}: ${v}`, 11, 16);
                });
            }

            // Guardar
            const safeName = String(nombre).replace(/[\/:*?"<>|]+/g, '').slice(0, 60).trim() || `Cliente_${numero}`;
            const fileName = `informe_${safeName}_${fechaStr}.pdf`;
            doc.save(fileName);

            this.logDebug(`✅ PDF generado: ${fileName}`);
            console.log('✅ PDF generado:', fileName);

        } catch (error) {
            console.error('❌ Error al generar PDF:', error);
            this.logDebug('❌ Error al generar PDF: ' + error.message);
            alert('Error al generar el PDF. Mira la consola para más detalles.');
        }
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
