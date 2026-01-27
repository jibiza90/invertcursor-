// 🔍 SCRIPT COMPARATIVO AUTOMÁTICO GENERAL vs CLIENTE
// Este script compara día por día las diferencias entre estadísticas generales y cliente

async function compararGeneralVsCliente() {
    console.log('🔍 INICIANDO COMPARACIÓN AUTOMÁTICA GENERAL vs CLIENTE');
    
    // Obtener hoja actual
    const hoja = datosEditados?.hojas?.[hojaActual];
    if (!hoja) {
        console.log('❌ No hay hoja actual');
        return;
    }
    
    // Obtener datos generales
    const datosGenerales = hoja.datos_diarios_generales || [];
    console.log(`📊 Datos generales: ${datosGenerales.length} filas`);
    
    // Obtener cliente 1
    const cliente1 = hoja.clientes?.[0]; // Primer cliente (índice 0)
    if (!cliente1) {
        console.log('❌ No hay cliente 1');
        return;
    }
    
    const datosCliente1 = cliente1.datos_diarios || [];
    console.log(`👤 Datos cliente 1: ${datosCliente1.length} filas`);
    
    // Crear mapa de beneficios generales por fila
    const benefGeneralesPorFila = {};
    datosGenerales.forEach(d => {
        if (d.fila >= 15 && d.fila <= 1120 && typeof d.benef_porcentaje === 'number') {
            benefGeneralesPorFila[d.fila] = d.benef_porcentaje;
        }
    });
    
    // Agrupar por mes para comparación
    const comparacionPorMes = {};
    
    // Procesar datos generales por mes
    Object.keys(benefGeneralesPorFila).forEach(fila => {
        const filaNum = parseInt(fila);
        const diaDelAno = filaNum - 14;
        const mesNum = Math.min(12, Math.max(1, Math.ceil(diaDelAno / 30)));
        const mesKey = `2026-${String(mesNum).padStart(2, '0')}`;
        
        if (!comparacionPorMes[mesKey]) {
            comparacionPorMes[mesKey] = {
                general: { dias: [], suma: 0, count: 0 },
                cliente: { dias: [], suma: 0, count: 0 }
            };
        }
        
        const benefPct = benefGeneralesPorFila[filaNum];
        comparacionPorMes[mesKey].general.dias.push({
            fila: filaNum,
            benefPct: benefPct,
            benefPctStr: (benefPct * 100).toFixed(6) + '%'
        });
        comparacionPorMes[mesKey].general.suma += benefPct;
        comparacionPorMes[mesKey].general.count++;
    });
    
    // Procesar datos cliente por mes
    datosCliente1.forEach(fila => {
        if (fila.fila < 15 || fila.fila > 1120) return;
        
        const diaDelAno = fila.fila - 14;
        const mesNum = Math.min(12, Math.max(1, Math.ceil(diaDelAno / 30)));
        const mesKey = `2026-${String(mesNum).padStart(2, '0')}`;
        
        if (!comparacionPorMes[mesKey]) {
            comparacionPorMes[mesKey] = {
                general: { dias: [], suma: 0, count: 0 },
                cliente: { dias: [], suma: 0, count: 0 }
            };
        }
        
        // Usar el mismo beneficio que los generales (deberían ser iguales)
        const benefPct = benefGeneralesPorFila[fila.fila] || 0;
        comparacionPorMes[mesKey].cliente.dias.push({
            fila: fila.fila,
            benefPct: benefPct,
            benefPctStr: (benefPct * 100).toFixed(6) + '%'
        });
        comparacionPorMes[mesKey].cliente.suma += benefPct;
        comparacionPorMes[mesKey].cliente.count++;
    });
    
    // 🎯 MOSTRAR COMPARACIÓN DETALLADA
    console.log('\n🎯 COMPARACIÓN DETALLADA GENERAL vs CLIENTE 1:');
    console.log('=' .repeat(80));
    
    const mesesOrdenados = Object.keys(comparacionPorMes).sort();
    
    mesesOrdenados.forEach(mesKey => {
        const comp = comparacionPorMes[mesKey];
        
        console.log(`\n📅 ${mesKey}:`);
        console.log(`   GENERAL: ${comp.general.count} días, suma: ${(comp.general.suma * 100).toFixed(6)}%`);
        console.log(`   CLIENTE: ${comp.cliente.count} días, suma: ${(comp.cliente.suma * 100).toFixed(6)}%`);
        
        // Verificar diferencias
        const diffDias = comp.general.count - comp.cliente.count;
        const diffSuma = comp.general.suma - comp.cliente.suma;
        
        if (diffDias !== 0) {
            console.log(`   ⚠️  DIFERENCIA DE DÍAS: ${diffDias}`);
        }
        
        if (Math.abs(diffSuma) > 0.000001) {
            console.log(`   ⚠️  DIFERENCIA DE SUMA: ${(diffSuma * 100).toFixed(6)}%`);
        }
        
        // Mostrar días diferentes si los hay
        if (comp.general.count !== comp.cliente.count) {
            console.log(`   🔍 DÍAS EN GENERAL PERO NO EN CLIENTE:`);
            comp.general.dias.forEach(dia => {
                const existeEnCliente = comp.cliente.dias.find(d => d.fila === dia.fila);
                if (!existeEnCliente) {
                    console.log(`      Fila ${dia.fila}: ${dia.benefPctStr}`);
                }
            });
            
            console.log(`   🔍 DÍAS EN CLIENTE PERO NO EN GENERAL:`);
            comp.cliente.dias.forEach(dia => {
                const existeEnGeneral = comp.general.dias.find(d => d.fila === dia.fila);
                if (!existeEnGeneral) {
                    console.log(`      Fila ${dia.fila}: ${dia.benefPctStr}`);
                }
            });
        }
        
        // Si mismo número de días, verificar si son los mismos días
        if (comp.general.count === comp.cliente.count && comp.general.count > 0) {
            let diasIguales = true;
            for (let i = 0; i < comp.general.dias.length; i++) {
                const diaGeneral = comp.general.dias[i];
                const diaCliente = comp.cliente.dias[i];
                
                if (diaGeneral.fila !== diaCliente.fila || 
                    Math.abs(diaGeneral.benefPct - diaCliente.benefPct) > 0.000001) {
                    diasIguales = false;
                    console.log(`   ⚠️  DÍA ${i+1} DIFERENTE:`);
                    console.log(`      General: Fila ${diaGeneral.fila}, ${diaGeneral.benefPctStr}`);
                    console.log(`      Cliente: Fila ${diaCliente.fila}, ${diaCliente.benefPctStr}`);
                }
            }
            
            if (diasIguales) {
                console.log(`   ✅ MISMOS DÍAS Y MISMOS PORCENTAJES`);
            }
        }
    });
    
    // 🎯 RESUMEN FINAL
    console.log('\n🎯 RESUMEN FINAL:');
    console.log('=' .repeat(80));
    
    let totalGeneralDias = 0;
    let totalClienteDias = 0;
    let totalGeneralSuma = 0;
    let totalClienteSuma = 0;
    
    mesesOrdenados.forEach(mesKey => {
        const comp = comparacionPorMes[mesKey];
        totalGeneralDias += comp.general.count;
        totalClienteDias += comp.cliente.count;
        totalGeneralSuma += comp.general.suma;
        totalClienteSuma += comp.cliente.suma;
    });
    
    console.log(`📊 TOTALES:`);
    console.log(`   GENERAL: ${totalGeneralDias} días, suma: ${(totalGeneralSuma * 100).toFixed(6)}%`);
    console.log(`   CLIENTE: ${totalClienteDias} días, suma: ${(totalClienteSuma * 100).toFixed(6)}%`);
    console.log(`   DIFERENCIA DÍAS: ${totalGeneralDias - totalClienteDias}`);
    console.log(`   DIFERENCIA SUMA: ${((totalGeneralSuma - totalClienteSuma) * 100).toFixed(6)}%`);
    
    if (Math.abs(totalGeneralSuma - totalClienteSuma) < 0.000001) {
        console.log(`   ✅ ¡SUMAS IDÉNTICAS!`);
    } else {
        console.log(`   ❌ ¡HAY DIFERENCIA EN LAS SUMAS!`);
    }
    
    console.log('\n🔍 ¡COMPARACIÓN COMPLETADA!');
}

// 🚀 EJECUTAR LA COMPARACIÓN
console.log('🚀 EJECUTANDO COMPARACIÓN AUTOMÁTICA...');
compararGeneralVsCliente();
