const fs = require('fs');

const data = JSON.parse(fs.readFileSync('datos_editados.json', 'utf8'));
const wind = data.hojas['Diario WIND'];

if (!wind) {
  console.error('No se encontró Diario WIND');
  process.exit(1);
}

console.log('=== INCONSISTENCIAS DIARIO WIND ===\n');

// 1) Generales: imp_inicial
console.log('1) Generales - imp_inicial');
const datosGen = (wind.datos_diarios_generales || [])
  .filter(d => d.fila >= 15 && d.fila <= 1120)
  .sort((a, b) => a.fila - b.fila);

let ultimoImpFinal = null;
datosGen.forEach(d => {
  let fa = 0;
  (wind.clientes || []).forEach(c => {
    const cd = c.datos_diarios?.find(dd => dd.fila === d.fila);
    if (cd) fa += (cd.incremento || 0) - (cd.decremento || 0);
  });

  let esperado = null;
  if (d.fila === 15) {
    esperado = fa;
  } else if (ultimoImpFinal !== null) {
    esperado = ultimoImpFinal + fa;
  }

  if (esperado !== null && d.imp_inicial !== esperado) {
    console.log(`  F${d.fila}: imp_inicial=${d.imp_inicial} -> esperado=${esperado} (FA=${fa})`);
  }

  if (typeof d.imp_final === 'number') ultimoImpFinal = d.imp_final;
});

// 2) Clientes: base y saldo_diario
console.log('\n2) Clientes - base/saldo_diario');
(wind.clientes || []).forEach((c, idx) => {
  const errores = [];
  let saldoAnterior = 0;

  const datos = (c.datos_diarios || [])
    .filter(d => d.fila >= 15 && d.fila <= 1120)
    .sort((a, b) => a.fila - b.fila);

  datos.forEach(d => {
    const inc = d.incremento || 0;
    const dec = d.decremento || 0;
    const benef = d.beneficio_diario || 0;
    const baseEsperada = saldoAnterior + inc - dec;
    const saldoEsperado = baseEsperada + benef; // WIND: incluye Benef. Diario

    if (d.base !== null && Math.abs((d.base || 0) - baseEsperada) > 0.01) {
      errores.push(`F${d.fila}: base=${d.base} esperado=${baseEsperada.toFixed(2)}`);
    }
    if (d.saldo_diario !== null && Math.abs((d.saldo_diario || 0) - saldoEsperado) > 0.01) {
      errores.push(`F${d.fila}: saldo=${d.saldo_diario} esperado=${saldoEsperado.toFixed(2)} (benef=${benef.toFixed(2)})`);
    }

    if (d.saldo_diario !== null) saldoAnterior = d.saldo_diario;
    else if (d.base !== null) saldoAnterior = d.base;
  });

  if (errores.length) {
    console.log(`  Cliente ${idx + 1}:`);
    errores.slice(0, 8).forEach(e => console.log(`    ${e}`));
    if (errores.length > 8) console.log(`    ... y ${errores.length - 8} más`);
  }
});

console.log('\n=== FIN ===');
