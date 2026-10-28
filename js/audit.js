/**
 * FirmAbal Audit Log & Veracity Integrity Engine
 * SHA-256 Hash Chain
 */

async function computeSHA256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function logAuditAction(accion, detalle, usuario = 'Juan Pérez (Recolector)', registroId = null) {
  try {
    const logs = await dbGetAll('auditoria');
    logs.sort((a, b) => a.id - b.id);
    
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
    const hashAnterior = lastLog ? lastLog.hash_actual : '0000000000000000000000000000000000000000000000000000000000000000';
    
    const fecha = new Date().toISOString();
    const rawPayload = `${fecha}|${usuario}|${accion}|${detalle}|${registroId || ''}|${hashAnterior}`;
    const hashActual = await computeSHA256(rawPayload);

    const auditEntry = {
      fecha,
      usuario,
      accion,
      detalle,
      registro_id: registroId,
      hash_anterior: hashAnterior,
      hash_actual: hashActual
    };

    await dbPut('auditoria', auditEntry);
    return auditEntry;
  } catch (err) {
    console.error('Error recording audit entry:', err);
  }
}

async function verifyAuditIntegrity() {
  const logs = await dbGetAll('auditoria');
  logs.sort((a, b) => a.id - b.id);

  if (logs.length === 0) {
    return { valido: true, total: 0, mensaje: 'Sin registros de auditoría aún.' };
  }

  let expectedHashAnterior = '0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];
    
    if (entry.hash_anterior !== expectedHashAnterior) {
      return {
        valido: false,
        total: logs.length,
        errorIndex: i,
        mensaje: `Alteración detectada en el registro #${entry.id}: la cadena de hash previo no coincide.`
      };
    }

    const rawPayload = `${entry.fecha}|${entry.usuario}|${entry.accion}|${entry.detalle}|${entry.registro_id || ''}|${entry.hash_anterior}`;
    const computedHash = await computeSHA256(rawPayload);

    if (computedHash !== entry.hash_actual) {
      return {
        valido: false,
        total: logs.length,
        errorIndex: i,
        mensaje: `Alteración detectada en el registro #${entry.id}: el hash SHA-256 no coincide.`
      };
    }

    expectedHashAnterior = entry.hash_actual;
  }

  return {
    valido: true,
    total: logs.length,
    mensaje: `Integridad verificada correctamente (${logs.length} registros auditados inmutables).`
  };
}

async function evaluateDataQuality() {
  const registros = await dbGetAll('registros');
  const result = {
    duplicados: 0,
    firmasVacias: 0,
    whatsappInvalido: 0,
    sinTerritorio: 0,
    total: registros.length,
    score: 100
  };

  if (registros.length === 0) return result;

  const cedulasMap = {};

  for (const r of registros) {
    // Cédula duplicate
    const cleanCed = (r.cedula || '').replace(/\D/g, '');
    if (cleanCed) {
      cedulasMap[cleanCed] = (cedulasMap[cleanCed] || 0) + 1;
    }

    // Missing signature
    if (!r.firma_id) {
      result.firmasVacias++;
    }

    // Invalid phone
    const cleanTel = (r.telefono || '').replace(/\D/g, '');
    if (!/^(809|829|849)\d{7}$/.test(cleanTel)) {
      result.whatsappInvalido++;
    }

    // Missing territory
    if (!r.municipio || !r.sector) {
      result.sinTerritorio++;
    }
  }

  for (const count of Object.values(cedulasMap)) {
    if (count > 1) {
      result.duplicados += (count - 1);
    }
  }

  const penalties = (result.duplicados * 15) + (result.firmasVacias * 20) + (result.whatsappInvalido * 10) + (result.sinTerritorio * 5);
  result.score = Math.max(0, 100 - penalties);

  return result;
}
