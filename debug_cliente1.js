// Script de diagnóstico completo para Cliente 1 - Estadísticas
function diagnosticarCliente1() {
    console.log('🚀 === DIAGNÓSTICO COMPLETO CLIENTE 1 ===');
    
    // 1. Verificar variables globales
    console.log('📊 VARIABLES GLOBALES:');
    console.log('  hojaActual:', window.hojaActual);
    console.log('  clienteActual:', window.clienteActual);
    console.log('  datosEditados existe:', !!window.datosEditados);
    
    if (!window.datosEditados) {
        console.error('❌ datosEditados no existe');
        return;
    }
    
    // 2. Verificar hoja actual
    const hoja = window.datosEditados.hojas[window.hojaActual];
    console.log('📋 HOJA ACTUAL:');
    console.log('  hoja existe:', !!hoja);
    console.log('  clientes.length:', hoja?.clientes?.length || 0);
    
    if (!hoja || !hoja.clientes) {
        console.error('❌ No hay hoja o clientes');
        return;
    }
    
    // 3. Analizar Cliente 1 (índice 0)
    const cliente1 = hoja.clientes[0];
    console.log('👤 CLIENTE 1 (índice 0):');
    console.log('  cliente existe:', !!cliente1);
    console.log('  numero_cliente:', cliente1?.numero_cliente);
    console.log('  nombre:', cliente1?.datos?.NOMBRE?.valor);
    console.log('  apellidos:', cliente1?.datos?.APELLIDOS?.valor);
    
    if (!cliente1) {
        console.error('❌ Cliente 1 no existe');
        return;
    }
    
    // 4. Analizar datos diarios del cliente
    const datosDiarios = cliente1.datos_diarios || [];
    console.log('📅 DATOS DIARIOS:');
    console.log('  total filas:', datosDiarios.length);
    console.log('  filas con fecha:', datosDiarios.filter(d => d.fecha && d.fecha !== 'FECHA').length);
    console.log('  filas con incrementos:', datosDiarios.filter(d => typeof d.incremento === 'number' && d.incremento > 0).length);
    console.log('  filas con decrementos:', datosDiarios.filter(d => typeof d.decremento === 'number' && d.decremento > 0).length);
    console.log('  filas con saldos:', datosDiarios.filter(d => typeof d.saldo_diario === 'number' || typeof d.imp_final === 'number').length);
    
    // 5. Análisis detallado de fechas
    console.log('📆 ANÁLISIS DE FECHAS:');
    const fechasPorMesReal = {};
    const fechasInvalidas = [];
    
    datosDiarios.forEach((fila, index) => {
        if (fila.fecha && fila.fecha !== 'FECHA') {
            const fechaStr = String(fila.fecha).trim();
            const filaNum = fila.fila || index;
            
            // Intentar parsear con múltiples formatos
            let mes = null;
            let formatoDetectado = 'desconocido';
            
            const fechaLimpia = fechaStr.replace(/\s+/g, '');
            
            if (fechaLimpia.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const partes = fechaLimpia.split('-');
                mes = `${partes[0]}-${partes[1]}`;
                formatoDetectado = 'ISO';
            } else if (fechaLimpia.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const partes = fechaLimpia.split('/');
                mes = `2026-${partes[1]}`;
                formatoDetectado = 'EU/';
            } else if (fechaLimpia.match(/^\d{2}-\d{2}-\d{4}$/)) {
                const partes = fechaLimpia.split('-');
                mes = `2026-${partes[1]}`;
                formatoDetectado = 'EU-';
            } else {
                fechasInvalidas.push({ fila: filaNum, fecha: fechaStr, formato: 'inválido' });
            }
            
            if (mes) {
                if (!fechasPorMesReal[mes]) {
                    fechasPorMesReal[mes] = [];
                }
                fechasPorMesReal[mes].push({
                    fila: filaNum,
                    fecha: fechaStr,
                    formato: formatoDetectado,
                    incremento: fila.incremento,
                    decremento: fila.decremento,
                    saldo: fila.saldo_diario || fila.imp_final
                });
            }
        }
    });
    
    console.log('  Fechas válidas por mes:');
    Object.keys(fechasPorMesReal).forEach(mes => {
        const datos = fechasPorMesReal[mes];
        const totalInc = datos.reduce((sum, d) => sum + (d.incremento || 0), 0);
        const totalDec = datos.reduce((sum, d) => sum + (d.decremento || 0), 0);
        console.log(`    ${mes}: ${datos.length} fechas, +${totalInc}, -${totalDec}`);
    });
    
    console.log('  Fechas inválidas:', fechasInvalidas.length);
    if (fechasInvalidas.length > 0) {
        console.log('    Ejemplos:', fechasInvalidas.slice(0, 5));
    }
    
    // 6. Simular el proceso de cálculo de rentabilidad
    console.log('🧮 SIMULACIÓN CÁLCULO RENTABILIDAD:');
    
    // Obtener datos generales para beneficios
    const datosGenerales = hoja.datos_diarios_generales || [];
    const benefPctPorFila = {};
    datosGenerales.forEach(d => {
        if (typeof d.benef_porcentaje === 'number' && isFinite(d.benef_porcentaje)) {
            benefPctPorFila[d.fila] = d.benef_porcentaje;
        }
    });
    
    console.log('  Beneficios por fila disponibles:', Object.keys(benefPctPorFila).length);
    
    // Agrupar por mes como lo hace la función original
    const datosPorMes = {};
    let totalProcesadas = 0;
    let totalConMovimientos = 0;
    
    datosDiarios.forEach(filaCliente => {
        const benefPct = benefPctPorFila[filaCliente.fila] || 0;
        totalProcesadas++;
        
        // Extraer mes (misma lógica que la función original)
        let mes = '';
        if (filaCliente.fecha && filaCliente.fecha !== 'FECHA') {
            const fechaStr = String(filaCliente.fecha).trim();
            const fechaLimpia = fechaStr.replace(/\s+/g, '');
            
            if (fechaLimpia.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const partes = fechaLimpia.split('-');
                mes = `${partes[0]}-${partes[1]}`;
            } else if (fechaLimpia.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const partes = fechaLimpia.split('/');
                mes = `2026-${partes[1]}`;
            } else if (fechaLimpia.match(/^\d{2}-\d{2}-\d{4}$/)) {
                const partes = fechaLimpia.split('-');
                mes = `2026-${partes[1]}`;
            }
        }
        
        // Si no hay fecha válida, estimar por fila
        if (!mes) {
            const diaEstimado = filaCliente.fila - 14;
            const mesEstimado = Math.min(12, Math.max(1, Math.ceil(diaEstimado / 30)));
            mes = `2026-${String(mesEstimado).padStart(2, '0')}`;
        }
        
        if (!datosPorMes[mes]) {
            datosPorMes[mes] = {
                mes: mes,
                incrementos: 0,
                decrementos: 0,
                beneficio: 0,
                saldoFinal: 0,
                filas: []
            };
        }
        
        const datosMes = datosPorMes[mes];
        const inc = typeof filaCliente.incremento === 'number' ? filaCliente.incremento : 0;
        const dec = typeof filaCliente.decremento === 'number' ? filaCliente.decremento : 0;
        
        if (inc > 0 || dec > 0) {
            totalConMovimientos++;
        }
        
        datosMes.incrementos += inc;
        datosMes.decrementos += dec;
        datosMes.beneficio += (inc + dec) * benefPct;
        datosMes.filas.push(filaCliente);
        
        if (typeof filaCliente.saldo_diario === 'number') {
            datosMes.saldoFinal = filaCliente.saldo_diario;
        } else if (typeof filaCliente.imp_final === 'number') {
            datosMes.saldoFinal = filaCliente.imp_final;
        }
    });
    
    console.log('  Resultados agrupados por mes:');
    Object.keys(datosPorMes).forEach(mes => {
        const datos = datosPorMes[mes];
        console.log(`    ${mes}: inc=${datos.incrementos}, dec=${datos.decrementos}, benef=${datos.beneficio.toFixed(2)}, saldo=${datos.saldoFinal}, filas=${datos.filas.length}`);
    });
    
    // 7. Generar resultados finales como la función original
    console.log('📈 RESULTADOS FINALES:');
    const resultados = [];
    let saldoAnterior = 0;
    const mesesOrdenados = Object.keys(datosPorMes).sort();
    
    let ultimoMes = '';
    if (mesesOrdenados.length > 0) {
        ultimoMes = mesesOrdenados[mesesOrdenados.length - 1];
    }
    
    console.log(`  Último mes con datos: ${ultimoMes}`);
    console.log(`  Meses ordenados: ${mesesOrdenados.join(', ')}`);
    
    if (ultimoMes) {
        const [year, month] = ultimoMes.split('-').map(Number);
        let mesActual = 1;
        let mesActualStr = `${year}-${String(mesActual).padStart(2, '0')}`;
        
        while (mesActualStr <= ultimoMes) {
            const datosMes = datosPorMes[mesActualStr];
            
            const tieneDatos = datosMes && (
                datosMes.incrementos > 0 || 
                datosMes.decrementos > 0 || 
                datosMes.filas.length > 0 || 
                datosMes.saldoFinal > 0
            );
            
            console.log(`    ${mesActualStr}: ${tieneDatos ? '✅ TIENE DATOS' : '❌ SIN DATOS'}`);
            
            if (tieneDatos) {
                datosMes.saldoInicial = saldoAnterior;
                saldoAnterior = datosMes.saldoFinal;
                
                const resultado = {
                    mes: mesActualStr,
                    nombreMes: formatearNombreMes(mesActualStr),
                    capitalInvertido: datosMes.incrementos,
                    capitalRetirado: datosMes.decrementos,
                    beneficio: datosMes.beneficio,
                    rentabilidad: datosMes.incrementos > 0 ? (datosMes.beneficio / datosMes.incrementos) * 100 : 0,
                    saldoInicial: datosMes.saldoInicial,
                    saldoFinal: datosMes.saldoFinal,
                    detalles: datosMes.filas,
                    diasOperados: datosMes.filas.length
                };
                resultados.push(resultado);
                
                console.log(`      → Añadido: rent=${resultado.rentabilidad.toFixed(2)}%, dias=${resultado.diasOperados}`);
            }
            
            mesActual++;
            if (mesActual > 12) break;
            mesActualStr = `${year}-${String(mesActual).padStart(2, '0')}`;
        }
    }
    
    console.log(`📊 RESULTADO FINAL: ${resultados.length} meses con datos`);
    resultados.forEach((r, i) => {
        console.log(`  ${i+1}. ${r.nombreMes}: ${r.rentabilidad.toFixed(2)}% (${r.diasOperados} días)`);
    });
    
    // 8. Comparar con estadísticas generales
    console.log('🔍 COMPARACIÓN CON ESTADÍSTICAS GENERALES:');
    console.log('  Meses disponibles en hoja:', Object.keys(window.mesesDisponibles[window.hojaActual] || {}));
    
    // 9. Verificar función esHojaAnual
    console.log('🏗️ VERIFICACIÓN ESTRUCTURA:');
    console.log('  esHojaAnual(hojaActual):', window.esHojaAnual(window.hojaActual));
    console.log('  Tipo de hoja detectado:', window.esHojaAnual(window.hojaActual) ? 'ANUAL' : 'MENSUAL');
    
    // 10. Recomendaciones
    console.log('💡 RECOMENDACIONES:');
    if (resultados.length === 1) {
        console.log('  ⚠️  Solo se encontró 1 mes. Posibles causas:');
        console.log('    - Las fechas no están en formato reconocido');
        console.log('    - Solo hay datos de enero');
        console.log('    - Hay un error en el agrupamiento por mes');
        console.log('    - Los beneficios porcentual no están disponibles');
    } else if (resultados.length === 0) {
        console.log('  ❌ No se encontraron meses con datos');
    } else {
        console.log(`  ✅ Se encontraron ${resultados.length} meses correctamente`);
    }
    
    console.log('🏁 === FIN DEL DIAGNÓSTICO ===');
    
    return {
        cliente1: cliente1,
        datosDiarios: datosDiarios,
        fechasPorMes: fechasPorMesReal,
        resultados: resultados,
        totalProcesadas: totalProcesadas,
        totalConMovimientos: totalConMovimientos
    };
}

// Función helper para formatear nombre de mes
function formatearNombreMes(mesStr) {
    const [year, month] = mesStr.split('-');
    const nombresMes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesNum = parseInt(month);
    return `${nombresMes[mesNum - 1]} ${year}`;
}

// Auto-ejecutar si estamos en el navegador
if (typeof window !== 'undefined') {
    // Esperar a que cargue todo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(diagnosticarCliente1, 2000);
        });
    } else {
        setTimeout(diagnosticarCliente1, 1000);
    }
}

// Función para ejecutar diagnóstico manualmente
function ejecutarDiagnosticoManual() {
    console.log('🔧 EJECUTANDO DIAGNÓSTICO MANUAL...');
    const resultado = diagnosticarCliente1();
    
    // Mostrar resumen en una alerta
    const resumen = `
DIAGNÓSTICO CLIENTE 1:
• Total filas: ${resultado.totalProcesadas}
• Con movimientos: ${resultado.totalConMovimientos}
• Meses con datos: ${resultado.resultados.length}
• Fechas válidas: ${Object.keys(resultado.fechasPorMes).length}

${resultado.resultados.length === 1 ? 
    '⚠️ SOLO HAY UN MES - Revisa la consola para detalles' : 
    `✅ ${resultado.resultados.length} meses encontrados`}
    `;
    
    alert(resumen);
    
    return resultado;
}

// Crear botón de diagnóstico si no existe
function crearBotonDiagnostico() {
    if (document.getElementById('btnDiagnosticoCliente1')) return;
    
    const btn = document.createElement('button');
    btn.id = 'btnDiagnosticoCliente1';
    btn.innerHTML = '🔍 Diagnosticar Cliente 1';
    btn.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: #e53e3e;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        z-index: 10000;
        font-family: 'Inter', sans-serif;
    `;
    
    btn.onclick = ejecutarDiagnosticoManual;
    document.body.appendChild(btn);
}

// Crear botón al cargar
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', crearBotonDiagnostico);
    } else {
        crearBotonDiagnostico();
    }
}

// Exportar para uso manual
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { diagnosticarCliente1, ejecutarDiagnosticoManual };
} else {
    window.diagnosticarCliente1 = diagnosticarCliente1;
    window.ejecutarDiagnosticoManual = ejecutarDiagnosticoManual;
}
