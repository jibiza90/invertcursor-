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

        try {
            // Validar todas las dependencias críticas
            this.validarDependenciasCriticas();

            // Conectar con el sistema principal
            this.conectarConSistemaPrincipal();

            // Configurar eventos
            this.configurarEventos();

            // Inicializar interfaz
            this.inicializarInterfaz();

            console.log('✅ Sistema de informes configurado correctamente');
        } catch (error) {
            console.error('❌ Error crítico en inicialización del sistema de informes:', error);

            // Modo de emergencia: inicializar con valores por defecto
            console.log('🔧 Activando modo de emergencia...');
            this.inicializarModoEmergencia();

            // Mostrar notificación de error
            this.mostrarNotificacion('⚠️ Sistema de informes en modo limitado. Algunos datos pueden no estar disponibles.', 'warning');
        }
    }

    // =============================================================================
    // VALIDAR DEPENDENCIAS CRÍTICAS
    // =============================================================================
    validarDependenciasCriticas() {
        console.log('🔍 Validando dependencias críticas...');

        const dependencias = [
            { nombre: 'window.datosEditados', valor: window.datosEditados },
            { nombre: 'window.hojaActual', valor: window.hojaActual },
            { nombre: 'window.calcularEstadisticasClienteTiempoReal', valor: window.calcularEstadisticasClienteTiempoReal },
            { nombre: 'window.calcularKPIsTiempoReal', valor: window.calcularKPIsTiempoReal },
            { nombre: 'window.jspdf', valor: window.jspdf },
            { nombre: 'window.html2canvas', valor: window.html2canvas }
        ];

        const faltantes = dependencias.filter(dep => !dep.valor);

        if (faltantes.length > 0) {
            const mensaje = `Dependencias faltantes: ${faltantes.map(d => d.nombre).join(', ')}`;
            console.warn('⚠️', mensaje);
            throw new Error(mensaje);
        }

        console.log('✅ Todas las dependencias críticas validadas');
    }

    // =============================================================================
    // MODO DE EMERGENCIA
    // =============================================================================
    inicializarModoEmergencia() {
        console.log('🚨 Inicializando sistema de informes en modo de emergencia');

        // Valores por defecto seguros
        this.datosEditados = { hojas: {} };
        this.hojaActual = null;
        this.clienteActual = null;

        // Configurar eventos básicos con validaciones
        this.configurarEventosEmergencia();

        // Inicializar interfaz con mensaje de emergencia
        this.inicializarInterfazEmergencia();

        console.log('✅ Modo de emergencia inicializado');
    }

    // =============================================================================
    // CONFIGURAR EVENTOS DE EMERGENCIA
    // =============================================================================
    configurarEventosEmergencia() {
        // Configurar eventos pero con validaciones adicionales
        const btnGenerar = document.getElementById('generateReportBtn');
        if (btnGenerar) {
            btnGenerar.onclick = () => {
                this.mostrarNotificacion('❌ Sistema en modo de emergencia. No se pueden generar informes.', 'error');
            };
        }

        const btnRecargar = document.getElementById('reloadClientsBtn');
        if (btnRecargar) {
            btnRecargar.onclick = () => this.intentarReiniciarSistema();
        }
    }

    // =============================================================================
    // INTENTAR REINICIAR SISTEMA
    // =============================================================================
    intentarReiniciarSistema() {
        console.log('🔄 Intentando reiniciar sistema de informes...');

        try {
            // Revalidar dependencias
            this.validarDependenciasCriticas();

            // Reinicializar completamente
            this.inicializar();

            this.mostrarNotificacion('✅ Sistema de informes reiniciado correctamente', 'success');

        } catch (error) {
            console.error('❌ No se pudo reiniciar el sistema:', error);
            this.mostrarNotificacion('❌ Error al reiniciar. Intenta recargar la página.', 'error');
        }
    }

    // =============================================================================
    // INICIALIZAR INTERFAZ DE EMERGENCIA
    // =============================================================================
    inicializarInterfazEmergencia() {
        console.log('🖥️ Inicializando interfaz de emergencia...');

        // Mostrar mensaje en el selector de clientes
        const selector = document.getElementById('reportClientSelect');
        if (selector) {
            selector.innerHTML = `
                <option value="" disabled selected>
                    -- Sistema principal no cargado --
                </option>
            `;
        }

        // Mostrar mensaje en el contador
        const contador = document.getElementById('clientesCount');
        if (contador) {
            contador.textContent = 'Modo de emergencia';
        }

        // Actualizar estado del botón
        this.actualizarEstado();

        // Agregar mensaje informativo
        const container = document.getElementById('reportClientSelect')?.parentElement;
        if (container && !container.querySelector('.emergencia-info')) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'emergencia-info';
            infoDiv.style.cssText = `
                margin-top: 10px;
                padding: 10px;
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 6px;
                font-size: 0.9em;
                color: #856404;
            `;
            infoDiv.innerHTML = `
                <strong>⚠️ Modo de Emergencia</strong><br>
                El sistema principal no está completamente cargado.<br>
                Haz clic en "Recargar" para intentar conectarte nuevamente.
            `;
            container.appendChild(infoDiv);
        }

        console.log('✅ Interfaz de emergencia inicializada');
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

        const valorSeleccionado = selector.value;
        console.log('🎯 Cliente seleccionado:', {
            valorSeleccionado,
            tipo: typeof valorSeleccionado,
            parsed: valorSeleccionado ? parseInt(valorSeleccionado) : null
        });

        this.clienteActual = valorSeleccionado ? parseInt(valorSeleccionado) : null;

        // Debug detallado de la estructura de datos
        if (this.clienteActual !== null) {
            const hoja = this.datosEditados.hojas[this.hojaActual];
            const cliente = hoja.clientes[this.clienteActual];

            console.log('🔍 DEBUG CLIENTE SELECCIONADO:', {
                clienteActual: this.clienteActual,
                clienteExiste: !!cliente,
                clienteData: cliente,
                numeroCliente: cliente?.numero_cliente,
                nombreCliente: this.obtenerNombreCliente(cliente),
                totalClientes: Object.keys(hoja.clientes).length,
                keysClientes: Object.keys(hoja.clientes),
                clienteSeleccionado: hoja.clientes[this.clienteActual]
            });
        }

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
        console.log('🔍 OBTENIENDO CLIENTE ACTUAL:', {
            hojaActual: this.hojaActual,
            clienteActual: this.clienteActual,
            datosEditadosExiste: !!this.datosEditados,
            hojaExiste: !!(this.datosEditados?.hojas?.[this.hojaActual]),
            clientesEnHoja: Object.keys(this.datosEditados?.hojas?.[this.hojaActual]?.clientes || {}),
            clienteActualEsNull: this.clienteActual === null,
            clienteActualEsUndefined: this.clienteActual === undefined
        });

        const hoja = this.datosEditados.hojas[this.hojaActual];

        if (!hoja) {
            console.error('❌ Hoja no encontrada:', this.hojaActual);
            return null;
        }

        if (!hoja.clientes) {
            console.error('❌ No hay clientes en la hoja:', this.hojaActual);
            return null;
        }

        const cliente = hoja.clientes[this.clienteActual];

        console.log('📋 CLIENTE OBTENIDO:', {
            clienteExiste: !!cliente,
            clienteData: cliente,
            numeroCliente: cliente?.numero_cliente,
            nombreCliente: this.obtenerNombreCliente(cliente),
            clienteActualType: typeof this.clienteActual,
            clienteActualValue: this.clienteActual
        });

        return cliente;
    }

    // =============================================================================
    // 12. EXTRAER DATOS DEL INFORME
    // =============================================================================
    async extraerDatosInforme(cliente) {
        console.log('📊 Extrayendo datos del informe...');

        console.log('🔍 DEBUG DATOS CLIENTE ENTRADA:', {
            clienteRecibido: cliente,
            clienteEsNull: cliente === null,
            clienteEsUndefined: cliente === undefined,
            clienteTieneDatos: !!(cliente?.datos),
            clienteNumero: cliente?.numero_cliente,
            clienteNombre: this.obtenerNombreCliente(cliente),
            datosCliente: cliente?.datos,
            keysDatos: cliente?.datos ? Object.keys(cliente.datos) : []
        });

        // DATOS BÁSICOS DEL CLIENTE
        const datosBasicos = {
            numeroCliente: cliente.numero_cliente,
            nombre: this.obtenerNombreCliente(cliente),
            email: this.obtenerDatoCliente(cliente, 'EMAIL'),
            telefono: this.obtenerDatoCliente(cliente, 'TELEFONO'),
            fecha: new Date().toLocaleDateString('es-ES')
        };

        console.log('📋 DATOS BÁSICOS EXTRAÍDOS:', datosBasicos);

        // ESTADÍSTICAS FINANCIERAS
        const estadisticas = await this.calcularEstadisticasCliente(cliente);

        // MOVIMIENTOS DETALLADOS
        const movimientos = await this.extraerMovimientos(cliente);
        
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
        try {
            // Validar que cliente existe
            if (!cliente) {
                console.warn(`⚠️ Cliente no válido para campo ${campo}`);
                return 'Cliente no válido';
            }

            // Verificar estructura de datos
            if (!cliente.datos || typeof cliente.datos !== 'object') {
                console.warn(`⚠️ Cliente ${cliente.numero_cliente} no tiene datos válidos`);
                return 'Datos no disponibles';
            }

            // Buscar campo específico
            const campoData = cliente.datos[campo];
            if (!campoData) {
                console.log(`ℹ️ Campo ${campo} no encontrado para cliente ${cliente.numero_cliente}`);
                return 'No especificado';
            }

            // Extraer valor
            const valor = campoData.valor;
            if (valor === undefined || valor === null || valor === '') {
                return 'No especificado';
            }

            return String(valor).trim();

        } catch (error) {
            console.error(`❌ Error obteniendo campo ${campo} del cliente:`, error);
            return 'Error al obtener dato';
        }
    }

    // =============================================================================
    // 14. CALCULAR ESTADÍSTICAS DEL CLIENTE
    // =============================================================================
    async calcularEstadisticasCliente(cliente) {
        console.log('📈 Calculando estadísticas del cliente...');

        console.log('🔍 DEBUG ESTADÍSTICAS - CLIENTE RECIBIDO:', {
            clienteRecibido: cliente,
            clienteEsNull: cliente === null,
            clienteEsUndefined: cliente === undefined,
            clienteNumero: cliente?.numero_cliente,
            clienteNombre: this.obtenerNombreCliente(cliente),
            clienteDatos: cliente?.datos,
            hojaActual: this.hojaActual,
            datosEditadosExiste: !!this.datosEditados,
            hojaExiste: !!(this.datosEditados?.hojas?.[this.hojaActual])
        });

        try {
            // Validar cliente
            if (!cliente) {
                throw new Error('Cliente no válido para calcular estadísticas');
            }

            // Verificar funciones globales
            console.log('🔍 DEBUG FUNCIONES GLOBALES:', {
                calcularEstadisticasClienteTiempoReal: !!window.calcularEstadisticasClienteTiempoReal,
                calcularKPIsTiempoReal: !!window.calcularKPIsTiempoReal
            });

            if (!window.calcularEstadisticasClienteTiempoReal || !window.calcularKPIsTiempoReal) {
                throw new Error('Funciones de cálculo no disponibles');
            }

            const hoja = this.datosEditados.hojas[this.hojaActual];
            if (!hoja) {
                throw new Error('Hoja actual no encontrada');
            }

            console.log('🔍 DEBUG HOJA:', {
                hojaKeys: Object.keys(hoja),
                hojaClientes: Object.keys(hoja.clientes || {}),
                clienteEstaEnHoja: !!(hoja.clientes?.[cliente.numero_cliente])
            });

            // Calcular estadísticas mensuales con timeout
            console.log('🔄 Llamando a calcularEstadisticasClienteTiempoReal...');
            const datosMensualesPromise = window.calcularEstadisticasClienteTiempoReal(cliente, hoja);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout calculando estadísticas')), 10000)
            );

            const datosMensuales = await Promise.race([datosMensualesPromise, timeoutPromise]);

            console.log('📊 DATOS MENSUALES RECIBIDOS:', {
                esArray: Array.isArray(datosMensuales),
                longitud: datosMensuales?.length,
                datosMensuales: datosMensuales
            });

            if (!Array.isArray(datosMensuales)) {
                console.warn('⚠️ Datos mensuales no válidos, usando valores por defecto');
                return this.estadisticasPorDefecto();
            }

            // Calcular KPIs totales
            console.log('🔄 Calculando KPIs totales...');
            const kpisTotales = window.calcularKPIsTiempoReal(datosMensuales);

            console.log('💰 KPIs TOTALES:', kpisTotales);

            // Extraer estadísticas principales con validaciones
            const estadisticas = {
                inversionInicial: this.validarNumero(kpisTotales?.inversionInicial, 0),
                saldoActual: this.validarNumero(kpisTotales?.saldoActual, 0),
                beneficioTotal: this.validarNumero(kpisTotales?.beneficioTotal, 0),
                rentabilidadTotal: this.validarNumero(kpisTotales?.rentabilidadTotal, 0),
                totalIncrementos: this.validarNumero(kpisTotales?.totalIncrementos, 0),
                totalDecrementos: this.validarNumero(kpisTotales?.totalDecrementos, 0),
                mesesConDatos: Array.isArray(datosMensuales) ? datosMensuales.length : 0
            };

            console.log('✅ Estadísticas calculadas:', estadisticas);
            return estadisticas;

        } catch (error) {
            console.error('❌ Error calculando estadísticas:', error);
            console.log('🔄 Usando estadísticas por defecto');
            return this.estadisticasPorDefecto();
        }
    }

    // =============================================================================
    // ESTADÍSTICAS POR DEFECTO
    // =============================================================================
    estadisticasPorDefecto() {
        return {
            inversionInicial: 0,
            saldoActual: 0,
            beneficioTotal: 0,
            rentabilidadTotal: 0,
            totalIncrementos: 0,
            totalDecrementos: 0,
            mesesConDatos: 0
        };
    }

    // =============================================================================
    // VALIDAR NÚMERO
    // =============================================================================
    validarNumero(valor, defecto = 0) {
        const num = parseFloat(valor);
        return isNaN(num) ? defecto : num;
    }

    // =============================================================================
    // 15. EXTRAER MOVIMIENTOS
    // =============================================================================
    extraerMovimientos(cliente) {
        console.log('💰 Extrayendo movimientos...');

        try {
            // Validar cliente
            if (!cliente) {
                console.warn('⚠️ Cliente no válido para extraer movimientos');
                return [];
            }

            const movimientos = [];
            const datosDiarios = cliente.datos_diarios || [];

            // Validar que datosDiarios sea un array
            if (!Array.isArray(datosDiarios)) {
                console.warn('⚠️ Cliente no tiene datos_diarios válidos');
                return [];
            }

            console.log(`📊 Procesando ${datosDiarios.length} filas de datos diarios`);

            datosDiarios.forEach((fila, index) => {
                try {
                    // Validar fila
                    if (!fila || typeof fila !== 'object') {
                        console.log(`⚠️ Fila ${index} no válida, saltando`);
                        return;
                    }

                    // Extraer valores numéricos con validación
                    const incremento = this.validarNumero(fila.incremento, 0);
                    const decremento = this.validarNumero(fila.decremento, 0);
                    const fecha = fila.fecha || '';

                    // Movimiento de ingreso
                    if (incremento > 0) {
                        movimientos.push({
                            fecha: fecha,
                            tipo: 'Ingreso',
                            importe: incremento,
                            mes: this.obtenerNombreMes(fecha)
                        });
                    }

                    // Movimiento de retirada
                    if (decremento > 0) {
                        movimientos.push({
                            fecha: fecha,
                            tipo: 'Retirada',
                            importe: decremento,
                            mes: this.obtenerNombreMes(fecha)
                        });
                    }

                } catch (error) {
                    console.warn(`⚠️ Error procesando fila ${index}:`, error);
                }
            });

            // Ordenar por fecha (más recientes primero)
            movimientos.sort((a, b) => {
                const fechaA = new Date(a.fecha || '1970-01-01');
                const fechaB = new Date(b.fecha || '1970-01-01');
                return fechaB - fechaA; // Orden descendente
            });

            console.log(`✅ Extraídos ${movimientos.length} movimientos válidos`);
            return movimientos;

        } catch (error) {
            console.error('❌ Error extrayendo movimientos:', error);
            return [];
        }
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
                    /* ============================================
                       CSS PROFESIONAL PARA PDF - ALTO CONTRASTE
                       ============================================ */

                    @page {
                        size: A4;
                        margin: 20mm;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: 'Helvetica Neue', 'Arial', sans-serif;
                        font-size: 14px;
                        color: #000000 !important;
                        background: #FFFFFF !important;
                        line-height: 1.5;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* ============================================
                       ENCABEZADO PROFESIONAL
                       ============================================ */
                    .encabezado {
                        text-align: center;
                        padding: 40px 30px;
                        border-bottom: 4px solid #1a365d;
                        margin-bottom: 40px;
                        background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%) !important;
                        border-radius: 8px;
                        position: relative;
                        overflow: hidden;
                    }

                    .encabezado::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 4px;
                        background: linear-gradient(90deg, #1a365d 0%, #2d3748 100%);
                    }

                    .encabezado h1 {
                        color: #1a365d !important;
                        font-size: 32px;
                        font-weight: 900;
                        margin-bottom: 12px;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                        position: relative;
                        z-index: 1;
                    }

                    .encabezado h2 {
                        color: #2d3748 !important;
                        font-size: 20px;
                        font-weight: 700;
                        margin-bottom: 8px;
                        position: relative;
                        z-index: 1;
                    }

                    .encabezado p {
                        color: #4a5568 !important;
                        font-size: 16px;
                        font-weight: 500;
                        position: relative;
                        z-index: 1;
                    }

                    /* ============================================
                       SECCIONES PROFESIONALES
                       ============================================ */
                    .seccion {
                        margin-bottom: 35px;
                        padding: 30px;
                        border: 3px solid #2d3748 !important;
                        background: #ffffff !important;
                        border-radius: 12px;
                        page-break-inside: avoid;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        position: relative;
                    }

                    .seccion::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 6px;
                        background: linear-gradient(90deg, #1a365d 0%, #2d3748 50%, #4a5568 100%);
                        border-radius: 10px 10px 0 0;
                    }

                    .titulo-seccion {
                        background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%) !important;
                        color: #ffffff !important;
                        padding: 18px 30px;
                        font-size: 18px;
                        font-weight: 900;
                        margin: -30px -30px 25px -30px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        border-radius: 10px 10px 0 0;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                        position: relative;
                        z-index: 2;
                    }

                    /* ============================================
                       TABLAS PROFESIONALES
                       ============================================ */
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 25px;
                        font-size: 13px;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }

                    th, td {
                        border: 2px solid #4a5568 !important;
                        padding: 14px 16px;
                        text-align: left;
                        vertical-align: middle;
                        font-weight: 500;
                    }

                    th {
                        background: linear-gradient(135deg, #2d3748 0%, #1a365d 100%) !important;
                        color: #ffffff !important;
                        font-weight: 700;
                        font-size: 14px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                        border-bottom: 3px solid #4a5568 !important;
                    }

                    tr:nth-child(even) {
                        background: #f7fafc !important;
                    }

                    tr:nth-child(odd) {
                        background: #ffffff !important;
                    }

                    tr:hover {
                        background: #e2e8f0 !important;
                    }

                    /* ============================================
                       COLORES Y ESTILOS DE DATOS
                       ============================================ */
                    .positivo {
                        color: #059669 !important;
                        font-weight: 700;
                        background: rgba(5, 150, 105, 0.1) !important;
                        padding: 4px 8px;
                        border-radius: 4px;
                        border: 1px solid rgba(5, 150, 105, 0.3) !important;
                    }

                    .negativo {
                        color: #dc2626 !important;
                        font-weight: 700;
                        background: rgba(220, 38, 38, 0.1) !important;
                        padding: 4px 8px;
                        border-radius: 4px;
                        border: 1px solid rgba(220, 38, 38, 0.3) !important;
                    }

                    .neutro {
                        color: #6b7280 !important;
                        font-weight: 500;
                    }

                    .destacado {
                        background: rgba(251, 191, 36, 0.1) !important;
                        border: 2px solid #d97706 !important;
                        font-weight: 700;
                        color: #92400e !important;
                    }

                    /* ============================================
                       GRID DE RESUMEN PROFESIONAL
                       ============================================ */
                    .resumen-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 20px;
                        margin-bottom: 30px;
                    }

                    .resumen-item {
                        padding: 20px;
                        border: 2px solid #cbd5e0;
                        border-radius: 8px;
                        background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }

                    .resumen-item::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 4px;
                        background: linear-gradient(90deg, #1a365d 0%, #2d3748 100%);
                    }

                    .resumen-label {
                        font-size: 12px;
                        font-weight: 700;
                        color: #4a5568 !important;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 8px;
                    }

                    .resumen-valor {
                        font-size: 24px;
                        font-weight: 900;
                        color: #1a365d !important;
                        margin-bottom: 4px;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                    }

                    .resumen-sub {
                        font-size: 11px;
                        color: #718096 !important;
                        font-weight: 500;
                    }

                    /* ============================================
                       PIE DE PÁGINA PROFESIONAL
                       ============================================ */
                    .pie-pagina {
                        margin-top: 50px;
                        padding: 25px;
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                        border-top: 3px solid #1a365d;
                        text-align: center;
                        font-size: 12px;
                        color: #4a5568 !important;
                        border-radius: 8px;
                    }

                    .pie-pagina strong {
                        color: #1a365d !important;
                    }

                    /* ============================================
                       UTILIDADES DE LEGIBILIDAD
                       ============================================ */
                    .numero {
                        font-family: 'Courier New', monospace;
                        font-weight: 600;
                        letter-spacing: 0.5px;
                    }

                    .fecha {
                        font-weight: 500;
                        color: #2d3748 !important;
                    }

                    .moneda {
                        font-weight: 700;
                    }

                    /* ============================================
                       RESPONSIVE PARA PDF
                       ============================================ */
                    @media print {
                        body {
                            font-size: 12px;
                        }

                        .seccion {
                            page-break-inside: avoid;
                            margin-bottom: 25px;
                        }

                        table {
                            font-size: 11px;
                        }

                        th, td {
                            padding: 8px 10px;
                        }
                    }

                </style>
            </head>
            <body>
                <!-- Encabezado Profesional -->
                <div class="encabezado">
                    <h1>INFORME FINANCIERO</h1>
                    <h2>Cliente: ${datosBasicos.nombre}</h2>
                    <p>Número: ${datosBasicos.numeroCliente} | Fecha: ${datosBasicos.fecha}</p>
                </div>

                <!-- Sección de Resumen Ejecutivo -->
                <div class="seccion">
                    <div class="titulo-seccion">📊 Resumen Ejecutivo</div>

                    <div class="resumen-grid">
                        <div class="resumen-item">
                            <div class="resumen-label">Saldo Actual</div>
                            <div class="resumen-valor ${estadisticas.saldoActual >= 0 ? 'positivo' : 'negativo'}">
                                ${this.formatearMoneda(estadisticas.saldoActual)}
                            </div>
                            <div class="resumen-sub">Capital total disponible</div>
                        </div>

                        <div class="resumen-item">
                            <div class="resumen-label">Beneficio Total</div>
                            <div class="resumen-valor ${estadisticas.beneficioTotal >= 0 ? 'positivo' : 'negativo'}">
                                ${this.formatearMoneda(estadisticas.beneficioTotal)}
                            </div>
                            <div class="resumen-sub">Ganancia/Perdida acumulada</div>
                        </div>

                        <div class="resumen-item">
                            <div class="resumen-label">Rentabilidad Total</div>
                            <div class="resumen-valor ${estadisticas.rentabilidadTotal >= 0 ? 'positivo' : 'negativo'}">
                                ${this.formatearPorcentaje(estadisticas.rentabilidadTotal)}
                            </div>
                            <div class="resumen-sub">Retorno de la inversión</div>
                        </div>

                        <div class="resumen-item">
                            <div class="resumen-label">Meses con Datos</div>
                            <div class="resumen-valor neutro">${estadisticas.mesesConDatos}</div>
                            <div class="resumen-sub">Periodo de análisis</div>
                        </div>
                    </div>
                </div>

                <!-- Sección de Información del Cliente -->
                <div class="seccion">
                    <div class="titulo-seccion">👤 Información del Cliente</div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30%;">Campo</th>
                                <th style="width: 70%;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Nombre Completo</strong></td>
                                <td class="numero">${datosBasicos.nombre}</td>
                            </tr>
                            <tr>
                                <td><strong>Número de Cliente</strong></td>
                                <td class="numero">${datosBasicos.numeroCliente}</td>
                            </tr>
                            <tr>
                                <td><strong>Email</strong></td>
                                <td>${datosBasicos.email}</td>
                            </tr>
                            <tr>
                                <td><strong>Teléfono</strong></td>
                                <td>${datosBasicos.telefono}</td>
                            </tr>
                            <tr>
                                <td><strong>Fecha del Informe</strong></td>
                                <td class="fecha">${datosBasicos.fecha}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Sección de Estadísticas Financieras -->
                <div class="seccion">
                    <div class="titulo-seccion">💰 Estadísticas Financieras</div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40%;">Indicador</th>
                                <th style="width: 30%;">Valor</th>
                                <th style="width: 30%;">Descripción</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Inversión Inicial</strong></td>
                                <td class="numero destacado">${this.formatearMoneda(estadisticas.inversionInicial)}</td>
                                <td>Capital inicial invertido</td>
                            </tr>
                            <tr>
                                <td><strong>Saldo Actual</strong></td>
                                <td class="numero ${estadisticas.saldoActual >= 0 ? 'positivo' : 'negativo'}">${this.formatearMoneda(estadisticas.saldoActual)}</td>
                                <td>Capital disponible actualmente</td>
                            </tr>
                            <tr>
                                <td><strong>Beneficio Total</strong></td>
                                <td class="numero ${estadisticas.beneficioTotal >= 0 ? 'positivo' : 'negativo'}">${this.formatearMoneda(estadisticas.beneficioTotal)}</td>
                                <td>Ganancia o pérdida acumulada</td>
                            </tr>
                            <tr>
                                <td><strong>Rentabilidad Total</strong></td>
                                <td class="numero ${estadisticas.rentabilidadTotal >= 0 ? 'positivo' : 'negativo'}">${this.formatearPorcentaje(estadisticas.rentabilidadTotal)}</td>
                                <td>Retorno porcentual de la inversión</td>
                            </tr>
                            <tr>
                                <td><strong>Total Incrementos</strong></td>
                                <td class="numero positivo">${this.formatearMoneda(estadisticas.totalIncrementos)}</td>
                                <td>Suma de todas las entradas</td>
                            </tr>
                            <tr>
                                <td><strong>Total Decrementos</strong></td>
                                <td class="numero negativo">${this.formatearMoneda(estadisticas.totalDecrementos)}</td>
                                <td>Suma de todas las salidas</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Sección de Movimientos Recientes -->
                ${movimientos && movimientos.length > 0 ? `
                <div class="seccion">
                    <div class="titulo-seccion">📈 Movimientos Recientes</div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 20%;">Fecha</th>
                                <th style="width: 25%;">Tipo</th>
                                <th style="width: 25%;">Importe</th>
                                <th style="width: 30%;">Mes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${movimientos.slice(0, 20).map(mov => `
                                <tr>
                                    <td class="fecha">${this.formatearFecha(mov.fecha)}</td>
                                    <td class="${mov.tipo === 'Ingreso' ? 'positivo' : 'negativo'}">${mov.tipo}</td>
                                    <td class="numero moneda ${mov.tipo === 'Ingreso' ? 'positivo' : 'negativo'}">${this.formatearMoneda(mov.importe)}</td>
                                    <td>${mov.mes}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    ${movimientos.length > 20 ? `<p style="font-size: 12px; color: #666; text-align: center; margin-top: 15px;">Mostrando los 20 movimientos más recientes de un total de ${movimientos.length}</p>` : ''}
                </div>
                ` : ''}

                <!-- Sección de Evolución Mensual -->
                ${evolucionMensual && evolucionMensual.length > 0 ? `
                <div class="seccion">
                    <div class="titulo-seccion">📅 Evolución Mensual</div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 20%;">Mes</th>
                                <th style="width: 20%;">Incrementos</th>
                                <th style="width: 20%;">Decrementos</th>
                                <th style="width: 20%;">Beneficio</th>
                                <th style="width: 20%;">Saldo Final</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${evolucionMensual.map(mes => `
                                <tr>
                                    <td class="fecha"><strong>${mes.nombre}</strong></td>
                                    <td class="numero positivo">${this.formatearMoneda(mes.incrementos)}</td>
                                    <td class="numero negativo">${this.formatearMoneda(mes.decrementos)}</td>
                                    <td class="numero ${mes.beneficio >= 0 ? 'positivo' : 'negativo'}">${this.formatearMoneda(mes.beneficio)}</td>
                                    <td class="numero destacado">${this.formatearMoneda(mes.saldoFinal)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                <!-- Pie de página profesional -->
                <div class="pie-pagina">
                    <strong>Informe generado automáticamente por Portfolio Manager</strong><br>
                    Sistema de gestión financiera profesional | Fecha de generación: ${new Date().toLocaleString('es-ES')}
                </div>
            </body>
            </html>`;
        `;
    }

    // =============================================================================
    // 19. CONVERTIR HTML A PDF
    // =============================================================================
    async convertirHTMLaPDF(html) {
        console.log('🔄 Convirtiendo HTML a PDF...');

        return new Promise(async (resolve, reject) => {
            try {
                // Crear contenedor temporal con mejor configuración
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.style.top = '-9999px';
                tempDiv.style.width = '210mm'; // Ancho A4
                tempDiv.style.minHeight = '297mm'; // Alto A4 mínimo
                tempDiv.style.background = '#FFFFFF';
                tempDiv.style.color = '#000000';
                tempDiv.style.fontFamily = 'Helvetica Neue, Arial, sans-serif';
                tempDiv.style.fontSize = '14px';
                tempDiv.style.lineHeight = '1.5';
                tempDiv.style.padding = '0';
                tempDiv.style.margin = '0';
                tempDiv.style.boxSizing = 'border-box';

                // Forzar carga de fuentes antes de renderizar
                await this.esperarFuentes();

                document.body.appendChild(tempDiv);

                // Esperar a que el contenido se renderice completamente
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Verificar que el contenido se ha cargado
                if (!tempDiv.offsetHeight) {
                    throw new Error('El contenido HTML no se ha renderizado correctamente');
                }

                console.log('📏 Dimensiones del contenido:', {
                    width: tempDiv.offsetWidth,
                    height: tempDiv.offsetHeight,
                    scrollHeight: tempDiv.scrollHeight
                });

                // Configurar html2canvas con mejores opciones para PDF
                const canvas = await html2canvas(tempDiv, {
                    scale: 2, // Mejor balance calidad/rendimiento
                    backgroundColor: '#FFFFFF',
                    useCORS: true,
                    allowTaint: false, // Mejor seguridad
                    logging: false,
                    width: tempDiv.offsetWidth,
                    height: tempDiv.offsetHeight,
                    foreignObjectRendering: false, // Mejor compatibilidad
                    removeContainer: false,
                    imageTimeout: 0,
                    onclone: (clonedDoc) => {
                        // Asegurar que los estilos se copien correctamente
                        const clonedElement = clonedDoc.body.querySelector('div');
                        if (clonedElement) {
                            clonedElement.style.width = '210mm';
                            clonedElement.style.minHeight = '297mm';
                            clonedElement.style.background = '#FFFFFF';
                        }
                    }
                });

                console.log('🖼️ Canvas generado:', {
                    width: canvas.width,
                    height: canvas.height
                });

                // Crear PDF con configuración optimizada
                const pdf = new jspdf.jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4',
                    compress: true,
                    putOnlyUsedFonts: true,
                    floatPrecision: 16
                });

                // Usar PNG para mejor calidad que JPEG
                const imgData = canvas.toDataURL('image/png', 1.0);

                // Calcular dimensiones óptimas para el PDF
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width * 0.264583; // Convertir px a mm (1px = 0.264583mm a 96dpi)
                const imgHeight = canvas.height * 0.264583;

                console.log('📐 Dimensiones calculadas:', {
                    pdfWidth, pdfHeight, imgWidth, imgHeight
                });

                // Si el contenido es más alto que una página A4, dividir en múltiples páginas
                const maxHeightPerPage = pdfHeight;
                let remainingHeight = imgHeight;
                let currentY = 0;

                while (remainingHeight > 0) {
                    const pageHeight = Math.min(remainingHeight, maxHeightPerPage);
                    const sourceY = currentY;
                    const sourceHeight = pageHeight;

                    // Crear canvas temporal para esta página
                    const pageCanvas = document.createElement('canvas');
                    const pageCtx = pageCanvas.getContext('2d');
                    pageCanvas.width = canvas.width;
                    pageCanvas.height = Math.round(pageHeight / 0.264583); // Convertir mm a px

                    // Dibujar la sección correspondiente
                    pageCtx.drawImage(
                        canvas,
                        0, sourceY / 0.264583, // Origen en px
                        canvas.width, pageCanvas.height, // Dimensiones en px
                        0, 0, // Destino
                        canvas.width, pageCanvas.height
                    );

                    const pageImgData = pageCanvas.toDataURL('image/png', 1.0);

                    if (currentY > 0) {
                        pdf.addPage();
                    }

                    // Calcular posición centrada
                    const pageImgWidth = pageCanvas.width * 0.264583;
                    const imgX = (pdfWidth - pageImgWidth) / 2;
                    const imgY = 0;

                    pdf.addImage(pageImgData, 'PNG', imgX, imgY, pageImgWidth, pageHeight);

                    remainingHeight -= maxHeightPerPage;
                    currentY += maxHeightPerPage;
                }

                // Limpiar recursos
                document.body.removeChild(tempDiv);

                console.log('✅ PDF generado correctamente con', pdf.getNumberOfPages(), 'páginas');
                resolve(pdf);

            } catch (error) {
                console.error('❌ Error al convertir a PDF:', error);

                // Intentar limpiar en caso de error
                const tempDiv = document.querySelector('div[style*="position: absolute"][style*="left: -9999px"]');
                if (tempDiv && document.body.contains(tempDiv)) {
                    document.body.removeChild(tempDiv);
                }

                reject(error);
            }
        });
    }

    // =============================================================================
    // MÉTODOS DE FORMATEO PARA PDF
    // =============================================================================
    formatearMoneda(valor) {
        if (valor === null || valor === undefined || isNaN(valor)) return '0,00 €';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    }

    formatearPorcentaje(valor) {
        if (valor === null || valor === undefined || isNaN(valor)) return '0,00%';
        return new Intl.NumberFormat('es-ES', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor / 100);
    }

    formatearFecha(fechaStr) {
        if (!fechaStr) return 'Sin fecha';
        try {
            const fecha = new Date(fechaStr);
            if (isNaN(fecha.getTime())) return 'Fecha inválida';
            return fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    formatearNumero(valor, decimales = 2) {
        if (valor === null || valor === undefined || isNaN(valor)) return '0';
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: decimales,
            maximumFractionDigits: decimales
        }).format(valor);
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

    // Función para intentar inicializar el sistema de informes
    function intentarInicializarInformes(intento = 1) {
        console.log(`🔄 Intento ${intento} de inicialización de informes...`);

        // Verificar que el sistema principal esté listo
        if (window.datosEditados && window.hojaActual && window.calcularEstadisticasClienteTiempoReal) {
            console.log('✅ Sistema principal listo, iniciando informes...');

            try {
                window.sistemaInformes = new SistemaInformes();
                console.log('✅ Sistema de informes inicializado correctamente');
                return true;
            } catch (error) {
                console.error('❌ Error al inicializar sistema de informes:', error);
                return false;
            }
        } else {
            console.log(`⏳ Sistema principal no listo (intento ${intento}):`, {
                datosEditados: !!window.datosEditados,
                hojaActual: !!window.hojaActual,
                calcularEstadisticas: !!window.calcularEstadisticasClienteTiempoReal
            });

            // Reintentar con delay progresivo
            if (intento < 10) {
                const delay = 1000 * Math.min(intento, 3); // Máximo 3 segundos entre reintentos
                setTimeout(() => intentarInicializarInformes(intento + 1), delay);
            } else {
                console.error('❌ No se pudo inicializar el sistema de informes después de 10 intentos');

                // Crear sistema de informes manualmente para debug
                console.log('🔧 Creando sistema de informes manualmente para debug...');
                try {
                    window.sistemaInformes = new SistemaInformes();
                    console.log('✅ Sistema de informes creado manualmente (modo debug)');
                } catch (error) {
                    console.error('❌ Error crítico: no se puede crear el sistema de informes:', error);
                }
            }
            return false;
        }
    }

    // Iniciar el primer intento después de 2 segundos
    setTimeout(() => intentarInicializarInformes(1), 2000);
});

// =============================================================================
// 25. EXPORTACIONES GLOBALES
// =============================================================================
window.SistemaInformes = SistemaInformes;
