/**
 * Tests para funciones de cálculo
 * Ejecutar en navegador: abrir tests.html
 * @module tests/calculadora.test
 */

const TestRunner = {
    passed: 0,
    failed: 0,
    results: [],

    assert(condition, mensaje) {
        if (condition) {
            this.passed++;
            this.results.push({ ok: true, mensaje });
        } else {
            this.failed++;
            this.results.push({ ok: false, mensaje });
            console.error('❌ FAIL:', mensaje);
        }
    },

    assertEqual(actual, expected, mensaje, tolerancia = 0.0001) {
        const esIgual = typeof actual === 'number' && typeof expected === 'number'
            ? Math.abs(actual - expected) < tolerancia
            : actual === expected;
        this.assert(esIgual, `${mensaje} | esperado: ${expected}, actual: ${actual}`);
    },

    run(nombre, fn) {
        console.log(`\n📋 Test: ${nombre}`);
        try {
            fn();
        } catch (e) {
            this.failed++;
            this.results.push({ ok: false, mensaje: `${nombre} - Error: ${e.message}` });
            console.error('❌ ERROR:', e);
        }
    },

    resumen() {
        console.log('\n' + '='.repeat(50));
        console.log(`✅ Pasados: ${this.passed}`);
        console.log(`❌ Fallidos: ${this.failed}`);
        console.log(`📊 Total: ${this.passed + this.failed}`);
        return this.failed === 0;
    }
};

// =============================================================================
// TESTS DE CALCULADORA
// =============================================================================

TestRunner.run('calcularSaldoDiario - caso básico', () => {
    const resultado = Calculadora.calcularSaldoDiario(1000, 100, 50, 25);
    // 1000 + 100 - 50 + 25 = 1075
    TestRunner.assertEqual(resultado, 1075, 'Saldo con todos los valores');
});

TestRunner.run('calcularSaldoDiario - sin movimientos', () => {
    const resultado = Calculadora.calcularSaldoDiario(1000, 0, 0, 0);
    TestRunner.assertEqual(resultado, 1000, 'Saldo sin movimientos');
});

TestRunner.run('calcularSaldoDiario - valores null/undefined', () => {
    const resultado = Calculadora.calcularSaldoDiario(null, undefined, 50, 0);
    // 0 + 0 - 50 + 0 = -50
    TestRunner.assertEqual(resultado, -50, 'Manejo de valores null');
});

TestRunner.run('calcularBeneficioEuro - caso básico', () => {
    // imp_final - imp_inicial - incrementos + decrementos
    // 1100 - 1000 - 50 + 20 = 70
    const resultado = Calculadora.calcularBeneficioEuro(1000, 1100, 50, 20);
    TestRunner.assertEqual(resultado, 70, 'Beneficio euro básico');
});

TestRunner.run('calcularBeneficioEuro - sin imp_final', () => {
    const resultado = Calculadora.calcularBeneficioEuro(1000, 0, 0, 0);
    TestRunner.assertEqual(resultado, -1000, 'Sin imp_final');
});

TestRunner.run('calcularBeneficioEuro - ambos cero', () => {
    const resultado = Calculadora.calcularBeneficioEuro(0, 0, 0, 0);
    TestRunner.assertEqual(resultado, 0, 'Ambos imp cero');
});

TestRunner.run('calcularBeneficioPorcentaje - caso básico', () => {
    // 50 / 1000 = 0.05 (5%)
    const resultado = Calculadora.calcularBeneficioPorcentaje(50, 1000);
    TestRunner.assertEqual(resultado, 0.05, 'Porcentaje 5%');
});

TestRunner.run('calcularBeneficioPorcentaje - división por cero', () => {
    const resultado = Calculadora.calcularBeneficioPorcentaje(50, 0);
    TestRunner.assertEqual(resultado, 0, 'División por cero devuelve 0');
});

TestRunner.run('calcularBeneficioCliente - caso básico', () => {
    // saldo 10000 * rentabilidad 0.02 = 200
    const resultado = Calculadora.calcularBeneficioCliente(10000, 0.02);
    TestRunner.assertEqual(resultado, 200, 'Beneficio cliente 2%');
});

TestRunner.run('calcularBeneficioCliente - saldo negativo', () => {
    const resultado = Calculadora.calcularBeneficioCliente(-1000, 0.02);
    TestRunner.assertEqual(resultado, 0, 'Saldo negativo devuelve 0');
});

TestRunner.run('calcularFA - caso básico', () => {
    const resultado = Calculadora.calcularFA(500, 200);
    TestRunner.assertEqual(resultado, 300, 'FA = inc - dec');
});

TestRunner.run('redistribuirImpFinal - proporcional a saldos', () => {
    const clientes = [
        { saldo: 6000 },  // 60%
        { saldo: 4000 }   // 40%
    ];
    const resultado = Calculadora.redistribuirImpFinal(10000, clientes);
    TestRunner.assertEqual(resultado[0], 6000, 'Cliente 1 recibe 60%');
    TestRunner.assertEqual(resultado[1], 4000, 'Cliente 2 recibe 40%');
});

TestRunner.run('redistribuirImpFinal - todos saldo cero', () => {
    const clientes = [{ saldo: 0 }, { saldo: 0 }];
    const resultado = Calculadora.redistribuirImpFinal(1000, clientes);
    TestRunner.assertEqual(resultado[0], 500, 'Distribución equitativa');
    TestRunner.assertEqual(resultado[1], 500, 'Distribución equitativa');
});

TestRunner.run('redistribuirImpFinal - array vacío', () => {
    const resultado = Calculadora.redistribuirImpFinal(1000, []);
    TestRunner.assertEqual(resultado.length, 0, 'Array vacío devuelve vacío');
});

// =============================================================================
// TESTS DE FECHAS
// =============================================================================

TestRunner.run('parsearFechaValor - formato DD/MM/YYYY', () => {
    const fecha = FechasUtils.parsearFechaValor('15/03/2026');
    TestRunner.assert(fecha instanceof Date, 'Devuelve Date');
    TestRunner.assertEqual(fecha.getDate(), 15, 'Día correcto');
    TestRunner.assertEqual(fecha.getMonth(), 2, 'Mes correcto (0-indexed)');
    TestRunner.assertEqual(fecha.getFullYear(), 2026, 'Año correcto');
});

TestRunner.run('parsearFechaValor - número Excel', () => {
    // 44927 es aproximadamente 01/01/2023 en Excel
    const fecha = FechasUtils.parsearFechaValor(44927);
    TestRunner.assert(fecha instanceof Date, 'Convierte número Excel');
});

TestRunner.run('parsearFechaValor - null/undefined', () => {
    TestRunner.assertEqual(FechasUtils.parsearFechaValor(null), null, 'null devuelve null');
    TestRunner.assertEqual(FechasUtils.parsearFechaValor(undefined), null, 'undefined devuelve null');
    TestRunner.assertEqual(FechasUtils.parsearFechaValor('FECHA'), null, 'FECHA devuelve null');
});

TestRunner.run('normalizarFechaKey - formato ISO', () => {
    const key = FechasUtils.normalizarFechaKey('15/03/2026');
    TestRunner.assertEqual(key, '2026-03-15', 'Formato ISO correcto');
});

TestRunner.run('esFinDeSemana - detecta correctamente', () => {
    const sabado = new Date(2026, 2, 14); // 14/03/2026 es sábado
    const domingo = new Date(2026, 2, 15); // 15/03/2026 es domingo
    const lunes = new Date(2026, 2, 16);
    
    TestRunner.assert(FechasUtils.esFinDeSemana(sabado), 'Sábado es fin de semana');
    TestRunner.assert(FechasUtils.esFinDeSemana(domingo), 'Domingo es fin de semana');
    TestRunner.assert(!FechasUtils.esFinDeSemana(lunes), 'Lunes no es fin de semana');
});

// =============================================================================
// TESTS DE NÚMEROS
// =============================================================================

TestRunner.run('formatearMoneda - caso básico', () => {
    const resultado = NumerosUtils.formatearMoneda(1234.56);
    TestRunner.assert(resultado.includes('1.234,56'), 'Formato español correcto');
    TestRunner.assert(resultado.includes('€'), 'Incluye símbolo euro');
});

TestRunner.run('formatearMoneda - valor no numérico', () => {
    TestRunner.assertEqual(NumerosUtils.formatearMoneda(null), '-', 'null devuelve -');
    TestRunner.assertEqual(NumerosUtils.formatearMoneda(NaN), '-', 'NaN devuelve -');
});

TestRunner.run('formatearPorcentaje - caso básico', () => {
    const resultado = NumerosUtils.formatearPorcentaje(0.0525, 2);
    TestRunner.assertEqual(resultado, '5.25%', 'Porcentaje formateado');
});

TestRunner.run('sonIguales - con tolerancia', () => {
    TestRunner.assert(NumerosUtils.sonIguales(1.00001, 1.00002, 0.0001), 'Valores muy cercanos');
    TestRunner.assert(!NumerosUtils.sonIguales(1.0, 1.1, 0.0001), 'Valores diferentes');
});

TestRunner.run('redondear - decimales', () => {
    TestRunner.assertEqual(NumerosUtils.redondear(1.2345, 2), 1.23, 'Redondeo a 2 decimales');
    TestRunner.assertEqual(NumerosUtils.redondear(1.2355, 2), 1.24, 'Redondeo hacia arriba');
});

// =============================================================================
// EJECUTAR Y MOSTRAR RESUMEN
// =============================================================================

console.log('\n🧪 EJECUTANDO TESTS DE CÁLCULOS CRÍTICOS');
console.log('='.repeat(50));

const todosOk = TestRunner.resumen();

if (typeof document !== 'undefined') {
    const container = document.getElementById('test-results');
    if (container) {
        container.innerHTML = `
            <h2>Resultados de Tests</h2>
            <p class="${todosOk ? 'success' : 'error'}">
                ✅ Pasados: ${TestRunner.passed} | ❌ Fallidos: ${TestRunner.failed}
            </p>
            <ul>
                ${TestRunner.results.map(r => `
                    <li class="${r.ok ? 'pass' : 'fail'}">
                        ${r.ok ? '✅' : '❌'} ${r.mensaje}
                    </li>
                `).join('')}
            </ul>
        `;
    }
}
