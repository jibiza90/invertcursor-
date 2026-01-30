// =============================================================================
// SCRIPT DE DEPURACIÓN COMPLETO - SISTEMA DE INFORMES PDF
// =============================================================================
// OBJETIVO: Verificar paso a paso qué falla en la generación de PDF
// =============================================================================

console.log('🚀 INICIANDO DEBUG COMPLETO DEL SISTEMA DE INFORMES PDF');

// =============================================================================
// 1. VERIFICAR VARIABLES GLOBALES DEL SISTEMA
// =============================================================================
function verificarVariablesGlobales() {
    console.log('\n📋 === VERIFICANDO VARIABLES GLOBALES ===');
    
    const checks = [
        { name: 'window.datosEditados', value: window.datosEditados },
        { name: 'window.hojaActual', value: window.hojaActual },
        { name: 'window.clienteActual', value: window.clienteActual },
        { name: 'window.sistemaInformes', value: window.sistemaInformes },
        { name: 'window.Chart', value: window.Chart },
        { name: 'window.jspdf', value: window.jspdf },
        { name: 'window.html2canvas', value: window.html2canvas }
    ];
    
    checks.forEach(check => {
        if (check.value) {
            console.log(`✅ ${check.name}:`, typeof check.value, check.value);
        } else {
            console.error(`❌ ${check.name}: UNDEFINED o NULL`);
        }
    });
    
    return checks.every(check => check.value);
}

// =============================================================================
// 2. VERIFICAR ESTRUCTURA DE DATOS
// =============================================================================
function verificarEstructuraDatos() {
    console.log('\n📊 === VERIFICANDO ESTRUCTURA DE DATOS ===');
    
    if (!window.datosEditados) {
        console.error('❌ datosEditados no existe');
        return false;
    }
    
    console.log('📁 Estructura de datosEditados:', Object.keys(window.datosEditados));
    
    if (!window.datosEditados.hojas) {
        console.error('❌ datosEditados.hojas no existe');
        return false;
    }
    
    console.log('📋 Hojas disponibles:', Object.keys(window.datosEditados.hojas));
    
    if (!window.hojaActual) {
        console.error('❌ hojaActual no definida');
        return false;
    }
    
    const hojaActual = window.datosEditados.hojas[window.hojaActual];
    if (!hojaActual) {
        console.error(`❌ No existe la hoja ${window.hojaActual}`);
        return false;
    }
    
    console.log('📄 Hoja actual:', window.hojaActual);
    console.log('📋 Estructura de la hoja:', Object.keys(hojaActual));
    
    if (!hojaActual.clientes) {
        console.error('❌ hojaActual.clientes no existe');
        return false;
    }
    
    const clientes = hojaActual.clientes;
    console.log('👥 Total clientes:', Object.keys(clientes).length);
    
    if (Object.keys(clientes).length === 0) {
        console.error('❌ No hay clientes en la hoja actual');
        return false;
    }
    
    // Mostrar información del primer cliente
    const primerCliente = Object.values(clientes)[0];
    console.log('🎯 Ejemplo - Primer cliente:', {
        numero: primerCliente.numero_cliente,
        tieneDatos: !!primerCliente.datos,
        tieneDatosDiarios: !!primerCliente.datos_diarios,
        cantidadDatosDiarios: primerCliente.datos_diarios?.length || 0
    });
    
    return true;
}

// =============================================================================
// 3. VERIFICAR FUNCIONES DEL SISTEMA PRINCIPAL
// =============================================================================
function verificarFuncionesSistema() {
    console.log('\n⚙️ === VERIFICANDO FUNCIONES DEL SISTEMA ===');
    
    const funciones = [
        'window.calcularEstadisticasClienteTiempoReal',
        'window.calcularKPIsTiempoReal',
        'window.mostrarEstadisticasCliente'
    ];
    
    funciones.forEach(funcName => {
        const func = window[funcName.replace('window.', '')];
        if (typeof func === 'function') {
            console.log(`✅ ${funcName}: Función disponible`);
        } else {
            console.error(`❌ ${funcName}: No existe o no es función`);
        }
    });
    
    return funciones.every(funcName => typeof window[funcName.replace('window.', '')] === 'function');
}

// =============================================================================
// 4. VERIFICAR SISTEMA DE INFORMES
// =============================================================================
function verificarSistemaInformes() {
    console.log('\n📄 === VERIFICANDO SISTEMA DE INFORMES ===');
    
    if (!window.sistemaInformes) {
        console.error('❌ sistemaInformes no está inicializado');
        return false;
    }
    
    console.log('✅ sistemaInformes:', typeof window.sistemaInformes);
    console.log('📋 Métodos disponibles:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.sistemaInformes)));
    
    // Verificar estado interno
    const sistema = window.sistemaInformes;
    console.log('🔍 Estado interno:', {
        tieneDatosEditados: !!sistema.datosEditados,
        tieneHojaActual: !!sistema.hojaActual,
        tieneClienteActual: sistema.clienteActual !== null && sistema.clienteActual !== undefined,
        clienteActualValor: sistema.clienteActual
    });
    
    return true;
}

// =============================================================================
// 5. VERIFICAR INTERFAZ DE INFORMES
// =============================================================================
function verificarInterfazInformes() {
    console.log('\n🖥️ === VERIFICANDO INTERFAZ DE INFORMES ===');
    
    const elementos = [
        { id: 'generateReportBtn', nombre: 'Botón Generar' },
        { id: 'reloadClientsBtn', nombre: 'Botón Recargar' },
        { id: 'reportClientSelect', nombre: 'Selector Cliente' },
        { id: 'clientesCount', nombre: 'Contador Clientes' },
        { id: 'reportLoading', nombre: 'Loading' }
    ];
    
    elementos.forEach(elem => {
        const elemento = document.getElementById(elem.id);
        if (elemento) {
            console.log(`✅ ${elem.nombre}: Disponible`);
            if (elem.id === 'reportClientSelect') {
                console.log(`📋 Opciones: ${elemento.options.length}`);
                console.log(`📋 Valor actual: ${elemento.value}`);
            }
        } else {
            console.error(`❌ ${elem.nombre}: No encontrado`);
        }
    });
    
    return elementos.every(elem => document.getElementById(elem.id));
}

// =============================================================================
// 6. PROBAR GENERACIÓN DE INFORME PASO A PASO
// =============================================================================
async function probarGeneracionInforme() {
    console.log('\n🧪 === PROBANDO GENERACIÓN DE INFORME PASO A PASO ===');
    
    if (!window.sistemaInformes) {
        console.error('❌ Sistema de informes no disponible');
        return false;
    }
    
    try {
        // PASO 1: Verificar cliente seleccionado
        const sistema = window.sistemaInformes;
        if (sistema.clienteActual === null || sistema.clienteActual === undefined) {
            console.error('❌ No hay cliente seleccionado');
            return false;
        }
        
        console.log('✅ Cliente seleccionado:', sistema.clienteActual);
        
        // PASO 2: Obtener cliente
        const cliente = sistema.obtenerClienteActual();
        if (!cliente) {
            console.error('❌ No se pudo obtener el cliente actual');
            return false;
        }
        
        console.log('✅ Cliente obtenido:', {
            numero: cliente.numero_cliente,
            nombre: sistema.obtenerNombreCliente(cliente),
            tieneDatos: !!cliente.datos,
            tieneDatosDiarios: !!cliente.datos_diarios
        });
        
        // PASO 3: Extraer datos del informe
        console.log('📊 Extrayendo datos del informe...');
        const datosInforme = await sistema.extraerDatosInforme(cliente);
        
        console.log('✅ Datos extraídos:', {
            nombreCliente: datosInforme.datosBasicos.nombre,
            email: datosInforme.datosBasicos.email,
            saldoActual: datosInforme.estadisticas.saldoActual,
            mesesEvolucion: datosInforme.evolucionMensual.length,
            totalMovimientos: datosInforme.movimientos.length
        });
        
        // PASO 4: Generar HTML
        console.log('📝 Generando HTML...');
        const htmlInforme = sistema.generarHTMLInforme(datosInforme);
        
        if (!htmlInforme || htmlInforme.length === 0) {
            console.error('❌ HTML generado vacío');
            return false;
        }
        
        console.log('✅ HTML generado:', htmlInforme.length, 'caracteres');
        
        // PASO 5: Verificar que el HTML contiene datos
        const contieneNombre = htmlInforme.includes(datosInforme.datosBasicos.nombre);
        const contieneSaldo = htmlInforme.includes(datosInforme.estadisticas.saldoActual.toString());
        const contieneMovimientos = htmlInforme.includes('Movimientos Detallados');
        
        console.log('🔍 Verificación de contenido HTML:', {
            contieneNombre,
            contieneSaldo,
            contieneMovimientos
        });
        
        if (!contieneNombre || !contieneSaldo) {
            console.error('❌ El HTML no contiene los datos esperados');
            return false;
        }
        
        console.log('✅ HTML verificado correctamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error en prueba de generación:', error);
        return false;
    }
}

// =============================================================================
// 7. PROBAR CONVERSIÓN A PDF
// =============================================================================
async function probarConversionPDF() {
    console.log('\n📄 === PROBANDO CONVERSIÓN A PDF ===');
    
    if (!window.sistemaInformes) {
        console.error('❌ Sistema de informes no disponible');
        return false;
    }
    
    try {
        const sistema = window.sistemaInformes;
        const cliente = sistema.obtenerClienteActual();
        
        if (!cliente) {
            console.error('❌ No hay cliente para probar PDF');
            return false;
        }
        
        // Extraer datos y generar HTML
        const datosInforme = await sistema.extraerDatosInforme(cliente);
        const htmlInforme = sistema.generarHTMLInforme(datosInforme);
        
        console.log('🔄 Iniciando conversión a PDF...');
        
        // Crear contenedor de prueba
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlInforme;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '210mm';
        tempDiv.style.background = '#FFFFFF';
        document.body.appendChild(tempDiv);
        
        // Esperar un momento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar que el contenido se renderizó
        const elementosRenderizados = tempDiv.querySelectorAll('*').length;
        console.log('📊 Elementos renderizados:', elementosRenderizados);
        
        // Verificar texto del cliente
        const textoCliente = tempDiv.textContent || '';
        const contieneDatosCliente = textoCliente.includes(datosInforme.datosBasicos.nombre);
        console.log('🔍 Contiene datos del cliente:', contieneDatosCliente);
        
        if (!contieneDatosCliente) {
            console.error('❌ El HTML renderizado no contiene datos del cliente');
            document.body.removeChild(tempDiv);
            return false;
        }
        
        // Limpiar
        document.body.removeChild(tempDiv);
        console.log('✅ Conversión a PDF probada exitosamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error en prueba de conversión PDF:', error);
        return false;
    }
}

// =============================================================================
// 8. FUNCIÓN PRINCIPAL DE DEBUG
// =============================================================================
async function debugCompletoSistemaInformes() {
    console.log('\n🚀 === INICIANDO DEBUG COMPLETO DEL SISTEMA DE INFORMES ===');
    
    const resultados = {
        variablesGlobales: false,
        estructuraDatos: false,
        funcionesSistema: false,
        sistemaInformes: false,
        interfazInformes: false,
        generacionInforme: false,
        conversionPDF: false
    };
    
    try {
        // Ejecutar todas las verificaciones
        resultados.variablesGlobales = verificarVariablesGlobales();
        resultados.estructuraDatos = verificarEstructuraDatos();
        resultados.funcionesSistema = verificarFuncionesSistema();
        resultados.sistemaInformes = verificarSistemaInformes();
        resultados.interfazInformes = verificarInterfazInformes();
        
        if (resultados.sistemaInformes && resultados.interfazInformes) {
            resultados.generacionInforme = await probarGeneracionInforme();
            resultados.conversionPDF = await probarConversionPDF();
        }
        
        // Resumen final
        console.log('\n📋 === RESUMEN FINAL DE DEBUG ===');
        Object.entries(resultados).forEach(([test, resultado]) => {
            const icono = resultado ? '✅' : '❌';
            const nombre = test.replace(/([A-Z])/g, ' $1').trim();
            console.log(`${icono} ${nombre}: ${resultado ? 'OK' : 'FALLA'}`);
        });
        
        const todoOK = Object.values(resultados).every(r => r);
        console.log(`\n🎯 RESULTADO FINAL: ${todoOK ? '✅ TODO FUNCIONA CORRECTAMENTE' : '❌ HAY PROBLEMAS QUE SOLUCIONAR'}`);
        
        if (!todoOK) {
            console.log('\n🔧 ACCIONES RECOMENDADAS:');
            if (!resultados.variablesGlobales) console.log('- Verificar que el sistema principal esté cargado');
            if (!resultados.estructuraDatos) console.log('- Cargar datos del sistema');
            if (!resultados.sistemaInformes) console.log('- Reinicializar el sistema de informes');
            if (!resultados.interfazInformes) console.log('- Verificar elementos HTML de informes');
            if (!resultados.generacionInforme) console.log('- Revisar extracción de datos');
            if (!resultados.conversionPDF) console.log('- Verificar librerías PDF');
        }
        
        return resultados;
        
    } catch (error) {
        console.error('❌ Error crítico en debug:', error);
        return resultados;
    }
}

// =============================================================================
// 9. HACER DISPONIBLE GLOBALMENTE
// =============================================================================
window.debugCompletoSistemaInformes = debugCompletoSistemaInformes;
window.verificarVariablesGlobales = verificarVariablesGlobales;
window.verificarEstructuraDatos = verificarEstructuraDatos;
window.probarGeneracionInforme = probarGeneracionInforme;

// =============================================================================
// 10. EJECUTAR AUTOMÁTICAMENTE
// =============================================================================
console.log('🔧 Script de debug cargado. Ejecuta: debugCompletoSistemaInformes()');

// Ejecutar después de 2 segundos para dar tiempo a que todo cargue
setTimeout(() => {
    console.log('\n⏰ Ejecutando debug automático...');
    debugCompletoSistemaInformes();
}, 2000);
