/**
 * Dominican Cédula Validation & OCR Processing
 */

// Dominican JCE Modulo-10 Checksum Algorithm
function validateDominicanCedula(cedula) {
  if (!cedula) return false;
  const clean = cedula.toString().replace(/\D/g, '');
  if (clean.length !== 11) return false;

  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let total = 0;

  for (let i = 0; i < 10; i++) {
    let p = parseInt(clean.charAt(i), 10) * weights[i];
    if (p >= 10) {
      p = Math.floor(p / 10) + (p % 10);
    }
    total += p;
  }

  const checkDigit = (10 - (total % 10)) % 10;
  return checkDigit === parseInt(clean.charAt(10), 10);
}

// Format Cédula string to 000-0000000-0
function formatCedula(input) {
  const digits = (input || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
}

// Validate Dominican WhatsApp/Phone Number (809, 829, 849 + 7 digits)
function validateDominicanPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return /^(809|829|849)\d{7}$/.test(digits);
}

// Format Phone Number to 809-000-0000
function formatPhone(input) {
  const digits = (input || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Perform OCR scan on image blob / dataUrl using Tesseract.js
async function performCedulaOCR(imageSrc, onProgress = null) {
  if (typeof Tesseract === 'undefined') {
    throw new Error('Tesseract.js no está cargado. Se usará la captura manual.');
  }

  try {
    const worker = await Tesseract.createWorker('spa');
    
    if (onProgress) {
      onProgress('Procesando imagen con OCR...');
    }

    const { data } = await worker.recognize(imageSrc);
    await worker.terminate();

    const rawText = data.text || '';
    return parseCedulaText(rawText);
  } catch (err) {
    console.warn('OCR Error:', err);
    throw err;
  }
}

// Parse text extracted by OCR to identify Cédula fields
function parseCedulaText(text) {
  const result = {
    cedula: '',
    nombre: '',
    apellidos: '',
    fechaNacimiento: '',
    sexo: '',
    lugarNacimiento: '',
    rawText: text
  };

  // Find Cédula pattern XXX-XXXXXXX-X
  const cedulaMatch = text.match(/\b(\d{3})[-.\s]?(\d{7})[-.\s]?(\d{1})\b/);
  if (cedulaMatch) {
    const candidate = `${cedulaMatch[1]}-${cedulaMatch[2]}-${cedulaMatch[3]}`;
    if (validateDominicanCedula(candidate)) {
      result.cedula = candidate;
    } else {
      result.cedula = candidate; // Candidate found
    }
  }

  // Find DOB pattern DD/MM/YYYY or DD-MM-YYYY
  const dateMatch = text.match(/\b(\d{2})[/-](\d{2})[/-](\d{4})\b/);
  if (dateMatch) {
    result.fechaNacimiento = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
  }

  // Find Sex M or F
  const sexMatch = text.match(/\bSEXO\b[:\s]*([MF])\b/i) || text.match(/\b([MF])\b/);
  if (sexMatch) {
    result.sexo = sexMatch[1].toUpperCase() === 'F' ? 'Femenino' : 'Masculino';
  }

  // Clean lines for names
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  const nameLines = [];
  for (const line of lines) {
    if (!/REPUBLICA|DOMINICANA|ELECTORAL|CEDULA|IDENTIDAD|NACIMIENTO|FECHA|SEXO|OCUPACION|EXPIRACION/i.test(line)) {
      if (/^[A-ZÑ\s]{3,30}$/i.test(line)) {
        nameLines.push(line);
      }
    }
  }

  if (nameLines.length >= 2) {
    result.apellidos = nameLines[0];
    result.nombre = nameLines.slice(1).join(' ');
  } else if (nameLines.length === 1) {
    result.nombre = nameLines[0];
  }

  return result;
}
