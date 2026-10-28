/**
 * FirmAbal UI Controller & Component Renderer
 */

// Toast Notification Manager
function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Modal / Bottom Sheet Controller
function openSheet(sheetId) {
  closeAllSheets();
  const backdrop = document.getElementById(sheetId);
  if (backdrop) {
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeSheet(sheetId) {
  const backdrop = document.getElementById(sheetId);
  if (backdrop) {
    backdrop.classList.remove('active');
  }
  if (!document.querySelector('.modal-backdrop.active')) {
    document.body.style.overflow = '';
  }
}

function closeAllSheets() {
  document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.classList.remove('active');
  });
  document.body.style.overflow = '';
}

// Touch Signature Pad Controller
class SignaturePad {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.isDrawing = false;
    this.history = [];
    this.hasStrokes = false;

    this.initCanvas();
    this.attachEvents();
  }

  initCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * 2;
    this.canvas.height = rect.height * 2;
    this.ctx.scale(2, 2);

    this.ctx.strokeStyle = '#0F172A';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.saveState();
  }

  saveState() {
    if (this.history.length > 20) this.history.shift();
    this.history.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
  }

  getCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  attachEvents() {
    const start = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      this.hasStrokes = true;
      const { x, y } = this.getCoordinates(e);
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    };

    const move = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const { x, y } = this.getCoordinates(e);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    };

    const stop = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      this.saveState();
    };

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);

    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', stop);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.history = [];
    this.hasStrokes = false;
    this.saveState();
  }

  undo() {
    if (this.history.length > 1) {
      this.history.pop();
      const previousState = this.history[this.history.length - 1];
      this.ctx.putImageData(previousState, 0, 0);
    } else {
      this.clear();
    }
  }

  isEmpty() {
    return !this.hasStrokes;
  }

  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }
}

// Custom Inline SVG Bar Chart Renderer (Last 7 Days)
function renderBarChart(containerId, daysData) {
  const container = document.getElementById(containerId);
  if (!container || !daysData || daysData.length === 0) return;

  const maxVal = Math.max(...daysData.map(d => d.count), 5);
  const chartHeight = 110;
  const chartWidth = 300;
  const barWidth = 26;
  const gap = (chartWidth - (daysData.length * barWidth)) / (daysData.length + 1);

  let barsSvg = '';

  daysData.forEach((item, index) => {
    const x = gap + index * (barWidth + gap);
    const heightRatio = item.count / maxVal;
    const h = Math.max(heightRatio * chartHeight, item.count > 0 ? 8 : 4);
    const y = chartHeight - h;

    const isToday = index === daysData.length - 1;
    const barColor = isToday ? '#0B1220' : '#CBD5E1';

    barsSvg += `
      <g>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="6" fill="${barColor}" />
        <text x="${x + barWidth/2}" y="${y - 6}" font-size="11" font-weight="700" fill="#0F172A" text-anchor="middle">${item.count}</text>
        <text x="${x + barWidth/2}" y="${chartHeight + 18}" font-size="11" font-weight="600" fill="#64748B" text-anchor="middle">${item.label}</text>
      </g>
    `;
  });

  const svgHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight + 28}" width="100%" height="100%">
      ${barsSvg}
    </svg>
  `;

  container.innerHTML = svgHTML;
}

// Mount Inline SVGs into DOM slots
function mountIcons() {
  const slotMap = {
    'brand-logo-slot': getIcon('pluma', 20),
    'sidebar-logo-slot': getIcon('pluma', 20),
    'header-share-icon-slot': getIcon('compartir', 20),
    'nav-camera-slot': getIcon('camara', 26),
    'meta-diana-slot': getIcon('diana', 22),
    'paso1-camara-slot': getIcon('camara', 20),
    'front-cam-icon-slot': getIcon('camara', 24),
    'back-cam-icon-slot': getIcon('camara', 24),
    'sig-eraser-slot': getIcon('eraser', 18),
    'sig-undo-slot': getIcon('undo', 18),
    'cedula-lock-icon': getIcon('candado', 18),
    'sheet-menu-logo-slot': getIcon('pluma', 20),
    'auto-share-icon-slot': getIcon('compartir', 20),
    'wa-icon-slot': getIcon('whatsapp', 20),
    'copy-icon-slot': getIcon('copiar', 20),
    'consent-shield-slot': getIcon('escudo', 24),
    'exp-csv-icon': getIcon('descarga', 20),
    'exp-zip-icon': getIcon('descarga', 20)
  };

  for (const [id, svgStr] of Object.entries(slotMap)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = svgStr;
  }

  // Mount navigation icons
  document.querySelectorAll('[data-icon]').forEach(el => {
    const iconName = el.getAttribute('data-icon');
    el.innerHTML = getIcon(iconName, 20);
  });
}
