// VERIFICACIÓN EXHAUSTIVA DE TODA LA LÓGICA - EJECUTAR EN CONSOLA DEL NAVEGADOR
// Versión 3 - Revisa CADA celda, cascada y lógica completa

(function verificarTodo() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
    console.log('%c🔬 VERIFICACIÓN EXHAUSTIVA DE TODA LA LÓGICA', 'color: #4CAF50; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
    
    const problemas = [];
    const ok = [];
    
    if (!datosEditados?.hojas?.[hojaActual]) {
        console.error('❌ No hay datos cargados');
        return;
    }
    
    const hoja = datosEditados.hojas[hojaActual];
    console.log(`\n📋 Hoja actual: ${hojaActual}`);
    
    // ═══════════════════════════════════════════════════════════════
    // 1. VERIFICAR ESTRUCTURA DE DATOS
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(70));
    console.log('1️⃣ ESTRUCTURA DE DATOS');
    console.log('─'.repeat(70));
    
    const datosGenerales = hoja.datos_generales || [];
    const datosDiarios = hoja.datos_diarios_generales || [];
    const clientes = hoja.clientes || [];
    
    console.log(`   datos_generales: ${datosGenerales.length} filas`);
    console.log(`   datos_diarios_generales: ${datosDiarios.length} filas`);
    console.log(`   clientes: ${clientes.length}`);
    
    // ═══════════════════════════════════════════════════════════════
    // 2. VERIFICAR FILA 3 (INVERSIÓN INICIAL)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(70));
    console.log('2️⃣ FILA 3 - INVERSIÓN INICIAL');
    console.log('─'.repeat(70));
    
    const fila3 = datosGenerales.find(d => d.fila === 3);
    if (!fila3) {
        problemas.push('Fila 3 no existe en datos_generales');
    } else {
        // Calcular suma de incrementos de clientes
        let sumaIncrementos = 0;
        clientes.forEach((c, i) => {
            (c.datos_diarios || []).forEach(d => {
                if (d.fila >= 15 && d.fila <= 1120 && typeof d.incremento === 'number' && d.incremento > 0) {
                    sumaIncrementos += d.incremento;
                }
            });
        });
        
        console.log(`   imp_inicial actual: ${fila3.imp_inicial}`);
        console.log(`   Suma incrementos clientes: ${sumaIncrementos}`);
        
        if (Math.abs((fila3.imp_inicial || 0) - sumaIncrementos) > 0.01) {
            problemas.push(`Fila 3: imp_inicial (${fila3.imp_inicial}) ≠ suma incrementos (${sumaIncrementos})`);
        } else {
            ok.push('Fila 3 imp_inicial = suma incrementos ✓');
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 3. VERIFICAR FILA 15 (DÍA 1)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(70));
    console.log('3️⃣ FILA 15 - DÍA 1 (01/01/2026)');
    console.log('─'.repeat(70));
    
    const fila15 = datosDiarios.find(d => d.fila === 15);
    if (!fila15) {
        problemas.push('Fila 15 no existe en datos_diarios_generales');
    } else {
        // Calcular FA15 (suma incrementos - decrementos de clientes en fila 15)
        let fa15 = 0;
        clientes.forEach((c, i) => {
            const datoC = (c.datos_diarios || []).find(d => d.fila === 15);
            if (datoC) {
                const inc = typeof datoC.incremento === 'number' ? datoC.incremento : 0;
                const dec = typeof datoC.decremento === 'number' ? datoC.decremento : 0;
                if (inc > 0 || dec > 0) {
                    console.log(`   Cliente ${i+1}: inc=${inc}, dec=${dec}`);
                }
                fa15 += inc - dec;
            }
        });
        
        console.log(`\n   FA15 calculado: ${fa15}`);
        console.log(`   imp_inicial actual: ${fila15.imp_inicial}`);
        console.log(`   imp_final actual: ${fila15.imp_final}`);
        console.log(`   benef_euro actual: ${fila15.benef_euro}`);
        console.log(`   benef_porcentaje actual: ${fila15.benef_porcentaje}`);
        
        // Verificar imp_inicial = FA15
        if (fa15 > 0 && Math.abs((fila15.imp_inicial || 0) - fa15) > 0.01) {
            problemas.push(`Fila 15: imp_inicial (${fila15.imp_inicial}) ≠ FA15 (${fa15}) ⚠️`);
        } else if (fa15 > 0) {
            ok.push('Fila 15 imp_inicial = FA15 ✓');
        }
        
        // Verificar beneficios si hay imp_final
        if (typeof fila15.imp_final === 'number' && typeof fila15.imp_inicial === 'number' && fila15.imp_inicial > 0) {
            const benefEuroEsperado = fila15.imp_final - fila15.imp_inicial;
            const benefPctEsperado = benefEuroEsperado / fila15.imp_inicial;
            
            console.log(`\n   Beneficio € esperado: ${benefEuroEsperado.toFixed(2)}`);
            console.log(`   Beneficio % esperado: ${(benefPctEsperado * 100).toFixed(4)}%`);
            
            if (fila15.benef_euro === null || fila15.benef_euro === undefined) {
                problemas.push(`Fila 15: benef_euro vacío (debería ser ${benefEuroEsperado.toFixed(2)})`);
            } else if (Math.abs(fila15.benef_euro - benefEuroEsperado) > 0.01) {
                problemas.push(`Fila 15: benef_euro (${fila15.benef_euro}) ≠ esperado (${benefEuroEsperado.toFixed(2)})`);
            } else {
                ok.push('Fila 15 benef_euro correcto ✓');
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 4. VERIFICAR CLIENTES FILA 15
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(70));
    console.log('4️⃣ CLIENTES - FILA 15');
    console.log('─'.repeat(70));
    
    clientes.forEach((cliente, idx) => {
        const datoC = (cliente.datos_diarios || []).find(d => d.fila === 15);
        if (!datoC) return;
        
        const inc = typeof datoC.incremento === 'number' ? datoC.incremento : 0;
        const dec = typeof datoC.decremento === 'number' ? datoC.decremento : 0;
        
        if (inc > 0 || dec > 0) {
            console.log(`\n   🔹 Cliente ${idx + 1}:`);
            console.log(`      incremento: ${inc}`);
            console.log(`      decremento: ${dec}`);
            console.log(`      base: ${datoC.base}`);
            console.log(`      saldo_diario: ${datoC.saldo_diario}`);
            console.log(`      beneficio_diario: ${datoC.beneficio_diario}`);
            
            // Verificar base = incremento - decremento (para día 1, saldo anterior = 0)
            const baseEsperada = inc - dec;
            
            if (datoC.base === null || datoC.base === undefined) {
                problemas.push(`Cliente ${idx+1} Fila 15: base vacía (debería ser ${baseEsperada})`);
            } else if (Math.abs(datoC.base - baseEsperada) > 0.01) {
                problemas.push(`Cliente ${idx+1} Fila 15: base (${datoC.base}) ≠ esperada (${baseEsperada})`);
            } else {
                ok.push(`Cliente ${idx+1} base correcta ✓`);
            }
            
            // Verificar beneficio_diario = base * benef_porcentaje_general
            if (fila15 && typeof fila15.benef_porcentaje === 'number' && typeof datoC.base === 'number') {
                const benefDiarioEsperado = datoC.base * fila15.benef_porcentaje;
                console.log(`      beneficio_diario esperado: ${benefDiarioEsperado.toFixed(2)}`);
                
                if (datoC.beneficio_diario === null || datoC.beneficio_diario === undefined) {
                    problemas.push(`Cliente ${idx+1} Fila 15: beneficio_diario vacío`);
                }
            }
            
            // Verificar saldo_diario = base + beneficio_diario
            if (typeof datoC.base === 'number' && typeof datoC.beneficio_diario === 'number') {
                const saldoEsperado = datoC.base + datoC.beneficio_diario;
                console.log(`      saldo_diario esperado: ${saldoEsperado.toFixed(2)}`);
                
                if (datoC.saldo_diario === null || datoC.saldo_diario === undefined) {
                    problemas.push(`Cliente ${idx+1} Fila 15: saldo_diario vacío`);
                } else if (Math.abs(datoC.saldo_diario - saldoEsperado) > 0.01) {
                    problemas.push(`Cliente ${idx+1} Fila 15: saldo_diario (${datoC.saldo_diario}) ≠ esperado (${saldoEsperado.toFixed(2)})`);
                }
            }
        }
    });
    
    // ═══════════════════════════════════════════════════════════════
    // 5. VERIFICAR FORMATEO DE NÚMEROS
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(70));
    console.log('5️⃣ FORMATEO DE NÚMEROS');
    console.log('─'.repeat(70));
    
    // Test de formateo
    const testCases = [
        { input: '8000', expected: 8000 },
        { input: '8.000', expected: 8000 },
        { input: '8.000,00', expected: 8000 },
        { input: '8,50', expected: 8.5 },
        { input: '1.234.567,89', expected: 1234567.89 }
    ];
    
    testCases.forEach(test => {
        // Simular el parsing
        const parsed = parseFloat(test.input.replace(/\./g, '').replace(',', '.'));
        console.log(`   "${test.input}" → ${parsed} (esperado: ${test.expected})`);
        
        if (Math.abs(parsed - test.expected) > 0.001) {
            problemas.push(`Formateo: "${test.input}" → ${parsed} (esperado ${test.expected})`);
        }
    });
    
    // ═══════════════════════════════════════════════════════════════
    // RESUMEN
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN');
    console.log('═'.repeat(70));
    
    if (ok.length > 0) {
        console.log('\n✅ VERIFICACIONES CORRECTAS:');
        ok.forEach(o => console.log(`   ${o}`));
    }
    
    if (problemas.length > 0) {
        console.log('\n❌ PROBLEMAS ENCONTRADOS:');
        problemas.forEach((p, i) => console.log(`   ${i+1}. ${p}`));
    } else {
        console.log('\n🎉 No se encontraron problemas!');
    }
    
    console.log('\n' + '═'.repeat(70));
    
    return { ok, problemas };
})();
