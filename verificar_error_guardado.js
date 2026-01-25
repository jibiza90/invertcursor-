// Script para verificar el error de guardado
// El error puede ser porque el JSON es demasiado grande o hay algún problema de serialización

console.log("Verificando tamaño de datosEditados...");
try {
    const datosGuardados = localStorage.getItem('datosEditados');
    if (datosGuardados) {
        const sizeKB = new Blob([datosGuardados]).size / 1024;
        console.log(`Tamaño de datosEditados: ${sizeKB.toFixed(2)} KB`);
        console.log(`Límite de localStorage (típico): 5-10 MB`);
        
        if (sizeKB > 5000) {
            console.warn("⚠️ Los datos son muy grandes, puede causar problemas");
        }
        
        // Intentar parsear
        try {
            const parsed = JSON.parse(datosGuardados);
            console.log("✓ JSON válido");
        } catch (e) {
            console.error("✗ Error al parsear JSON:", e);
        }
    } else {
        console.log("No hay datos guardados en localStorage");
    }
} catch (e) {
    console.error("Error al verificar localStorage:", e);
}
