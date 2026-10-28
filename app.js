/**
 * FirmAbal Main Application Controller
 */

let sigPad = null;
let currentCapturaStep = 1;
let selectedRecordForDetail = null;
let selectedFirmaForDetail = null;
let activeRecolectorId = 'rec-1';

// Step 2 Form Locks State
let isCedulaLocked = false;
let capturedFrontDataUrl = null;
let capturedBackDataUrl = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[App] Initializing FirmAbal PWA...');

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] Registered successfully scope:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  }

  // Mount SVG Icons
  mountIcons();

  // Initialize DB & Seed Demo Data
  await API.seedInitialData();

  // Initialize Signature Canvas
  sigPad = new SignaturePad('canvas-signature');

  // Check URL Params for Citizen Auto-Registration Mode (?ref=ID_RECOLECTOR&modo=auto)
  const urlParams = new URLSearchParams(window.location.search);
  const refParam = urlParams.get('ref');
  const modoParam = urlParams.get('modo');

  if (modoParam === 'auto') {
    if (refParam) activeRecolectorId = refParam;
    setupCitizenAutoMode();
  }

  // Attach All Event Listeners
  attachEventListeners();

  // Load Initial Screen (Inicio)
  await loadScreen('inicio');
});

// Setup Citizen Auto Registration Mode
function setupCitizenAutoMode() {
  showToast('Modo Auto Registro Activado');
  const screenHeader = document.querySelector('#screen-inicio .screen-header');
  if (screenHeader) {
    screenHeader.innerHTML = `
      <h1 class="screen-title">Auto Registro Ciudadano</h1>
      <p class="screen-subtitle">Complete su información y firma manuscrita para afiliarse</p>
    `;
  }
}

// Attach Event Listeners
function attachEventListeners() {
  // Navigation Tabs (Mobile & Desktop)
  document.querySelectorAll('[data-target]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetScreen = btn.getAttribute('data-target');
      if (targetScreen) {
        loadScreen(targetScreen);
        closeAllSheets();
      }
    });
  });

  // Open Menu Sheet Button
  const btnOpenMenu = document.getElementById('btn-open-menu-sheet');
  if (btnOpenMenu) {
    btnOpenMenu.addEventListener('click', () => openSheet('modal-backdrop-menu'));
  }

  // Open Auto Registro Share Sheet Button
  const btnOpenAuto = document.getElementById('btn-open-auto-registro');
  if (btnOpenAuto) {
    btnOpenAuto.addEventListener('click', () => openSheet('modal-backdrop-auto'));
  }

  // Close Sheet X Buttons
  document.querySelectorAll('.btn-close-sheet, .modal-backdrop').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('.btn-close-sheet')) {
        closeAllSheets();
      }
    });
  });

  // ESC Key closes sheets
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllSheets();
  });

  // Share Sheet Actions
  const btnShareWA = document.getElementById('btn-share-wa');
  if (btnShareWA) {
    btnShareWA.addEventListener('click', () => {
      const shareUrl = `${window.location.origin}${window.location.pathname}?ref=${activeRecolectorId}&modo=auto`;
      const text = `Hola, regístrate en FirmAbal usando este enlace de afiliación: ${shareUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    });
  }

  const btnCopyLink = document.getElementById('btn-copy-auto-link');
  if (btnCopyLink) {
    btnCopyLink.addEventListener('click', () => {
      const shareUrl = `${window.location.origin}${window.location.pathname}?ref=${activeRecolectorId}&modo=auto`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('¡Enlace copiado al portapapeles!');
      });
    });
  }

  // Meta Target Save Button
  const btnSaveMeta = document.getElementById('btn-save-meta');
  if (btnSaveMeta) {
    btnSaveMeta.addEventListener('click', async () => {
      const val = parseInt(document.getElementById('input-meta-val').value, 10);
      if (val > 0) {
        await API.saveConfiguracion({ meta_captura: val });
        showToast('Meta de captura actualizada');
        await renderInicioScreen();
      }
    });
  }

  // CAPTURA STEP WIZARD LISTENERS

  // Step 1: WhatsApp Input Mask & Next
  const inputWhatsApp = document.getElementById('input-cap-whatsapp');
  if (inputWhatsApp) {
    inputWhatsApp.addEventListener('input', (e) => {
      e.target.value = formatPhone(e.target.value);
    });
  }

  const btnPaso1Next = document.getElementById('btn-paso-1-next');
  if (btnPaso1Next) {
    btnPaso1Next.addEventListener('click', () => {
      const waVal = document.getElementById('input-cap-whatsapp').value;
      if (!validateDominicanPhone(waVal)) {
        showToast('Por favor ingrese un número de WhatsApp válido (809/829/849)');
        return;
      }
      setCapturaStep(2);
    });
  }

  // Step 2: Cédula Camera Uploads & Input Mask & OCR
  const fileFront = document.getElementById('file-front-cam');
  const btnTriggerFront = document.getElementById('btn-trigger-front');
  if (btnTriggerFront && fileFront) {
    btnTriggerFront.addEventListener('click', () => fileFront.click());
    fileFront.addEventListener('change', (e) => handleImageUpload(e, 'box-front-preview', (dataUrl) => {
      capturedFrontDataUrl = dataUrl;
    }));
  }

  const fileBack = document.getElementById('file-back-cam');
  const btnTriggerBack = document.getElementById('btn-trigger-back');
  if (btnTriggerBack && fileBack) {
    btnTriggerBack.addEventListener('click', () => fileBack.click());
    fileBack.addEventListener('change', (e) => handleImageUpload(e, 'box-back-preview', (dataUrl) => {
      capturedBackDataUrl = dataUrl;
    }));
  }

  const btnRunOCR = document.getElementById('btn-run-ocr');
  if (btnRunOCR) {
    btnRunOCR.addEventListener('click', async () => {
      if (!capturedFrontDataUrl) {
        showToast('Capture la foto frontal de la cédula para escanear');
        return;
      }
      showToast('Escanear datos con OCR...');
      try {
        const parsed = await performCedulaOCR(capturedFrontDataUrl);
        if (parsed.cedula) {
          document.getElementById('input-cap-cedula').value = parsed.cedula;
          lockCedulaField(true);
        }
        if (parsed.nombre) {
          document.getElementById('input-cap-nombre').value = `${parsed.nombre} ${parsed.apellidos}`.trim();
        }
        showToast('Datos extraídos correctamente');
      } catch (e) {
        showToast('No se pudo procesar con OCR. Ingrese los datos manualmente.');
      }
    });
  }

  const inputCedula = document.getElementById('input-cap-cedula');
  const cedulaValidationMsg = document.getElementById('cedula-validation-msg');
  if (inputCedula) {
    inputCedula.addEventListener('input', (e) => {
      e.target.value = formatCedula(e.target.value);
      const isValid = validateDominicanCedula(e.target.value);
      if (e.target.value.replace(/\D/g, '').length === 11) {
        if (isValid) {
          cedulaValidationMsg.innerHTML = '<span style="color:var(--color-green); font-weight:700;">✓ Cédula válida JCE (Módulo 10)</span>';
        } else {
          cedulaValidationMsg.innerHTML = '<span style="color:var(--color-red); font-weight:700;">✕ Dígito verificador JCE inválido</span>';
        }
      } else {
        cedulaValidationMsg.innerHTML = '';
      }
    });
  }

  const btnCorregirManual = document.getElementById('btn-corregir-manual');
  if (btnCorregirManual) {
    btnCorregirManual.addEventListener('click', () => {
      if (confirm('¿Desea desbloquear la cédula para corregirla manualmente?')) {
        lockCedulaField(false);
      }
    });
  }

  const btnPaso2Next = document.getElementById('btn-paso-2-next');
  if (btnPaso2Next) {
    btnPaso2Next.addEventListener('click', () => {
      const cedVal = document.getElementById('input-cap-cedula').value;
      const nomVal = document.getElementById('input-cap-nombre').value;

      if (!cedVal || !nomVal) {
        showToast('Complete la cédula y el nombre del ciudadano');
        return;
      }

      // Open Data Protection Consent Modal
      openSheet('modal-backdrop-consentimiento');
    });
  }

  // Data Protection Consent Sheet Listeners
  const btnConsentAccept = document.getElementById('btn-consent-accept');
  const chkConsent = document.getElementById('chk-consent-accept');
  if (btnConsentAccept && chkConsent) {
    btnConsentAccept.addEventListener('click', () => {
      if (!chkConsent.checked) {
        showToast('El ciudadano debe aceptar el consentimiento para continuar');
        return;
      }
      closeSheet('modal-backdrop-consentimiento');
      setCapturaStep(3);
    });
  }

  const btnConsentDecline = document.getElementById('btn-consent-decline');
  if (btnConsentDecline) {
    btnConsentDecline.addEventListener('click', () => {
      closeSheet('modal-backdrop-consentimiento');
      showToast('Captura cancelada: El ciudadano no aceptó el tratamiento de datos.');
    });
  }

  // Step 3: Signature Pad Controls & Next
  const btnSigClear = document.getElementById('btn-sig-clear');
  if (btnSigClear) {
    btnSigClear.addEventListener('click', () => sigPad.clear());
  }

  const btnSigUndo = document.getElementById('btn-sig-undo');
  if (btnSigUndo) {
    btnSigUndo.addEventListener('click', () => sigPad.undo());
  }

  const btnPaso3Next = document.getElementById('btn-paso-3-next');
  if (btnPaso3Next) {
    btnPaso3Next.addEventListener('click', () => {
      if (sigPad.isEmpty()) {
        showToast('Por favor, solicite la firma del ciudadano antes de continuar');
        return;
      }
      updateSummaryStep4();
      setCapturaStep(4);
    });
  }

  // Step 4: Final Save Record Button
  const btnSaveFinal = document.getElementById('btn-save-final-registro');
  if (btnSaveFinal) {
    btnSaveFinal.addEventListener('click', async () => {
      const wa = document.getElementById('input-cap-whatsapp').value;
      const ced = document.getElementById('input-cap-cedula').value;
      const nom = document.getElementById('input-cap-nombre').value;
      const tipo = document.getElementById('select-cap-tipo').value;
      const mun = document.getElementById('select-cap-municipio').value;
      const sec = document.getElementById('input-cap-sector').value;

      const signatureDataUrl = sigPad.toDataURL();

      // Get optional geolocation
      let lat = null, lng = null;
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {
        console.warn('Geolocation omitted or blocked');
      }

      const recObj = await API.saveRegistro(
        {
          cedula: ced,
          nombre: nom,
          telefono: wa,
          tipo: tipo,
          municipio: mun,
          sector: sec,
          latitud: lat,
          longitud: lng,
          recolector_id: activeRecolectorId
        },
        signatureDataUrl,
        capturedFrontDataUrl,
        capturedBackDataUrl
      );

      showToast(`¡Registro guardado correctamente! (${recObj.estado})`);
      resetCapturaWizard();
      await loadScreen('inicio');
    });
  }

  // REGISTROS SEARCH & FILTER CHIPS
  const searchInput = document.getElementById('search-registros');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderRegistrosScreen());
  }

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderRegistrosScreen();
    });
  });

  // DETAIL SHEET ACTIONS
  const btnDetPDF = document.getElementById('btn-det-download-pdf');
  if (btnDetPDF) {
    btnDetPDF.addEventListener('click', async () => {
      if (!selectedRecordForDetail) return;
      showToast('Generando PDF del expediente...');
      let firmaDataUrl = null;
      if (selectedRecordForDetail.firma_id) {
        const fObj = await dbGet('firmas', selectedRecordForDetail.firma_id);
        if (fObj) firmaDataUrl = fObj.data_url;
      }
      const config = await API.getConfiguracion();
      const doc = await generateRecordPDF(selectedRecordForDetail, firmaDataUrl, config);
      doc.save(`expediente_${selectedRecordForDetail.cedula}.pdf`);
      showToast('PDF descargado');
    });
  }

  const btnDetDelete = document.getElementById('btn-det-delete');
  if (btnDetDelete) {
    btnDetDelete.addEventListener('click', async () => {
      if (!selectedRecordForDetail) return;
      if (confirm(`¿Eliminar el registro de ${selectedRecordForDetail.nombre}?`)) {
        await API.deleteRegistro(selectedRecordForDetail.id);
        showToast('Registro eliminado');
        closeSheet('modal-backdrop-registro-detail');
        await renderRegistrosScreen();
      }
    });
  }

  // FIRMA DETAIL SHEET PDF
  const btnFirmaPDF = document.getElementById('btn-firma-download-pdf');
  if (btnFirmaPDF) {
    btnFirmaPDF.addEventListener('click', async () => {
      if (!selectedFirmaForDetail || !selectedFirmaForDetail.registro) return;
      showToast('Generando PDF...');
      const config = await API.getConfiguracion();
      const doc = await generateRecordPDF(selectedFirmaForDetail.registro, selectedFirmaForDetail.data_url, config);
      doc.save(`expediente_${selectedFirmaForDetail.registro.cedula}.pdf`);
      showToast('PDF descargado');
    });
  }

  // AUDIT INTEGRITY BUTTON
  const btnVerifyAudit = document.getElementById('btn-verify-audit');
  if (btnVerifyAudit) {
    btnVerifyAudit.addEventListener('click', async () => {
      const res = await verifyAuditIntegrity();
      const badge = document.getElementById('audit-status-badge');
      if (res.valido) {
        badge.innerHTML = `<span style="color:var(--color-green); font-weight:700;">✓ ${res.mensaje}</span>`;
        showToast('Integridad de la cadena SHA-256 verificada sin alteraciones.');
      } else {
        badge.innerHTML = `<span style="color:var(--color-red); font-weight:700;">✕ ${res.mensaje}</span>`;
        showToast('ADVERTENCIA: Se detectó alteración en los registros de auditoría');
      }
    });
  }

  // EXPORTATION BUTTONS
  const btnExportCSV = document.getElementById('btn-export-csv');
  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', async () => {
      const registros = await API.getRegistros();
      const blob = exportRecordsToCSV(registros);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `padron_firmabal_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      showToast('CSV descargado');
    });
  }

  const btnExportZIP = document.getElementById('btn-export-zip-pdf');
  if (btnExportZIP) {
    btnExportZIP.addEventListener('click', async () => {
      showToast('Generando paquete ZIP con todos los PDFs...');
      const registros = await API.getRegistros();
      const config = await API.getConfiguracion();
      const zipBlob = await generateBulkPDFZip(registros, config);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expedientes_firmabal_${new Date().toISOString().slice(0,10)}.zip`;
      a.click();
      showToast('Paquete ZIP descargado');
    });
  }

  // CONFIGURATION BUTTONS
  const btnSaveConfig = document.getElementById('btn-save-config');
  if (btnSaveConfig) {
    btnSaveConfig.addEventListener('click', async () => {
      const org = document.getElementById('cfg-org-nombre').value;
      const meta = parseInt(document.getElementById('cfg-meta-input').value, 10);
      const conservar = document.getElementById('cfg-conservar-fotos').checked;

      await API.saveConfiguracion({
        organizacion_nombre: org,
        meta_captura: meta,
        conservar_imagenes: conservar
      });

      showToast('Configuración guardada correctamente');
    });
  }

  const btnDeleteDemo = document.getElementById('btn-delete-demo-data');
  if (btnDeleteDemo) {
    btnDeleteDemo.addEventListener('click', async () => {
      if (confirm('¿Desea borrar todos los registros de prueba demostrativos?')) {
        const count = await API.deleteDemoData();
        showToast(`Se borraron ${count} registros demo`);
        await loadScreen('inicio');
      }
    });
  }

  const btnWipeAll = document.getElementById('btn-wipe-all');
  if (btnWipeAll) {
    btnWipeAll.addEventListener('click', async () => {
      if (confirm('ATENCIÓN: ¿Desea borrar TODOS los datos y restablecer la aplicación?')) {
        await API.wipeAllData();
        await API.seedInitialData();
        showToast('Base de datos restablecida');
        await loadScreen('inicio');
      }
    });
  }
}

// Image File Reader Handler
function handleImageUpload(e, previewBoxId, onDataUrl) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target.result;
    const box = document.getElementById(previewBoxId);
    if (box) {
      box.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
    }
    if (onDataUrl) onDataUrl(dataUrl);
  };
  reader.readAsDataURL(file);
}

// Lock / Unlock Cédula field
function lockCedulaField(lock) {
  const input = document.getElementById('input-cap-cedula');
  const lockIcon = document.getElementById('cedula-lock-icon');
  if (input) {
    input.readOnly = lock;
    if (lockIcon) lockIcon.style.display = lock ? 'block' : 'none';
  }
}

// Update Step 4 Resumen
function updateSummaryStep4() {
  document.getElementById('summary-cedula').innerText = document.getElementById('input-cap-cedula').value || '—';
  document.getElementById('summary-nombre').innerText = document.getElementById('input-cap-nombre').value || '—';
  document.getElementById('summary-whatsapp').innerText = document.getElementById('input-cap-whatsapp').value || '—';
}

// Captura Step Wizard Manager
function setCapturaStep(stepNum) {
  currentCapturaStep = stepNum;

  for (let i = 1; i <= 4; i++) {
    const page = document.getElementById(`captura-paso-${i}`);
    const seg = document.getElementById(`seg-${i}`);
    if (page) page.style.display = (i === stepNum) ? 'block' : 'none';
    if (seg) {
      if (i <= stepNum) seg.classList.add('active');
      else seg.classList.remove('active');
    }
  }

  const titles = [
    'Paso 1 de 4 · Configurar',
    'Paso 2 de 4 · Cédula & OCR',
    'Paso 3 de 4 · Firma Manuscrita',
    'Paso 4 de 4 · Confirmar'
  ];
  document.getElementById('wizard-step-title').innerText = titles[stepNum - 1];

  if (stepNum === 3 && sigPad) {
    setTimeout(() => sigPad.initCanvas(), 100);
  }
}

function resetCapturaWizard() {
  document.getElementById('input-cap-whatsapp').value = '';
  document.getElementById('input-cap-cedula').value = '';
  document.getElementById('input-cap-nombre').value = '';
  document.getElementById('input-cap-fNac').value = '';
  document.getElementById('box-front-preview').innerHTML = `<span id="front-cam-icon-slot">${getIcon('camara', 24)}</span><span style="font-size:11px; color:var(--text-muted);">Foto Frontal</span>`;
  document.getElementById('box-back-preview').innerHTML = `<span id="back-cam-icon-slot">${getIcon('camara', 24)}</span><span style="font-size:11px; color:var(--text-muted);">Foto Reverso</span>`;
  capturedFrontDataUrl = null;
  capturedBackDataUrl = null;
  lockCedulaField(false);
  if (sigPad) sigPad.clear();
  setCapturaStep(1);
}

// Screen Router & Loader
async function loadScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.add('active');

  // Update navigation active state
  document.querySelectorAll('[data-target]').forEach(b => {
    if (b.getAttribute('data-target') === screenId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  // Screen specific rendering logic
  if (screenId === 'inicio') await renderInicioScreen();
  else if (screenId === 'registros') await renderRegistrosScreen();
  else if (screenId === 'firmas') await renderFirmasScreen();
  else if (screenId === 'monitor') await renderMonitorScreen();
  else if (screenId === 'recolectores') await renderRecolectoresScreen();
  else if (screenId === 'auditoria') await renderAuditoriaScreen();
  else if (screenId === 'configuracion') await renderConfiguracionScreen();
}

// Render Screen 1: Inicio
async function renderInicioScreen() {
  const m = await API.getMetrics();

  document.getElementById('metric-total').innerText = m.total;
  document.getElementById('metric-hoy').innerText = m.hoy;
  document.getElementById('metric-pendientes').innerText = m.pendientes;
  document.getElementById('metric-duplicados').innerText = m.duplicados;
  document.getElementById('metric-auto').innerText = m.autoRegistros;
  document.getElementById('metric-recolectores').innerText = m.recolectores;

  // Target / Progress Bar
  const pct = Math.min(100, Math.round((m.total / m.meta) * 100));
  document.getElementById('input-meta-val').value = m.meta;
  document.getElementById('meta-progress-fill').style.width = `${pct}%`;
  document.getElementById('meta-progress-label').innerText = `${m.total} / ${m.meta} capturados`;
  document.getElementById('meta-progress-percent').innerText = `${pct}%`;

  // Render Bar Chart
  renderBarChart('chart-container', m.chartDays);
}

// Render Screen 3: Registros List
async function renderRegistrosScreen() {
  const container = document.getElementById('list-registros-container');
  if (!container) return;

  const searchVal = document.getElementById('search-registros').value;
  const activeChip = document.querySelector('.filter-chip.active');
  const statusFilter = activeChip ? activeChip.getAttribute('data-filter-status') : 'Todos';

  const list = await API.getRegistros({ search: searchVal, estado: statusFilter });

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
        <div style="margin-bottom:8px;">${getIcon('usuarios', 36)}</div>
        <div style="font-weight:700; font-size:15px; color:var(--text-primary);">No hay registros encontrados</div>
        <div style="font-size:13px; margin-top:4px;">Intente cambiar la búsqueda o el filtro</div>
      </div>
    `;
    return;
  }

  let html = '';
  for (const r of list) {
    const chipCls = r.estado === 'Validado' ? 'chip-validado' : (r.estado === 'Duplicado' ? 'chip-duplicado' : 'chip-pendiente');
    const initial = (r.nombre || 'C').charAt(0).toUpperCase();

    html += `
      <div class="record-item" data-reg-id="${r.id}">
        <div class="record-left">
          <div class="avatar-circle">${initial}</div>
          <div>
            <div class="record-name">${r.nombre}</div>
            <div class="record-sub">${r.cedula} · ${r.sector || 'S/N'}</div>
          </div>
        </div>
        <span class="chip ${chipCls}">${r.estado}</span>
      </div>
    `;
  }

  container.innerHTML = html;

  // Attach click listener for opening Detail Sheet
  container.querySelectorAll('.record-item').forEach(el => {
    el.addEventListener('click', async () => {
      const id = el.getAttribute('data-reg-id');
      const reg = await API.getRegistroById(id);
      if (reg) openRegistroDetailSheet(reg);
    });
  });
}

// Open Detail Sheet for Citizen
async function openRegistroDetailSheet(reg) {
  selectedRecordForDetail = reg;

  document.getElementById('det-reg-nombre').innerText = reg.nombre;
  document.getElementById('det-reg-tipo').innerText = reg.tipo || 'Afiliado';

  const estadoBadge = document.getElementById('det-reg-estado');
  estadoBadge.innerText = reg.estado;
  estadoBadge.className = `chip ${reg.estado === 'Validado' ? 'chip-validado' : (reg.estado === 'Duplicado' ? 'chip-duplicado' : 'chip-pendiente')}`;

  // Get Firma Canvas Preview
  let firmaDataUrl = null;
  if (reg.firma_id) {
    const fObj = await dbGet('firmas', reg.firma_id);
    if (fObj) firmaDataUrl = fObj.data_url;
  }

  const rows = [
    { icon: 'usuarios', label: 'NOMBRE COMPLETO', val: reg.nombre },
    { icon: 'candado', label: 'CÉDULA DE IDENTIDAD', val: reg.cedula },
    { icon: 'whatsapp', label: 'WHATSAPP', val: `${reg.telefono || 'N/A'} <a href="https://wa.me/1${(reg.telefono||'').replace(/\D/g,'')}" target="_blank" style="color:var(--color-green); font-weight:700; margin-left:8px; text-decoration:none;">Contactar</a>` },
    { icon: 'ubicacion', label: 'DIRECCIÓN', val: reg.direccion || 'N/A' },
    { icon: 'mapa', label: 'MUNICIPIO', val: reg.municipio || 'N/A' },
    { icon: 'mapa', label: 'DISTRITO MUNICIPAL', val: reg.distrito || '—' },
    { icon: 'ubicacion', label: 'SECTOR', val: reg.sector || 'N/A' },
    { icon: 'mapa', label: 'CIRCUNSCRIPCIÓN', val: `${reg.circunscripcion || 'N/A'} <a href="#" style="color:var(--text-muted); font-size:12px; margin-left:8px;" id="link-edit-circ">${getIcon('editar', 14)} Editar</a>` },
    { icon: 'calendario', label: 'FECHA Y HORA', val: new Date(reg.fecha_creacion).toLocaleString('es-DO') },
    { icon: 'usuarioCheck', label: 'TIPO DE REGISTRO', val: reg.tipo || 'Afiliado' },
    { icon: 'usuarioCheck', label: 'RECOLECTOR RESPONSABLE', val: reg.recolector_nombre || 'Juan Pérez' }
  ];

  let htmlRows = '';
  for (const r of rows) {
    htmlRows += `
      <div class="detail-row">
        <div class="detail-icon">${getIcon(r.icon, 18)}</div>
        <div style="flex:1;">
          <div class="detail-label">${r.label}</div>
          <div class="detail-val">${r.val}</div>
        </div>
      </div>
    `;
  }

  // Signature Box Row
  htmlRows += `
    <div class="detail-row">
      <div class="detail-icon">${getIcon('pluma', 18)}</div>
      <div style="flex:1;">
        <div class="detail-label">FIRMA MANUSCRITA</div>
        <div style="width:100%; height:90px; background:#F8FAFC; border-radius:12px; border:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:center; margin-top:4px;">
          ${firmaDataUrl ? `<img src="${firmaDataUrl}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<span style="color:var(--text-muted); font-size:12px;">Sin firma</span>'}
        </div>
      </div>
    </div>
  `;

  document.getElementById('det-reg-rows-container').innerHTML = htmlRows;

  openSheet('modal-backdrop-registro-detail');
}

// Render Screen 4: Firmas Gallery
async function renderFirmasScreen() {
  const container = document.getElementById('firmas-grid-container');
  if (!container) return;

  const firmas = await API.getFirmas();
  document.getElementById('firmas-subtitle').innerText = `${firmas.length} firmas registradas · toque una tarjeta para ver el detalle y descargar el PDF`;

  if (firmas.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:var(--text-muted);">
        <div style="margin-bottom:8px;">${getIcon('pluma', 36)}</div>
        <div style="font-weight:700; font-size:15px; color:var(--text-primary);">No hay firmas registradas</div>
      </div>
    `;
    return;
  }

  let html = '';
  for (const f of firmas) {
    const regName = f.registro ? f.registro.nombre : 'CIUDADANO';
    const regDate = new Date(f.fecha).toLocaleDateString('es-DO');

    html += `
      <div class="firma-card" data-firma-id="${f.id}">
        <div class="firma-thumb-box">
          <img src="${f.data_url}" alt="Firma">
        </div>
        <div class="firma-card-name">${regName}</div>
        <div class="firma-card-date">${regDate}</div>
      </div>
    `;
  }

  container.innerHTML = html;

  container.querySelectorAll('.firma-card').forEach(el => {
    el.addEventListener('click', async () => {
      const fid = el.getAttribute('data-firma-id');
      const fObj = await API.getFirmaById(fid);
      if (fObj) openFirmaDetailSheet(fObj);
    });
  });
}

function openFirmaDetailSheet(fObj) {
  selectedFirmaForDetail = fObj;

  document.getElementById('det-firma-nombre').innerText = fObj.registro ? fObj.registro.nombre : 'CIUDADANO';
  document.getElementById('det-firma-cedula').innerText = fObj.registro ? fObj.registro.cedula : '—';
  document.getElementById('det-firma-img-preview').src = fObj.data_url;

  openSheet('modal-backdrop-firma-detail');
}

// Render Screen 5: Monitor Map
async function renderMonitorScreen() {
  initMapContainer('map-box');
  const registros = await API.getRegistros();
  const recolectores = await API.getRecolectores();

  renderMapMarkers(registros, recolectores);

  document.getElementById('map-stat-rec').innerText = recolectores.length;
  document.getElementById('map-stat-padr').innerText = registros.length;
}

// Render Screen 6: Recolectores
async function renderRecolectoresScreen() {
  const container = document.getElementById('list-recolectores-container');
  if (!container) return;

  const recolectores = await API.getRecolectores();

  let html = `
    <div style="margin-bottom:12px; font-weight:800; font-size:16px;">
      Ranking de rendimiento por recolector
    </div>
  `;

  recolectores.sort((a, b) => (b.total_firmas || 0) - (a.total_firmas || 0));

  for (const rec of recolectores) {
    html += `
      <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="avatar-circle">${rec.nombre.charAt(0)}</div>
          <div>
            <div style="font-weight:700; font-size:15px; color:var(--text-primary);">${rec.nombre}</div>
            <div style="font-size:12px; color:var(--text-muted);">${rec.rol === 'admin' ? 'Administrador' : 'Recolector'} · ${rec.telefono || 'S/N'}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:20px; font-weight:800; color:var(--color-accent);">${rec.total_firmas || 0}</div>
          <div style="font-size:10px; font-weight:700; color:var(--text-muted); uppercase">FIRMAS</div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// Render Screen 7: Auditoria
async function renderAuditoriaScreen() {
  const container = document.getElementById('audit-log-container');
  if (!container) return;

  const logs = await dbGetAll('auditoria');
  logs.sort((a, b) => b.id - a.id);

  if (logs.length === 0) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">Sin registros de auditoría</div>';
    return;
  }

  let html = '';
  for (const log of logs) {
    const fDate = new Date(log.fecha).toLocaleString('es-DO');
    html += `
      <div class="card" style="padding:14px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-weight:800; font-size:12px; background:#F1F5F9; padding:2px 8px; border-radius:8px; color:var(--text-primary);">${log.accion}</span>
          <span style="font-size:11px; color:var(--text-muted);">${fDate}</span>
        </div>
        <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:6px;">${log.detalle}</div>
        <div style="font-family:monospace; font-size:10px; color:var(--text-muted); word-break:break-all;">HASH: ${log.hash_actual || 'N/A'}</div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// Render Screen 9: Configuracion
async function renderConfiguracionScreen() {
  const config = await API.getConfiguracion();

  document.getElementById('cfg-org-nombre').value = config.organizacion_nombre || 'Organización Política';
  document.getElementById('cfg-meta-input').value = config.meta_captura || 10;
  document.getElementById('cfg-conservar-fotos').checked = !!config.conservar_imagenes;
}
