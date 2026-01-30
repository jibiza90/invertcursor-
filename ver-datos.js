// =============================================================================
// SCRIPT PARA VER DATOS EN TIEMPO REAL
// =============================================================================

function verDatosActuales() {
    console.log('🔍 VERIFICANDO DATOS ACTUALES DEL SISTEMA');
    
    // 1. Variables globales
    console.log('📊 VARIABLES GLOBALES:');
    console.log('  - clienteActual:', window.clienteActual);
    console.log('  - hojaActual:', window.hojaActual);
    console.log('  - datosEditados:', !!window.datosEditados);
    
    if (!window.datosEditados) {
        console.error('❌ No hay datosEditados');
        return;
    }
    
    // 2. Hoja actual
    const hoja = window.datosEditados.hojas[window.hojaActual];
    if (!hoja) {
        console.error('❌ No hay hoja:', window.hojaActual);
        return;
    }
    
    console.log('📁 HOJA ACTUAL:', window.hojaActual);
    console.log('  - Clientes en hoja:', Object.keys(hoja.clientes || {}).length);
    
    // 3. Cliente actual
    if (window.clienteActual === null || window.clienteActual === undefined) {
        console.error('❌ No hay cliente seleccionado');
        console.log('💡 Solución: Selecciona un cliente en el selector principal de arriba');
        return;
    }
    
    const cliente = hoja.clientes[window.clienteActual];
    if (!cliente) {
        console.error('❌ No existe el cliente:', window.clienteActual);
        return;
    }
    
    console.log('👤 CLIENTE ACTUAL:');
    console.log('  - Índice:', window.clienteActual);
    console.log('  - Número:', cliente.numero_cliente);
    
    // 4. Datos básicos del cliente
    const datosCliente = cliente.datos || {};
    console.log('📋 DATOS BÁSICOS:');
    console.log('  - Nombre:', datosCliente['NOMBRE']?.valor || 'SIN NOMBRE');
    console.log('  - Apellidos:', datosCliente['APELLIDOS']?.valor || 'SIN APELLIDOS');
    console.log('  - Email:', datosCliente['EMAIL']?.valor || 'SIN EMAIL');
    console.log('  - Saldo:', datosCliente['SALDO']?.valor || 'SIN SALDO');
    console.log('  - Teléfono:', datosCliente['TELEFONO']?.valor || 'SIN TELÉFONO');
    
    // 5. Datos diarios
    const datosDiarios = cliente.datos_diarios || [];
    console.log('📈 DATOS DIARIOS:');
    console.log('  - Total registros:', datosDiarios.length);
    
    if (datosDiarios.length > 0) {
        console.log('  - Primeros 3 registros:');
        datosDiarios.slice(0, 3).forEach((fila, i) => {
            console.log(`    ${i+1}. Fecha: ${fila.fecha}, Inc: ${fila.incremento}, Dec: ${fila.decremento}, Saldo: ${fila.saldo_diario}`);
        });
        
        // Contar incrementos y decrementos
        let totalInc = 0, totalDec = 0;
        datosDiarios.forEach(fila => {
            if (typeof fila.incremento === 'number' && fila.incremento > 0) totalInc += fila.incremento;
            if (typeof fila.decremento === 'number' && fila.decremento > 0) totalDec += fila.decremento;
        });
        console.log('  - 💰 Total incrementos:', totalInc);
        console.log('  - 💸 Total decrementos:', totalDec);
    }
    
    // 6. Probar cálculo de estadísticas
    console.log('🧮 PROBANDO CÁLCULO DE ESTADÍSTICAS...');
    if (window.calcularEstadisticasClienteTiempoReal) {
        window.calcularEstadisticasClienteTiempoReal(cliente, hoja)
            .then(datosEstadisticas => {
                console.log('✅ ESTADÍSTICAS CALCULADAS:');
                console.log('  - Meses:', datosEstadisticas.length);
                if (datosEstadisticas.length > 0) {
                    console.log('  - Primer mes:', datosEstadisticas[0]);
                    console.log('  - Último mes:', datosEstadisticas[datosEstadisticas.length - 1]);
                }
                
                // Probar KPIs
                if (window.calcularKPIsTiempoReal) {
                    const kpis = window.calcularKPIsTiempoReal(datosEstadisticas);
                    console.log('💎 KPIS CALCULADOS:');
                    console.log('  - Inversión inicial:', kpis.inversionInicial);
                    console.log('  - Saldo actual:', kpis.saldoActual);
                    console.log('  - Beneficio total:', kpis.beneficioTotal);
                    console.log('  - Rentabilidad total:', kpis.rentabilidadTotal);
                }
            })
            .catch(error => {
                console.error('❌ Error calculando estadísticas:', error);
            });
    } else {
        console.error('❌ No existe calcularEstadisticasClienteTiempoReal');
    }
    
    // 7. Verificar sistema de informes
    console.log('📄 SISTEMA DE INFORMES:');
    console.log('  - sistemaInformes disponible:', !!window.sistemaInformes);
    
    if (window.sistemaInformes) {
        console.log('  - Selector de informes:', document.getElementById('reportClientSelect')?.value);
        console.log('  - Botón generar:', !!document.getElementById('generateReportBtn'));
    }
    
    console.log('✅ VERIFICACIÓN COMPLETADA');
    console.log('💡 Si ves datos aquí, el problema está en la generación del PDF');
    console.log('💡 Si no ves datos, el problema está en la lectura de datos');
}

// Función para generar un PDF de prueba simple
function generarPDFPrueba() {
    console.log('🧪 GENERANDO PDF DE PRUEBA SIMPLE...');
    
    if (window.clienteActual === null || window.clienteActual === undefined) {
        console.error('❌ Selecciona un cliente primero');
        return;
    }
    
    const hoja = window.datosEditados.hojas[window.hojaActual];
    const cliente = hoja.clientes[window.clienteActual];
    const datosCliente = cliente.datos || {};
    
    // HTML simple con datos reales
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial; padding: 20px; background: white; color: black; }
                .header { text-align: center; border-bottom: 3px solid black; margin-bottom: 20px; }
                .section { margin: 20px 0; padding: 15px; border: 2px solid black; }
                th, td { border: 1px solid black; padding: 8px; }
                th { background: #f0f0f0; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📄 INFORME DE PRUEBA</h1>
                <p>Cliente: ${datosCliente['NOMBRE']?.valor || 'SIN NOMBRE'} ${datosCliente['APELLIDOS']?.valor || ''}</p>
                <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
            
            <div class="section">
                <h2>Datos del Cliente</h2>
                <table>
                    <tr><th>Campo</th><th>Valor</th></tr>
                    <tr><td>Nombre</td><td>${datosCliente['NOMBRE']?.valor || 'SIN DATO'}</td></tr>
                    <tr><td>Apellidos</td><td>${datosCliente['APELLIDOS']?.valor || 'SIN DATO'}</td></tr>
                    <tr><td>Email</td><td>${datosCliente['EMAIL']?.valor || 'SIN DATO'}</td></tr>
                    <tr><td>Saldo</td><td>${datosCliente['SALDO']?.valor || 'SIN DATO'}</td></tr>
                    <tr><td>Teléfono</td><td>${datosCliente['TELEFONO']?.valor || 'SIN DATO'}</td></tr>
                    <tr><th>Datos Diarios</th><td>${cliente.datos_diarios?.length || 0} registros</td></tr>
                </table>
            </div>
            
            <div class="section">
                <h2>Verificación</h2>
                <p>✅ HTML generado correctamente</p>
                <p>✅ Datos del cliente incluidos</p>
                <p>✅ Estilos aplicados</p>
            </div>
        </body>
        </html>
    `;
    
    // Convertir a PDF
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    
    setTimeout(() => {
        html2canvas(tempDiv, {
            scale: 2,
            backgroundColor: '#FFFFFF'
        }).then(canvas => {
            const pdf = new jspdf.jsPDF();
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            pdf.save('prueba_datos_cliente.pdf');
            document.body.removeChild(tempDiv);
            console.log('✅ PDF de prueba generado');
        }).catch(error => {
            console.error('❌ Error generando PDF de prueba:', error);
            document.body.removeChild(tempDiv);
        });
    }, 1000);
}

// Hacer funciones disponibles globalmente
window.verDatosActuales = verDatosActuales;
window.generarPDFPrueba = generarPDFPrueba;

console.log('🔍 Script de verificación cargado');
console.log('💡 Ejecuta: verDatosActuales() para ver los datos');
console.log('💡 Ejecuta: generarPDFPrueba() para generar PDF simple');
