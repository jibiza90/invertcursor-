/**
 * Script de prueba para verificar el recálculo automático de datos
 * Ejecutar en la consola del navegador después de cargar la app
 */

function testRecalculoCompleto() {
    console.log('========================================');
    console.log('🧪 INICIANDO TESTS DE RECÁLCULO');
    console.log('========================================\n');
    
    const resultados = [];
    
    // Test 1: Verificar que calcularFA busca en todas las filas del día
    function test1_calcularFA() {
        console.log('📋 Test 1: calcularFA busca en todas las filas del día');
        const hoja = datosEditados?.hojas?.[hojaActual];
        if (!hoja) {
            console.error('❌ No hay hoja cargada');
            return false;
        }
        
        // Calcular FA para fila 15 (primer día)
        const fa15 = calcularFA(15, hoja);
        console.log(`   FA(15) = ${fa15}`);
        
        // Verificar suma manual de incrementos de todos los clientes para el día 1
        let sumaManual = 0;
        (hoja.clientes || []).forEach((cliente, idx) => {
            const datosCliente = cliente.datos_diarios || [];
            // Buscar incrementos del día 1 (filas 15-17 típicamente)
            const incDia1 = datosCliente
                .filter(d => d.fila >= 15 && d.fila <= 17)
                .reduce((max, d) => {
                    const inc = typeof d.incremento === 'number' ? d.incremento : 0;
                    return Math.max(max, inc);
                }, 0);
            const decDia1 = datosCliente
                .filter(d => d.fila >= 15 && d.fila <= 17)
                .reduce((max, d) => {
                    const dec = typeof d.decremento === 'number' ? d.decremento : 0;
                    return Math.max(max, dec);
                }, 0);
            sumaManual += (incDia1 - decDia1);
            if (incDia1 > 0 || decDia1 > 0) {
                console.log(`   Cliente ${idx+1}: inc=${incDia1}, dec=${decDia1}`);
            }
        });
        console.log(`   Suma manual = ${sumaManual}`);
        
        const ok = Math.abs(fa15 - sumaManual) < 0.01;
        console.log(ok ? '✅ Test 1 PASSED' : '❌ Test 1 FAILED');
        return ok;
    }
    
    // Test 2: Verificar que recalcularSaldosClienteEnMemoria limpia valores cuando no hay actividad
    function test2_limpiezaSaldos() {
        console.log('\n📋 Test 2: Limpieza de saldos cuando no hay actividad');
        const hoja = datosEditados?.hojas?.[hojaActual];
        if (!hoja || !hoja.clientes || hoja.clientes.length === 0) {
            console.error('❌ No hay clientes cargados');
            return false;
        }
        
        // Buscar un cliente sin actividad reciente
        let clienteSinActividad = null;
        let clienteIdx = -1;
        for (let i = 0; i < hoja.clientes.length; i++) {
            const c = hoja.clientes[i];
            const tieneActividad = (c.datos_diarios || []).some(d => {
                const inc = typeof d.incremento === 'number' ? d.incremento : 0;
                const dec = typeof d.decremento === 'number' ? d.decremento : 0;
                return inc > 0 || dec > 0;
            });
            if (!tieneActividad) {
                clienteSinActividad = c;
                clienteIdx = i;
                break;
            }
        }
        
        if (!clienteSinActividad) {
            console.log('   ⚠️ Todos los clientes tienen actividad, test no aplicable');
            return true;
        }
        
        console.log(`   Cliente ${clienteIdx + 1} sin actividad detectado`);
        
        // Verificar que no tiene saldos calculados
        const tieneSaldosFantasma = (clienteSinActividad.datos_diarios || []).some(d => {
            return typeof d.saldo_diario === 'number' && d.saldo_diario !== 0;
        });
        
        if (tieneSaldosFantasma) {
            console.log('   ⚠️ Cliente sin actividad tiene saldos fantasma, recalculando...');
            recalcularSaldosClienteEnMemoria(hoja, clienteIdx);
            
            // Verificar de nuevo
            const ahoraTieneSaldos = (clienteSinActividad.datos_diarios || []).some(d => {
                return typeof d.saldo_diario === 'number' && d.saldo_diario !== 0;
            });
            const ok = !ahoraTieneSaldos;
            console.log(ok ? '✅ Test 2 PASSED (saldos limpiados)' : '❌ Test 2 FAILED (saldos no se limpiaron)');
            return ok;
        }
        
        console.log('✅ Test 2 PASSED (sin saldos fantasma)');
        return true;
    }
    
    // Test 3: Verificar que recalcularImpInicialSync actualiza imp_inicial correctamente
    function test3_impInicial() {
        console.log('\n📋 Test 3: recalcularImpInicialSync actualiza imp_inicial');
        const hoja = datosEditados?.hojas?.[hojaActual];
        if (!hoja) {
            console.error('❌ No hay hoja cargada');
            return false;
        }
        
        const datosGen = hoja.datos_diarios_generales || [];
        const fila15 = datosGen.find(d => d.fila === 15);
        if (!fila15) {
            console.error('❌ No se encontró fila 15');
            return false;
        }
        
        const impInicialAntes = fila15.imp_inicial;
        console.log(`   imp_inicial(15) antes = ${impInicialAntes}`);
        
        // Recalcular
        recalcularImpInicialSync(hoja);
        
        const impInicialDespues = fila15.imp_inicial;
        console.log(`   imp_inicial(15) después = ${impInicialDespues}`);
        
        // Verificar que coincide con FA
        const fa15 = calcularFA(15, hoja);
        console.log(`   FA(15) = ${fa15}`);
        
        const ok = Math.abs(impInicialDespues - fa15) < 0.01;
        console.log(ok ? '✅ Test 3 PASSED' : '❌ Test 3 FAILED');
        return ok;
    }
    
    // Test 4: Verificar consistencia entre clientes
    function test4_consistenciaClientes() {
        console.log('\n📋 Test 4: Consistencia de datos entre clientes');
        const hoja = datosEditados?.hojas?.[hojaActual];
        if (!hoja || !hoja.clientes) {
            console.error('❌ No hay clientes cargados');
            return false;
        }
        
        let errores = 0;
        hoja.clientes.forEach((cliente, idx) => {
            const nombre = cliente.nombre || `Cliente ${idx + 1}`;
            
            // Verificar totales
            let sumaInc = 0;
            let sumaDec = 0;
            const primeraFilaPorFecha = new Map();
            
            (cliente.datos_diarios || [])
                .filter(d => d.fila >= 15 && d.fila <= 1120)
                .forEach(d => {
                    const fechaKey = d.fecha ? String(d.fecha).split(' ')[0] : '';
                    if (fechaKey && !primeraFilaPorFecha.has(fechaKey)) {
                        primeraFilaPorFecha.set(fechaKey, d.fila);
                    }
                });
            
            (cliente.datos_diarios || [])
                .filter(d => d.fila >= 15 && d.fila <= 1120)
                .forEach(d => {
                    const fechaKey = d.fecha ? String(d.fecha).split(' ')[0] : '';
                    if (fechaKey && primeraFilaPorFecha.get(fechaKey) === d.fila) {
                        if (typeof d.incremento === 'number') sumaInc += d.incremento;
                        if (typeof d.decremento === 'number') sumaDec += d.decremento;
                    }
                });
            
            const totalIncRegistrado = cliente.incrementos_total || 0;
            const totalDecRegistrado = cliente.decrementos_total || 0;
            
            if (Math.abs(sumaInc - totalIncRegistrado) > 0.01) {
                console.log(`   ⚠️ ${nombre}: incrementos_total (${totalIncRegistrado}) ≠ suma calculada (${sumaInc})`);
                errores++;
            }
            if (Math.abs(sumaDec - totalDecRegistrado) > 0.01) {
                console.log(`   ⚠️ ${nombre}: decrementos_total (${totalDecRegistrado}) ≠ suma calculada (${sumaDec})`);
                errores++;
            }
        });
        
        const ok = errores === 0;
        console.log(ok ? '✅ Test 4 PASSED' : `❌ Test 4 FAILED (${errores} errores)`);
        return ok;
    }
    
    // Test 5: Verificar que todos los clientes tienen sus saldos recalculados
    function test5_saldosRecalculados() {
        console.log('\n📋 Test 5: Saldos de clientes recalculados correctamente');
        const hoja = datosEditados?.hojas?.[hojaActual];
        if (!hoja || !hoja.clientes) {
            console.error('❌ No hay clientes cargados');
            return false;
        }
        
        let clientesConProblemas = [];
        
        hoja.clientes.forEach((cliente, idx) => {
            // Recalcular
            recalcularSaldosClienteEnMemoria(hoja, idx);
            
            // Verificar que los clientes con actividad tienen saldos
            const tieneActividad = (cliente.datos_diarios || []).some(d => {
                const inc = typeof d.incremento === 'number' ? d.incremento : 0;
                const dec = typeof d.decremento === 'number' ? d.decremento : 0;
                return inc > 0 || dec > 0;
            });
            
            if (tieneActividad) {
                const tieneSaldos = (cliente.datos_diarios || []).some(d => {
                    return typeof d.saldo_diario === 'number';
                });
                
                if (!tieneSaldos) {
                    clientesConProblemas.push(idx + 1);
                }
            }
        });
        
        const ok = clientesConProblemas.length === 0;
        if (!ok) {
            console.log(`   ⚠️ Clientes sin saldos calculados: ${clientesConProblemas.join(', ')}`);
        }
        console.log(ok ? '✅ Test 5 PASSED' : '❌ Test 5 FAILED');
        return ok;
    }
    
    // Ejecutar todos los tests
    resultados.push({ nombre: 'calcularFA', ok: test1_calcularFA() });
    resultados.push({ nombre: 'limpiezaSaldos', ok: test2_limpiezaSaldos() });
    resultados.push({ nombre: 'impInicial', ok: test3_impInicial() });
    resultados.push({ nombre: 'consistenciaClientes', ok: test4_consistenciaClientes() });
    resultados.push({ nombre: 'saldosRecalculados', ok: test5_saldosRecalculados() });
    
    // Resumen
    console.log('\n========================================');
    console.log('📊 RESUMEN DE TESTS');
    console.log('========================================');
    const passed = resultados.filter(r => r.ok).length;
    const failed = resultados.filter(r => !r.ok).length;
    resultados.forEach(r => {
        console.log(`${r.ok ? '✅' : '❌'} ${r.nombre}`);
    });
    console.log(`\nTotal: ${passed} passed, ${failed} failed`);
    
    return failed === 0;
}

// Función para simular cambio de incremento y verificar recálculo
function testCambioIncremento(clienteIdx, nuevoIncremento) {
    console.log(`\n🧪 TEST: Cambiar incremento del cliente ${clienteIdx + 1} a ${nuevoIncremento}`);
    
    const hoja = datosEditados?.hojas?.[hojaActual];
    if (!hoja || !hoja.clientes || !hoja.clientes[clienteIdx]) {
        console.error('❌ Cliente no encontrado');
        return;
    }
    
    const cliente = hoja.clientes[clienteIdx];
    const primerDato = (cliente.datos_diarios || []).find(d => d.fila >= 15 && d.fila <= 1120);
    
    if (!primerDato) {
        console.error('❌ No hay datos diarios');
        return;
    }
    
    console.log(`   Fila: ${primerDato.fila}`);
    console.log(`   Incremento antes: ${primerDato.incremento}`);
    
    // Cambiar incremento
    primerDato.incremento = nuevoIncremento;
    console.log(`   Incremento después: ${primerDato.incremento}`);
    
    // Recalcular saldos del cliente
    console.log('   Recalculando saldos del cliente...');
    recalcularSaldosClienteEnMemoria(hoja, clienteIdx);
    
    // Recalcular imp_inicial
    console.log('   Recalculando imp_inicial...');
    recalcularImpInicialSync(hoja);
    
    // Verificar resultados
    const fila15 = (hoja.datos_diarios_generales || []).find(d => d.fila === 15);
    console.log(`   imp_inicial(15) ahora: ${fila15?.imp_inicial}`);
    
    // Mostrar saldo del cliente
    const ultimoSaldo = (cliente.datos_diarios || [])
        .filter(d => typeof d.saldo_diario === 'number')
        .sort((a, b) => b.fila - a.fila)[0];
    console.log(`   Último saldo del cliente: ${ultimoSaldo?.saldo_diario || 'ninguno'}`);
    
    console.log('✅ Test de cambio completado');
}

// Función para diagnosticar el estado actual de un cliente
function diagnosticarCliente(clienteNum) {
    console.log(`\n🔬 DIAGNÓSTICO CLIENTE ${clienteNum}`);
    console.log('==========================================');
    
    const hoja = datosEditados?.hojas?.[hojaActual];
    if (!hoja) {
        console.error('❌ No hay hoja cargada');
        return;
    }
    
    const clienteIdx = clienteNum - 1;
    const cliente = hoja.clientes?.[clienteIdx];
    
    if (!cliente) {
        console.error(`❌ Cliente ${clienteNum} no encontrado en ${hojaActual}`);
        console.log(`   Total clientes en hoja: ${hoja.clientes?.length || 0}`);
        return;
    }
    
    console.log(`✓ Cliente encontrado en ${hojaActual}, índice ${clienteIdx}`);
    console.log(`   Nombre: ${cliente.nombre || 'N/A'}`);
    console.log(`   incrementos_total: ${cliente.incrementos_total}`);
    console.log(`   decrementos_total: ${cliente.decrementos_total}`);
    
    // Buscar datos diarios con valores
    const datosConInc = (cliente.datos_diarios || [])
        .filter(d => d.fila >= 15 && d.fila <= 1120 && typeof d.incremento === 'number' && d.incremento > 0);
    const datosConDec = (cliente.datos_diarios || [])
        .filter(d => d.fila >= 15 && d.fila <= 1120 && typeof d.decremento === 'number' && d.decremento > 0);
    const datosConSaldo = (cliente.datos_diarios || [])
        .filter(d => d.fila >= 15 && d.fila <= 1120 && typeof d.saldo_diario === 'number');
    
    console.log(`   Filas con incremento > 0: ${datosConInc.length}`);
    datosConInc.slice(0, 5).forEach(d => console.log(`      Fila ${d.fila}: ${d.incremento}`));
    
    console.log(`   Filas con decremento > 0: ${datosConDec.length}`);
    datosConDec.slice(0, 5).forEach(d => console.log(`      Fila ${d.fila}: ${d.decremento}`));
    
    console.log(`   Filas con saldo_diario: ${datosConSaldo.length}`);
    if (datosConSaldo.length > 0) {
        const ultimo = datosConSaldo.sort((a, b) => b.fila - a.fila)[0];
        console.log(`      Último saldo (fila ${ultimo.fila}): ${ultimo.saldo_diario}`);
    }
    
    // Verificar imp_inicial en general
    const datosGen = hoja.datos_diarios_generales || [];
    const fila15 = datosGen.find(d => d.fila === 15);
    if (fila15) {
        console.log(`   imp_inicial(fila 15) en general: ${fila15.imp_inicial}`);
        const faCalculado = calcularFA(15, hoja);
        console.log(`   FA calculado para fila 15: ${faCalculado}`);
        if (Math.abs((fila15.imp_inicial || 0) - faCalculado) > 0.01) {
            console.warn(`   ⚠️ INCONSISTENCIA: imp_inicial ≠ FA`);
        }
    }
    
    console.log('==========================================\n');
    return cliente;
}

// Función para forzar recálculo completo de un cliente
function forzarRecalculoCliente(clienteNum) {
    console.log(`\n🔧 FORZANDO RECÁLCULO CLIENTE ${clienteNum}`);
    
    const hoja = datosEditados?.hojas?.[hojaActual];
    if (!hoja) {
        console.error('❌ No hay hoja cargada');
        return;
    }
    
    const clienteIdx = clienteNum - 1;
    const cliente = hoja.clientes?.[clienteIdx];
    
    if (!cliente) {
        console.error(`❌ Cliente ${clienteNum} no encontrado`);
        return;
    }
    
    // 1. Recalcular saldos del cliente
    console.log('   1. Recalculando saldos del cliente...');
    recalcularSaldosClienteEnMemoria(hoja, clienteIdx);
    
    // 2. Recalcular totales
    console.log('   2. Recalculando totales del cliente...');
    recalcularTotalesCliente(cliente);
    
    // 3. Recalcular imp_inicial
    console.log('   3. Recalculando imp_inicial de vista general...');
    recalcularImpInicialSync(hoja);
    
    // 4. Mostrar diagnóstico
    diagnosticarCliente(clienteNum);
    
    // 5. Refrescar UI si estamos viendo el cliente
    if (clienteActual === clienteIdx) {
        console.log('   4. Refrescando tabla del cliente...');
        mostrarTablaEditableCliente(cliente, hoja, clienteIdx);
    }
    
    console.log('✅ Recálculo forzado completado');
}

// Función para simular edición de incremento y verificar flujo completo
function simularEdicionIncremento(clienteNum, nuevoValor, filaNum = null) {
    console.log(`\n🧪 SIMULANDO EDICIÓN: Cliente ${clienteNum}, incremento = ${nuevoValor}`);
    console.log('==========================================');
    
    const hoja = datosEditados?.hojas?.[hojaActual];
    if (!hoja) {
        console.error('❌ No hay hoja cargada');
        return;
    }
    
    const clienteIdx = clienteNum - 1;
    const cliente = hoja.clientes?.[clienteIdx];
    
    if (!cliente) {
        console.error(`❌ Cliente ${clienteNum} no encontrado`);
        return;
    }
    
    // Encontrar la primera fila editable
    const dato = filaNum 
        ? cliente.datos_diarios?.find(d => d.fila === filaNum)
        : cliente.datos_diarios?.find(d => d.fila >= 15 && d.fila <= 1120);
    
    if (!dato) {
        console.error('❌ No se encontró dato diario');
        return;
    }
    
    console.log(`   Fila seleccionada: ${dato.fila}`);
    console.log(`   Valor anterior: ${dato.incremento}`);
    
    // Cambiar el valor directamente
    dato.incremento = nuevoValor;
    console.log(`   Valor nuevo aplicado: ${dato.incremento}`);
    
    // Ejecutar el mismo flujo que actualizarDatoDiario
    console.log('\n   Ejecutando flujo de recálculo...');
    
    // 1. Recalcular saldos del cliente
    recalcularSaldosClienteEnMemoria(hoja, clienteIdx);
    console.log('   ✓ Saldos del cliente recalculados');
    
    // 2. Recalcular totales
    recalcularTotalesCliente(cliente);
    console.log(`   ✓ Totales recalculados: inc=${cliente.incrementos_total}, dec=${cliente.decrementos_total}`);
    
    // 3. Recalcular imp_inicial
    recalcularImpInicialSync(hoja);
    const fila15 = (hoja.datos_diarios_generales || []).find(d => d.fila === 15);
    console.log(`   ✓ imp_inicial recalculado: ${fila15?.imp_inicial}`);
    
    // 4. Verificar
    console.log('\n   VERIFICACIÓN:');
    const fa = calcularFA(15, hoja);
    console.log(`   FA(15) calculado: ${fa}`);
    console.log(`   imp_inicial(15): ${fila15?.imp_inicial}`);
    
    if (Math.abs(fa - (fila15?.imp_inicial || 0)) < 0.01) {
        console.log('   ✅ CORRECTO: FA = imp_inicial');
    } else {
        console.log('   ❌ ERROR: FA ≠ imp_inicial');
    }
    
    console.log('\n==========================================');
    console.log('✅ Simulación completada. Refresca la vista para ver cambios.');
}

// Exportar funciones para uso en consola
window.testRecalculoCompleto = testRecalculoCompleto;
window.testCambioIncremento = testCambioIncremento;
window.diagnosticarCliente = diagnosticarCliente;
window.forzarRecalculoCliente = forzarRecalculoCliente;
window.simularEdicionIncremento = simularEdicionIncremento;

console.log('🧪 Script de prueba cargado. Funciones disponibles:');
console.log('   - testRecalculoCompleto() : Ejecutar todos los tests');
console.log('   - diagnosticarCliente(num) : Ver estado de un cliente');
console.log('   - forzarRecalculoCliente(num) : Forzar recálculo de un cliente');
console.log('   - simularEdicionIncremento(clienteNum, valor, [fila]) : Simular edición');
