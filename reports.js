// 📄 MÓDULO DE INFORMES PDF

class ReportsManager {
    constructor() {
        this.clientesDisponibles = [];
        this.informesGenerados = [];
        this.pdfGenerator = null;
        this.inicializado = false;
        this.init();
    }

    init() {
        console.log('📄 Inicializando gestor de informes...');
        this.setupEventListeners();
        this.cargarHistorialInformes();
        
        // Intentar cargar clientes si los datos ya están disponibles
        if (typeof datosEditados !== 'undefined' && datosEditados && datosEditados.hojas) {
            this.cargarClientesDisponibles();
            this.inicializado = true;
        } else {
            console.log('⏳ Esperando a que los datos se carguen...');
        }
    }

    // 🔄 Recargar clientes (llamar cuando se accede a la vista)
    recargarClientes() {
        console.log('🔄 Recargando clientes para informes...');
        
        // Verificar si los datos están disponibles
        if (typeof datosEditados === 'undefined' || !datosEditados || !datosEditados.hojas) {
            console.warn('⚠️ Los datos aún no están disponibles');
            mostrarNotificacion('Los datos están cargando, intenta de nuevo en unos segundos', 'warning');
            return;
        }
        
        this.cargarClientesDisponibles();
        this.inicializado = true;
    }

    // 📋 Cargar clientes disponibles para informes
    cargarClientesDisponibles() {
        try {
            console.log('🔍 Iniciando carga de clientes para informes...');
            
            // Verificar que datosEditados exista
            if (typeof datosEditados === 'undefined' || !datosEditados) {
                console.error('❌ datosEditados no está definido');
                mostrarNotificacion('Error: datos no cargados', 'error');
                return;
            }

            // Obtener todas las hojas
            const hojas = datosEditados.hojas || {};
            console.log('📊 Hojas disponibles:', Object.keys(hojas));
            
            this.clientesDisponibles = [];

            Object.keys(hojas).forEach(nombreHoja => {
                const hoja = hojas[nombreHoja];
                console.log(`🔍 Analizando hoja: ${nombreHoja}`);
                
                // 🔥 CORRECCIÓN: Los clientes son un array, no un objeto
                if (hoja.clientes && Array.isArray(hoja.clientes)) {
                    console.log(`👥 Clientes en ${nombreHoja}:`, hoja.clientes.length);
                    
                    hoja.clientes.forEach((cliente, index) => {
                        if (cliente && typeof cliente === 'object') {
                            // 🔥 EXTRAER NOMBRE Y APELLIDOS REALES
                            const datosCliente = cliente.datos || {};
                            const nombre = datosCliente['NOMBRE']?.valor || '';
                            const apellidos = datosCliente['APELLIDOS']?.valor || '';
                            const nombreCompleto = (nombre || apellidos) ? `${nombre} ${apellidos}`.trim() : '';
                            
                            const numeroCliente = cliente.numero_cliente || (index + 1);
                            const nombreParaMostrar = nombreCompleto ? `Cliente ${numeroCliente} - ${nombreCompleto}` : `Cliente ${numeroCliente}`;
                            
                            console.log(`✅ Cliente encontrado: ${nombreParaMostrar} (índice: ${index}, número: ${numeroCliente})`);
                            
                            this.clientesDisponibles.push({
                                id: index, // Usar el índice del array
                                nombre: nombreParaMostrar,
                                numeroCliente: numeroCliente,
                                nombreCompleto: nombreCompleto,
                                nombreSolo: nombre,
                                apellidos: apellidos,
                                hoja: nombreHoja,
                                datos: cliente
                            });
                        } else {
                            console.warn(`⚠️ Cliente inválido en índice ${index}`);
                        }
                    });
                } else {
                    console.warn(`⚠️ La hoja ${nombreHoja} no tiene clientes válidos (tipo: ${typeof hoja.clientes})`);
                }
            });

            console.log(`👥 Total de clientes disponibles para informes: ${this.clientesDisponibles.length}`);
            
            if (this.clientesDisponibles.length === 0) {
                console.warn('⚠️ No se encontraron clientes');
                mostrarNotificacion('No se encontraron clientes para generar informes', 'warning');
            } else {
                console.log('✅ Clientes cargados correctamente:', this.clientesDisponibles.map(c => `${c.nombre} (${c.hoja})`));
            }
            
            this.actualizarDropdownClientes();

        } catch (error) {
            console.error('❌ Error cargando clientes para informes:', error);
            mostrarNotificacion('Error al cargar clientes: ' + error.message, 'error');
        }
    }

    // 🔄 Actualizar dropdown de clientes
    actualizarDropdownClientes() {
        const dropdown = document.getElementById('reportClientSelect');
        if (!dropdown) {
            console.warn('⚠️ Dropdown de clientes no encontrado');
            return;
        }

        console.log('🔄 Actualizando dropdown de clientes...');
        
        // Limpiar opciones existentes
        dropdown.innerHTML = '<option value="">Selecciona un cliente...</option>';

        if (this.clientesDisponibles.length === 0) {
            console.log('⚠️ No hay clientes disponibles para mostrar');
            // Añadir opción deshabilitada indicando que no hay clientes
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No hay clientes disponibles';
            option.disabled = true;
            dropdown.appendChild(option);
        } else {
            console.log(`✅ Añadiendo ${this.clientesDisponibles.length} clientes al dropdown`);
            
            // 🔥 CORRECCIÓN: Ordenar por hoja y luego por número de cliente
            this.clientesDisponibles.sort((a, b) => {
                if (a.hoja !== b.hoja) return a.hoja.localeCompare(b.hoja);
                return a.numeroCliente - b.numeroCliente;
            });
            
            // Añadir clientes disponibles
            this.clientesDisponibles.forEach(cliente => {
                const option = document.createElement('option');
                // 🔥 CORRECCIÓN: Formato correcto del value
                option.value = `${cliente.hoja}|${cliente.id}`;
                option.textContent = cliente.nombre; // Solo el nombre, sin la hoja
                dropdown.appendChild(option);
            });
            
            console.log('✅ Dropdown actualizado correctamente');
        }

        // Habilitar/deshabilitar botón de generar
        this.actualizarEstadoBotonGenerar();
    }

    // 🎯 Actualizar estado del botón de generar informe
    actualizarEstadoBotonGenerar() {
        const dropdown = document.getElementById('reportClientSelect');
        const boton = document.getElementById('generateReportBtn');
        
        if (!dropdown || !boton) return;

        const clienteSeleccionado = dropdown.value;
        boton.disabled = !clienteSeleccionado;
    }

    // 📊 Generar informe PDF
    async generarInformePDF() {
        const dropdown = document.getElementById('reportClientSelect');
        const boton = document.getElementById('generateReportBtn');
        
        if (!dropdown.value) {
            mostrarNotificacion('Por favor, selecciona un cliente', 'warning');
            return;
        }

        try {
            // Mostrar estado de carga
            boton.classList.add('loading');
            boton.disabled = true;
            boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando informe...';

            // Extraer información del cliente seleccionado
            const [hojaNombre, clienteId] = dropdown.value.split('|');
            const clienteIndex = parseInt(clienteId);
            const cliente = this.clientesDisponibles.find(c => 
                c.hoja === hojaNombre && c.id === clienteIndex
            );

            if (!cliente) {
                throw new Error('Cliente no encontrado');
            }

            console.log('📄 Generando informe para:', cliente.nombre, '(índice:', clienteIndex, ')');

            // 🔄 PASO 1: Recopilar datos del cliente
            const datosCliente = this.recopilarDatosCliente(cliente);

            // 🔄 PASO 2: Generar HTML temporal del informe
            const htmlInforme = this.generarHTMLInforme(datosCliente);

            // 🔄 PASO 3: Crear contenedor temporal para captura
            const contenedorTemporal = this.crearContenedorTemporal(htmlInforme);

            // 🔄 PASO 4: Convertir a PDF
            const pdfBlob = await this.convertirHTMLaPDF(contenedorTemporal);

            // 🔄 PASO 5: Limpiar contenedor temporal
            document.body.removeChild(contenedorTemporal);

            // 🔄 PASO 6: Guardar en historial
            this.guardarInformeEnHistorial(cliente, pdfBlob);

            // 🔄 PASO 7: Mostrar previsualización
            this.mostrarPrevisualizacionPDF(pdfBlob, cliente);

            // 🔄 PASO 8: Actualizar historial visual
            this.actualizarHistorialVisual();

        } catch (error) {
            console.error('❌ Error generando informe:', error);
            mostrarNotificacion('Error al generar informe: ' + error.message, 'error');
        } finally {
            // Restaurar estado del botón
            boton.classList.remove('loading');
            boton.disabled = false;
            boton.innerHTML = '<i class="fas fa-file-pdf"></i> Generar Informe PDF';
            this.actualizarEstadoBotonGenerar();
        }
    }

    // 📊 Recopilar datos completos del cliente
    recopilarDatosCliente(cliente) {
        const hoja = datosEditados.hojas[cliente.hoja];
        
        // 🔥 CORRECCIÓN: Acceder al cliente por índice del array
        const datosCliente = hoja.clientes[cliente.id];
        
        if (!datosCliente) {
            throw new Error(`Datos del cliente no encontrados en índice ${cliente.id} de la hoja ${cliente.hoja}`);
        }

        console.log('🔍 Datos del cliente:', {
            hoja: cliente.hoja,
            indice: cliente.id,
            numeroCliente: cliente.numeroCliente,
            tieneDatos: !!datosCliente,
            tieneDatosDiarios: !!(datosCliente.datos_diarios && datosCliente.datos_diarios.length > 0)
        });

        // Calcular estadísticas
        const estadisticas = this.calcularEstadisticasCliente(datosCliente);

        // Obtener datos mensuales
        const datosMensuales = this.obtenerDatosMensuales(datosCliente);

        return {
            info: {
                nombre: cliente.nombreCompleto || `Cliente ${cliente.numeroCliente}`,
                numeroCliente: cliente.numeroCliente,
                fechaGeneracion: new Date().toLocaleDateString('es-ES')
            },
            estadisticas,
            datosMensuales,
            operaciones: this.obtenerOperacionesCliente(datosCliente)
        };
    }

    // 🧮 Calcular estadísticas del cliente
    calcularEstadisticasCliente(datosCliente) {
        let inversionTotal = 0;
        let retiradasTotal = 0;
        let saldoActual = 0;

        console.log('🧮 Calculando estadísticas del cliente...');

        // 🔥 CORRECCIÓN: Usar datos_diarios array en lugar de objeto por meses
        const datosDiarios = datosCliente.datos_diarios || [];
        console.log(`📊 Procesando ${datosDiarios.length} registros diarios...`);

        datosDiarios.forEach(datoDiario => {
            if (datoDiario && typeof datoDiario === 'object') {
                // Calcular saldo actual (último saldo_diario o imp_final válido)
                const saldoDiario = parseFloat(datoDiario.saldo_diario) || 0;
                const impFinal = parseFloat(datoDiario.imp_final) || 0;
                
                if (saldoDiario > 0) {
                    saldoActual = Math.max(saldoActual, saldoDiario);
                }
                if (impFinal > 0) {
                    saldoActual = Math.max(saldoActual, impFinal);
                }

                // Calcular inversiones y retiradas
                const incremento = parseFloat(datoDiario.incremento) || 0;
                const decremento = parseFloat(datoDiario.decremento) || 0;
                
                if (incremento > 0) inversionTotal += incremento;
                if (decremento > 0) retiradasTotal += decremento;
            }
        });

        const beneficioTotal = saldoActual - inversionTotal + retiradasTotal;
        const rentabilidad = inversionTotal > 0 ? (beneficioTotal / inversionTotal) * 100 : 0;

        console.log('📈 Estadísticas calculadas:', {
            inversionTotal,
            retiradasTotal,
            saldoActual,
            beneficioTotal,
            rentabilidad
        });

        return {
            inversionTotal,
            retiradasTotal,
            saldoActual,
            beneficioTotal,
            rentabilidad
        };
    }

    // 📅 Obtener datos mensuales
    obtenerDatosMensuales(datosCliente) {
        const datosMensuales = [];
        const datosDiarios = datosCliente.datos_diarios || [];

        console.log('📅 Procesando datos mensuales...');

        // 🔥 CORRECCIÓN: Agrupar datos diarios por mes
        const datosPorMes = {};

        datosDiarios.forEach(datoDiario => {
            if (datoDiario && datoDiario.fecha && typeof datoDiario === 'object') {
                // Extraer mes de la fecha (formato YYYY-MM-DD)
                const fecha = datoDiario.fecha;
                if (fecha && typeof fecha === 'string') {
                    const mes = fecha.substring(0, 7); // YYYY-MM
                    
                    if (!datosPorMes[mes]) {
                        datosPorMes[mes] = {
                            valores: [],
                            beneficios: [],
                            rentabilidades: []
                        };
                    }

                    // Acumular valores del mes
                    const saldoDiario = parseFloat(datoDiario.saldo_diario) || 0;
                    const impFinal = parseFloat(datoDiario.imp_final) || 0;
                    const valor = Math.max(saldoDiario, impFinal);
                    
                    if (valor > 0) {
                        datosPorMes[mes].valores.push(valor);
                    }

                    // Calcular beneficio (diferencia con valor anterior)
                    if (datosPorMes[mes].valores.length > 1) {
                        const valorActual = datosPorMes[mes].valores[datosPorMes[mes].valores.length - 1];
                        const valorAnterior = datosPorMes[mes].valores[datosPorMes[mes].valores.length - 2];
                        const beneficio = valorActual - valorAnterior;
                        datosPorMes[mes].beneficios.push(beneficio);
                    }
                }
            }
        });

        // Convertir a array de datos mensuales
        Object.keys(datosPorMes).forEach(mes => {
            const datosMes = datosPorMes[mes];
            const valores = datosMes.valores;
            
            if (valores.length > 0) {
                const valorFinal = valores[valores.length - 1];
                const valorInicial = valores[0];
                const beneficio = valorFinal - valorInicial;
                const rentabilidad = valorInicial > 0 ? (beneficio / valorInicial) * 100 : 0;

                datosMensuales.push({
                    mes,
                    valor: valorFinal,
                    beneficio,
                    rentabilidad,
                    nombreMes: this.formatearNombreMes(mes)
                });
            }
        });

        // Ordenar por mes
        datosMensuales.sort((a, b) => a.mes.localeCompare(b.mes));

        console.log(`📊 Se encontraron ${datosMensuales.length} meses con datos:`, datosMensuales.map(m => m.nombreMes));

        return datosMensuales;
    }

    // 📋 Obtener operaciones del cliente
    obtenerOperacionesCliente(datosCliente) {
        const operaciones = [];
        const datosDiarios = datosCliente.datos_diarios || [];

        console.log('📋 Procesando operaciones del cliente...');

        // 🔥 CORRECCIÓN: Extraer operaciones directamente de datos_diarios
        datosDiarios.forEach(datoDiario => {
            if (datoDiario && typeof datoDiario === 'object' && datoDiario.fecha) {
                const fecha = datoDiario.fecha;
                const incremento = parseFloat(datoDiario.incremento) || 0;
                const decremento = parseFloat(datoDiario.decremento) || 0;
                const concepto = datoDiario.concepto || (incremento > 0 ? 'Inversión' : decremento > 0 ? 'Retirada' : '');

                if (incremento > 0 || decremento > 0) {
                    operaciones.push({
                        fecha,
                        concepto,
                        incremento,
                        decremento,
                        tipo: incremento > 0 ? 'inversion' : 'retirada'
                    });
                }
            }
        });

        // Ordenar por fecha
        operaciones.sort((a, b) => a.fecha.localeCompare(b.fecha));

        console.log(`💰 Se encontraron ${operaciones.length} operaciones:`);
        operaciones.forEach(op => {
            console.log(`  ${op.fecha}: ${op.tipo} ${op.incremento > 0 ? '+' + op.incremento : '-' + op.decremento}`);
        });

        return operaciones;
    }

    // 🎨 Generar HTML del informe
    generarHTMLInforme(datos) {
        return `
            <div class="informe-pdf" style="font-family: Arial, sans-serif; padding: 40px; background: white;">
                <!-- Cabecera -->
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #667eea; padding-bottom: 20px;">
                    <h1 style="color: #2d3748; margin: 0; font-size: 28px;">📊 INFORME DE CLIENTE</h1>
                    <p style="color: #718096; margin: 10px 0 0 0; font-size: 16px;">Generado el ${datos.info.fechaGeneracion}</p>
                </div>

                <!-- Datos del Cliente -->
                <div style="margin-bottom: 30px;">
                    <h2 style="color: #2d3748; border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 15px;">📋 Datos del Cliente</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8f9fa;">Nombre:</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0;">${datos.info.nombre}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8f9fa;">Fecha Informe:</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0;">${datos.info.fechaGeneracion}</td>
                        </tr>
                    </table>
                </div>

                <!-- Estadísticas Principales -->
                <div style="margin-bottom: 30px;">
                    <h2 style="color: #2d3748; border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 15px;">💰 Estadísticas Principales</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8f9fa;">Inversión Total:</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #48bb78;">€${this.formatearNumero(datos.estadisticas.inversionTotal)}</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8f9fa;">Beneficio Total:</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: ${datos.estadisticas.beneficioTotal >= 0 ? '#48bb78' : '#f56565'};">
                                €${this.formatearNumero(datos.estadisticas.beneficioTotal)} (${datos.estadisticas.beneficioTotal >= 0 ? '+' : ''}${datos.estadisticas.rentabilidad.toFixed(2)}%)
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8f9fa;">Retiradas:</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #f56565;">€${this.formatearNumero(datos.estadisticas.retiradasTotal)}</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8f9fa;">Saldo Actual:</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #667eea;">€${this.formatearNumero(datos.estadisticas.saldoActual)}</td>
                        </tr>
                    </table>
                </div>

                <!-- Datos Mensuales -->
                <div style="margin-bottom: 30px;">
                    <h2 style="color: #2d3748; border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 15px;">📈 Evolución Mensual</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: #667eea; color: white;">
                                <th style="padding: 8px; border: 1px solid #667eea; text-align: left;">Mes</th>
                                <th style="padding: 8px; border: 1px solid #667eea; text-align: right;">Saldo</th>
                                <th style="padding: 8px; border: 1px solid #667eea; text-align: right;">Beneficio</th>
                                <th style="padding: 8px; border: 1px solid #667eea; text-align: right;">Rentabilidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${datos.datosMensuales.map(mes => `
                                <tr>
                                    <td style="padding: 6px; border: 1px solid #e2e8f0;">${mes.nombreMes}</td>
                                    <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right;">€${this.formatearNumero(mes.valor)}</td>
                                    <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; color: ${mes.beneficio >= 0 ? '#48bb78' : '#f56565'};">
                                        ${mes.beneficio >= 0 ? '+' : ''}€${this.formatearNumero(mes.beneficio)}
                                    </td>
                                    <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; color: ${mes.rentabilidad >= 0 ? '#48bb78' : '#f56565'};">
                                        ${mes.rentabilidad >= 0 ? '+' : ''}${mes.rentabilidad.toFixed(2)}%
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Incrementos y Decrementos -->
                <div style="margin-bottom: 30px;">
                    <h2 style="color: #2d3748; border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 15px;">💰 Detalle de Incrementos y Decrementos</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: #667eea; color: white;">
                                <th style="padding: 8px; border: 1px solid #667eea; text-align: left;">Fecha</th>
                                <th style="padding: 8px; border: 1px solid #667eea; text-align: left;">Concepto</th>
                                <th style="padding: 8px; border: 1px solid #667eea; text-align: right;">Incremento</th>
                                <th style="padding: 8px; border: 1px solid #667eea; text-align: right;">Decremento</th>
                                <th style="padding: 8px; border: 1px solid #667eea; text-align: center;">Tipo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${datos.operaciones.map(op => `
                                <tr>
                                    <td style="padding: 6px; border: 1px solid #e2e8f0;">${op.fecha}</td>
                                    <td style="padding: 6px; border: 1px solid #e2e8f0;">${op.concepto}</td>
                                    <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; color: #48bb78;">
                                        ${op.incremento > 0 ? '+' + this.formatearNumero(op.incremento) : '-'}
                                    </td>
                                    <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; color: #f56565;">
                                        ${op.decremento > 0 ? '-' + this.formatearNumero(op.decremento) : '-'}
                                    </td>
                                    <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">
                                        <span style="background: ${op.tipo === 'inversion' ? '#48bb78' : '#f56565'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                                            ${op.tipo === 'inversion' ? 'INVERSIÓN' : 'RETIRADA'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background: #f8f9fa; font-weight: bold;">
                                <td colspan="2" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">TOTALES:</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #48bb78;">
                                    +${this.formatearNumero(datos.operaciones.reduce((sum, op) => sum + op.incremento, 0))}
                                </td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #f56565;">
                                    -${this.formatearNumero(datos.operaciones.reduce((sum, op) => sum + op.decremento, 0))}
                                </td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">-</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <!-- Pie de página -->
                <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px;">
                    <p>Informe generado automáticamente por InvertCursor - ${datos.info.fechaGeneracion}</p>
                </div>
            </div>
        `;
    }

    // 📦 Crear contenedor temporal para captura
    crearContenedorTemporal(html) {
        const contenedor = document.createElement('div');
        contenedor.style.position = 'absolute';
        contenedor.style.left = '-9999px';
        contenedor.style.top = '0';
        contenedor.style.width = '210mm';
        contenedor.style.background = 'white';
        contenedor.innerHTML = html;
        document.body.appendChild(contenedor);
        return contenedor;
    }

    // 🔄 Convertir HTML a PDF
    async convertirHTMLaPDF(contenedor) {
        try {
            // Capturar HTML como imagen
            const canvas = await html2canvas(contenedor, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

            // Crear PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            // Añadir imagen al PDF
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // Ancho A4 en mm
            const pageHeight = 297; // Altura A4 en mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            // Añadir imagen (puede ocupar varias páginas)
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Retornar blob del PDF
            return new Blob([pdf.output('blob')], { type: 'application/pdf' });

        } catch (error) {
            console.error('❌ Error convirtiendo HTML a PDF:', error);
            throw new Error('Error al generar el PDF');
        }
    }

    // 👁 Mostrar previsualización del PDF
    mostrarPrevisualizacionPDF(pdfBlob, cliente) {
        // Crear URL para el blob
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // Crear modal de previsualización
        const modal = document.createElement('div');
        modal.className = 'pdf-preview-modal active';
        modal.innerHTML = `
            <div class="pdf-preview-content">
                <div class="pdf-preview-header">
                    <h3 class="pdf-preview-title">📄 Previsualización - ${cliente.nombre}</h3>
                    <div class="pdf-preview-actions">
                        <button class="pdf-preview-btn" onclick="reportsManager.descargarPDF('${pdfUrl}', '${cliente.nombre}')">
                            <i class="fas fa-download"></i> Descargar
                        </button>
                        <button class="pdf-preview-btn secondary" onclick="reportsManager.imprimirPDF('${pdfUrl}')">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button class="pdf-preview-close" onclick="reportsManager.cerrarPrevisualizacion()">
                            <i class="fas fa-times"></i> Cerrar
                        </button>
                    </div>
                </div>
                <div class="pdf-preview-body">
                    <iframe src="${pdfUrl}" class="pdf-viewer" type="application/pdf"></iframe>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Cerrar al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.cerrarPrevisualizacion();
            }
        });

        // Cerrar con ESC
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.cerrarPrevisualizacion();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    // 💾 Descargar PDF
    descargarPDF(pdfUrl, nombreCliente) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `informe_${nombreCliente.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        mostrarNotificacion('PDF descargado correctamente', 'success');
    }

    // 🖨️ Imprimir PDF
    imprimirPDF(pdfUrl) {
        const windowPrint = window.open(pdfUrl, '_blank');
        if (windowPrint) {
            windowPrint.onload = function() {
                windowPrint.print();
            };
        }
    }

    // ❌ Cerrar previsualización
    cerrarPrevisualizacion() {
        const modal = document.querySelector('.pdf-preview-modal');
        if (modal) {
            document.body.removeChild(modal);
        }
    }

    // 📚 Guardar informe en historial
    guardarInformeEnHistorial(cliente, pdfBlob) {
        const informe = {
            id: Date.now(),
            cliente: cliente.nombre,
            clienteId: cliente.id,
            hoja: cliente.hoja,
            fecha: new Date().toISOString(),
            pdfBlob: pdfBlob
        };

        this.informesGenerados.unshift(informe);

        // Mantener solo los últimos 10 informes en memoria
        if (this.informesGenerados.length > 10) {
            this.informesGenerados = this.informesGenerados.slice(0, 10);
        }

        // Guardar en localStorage
        try {
            const historialParaGuardar = this.informesGenerados.map(i => ({
                ...i,
                pdfBlob: null // No guardar el blob en localStorage
            }));
            localStorage.setItem('informes_historial', JSON.stringify(historialParaGuardar));
        } catch (error) {
            console.warn('⚠️ No se pudo guardar historial en localStorage:', error);
        }
    }

    // 📋 Cargar historial de informes
    cargarHistorialInformes() {
        try {
            const historialGuardado = localStorage.getItem('informes_historial');
            if (historialGuardado) {
                const historial = JSON.parse(historialGuardado);
                this.informesGenerados = historial;
                this.actualizarHistorialVisual();
            }
        } catch (error) {
            console.warn('⚠️ Error cargando historial de informes:', error);
        }
    }

    // 🔄 Actualizar historial visual
    actualizarHistorialVisual() {
        const contenedor = document.getElementById('reportsHistoryList');
        if (!contenedor) return;

        if (this.informesGenerados.length === 0) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <div class="empty-state-text">No hay informes generados</div>
                    <div class="empty-state-subtext">Selecciona un cliente y genera tu primer informe</div>
                </div>
            `;
            return;
        }

        contenedor.innerHTML = this.informesGenerados.map(informe => `
            <li class="report-item">
                <div class="report-info">
                    <div class="report-client-name">${informe.cliente}</div>
                    <div class="report-date">${new Date(informe.fecha).toLocaleDateString('es-ES')} ${new Date(informe.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div class="report-actions">
                    <button class="report-action-btn" onclick="reportsManager.verInformeHistorial(${informe.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </div>
            </li>
        `).join('');
    }

    // 👁 Ver informe del historial
    verInformeHistorial(informeId) {
        const informe = this.informesGenerados.find(i => i.id === informeId);
        if (!informe) {
            mostrarNotificacion('Informe no encontrado', 'error');
            return;
        }

        if (informe.pdfBlob) {
            // Si tenemos el blob, mostrar previsualización
            const clienteInfo = { nombre: informe.cliente };
            this.mostrarPrevisualizacionPDF(informe.pdfBlob, clienteInfo);
        } else {
            // Si no tenemos el blob, mostrar mensaje
            mostrarNotificacion('El PDF original no está disponible. Debes generar un nuevo informe.', 'warning');
        }
    }

    // 🎛️ Configurar event listeners
    setupEventListeners() {
        // Dropdown de clientes
        const dropdown = document.getElementById('reportClientSelect');
        if (dropdown) {
            dropdown.addEventListener('change', () => {
                this.actualizarEstadoBotonGenerar();
            });
        }

        // Botón de generar informe
        const botonGenerar = document.getElementById('generateReportBtn');
        if (botonGenerar) {
            botonGenerar.addEventListener('click', () => {
                this.generarInformePDF();
            });
        }

        // 🔥 Botón de recargar clientes
        const botonRecargar = document.getElementById('reloadClientsBtn');
        if (botonRecargar) {
            botonRecargar.addEventListener('click', () => {
                this.recargarClientes();
            });
        }
    }

    // 🎨 Utilidades
    formatearNumero(numero) {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numero);
    }

    formatearNombreMes(mes) {
        const meses = {
            '2025-01': 'Enero 2025',
            '2025-02': 'Febrero 2025',
            '2025-03': 'Marzo 2025',
            '2025-04': 'Abril 2025',
            '2025-05': 'Mayo 2025',
            '2025-06': 'Junio 2025',
            '2025-07': 'Julio 2025',
            '2025-08': 'Agosto 2025',
            '2025-09': 'Septiembre 2025',
            '2025-10': 'Octubre 2025',
            '2025-11': 'Noviembre 2025',
            '2025-12': 'Diciembre 2025',
            '2026-01': 'Enero 2026',
            '2026-02': 'Febrero 2026',
            '2026-03': 'Marzo 2026',
            '2026-04': 'Abril 2026',
            '2026-05': 'Mayo 2026',
            '2026-06': 'Junio 2026',
            '2026-07': 'Julio 2026',
            '2026-08': 'Agosto 2026',
            '2026-09': 'Septiembre 2026',
            '2026-10': 'Octubre 2026',
            '2026-11': 'Noviembre 2026',
            '2026-12': 'Diciembre 2026'
        };
        return meses[mes] || mes;
    }
}

// 🌟 Inicializar gestor de informes
let reportsManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    reportsManager = new ReportsManager();
});

// Hacer disponible globalmente para los botones del modal
window.reportsManager = reportsManager;
