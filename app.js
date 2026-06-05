'use strict';

const STORAGE_KEY = 'banking-control-v2';
const MONTH_LABELS = ['E','F','M','A','M','J','J','A','S','O','N','D'];
const TAX_KEYS = ['iva','igic','irpf','mod202','mod349','obs'];
const TAX_ROWS = ['IVA','IGIC','IRPF','Mod. 202','Mod. 349','Observaciones'];

let data = {
  banks: ['Banco 1'],
  companies: ['Empresa 1'],
  balances: {}, movements: {}, disabledCells: {},
  invoices: [], taxCompanies: ['Empresa A'], taxValues: {}, notes: ''
};

// --- FORMATEO ---
function formatCurrency(n) {
  if (n === '' || n === null || n === undefined) return '';
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(n));
}

function parseCurrency(str) {
  if (!str) return 0;
  let s = String(str).trim();
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  return parseFloat(s) || 0;
}

// --- NAVEGACIÓN ---
window.navScroll = (dir) => {
  const w = document.getElementById('wrapper-balances');
  const step = 300;
  if (dir==='left') w.scrollBy(-step,0); else if (dir==='right') w.scrollBy(step,0);
  else if (dir==='up') w.scrollBy(0,-step); else w.scrollBy(0,step);
};

// --- PDF ---
window.downloadPDF = function(sectionId, filenamePrefix) {
  const section = document.getElementById(sectionId);
  window.scrollTo(0, 0);
  
  // Sincronizar inputs
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
      html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0, width: contentWidth, windowWidth: contentWidth },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(section).save().then(() => {
      document.body.classList.remove('pdf-mode');
    });
  }, 500);
};

// --- RENDER ---
function renderBalances() {
  const g = document.getElementById('grid-balances');
  const nc = data.companies.length;
  g.style.gridTemplateColumns = `240px repeat(${nc}, minmax(170px, 1fr))`;
  
  const bankColors = ['#0f766e', '#b45309', '#be123c', '#4338ca', '#1d4ed8'];
  const companyFaint = ['rgba(30,58,138,0.12)', 'rgba(6,78,59,0.12)', 'rgba(120,53,15,0.12)', 'rgba(76,29,149,0.12)'];

  let html = `<div class="grid-cell header-corner"><div class="nav-controls">
    <button class="nav-btn" onclick="navScroll('left')">&#x25C4;</button>
    <button class="nav-btn" onclick="navScroll('up')">&#x25B2;</button>
    <button class="nav-btn" onclick="navScroll('down')">&#x25BC;</button>
    <button class="nav-btn" onclick="navScroll('right')">&#x25BA;</button>
  </div></div>`;

  data.companies.forEach((c, ci) => {
    html += `<div class="grid-cell header-company" style="background:#1e293b"><input type="text" class="field-input" oninput="editCompany(${ci},this.value)" value="${c}"/></div>`;
  });

  data.banks.forEach((b, bi) => {
    const bColor = bankColors[bi % bankColors.length];
    html += `<div class="grid-cell header-bank" style="background:${bColor}; --row-border:5px solid ${bColor}"><textarea class="bank-input" oninput="editBank(${bi},this.value)">${b}</textarea></div>`;
    
    data.companies.forEach((_, ci) => {
      const key = `${bi}-${ci}`;
      const isDisabled = data.disabledCells[key];
      const bal = data.balances[key] || {};
      const movs = data.movements[key] || [];
      const cv = (parseFloat(bal.saldoActual)||0) + movs.filter(m=>!m.conciliado).reduce((s,m)=>s+(parseFloat(m.importe)||0), 0);

      html += `<div class="grid-cell balance-cell ${isDisabled?'cell-disabled':''}" style="--cell-bg:${companyFaint[ci%companyFaint.length]}; --row-border:5px solid ${bColor}">
        <input type="checkbox" class="cell-toggle" onchange="toggleCell(${bi},${ci},this)" ${isDisabled?'':'checked'}/>
        <div class="cell-content">
          <div class="balance-field"><label class="field-label">Actual</label><input type="text" class="field-input input-actual fmt-num" data-bi="${bi}" data-ci="${ci}" data-f="saldoActual" value="${formatCurrency(bal.saldoActual)}"/></div>
          <div class="balance-field"><label class="field-label">Punteado</label><input type="text" class="field-input fmt-num" data-bi="${bi}" data-ci="${ci}" data-f="saldoPunteado" value="${formatCurrency(bal.saldoPunteado)}"/></div>
          <div class="field-calc" id="conc-${bi}-${ci}">${formatCurrency(cv)}</div>
          <div class="movements-divider">PENDIENTES</div>
          <div>${movs.map((m, mi) => `<div class="movement-item">
            <input type="text" class="mov-importe fmt-num" data-bi="${bi}" data-ci="${ci}" data-mi="${mi}" value="${formatCurrency(m.importe)}"/>
            <input type="text" class="mov-obs" oninput="editMov(${bi},${ci},${mi},this.value)" value="${m.observacion||''}" placeholder="Obs..."/>
          </div>`).join('')}</div>
          <button class="btn btn-ghost" style="width:100%;margin-top:5px" onclick="addMov(${bi},${ci})">+ Mov</button>
        </div>
      </div>`;
    });
  });
  g.innerHTML = html;
}

// --- CRUD ---
window.editBank = (bi, v) => { data.banks[bi] = v; saveData(); };
window.editCompany = (ci, v) => { data.companies[ci] = v; saveData(); };
window.toggleCell = (bi, ci, el) => { data.disabledCells[`${bi}-${ci}`] = !el.checked; saveData(); renderBalances(); };
window.addMov = (bi, ci) => { 
  const key = `${bi}-${ci}`;
  if(!data.movements[key]) data.movements[key] = [];
  data.movements[key].push({importe:0, observacion:'', conciliado:false});
  saveData(); renderBalances();
};
window.editMov = (bi, ci, mi, v) => { data.movements[`${bi}-${ci}`][mi].observacion = v; saveData(); };

// --- EVENTOS ---
document.addEventListener('focusout', e => {
  if (e.target.classList.contains('fmt-num')) {
    const val = parseCurrency(e.target.value);
    const bi = e.target.dataset.bi, ci = e.target.dataset.ci, mi = e.target.dataset.mi;
    if (mi !== undefined) data.movements[`${bi}-${ci}`][mi].importe = val;
    else if (bi !== undefined) {
      if(!data.balances[`${bi}-${ci}`]) data.balances[`${bi}-${ci}`] = {};
      data.balances[`${bi}-${ci}`][e.target.dataset.f] = val;
    }
    saveData(); e.target.value = formatCurrency(val);
    if(bi) {
       const cv = (parseFloat(data.balances[`${bi}-${ci}`]?.saldoActual)||0) + (data.movements[`${bi}-${ci}`]||[]).filter(m=>!m.conciliado).reduce((s,m)=>s+(parseFloat(m.importe)||0), 0);
       document.getElementById(`conc-${bi}-${ci}`).textContent = formatCurrency(cv);
    }
  }
});

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  const s = localStorage.getItem(STORAGE_KEY); if(s) data = JSON.parse(s);
  renderBalances();
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn, .section, .tab-actions').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-actions').forEach(el => el.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById('section-'+btn.dataset.section).classList.add('active');
      document.getElementById('actions-'+btn.dataset.section).classList.remove('hidden');
    };
  });

  document.getElementById('btn-add-bank').onclick = () => { data.banks.push('Nuevo Banco'); saveData(); renderBalances(); };
  document.getElementById('btn-add-company').onclick = () => { data.companies.push('Nueva Empresa'); saveData(); renderBalances(); };
  document.getElementById('btn-clear').onclick = () => { if(confirm("¿BORRAR TODO?")) { localStorage.clear(); location.reload(); }};
});

function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
