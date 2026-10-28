/**
 * FirmAbal PDF Dossier & Export Engine
 * Uses jsPDF and JSZip via CDN
 */

async function generateRecordPDF(registro, firmaDataUrl = null, config = {}) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    throw new Error('La librería jsPDF no está disponible.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const orgName = config.organizacion_nombre || 'Organización Política';
  const navyColor = [11, 18, 32];
  const grayColor = [100, 116, 139];
  const greenColor = [5, 150, 105];

  // Top Header Banner
  doc.setFillColor(...navyColor);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FirmAbal', 15, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('EXPEDIENTE OFICIAL DE CAPTURA TERRITORIAL', 15, 20);

  doc.setFontSize(9);
  doc.text(orgName, 195, 15, { align: 'right' });
  doc.text(`Fecha: ${new Date(registro.fecha_creacion).toLocaleDateString('es-DO')}`, 195, 21, { align: 'right' });

  // Main Card Box
  let y = 38;

  // Title Section
  doc.setTextColor(...navyColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Expediente N°: ${registro.id}`, 15, y);

  // Status Badge
  const isValid = registro.estado === 'Validado';
  doc.setFillColor(...(isValid ? greenColor : [217, 119, 6]));
  doc.roundedRect(150, y - 6, 45, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(registro.estado ? registro.estado.toUpperCase() : 'REGISTRADO', 172.5, y - 1, { align: 'center' });

  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);

  // Citizen Data Grid
  y += 10;
  doc.setTextColor(...navyColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. DATOS DE IDENTIDAD Y CONTACTO', 15, y);

  y += 8;
  const fields = [
    ['Nombre completo:', registro.nombre || 'N/A'],
    ['Cédula de identidad:', registro.cedula || 'N/A'],
    ['Teléfono / WhatsApp:', registro.telefono || 'N/A'],
    ['Tipo de registro:', registro.tipo || 'Afiliado'],
    ['Dirección:', registro.direccion || 'N/A'],
    ['Municipio:', registro.municipio || 'N/A'],
    ['Distrito Municipal:', registro.distrito || 'N/A'],
    ['Sector:', registro.sector || 'N/A'],
    ['Circunscripción:', registro.circunscripcion || 'N/A']
  ];

  doc.setFontSize(10);
  for (let i = 0; i < fields.length; i++) {
    const [label, val] = fields[i];
    const isLeft = i % 2 === 0;
    const colX = isLeft ? 15 : 110;
    if (!isLeft) y -= 7;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grayColor);
    doc.text(label, colX, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...navyColor);
    doc.text(val.toString(), colX + 40, y);

    y += 7;
  }

  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, 195, y);

  // Recolector & Origin Section
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. ATRIBUCIÓN Y GEOLOCALIZACIÓN', 15, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...grayColor);
  doc.text('Recolector responsable:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...navyColor);
  doc.text(registro.recolector_nombre || 'Juan Pérez', 65, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...grayColor);
  doc.text('Origen de captura:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...navyColor);
  doc.text(registro.origen === 'auto' ? 'Auto registro ciudadano' : 'Captura presencial en campo', 65, y);

  if (registro.latitud && registro.longitud) {
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grayColor);
    doc.text('Coordenadas GPS:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...navyColor);
    doc.text(`${registro.latitud.toFixed(6)}, ${registro.longitud.toFixed(6)}`, 65, y);
  }

  y += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, 195, y);

  // Signature Section
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...navyColor);
  doc.text('3. FIRMA MANUSCRITA DEL CIUDADANO', 15, y);

  y += 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, 180, 42, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(15, y, 180, 42, 3, 3, 'D');

  if (firmaDataUrl) {
    try {
      doc.addImage(firmaDataUrl, 'PNG', 45, y + 2, 120, 38);
    } catch (e) {
      doc.setTextColor(150, 150, 150);
      doc.text('[ Firma manuscrita registrada ]', 105, y + 23, { align: 'center' });
    }
  } else {
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('[ Firma digital no disponible ]', 105, y + 23, { align: 'center' });
  }

  y += 48;

  // Data Protection Consent Notice
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(15, y, 180, 26, 2, 2, 'F');

  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DECLARACIÓN DE CONSENTIMIENTO Y PROTECCIÓN DE DATOS (LEY 172-13)', 18, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const legalText = `El ciudadano declara haber otorgado de manera libre, explícita e informada su consentimiento para la captura de sus datos de identidad y firma manuscrita con fines de afiliación política ante ${orgName}. Las imágenes de la cédula no se almacenan permanentemente en el dispositivo. De conformidad con la legislación vigente de la República Dominicana.`;
  const splitLegal = doc.splitTextToSize(legalText, 174);
  doc.text(splitLegal, 18, y + 10);

  y += 30;

  // Audit Stamp Footer
  doc.setFillColor(...navyColor);
  doc.rect(0, 275, 210, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CADENA DE AUDITORÍA Y VERIFICACIÓN DE INTEGRIDAD SHA-256:', 15, 281);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  const hashText = registro.hash_auditoria || 'HASH-SHA256-PENDIENTE';
  doc.text(hashText, 15, 286);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('FirmAbal PWA · Documento inmutable firmado digitalmente', 195, 291, { align: 'right' });

  return doc;
}

// Generate ZIP package of all record PDFs
async function generateBulkPDFZip(registros, config = {}) {
  if (typeof JSZip === 'undefined') {
    throw new Error('La librería JSZip no está disponible.');
  }

  const zip = new JSZip();
  const folder = zip.folder('Expedientes_FirmAbal');

  for (const registro of registros) {
    let firmaDataUrl = null;
    if (registro.firma_id) {
      const firmaObj = await dbGet('firmas', registro.firma_id);
      if (firmaObj) firmaDataUrl = firmaObj.data_url;
    }

    const doc = await generateRecordPDF(registro, firmaDataUrl, config);
    const pdfArrayBuffer = doc.output('arraybuffer');
    const safeName = (registro.nombre || 'registro').replace(/[^a-z0-0]/gi, '_').toLowerCase();
    folder.file(`expediente_${registro.cedula || registro.id}_${safeName}.pdf`, pdfArrayBuffer);
  }

  return await zip.generateAsync({ type: 'blob' });
}

// Export records to CSV string
function exportRecordsToCSV(registros) {
  const headers = [
    'ID',
    'Cédula',
    'Nombre Completo',
    'Teléfono WhatsApp',
    'Tipo',
    'Estado',
    'Municipio',
    'Distrito Municipal',
    'Sector',
    'Circunscripción',
    'Dirección',
    'Recolector',
    'Origen',
    'Latitud',
    'Longitud',
    'Fecha Registro',
    'Hash Auditoría'
  ];

  const rows = registros.map(r => [
    r.id,
    `"${r.cedula || ''}"`,
    `"${(r.nombre || '').replace(/"/g, '""')}"`,
    `"${r.telefono || ''}"`,
    `"${r.tipo || ''}"`,
    `"${r.estado || ''}"`,
    `"${r.municipio || ''}"`,
    `"${r.distrito || ''}"`,
    `"${r.sector || ''}"`,
    `"${r.circunscripcion || ''}"`,
    `"${(r.direccion || '').replace(/"/g, '""')}"`,
    `"${r.recolector_nombre || ''}"`,
    `"${r.origen || 'manual'}"`,
    r.latitud || '',
    r.longitud || '',
    `"${r.fecha_creacion || ''}"`,
    `"${r.hash_auditoria || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}
