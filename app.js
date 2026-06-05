'use strict';

const STORAGE_KEY = 'banking-control-v2';
const MONTH_LABELS = ['E','F','M','A','M','J','J','A','S','O','N','D'];
const MONTH_NAMES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const TAX_ROWS = ['IVA','IGIC','IRPF','Mod. 202','Mod. 349','Observaciones'];
const TAX_KEYS = ['iva','igic','irpf','mod202','mod349','obs'];

let data = {
  banks: ['Banco 1','Banco 2','Banco 3','Banco 4'],
  companies: ['Empresa 1','Empresa 2','Empresa 3','Empresa 4','Empresa 5','Empresa 6'],
  balances: {},
  movements: {},
  disabledCells: {},
  invoices: [],
  taxCompanies: ['Empresa A','Empresa B'],
  taxValues: {},
  notes: ''
};

// ─── PERSISTENCE ────────────────────────────────────────
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); showSaved(); } catch(e) {}
}
function loadData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) { const p = JSON.parse(s); Object.assign(data, p); }
    if (!data.disabledCells) data.disabledCells = {};
  } catch(e) {}
}

// ─── NUMBER FORMATTING ──────────────────────────────────
function formatCurrency(n) {
  if (n === '' || n === null || n === undefined) return '';
  const v = parseFloat(n);
  if (isNaN(v)) return '';
  // Obligamos al navegador a renderizar en formato ES (1.234,56)
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function parseCurrency(str) {
  if (str === null || str === undefined || str === '') return '';
  str = String(str).trim();
  
  let hasComma = str.includes(',');
  let hasDot = str.includes('.');
  
  if (hasDot && !hasComma) {
    let parts = str.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(str); 
    } else {
      return parseFloat(str.replace(/\./g, '')); 
    }
  } else if (hasComma) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  
  return parseFloat(str);
}

// ─── CALCULATION ─────────────────────────────────────────
function calcConciliado(bi, ci) {
  const key = bi+'-'+ci;
  const bal = data.balances[key] || {};
  const actual = parseFloat(bal.saldoActual) || 0;
  const movs = data.movements[key] || [];
  const pending = movs.filter(m => !m.conciliado).reduce((s,m) => s + (parseFloat(m.importe)||0), 0);
  return actual + pending;
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── SAVE INDICATOR ──────────────────────────────────────
let saveTimer;
function showSaved() {
  const el = document.getElementById('save-indicator');
  el.textContent = '\u2713 Guardado';
  el.classList.add('saved');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{ el.classList.remove('saved'); el.textContent='\u2713 Datos guardados'; }, 2000);
}

// ─── CONFIRM DIALOG ──────────────────────────────────────
let confirmCb = null;
function confirm_(msg, cb) {
  document.getElementById('confirm-message').textContent = msg;
  document.getElementById('confirm-overlay').classList.remove('hidden');
  confirmCb = cb;
}

// ─── UPDATE CONCILIADO ────────────────────────────────────
function updateConciliado(bi, ci) {
  const el = document.getElementById('conc-'+bi+'-'+ci);
  if (!el) return;
  const bal = data.balances[bi+'-'+ci] || {};
  const hasActual = bal.saldoActual !== undefined && bal.saldoActual !== '';
  if (!hasActual) { el.textContent = '\u2014'; el.className = 'field-calc'; return; }
  const v = calcConciliado(bi, ci);
  el.textContent = formatCurrency(v) || '0,00';
  el.className = 'field-calc ' + (v<0?'calc-negative':v===0?'calc-zero':'');
}

// ─── GENERAR PDF ──────────────────────────────────────────
window.downloadPDF = function(sectionId, filenamePrefix) {
  const section = document.getElementById(sectionId);

  // 1. Resetear scrolls para evitar cortes
  window.scrollTo(0, 0);
  const wrapper = section.querySelector('.table-scroll-wrapper');
  if (wrapper) wrapper.scrollTo(0, 0);
  
  // 2. Sincronizar inputs
  section.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.setAttribute('value', el.value);
      if (el.tagName === 'TEXTAREA') el.innerHTML = el.value;
      if (el.type === 'checkbox') {
        if (el.checked) el.setAttribute('checked', 'checked');
        else el.removeAttribute('checked');
      }
    }
    if (el.tagName === 'SELECT') {
      Array.from(el.options).forEach(opt => {
        if (opt.selected) opt.setAttribute('selected', 'selected');
        else opt.removeAttribute('selected');
      });
    }
  });

  // 3. Activar modo PDF
  document.body.classList.add('pdf-mode');

  // 4. DAR TIEMPO (500ms) al navegador para redibujar sin bordes
  setTimeout(() => {
    // Calculamos el ancho absoluto real de la tabla generada
    const contentWidth = section.scrollWidth;

    const opt = {
      margin:       [10, 5, 10, 5], // Márgenes: arriba, derecha, abajo, izquierda
      filename:     `${filenamePrefix}_${new Date().toISOString().slice(0,10)}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: contentWidth, // Obliga a capturar el ancho exacto
        windowWidth: contentWidth // Finge que la pantalla es igual de ancha que la tabla
      }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(section).save().then(() => {
      document.body.classList.remove('pdf-mode'); // Restaurar la pantalla normal
    });
  }, 500);
};

// ─── NAVEGACION RAPIDA (SCROLL) ───────────────────────────
window.navScroll = function(direction) {
  const wrapper = document.getElementById('wrapper-balances');
  if (!wrapper) return;
  const step = 400; 
  switch(direction) {
    case 'left': wrapper.scrollBy({ left: -step, behavior: 'smooth' }); break;
    case 'right': wrapper.scrollBy({ left: step, behavior: 'smooth' }); break;
    case 'up': wrapper.scrollBy({ top: -step, behavior: 'smooth' }); break;
    case 'down': wrapper.scrollBy({ top: step, behavior: 'smooth' }); break;
  }
};

// ─── RENDER COMBINED GRID ──────────────────────────────────
function renderBalances() {
  const g = document.getElementById('grid-balances');
  const nc = data.companies.length;
  // Ancho base del panel bancos a 240px (para texto libre) y resto a 170px
  g.style.gridTemplateColumns = '240px repeat('+nc+', minmax(170px,1fr))';
  let html = '';

  const companyColors = ['#1e3a8a', '#064e3b', '#78350f', '#4c1d95', '#831843', '#14532d', '#701a75', '#3b0764'];
  const bankColors = ['#0f766e', '#b45309', '#be123c', '#4338ca', '#1d4ed8', '#15803d', '#a21caf', '#b91c1c'];
  
  // Colores tenues (transparencia 0.15) extraídos de companyColors para el fondo de cada columna
  const companyFaintColors = [
    'rgba(30, 58, 138, 0.15)', 'rgba(6, 78, 59, 0.15)', 'rgba(120, 53, 15, 0.15)', 'rgba(76, 29, 149, 0.15)', 
    'rgba(131, 24, 67, 0.15)', 'rgba(20, 83, 45, 0.15)', 'rgba(112, 26, 117, 0.15)', 'rgba(59, 7, 100, 0.15)'
  ];

  // Top Left Header con Botones de Navegación
  html += '<div class="grid-cell header-corner" style="background-color: #0d0f1a; border-bottom: 2px solid rgba(255,255,255,0.2); border-right: 2px solid rgba(255,255,255,0.2);">'
    + '<span class="corner-label"></span>'
    + '<div class="nav-controls">'
    + '<button class="nav-btn" onclick="navScroll(\'left\')" title="Izquierda">&#x25C0;</button>'
    + '<div style="display:flex; flex-direction:column; gap:4px;">'
    +   '<button class="nav-btn" onclick="navScroll(\'up\')" title="Arriba">&#x25B2;</button>'
    +   '<button class="nav-btn" onclick="navScroll(\'down\')" title="Abajo">&#x25BC;</button>'
    + '</div>'
    + '<button class="nav-btn" onclick="navScroll(\'right\')" title="Derecha">&#x25B6;</button>'
    + '</div></div>';
  
  // Headers de Empresas
  data.companies.forEach((c,ci) => {
    html += '<div class="grid-cell header-company" style="background-color: '+companyColors[ci % companyColors.length]+'; border-bottom: 2px solid rgba(255,255,255,0.2);"><div class="header-editable-wrapper">'
      + '<input type="text" class="header-input company-input" data-ci="'+ci+'" value="'+esc(c)+'" placeholder="Empresa '+(ci+1)+'"/>'
      + '<button class="btn-delete-col" data-ci="'+ci+'" title="Eliminar empresa">\u2715</button>'
      + '</div></div>';
  });

  // Filas por Entidad 
  data.banks.forEach((b,bi) => {
    const bColor = bankColors[bi % bankColors.length];
    
    // Aplicando var(--row-border) que sobreescribe el borde inferior de CSS (Groso 5px)
    html += '<div class="grid-cell header-bank" style="background-color: '+bColor+'; border-right: 2px solid rgba(255,255,255,0.2); --row-border: 5px solid '+bColor+';"><div class="header-editable-wrapper">'
      + '<textarea class="header-input bank-input" data-bi="'+bi+'" placeholder="Banco '+(bi+1)+'\n...\n..." rows="6">'+esc(b)+'</textarea>'
      + '<button class="btn-delete-row" data-bi="'+bi+'" title="Eliminar banco">\u2715</button>'
      + '</div></div>';
    
    data.companies.forEach((_,ci) => {
      const key = bi+'-'+ci;
      const isDisabled = data.disabledCells[key] === true;
      const bal = data.balances[key] || {};
      const cv = calcConciliado(bi,ci);
      const hasActual = bal.saldoActual!==undefined && bal.saldoActual!=='';
      const concText = hasActual ? (formatCurrency(cv)||'0,00') : '\u2014';
      const concClass = hasActual ? (cv<0?'calc-negative':cv===0?'calc-zero':'') : '';
      const faintColor = companyFaintColors[ci % companyFaintColors.length];
      
      const movs = data.movements[key] || [];
      let movItems = movs.map((m,mi) =>
        '<div class="movement-item'+(m.conciliado?' mov-conciliado':'')+'" data-mi="'+mi+'">'
        + '<div class="mov-row1">'
        + '<input type="text" class="mov-importe fmt-num" data-bi="'+bi+'" data-ci="'+ci+'" data-mi="'+mi+'" data-field="importe" value="'+esc(formatCurrency(m.importe))+'" placeholder="Importe"/>'
        + '<label class="mov-check-label" title="Conciliado">'
        + '<input type="checkbox" class="mov-conciliado-check" data-bi="'+bi+'" data-ci="'+ci+'" data-mi="'+mi+'"'+(m.conciliado?' checked':'')+'/>'
        + '<span class="check-text">Conc.</span></label>'
        + '<button class="btn-del-mov" data-bi="'+bi+'" data-ci="'+ci+'" data-mi="'+mi+'" title="Eliminar">\u2715</button>'
        + '</div><div class="mov-row2">'
        + '<input type="text" class="mov-obs" data-bi="'+bi+'" data-ci="'+ci+'" data-mi="'+mi+'" data-field="observacion" value="'+esc(m.observacion||'')+'" placeholder="Observaci\xF3n..."/>'
        + '</div></div>'
      ).join('');

      html += '<div class="grid-cell balance-cell ' + (isDisabled ? 'cell-disabled' : '') + '" style="--cell-bg: ' + faintColor + '; --row-border: 5px solid '+bColor+';">'
        + '<label class="cell-toggle" title="Activar/Desactivar cuenta"><input type="checkbox" class="cell-activate-check" data-bi="'+bi+'" data-ci="'+ci+'" '+(isDisabled?'':'checked')+'/></label>'
        + '<div class="cell-content">'
        + '<div class="balance-fields">'
        + '<div class="balance-field"><label class="field-label label-actual">Saldo Actual</label>'
        + '<input type="text" class="field-input input-actual fmt-num" data-bi="'+bi+'" data-ci="'+ci+'" data-field="saldoActual" value="'+esc(formatCurrency(bal.saldoActual))+'" placeholder="0,00"/></div>'
        + '<div class="balance-field"><label class="field-label label-punteado">Saldo Punteado</label>'
        + '<input type="text" class="field-input input-punteado fmt-num" data-bi="'+bi+'" data-ci="'+ci+'" data-field="saldoPunteado" value="'+esc(formatCurrency(bal.saldoPunteado))+'" placeholder="0,00"/></div>'
        + '<div class="balance-field"><label class="field-label label-conciliado">Saldo Conciliado</label>'
        + '<div class="field-calc '+concClass+'" id="conc-'+bi+'-'+ci+'">'+concText+'</div></div>'
        + '<div class="balance-field"><label class="field-label label-otra">Otra Anotaci\xF3n</label>'
        + '<input type="text" class="field-input" data-bi="'+bi+'" data-ci="'+ci+'" data-field="otraAnotacion" value="'+esc(bal.otraAnotacion||'')+'" placeholder="..."/></div>'
        + '<div class="balance-field"><label class="field-label label-obs">Observaciones</label>'
        + '<input type="text" class="field-input" data-bi="'+bi+'" data-ci="'+ci+'" data-field="observaciones" value="'+esc(bal.observaciones||'')+'" placeholder="..."/></div>'
        + '</div>'
        + '<div class="movements-divider">Movimientos Pendientes</div>'
        + '<div class="movements-list" id="movs-'+bi+'-'+ci+'">'+movItems+'</div>'
        + '<button class="btn-add-mov" data-bi="'+bi+'" data-ci="'+ci+'">\uFF0B A\xF1adir Mov.</button>'
        + '</div></div>';
    });
  });

  g.innerHTML = html;
}

// ─── RENDER INVOICES ──────────────────────────────────────
function renderInvoices() {
  document.getElementById('invoices-body').innerHTML = data.invoices.map((inv,i) => {
    const months = MONTH_LABELS.map((ml,mi) =>
      '<td class="td-month"><label class="month-check-label" title="'+MONTH_NAMES[mi]+'">'
      +'<input type="checkbox" class="inv-month-check" data-i="'+i+'" data-mi="'+mi+'"'+(inv.months[mi]?' checked':'')+'/>'
      +'<span class="month-dot'+(inv.months[mi]?' dot-checked':'')+'" data-i="'+i+'" data-mi="'+mi+'"></span>'
      +'</label></td>'
    ).join('');
    return '<tr class="invoice-row">'
      + months
      + '<td><input type="text" class="inv-field inv-desc" data-i="'+i+'" data-field="descripcion" value="'+esc(inv.descripcion||'')+'" placeholder="Proveedor..."/></td>'
      + '<td><input type="text" class="inv-field inv-acc" data-i="'+i+'" data-field="codigoContable" value="'+esc(inv.codigoContable||'')+'" placeholder="Cuenta..."/></td>'
      + '<td><input type="text" class="inv-field inv-imp fmt-num" data-i="'+i+'" data-field="importe" value="'+esc(formatCurrency(inv.importe))+'" placeholder="0,00"/></td>'
      + '<td><input type="text" class="inv-field inv-bank" data-i="'+i+'" data-field="banco" value="'+esc(inv.banco||'')+'" placeholder="Banco..."/></td>'
      + '<td><select class="inv-field inv-select" data-i="'+i+'" data-field="tipoFacturacion">'
        + '<option value="">Seleccionar...</option>'
        + ['mensual','trimestral','semestral','anual'].map(t=>'<option value="'+t+'"'+(inv.tipoFacturacion===t?' selected':'')+'>'+t.charAt(0).toUpperCase()+t.slice(1)+'</option>').join('')
        + '</select></td>'
      + '<td><input type="text" class="inv-field" data-i="'+i+'" data-field="observaciones" value="'+esc(inv.observaciones||'')+'" placeholder="Obs..."/></td>'
      + '<td><button class="btn-icon-danger btn-del-invoice" data-i="'+i+'" title="Eliminar">\uD83D\uDDD1</button></td>'
      + '</tr>';
  }).join('');
}

// ─── RENDER TAXES ─────────────────────────────────────────
function renderTaxes() {
  const t = document.getElementById('table-taxes');
  const cos = data.taxCompanies;
  let html = '<thead><tr><th class="tax-row-header col-fit">Concepto</th>'
    + cos.map((c,ci) =>
        '<th><div class="tax-company-header">'
        +'<input type="text" class="tax-company-input" data-ci="'+ci+'" value="'+esc(c)+'" placeholder="Empresa..."/>'
        +'<button class="btn-icon-danger btn-del-tax-company" data-ci="'+ci+'" title="Eliminar">\u2715</button>'
        +'</div></th>'
      ).join('')
    + '</tr></thead><tbody>';
  TAX_ROWS.forEach((row,ri) => {
    const isObs = TAX_KEYS[ri]==='obs';
    html += '<tr><td class="tax-row-label">'+row+'</td>'
      + cos.map((_,ci) => {
          const k = TAX_KEYS[ri]+'-'+ci;
          const v = data.taxValues[k]||'';
          const valStr = isObs ? v : formatCurrency(v);
          return '<td><input type="text" class="tax-value-input'+(isObs?'':' tax-amount fmt-num')+'" data-row="'+TAX_KEYS[ri]+'" data-ci="'+ci+'" value="'+esc(valStr)+'" placeholder="'+(isObs?'Observaciones...':'0,00')+'"/></td>';
        }).join('')
      + '</tr>';
  });
  html += '</tbody>';
  t.innerHTML = html;
}

function renderAll() {
  renderBalances();
  renderInvoices();
  renderTaxes();
}

// ─── EVENTS ───────────────────────────────────────────────
function setupEvents() {

  // Auto formato visual al desenfocar campos numéricos para TODOS los paneles
  document.addEventListener('focusout', e => {
    if (e.target.classList.contains('fmt-num')) {
      e.target.value = formatCurrency(parseCurrency(e.target.value));
    }
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('section-'+btn.dataset.section).classList.add('active');
    });
  });

  document.getElementById('btn-add-bank').addEventListener('click', () => {
    data.banks.push('Banco '+(data.banks.length+1));
    saveData(); renderAll();
  });
  document.getElementById('btn-add-company').addEventListener('click', () => {
    data.companies.push('Empresa '+(data.companies.length+1));
    saveData(); renderAll();
  });

  // COMBINED GRID - input
  document.getElementById('grid-balances').addEventListener('input', e => {
    const el = e.target;
    if (el.classList.contains('company-input')) {
      data.companies[+el.dataset.ci] = el.value;
      saveData();
      return;
    }
    if (el.classList.contains('bank-input')) {
      data.banks[+el.dataset.bi] = el.value;
      saveData();
      return;
    }
    if (el.dataset.field && el.dataset.bi!==undefined) {
      const bi=+el.dataset.bi, ci=+el.dataset.ci, key=bi+'-'+ci;
      const isMov = el.classList.contains('mov-importe') || el.classList.contains('mov-obs');
      
      if (isMov) {
        const mi=+el.dataset.mi;
        if (!data.movements[key] || !data.movements[key][mi]) return;
        data.movements[key][mi][el.dataset.field] = el.classList.contains('fmt-num') ? parseCurrency(el.value) : el.value;
        saveData();
        if (el.dataset.field==='importe') updateConciliado(bi,ci);
      } else {
        if (!data.balances[key]) data.balances[key]={};
        data.balances[key][el.dataset.field] = el.classList.contains('fmt-num') ? parseCurrency(el.value) : el.value;
        saveData();
        if (el.dataset.field==='saldoActual') updateConciliado(bi,ci);
      }
    }
  });

  // COMBINED GRID - clicks & checkboxes
  document.getElementById('grid-balances').addEventListener('click', e => {
    if (e.target.classList.contains('btn-delete-row')) {
      const bi = +e.target.dataset.bi;
      confirm_('Eliminar banco "'+data.banks[bi]+'" y todos sus datos?', () => {
        const nb={}, nm={}, nd={};
        Object.keys(data.balances).forEach(k=>{ if(!k.startsWith(bi+'-')) nb[k]=data.balances[k]; });
        Object.keys(data.movements).forEach(k=>{ if(!k.startsWith(bi+'-')) nm[k]=data.movements[k]; });
        Object.keys(data.disabledCells).forEach(k=>{ if(!k.startsWith(bi+'-')) nd[k]=data.disabledCells[k]; });
        data.banks.splice(bi,1); data.balances=nb; data.movements=nm; data.disabledCells=nd;
        saveData(); renderBalances();
      });
    }
    if (e.target.classList.contains('btn-delete-col')) {
      const ci = +e.target.dataset.ci;
      confirm_('Eliminar empresa "'+data.companies[ci]+'" y todos sus datos?', () => {
        const nb={}, nm={}, nd={};
        Object.keys(data.balances).forEach(k=>{ if(!k.endsWith('-'+ci)) nb[k]=data.balances[k]; });
        Object.keys(data.movements).forEach(k=>{ if(!k.endsWith('-'+ci)) nm[k]=data.movements[k]; });
        Object.keys(data.disabledCells).forEach(k=>{ if(!k.endsWith('-'+ci)) nd[k]=data.disabledCells[k]; });
        data.companies.splice(ci,1); data.balances=nb; data.movements=nm; data.disabledCells=nd;
        saveData(); renderBalances();
      });
    }
    if (e.target.classList.contains('btn-add-mov')) {
      const bi=+e.target.dataset.bi, ci=+e.target.dataset.ci, key=bi+'-'+ci;
      if (!data.movements[key]) data.movements[key]=[];
      data.movements[key].push({importe:'',observacion:'',conciliado:false});
      saveData(); renderBalances(); 
    }
    if (e.target.classList.contains('btn-del-mov')) {
      const bi=+e.target.dataset.bi, ci=+e.target.dataset.ci, mi=+e.target.dataset.mi, key=bi+'-'+ci;
      data.movements[key].splice(mi,1);
      saveData(); renderBalances();
    }
  });

  document.getElementById('grid-balances').addEventListener('change', e => {
    const el=e.target;
    if (el.classList.contains('mov-conciliado-check')) {
      const bi=+el.dataset.bi, ci=+el.dataset.ci, mi=+el.dataset.mi, key=bi+'-'+ci;
      data.movements[key][mi].conciliado = el.checked;
      const item=el.closest('.movement-item');
      if(item) item.classList.toggle('mov-conciliado',el.checked);
      saveData(); updateConciliado(bi,ci);
    }
    if (el.classList.contains('cell-activate-check')) {
      const bi=el.dataset.bi, ci=el.dataset.ci, key=bi+'-'+ci;
      data.disabledCells[key] = !el.checked;
      saveData(); renderBalances();
    }
  });

  // INVOICES
  document.getElementById('btn-add-invoice').addEventListener('click', () => {
    data.invoices.push({months:new Array(12).fill(false),descripcion:'',codigoContable:'',importe:'',banco:'',tipoFacturacion:'',observaciones:''});
    saveData(); renderInvoices();
  });

  document.getElementById('invoices-body').addEventListener('input', e => {
    const el=e.target;
    if (el.classList.contains('inv-field')&&el.dataset.field) {
      data.invoices[+el.dataset.i][el.dataset.field] = el.classList.contains('fmt-num') ? parseCurrency(el.value) : el.value;
      saveData();
    }
  });

  document.getElementById('invoices-body').addEventListener('change', e => {
    const el=e.target;
    if (el.classList.contains('inv-month-check')) {
      const i=+el.dataset.i, mi=+el.dataset.mi;
      data.invoices[i].months[mi]=el.checked;
      const dot=el.nextElementSibling;
      if(dot) dot.classList.toggle('dot-checked',el.checked);
      saveData(); return;
    }
    if (el.classList.contains('inv-select')) {
      data.invoices[+el.dataset.i][el.dataset.field]=el.value;
      saveData();
    }
  });

  document.getElementById('invoices-body').addEventListener('click', e => {
    if (e.target.classList.contains('btn-del-invoice')) {
      confirm_('Eliminar esta factura recurrente?', () => {
        data.invoices.splice(+e.target.dataset.i,1);
        saveData(); renderInvoices();
      });
    }
  });

  // TAXES
  document.getElementById('btn-add-tax-company').addEventListener('click', () => {
    data.taxCompanies.push('Empresa '+(data.taxCompanies.length+1));
    saveData(); renderTaxes();
  });

  document.getElementById('table-taxes').addEventListener('input', e => {
    const el=e.target;
    if (el.classList.contains('tax-company-input')) {
      data.taxCompanies[+el.dataset.ci]=el.value;
      saveData(); return;
    }
    if (el.classList.contains('tax-value-input')) {
      data.taxValues[el.dataset.row+'-'+el.dataset.ci] = el.classList.contains('fmt-num') ? parseCurrency(el.value) : el.value;
      saveData();
    }
  });

  document.getElementById('table-taxes').addEventListener('click', e => {
    if (e.target.classList.contains('btn-del-tax-company')) {
      const ci=+e.target.dataset.ci;
      confirm_('Eliminar empresa "'+data.taxCompanies[ci]+'"?', () => {
        data.taxCompanies.splice(ci,1);
        TAX_KEYS.forEach(k=>{ delete data.taxValues[k+'-'+ci]; });
        saveData(); renderTaxes();
      });
    }
  });

  // NOTES
  const notesEl = document.getElementById('notes-area');
  notesEl.addEventListener('input', () => {
    data.notes=notesEl.value; saveData(); updateNotesCount();
  });
  document.getElementById('btn-clear-notes').addEventListener('click', () => {
    confirm_('Limpiar todas las notas?', ()=>{ data.notes=''; notesEl.value=''; saveData(); updateNotesCount(); });
  });

  // CONFIRM DIALOG
  document.getElementById('confirm-cancel').addEventListener('click', ()=>{ document.getElementById('confirm-overlay').classList.add('hidden'); confirmCb=null; });
  document.getElementById('confirm-ok').addEventListener('click', ()=>{
    document.getElementById('confirm-overlay').classList.add('hidden');
    if(confirmCb){ confirmCb(); confirmCb=null; }
  });
  document.getElementById('confirm-overlay').addEventListener('click', e=>{
    if(e.target===document.getElementById('confirm-overlay')){ document.getElementById('confirm-overlay').classList.add('hidden'); confirmCb=null; }
  });

  // CLEAR ALL
  document.getElementById('btn-clear').addEventListener('click', ()=>{
    confirm_('Eliminar TODOS los datos? Esta accion no se puede deshacer.', ()=>{ localStorage.removeItem(STORAGE_KEY); location.reload(); });
  });
}

function updateNotesCount() {
  const t=document.getElementById('notes-area').value;
  document.getElementById('notes-charcount').textContent=t.length+' caracteres';
  document.getElementById('notes-linecount').textContent=(t?t.split('\n').length:0)+' l\xEDneas';
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', ()=>{
  loadData();
  renderAll();
  document.getElementById('notes-area').value = data.notes||'';
  updateNotesCount();
  setupEvents();
});
