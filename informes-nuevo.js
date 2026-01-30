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

    // Cargar datos desde las variables globales
    async cargarDatos() {
        try {
            this.datosEditados = window.datosEditados;
            if (!this.datosEditados) {
                throw new Error('No se encontraron datos editados');
            }
            this.clientes = this.datosEditados.clientes || [];
            console.log(`📊 Cargados ${this.clientes.length} clientes`);
        } catch (error) {
            console.error('❌ Error al cargar datos:', error);
            this.mostrarError('No se pudieron cargar los datos de clientes');
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

        // Selector de cliente
        const selectorCliente = document.getElementById('reportClientSelect');
        if (selectorCliente) {
            selectorCliente.onchange = () => this.validarSeleccionCliente();
        }
    }

    // Llenar selector de clientes
    llenarSelectorClientes() {
        const selector = document.getElementById('reportClientSelect');
        if (!selector) return;

        selector.innerHTML = '<option value="">Selecciona un cliente...</option>';
        
        this.clientes.forEach((cliente, index) => {
            const nombre = this.obtenerNombreCliente(cliente);
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${cliente.numero_cliente} - ${nombre}`;
            selector.appendChild(option);
        });

        console.log(`📝 Selector llenado con ${this.clientes.length} clientes`);
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
        const selector = document.getElementById('reportClientSelect');
        const clienteIndex = parseInt(selector.value);
        
        if (isNaN(clienteIndex)) {
            this.mostrarError('Por favor selecciona un cliente');
            return;
        }

        const cliente = this.clientes[clienteIndex];
        if (!cliente) {
            this.mostrarError('Cliente no encontrado');
            return;
        }

        console.log(`🎯 Generando informe para cliente ${cliente.numero_cliente}`);
        
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
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                        color: #000000;
                        background: #FFFFFF;
                        line-height: 1.6;
                    }
                    
                    .header {
                        text-align: center;
                        padding: 20px;
                        border-bottom: 3px solid #1F3A5F;
                        margin-bottom: 30px;
                    }
                    
                    .header h1 {
                        color: #1F3A5F;
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 10px;
                    }
                    
                    .header p {
                        color: #333333;
                        font-size: 12px;
                    }
                    
                    .section {
                        margin-bottom: 30px;
                        padding: 20px;
                        border: 1px solid #000000;
                    }
                    
                    .section-title {
                        background: #1F3A5F;
                        color: #FFFFFF;
                        padding: 10px 15px;
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 15px;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    
                    th, td {
                        border: 1px solid #000000;
                        padding: 10px;
                        text-align: left;
                    }
                    
                    th {
                        background: #F2F2F2;
                        font-weight: bold;
                        color: #000000;
                    }
                    
                    tr:nth-child(even) {
                        background: #F2F2F2;
                    }
                    
                    tr:nth-child(odd) {
                        background: #FFFFFF;
                    }
                    
                    .positive {
                        color: #2E7D32;
                        font-weight: bold;
                    }
                    
                    .negative {
                        color: #D32F2F;
                        font-weight: bold;
                    }
                    
                    .chart-container {
                        margin: 20px 0;
                        text-align: center;
                    }
                    
                    .chart-title {
                        font-size: 16px;
                        font-weight: bold;
                        color: #1F3A5F;
                        margin-bottom: 10px;
                    }
                    
                    canvas {
                        max-width: 100%;
                        height: 300px;
                    }
                    
                    .footer {
                        text-align: center;
                        padding: 20px;
                        border-top: 1px solid #000000;
                        font-size: 12px;
                        color: #666666;
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

    // Calcular estadísticas reales del cliente - USAR EXACTAMENTE LAS MISMAS FUNCIONES
    async calcularEstadisticasCliente(cliente) {
        console.log('🔥 USANDO MISMAS FUNCIONES QUE ESTADÍSTICAS DEL CLIENTE');
        
        // Usar exactamente la misma función que las estadísticas del cliente
        if (!window.calcularEstadisticasClienteTiempoReal) {
            throw new Error('La función calcularEstadisticasClienteTiempoReal no está disponible');
        }
        
        if (!window.calcularKPIsTiempoReal) {
            throw new Error('La función calcularKPIsTiempoReal no está disponible');
        }
        
        // Obtener hoja actual como lo hace el sistema de estadísticas
        const hoja = this.datosEditados.hojas[this.hojaActual];
        if (!hoja) {
            throw new Error(`No se encontró la hoja ${this.hojaActual}`);
        }
        
        // Usar exactamente la misma función que las estadísticas del cliente
        const datosClienteMeses = await window.calcularEstadisticasClienteTiempoReal(cliente, hoja);
        const kpisTotales = window.calcularKPIsTiempoReal(datosClienteMeses);
        
        console.log('📊 Datos obtenidos de estadísticas del cliente:', {
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

    // Convertir HTML a PDF
    async convertirHTMLaPDF(html, cliente) {
        console.log('🔄 Convirtiendo HTML a PDF...');
        
        return new Promise((resolve, reject) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.width = '210mm';
            tempDiv.style.background = '#FFFFFF';
            document.body.appendChild(tempDiv);
            
            setTimeout(async () => {
                try {
                    // Renderizar gráficos
                    await this.renderizarGraficos(tempDiv, cliente);
                    
                    // Capturar con html2canvas
                    const canvas = await html2canvas(tempDiv, {
                        scale: 2,
                        backgroundColor: '#FFFFFF',
                        useCORS: true,
                        allowTaint: true,
                        logging: false
                    });
                    
                    // Generar PDF
                    const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
                    const imgData = canvas.toDataURL('image/png', 1.0);
                    
                    const imgWidth = 210;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    
                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                    
                    document.body.removeChild(tempDiv);
                    
                    console.log('✅ PDF generado correctamente');
                    resolve(pdf);
                    
                } catch (error) {
                    document.body.removeChild(tempDiv);
                    reject(error);
                }
            }, 1000);
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

    // Preparar datos para gráficos - USAR DATOS REALES DE ESTADÍSTICAS
    async prepararDatosGraficos(cliente) {
        console.log('📈 PREPARANDO GRÁFICOS CON DATOS REALES DE ESTADÍSTICAS');
        
        // Usar exactamente los mismos datos que las estadísticas del cliente
        const hoja = this.datosEditados.hojas[this.hojaActual];
        const datosClienteMeses = await window.calcularEstadisticasClienteTiempoReal(cliente, hoja);
        
        console.log('📊 Datos para gráficos:', {
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
        // Crear notificación
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion ${tipo}`;
        notificacion.innerHTML = `
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${mensaje}
        `;
        
        // Estilos
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${tipo === 'success' ? '#2E7D32' : '#D32F2F'};
            color: white;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notificacion);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notificacion.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notificacion);
            }, 300);
        }, 3000);
    }
}

// Inicializar el sistema cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.sistemaInformes = new SistemaInformes();
});

// Añadir animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .report-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: 5px;
        margin-bottom: 10px;
        background: white;
    }
    
    .report-info {
        flex: 1;
    }
    
    .report-client {
        font-weight: bold;
        color: #333;
    }
    
    .report-date {
        font-size: 12px;
        color: #666;
    }
    
    .report-status {
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .report-status.success {
        background: #e8f5e8;
        color: #2E7D32;
    }
`;
document.head.appendChild(style);
