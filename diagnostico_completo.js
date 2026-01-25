// SCRIPT DE DIAGNÓSTICO COMPLETO - Revisar TODA la lógica de TODAS las celdas
// Este script se ejecuta en la consola del navegador

(function diagnosticoCompleto() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔍 DIAGNÓSTICO COMPLETO DE LA APLICACIÓN');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    const errores = [];
    const advertencias = [];
    
    // Verificar que los datos están cargados
    if (!datosEditados || !datosEditados.hojas) {
        errores.push('❌ datosEditados no está definido o no tiene hojas');
        return mostrarResultados();
    }
    
    const hojas = Object.keys(datosEditados.hojas);
    console.log(`📊 Hojas disponibles: ${hojas.join(', ')}`);
    
    hojas.forEach(nombreHoja => {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📋 HOJA: ${nombreHoja}`);
        console.log(`${'─'.repeat(60)}`);
        
        const hoja = datosEditados.hojas[nombreHoja];
        
        // 1. VERIFICAR DATOS GENERALES (filas 3-6)
        console.log('\n📌 1. DATOS GENERALES (filas 3-6):');
        const datosGenerales = hoja.datos_generales || [];
        
        // Fila 3: Inversión Inicial
        const fila3 = datosGenerales.find(d => d.fila === 3);
        if (fila3) {
            console.log(`   Fila 3 - Inversión Inicial: ${fila3.imp_inicial}`);
            
            // Verificar que coincide con suma de incrementos de clientes
            let sumaIncrementosClientes = 0;
            (hoja.clientes || []).forEach(cliente => {
                (cliente.datos_diarios || []).forEach(d => {
                    if (d.fila >= 15 && d.fila <= 1120 && typeof d.incremento === 'number') {
                        sumaIncrementosClientes += d.incremento;
                    }
                });
            });
            
            if (Math.abs((fila3.imp_inicial || 0) - sumaIncrementosClientes) > 0.01) {
                errores.push(`${nombreHoja}: Fila 3 imp_inicial (${fila3.imp_inicial}) ≠ suma incrementos clientes (${sumaIncrementosClientes})`);
            } else {
                console.log(`   ✅ Coincide con suma de incrementos: ${sumaIncrementosClientes}`);
            }
        } else {
            advertencias.push(`${nombreHoja}: No existe fila 3 en datos_generales`);
        }
        
        // 2. VERIFICAR DATOS DIARIOS GENERALES
        console.log('\n📌 2. DATOS DIARIOS GENERALES:');
        const datosDiarios = hoja.datos_diarios_generales || [];
        console.log(`   Total filas: ${datosDiarios.length}`);
        
        // Fila 15 (día 1) - imp_inicial debe ser suma de FA
        const fila15 = datosDiarios.find(d => d.fila === 15);
        if (fila15) {
            console.log(`\n   🔹 Fila 15 (Día 1 - ${fila15.fecha}):`);
            console.log(`      imp_inicial: ${fila15.imp_inicial}`);
            console.log(`      imp_final: ${fila15.imp_final}`);
            console.log(`      benef_euro: ${fila15.benef_euro}`);
            console.log(`      benef_porcentaje: ${fila15.benef_porcentaje}`);
            
            // Calcular FA15 manualmente
            let fa15 = 0;
            (hoja.clientes || []).forEach((cliente, idx) => {
                const datoCliente = (cliente.datos_diarios || []).find(d => d.fila === 15);
                if (datoCliente) {
                    const inc = typeof datoCliente.incremento === 'number' ? datoCliente.incremento : 0;
                    const dec = typeof datoCliente.decremento === 'number' ? datoCliente.decremento : 0;
                    fa15 += inc - dec;
                    if (inc > 0 || dec > 0) {
                        console.log(`      Cliente ${idx + 1}: inc=${inc}, dec=${dec}`);
                    }
                }
            });
            console.log(`      FA15 calculado: ${fa15}`);
            
            if (Math.abs((fila15.imp_inicial || 0) - fa15) > 0.01 && fa15 !== 0) {
                errores.push(`${nombreHoja}: Fila 15 imp_inicial (${fila15.imp_inicial}) ≠ FA15 (${fa15})`);
            } else if (fa15 !== 0) {
                console.log(`      ✅ imp_inicial coincide con FA15`);
            }
            
            // Verificar beneficios si hay imp_final
            if (typeof fila15.imp_final === 'number' && typeof fila15.imp_inicial === 'number' && fila15.imp_inicial !== 0) {
                const benefEuroEsperado = fila15.imp_final - fila15.imp_inicial;
                const benefPctEsperado = benefEuroEsperado / fila15.imp_inicial;
                
                console.log(`      Benef Euro esperado: ${benefEuroEsperado}`);
                console.log(`      Benef % esperado: ${(benefPctEsperado * 100).toFixed(4)}%`);
                
                if (fila15.benef_euro === null || fila15.benef_euro === undefined) {
                    errores.push(`${nombreHoja}: Fila 15 benef_euro está vacío (debería ser ${benefEuroEsperado})`);
                }
            }
        } else {
            advertencias.push(`${nombreHoja}: No existe fila 15 en datos_diarios_generales`);
        }
        
        // 3. VERIFICAR CLIENTES
        console.log('\n📌 3. CLIENTES:');
        const clientes = hoja.clientes || [];
        console.log(`   Total clientes: ${clientes.length}`);
        
        clientes.forEach((cliente, idx) => {
            const datosDiariosCliente = cliente.datos_diarios || [];
            const fila15Cliente = datosDiariosCliente.find(d => d.fila === 15);
            
            if (fila15Cliente) {
                const inc = fila15Cliente.incremento;
                const dec = fila15Cliente.decremento;
                const base = fila15Cliente.base;
                const saldo = fila15Cliente.saldo_diario;
                
                if (inc > 0 || dec > 0 || base || saldo) {
                    console.log(`\n   🔹 Cliente ${idx + 1} (Fila 15):`);
                    console.log(`      incremento: ${inc}`);
                    console.log(`      decremento: ${dec}`);
                    console.log(`      base: ${base}`);
                    console.log(`      saldo_diario: ${saldo}`);
                    console.log(`      beneficio_diario: ${fila15Cliente.beneficio_diario}`);
                    console.log(`      formulas: ${JSON.stringify(fila15Cliente.formulas || {})}`);
                    
                    // Verificar lógica de base
                    // base = saldo_anterior + incremento - decremento
                    const incNum = typeof inc === 'number' ? inc : 0;
                    const decNum = typeof dec === 'number' ? dec : 0;
                    const baseEsperada = incNum - decNum; // Para día 1, saldo_anterior = 0
                    
                    if (incNum > 0 && (base === null || base === undefined || base === 0)) {
                        errores.push(`${nombreHoja}: Cliente ${idx + 1} Fila 15 - tiene incremento (${incNum}) pero base está vacía`);
                    }
                    
                    // Si hay benef_porcentaje general y base, verificar saldo
                    if (fila15 && typeof fila15.benef_porcentaje === 'number' && typeof base === 'number') {
                        const benefDiarioEsperado = base * fila15.benef_porcentaje;
                        const saldoEsperado = base + benefDiarioEsperado;
                        
                        console.log(`      Benef diario esperado: ${benefDiarioEsperado.toFixed(2)}`);
                        console.log(`      Saldo esperado: ${saldoEsperado.toFixed(2)}`);
                    }
                }
            }
        });
        
        // 4. VERIFICAR ESTRUCTURA DE FILAS
        console.log('\n📌 4. ESTRUCTURA DE FILAS:');
        const filasUnicas = [...new Set(datosDiarios.map(d => d.fila))].sort((a, b) => a - b);
        console.log(`   Filas únicas: ${filasUnicas.slice(0, 20).join(', ')}${filasUnicas.length > 20 ? '...' : ''}`);
        
        // Verificar que cada día tiene las filas correctas
        const fechasUnicas = [...new Set(datosDiarios.filter(d => d.fecha).map(d => d.fecha.split(' ')[0]))];
        console.log(`   Fechas únicas: ${fechasUnicas.length}`);
        
        // 5. VERIFICAR FÓRMULAS EN DATOS
        console.log('\n📌 5. FÓRMULAS EN DATOS:');
        let filasConFormulas = 0;
        let filasConBloqueadas = 0;
        
        datosDiarios.forEach(d => {
            if (d.formulas && Object.keys(d.formulas).length > 0) {
                filasConFormulas++;
            }
            if (d.bloqueadas && Object.keys(d.bloqueadas).length > 0) {
                filasConBloqueadas++;
            }
        });
        
        console.log(`   Filas con fórmulas definidas: ${filasConFormulas}`);
        console.log(`   Filas con bloqueadas definidas: ${filasConBloqueadas}`);
        
        if (filasConFormulas === 0) {
            advertencias.push(`${nombreHoja}: Ninguna fila tiene fórmulas definidas - los beneficios se calculan directamente`);
        }
    });
    
    // Mostrar resultados
    function mostrarResultados() {
        console.log('\n' + '═'.repeat(60));
        console.log('📊 RESUMEN DEL DIAGNÓSTICO');
        console.log('═'.repeat(60));
        
        if (errores.length > 0) {
            console.log('\n❌ ERRORES ENCONTRADOS:');
            errores.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
        } else {
            console.log('\n✅ No se encontraron errores críticos');
        }
        
        if (advertencias.length > 0) {
            console.log('\n⚠️ ADVERTENCIAS:');
            advertencias.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));
        }
        
        console.log('\n' + '═'.repeat(60));
        
        return { errores, advertencias };
    }
    
    return mostrarResultados();
})();
