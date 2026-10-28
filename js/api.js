/**
 * FirmAbal API Layer
 * Offline-first IndexedDB storage with Supabase/Deno REST integration hook
 */

const API = {
  // Read Config API Base URL
  async getBaseUrl() {
    const cfg = await dbGet('configuracion', 'api_url');
    return cfg ? cfg.value : '';
  },

  // Seed Initial Demo Data if empty
  async seedInitialData() {
    const existing = await dbGetAll('registros');
    if (existing && existing.length > 0) return;

    console.log('[API] Seeding initial demo data...');

    // Seed Config Defaults
    await dbPut('configuracion', { key: 'organizacion_nombre', value: 'Organización Política' });
    await dbPut('configuracion', { key: 'meta_captura', value: 10 });
    await dbPut('configuracion', { key: 'conservar_imagenes', value: false });
    await dbPut('configuracion', { key: 'pin_admin', value: '1234' });
    await dbPut('configuracion', { key: 'api_url', value: '' });

    // Seed Recolector
    const defaultCollector = {
      id: 'rec-1',
      nombre: 'Juan Pérez',
      cedula: '001-0000001-7',
      telefono: '809-555-0199',
      rol: 'admin',
      activo: true,
      compartiendo_ubicacion: true,
      ultima_lat: 18.4861,
      ultima_lng: -69.9312,
      ultima_actividad: new Date().toISOString()
    };
    await dbPut('recolectores', defaultCollector);

    // Seed Territories
    for (const terr of DEFAULT_TERRITORIES) {
      await dbPut('territorios', terr);
    }

    // Canvas SVG Signatures for Demo
    const demoSignatureCanvas = document.createElement('canvas');
    demoSignatureCanvas.width = 300;
    demoSignatureCanvas.height = 100;
    const ctx = demoSignatureCanvas.getContext('2d');
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 50);
    ctx.bezierCurveTo(60, 20, 100, 80, 150, 40);
    ctx.bezierCurveTo(200, 10, 240, 90, 280, 50);
    ctx.stroke();
    const demoFirmaDataUrl = demoSignatureCanvas.toDataURL('image/png');

    // Seed Demo Record 1: CARMEN CHALAS MENA
    const firma1Id = 'firm-demo-1';
    await dbPut('firmas', {
      id: firma1Id,
      data_url: demoFirmaDataUrl,
      fecha: '2026-09-11T19:38:20.000Z'
    });

    const demoRecord1 = {
      id: 'reg-demo-1',
      cedula: '224-0009987-9',
      nombre: 'CARMEN CHALAS MENA',
      telefono: '809-555-1234',
      direccion: 'Calle Principal #45',
      municipio: 'Santo Domingo Oeste',
      distrito: 'N/A',
      sector: 'Hato Nuevo',
      circunscripcion: 'Circunscripción 4',
      tipo: 'Promotor',
      estado: 'Validado',
      recolector_id: 'rec-1',
      recolector_nombre: 'Juan Pérez',
      origen: 'manual',
      latitud: 18.4722,
      longitud: -69.9911,
      fecha_creacion: '2026-09-11T19:38:20.000Z',
      firma_id: firma1Id,
      foto_frontal_id: null,
      foto_trasera_id: null,
      es_demo: true,
      hash_auditoria: ''
    };

    // Seed Demo Record 2: MIGUEL ANGEL GUERRA CHALAS
    const firma2Id = 'firm-demo-2';
    await dbPut('firmas', {
      id: firma2Id,
      data_url: demoFirmaDataUrl,
      fecha: '2026-09-12T10:15:00.000Z'
    });

    const demoRecord2 = {
      id: 'reg-demo-2',
      cedula: '402-2990201-6',
      nombre: 'MIGUEL ANGEL GUERRA CHALAS',
      telefono: '829-555-5678',
      direccion: 'Av. San Vicente de Paúl #12',
      municipio: 'Santo Domingo Este',
      distrito: 'San Luis',
      sector: 'Los Mina',
      circunscripcion: 'Circunscripción 2',
      tipo: 'Afiliado',
      estado: 'Validado',
      recolector_id: 'rec-1',
      recolector_nombre: 'Juan Pérez',
      origen: 'manual',
      latitud: 18.4988,
      longitud: -69.8655,
      fecha_creacion: '2026-09-12T10:15:00.000Z',
      firma_id: firma2Id,
      foto_frontal_id: null,
      foto_trasera_id: null,
      es_demo: true,
      hash_auditoria: ''
    };

    await dbPut('registros', demoRecord1);
    await dbPut('registros', demoRecord2);

    await logAuditAction('CREACION', 'Registro demo inicial creado (CARMEN CHALAS MENA)', 'Sistema', 'reg-demo-1');
    await logAuditAction('CREACION', 'Registro demo inicial creado (MIGUEL ANGEL GUERRA CHALAS)', 'Sistema', 'reg-demo-2');
  },

  // Registros CRUD
  async getRegistros(filters = {}) {
    let registros = await dbGetAll('registros');

    // Apply search filter
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      registros = registros.filter(r => 
        (r.nombre || '').toLowerCase().includes(q) ||
        (r.cedula || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (r.telefono || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (r.sector || '').toLowerCase().includes(q)
      );
    }

    // Apply status filter
    if (filters.estado && filters.estado !== 'Todos') {
      registros = registros.filter(r => r.estado === filters.estado);
    }

    // Apply type filter
    if (filters.tipo && filters.tipo !== 'Todos') {
      registros = registros.filter(r => r.tipo === filters.tipo);
    }

    // Apply recolector filter
    if (filters.recolector_id && filters.recolector_id !== 'Todos') {
      registros = registros.filter(r => r.recolector_id === filters.recolector_id);
    }

    // Sort descending by creation date
    registros.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

    return registros;
  },

  async getRegistroById(id) {
    return await dbGet('registros', id);
  },

  async saveRegistro(data, firmaDataUrl = null, fotoFrontalDataUrl = null, fotoTraseraDataUrl = null) {
    const regId = data.id || `reg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // Check duplicate Cédula
    const cleanCed = (data.cedula || '').replace(/\D/g, '');
    const all = await dbGetAll('registros');
    const existingDup = all.find(r => r.id !== regId && (r.cedula || '').replace(/\D/g, '') === cleanCed);

    let estadoFinal = data.estado || 'Validado';
    if (existingDup) {
      estadoFinal = 'Duplicado';
    } else if (!validateDominicanCedula(data.cedula) || !data.nombre || !firmaDataUrl) {
      estadoFinal = 'Pendiente';
    }

    // Save Signature if provided
    let firmaId = data.firma_id;
    if (firmaDataUrl) {
      firmaId = `firm-${regId}`;
      await dbPut('firmas', {
        id: firmaId,
        registro_id: regId,
        data_url: firmaDataUrl,
        fecha: new Date().toISOString()
      });
    }

    // Save Images if retention policy is ON
    const config = await this.getConfiguracion();
    let fotoFrontalId = null;
    let fotoTraseraId = null;

    if (config.conservar_imagenes) {
      if (fotoFrontalDataUrl) {
        fotoFrontalId = `img-front-${regId}`;
        await dbPut('imagenes', { id: fotoFrontalId, registro_id: regId, tipo: 'frontal', data_url: fotoFrontalDataUrl });
      }
      if (fotoTraseraDataUrl) {
        fotoTraseraId = `img-back-${regId}`;
        await dbPut('imagenes', { id: fotoTraseraId, registro_id: regId, tipo: 'trasera', data_url: fotoTraseraDataUrl });
      }
    }

    const newRecord = {
      id: regId,
      cedula: data.cedula || '',
      nombre: (data.nombre || '').toUpperCase(),
      telefono: data.telefono || '',
      direccion: data.direccion || '',
      municipio: data.municipio || 'Santo Domingo Oeste',
      distrito: data.distrito || 'N/A',
      sector: data.sector || 'Hato Nuevo',
      circunscripcion: data.circunscripcion || 'Circunscripción 4',
      tipo: data.tipo || 'Afiliado',
      estado: estadoFinal,
      recolector_id: data.recolector_id || 'rec-1',
      recolector_nombre: data.recolector_nombre || 'Juan Pérez',
      origen: data.origen || 'manual',
      latitud: data.latitud || null,
      longitud: data.longitud || null,
      fecha_creacion: data.fecha_creacion || new Date().toISOString(),
      firma_id: firmaId,
      foto_frontal_id: fotoFrontalId,
      foto_trasera_id: fotoTraseraId,
      es_demo: false
    };

    // Log Audit Entry & attach Hash
    const audit = await logAuditAction(
      data.id ? 'EDICION' : 'CREACION',
      `Captura de registro de ${newRecord.nombre} (${newRecord.cedula}) - Estado: ${newRecord.estado}`,
      newRecord.recolector_nombre,
      regId
    );

    newRecord.hash_auditoria = audit ? audit.hash_actual : '';
    await dbPut('registros', newRecord);

    return newRecord;
  },

  async updateRegistro(id, partialData) {
    const existing = await dbGet('registros', id);
    if (!existing) throw new Error('Registro no encontrado');

    const updated = { ...existing, ...partialData, id };
    
    // Re-check validity / duplicate
    if (partialData.cedula && partialData.cedula !== existing.cedula) {
      const cleanCed = partialData.cedula.replace(/\D/g, '');
      const all = await dbGetAll('registros');
      const dup = all.find(r => r.id !== id && (r.cedula || '').replace(/\D/g, '') === cleanCed);
      if (dup) {
        updated.estado = 'Duplicado';
      }
    }

    const audit = await logAuditAction('EDICION', `Actualización de campos de ${updated.nombre}`, 'Administrador', id);
    updated.hash_auditoria = audit ? audit.hash_actual : updated.hash_auditoria;

    await dbPut('registros', updated);
    return updated;
  },

  async deleteRegistro(id) {
    const reg = await dbGet('registros', id);
    if (!reg) return false;

    if (reg.firma_id) await dbDelete('firmas', reg.firma_id);
    if (reg.foto_frontal_id) await dbDelete('imagenes', reg.foto_frontal_id);
    if (reg.foto_trasera_id) await dbDelete('imagenes', reg.foto_trasera_id);

    await logAuditAction('ELIMINACION', `Eliminación de registro de ${reg.nombre} (${reg.cedula})`, 'Administrador', id);
    await dbDelete('registros', id);
    return true;
  },

  // Firmas Gallery
  async getFirmas() {
    const firmas = await dbGetAll('firmas');
    const registros = await dbGetAll('registros');
    const regMap = {};
    for (const r of registros) {
      regMap[r.firma_id] = r;
    }

    return firmas.map(f => ({
      ...f,
      registro: regMap[f.id] || null
    })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },

  async getFirmaById(id) {
    const firma = await dbGet('firmas', id);
    if (!firma) return null;
    const registros = await dbGetAll('registros');
    const reg = registros.find(r => r.firma_id === id);
    return { ...firma, registro: reg };
  },

  // Recolectores
  async getRecolectores() {
    const recolectores = await dbGetAll('recolectores');
    const registros = await dbGetAll('registros');

    return recolectores.map(rec => {
      const count = registros.filter(r => r.recolector_id === rec.id && r.estado === 'Validado').length;
      return {
        ...rec,
        total_firmas: count
      };
    });
  },

  async saveRecolector(data) {
    const id = data.id || `rec-${Date.now()}`;
    const rec = {
      id,
      nombre: data.nombre,
      cedula: data.cedula || '',
      telefono: data.telefono || '',
      rol: data.rol || 'recolector',
      activo: data.activo !== false,
      compartiendo_ubicacion: data.compartiendo_ubicacion || false,
      ultima_lat: data.ultima_lat || 18.4861,
      ultima_lng: data.ultima_lng || -69.9312,
      ultima_actividad: new Date().toISOString()
    };
    await dbPut('recolectores', rec);
    await logAuditAction('CONFIGURACION', `Recolector guardado: ${rec.nombre}`, 'Administrador');
    return rec;
  },

  // Configuration
  async getConfiguracion() {
    const list = await dbGetAll('configuracion');
    const config = {
      organizacion_nombre: 'Organización Política',
      meta_captura: 10,
      conservar_imagenes: false,
      pin_admin: '1234',
      api_url: ''
    };
    for (const item of list) {
      config[item.key] = item.value;
    }
    return config;
  },

  async saveConfiguracion(configObj) {
    for (const [key, value] of Object.entries(configObj)) {
      await dbPut('configuracion', { key, value });
    }
    await logAuditAction('CONFIGURACION', 'Ajustes de configuración actualizados', 'Administrador');
  },

  // Metrics Engine for Inicio Screen
  async getMetrics() {
    const registros = await dbGetAll('registros');
    const recolectores = await dbGetAll('recolectores');
    const config = await this.getConfiguracion();

    const todayStr = new Date().toISOString().slice(0, 10);

    let total = registros.length;
    let hoy = 0;
    let pendientes = 0;
    let duplicados = 0;
    let autoRegistros = 0;

    for (const r of registros) {
      if (r.fecha_creacion && r.fecha_creacion.slice(0, 10) === todayStr) {
        hoy++;
      }
      if (r.estado === 'Pendiente') pendientes++;
      if (r.estado === 'Duplicado') duplicados++;
      if (r.origen === 'auto') autoRegistros++;
    }

    // Last 7 days distribution for Bar Chart
    const daysMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('es-DO', { weekday: 'short' }).slice(0, 3);
      daysMap[key] = { date: key, label: label, count: 0 };
    }

    for (const r of registros) {
      const dKey = (r.fecha_creacion || '').slice(0, 10);
      if (daysMap[dKey]) {
        daysMap[dKey].count++;
      }
    }

    const chartDays = Object.values(daysMap);

    return {
      total,
      hoy,
      pendientes,
      duplicados,
      autoRegistros,
      recolectores: recolectores.length,
      meta: parseInt(config.meta_captura || 10, 10),
      chartDays
    };
  },

  // Clear Demo Data
  async deleteDemoData() {
    const registros = await dbGetAll('registros');
    let count = 0;
    for (const r of registros) {
      if (r.es_demo) {
        await this.deleteRegistro(r.id);
        count++;
      }
    }
    await logAuditAction('ELIMINACION', `Se eliminaron ${count} registros de demostración`, 'Administrador');
    return count;
  },

  // Wipe Entire Database
  async wipeAllData() {
    await dbClear('registros');
    await dbClear('firmas');
    await dbClear('imagenes');
    await dbClear('auditoria');
    await dbClear('recolectores');
    await dbClear('territorios');
    await dbClear('configuracion');
    console.log('[API] All database tables cleared!');
  }
};
