'use strict';

const STORAGE_KEY = 'banking-control-v2';
const MONTH_LABELS = ['E','F','M','A','M','J','J','A','S','O','N','D'];
const TAX_ROWS = ['IVA','IGIC','IRPF','Mod. 202','Mod. 349','Observaciones'];
const TAX_KEYS = ['iva','igic','irpf','mod202','mod349','obs'];

let data = {
  banks: ['Banco 1','Banco 2'],
  companies: ['Empresa 1','Empresa 2'],
  balances: {}, movements: {}, disabledCells: {},
  invoices: [], taxCompanies: ['Empresa A'], taxValues: {}, notes: ''
};

function formatCurrency(n) {
  if (n === '' || n === null || n === undefined) return '';
  const v = parseFloat(n);
  if (isNaN(v)) return '';
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function parseCurrency(str) {
  if (!str) return '';
  str = String(str).trim();
  if (str.includes(',') && str.includes('.')) return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  if (str.includes(',')) return parseFloat(str.replace(',', '.'));
  return parseFloat(str);
}

// ─── PDF EXPORT FIX ───────────────────────────────────────
window.downloadPDF = function(sectionId, filenamePrefix) {
  const section = document.getElementById(sectionId);
  window.scrollTo(0, 0);
  
  // Sincronizar contenido visual
  section.querySelectorAll('input, textarea').forEach(el => {
    el.setAttribute('value', el.value);
    if (el.tagName === 'TEXTAREA') el.innerHTML = el.value;
  });

  document.body.classList.add('pdf-mode');

  setTimeout(() => {
    const contentWidth = section.scrollWidth;
    const opt = {
      margin: 5,
      filename: `${filenamePrefix}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, useCORS: true, scrollX: 0, scrollY: 0, 
        width: contentWidth, windowWidth: contentWidth 
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(section).save().then(() => {
      document.body.classList.remove('pdf-mode');
    });
  }, 400);
};

// ─── LOGIC & RENDERING ────────────────────────────────────
function calcConciliado(bi, ci) {
  const key = bi+'-'+ci;
  const bal = data.balances[key] || {};
  const actual = parseFloat(bal.saldoActual) || 0;
  const movs = data.movements[key] || [];
  const pending = movs.filter(m => !m.conciliado).reduce((s,m) => s + (parseFloat(m.importe)||0), 0);
  return actual + pending;
}

function renderBalances() {
  const g = document.getElementById('grid-balances');
  const nc = data.companies.length;
  g.style.gridTemplateColumns = `240px repeat(${nc}, minmax(170px, 1fr))`;
  
  const bankColors = ['#0f766e', '#b45309', '#be123c', '#4338ca'];
  const companyFaint = ['rgba(30,58,138,0.1)', 'rgba(6,78,59,0.1)', 'rgba(120,53,15,0.1)'];

  let html = `<div class="grid-cell header-corner"><div class="nav-controls">
    <button class="nav-btn" onclick="navScroll('left')">&#x25C4;</button>
    <button class="nav-btn" onclick="navScroll('up')">&#x25B2;</button>
    <button class="nav-btn" onclick="navScroll('down')">&#x25BC;</button>
    <button class="nav-btn" onclick="navScroll('right')">&#x25BA;</button>
  </div></div>`;

  data.companies.forEach((c, ci) => {
    html += `<div class="grid-cell header-company" style="background:#1e293b"><input type="text" class="header-input company-input" data-ci="${ci}" value="${c}"/></div>`;
  });

  data.banks.forEach((b, bi) => {
    const bColor = bankColors[bi % bankColors.length];
    html += `<div class="grid-cell header-bank" style="background:${bColor}; --row-border:4px solid ${bColor}"><textarea class="bank-input" data-bi="${bi}">${b}</textarea></div>`;
    
    data.companies.forEach((_, ci) => {
      const key = `${bi}-${ci}`;
      const isDisabled = data.disabledCells[key];
      const bal = data.balances[key] || {};
      const cv = calcConciliado(bi, ci);
      const movs = (data.movements[key] || []).map((m, mi) => `
        <div class="movement-item">
          <input type="text" class="mov-importe fmt-num" data-bi="${bi}" data-ci="${ci}" data-mi="${mi}" data-field="importe" value="${formatCurrency(m.importe)}"/>
          <input type="text" class="mov-obs" data-bi="${bi}" data-ci="${ci}" data-mi="${mi}" data-field="observacion" value="${m.observacion || ''}" placeholder="Obs..."/>
        </div>`).join('');

      html += `<div class="grid-cell balance-cell ${isDisabled?'cell-disabled':''}" style="--cell-bg:${companyFaint[ci%3]}; --row-border:4px solid ${bColor}">
        <input type="checkbox" class="cell-toggle cell-activate-check" data-bi="${bi}" data-ci="${ci}" ${isDisabled?'':'checked'}/>
        <div class="cell-content">
          <div class="balance-field"><label class="field-label">Actual</label><input type="text" class="field-input input-actual fmt-num" data-bi="${bi}" data-ci="${ci}" data-field="saldoActual" value="${formatCurrency(bal.saldoActual)}"/></div>
          <div class="balance-field"><label class="field-label">Punteado</label><input type="text" class="field-input fmt-num" data-bi="${bi}" data-ci="${ci}" data-field="saldoPunteado" value="${formatCurrency(bal.saldoPunteado)}"/></div>
          <div class="field-calc" id="conc-${bi}-${ci}">${formatCurrency(cv)}</div>
          <div class="movements-divider">PENDIENTES</div>
          <div class="movements-list">${movs}</div>
          <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:5px" onclick="addMov(${bi},${ci})">+ Mov</button>
        </div>
      </div>`;
    });
  });
  g.innerHTML = html;
}

window.navScroll = (dir) => {
  const w = document.getElementById('wrapper-balances');
  if (dir==='left') w.scrollBy(-300,0); else if (dir==='right') w.scrollBy(300,0);
  else if (dir==='up') w.scrollBy(0,-300); else w.scrollBy(0,300);
};

window.addMov = (bi, ci) => {
  const key = bi+'-'+ci;
  if(!data.movements[key]) data.movements[key]=[];
  data.movements[key].push({importe:'', observacion:'', conciliado:false});
  saveData(); renderBalances();
};

// ─── TABS & INIT ──────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn, .section, .tab-actions').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-actions').forEach(el => el.classList.add('hidden'));
      
      btn.classList.add('active');
      const secId = btn.dataset.section;
      document.getElementById('section-'+secId).classList.add('active');
      document.getElementById('actions-'+secId).classList.remove('hidden');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadData(); renderBalances(); setupTabs();
  document.addEventListener('focusout', e => {
    if (e.target.classList.contains('fmt-num')) {
      const val = parseCurrency(e.target.value);
      const bi = e.target.dataset.bi, ci = e.target.dataset.ci, mi = e.target.dataset.mi;
      if (mi !== undefined) data.movements[`${bi}-${ci}`][mi].importe = val;
      else if (bi !== undefined) {
        if (!data.balances[`${bi}-${ci}`]) data.balances[`${bi}-${ci}`] = {};
        data.balances[`${bi}-${ci}`][e.target.dataset.field] = val;
      }
      saveData(); e.target.value = formatCurrency(val);
      if (bi !== undefined) document.getElementById(`conc-${bi}-${ci}`).textContent = formatCurrency(calcConciliado(bi, ci));
    }
  });
});

function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function loadData() { const s = localStorage.getItem(STORAGE_KEY); if(s) data = JSON.parse(s); }
