// =============================================================================
// SCRIPT DE DEBUG PARA GENERACIÓN DE PDF
// =============================================================================

class DebugPDF {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🔍 INICIANDO DEBUG DE PDF');
        
        // Esperar a que el sistema esté listo
        if (window.sistemaInformes) {
            console.log('✅ Sistema de informes encontrado');
            await this.probarGeneracionPDF();
        } else {
            console.error('❌ Sistema de informes no encontrado');
            setTimeout(() => this.init(), 1000);
        }
    }

    async probarGeneracionPDF() {
        try {
            console.log('🎯 INICIANDO PRUEBA DE GENERACIÓN PDF');
            
            // 1. Verificar variables globales
            console.log('📊 VARIABLES GLOBALES:');
            console.log('  - datosEditados:', !!window.datosEditados);
            console.log('  - hojaActual:', window.hojaActual);
            console.log('  - clienteActual:', window.clienteActual);
            
            if (!window.datosEditados) {
                throw new Error('datosEditados no disponible');
            }
            
            // 2. Obtener primer cliente disponible
            const hoja = window.datosEditados.hojas[window.hojaActual];
            if (!hoja || !hoja.clientes) {
                throw new Error('No hay hoja o clientes disponibles');
            }
            
            const clientes = Object.keys(hoja.clientes);
            if (clientes.length === 0) {
                throw new Error('No hay clientes en la hoja');
            }
            
            const primerClienteIndex = clientes[0];
            const cliente = hoja.clientes[primerClienteIndex];
            
            console.log('👤 CLIENTE SELECCIONADO:');
            console.log('  - Índice:', primerClienteIndex);
            console.log('  - Número:', cliente.numero_cliente);
            console.log('  - Datos diarios:', cliente.datos_diarios?.length || 0);
            console.log('  - Nombre:', this.obtenerNombreCliente(cliente));
            
            // 3. Probar cálculo de estadísticas
            console.log('📈 PROBANDO CÁLCULO DE ESTADÍSTICAS...');
            const datosEstadisticas = await window.calcularEstadisticasClienteTiempoReal(cliente, hoja);
            console.log('  - Meses calculados:', datosEstadisticas.length);
            console.log('  - Muestra de datos:', datosEstadisticas.slice(0, 2));
            
            // 4. Probar KPIs
            console.log('💰 PROBANDO CÁLCULO DE KPIS...');
            const kpis = window.calcularKPIsTiempoReal(datosEstadisticas);
            console.log('  - KPIs calculados:', Object.keys(kpis));
            console.log('  - Inversión inicial:', kpis.inversionInicial);
            console.log('  - Saldo actual:', kpis.saldoActual);
            console.log('  - Beneficio total:', kpis.beneficioTotal);
            console.log('  - Rentabilidad total:', kpis.rentabilidadTotal);
            
            // 5. Probar generación de HTML
            console.log('📄 PROBANDO GENERACIÓN DE HTML...');
            const htmlInforme = await this.generarHTMLInformeDebug(cliente, datosEstadisticas, kpis);
            console.log('  - HTML generado, longitud:', htmlInforme.length);
            
            // 6. Probar renderizado de gráficos
            console.log('📊 PROBANDO RENDERIZADO DE GRÁFICOS...');
            await this.probarGraficos(datosEstadisticas);
            
            // 7. Probar conversión a PDF
            console.log('🔄 PROBANDO CONVERSIÓN A PDF...');
            const pdf = await this.probarConversiónPDF(htmlInforme, cliente);
            console.log('  - PDF generado correctamente');
            
            // 8. Descargar PDF de prueba
            console.log('💾 DESCARGANDO PDF DE PRUEBA...');
            this.descargarPDFDebug(pdf, cliente);
            
            console.log('✅ DEBUG COMPLETADO - PDF GENERADO CORRECTAMENTE');
            
        } catch (error) {
            console.error('❌ ERROR EN DEBUG:', error);
            this.mostrarErrorDebug(error.message);
        }
    }

    obtenerNombreCliente(cliente) {
        const datos = cliente.datos || {};
        const nombre = datos['NOMBRE']?.valor || '';
        const apellidos = datos['APELLIDOS']?.valor || '';
        return nombre || apellidos ? `${nombre} ${apellidos}`.trim() : `Cliente ${cliente.numero_cliente}`;
    }

    async generarHTMLInformeDebug(cliente, datosEstadisticas, kpis) {
        const nombreCliente = this.obtenerNombreCliente(cliente);
        const fecha = new Date().toLocaleDateString('es-ES');
        
        // Extraer movimientos
        const movimientos = this.extraerMovimientosDebug(cliente);
        
        console.log('📋 DATOS PARA HTML:');
        console.log('  - Movimientos extraídos:', movimientos.length);
        console.log('  - Muestra de movimientos:', movimientos.slice(0, 3));
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>DEBUG - Informe de ${nombreCliente}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
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
                        background: #F8F9FA;
                    }
                    .header h1 { color: #1F3A5F; font-size: 24px; font-weight: bold; }
                    .header p { color: #333333; font-size: 12px; margin-top: 5px; }
                    .section {
                        margin-bottom: 30px;
                        padding: 20px;
                        border: 2px solid #000000;
                        background: #FFFFFF;
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
                        border: 2px solid #000000;
                        padding: 10px;
                        text-align: left;
                    }
                    th {
                        background: #E3F2FD;
                        font-weight: bold;
                        color: #000000;
                    }
                    tr:nth-child(even) { background: #F5F5F5; }
                    tr:nth-child(odd) { background: #FFFFFF; }
                    .positive { color: #2E7D32; font-weight: bold; }
                    .negative { color: #D32F2F; font-weight: bold; }
                    .chart-container {
                        margin: 20px 0;
                        text-align: center;
                        border: 2px solid #000000;
                        padding: 20px;
                        background: #FFFFFF;
                    }
                    .chart-title {
                        font-size: 16px;
                        font-weight: bold;
                        color: #1F3A5F;
                        margin-bottom: 10px;
                    }
                    canvas {
                        border: 1px solid #000000;
                        max-width: 100%;
                        height: 300px;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        border-top: 2px solid #000000;
                        font-size: 12px;
                        color: #666666;
                        background: #F8F9FA;
                    }
                    .debug-info {
                        background: #FFF3CD;
                        border: 2px solid #856404;
                        padding: 15px;
                        margin-bottom: 20px;
                        color: #856404;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🔍 DEBUG - INFORME DE CLIENTE</h1>
                    <p>${nombreCliente}</p>
                    <p>Fecha: ${fecha}</p>
                </div>

                <div class="debug-info">
                    📊 DEBUG: Este es un informe de prueba para verificar la generación de PDF
                    <br>• Clientes procesados: ${datosEstadisticas.length} meses
                    <br>• Movimientos detectados: ${movimientos.length}
                    <br>• KPIs calculados: ${Object.keys(kpis).length}
                </div>

                <div class="section">
                    <div class="section-title">Resumen General</div>
                    <table>
                        <tr><th>Métrica</th><th>Valor</th></tr>
                        <tr><td>Inversión Inicial</td><td>€${(kpis.inversionInicial || 0).toLocaleString()}</td></tr>
                        <tr><td>Saldo Actual</td><td>€${(kpis.saldoActual || 0).toLocaleString()}</td></tr>
                        <tr><td>Beneficio Total</td><td class="${(kpis.beneficioTotal || 0) >= 0 ? 'positive' : 'negative'}">€${(kpis.beneficioTotal || 0).toLocaleString()}</td></tr>
                        <tr><td>Rentabilidad Total</td><td class="${(kpis.rentabilidadTotal || 0) >= 0 ? 'positive' : 'negative'}">${(kpis.rentabilidadTotal || 0).toFixed(2)}%</td></tr>
                        <tr><td>Meses con Datos</td><td>${datosEstadisticas.length}</td></tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Detalle Mensual</div>
                    <table>
                        <tr>
                            <th>Mes</th><th>Incrementos</th><th>Decrementos</th><th>Beneficio</th><th>Saldo Final</th><th>Rentabilidad</th>
                        </tr>
                        ${datosEstadisticas.map(mes => `
                            <tr>
                                <td>${mes.nombreMes || mes.mes || 'Sin mes'}</td>
                                <td class="positive">€${(mes.incrementos || 0).toLocaleString()}</td>
                                <td class="negative">€${(mes.decrementos || 0).toLocaleString()}</td>
                                <td class="${(mes.beneficio || 0) >= 0 ? 'positive' : 'negative'}">€${(mes.beneficio || 0).toLocaleString()}</td>
                                <td>€${(mes.saldoFinal || 0).toLocaleString()}</td>
                                <td class="${(mes.rentabilidad || 0) >= 0 ? 'positive' : 'negative'}">${(mes.rentabilidad || 0).toFixed(2)}%</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Movimientos Detallados</div>
                    <table>
                        <tr><th>Fecha</th><th>Tipo</th><th>Importe</th><th>Mes</th></tr>
                        ${movimientos.map(mov => `
                            <tr>
                                <td>${mov.fecha}</td>
                                <td class="${mov.tipo === 'Ingreso' ? 'positive' : 'negative'}">${mov.tipo}</td>
                                <td class="${mov.tipo === 'Ingreso' ? 'positive' : 'negative'}">€${mov.importe.toLocaleString()}</td>
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
                    <p>Informe de DEBUG generado automáticamente - Sistema de Informes 2.0</p>
                </div>
            </body>
            </html>
        `;
    }

    extraerMovimientosDebug(cliente) {
        const datosDiarios = cliente.datos_diarios || [];
        const movimientos = [];
        
        datosDiarios.forEach(fila => {
            const inc = typeof fila.incremento === 'number' ? fila.incremento : 0;
            const dec = typeof fila.decremento === 'number' ? fila.decremento : 0;
            
            let nombreMes = 'Sin mes';
            if (fila.fecha && fila.fecha !== 'FECHA') {
                const fecha = new Date(fila.fecha);
                if (!isNaN(fecha.getTime())) {
                    nombreMes = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                }
            }
            
            if (inc > 0) {
                movimientos.push({
                    fecha: fila.fecha || '',
                    importe: inc,
                    tipo: 'Ingreso',
                    mes: nombreMes
                });
            }
            
            if (dec > 0) {
                movimientos.push({
                    fecha: fila.fecha || '',
                    importe: dec,
                    tipo: 'Retirada',
                    mes: nombreMes
                });
            }
        });
        
        return movimientos;
    }

    async probarGraficos(datosEstadisticas) {
        console.log('📊 CREANDO GRÁFICOS DE PRUEBA...');
        
        // Crear contenedor temporal para gráficos
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.innerHTML = `
            <canvas id="tempChartRentabilidad" width="800" height="300"></canvas>
            <canvas id="tempChartEvolucion" width="800" height="300"></canvas>
        `;
        document.body.appendChild(tempDiv);
        
        try {
            // Preparar datos
            const labels = datosEstadisticas.map(m => m.nombreMes || m.mes || 'Sin mes');
            const rentabilidad = datosEstadisticas.map(m => m.rentabilidad || 0);
            const saldos = datosEstadisticas.map(m => m.saldoFinal || 0);
            
            console.log('📈 DATOS PARA GRÁFICOS:');
            console.log('  - Labels:', labels.length);
            console.log('  - Rentabilidad:', rentabilidad.length);
            console.log('  - Saldos:', saldos.length);
            console.log('  - Muestra rentabilidad:', rentabilidad.slice(0, 3));
            console.log('  - Muestra saldos:', saldos.slice(0, 3));
            
            // Gráfico de rentabilidad
            const canvasRentabilidad = tempDiv.querySelector('#tempChartRentabilidad');
            if (canvasRentabilidad && window.Chart) {
                new Chart(canvasRentabilidad, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Rentabilidad (%)',
                            data: rentabilidad,
                            backgroundColor: rentabilidad.map(r => r >= 0 ? '#2E7D32' : '#D32F2F'),
                            borderColor: '#000000',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: false,
                        animation: false,
                        plugins: {
                            legend: {
                                labels: { color: '#000000', font: { size: 14, weight: 'bold' } }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { color: '#000000' },
                                grid: { color: '#CCCCCC', borderColor: '#000000' }
                            },
                            x: {
                                ticks: { color: '#000000' },
                                grid: { display: false }
                            }
                        }
                    }
                });
                console.log('✅ Gráfico de rentabilidad creado');
            }
            
            // Gráfico de evolución
            const canvasEvolucion = tempDiv.querySelector('#tempChartEvolucion');
            if (canvasEvolucion && window.Chart) {
                new Chart(canvasEvolucion, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Saldo',
                            data: saldos,
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
                                labels: { color: '#000000', font: { size: 14, weight: 'bold' } }
                            }
                        },
                        scales: {
                            y: {
                                ticks: { color: '#000000' },
                                grid: { color: '#CCCCCC', borderColor: '#000000' }
                            },
                            x: {
                                ticks: { color: '#000000' },
                                grid: { display: false }
                            }
                        }
                    }
                });
                console.log('✅ Gráfico de evolución creado');
            }
            
            // Esperar a que se rendericen
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error('❌ Error al crear gráficos:', error);
        } finally {
            document.body.removeChild(tempDiv);
        }
    }

    async probarConversiónPDF(html, cliente) {
        console.log('🔄 INICIANDO CONVERSIÓN A PDF...');
        
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
                    // Renderizar gráficos si Chart está disponible
                    if (window.Chart) {
                        console.log('📊 Renderizando gráficos en HTML...');
                        await this.renderizarGraficosEnHTML(tempDiv, cliente);
                    }
                    
                    // Capturar con html2canvas
                    console.log('📸 Capturando HTML con html2canvas...');
                    const canvas = await html2canvas(tempDiv, {
                        scale: 2,
                        backgroundColor: '#FFFFFF',
                        useCORS: true,
                        allowTaint: true,
                        logging: true, // Activar logging para ver qué pasa
                        width: 794, // A4 width in pixels at 96dpi
                        height: 1123, // A4 height in pixels at 96dpi
                        windowWidth: 794,
                        windowHeight: 1123
                    });
                    
                    console.log('📏 Canvas capturado:', {
                        width: canvas.width,
                        height: canvas.height,
                        dataURL: canvas.toDataURL('image/png', 1.0).substring(0, 100) + '...'
                    });
                    
                    // Generar PDF
                    console.log('📄 Generando PDF con jsPDF...');
                    const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
                    const imgData = canvas.toDataURL('image/png', 1.0);
                    
                    const imgWidth = 210; // A4 width in mm
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    
                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                    
                    document.body.removeChild(tempDiv);
                    
                    console.log('✅ PDF generado con éxito');
                    resolve(pdf);
                    
                } catch (error) {
                    console.error('❌ Error en conversión PDF:', error);
                    document.body.removeChild(tempDiv);
                    reject(error);
                }
            }, 2000); // Dar más tiempo para que se cargue todo
        });
    }

    async renderizarGraficosEnHTML(container, cliente) {
        // Implementar renderizado de gráficos similar al sistema principal
        console.log('📊 Renderizando gráficos en contenedor HTML...');
        // Esta función sería similar a la del sistema principal
    }

    descargarPDFDebug(pdf, cliente) {
        const nombreCliente = this.obtenerNombreCliente(cliente);
        const filename = `DEBUG_informe_${nombreCliente.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        
        pdf.save(filename);
        console.log(`💾 PDF de prueba descargado: ${filename}`);
    }

    mostrarErrorDebug(mensaje) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            background: #D32F2F;
            color: white;
            border-radius: 5px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            max-width: 400px;
        `;
        errorDiv.innerHTML = `❌ ERROR DEBUG: ${mensaje}`;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Iniciar debug automáticamente
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.debugPDF = new DebugPDF();
    }, 2000); // Esperar a que todo cargue
});

// También permitir ejecución manual
window.iniciarDebugPDF = () => {
    if (!window.debugPDF) {
        window.debugPDF = new DebugPDF();
    } else {
        window.debugPDF.probarGeneracionPDF();
    }
};

console.log('🔍 Script de debug PDF cargado. Ejecuta window.iniciarDebugPDF() para probar manualmente');
