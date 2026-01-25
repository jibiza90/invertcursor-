// SCRIPT DE VERIFICACIÓN DE LÓGICA DE CLIENTES
// Ejecutar en la consola del navegador (F12)

(function verificarLogicaClientes() {
    console.clear();
    console.log('%c' + '='.repeat(70), 'color: #e74c3c');
    console.log('%c🔍 VERIFICACIÓN DE LÓGICA DE CLIENTES', 'color: #e74c3c; font-size: 16px; font-weight: bold');
    console.log('%c' + '='.repeat(70), 'color: #e74c3c');
    
    if (!datosEditados?.hojas?.[hojaActual]) {
        console.error('❌ No hay datos cargados');
        return;
    }
    
    const hoja = datosEditados.hojas[hojaActual];
    const clientes = hoja.clientes || [];
    const datosGen = hoja.datos_diarios_generales || [];
    
    console.log(`\n📊 Hoja: ${hojaActual}`);
    console.log(`📊 Total clientes: ${clientes.length}`);
    console.log(`📊 Total filas generales: ${datosGen.length}`);
    
    // Encontrar la última fila con imp_final en general
    let ultimaFilaConImpFinal = null;
    for (let i = datosGen.length - 1; i >= 0; i--) {
        if (typeof datosGen[i].imp_final === 'number') {
            ultimaFilaConImpFinal = datosGen[i];
            break;
        }
    }
    
    console.log(`\n📅 Última fila con imp_final: ${ultimaFilaConImpFinal ? `fila ${ultimaFilaConImpFinal.fila} (${ultimaFilaConImpFinal.fecha})` : 'NINGUNA'}`);
    
    const problemas = [];
    
    // Verificar cada cliente
    clientes.forEach((cliente, idx) => {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`%c👤 CLIENTE ${idx + 1}`, 'color: #3498db; font-weight: bold');
        
        const datosDiarios = cliente.datos_diarios || [];
        
        // Encontrar filas con incremento o decremento
        const filasConDatos = datosDiarios.filter(d => 
            d.fila >= 15 && d.fila <= 1120 &&
            ((typeof d.incremento === 'number' && d.incremento > 0) ||
             (typeof d.decremento === 'number' && d.decremento > 0))
        );
        
        console.log(`   Filas con incremento/decremento: ${filasConDatos.length}`);
        filasConDatos.forEach(d => {
            console.log(`      Fila ${d.fila} (${d.fecha}): inc=${d.incremento || 0}, dec=${d.decremento || 0}`);
        });
        
        // Encontrar la última fila con incremento o decremento
        const ultimaFilaConDatos = filasConDatos.length > 0 
            ? filasConDatos.reduce((max, d) => d.fila > max.fila ? d : max, filasConDatos[0])
            : null;
        
        console.log(`   Última fila con datos: ${ultimaFilaConDatos ? `fila ${ultimaFilaConDatos.fila}` : 'NINGUNA'}`);
        
        // Verificar filas con valores calculados (base, saldo) que NO deberían tenerlos
        const filasConCalculosIndebidos = datosDiarios.filter(d => {
            // Si la fila tiene base o saldo_diario
            const tieneCalculos = typeof d.base === 'number' || typeof d.saldo_diario === 'number';
            if (!tieneCalculos) return false;
            
            // Pero NO tiene incremento ni decremento
            const tieneMovimientos = (typeof d.incremento === 'number' && d.incremento > 0) ||
                                     (typeof d.decremento === 'number' && d.decremento > 0);
            
            // Y está DESPUÉS de la última fila con datos del cliente
            const esDespuesDeUltimoDato = ultimaFilaConDatos ? d.fila > ultimaFilaConDatos.fila : true;
            
            // Y está DESPUÉS de la última fila con imp_final en general
            const esDespuesDeUltimoImpFinal = ultimaFilaConImpFinal ? d.fila > ultimaFilaConImpFinal.fila : true;
            
            return !tieneMovimientos && esDespuesDeUltimoDato && esDespuesDeUltimoImpFinal;
        });
        
        if (filasConCalculosIndebidos.length > 0) {
            console.log(`%c   ❌ PROBLEMA: ${filasConCalculosIndebidos.length} filas con cálculos indebidos:`, 'color: #e74c3c');
            filasConCalculosIndebidos.slice(0, 5).forEach(d => {
                console.log(`      Fila ${d.fila} (${d.fecha}): base=${d.base}, saldo=${d.saldo_diario}`);
                problemas.push(`Cliente ${idx+1} Fila ${d.fila}: tiene base=${d.base}, saldo=${d.saldo_diario} sin datos`);
            });
            if (filasConCalculosIndebidos.length > 5) {
                console.log(`      ... y ${filasConCalculosIndebidos.length - 5} más`);
            }
        }
        
        // Verificar de dónde vienen los números 1071.43 y 428.57
        const filasConValoresExtranos = datosDiarios.filter(d => {
            const base = d.base;
            const saldo = d.saldo_diario;
            return (Math.abs(base - 1071.43) < 1 || Math.abs(base - 428.57) < 1 ||
                    Math.abs(saldo - 1071.43) < 1 || Math.abs(saldo - 428.57) < 1);
        });
        
        if (filasConValoresExtranos.length > 0) {
            console.log(`%c   ⚠️ Filas con valores 1071.43 o 428.57:`, 'color: #f39c12');
            filasConValoresExtranos.forEach(d => {
                console.log(`      Fila ${d.fila} (${d.fecha}): base=${d.base}, saldo=${d.saldo_diario}, inc=${d.incremento}, dec=${d.decremento}`);
            });
        }
    });
    
    // Resumen
    console.log(`\n${'='.repeat(70)}`);
    console.log('%c📊 RESUMEN', 'font-weight: bold; font-size: 14px');
    console.log('='.repeat(70));
    
    if (problemas.length > 0) {
        console.log(`%c❌ Total problemas encontrados: ${problemas.length}`, 'color: #e74c3c; font-weight: bold');
        console.log('\nLos valores están siendo calculados en filas donde NO hay:');
        console.log('  - Incremento ni decremento del cliente');
        console.log('  - imp_final en la vista general');
        console.log('\n⚠️ El recálculo en cascada está afectando filas que no debería.');
    } else {
        console.log('%c✅ No se encontraron problemas de lógica', 'color: #27ae60; font-weight: bold');
    }
    
    return problemas;
})();
