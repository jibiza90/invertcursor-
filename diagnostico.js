// SCRIPT DE DIAGNÓSTICO - Ejecutar en consola (F12)
(function diagnostico() {
    console.clear();
    console.log('='.repeat(60));
    console.log('🔍 DIAGNÓSTICO DEL SISTEMA');
    console.log('='.repeat(60));
    
    // 1. Verificar hojas disponibles
    console.log('\n📋 HOJAS DISPONIBLES:');
    const hojas = Object.keys(datosEditados?.hojas || {});
    hojas.forEach(h => {
        const hoja = datosEditados.hojas[h];
        const clientes = hoja.clientes?.length || 0;
        const datosGen = hoja.datos_diarios_generales?.length || 0;
        console.log(`   ${h}: ${clientes} clientes, ${datosGen} filas generales`);
    });
    
    // 2. Verificar hojaActual
    console.log(`\n📌 hojaActual: "${hojaActual}"`);
    console.log(`📌 hojaInfoClientes: "${hojaInfoClientes}"`);
    console.log(`📌 hojaComision: "${typeof hojaComision !== 'undefined' ? hojaComision : 'NO DEFINIDA'}"`);
    
    // 3. Verificar clientes en cada hoja
    console.log('\n👥 CLIENTES POR HOJA:');
    hojas.forEach(h => {
        const clientes = datosEditados.hojas[h].clientes || [];
        console.log(`\n   ${h}:`);
        if (clientes.length === 0) {
            console.log('      (sin clientes)');
        } else {
            clientes.forEach((c, i) => {
                const inc = c.incrementos_total || 0;
                const dec = c.decrementos_total || 0;
                console.log(`      Cliente ${i+1}: inc=${inc}, dec=${dec}`);
            });
        }
    });
    
    // 4. Verificar día 07/01/26 en Diario WIND
    console.log('\n📅 DÍA 07/01/26 EN DIARIO WIND:');
    const hojaWind = datosEditados?.hojas?.['Diario WIND'];
    if (hojaWind) {
        // Buscar en datos generales
        const datosGen = hojaWind.datos_diarios_generales || [];
        const fila7Ene = datosGen.find(d => d.fecha && d.fecha.includes('07/01'));
        if (fila7Ene) {
            console.log(`   General fila ${fila7Ene.fila}:`);
            console.log(`      imp_inicial: ${fila7Ene.imp_inicial}`);
            console.log(`      imp_final: ${fila7Ene.imp_final}`);
        } else {
            console.log('   No encontrado en general');
        }
        
        // Buscar en clientes
        const clientes = hojaWind.clientes || [];
        clientes.forEach((c, i) => {
            const datos = c.datos_diarios || [];
            const fila7EneC = datos.find(d => d.fecha && d.fecha.includes('07/01'));
            if (fila7EneC && (fila7EneC.incremento > 0 || fila7EneC.decremento > 0)) {
                console.log(`   Cliente ${i+1} fila ${fila7EneC.fila}:`);
                console.log(`      incremento: ${fila7EneC.incremento || 0}`);
                console.log(`      decremento: ${fila7EneC.decremento || 0}`);
                console.log(`      base: ${fila7EneC.base}`);
                console.log(`      saldo: ${fila7EneC.saldo_diario}`);
            }
        });
    } else {
        console.log('   Diario WIND no existe');
    }
    
    // 5. Verificar elementos del DOM
    console.log('\n🖼️ ELEMENTOS DOM:');
    console.log(`   vistaInfoClientes: ${document.getElementById('vistaInfoClientes') ? 'EXISTE' : 'NO EXISTE'}`);
    console.log(`   vistaComision: ${document.getElementById('vistaComision') ? 'EXISTE' : 'NO EXISTE'}`);
    console.log(`   infoClientesContainer: ${document.getElementById('infoClientesContainer') ? 'EXISTE' : 'NO EXISTE'}`);
    console.log(`   comisionContainer: ${document.getElementById('comisionContainer') ? 'EXISTE' : 'NO EXISTE'}`);
    console.log(`   tabSTD: ${document.getElementById('tabSTD') ? 'EXISTE' : 'NO EXISTE'}`);
    console.log(`   tabWIND: ${document.getElementById('tabWIND') ? 'EXISTE' : 'NO EXISTE'}`);
    
    console.log('\n' + '='.repeat(60));
})();
