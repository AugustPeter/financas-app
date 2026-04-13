/**
 * dashboard.js - Interface do Dashboard
 * Versão otimizada e limpa
 */

console.log('📊 dashboard.js carregando...');

// ============================================
// ESTADO
// ============================================

const DashboardState = {
  rendered: false,
  elements: {},
  sectionStates: {
    renda: Utils.Storage.get('renda-expanded', true),
    despesa: Utils.Storage.get('despesa-expanded', true)
  }
};

// ============================================
// TEMPLATES HTML
// ============================================

const Templates = {
  dashboard: `
    <div class="summary-cards">
      <div class="summary-card">
        <span>Renda</span>
        <h2 id="totalRenda">R$ 0,00</h2>
      </div>
      <div class="summary-card">
        <span>Despesas</span>
        <h2 id="totalDespesa">R$ 0,00</h2>
      </div>
      <div class="summary-card">
        <span>Saldo</span>
        <h2 id="saldo">R$ 0,00</h2>
      </div>
      <div class="summary-card">
        <span>Investimentos</span>
        <h2 id="totalInvest">R$ 0,00</h2>
      </div>
    </div>

    <div class="main-grid">
      <div class="content-card">
        <div class="card-header">
          <h3>Rendas <span id="rendaCount" class="count">(0 itens)</span></h3>
          <button class="btn-collapse" id="toggleRenda" title="Minimizar">−</button>
        </div>
        <div class="table-container" id="rendaContainer">
          <table id="renda">
            <thead>
              <tr><th>Descrição</th><th>Valor</th><th>Ações</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn btn-add" id="btnAddRenda">+ Adicionar Renda</button>
      </div>
      
      <div class="content-card">
        <div class="card-header">
          <h3>Despesas <span id="despesaCount" class="count">(0 itens)</span></h3>
          <button class="btn-collapse" id="toggleDespesa" title="Minimizar">−</button>
        </div>
        <div class="table-container" id="despesaContainer">
          <table id="despesa">
            <thead>
              <tr><th>Descrição</th><th>Valor</th><th>Pago</th><th>Ações</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn btn-add" id="btnAddDespesa">+ Adicionar Despesa</button>
      </div>
    </div>

    <div class="main-grid">
      <div class="content-card">
        <h3>Investimentos <span id="investCount" class="count">(0 itens)</span></h3>
        <div class="table-container">
          <table id="invest">
            <thead>
              <tr><th>Nome</th><th>Aporte</th><th>Meta</th><th>Ações</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn btn-add" id="btnAddInvest">+ Adicionar Investimento</button>
      </div>
      
      <div class="content-card">
        <h3>Resumo do Mês</h3>
        <div class="chart-container">
          <canvas id="grafico"></canvas>
        </div>
      </div>
    </div>
  `,

  rowRenda: (desc, valor) => `
    <td><input class="table-input" value="${escapeHTML(desc)}" placeholder="Descrição"></td>
    <td><input class="table-input" type="number" value="${valor}" placeholder="0.00" step="0.01"></td>
    <td><button class="btn-icon btn-remove">✕</button></td>
  `,

  rowDespesa: (desc, valor, pago) => `
    <td><input class="table-input" value="${escapeHTML(desc)}" placeholder="Descrição"></td>
    <td><input class="table-input" type="number" value="${valor}" placeholder="0.00" step="0.01"></td>
    <td><input type="checkbox" class="check-pago" ${pago ? 'checked' : ''}></td>
    <td><button class="btn-icon btn-remove">✕</button></td>
  `,

  rowInvest: (nome, aporte, meta) => `
    <td><input class="table-input" value="${escapeHTML(nome)}" placeholder="Nome"></td>
    <td><input class="table-input" type="number" value="${aporte}" placeholder="Aporte" step="0.01"></td>
    <td><input class="table-input" type="number" value="${meta}" placeholder="Meta" step="0.01"></td>
    <td><button class="btn-icon btn-remove">✕</button></td>
  `
};

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Renderizar dashboard
 */
function loadDashboardContent() {
  const container = document.getElementById('dashboardContent');
  if (!container) return;

  if (DashboardState.rendered && container.querySelector('#renda')) {
    console.log('✅ Dashboard já renderizado');
    return;
  }

  container.innerHTML = Templates.dashboard;
  DashboardState.rendered = true;

  // Cache de elementos
  cacheElements();
  
  // Setup eventos
  setupEventListeners();
  
  // Restaurar estados das seções
  setTimeout(() => {
    if (!DashboardState.sectionStates.renda) toggleSection('renda', false);
    if (!DashboardState.sectionStates.despesa) toggleSection('despesa', false);
    updateCounts();
    calc();
  }, 100);
}

/**
 * Cache de elementos DOM
 */
function cacheElements() {
  DashboardState.elements = {
    totalRenda: document.getElementById('totalRenda'),
    totalDespesa: document.getElementById('totalDespesa'),
    totalInvest: document.getElementById('totalInvest'),
    saldo: document.getElementById('saldo'),
    rendaTbody: document.querySelector('#renda tbody'),
    despesaTbody: document.querySelector('#despesa tbody'),
    investTbody: document.querySelector('#invest tbody')
  };
}

/**
 * Setup de event listeners com delegação
 */
function setupEventListeners() {
  const container = document.getElementById('dashboardContent');
  if (!container) return;

  // Delegação de eventos
  container.addEventListener('click', (e) => {
    const target = e.target;
    
    // Botão remover
    if (target.classList.contains('btn-remove')) {
      removeRow(target);
      return;
    }
    
    // Botões de adicionar
    if (target.id === 'btnAddRenda') {
      addRow('renda');
      return;
    }
    if (target.id === 'btnAddDespesa') {
      addRow('despesa');
      return;
    }
    if (target.id === 'btnAddInvest') {
      addInvest();
      return;
    }
    
    // Toggle sections
    if (target.id === 'toggleRenda') {
      toggleSection('renda');
      return;
    }
    if (target.id === 'toggleDespesa') {
      toggleSection('despesa');
      return;
    }
  });

  // Inputs - calcular ao digitar
  container.addEventListener('input', (e) => {
    if (e.target.matches('.table-input, .check-pago')) {
      calc();
    }
  });

  // Checkbox change
  container.addEventListener('change', (e) => {
    if (e.target.matches('.check-pago')) {
      calc();
    }
  });
}

// ============================================
// CRUD LINHAS
// ============================================

/**
 * Adicionar linha de renda/despesa
 */
function addRow(tipo, descricao = '', valor = 0, pago = false) {
  const tbody = tipo === 'renda' ? DashboardState.elements.rendaTbody : DashboardState.elements.despesaTbody;
  if (!tbody) {
    cacheElements();
    return addRow(tipo, descricao, valor, pago);
  }

  const tr = document.createElement('tr');
  tr.innerHTML = tipo === 'renda' 
    ? Templates.rowRenda(descricao, valor)
    : Templates.rowDespesa(descricao, valor, pago);
  
  tbody.appendChild(tr);
  updateCounts();
  calc();
  
  // Focar no primeiro input se vazio
  if (!descricao) {
    const input = tr.querySelector('input');
    if (input) input.focus();
  }
}

/**
 * Adicionar investimento
 */
function addInvest(nome = '', aporte = 0, meta = 0) {
  const tbody = DashboardState.elements.investTbody;
  if (!tbody) {
    cacheElements();
    return addInvest(nome, aporte, meta);
  }

  const tr = document.createElement('tr');
  tr.innerHTML = Templates.rowInvest(nome, aporte, meta);
  
  tbody.appendChild(tr);
  updateCounts();
  calc();
  
  if (!nome) {
    const input = tr.querySelector('input');
    if (input) input.focus();
  }
}

/**
 * Remover linha
 */
function removeRow(button) {
  const tr = button.closest('tr');
  if (tr) {
    tr.style.opacity = '0';
    tr.style.transform = 'translateX(-20px)';
    setTimeout(() => {
      tr.remove();
      updateCounts();
      calc();
    }, 200);
  }
}

// ============================================
// CÁLCULOS
// ============================================

/**
 * Calcular totais
 */
function calc() {
  const els = DashboardState.elements;
  if (!els.totalRenda) cacheElements();
  
  const { totalRenda: trEl, totalDespesa: tdEl, totalInvest: tiEl, saldo: sEl } = DashboardState.elements;
  if (!trEl || !tdEl || !tiEl || !sEl) return;

  // Somar valores
  const totalRenda = sumInputs('#renda input[type="number"]');
  const totalDespesa = sumInputs('#despesa input[type="number"]');
  const totalInvest = sumInputs('#invest tbody tr td:nth-child(2) input');
  const saldoVal = totalRenda - totalDespesa - totalInvest;

  // Atualizar display
  trEl.textContent = formatCurrency(totalRenda);
  tdEl.textContent = formatCurrency(totalDespesa);
  tiEl.textContent = formatCurrency(totalInvest);
  sEl.textContent = formatCurrency(saldoVal);
  sEl.className = saldoVal >= 0 ? 'positive' : 'negative';

  // Atualizar gráfico
  updateChart(totalRenda, totalDespesa, totalInvest, saldoVal);

  // Disparar auto-save
  if (typeof dispararAutoSave === 'function') {
    clearTimeout(window._autoSaveTimer);
    window._autoSaveTimer = setTimeout(dispararAutoSave, 100);
  }
}

/**
 * Somar inputs
 */
function sumInputs(selector) {
  return Array.from(document.querySelectorAll(selector))
    .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
}

/**
 * Atualizar contagens
 */
function updateCounts() {
  ['renda', 'despesa', 'invest'].forEach(id => {
    const countEl = document.getElementById(`${id}Count`);
    const count = document.querySelectorAll(`#${id} tbody tr`).length;
    if (countEl) {
      countEl.textContent = count === 1 ? '(1 item)' : `(${count} itens)`;
    }
  });
}

// ============================================
// GRÁFICO
// ============================================

/**
 * Atualizar gráfico
 */
function updateChart(renda, despesa, invest, saldo) {
  const canvas = document.getElementById('grafico');
  if (!canvas) return;

  if (window.dashboardChart) {
    window.dashboardChart.data.datasets[0].data = [renda, despesa, invest, saldo];
    window.dashboardChart.data.datasets[0].backgroundColor[3] = saldo >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
    window.dashboardChart.data.datasets[0].borderColor[3] = saldo >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
    window.dashboardChart.update('none');
    return;
  }

  if (typeof Chart === 'undefined') return;

  window.dashboardChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Renda', 'Despesas', 'Investimentos', 'Saldo'],
      datasets: [{
        data: [renda, despesa, invest, saldo],
        backgroundColor: [
          'rgba(34, 197, 94, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(99, 102, 241, 0.7)',
          saldo >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(99, 102, 241)',
          saldo >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ],
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => `R$ ${v.toLocaleString('pt-BR')}`
          }
        }
      }
    }
  });
}

// ============================================
// SEÇÕES COLAPSÁVEIS
// ============================================

function toggleSection(type, save = true) {
  const container = document.getElementById(`${type}Container`);
  const button = document.getElementById(`toggle${type.charAt(0).toUpperCase() + type.slice(1)}`);
  
  if (!container || !button) return;
  
  const isHidden = container.style.display === 'none';
  
  container.style.display = isHidden ? 'block' : 'none';
  button.textContent = isHidden ? '−' : '+';
  button.title = isHidden ? 'Minimizar' : 'Expandir';
  
  DashboardState.sectionStates[type] = isHidden;
  
  if (save) {
    Utils.Storage.set(`${type}-expanded`, isHidden);
  }
}

// ============================================
// ESTILOS
// ============================================

const styles = document.createElement('style');
styles.textContent = `
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .card-header h3 { margin: 0; }
  .count { color: #64748b; font-size: 13px; font-weight: 400; margin-left: 8px; }
  .btn-collapse {
    background: none;
    border: none;
    font-size: 24px;
    color: #64748b;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }
  .btn-collapse:hover { background: rgba(100, 116, 139, 0.1); transform: scale(1.1); }
  .table-container { transition: all 0.3s ease; }
  tr { transition: all 0.2s ease; }
`;
document.head.appendChild(styles);

// ============================================
// EXPORTAR
// ============================================

window.loadDashboardContent = loadDashboardContent;
window.addRow = addRow;
window.addInvest = addInvest;
window.removeRow = removeRow;
window.calc = calc;
window.updateCounts = updateCounts;
window.toggleSection = toggleSection;

console.log('✅ dashboard.js carregado');
