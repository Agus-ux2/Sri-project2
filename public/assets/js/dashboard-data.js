/**
 * DASHBOARD DATA LOADER
 * Carga datos reales desde el backend
 */

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
});

async function loadDashboardData() {
    const tableBody = document.getElementById('activityTableBody');
    if (!tableBody) return;

    try {
        // Mostrar loading
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">⏳ Cargando actividad reciente...</td></tr>';

        const response = await fetch('/api/documents', {
            headers: { 'Authorization': `Bearer ${Session.getToken()}` }
        });

        if (!response.ok) throw new Error('Error cargando documentos');

        const data = await response.json();
        const documents = data.documents || [];

        renderTable(documents);

    } catch (error) {
        console.error('Error dashboard:', error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: red;">Error cargando datos. <button onclick="loadDashboardData()">Reintentar</button></td></tr>';
    }
}

function renderTable(documents) {
    const tableBody = document.getElementById('activityTableBody');

    if (documents.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color: #64748b;">No hay documentos procesados aún. <br><a href="/dashboard/upload.html" style="color: #00a859; font-weight: bold;">Subir mi primer documento</a></td></tr>';
        return;
    }

    tableBody.innerHTML = documents.map(doc => {
        const date = new Date(doc.created_at).toLocaleDateString('es-AR');

        let typeClass = 'doc-cp';
        let typeName = 'Carta de Porte';
        if (doc.original_name.toLowerCase().includes('ced') || doc.original_name.toLowerCase().includes('calidad')) {
            typeClass = 'doc-ced';
            typeName = 'Análisis / CED';
        }

        // Datos extraídos del OCR (si existen)
        let product = '---';
        let reference = '---';

        if (doc.ocr_data && doc.ocr_data.datos) {
            const prodField = doc.ocr_data.datos.find(f => f.label.includes('Producto'));
            if (prodField) product = prodField.value;

            const refField = doc.ocr_data.datos.find(f => f.label.includes('CPE') || f.label.includes('CTG') || f.label.includes('Numero'));
            if (refField) reference = refField.value;
        }

        // Estado
        let statusHtml = '<span class="status-ok" style="color: #64748b;">Pendiente</span>';
        if (doc.ocr_status === 'completed') statusHtml = '<span class="status-ok">Procesado</span>';
        if (doc.ocr_status === 'failed') statusHtml = '<span class="status-ok" style="color: #ef4444 !important;">Error</span>';

        return `
            <tr>
                <td>${date}</td>
                <td><span class="doc-pill ${typeClass}">${typeName}</span></td>
                <td style="font-family: monospace; font-weight: 700;">${reference}</td>
                <td>${product}</td>
                <td>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        ${statusHtml}
                        <a href="${doc.file_path || '#'}" target="_blank" title="Ver Original" style="text-decoration: none; font-size: 1.2rem;">📄</a>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
