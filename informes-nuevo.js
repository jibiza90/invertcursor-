// =============================================================================
// SISTEMA DE INFORMES 2.0 - ESCRITO DESDE CERO
// =============================================================================
class SistemaInformes {
    constructor() {
        this.clientes = [];
        this.datosEditados = null;
        this.hojaActual = 'Diario STD';
        this.informesHistory = [];
        this.init();
    }

    // Inicialización del sistema
    async init() {
        console.log('🚀 Iniciando Sistema de Informes 2.0...');
        await this.cargarDatos();
        this.setupEventListeners();
        this.llenarSelectorClientes();
        console.log('✅ Sistema de Informes 2.0 listo');
    }

    // Cargar datos desde las variables globales del sistema
    async cargarDatos() {
        try {
            // Verificar que las variables globales del sistema existan
            if (!window.datosEditados) {
                throw new Error('No se encontraron datosEditados del sistema');
            }
            
            if (!window.hojaActual) {
                throw new Error('No se encontró hojaActual del sistema');
            }
            
            // Usar las mismas variables que mostrarEstadisticasCliente()
            this.datosEditados = window.datosEditados;
            this.hojaActual = window.hojaActual;
            
            const hoja = this.datosEditados.hojas[this.hojaActual];
            if (!hoja) {
                throw new Error(`No se encontró la hoja ${this.hojaActual}`);
            }
            
            // No necesitamos cargar clientes, usaremos los del sistema directamente
            console.log(`📊 Conectado al sistema: hoja=${this.hojaActual}, clientes=${Object.keys(hoja.clientes || {}).length}`);
            
        } catch (error) {
            console.error('❌ Error al conectar con el sistema:', error);
            this.mostrarError('No se pudo conectar con el sistema de datos: ' + error.message);
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Botón generar informe
        const btnGenerar = document.getElementById('generateReportBtn');
        if (btnGenerar) {
            btnGenerar.onclick = () => this.generarInforme();
        }
        
        // Botón recargar clientes
        const btnRecargar = document.getElementById('reloadClientsBtn');
        if (btnRecargar) {
            btnRecargar.onclick = () => this.recargarClientes();
        }

        // Selector de cliente (ahora es solo informativo)
        const selectorCliente = document.getElementById('reportClientSelect');
        if (selectorCliente) {
            selectorCliente.onchange = () => this.validarSeleccionCliente();
        }
        
        // ESCUCHAR CAMBIOS EN EL SELECTOR PRINCIPAL DEL SISTEMA
        const selectorPrincipal = document.getElementById('selectorCliente');
        if (selectorPrincipal) {
            selectorPrincipal.addEventListener('change', () => {
                console.log('🔄 Cambio detectado en selector principal, actualizando informes...');
                setTimeout(() => {
                    this.llenarSelectorClientes(); // Actualizar selector de informes
                }, 100);
            });
        }
        
        // ESCUCHAR CAMBIOS EN clienteActual (cuando se navega entre clientes)
        let lastClienteActual = window.clienteActual;
        setInterval(() => {
            if (window.clienteActual !== lastClienteActual) {
                console.log('🔄 Cambio en clienteActual detectado, actualizando informes...');
                lastClienteActual = window.clienteActual;
                this.llenarSelectorClientes();
            }
        }, 1000);
    }

    // Llenar selector de clientes - MOSTRAR CLIENTE ACTUAL DEL SISTEMA
    llenarSelectorClientes() {
        const selector = document.getElementById('reportClientSelect');
        if (!selector) return;

        // Si hay un cliente seleccionado en el sistema, mostrarlo
        if (typeof window.clienteActual !== 'undefined' && window.clienteActual !== null) {
            const hoja = window.datosEditados?.hojas?.[window.hojaActual];
            if (hoja && hoja.clientes && hoja.clientes[window.clienteActual]) {
                const cliente = hoja.clientes[window.clienteActual];
                const nombre = this.obtenerNombreCliente(cliente);
                
                selector.innerHTML = `
                    <option value="${window.clienteActual}" selected>
                        ${cliente.numero_cliente} - ${nombre} (Seleccionado)
                    </option>
                `;
                
                // Actualizar contador
                const clientesCount = document.getElementById('clientesCount');
                if (clientesCount) {
                    clientesCount.textContent = '1 cliente seleccionado';
                }
                
                console.log(`📝 Selector mostrando cliente actual: ${nombre}`);
                return;
            }
        }

        // Si no hay cliente seleccionado, mostrar mensaje
        selector.innerHTML = `
            <option value="" disabled selected>
                -- Selecciona un cliente en la vista principal --
            </option>
        `;
        
        // Actualizar contador
        const clientesCount = document.getElementById('clientesCount');
        if (clientesCount) {
            clientesCount.textContent = '0 clientes seleccionados';
        }
        
        console.log('⚠️ No hay cliente seleccionado en el sistema principal');
    }

    // Obtener nombre formateado del cliente
    obtenerNombreCliente(cliente) {
        const datos = cliente.datos || {};
        const nombre = datos['NOMBRE']?.valor || '';
        const apellidos = datos['APELLIDOS']?.valor || '';
        return nombre || apellidos ? `${nombre} ${apellidos}`.trim() : `Cliente ${cliente.numero_cliente}`;
    }

    // Validar selección de cliente
    validarSeleccionCliente() {
        const selector = document.getElementById('reportClientSelect');
        const btnGenerar = document.getElementById('generateReportBtn');
        
        if (selector && btnGenerar) {
            btnGenerar.disabled = !selector.value;
        }
    }

    // Recargar clientes
    async recargarClientes() {
        await this.cargarDatos();
        this.llenarSelectorClientes();
        this.mostrarExito('Clientes recargados correctamente');
    }

    // Generar informe principal
    async generarInforme() {
        // USAR EL CLIENTE SELECCIONADO EN EL SISTEMA PRINCIPAL
        if (typeof window.clienteActual === 'undefined' || window.clienteActual === null) {
            this.mostrarError('Por favor selecciona un cliente en la vista principal primero');
            return;
        }

        // Obtener el cliente actual del sistema
        const hoja = window.datosEditados?.hojas?.[window.hojaActual];
        if (!hoja || !hoja.clientes || !hoja.clientes[window.clienteActual]) {
            this.mostrarError('No hay datos del cliente seleccionado');
            return;
        }
        
        const cliente = hoja.clientes[window.clienteActual];
        
        console.log(`🎯 Generando informe usando cliente seleccionado en vista principal:`, {
            clienteActual: window.clienteActual,
            clienteNumero: cliente.numero_cliente,
            hojaActual: window.hojaActual,
            datosDiarios: cliente.datos_diarios?.length || 0,
            nombre: this.obtenerNombreCliente(cliente)
        });
        
        try {
            // Mostrar loading
            this.mostrarLoading(true);
            
            // Generar HTML del informe
            const htmlInforme = await this.generarHTMLInforme(cliente);
            
            // Convertir a PDF
            const pdf = await this.convertirHTMLaPDF(htmlInforme, cliente);
            
            // Descargar PDF
            this.descargarPDF(pdf, cliente);
            
            // Agregar al historial
            this.agregarAlHistorial(cliente);
            
            this.mostrarExito('Informe generado correctamente');
            
        } catch (error) {
            console.error('❌ Error al generar informe:', error);
            this.mostrarError('Error al generar el informe: ' + error.message);
        } finally {
            this.mostrarLoading(false);
        }
    }

    // Generar HTML del informe desde cero
    async generarHTMLInforme(cliente) {
        const nombreCliente = this.obtenerNombreCliente(cliente);
        const fecha = new Date().toLocaleDateString('es-ES');
        
        // Calcular estadísticas reales
        const estadisticas = await this.calcularEstadisticasCliente(cliente);
        
        // Extraer movimientos
        const movimientos = this.extraerMovimientos(cliente);
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Informe de ${nombreCliente}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        font-size: 12px;
                        color: #000000 !important;
                        background: #FFFFFF !important;
                        line-height: 1.4;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        margin: 0;
                        padding: 0;
                    }
                    
                    .header {
                        text-align: center;
                        padding: 30px 0;
                        border-bottom: 3px solid #1F3A5F;
                        margin-bottom: 30px;
                        background: #F8F9FA !important;
                    }
                    
                    .header h1 {
                        color: #1F3A5F !important;
                        font-size: 28px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    
                    .header p {
                        color: #333333 !important;
                        font-size: 14px;
                        margin: 5px 0;
                    }
                    
                    .section {
                        margin-bottom: 30px;
                        padding: 25px;
                        border: 2px solid #000000 !important;
                        background: #FFFFFF !important;
                        page-break-inside: avoid;
                        border-radius: 0;
                    }
                    
                    .section-title {
                        background: #1F3A5F !important;
                        color: #FFFFFF !important;
                        padding: 15px 25px;
                        font-size: 16px;
                        font-weight: bold;
                        margin: -25px -25px 20px -25px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                        font-size: 11px;
                        border-spacing: 0;
                    }
                    
                    th, td {
                        border: 1px solid #000000 !important;
                        padding: 10px 12px;
                        text-align: left;
                        vertical-align: top;
                        font-weight: normal;
                    }
                    
                    th {
                        background: #E8EAED !important;
                        font-weight: bold;
                        color: #000000 !important;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    tr:nth-child(even) {
                        background: #F8F9FA !important;
                    }
                    
                    tr:nth-child(odd) {
                        background: #FFFFFF !important;
                    }
                    
                    .positive {
                        color: #2E7D32 !important;
                        font-weight: bold;
                    }
                    
                    .negative {
                        color: #D32F2F !important;
                        font-weight: bold;
                    }
                    
                    .chart-container {
                        margin: 25px 0;
                        padding: 20px;
                        border: 2px solid #000000 !important;
                        background: #FFFFFF !important;
                        text-align: center;
                        page-break-inside: avoid;
                    }
                    
                    .chart-title {
                        font-size: 14px;
                        font-weight: bold;
                        color: #1F3A5F !important;
                        margin-bottom: 15px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    canvas {
                        border: 1px solid #CCCCCC !important;
                        max-width: 100%;
                        height: 250px !important;
                    }
                    
                    .footer {
                        text-align: center;
                        padding: 25px 0;
                        border-top: 2px solid #000000 !important;
                        font-size: 10px;
                        color: #666666 !important;
                        margin-top: 30px;
                        background: #F8F9FA !important;
                    }
                    
                    /* Para impresión */
                    @media print {
                        body {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .section {
                            page-break-inside: avoid;
                        }
                        
                        .chart-container {
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>INFORME DE CLIENTE</h1>
                    <p>${nombreCliente}</p>
                    <p>Fecha: ${fecha}</p>
                </div>

                <div class="section">
                    <div class="section-title">Resumen General</div>
                    <table>
                        <tr>
                            <th>Métrica</th>
                            <th>Valor</th>
                        </tr>
                        <tr>
                            <td>Inversión Inicial</td>
                            <td>€${estadisticas.inversionInicial.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Saldo Actual</td>
                            <td>€${estadisticas.saldoActual.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Beneficio Total</td>
                            <td class="${estadisticas.beneficioTotal >= 0 ? 'positive' : 'negative'}">
                                €${estadisticas.beneficioTotal.toLocaleString()}
                            </td>
                        </tr>
                        <tr>
                            <td>Rentabilidad Total</td>
                            <td class="${estadisticas.rentabilidadTotal >= 0 ? 'positive' : 'negative'}">
                                ${estadisticas.rentabilidadTotal.toFixed(2)}%
                            </td>
                        </tr>
                        <tr>
                            <td>Meses con Datos</td>
                            <td>${estadisticas.datosClienteMeses.length}</td>
                        </tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Detalle Mensual</div>
                    <table>
                        <tr>
                            <th>Mes</th>
                            <th>Incrementos</th>
                            <th>Decrementos</th>
                            <th>Beneficio</th>
                            <th>Saldo Final</th>
                            <th>Rentabilidad</th>
                        </tr>
                        ${estadisticas.datosClienteMeses.map(mes => `
                            <tr>
                                <td>${mes.nombreMes || mes.mes || 'Sin mes'}</td>
                                <td class="positive">€${(mes.incrementos || 0).toLocaleString()}</td>
                                <td class="negative">€${(mes.decrementos || 0).toLocaleString()}</td>
                                <td class="${(mes.beneficio || 0) >= 0 ? 'positive' : 'negative'}">
                                    €${(mes.beneficio || 0).toLocaleString()}
                                </td>
                                <td>€${(mes.saldoFinal || 0).toLocaleString()}</td>
                                <td class="${(mes.rentabilidad || 0) >= 0 ? 'positive' : 'negative'}">
                                    ${(mes.rentabilidad || 0).toFixed(2)}%
                                </td>
                            </tr>
                        `).join('')}
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Movimientos Detallados</div>
                    <table>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Importe</th>
                            <th>Mes</th>
                        </tr>
                        ${movimientos.map(mov => `
                            <tr>
                                <td>${mov.fecha}</td>
                                <td class="${mov.tipo === 'Ingreso' ? 'positive' : 'negative'}">${mov.tipo}</td>
                                <td class="${mov.tipo === 'Ingreso' ? 'positive' : 'negative'}">
                                    €${mov.importe.toLocaleString()}
                                </td>
                                <td>${mov.mes}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Gráficos</div>
                    <div class="chart-container">
                        <div class="chart-title">Rentabilidad Mensual</div>
                        <canvas id="chartRentabilidad" width="800" height="300"></canvas>
                    </div>
                    <div class="chart-container">
                        <div class="chart-title">Evolución del Patrimonio</div>
                        <canvas id="chartEvolucion" width="800" height="300"></canvas>
                    </div>
                </div>

                <div class="footer">
                    <p>Informe generado automáticamente por Sistema de Informes 2.0</p>
                </div>
            </body>
            </html>
        `;
    }

    // Calcular estadísticas reales del cliente - USAR CLIENTE ACTUAL DEL SISTEMA
    async calcularEstadisticasCliente(cliente) {
        console.log('🔥 USANDO CLIENTE ACTUAL DEL SISTEMA PRINCIPAL');
        
        // Verificar que clienteActual exista
        if (typeof window.clienteActual === 'undefined' || window.clienteActual === null) {
            throw new Error('clienteActual no está definido - selecciona un cliente en la vista principal');
        }
        
        if (!window.hojaActual) {
            throw new Error('hojaActual no está definida');
        }
        
        if (!window.datosEditados) {
            throw new Error('datosEditados no está definido');
        }
        
        // Usar la hoja actual y el cliente actual
        const hoja = window.datosEditados.hojas[window.hojaActual];
        if (!hoja) {
            throw new Error(`No se encontró la hoja ${window.hojaActual}`);
        }
        
        // Usar exactamente la misma función que mostrarEstadisticasCliente()
        const datosClienteMeses = await window.calcularEstadisticasClienteTiempoReal(cliente, hoja);
        const kpisTotales = window.calcularKPIsTiempoReal(datosClienteMeses);
        
        // Guardar en las mismas variables globales que mostrarEstadisticasCliente()
        const datosCompletosCliente = { kpisTotales, datosClienteMeses };
        window._datosCliente = datosCompletosCliente;
        window._datosEstadisticasCliente = datosCompletosCliente;
        
        console.log('📊 Datos obtenidos del cliente actual del sistema:', {
            clienteActual: window.clienteActual,
            clienteNumero: cliente.numero_cliente,
            hojaActual: window.hojaActual,
            meses: datosClienteMeses.length,
            kpis: Object.keys(kpisTotales),
            muestraDatos: datosClienteMeses.slice(0, 2)
        });
        
        return {
            datosClienteMeses,
            kpisTotales,
            inversionInicial: kpisTotales.inversionInicial || 0,
            saldoActual: kpisTotales.saldoActual || 0,
            beneficioTotal: kpisTotales.beneficioTotal || 0,
            rentabilidadTotal: kpisTotales.rentabilidadTotal || 0
        };
    }

    // Extraer movimientos del cliente
    extraerMovimientos(cliente) {
        const datosDiarios = cliente.datos_diarios || [];
        const movimientos = [];
        
        datosDiarios.forEach(fila => {
            const inc = typeof fila.incremento === 'number' ? fila.incremento : 0;
            const dec = typeof fila.decremento === 'number' ? fila.decremento : 0;
            
            // Extraer mes de la fecha
            let nombreMes = 'Sin mes';
            if (fila.fecha && fila.fecha !== 'FECHA') {
                const fecha = new Date(fila.fecha);
                if (!isNaN(fecha.getTime())) {
                    nombreMes = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                }
            }
            
            // Si hay incremento, añadir movimiento
            if (inc > 0) {
                movimientos.push({
                    fecha: fila.fecha || '',
                    importe: inc,
                    tipo: 'Ingreso',
                    mes: nombreMes
                });
            }
            
            // Si hay decremento, añadir movimiento
            if (dec > 0) {
                movimientos.push({
                    fecha: fila.fecha || '',
                    importe: dec,
                    tipo: 'Retirada',
                    mes: nombreMes
                });
            }
        });
        
        console.log(`💰 Extraídos ${movimientos.length} movimientos`);
        return movimientos;
    }

    // Convertir HTML a PDF - VERSIÓN PROFESIONAL
    async convertirHTMLaPDF(html, cliente) {
        console.log('🔄 Convirtiendo HTML a PDF con alta calidad...');
        
        return new Promise((resolve, reject) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.width = '210mm';
            tempDiv.style.background = '#FFFFFF';
            tempDiv.style.fontFamily = "'Segoe UI', Arial, sans-serif";
            document.body.appendChild(tempDiv);
            
            setTimeout(async () => {
                try {
                    // Renderizar gráficos primero
                    await this.renderizarGraficos(tempDiv, cliente);
                    
                    // Configuración profesional para html2canvas
                    const canvas = await html2canvas(tempDiv, {
                        scale: 3, // Mayor escala para mejor calidad
                        backgroundColor: '#FFFFFF',
                        useCORS: true,
                        allowTaint: true,
                        logging: false,
                        width: 794, // A4 width in pixels at 96dpi
                        height: 1123, // A4 height in pixels at 96dpi
                        windowWidth: 794,
                        windowHeight: 1123,
                        x: 0,
                        y: 0,
                        scrollX: 0,
                        scrollY: 0,
                        foreignObjectRendering: true, // Mejor renderizado de texto
                        imageTimeout: 0, // Sin timeout para imágenes
                        removeContainer: false, // No eliminar el contenedor
                        onclone: (clonedDoc) => {
                            // Asegurar estilos en el clon
                            const clonedElement = clonedDoc.querySelector('body > div');
                            if (clonedElement) {
                                clonedElement.style.visibility = 'visible';
                                clonedElement.style.display = 'block';
                            }
                        }
                    });
                    
                    // Generar PDF con configuración profesional
                    const pdf = new jspdf.jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4',
                        compress: true
                    });
                    
                    const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEG para mejor calidad/size
                    
                    // Calcular dimensiones correctas para A4
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const imgWidth = canvas.width;
                    const imgHeight = canvas.height;
                    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                    const imgX = (pdfWidth - imgWidth * ratio) / 2;
                    const imgY = 0;
                    
                    pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
                    
                    document.body.removeChild(tempDiv);
                    
                    console.log('✅ PDF profesional generado correctamente');
                    resolve(pdf);
                    
                } catch (error) {
                    console.error('❌ Error en conversión PDF:', error);
                    if (document.body.contains(tempDiv)) {
                        document.body.removeChild(tempDiv);
                    }
                    reject(error);
                }
            }, 2000); // Más tiempo para que se rendericen los gráficos
        });
    }

    // Renderizar gráficos
    async renderizarGraficos(container, cliente) {
        console.log('📊 Renderizando gráficos con datos reales...');
        
        // Preparar datos usando las mismas funciones que estadísticas
        const datosGraficos = await this.prepararDatosGraficos(cliente);
        
        // Gráfico de rentabilidad
        const canvasRentabilidad = container.querySelector('#chartRentabilidad');
        if (canvasRentabilidad && window.Chart) {
            console.log('📊 Creando gráfico de rentabilidad con datos reales...');
            new Chart(canvasRentabilidad, {
                type: 'bar',
                data: {
                    labels: datosGraficos.labels,
                    datasets: [{
                        label: 'Rentabilidad (%)',
                        data: datosGraficos.rentabilidad,
                        backgroundColor: datosGraficos.rentabilidad.map(r => r >= 0 ? '#2E7D32' : '#D32F2F'),
                        borderColor: '#000000',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: false,
                    animation: false,
                    plugins: {
                        legend: {
                            labels: { color: '#000000', font: { size: 12, weight: 'bold' } }
                        }
                    },
                    scales: {
                        y: {
                            ticks: { color: '#000000', font: { size: 11, weight: 'bold' } },
                            grid: { color: '#CCCCCC', borderColor: '#000000' }
                        },
                        x: {
                            ticks: { color: '#000000', font: { size: 10, weight: 'bold' } },
                            grid: { display: false }
                        }
                    }
                }
            });
        } else {
            console.warn('⚠️ No se encontró canvasRentabilidad o Chart.js no está disponible');
        }
        
        // Gráfico de evolución
        const canvasEvolucion = container.querySelector('#chartEvolucion');
        if (canvasEvolucion && window.Chart) {
            console.log('📈 Creando gráfico de evolución con datos reales...');
            new Chart(canvasEvolucion, {
                type: 'line',
                data: {
                    labels: datosGraficos.labels,
                    datasets: [{
                        label: 'Saldo',
                        data: datosGraficos.saldos,
                        borderColor: '#1F3A5F',
                        backgroundColor: '#E3F2FD',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: false,
                    animation: false,
                    plugins: {
                        legend: {
                            labels: { color: '#000000', font: { size: 12, weight: 'bold' } }
                        }
                    },
                    scales: {
                        y: {
                            ticks: { color: '#000000', font: { size: 11, weight: 'bold' } },
                            grid: { color: '#CCCCCC', borderColor: '#000000' }
                        },
                        x: {
                            ticks: { color: '#000000', font: { size: 10, weight: 'bold' } },
                            grid: { display: false }
                        }
                    }
                }
            });
        } else {
            console.warn('⚠️ No se encontró canvasEvolucion o Chart.js no está disponible');
        }
        
        console.log('✅ Gráficos renderizados con datos reales');
    }

    // Preparar datos para gráficos - USAR CLIENTE DIRECTO
    async prepararDatosGraficos(cliente) {
        console.log('📈 PREPARANDO GRÁFICOS CON CLIENTE DIRECTO');
        
        // Verificar variables globales necesarias
        if (!window.hojaActual) {
            throw new Error('hojaActual no está definida');
        }
        
        if (!window.datosEditados) {
            throw new Error('datosEditados no está definido');
        }
        
        // Usar la hoja actual
        const hoja = window.datosEditados.hojas[window.hojaActual];
        if (!hoja) {
            throw new Error(`No se encontró la hoja ${window.hojaActual}`);
        }
        
        // Usar exactamente la misma función que mostrarEstadisticasCliente()
        const datosClienteMeses = await window.calcularEstadisticasClienteTiempoReal(cliente, hoja);
        
        console.log('📊 Datos para gráficos con cliente directo:', {
            clienteNumero: cliente.numero_cliente,
            hojaActual: window.hojaActual,
            mesesRecibidos: datosClienteMeses.length,
            muestra: datosClienteMeses.slice(0, 2)
        });
        
        // Preparar datos para gráficos usando la misma estructura que estadísticas
        const labels = datosClienteMeses.map(m => m.nombreMes || m.mes || 'Sin mes');
        const rentabilidad = datosClienteMeses.map(m => m.rentabilidad || 0);
        const saldos = datosClienteMeses.map(m => m.saldoFinal || 0);
        
        console.log('📈 Datos de gráficos preparados:', {
            labels: labels.length,
            rentabilidad: rentabilidad.length,
            saldos: saldos.length,
            muestraRentabilidad: rentabilidad.slice(0, 3),
            muestraSaldos: saldos.slice(0, 3)
        });
        
        return { labels, rentabilidad, saldos };
    }

    // Descargar PDF
    descargarPDF(pdf, cliente) {
        const nombreCliente = this.obtenerNombreCliente(cliente);
        const filename = `informe_${nombreCliente.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        
        pdf.save(filename);
        console.log(`💾 PDF descargado: ${filename}`);
    }

    // Agregar al historial
    agregarAlHistorial(cliente) {
        const nombreCliente = this.obtenerNombreCliente(cliente);
        const informe = {
            cliente: nombreCliente,
            numero: cliente.numero_cliente,
            fecha: new Date().toLocaleString('es-ES'),
            timestamp: Date.now()
        };
        
        this.informesHistory.unshift(informe);
        if (this.informesHistory.length > 10) {
            this.informesHistory.pop();
        }
        
        this.actualizarHistorialUI();
    }

    // Actualizar UI del historial
    actualizarHistorialUI() {
        const listaHistorial = document.getElementById('reportsHistoryList');
        if (!listaHistorial) return;
        
        if (this.informesHistory.length === 0) {
            listaHistorial.innerHTML = `
                <li class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <div class="empty-state-text">No hay informes generados</div>
                    <div class="empty-state-subtext">Selecciona un cliente y genera tu primer informe</div>
                </li>
            `;
            return;
        }
        
        listaHistorial.innerHTML = this.informesHistory.map(informe => `
            <li class="report-item">
                <div class="report-info">
                    <div class="report-client">${informe.cliente}</div>
                    <div class="report-date">${informe.fecha}</div>
                </div>
                <div class="report-status success">
                    <i class="fas fa-check-circle"></i> Completado
                </div>
            </li>
        `).join('');
    }

    // Utilidades de UI
    mostrarLoading(mostrar) {
        const btn = document.getElementById('generateReportBtn');
        if (btn) {
            if (mostrar) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
            } else {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-file-pdf"></i> Generar Informe PDF';
            }
        }
    }

    mostrarExito(mensaje) {
        this.mostrarNotificacion(mensaje, 'success');
    }

    mostrarError(mensaje) {
        this.mostrarNotificacion(mensaje, 'error');
    }

    mostrarNotificacion(mensaje, tipo) {
        // Crear notificación pequeña en esquina inferior izquierda
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion ${tipo}`;
        notificacion.innerHTML = `
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${mensaje}
        `;
        
        // Estilos pequeños y en esquina inferior izquierda
        notificacion.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            padding: 6px 10px;
            border-radius: 3px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            font-size: 11px;
            display: flex;
            align-items: center;
            gap: 5px;
            animation: slideUp 0.3s ease;
            max-width: 250px;
            background: ${tipo === 'success' ? '#2E7D32' : '#D32F2F'};
            color: white;
            border: 1px solid ${tipo === 'success' ? '#1B5E20' : '#B71C1C'};
        `;
        
        document.body.appendChild(notificacion);
        
        // Remover después de 1.5 segundos (más rápido)
        setTimeout(() => {
            notificacion.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notificacion)) {
                    document.body.removeChild(notificacion);
                }
            }, 300);
        }, 1500);
    }
}

// Inicializar el sistema cuando el DOM esté listo Y la app principal esté cargada
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que la app principal se inicialice
    setTimeout(() => {
        // Verificar que las variables globales existan antes de inicializar
        if (window.datosEditados && window.hojaActual) {
            console.log('✅ App principal lista, inicializando sistema de informes...');
            window.sistemaInformes = new SistemaInformes();
        } else {
            console.log('⏳ App principal no está lista aún, reintentando en 1 segundo...');
            setTimeout(() => {
                if (window.datosEditados && window.hojaActual) {
                    console.log('✅ App principal lista (reintento), inicializando sistema de informes...');
                    window.sistemaInformes = new SistemaInformes();
                } else {
                    console.error('❌ No se pudo inicializar el sistema de informes: la app principal no está disponible');
                }
            }, 1000);
        }
    }, 500); // Pequeño retraso para asegurar que app.js se inicialice primero
});

// Añadir animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { 
            transform: translateY(100%); 
            opacity: 0; 
        }
        to { 
            transform: translateY(0); 
            opacity: 1; 
        }
    }
    
    @keyframes slideDown {
        from { 
            transform: translateY(0); 
            opacity: 1; 
        }
        to { 
            transform: translateY(100%); 
            opacity: 0; 
        }
    }
    
    .report-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 5px;
        margin-bottom: 10px;
        background: white;
        transition: all 0.3s;
    }
    
    .report-item:hover {
        border-color: #1F3A5F;
        box-shadow: 0 2px 8px rgba(31, 58, 95, 0.1);
    }
    
    .report-info {
        flex: 1;
    }
    
    .report-client {
        font-weight: bold;
        color: #333;
        font-size: 14px;
    }
    
    .report-date {
        font-size: 12px;
        color: #666;
        margin-top: 5px;
    }
    
    .report-status {
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .report-status.success {
        background: #d4edda;
        color: #155724;
    }
`;
document.head.appendChild(style);
