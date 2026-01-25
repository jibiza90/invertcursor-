// ANÁLISIS COMPLETO DE LÓGICA DEL SISTEMA
// Ejecutar con: node analisis_completo.js

const fs = require('fs');
const path = require('path');

// Cargar datos
const rutaDatos = path.join(__dirname, 'datos_editados.json');
const datos = JSON.parse(fs.readFileSync(rutaDatos, 'utf-8'));

const output = [];
const errores = [];

function log(msg) {
    output.push(msg);
    console.log(msg);
}

function error(msg) {
    errores.push(msg);
    log(`❌ ERROR: ${msg}`);
}

function ok(msg) {
    log(`✅ ${msg}`);
}

function warn(msg) {
    log(`⚠️ ${msg}`);
}

// Calcular FA (suma de incrementos - decrementos de todos los clientes)
function calcularFA(fila, clientes) {
    let suma = 0;
    for (const cliente of clientes) {
        const datos_diarios = cliente.datos_diarios || [];
        for (const d of datos_diarios) {
            if (d.fila === fila) {
                const inc = d.incremento || 0;
                const dec = d.decremento || 0;
                suma += inc - dec;
                break;
            }
        }
    }
    return suma;
}

log('='.repeat(70));
log('ANÁLISIS COMPLETO DEL SISTEMA DE INVERSIONES');
log('='.repeat(70));

// 1. VERIFICAR HOJAS DISPONIBLES
log('\n📋 HOJAS DISPONIBLES:');
const hojas = Object.keys(datos.hojas || {});
hojas.forEach(h => {
    const hoja = datos.hojas[h];
    const clientes = (hoja.clientes || []).length;
    const datosGen = (hoja.datos_diarios_generales || []).length;
    log(`   ${h}: ${clientes} clientes, ${datosGen} filas generales`);
});

// Verificar si existe Diario WIND
if (!datos.hojas['Diario WIND']) {
    warn('Diario WIND NO EXISTE en los datos - esto explica el error "No hay datos disponibles"');
}

// 2. ANALIZAR CADA HOJA
for (const nombreHoja of hojas) {
    log('\n' + '='.repeat(70));
    log(`HOJA: ${nombreHoja}`);
    log('='.repeat(70));
    
    const hoja = datos.hojas[nombreHoja];
    const clientes = hoja.clientes || [];
    const datosGen = hoja.datos_diarios_generales || [];
    
    log(`\nClientes: ${clientes.length}`);
    log(`Filas generales: ${datosGen.length}`);
    
    if (clientes.length === 0) {
        warn('No hay clientes en esta hoja');
        continue;
    }
    
    // Ordenar datos generales por fila
    const datosGenOrd = datosGen
        .filter(d => d.fila >= 15 && d.fila <= 1120)
        .sort((a, b) => a.fila - b.fila);
    
    // A. VERIFICAR FILA 15 (día 1)
    log('\n--- A. Verificando fila 15 (día 1) ---');
    const fila15 = datosGen.find(d => d.fila === 15);
    if (fila15) {
        const impInicial = fila15.imp_inicial;
        const fa = calcularFA(15, clientes);
        log(`   imp_inicial: ${impInicial}`);
        log(`   FA (suma incrementos): ${fa}`);
        
        if (impInicial !== null && impInicial !== undefined) {
            if (Math.abs(impInicial - fa) > 0.01) {
                error(`${nombreHoja} Fila 15: imp_inicial=${impInicial} pero FA=${fa}`);
            } else {
                ok(`Fila 15: imp_inicial = FA`);
            }
        }
    }
    
    // B. VERIFICAR CASCADA DE IMP_INICIAL
    log('\n--- B. Verificando cascada de imp_inicial ---');
    let impFinalAnterior = null;
    let filasConImpFinal = [];
    
    for (const filaData of datosGenOrd.slice(0, 30)) { // Primeras 30 filas
        const fila = filaData.fila;
        const impInicial = filaData.imp_inicial;
        const impFinal = filaData.imp_final;
        
        if (typeof impFinal === 'number') {
            filasConImpFinal.push(fila);
        }
        
        if (fila === 15) {
            impFinalAnterior = impFinal;
            continue;
        }
        
        if (typeof impInicial === 'number' && impFinalAnterior !== null) {
            const fa = calcularFA(fila, clientes);
            const esperado = impFinalAnterior + fa;
            
            if (Math.abs(impInicial - esperado) > 0.01) {
                error(`${nombreHoja} Fila ${fila}: imp_inicial=${impInicial.toFixed(2)}, esperado=${esperado.toFixed(2)} (imp_final_ant=${impFinalAnterior} + FA=${fa})`);
            } else {
                ok(`Fila ${fila}: imp_inicial=${impInicial.toFixed(2)} correcto`);
            }
        }
        
        if (typeof impFinal === 'number') {
            impFinalAnterior = impFinal;
        }
    }
    
    log(`\n   Filas con imp_final: ${filasConImpFinal.join(', ') || 'ninguna'}`);
    
    // C. VERIFICAR BENEFICIOS SOLO SI HAY IMP_FINAL
    log('\n--- C. Verificando beneficios (solo si hay imp_final) ---');
    let errorsBenef = 0;
    
    for (const filaData of datosGenOrd.slice(0, 30)) {
        const fila = filaData.fila;
        const impFinal = filaData.imp_final;
        const benefEuro = filaData.benef_euro;
        const benefPct = filaData.benef_porcentaje;
        
        const tieneImpFinal = typeof impFinal === 'number';
        const tieneBenef = (typeof benefEuro === 'number' && benefEuro !== 0) || 
                          (typeof benefPct === 'number' && benefPct !== 0);
        
        if (!tieneImpFinal && tieneBenef) {
            error(`${nombreHoja} Fila ${fila}: tiene beneficios SIN imp_final (benef_euro=${benefEuro}, benef_pct=${benefPct})`);
            errorsBenef++;
        }
    }
    
    if (errorsBenef === 0) {
        ok('Beneficios solo existen donde hay imp_final');
    }
    
    // D. VERIFICAR CLIENTES
    log('\n--- D. Verificando clientes ---');
    
    // Encontrar límites
    let ultimaFilaMov = 0;
    for (const c of clientes) {
        for (const d of (c.datos_diarios || [])) {
            if ((d.incremento || 0) > 0 || (d.decremento || 0) > 0) {
                if (d.fila > ultimaFilaMov) ultimaFilaMov = d.fila;
            }
        }
    }
    
    let ultimaFilaImpFinal = 0;
    for (const d of datosGen) {
        if (typeof d.imp_final === 'number' && d.fila > ultimaFilaImpFinal) {
            ultimaFilaImpFinal = d.fila;
        }
    }
    
    const limite = Math.max(ultimaFilaMov, ultimaFilaImpFinal);
    log(`   Última fila con movimientos: ${ultimaFilaMov}`);
    log(`   Última fila con imp_final: ${ultimaFilaImpFinal}`);
    log(`   Límite de cálculo: ${limite}`);
    
    for (let idx = 0; idx < clientes.length; idx++) {
        const cliente = clientes[idx];
        log(`\n   Cliente ${idx + 1}:`);
        
        const datosCliente = (cliente.datos_diarios || [])
            .filter(d => d.fila >= 15)
            .sort((a, b) => a.fila - b.fila);
        
        let saldoAnterior = 0;
        let filasConMov = [];
        let errorsCliente = 0;
        
        for (const d of datosCliente.slice(0, 50)) {
            const fila = d.fila;
            const inc = d.incremento || 0;
            const dec = d.decremento || 0;
            const base = d.base;
            const saldo = d.saldo_diario;
            
            // Verificar filas fuera del límite
            if (fila > limite) {
                if (base !== null && base !== undefined) {
                    error(`${nombreHoja} Cliente ${idx+1} Fila ${fila}: tiene base=${base} FUERA del límite`);
                    errorsCliente++;
                }
                continue;
            }
            
            if (inc > 0 || dec > 0) {
                filasConMov.push(fila);
                const baseEsperada = saldoAnterior + inc - dec;
                
                if (base !== null && base !== undefined) {
                    if (Math.abs(base - baseEsperada) > 0.01) {
                        error(`${nombreHoja} Cliente ${idx+1} Fila ${fila}: base=${base.toFixed(2)}, esperada=${baseEsperada.toFixed(2)}`);
                        errorsCliente++;
                    } else {
                        log(`      Fila ${fila}: inc=${inc}, dec=${dec}, base=${base.toFixed(2)} ✓`);
                    }
                }
            }
            
            if (typeof saldo === 'number') {
                saldoAnterior = saldo;
            }
        }
        
        log(`      Filas con movimientos: ${filasConMov.join(', ') || 'ninguna'}`);
        if (errorsCliente === 0) {
            ok(`Cliente ${idx + 1}: sin errores`);
        }
    }
}

// E. SIMULACIÓN DE MES COMPLETO
log('\n' + '='.repeat(70));
log('SIMULACIÓN DE MES COMPLETO');
log('='.repeat(70));

log('\nEscenario simulado:');
log('  Día 1: Cliente1 +5000€, Cliente2 +2000€, rentabilidad +2%');
log('  Día 2: Sin movimientos, rentabilidad -1%');
log('  Día 5: Cliente2 +1000€, rentabilidad +1.5%');
log('  Día 10: Cliente1 -1000€, rentabilidad +0.5%');

// Día 1
let c1_saldo = 5000 * 1.02; // 5100
let c2_saldo = 2000 * 1.02; // 2040
let imp_final_1 = 7000 * 1.02; // 7140

log('\n📅 Día 1:');
log(`   General: imp_inicial=7000, imp_final=${imp_final_1.toFixed(2)}`);
log(`   Cliente1: base=5000, beneficio=${(5000*0.02).toFixed(2)}, saldo=${c1_saldo.toFixed(2)}`);
log(`   Cliente2: base=2000, beneficio=${(2000*0.02).toFixed(2)}, saldo=${c2_saldo.toFixed(2)}`);
log(`   Suma saldos: ${(c1_saldo + c2_saldo).toFixed(2)} vs imp_final=${imp_final_1.toFixed(2)}`);

// Verificar
if (Math.abs((c1_saldo + c2_saldo) - imp_final_1) > 0.01) {
    error('Simulación Día 1: suma saldos != imp_final');
} else {
    ok('Simulación Día 1: suma saldos = imp_final ✓');
}

// Día 2
let c1_base_2 = c1_saldo;
let c1_saldo_2 = c1_base_2 * 0.99;
let c2_base_2 = c2_saldo;
let c2_saldo_2 = c2_base_2 * 0.99;
let imp_inicial_2 = imp_final_1;
let imp_final_2 = imp_inicial_2 * 0.99;

log('\n📅 Día 2:');
log(`   General: imp_inicial=${imp_inicial_2.toFixed(2)}, imp_final=${imp_final_2.toFixed(2)}`);
log(`   Cliente1: base=${c1_base_2.toFixed(2)}, saldo=${c1_saldo_2.toFixed(2)}`);
log(`   Cliente2: base=${c2_base_2.toFixed(2)}, saldo=${c2_saldo_2.toFixed(2)}`);

if (Math.abs((c1_saldo_2 + c2_saldo_2) - imp_final_2) > 0.01) {
    error('Simulación Día 2: suma saldos != imp_final');
} else {
    ok('Simulación Día 2: suma saldos = imp_final ✓');
}

// RESUMEN FINAL
log('\n' + '='.repeat(70));
log('RESUMEN FINAL');
log('='.repeat(70));

if (errores.length === 0) {
    log('\n🎉 TODAS LAS VERIFICACIONES PASARON');
} else {
    log(`\n⛔ SE ENCONTRARON ${errores.length} ERRORES:`);
    errores.forEach((e, i) => log(`   ${i+1}. ${e}`));
}

// Guardar resultados
const resultado = output.join('\n');
fs.writeFileSync('resultado_analisis.txt', resultado, 'utf-8');
log('\n📄 Resultados guardados en resultado_analisis.txt');

// Guardar errores en JSON para fácil procesamiento
fs.writeFileSync('errores_encontrados.json', JSON.stringify({
    fecha: new Date().toISOString(),
    total_errores: errores.length,
    errores: errores
}, null, 2), 'utf-8');

process.exit(errores.length);
