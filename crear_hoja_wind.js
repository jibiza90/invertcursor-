// Script para crear la hoja Diario WIND en datos_editados.json
const fs = require('fs');
const path = require('path');

const rutaDatos = path.join(__dirname, 'datos_editados.json');

console.log('Cargando datos...');
const datos = JSON.parse(fs.readFileSync(rutaDatos, 'utf-8'));

// Si ya existe, borrarla para recrearla con 100 clientes
if (datos.hojas['Diario WIND']) {
    console.log('Eliminando hoja Diario WIND existente para recrearla...');
    delete datos.hojas['Diario WIND'];
}

console.log('Creando hoja Diario WIND...');

// Crear estructura base copiando de Diario STD
const hojaSTD = datos.hojas['Diario STD'];

// Crear datos_generales (filas 3-6 de resumen)
const datosGenerales = [
    {
        fila: 3,
        fecha: "2026-01-01 00:00:00",
        imp_inicial: 0,
        imp_final: 0,
        benef_euro: "TOTAL € INVERSION",
        benef_porcentaje: null,
        benef_euro_acum: null,
        benef_porcentaje_acum: null,
        bloqueadas: {
            imp_inicial: true,
            imp_final: true,
            benef_euro: false,
            benef_porcentaje: false,
            benef_euro_acum: false,
            benef_porcentaje_acum: false
        },
        formulas: {
            imp_inicial: "=AEO11",
            imp_final: "=AEO1124"
        }
    },
    {
        fila: 4,
        fecha: "2026-01-02 00:00:00",
        imp_inicial: 0,
        imp_final: 0,
        benef_euro: "TOTAL € INVERSION+BENEFICIOS",
        benef_porcentaje: null,
        benef_euro_acum: null,
        benef_porcentaje_acum: null,
        bloqueadas: {
            imp_inicial: true,
            imp_final: true,
            benef_euro: false,
            benef_porcentaje: false,
            benef_euro_acum: false,
            benef_porcentaje_acum: false
        },
        formulas: {
            imp_inicial: "=AEO8",
            imp_final: "=SUM(AEM15:AEM1120)-SUM(AEN15:AEN1120)+AEO1128"
        }
    },
    {
        fila: 5,
        fecha: null,
        imp_inicial: 0,
        imp_final: 0,
        benef_euro: "TOTAL € BENEFICIO",
        benef_porcentaje: null,
        benef_euro_acum: null,
        benef_porcentaje_acum: null,
        bloqueadas: {
            imp_inicial: true,
            imp_final: true,
            benef_euro: false,
            benef_porcentaje: false,
            benef_euro_acum: false,
            benef_porcentaje_acum: false
        },
        formulas: {
            imp_inicial: "=SUBTOTAL(9,G17:G1120)",
            imp_final: "=AEO1128"
        }
    },
    {
        fila: 6,
        fecha: null,
        imp_inicial: 0,
        imp_final: 0,
        benef_euro: "TOTAL % BENEFICIO",
        benef_porcentaje: null,
        benef_euro_acum: null,
        benef_porcentaje_acum: null,
        bloqueadas: {
            imp_inicial: true,
            imp_final: true,
            benef_euro: false,
            benef_porcentaje: false,
            benef_euro_acum: false,
            benef_porcentaje_acum: false
        },
        formulas: {
            imp_inicial: "=IF(E3<>0,E5/E3,0)",
            imp_final: "=IF(F3<>0,F5/F3,0)"
        }
    }
];

// Crear datos_diarios_generales (filas 15-1120, cada día tiene 3 filas)
const datosDiariosGenerales = [];
let fechaBase = new Date('2026-01-01');

for (let fila = 15; fila <= 1120; fila += 3) {
    const fechaStr = fechaBase.toISOString().replace('T', ' ').split('.')[0];
    
    // Fila 1 del día: imp_inicial
    datosDiariosGenerales.push({
        fila: fila,
        fecha: fechaStr,
        imp_inicial: null,
        imp_final: null,
        benef_euro: null,
        benef_porcentaje: null,
        benef_euro_acum: null,
        benef_porcentaje_acum: null,
        bloqueadas: {
            imp_inicial: true,
            imp_final: true,
            benef_euro: true,
            benef_porcentaje: true,
            benef_euro_acum: true,
            benef_porcentaje_acum: true
        },
        formulas: fila === 15 ? { imp_inicial: "=AEO16" } : { imp_inicial: `=F${fila-3}+AEO${fila+1}` }
    });
    
    // Fila 2 del día: vacía
    datosDiariosGenerales.push({
        fila: fila + 1,
        fecha: fechaStr,
        imp_inicial: null,
        imp_final: null,
        benef_euro: null,
        benef_porcentaje: null,
        benef_euro_acum: null,
        benef_porcentaje_acum: null,
        bloqueadas: {
            imp_inicial: false,
            imp_final: true,
            benef_euro: true,
            benef_porcentaje: true,
            benef_euro_acum: true,
            benef_porcentaje_acum: true
        },
        formulas: {}
    });
    
    // Fila 3 del día: imp_final y beneficios
    datosDiariosGenerales.push({
        fila: fila + 2,
        fecha: fechaStr,
        imp_inicial: null,
        imp_final: null,
        benef_euro: null,
        benef_porcentaje: null,
        benef_euro_acum: null,
        benef_porcentaje_acum: null,
        bloqueadas: {
            imp_inicial: false,
            imp_final: false,
            benef_euro: true,
            benef_porcentaje: true,
            benef_euro_acum: true,
            benef_porcentaje_acum: true
        },
        formulas: {
            benef_euro: `=IF(F${fila+2}<>0,F${fila+2}-E${fila},0)`,
            benef_porcentaje: `=IF(G${fila+2}<>0,((G${fila+2}/E${fila})/1),0)`,
            benef_euro_acum: `=IF(F${fila+2}<>0,G${fila+2},0)`,
            benef_porcentaje_acum: `=IF(F${fila+2}<>0,(I${fila+2}/F3),0)`
        }
    });
    
    // Avanzar al siguiente día
    fechaBase.setDate(fechaBase.getDate() + 1);
}

// Crear clientes vacíos (100 clientes como en las otras hojas)
const clientes = [];
for (let i = 1; i <= 100; i++) {
    const cliente = {
        numero_cliente: i,
        datos: {
            "NOMBRE": { valor: "" },
            "APELLIDOS": { valor: "" },
            "EMAIL": { valor: "" },
            "TELEFONO": { valor: "" },
            "GARANTIA": { valor: null }
        },
        datos_diarios: [],
        incrementos_total: 0,
        decrementos_total: 0
    };
    
    // Crear datos_diarios para cada fila
    fechaBase = new Date('2026-01-01');
    for (let fila = 15; fila <= 1120; fila += 3) {
        const fechaStr = fechaBase.toISOString().replace('T', ' ').split('.')[0];
        
        // Fila 1 del día
        cliente.datos_diarios.push({
            fila: fila,
            fecha: fechaStr,
            incremento: null,
            decremento: null,
            base: null,
            saldo_diario: null,
            beneficio_diario: null,
            beneficio_acumulado: null,
            beneficio_diario_pct: null,
            beneficio_acumulado_pct: null
        });
        
        // Fila 2 del día
        cliente.datos_diarios.push({
            fila: fila + 1,
            fecha: fechaStr,
            incremento: null,
            decremento: null,
            base: null,
            saldo_diario: null,
            beneficio_diario: null,
            beneficio_acumulado: null,
            beneficio_diario_pct: null,
            beneficio_acumulado_pct: null
        });
        
        // Fila 3 del día
        cliente.datos_diarios.push({
            fila: fila + 2,
            fecha: fechaStr,
            incremento: null,
            decremento: null,
            base: null,
            saldo_diario: null,
            beneficio_diario: null,
            beneficio_acumulado: null,
            beneficio_diario_pct: null,
            beneficio_acumulado_pct: null
        });
        
        fechaBase.setDate(fechaBase.getDate() + 1);
    }
    
    clientes.push(cliente);
}

// Crear la hoja Diario WIND
datos.hojas['Diario WIND'] = {
    nombre: 'Diario WIND',
    datos_generales: datosGenerales,
    datos_diarios_generales: datosDiariosGenerales,
    clientes: clientes
};

console.log('Guardando datos...');
fs.writeFileSync(rutaDatos, JSON.stringify(datos, null, 2), 'utf-8');

console.log('✅ Hoja Diario WIND creada correctamente');
console.log(`   - ${datosGenerales.length} filas de datos generales`);
console.log(`   - ${datosDiariosGenerales.length} filas de datos diarios`);
console.log(`   - ${clientes.length} clientes`);
