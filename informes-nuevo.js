// =============================================================================
// SISTEMA DE INFORMES PDF - VERSIÓN 3.0 - DESDE CERO
// =============================================================================
// AUTOR: Portfolio Manager
// VERSIÓN: 3.0.0
// DESCRIPCIÓN: Sistema completo de generación de informes PDF profesionales
// =============================================================================

class SistemaInformes {
    constructor() {
        console.log('🚀 Iniciando Sistema de Informes PDF v3.0...');
        
        // Variables del sistema
        this.datosEditados = null;
        this.hojaActual = null;
        this.clienteActual = null;
        
        // Inicializar sistema
        this.inicializar();
    }

    // =============================================================================
    // 1. INICIALIZACIÓN DEL SISTEMA
    // =============================================================================
    inicializar() {
        console.log('📊 Configurando sistema de informes...');
        
        // Conectar con el sistema principal
        this.conectarConSistemaPrincipal();
        
        // Configurar eventos
        this.configurarEventos();
        
        // Inicializar interfaz
        this.inicializarInterfaz();
    }

    // =============================================================================
    // 2. CONEXIÓN CON SISTEMA PRINCIPAL
    // =============================================================================
    conectarConSistemaPrincipal() {
        console.log('🔗 Conectando con sistema principal...');
        
        // Verificar que el sistema principal esté cargado
        if (!window.datosEditados) {
            throw new Error('❌ Sistema principal no encontrado - window.datosEditados no existe');
        }
        
        if (!window.hojaActual) {
            throw new Error('❌ No hay hoja seleccionada - window.hojaActual no existe');
        }
        
        // Conectar variables globales
        this.datosEditados = window.datosEditados;
        this.hojaActual = window.hojaActual;
        this.clienteActual = window.clienteActual;
        
        console.log('✅ Conectado al sistema principal:', {
            hojaActual: this.hojaActual,
            clienteActual: this.clienteActual,
            totalClientes: Object.keys(this.datosEditados.hojas[this.hojaActual].clientes || {}).length
        });
    }

    // =============================================================================
    // 3. CONFIGURACIÓN DE EVENTOS
    // =============================================================================
    configurarEventos() {
        console.log('⚙️ Configurando eventos...');
        
        // Botón generar informe
        const btnGenerar = document.getElementById('generateReportBtn');
        if (btnGenerar) {
            btnGenerar.onclick = () => this.generarInforme();
            console.log('✅ Botón generar informe configurado');
        }
        
        // Botón recargar
        const btnRecargar = document.getElementById('reloadClientsBtn');
        if (btnRecargar) {
            btnRecargar.onclick = () => this.recargarDatos();
            console.log('✅ Botón recargar configurado');
        }
        
        // Selector de cliente
        const selector = document.getElementById('reportClientSelect');
        if (selector) {
            selector.onchange = () => this.actualizarClienteSeleccionado();
            console.log('✅ Selector de cliente configurado');
        }
    }

    // =============================================================================
    // 4. INICIALIZACIÓN DE INTERFAZ
    // =============================================================================
    inicializarInterfaz() {
        console.log('🖥️ Inicializando interfaz...');
        
        // Cargar clientes disponibles
        this.cargarClientesDisponibles();
        
        // Actualizar estado
        this.actualizarEstado();
    }

    // =============================================================================
    // 5. CARGAR CLIENTES DISPONIBLES
    // =============================================================================
    cargarClientesDisponibles() {
        console.log('👥 Cargando clientes disponibles...');
        
        const selector = document.getElementById('reportClientSelect');
        if (!selector) return;
        
        // Obtener clientes de la hoja actual
        const hoja = this.datosEditados.hojas[this.hojaActual];
        const clientes = hoja.clientes || {};
        
        // Limpiar selector
        selector.innerHTML = '';
        
        // Agregar opción por defecto
        const opcionDefecto = document.createElement('option');
        opcionDefecto.value = '';
        opcionDefecto.textContent = '-- Selecciona un cliente --';
        selector.appendChild(opcionDefecto);
        
        // Agregar clientes
        Object.entries(clientes).forEach(([indice, cliente]) => {
            const nombreCliente = this.obtenerNombreCliente(cliente);
            const opcion = document.createElement('option');
            opcion.value = indice;
            opcion.textContent = `${cliente.numero_cliente} - ${nombreCliente}`;
            selector.appendChild(opcion);
        });
        
        // Seleccionar cliente actual si existe
        if (this.clienteActual !== null && clientes[this.clienteActual]) {
            selector.value = this.clienteActual;
            console.log(`✅ Cliente actual seleccionado: ${this.obtenerNombreCliente(clientes[this.clienteActual])}`);
        }
        
        console.log(`✅ Cargados ${Object.keys(clientes).length} clientes`);
    }

    // =============================================================================
    // 6. OBTENER NOMBRE DE CLIENTE
    // =============================================================================
    obtenerNombreCliente(cliente) {
        // Extraer datos del cliente
        const datos = cliente.datos || {};
        
        // Intentar obtener nombre y apellidos
        const nombre = datos['NOMBRE']?.valor || '';
        const apellidos = datos['APELLIDOS']?.valor || '';
        
        // Construir nombre completo
        if (nombre || apellidos) {
            return `${nombre} ${apellidos}`.trim();
        }
        
        // Fallback: usar número de cliente
        return `Cliente ${cliente.numero_cliente || 'Sin número'}`;
    }

    // =============================================================================
    // 7. ACTUALIZAR CLIENTE SELECCIONADO
    // =============================================================================
    actualizarClienteSeleccionado() {
        const selector = document.getElementById('reportClientSelect');
        if (!selector) return;
        
        this.clienteActual = selector.value ? parseInt(selector.value) : null;
        this.actualizarEstado();
    }

    // =============================================================================
    // 8. ACTUALIZAR ESTADO
    // =============================================================================
    actualizarEstado() {
        const btnGenerar = document.getElementById('generateReportBtn');
        const clientesCount = document.getElementById('clientesCount');
        
        // Habilitar/deshabilitar botón
        if (btnGenerar) {
            btnGenerar.disabled = !this.clienteActual && this.clienteActual !== 0;
        }
        
        // Actualizar contador
        if (clientesCount) {
            if (this.clienteActual !== null && this.clienteActual !== 0) {
                clientesCount.textContent = '1 cliente seleccionado';
            } else {
                clientesCount.textContent = '0 clientes seleccionados';
            }
        }
    }

    // =============================================================================
    // 9. RECARGAR DATOS
    // =============================================================================
    recargarDatos() {
        console.log('🔄 Recargando datos...');
        
        try {
            // Reconectar con sistema principal
            this.conectarConSistemaPrincipal();
            
            // Recargar interfaz
            this.inicializarInterfaz();
            
            // Mostrar éxito
            this.mostrarNotificacion('✅ Datos recargados correctamente', 'success');
        } catch (error) {
            console.error('❌ Error al recargar datos:', error);
            this.mostrarNotificacion('❌ Error al recargar datos: ' + error.message, 'error');
        }
    }

    // =============================================================================
    // 10. GENERAR INFORME PRINCIPAL
    // =============================================================================
    async generarInforme() {
        console.log('📄 Iniciando generación de informe...');
        
        // Validar cliente seleccionado
        if (this.clienteActual === null || this.clienteActual === undefined) {
            this.mostrarNotificacion('❌ Por favor selecciona un cliente', 'error');
            return;
        }
        
        try {
            // Mostrar loading
            this.mostrarLoading(true);
            
            // Obtener cliente
            const cliente = this.obtenerClienteActual();
            if (!cliente) {
                throw new Error('No se encontró el cliente seleccionado');
            }
            
            console.log('🎯 Generando informe para:', {
                cliente: this.obtenerNombreCliente(cliente),
                numero: cliente.numero_cliente,
                hoja: this.hojaActual
            });
            
            // PASO 1: Extraer datos del cliente
            const datosInforme = await this.extraerDatosInforme(cliente);
            
            // PASO 2: Generar HTML del informe
            const htmlInforme = this.generarHTMLInforme(datosInforme);
            
            // PASO 3: Convertir a PDF
            const pdf = await this.convertirHTMLaPDF(htmlInforme);
            
            // PASO 4: Descargar PDF
            this.descargarPDF(pdf, cliente);
            
            // Mostrar éxito
            this.mostrarNotificacion('✅ Informe generado correctamente', 'success');
            
        } catch (error) {
            console.error('❌ Error al generar informe:', error);
            this.mostrarNotificacion('❌ Error al generar informe: ' + error.message, 'error');
        } finally {
            // Ocultar loading
            this.mostrarLoading(false);
        }
    }

    // =============================================================================
    // 11. OBTENER CLIENTE ACTUAL
    // =============================================================================
    obtenerClienteActual() {
        const hoja = this.datosEditados.hojas[this.hojaActual];
        return hoja.clientes[this.clienteActual];
    }

    // =============================================================================
    // 12. EXTRAER DATOS DEL INFORME
    // =============================================================================
    async extraerDatosInforme(cliente) {
        console.log('📊 Extrayendo datos del informe...');
        
        // DATOS BÁSICOS DEL CLIENTE
        const datosBasicos = {
            numeroCliente: cliente.numero_cliente,
            nombre: this.obtenerNombreCliente(cliente),
            email: this.obtenerDatoCliente(cliente, 'EMAIL'),
            telefono: this.obtenerDatoCliente(cliente, 'TELEFONO'),
            fecha: new Date().toLocaleDateString('es-ES')
        };
        
        // ESTADÍSTICAS FINANCIERAS
        const estadisticas = await this.calcularEstadisticasCliente(cliente);
        
        // MOVIMIENTOS DETALLADOS
        const movimientos = this.extraerMovimientos(cliente);
        
        // EVOLUCIÓN MENSUAL
        const evolucionMensual = await this.calcularEvolucionMensual(cliente);
        
        console.log('✅ Datos extraídos:', {
            cliente: datosBasicos.nombre,
            meses: evolucionMensual.length,
            movimientos: movimientos.length,
            saldoActual: estadisticas.saldoActual
        });
        
        return {
            datosBasicos,
            estadisticas,
            movimientos,
            evolucionMensual
        };
    }

    // =============================================================================
    // 13. OBTENER DATO ESPECÍFICO DEL CLIENTE
    // =============================================================================
    obtenerDatoCliente(cliente, campo) {
        const datos = cliente.datos || {};
        return datos[campo]?.valor || 'No especificado';
    }

    // =============================================================================
    // 14. CALCULAR ESTADÍSTICAS DEL CLIENTE
    // =============================================================================
    async calcularEstadisticasCliente(cliente) {
        console.log('📈 Calculando estadísticas del cliente...');
        
        // Usar las mismas funciones que el sistema principal
        const hoja = this.datosEditados.hojas[this.hojaActual];
        
        // Calcular estadísticas mensuales
        const datosMensuales = await window.calcularEstadisticasClienteTiempoReal(cliente, hoja);
        
        // Calcular KPIs totales
        const kpisTotales = window.calcularKPIsTiempoReal(datosMensuales);
        
        // Extraer estadísticas principales
        const estadisticas = {
            inversionInicial: kpisTotales.inversionInicial || 0,
            saldoActual: kpisTotales.saldoActual || 0,
            beneficioTotal: kpisTotales.beneficioTotal || 0,
            rentabilidadTotal: kpisTotales.rentabilidadTotal || 0,
            totalIncrementos: kpisTotales.totalIncrementos || 0,
            totalDecrementos: kpisTotales.totalDecrementos || 0,
            mesesConDatos: datosMensuales.length
        };
        
        console.log('✅ Estadísticas calculadas:', estadisticas);
        return estadisticas;
    }

    // =============================================================================
    // 15. EXTRAER MOVIMIENTOS
    // =============================================================================
    extraerMovimientos(cliente) {
        console.log('💰 Extrayendo movimientos...');
        
        const movimientos = [];
        const datosDiarios = cliente.datos_diarios || [];
        
        datosDiarios.forEach(fila => {
            const incremento = typeof fila.incremento === 'number' ? fila.incremento : 0;
            const decremento = typeof fila.decremento === 'number' ? fila.decremento : 0;
            
            // Movimiento de ingreso
            if (incremento > 0) {
                movimientos.push({
                    fecha: fila.fecha || '',
                    tipo: 'Ingreso',
                    importe: incremento,
                    mes: this.obtenerNombreMes(fila.fecha)
                });
            }
            
            // Movimiento de retirada
            if (decremento > 0) {
                movimientos.push({
                    fecha: fila.fecha || '',
                    tipo: 'Retirada',
                    importe: decremento,
                    mes: this.obtenerNombreMes(fila.fecha)
                });
            }
        });
        
        // Ordenar por fecha
        movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        
        console.log(`✅ Extraídos ${movimientos.length} movimientos`);
        return movimientos;
    }

    // =============================================================================
    // 16. OBTENER NOMBRE DEL MES
    // =============================================================================
    obtenerNombreMes(fechaStr) {
        if (!fechaStr || fechaStr === 'FECHA') return 'Sin fecha';
        
        try {
            const fecha = new Date(fechaStr);
            if (isNaN(fecha.getTime())) return 'Fecha inválida';
            
            return fecha.toLocaleDateString('es-ES', { 
                month: 'long', 
                year: 'numeric' 
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    // =============================================================================
    // 17. CALCULAR EVOLUCIÓN MENSUAL
    // =============================================================================
    async calcularEvolucionMensual(cliente) {
        console.log('📅 Calculando evolución mensual...');
        
        const hoja = this.datosEditados.hojas[this.hojaActual];
        const datosMensuales = await window.calcularEstadisticasClienteTiempoReal(cliente, hoja);
        
        // Formatear datos para el informe
        const evolucion = datosMensuales.map(mes => ({
            nombre: mes.nombreMes || mes.mes || 'Sin mes',
            incrementos: mes.incrementos || 0,
            decrementos: mes.decrementos || 0,
            beneficio: mes.beneficio || 0,
            saldoFinal: mes.saldoFinal || 0,
            rentabilidad: mes.rentabilidad || 0
        }));
        
        console.log(`✅ Evolución calculada para ${evolucion.length} meses`);
        return evolucion;
    }

    // =============================================================================
    // 18. GENERAR HTML DEL INFORME
    // =============================================================================
    generarHTMLInforme(datos) {
        console.log('📝 Generando HTML del informe...');
        
        const { datosBasicos, estadisticas, movimientos, evolucionMensual } = datos;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Informe Financiero - ${datosBasicos.nombre}</title>
                <style>
                    /* ESTILOS PROFESIONALES PARA PDF */
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        font-size: 12px;
                        color: #000000 !important;
                        background: #FFFFFF !important;
                        line-height: 1.4;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .encabezado {
                        text-align: center;
                        padding: 30px 0;
                        border-bottom: 3px solid #1F3A5F;
                        margin-bottom: 30px;
                        background: #F8F9FA !important;
                    }
                    
                    .encabezado h1 {
                        color: #1F3A5F !important;
                        font-size: 28px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    
                    .encabezado h2 {
                        color: #333333 !important;
                        font-size: 18px;
                        margin-bottom: 5px;
                    }
                    
                    .encabezado p {
                        color: #666666 !important;
                        font-size: 14px;
                    }
                    
                    .seccion {
                        margin-bottom: 30px;
                        padding: 25px;
                        border: 2px solid #000000 !important;
                        background: #FFFFFF !important;
                        page-break-inside: avoid;
                    }
                    
                    .titulo-seccion {
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
                    }
                    
                    th, td {
                        border: 1px solid #000000 !important;
                        padding: 10px 12px;
                        text-align: left;
                        vertical-align: top;
                    }
                    
                    th {
                        background: #E8EAED !important;
                        font-weight: bold;
                        color: #000000 !important;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    tr:nth-child(even) {
                        background: #F8F9FA !important;
                    }
                    
                    tr:nth-child(odd) {
                        background: #FFFFFF !important;
                    }
                    
                    .positivo {
                        color: #2E7D32 !important;
                        font-weight: bold;
                    }
                    
                    .negativo {
                        color: #D32F2F !important;
                        font-weight: bold;
                    }
                    
                    .resumen-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 20px;
                    }
                    
                    .resumen-item {
                        padding: 15px;
                        border: 1px solid #E0E0E0;
                        border-radius: 4px;
                        background: #FAFAFA;
                    }
                    
                    .resumen-label {
                        font-size: 10px;
                        color: #666666;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 5px;
                    }
                    
                    .resumen-value {
                        font-size: 16px;
                        font-weight: bold;
                        color: #000000;
                    }
                    
                    .grafico-container {
                        margin: 25px 0;
                        padding: 20px;
                        border: 2px solid #000000 !important;
                        background: #FFFFFF !important;
                        text-align: center;
                        page-break-inside: avoid;
                    }
                    
                    .grafico-titulo {
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
                    
                    .pie-pagina {
                        text-align: center;
                        padding: 25px 0;
                        border-top: 2px solid #000000 !important;
                        font-size: 10px;
                        color: #666666 !important;
                        margin-top: 30px;
                        background: #F8F9FA !important;
                    }
                    
                    @media print {
                        body {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .seccion {
                            page-break-inside: avoid;
                        }
                        
                        .grafico-container {
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <!-- ENCABEZADO -->
                <div class="encabezado">
                    <h1>📊 INFORME FINANCIERO</h1>
                    <h2>${datosBasicos.nombre}</h2>
                    <p>Cliente #${datosBasicos.numeroCliente} | ${datosBasicos.fecha}</p>
                </div>

                <!-- RESUMEN EJECUTIVO -->
                <div class="seccion">
                    <div class="titulo-seccion">Resumen Ejecutivo</div>
                    <div class="resumen-grid">
                        <div class="resumen-item">
                            <div class="resumen-label">Inversión Inicial</div>
                            <div class="resumen-value">€${estadisticas.inversionInicial.toLocaleString()}</div>
                        </div>
                        <div class="resumen-item">
                            <div class="resumen-label">Saldo Actual</div>
                            <div class="resumen-value">€${estadisticas.saldoActual.toLocaleString()}</div>
                        </div>
                        <div class="resumen-item">
                            <div class="resumen-label">Beneficio Total</div>
                            <div class="resumen-value ${estadisticas.beneficioTotal >= 0 ? 'positivo' : 'negativo'}">
                                €${estadisticas.beneficioTotal.toLocaleString()}
                            </div>
                        </div>
                        <div class="resumen-item">
                            <div class="resumen-label">Rentabilidad Total</div>
                            <div class="resumen-value ${estadisticas.rentabilidadTotal >= 0 ? 'positivo' : 'negativo'}">
                                ${estadisticas.rentabilidadTotal.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </div>

                <!-- DATOS DEL CLIENTE -->
                <div class="seccion">
                    <div class="titulo-seccion">Datos del Cliente</div>
                    <table>
                        <tr>
                            <th>Número de Cliente</th>
                            <td>${datosBasicos.numeroCliente}</td>
                        </tr>
                        <tr>
                            <th>Nombre Completo</th>
                            <td>${datosBasicos.nombre}</td>
                        </tr>
                        <tr>
                            <th>Email</th>
                            <td>${datosBasicos.email}</td>
                        </tr>
                        <tr>
                            <th>Teléfono</th>
                            <td>${datosBasicos.telefono}</td>
                        </tr>
                    </table>
                </div>

                <!-- EVOLUCIÓN MENSUAL -->
                <div class="seccion">
                    <div class="titulo-seccion">Evolución Mensual</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Mes</th>
                                <th>Incrementos</th>
                                <th>Decrementos</th>
                                <th>Beneficio</th>
                                <th>Saldo Final</th>
                                <th>Rentabilidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${evolucionMensual.map(mes => `
                                <tr>
                                    <td><strong>${mes.nombre}</strong></td>
                                    <td class="positivo">€${mes.incrementos.toLocaleString()}</td>
                                    <td class="negativo">€${mes.decrementos.toLocaleString()}</td>
                                    <td class="${mes.beneficio >= 0 ? 'positivo' : 'negativo'}">
                                        €${mes.beneficio.toLocaleString()}
                                    </td>
                                    <td><strong>€${mes.saldoFinal.toLocaleString()}</strong></td>
                                    <td class="${mes.rentabilidad >= 0 ? 'positivo' : 'negativo'}">
                                        ${mes.rentabilidad.toFixed(2)}%
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- MOVIMIENTOS DETALLADOS -->
                <div class="seccion">
                    <div class="titulo-seccion">Movimientos Detallados</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Importe</th>
                                <th>Mes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${movimientos.slice(0, 20).map(mov => `
                                <tr>
                                    <td>${mov.fecha}</td>
                                    <td class="${mov.tipo === 'Ingreso' ? 'positivo' : 'negativo'}">
                                        <strong>${mov.tipo}</strong>
                                    </td>
                                    <td class="${mov.tipo === 'Ingreso' ? 'positivo' : 'negativo'}">
                                        <strong>€${mov.importe.toLocaleString()}</strong>
                                    </td>
                                    <td>${mov.mes}</td>
                                </tr>
                            `).join('')}
                            ${movimientos.length > 20 ? `
                                <tr>
                                    <td colspan="4" style="text-align: center; font-style: italic;">
                                        ... y ${movimientos.length - 20} movimientos más
                                    </td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>

                <!-- GRÁFICOS -->
                <div class="seccion">
                    <div class="titulo-seccion">Análisis Gráfico</div>
                    <div class="grafico-container">
                        <div class="grafico-titulo">Rentabilidad Mensual (%)</div>
                        <canvas id="chartRentabilidad" width="800" height="250"></canvas>
                    </div>
                    <div class="grafico-container">
                        <div class="grafico-titulo">Evolución del Patrimonio</div>
                        <canvas id="chartEvolucion" width="800" height="250"></canvas>
                    </div>
                </div>

                <!-- PIE DE PÁGINA -->
                <div class="pie-pagina">
                    <p><strong>Portfolio Manager</strong> - Sistema de Gestión de Inversiones</p>
                    <p>Informe generado automáticamente | Confidencial | ${datosBasicos.fecha}</p>
                </div>
            </body>
            </html>
        `;
    }

    // =============================================================================
    // 19. CONVERTIR HTML A PDF
    // =============================================================================
    async convertirHTMLaPDF(html) {
        console.log('🔄 Convirtiendo HTML a PDF...');
        
        return new Promise((resolve, reject) => {
            // Crear contenedor temporal
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
                    await this.renderizarGraficos(tempDiv);
                    
                    // Capturar con html2canvas
                    const canvas = await html2canvas(tempDiv, {
                        scale: 3,
                        backgroundColor: '#FFFFFF',
                        useCORS: true,
                        allowTaint: true,
                        logging: false,
                        width: 794,
                        height: 1123,
                        foreignObjectRendering: true
                    });
                    
                    // Generar PDF
                    const pdf = new jspdf.jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4',
                        compress: true
                    });
                    
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    
                    // Calcular dimensiones
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const imgWidth = canvas.width;
                    const imgHeight = canvas.height;
                    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                    const imgX = (pdfWidth - imgWidth * ratio) / 2;
                    const imgY = 0;
                    
                    pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
                    
                    // Limpiar
                    document.body.removeChild(tempDiv);
                    
                    console.log('✅ PDF generado correctamente');
                    resolve(pdf);
                    
                } catch (error) {
                    console.error('❌ Error al convertir a PDF:', error);
                    if (document.body.contains(tempDiv)) {
                        document.body.removeChild(tempDiv);
                    }
                    reject(error);
                }
            }, 2000);
        });
    }

    // =============================================================================
    // 20. RENDERIZAR GRÁFICOS
    // =============================================================================
    async renderizarGraficos(container) {
        console.log('📊 Renderizando gráficos...');
        
        // Obtener datos para gráficos
        const datosGraficos = await this.prepararDatosGraficos();
        
        // Gráfico de rentabilidad
        const canvasRentabilidad = container.querySelector('#chartRentabilidad');
        if (canvasRentabilidad && window.Chart) {
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
                            ticks: { color: '#000000', font: { size: 11 } },
                            grid: { color: '#CCCCCC', borderColor: '#000000' }
                        },
                        x: {
                            ticks: { color: '#000000', font: { size: 10 } },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
        
        // Gráfico de evolución
        const canvasEvolucion = container.querySelector('#chartEvolucion');
        if (canvasEvolucion && window.Chart) {
            new Chart(canvasEvolucion, {
                type: 'line',
                data: {
                    labels: datosGraficos.labels,
                    datasets: [{
                        label: 'Saldo Acumulado',
                        data: datosGraficos.saldo,
                        backgroundColor: '#1976D2',
                        borderColor: '#000000',
                        borderWidth: 2,
                        pointBackgroundColor: '#1976D2',
                        pointBorderColor: '#000000',
                        pointBorderWidth: 2
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
                            ticks: { color: '#000000', font: { size: 11 } },
                            grid: { color: '#CCCCCC', borderColor: '#000000' }
                        },
                        x: {
                            ticks: { color: '#000000', font: { size: 10 } },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    }

    // =============================================================================
    // 21. PREPARAR DATOS PARA GRÁFICOS
    // =============================================================================
    async prepararDatosGraficos() {
        const cliente = this.obtenerClienteActual();
        const hoja = this.datosEditados.hojas[this.hojaActual];
        const datosMensuales = await window.calcularEstadisticasClienteTiempoReal(cliente, hoja);
        
        return {
            labels: datosMensuales.map(m => m.nombreMes || m.mes || 'Sin mes'),
            rentabilidad: datosMensuales.map(m => m.rentabilidad || 0),
            saldo: datosMensuales.map(m => m.saldoFinal || 0)
        };
    }

    // =============================================================================
    // 22. DESCARGAR PDF
    // =============================================================================
    descargarPDF(pdf, cliente) {
        console.log('💾 Descargando PDF...');
        
        const nombreCliente = this.obtenerNombreCliente(cliente);
        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = `Informe_${nombreCliente.replace(/\s+/g, '_')}_${fecha}.pdf`;
        
        pdf.save(nombreArchivo);
        console.log(`✅ PDF descargado: ${nombreArchivo}`);
    }

    // =============================================================================
    // 23. UTILIDADES DE INTERFAZ
    // =============================================================================
    mostrarLoading(mostrar) {
        const loading = document.getElementById('reportLoading');
        if (loading) {
            loading.style.display = mostrar ? 'block' : 'none';
        }
    }

    mostrarNotificacion(mensaje, tipo) {
        console.log(`🔔 ${tipo.toUpperCase()}: ${mensaje}`);
        
        // Crear notificación
        const notificacion = document.createElement('div');
        notificacion.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            padding: 15px 20px;
            background: ${tipo === 'success' ? '#4CAF50' : '#F44336'};
            color: white;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transform: translateX(0);
            transition: transform 0.3s ease;
        `;
        notificacion.textContent = mensaje;
        
        document.body.appendChild(notificacion);
        
        // Animación de salida
        setTimeout(() => {
            notificacion.style.transform = 'translateX(-400px)';
            setTimeout(() => {
                if (document.body.contains(notificacion)) {
                    document.body.removeChild(notificacion);
                }
            }, 300);
        }, 3000);
    }
}

// =============================================================================
// 24. INICIALIZACIÓN AUTOMÁTICA DEL SISTEMA
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Sistema de Informes PDF v3.0...');
    
    // Esperar a que el sistema principal esté listo
    setTimeout(() => {
        if (window.datosEditados && window.hojaActual) {
            console.log('✅ Sistema principal listo, iniciando informes...');
            window.sistemaInformes = new SistemaInformes();
        } else {
            console.log('⏳ Esperando sistema principal...');
            setTimeout(() => {
                if (window.datosEditados && window.hojaActual) {
                    console.log('✅ Sistema principal listo (retry), iniciando informes...');
                    window.sistemaInformes = new SistemaInformes();
                } else {
                    console.error('❌ No se pudo inicializar el sistema de informes');
                }
            }, 2000);
        }
    }, 1000);
});

// =============================================================================
// 25. EXPORTACIONES GLOBALES
// =============================================================================
window.SistemaInformes = SistemaInformes;
