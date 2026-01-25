// ============================================
// FUNÇÕES DE INVESTIMENTOS
// ============================================

// Helper formatCurrency local (fallback)
function safeFormatCurrency(value) {
  if (typeof formatCurrency === 'function') return formatCurrency(value);
  if (typeof window.formatCurrency === 'function') return window.formatCurrency(value);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

// Carregar conteúdo de investimentos
function loadInvestmentsContent() {
  const content = document.getElementById('investmentsContent');
  if (!content) return;
  
  content.innerHTML = `
    <div class="content-card fade-in">
      <h3>Meus Investimentos</h3>
      <div class="table-container">
        <table id="investTable">
          <thead>
            <tr>
              <th>Investimento</th>
              <th>Total Investido</th>
              <th>Meta</th>
              <th>Progresso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <!-- Investimentos serão carregados dinamicamente -->
          </tbody>
        </table>
      </div>
      <button class="btn btn-add" id="addInvestmentBtn">
        <i>+</i> Novo Investimento
      </button>
    </div>

    <div class="main-grid">
      <div class="content-card fade-in">
        <h3>Distribuição de Investimentos</h3>
        <div class="chart-container">
          <canvas id="investmentChart"></canvas>
        </div>
      </div>
      
      <div class="content-card fade-in">
        <h3>Histórico de Aportes</h3>
        <div class="chart-container">
          <canvas id="contributionChart"></canvas>
        </div>
      </div>
    </div>

    <div class="content-card fade-in">
      <h3>Simulador de Investimentos</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <label style="display: block; margin-bottom: 8px; color: var(--muted);">Valor Inicial</label>
          <input class="table-input" type="number" id="simInitial" value="1000" step="0.01">
        </div>
        <div>
          <label style="display: block; margin-bottom: 8px; color: var(--muted);">Aporte Mensal</label>
          <input class="table-input" type="number" id="simMonthly" value="500" step="0.01">
        </div>
        <div>
          <label style="display: block; margin-bottom: 8px; color: var(--muted);">Taxa Anual (%)</label>
          <input class="table-input" type="number" id="simRate" value="8.5" step="0.1">
        </div>
        <div>
          <label style="display: block; margin-bottom: 8px; color: var(--muted);">Período (anos)</label>
          <input class="table-input" type="number" id="simYears" value="10">
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top: 20px; width: 100%;" id="runSimulationBtn">
        Simular Investimento
      </button>
      <div id="simulationResult" style="margin-top: 20px; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 8px; display: none;">
        <h4 style="margin: 0 0 10px 0;">Resultado da Simulação</h4>
        <div id="simResultContent"></div>
      </div>
    </div>
  `;
  
  // Configurar event listeners
  setupInvestmentsListeners();
  
  // Carregar tabela de investimentos
  loadInvestmentsTable();
}

// Configurar listeners de investimentos
function setupInvestmentsListeners() {
  // Botão Adicionar Investimento
  const addInvestmentBtn = document.getElementById('addInvestmentBtn');
  if (addInvestmentBtn) {
    addInvestmentBtn.addEventListener('click', showAddInvestmentModal);
  }
  
  // Botão Executar Simulação
  const runSimulationBtn = document.getElementById('runSimulationBtn');
  if (runSimulationBtn) {
    runSimulationBtn.addEventListener('click', runSimulation);
  }
}

// Helper para obter dados de investimentos do DOM atual
function getInvestmentsFromDOM() {
  const rows = document.querySelectorAll('#invest tbody tr');
  const investments = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs.length >= 3) {
      const nome = inputs[0].value || '';
      const aporte = parseFloat(inputs[1].value) || 0;
      const meta = parseFloat(inputs[2].value) || 0;
      investments.push([nome, aporte, meta]);
    }
  });
  return investments;
}

// Carregar tabela de investimentos
function loadInvestmentsTable() {
  // Usar dados do DOM do dashboard (invest)
  const investments = getInvestmentsFromDOM();
  const tableBody = document.querySelector('#investTable tbody');
  if (!tableBody) return;
  
  if (!investments || investments.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--muted);">
          Nenhum investimento cadastrado
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = '';
  investments.forEach(([name, aporte, meta], index) => {
    const aporteNum = parseFloat(aporte || 0);
    const metaNum = parseFloat(meta || 0);
    const progresso = metaNum > 0 ? (aporteNum / metaNum) * 100 : 0;
    // Escapar nome para prevenir XSS
    const safeName = typeof escapeHTML === 'function' ? escapeHTML(name) : (name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${safeName || 'Investimento'}</strong></td>
      <td>${safeFormatCurrency(aporteNum)}</td>
      <td>${safeFormatCurrency(metaNum)}</td>
      <td>
        <div style="background: var(--border); height: 8px; border-radius: 4px; overflow: hidden;">
          <div style="width: ${Math.min(progresso, 100)}%; height: 100%; background: var(--primary);"></div>
        </div>
        <div style="font-size: 12px; margin-top: 4px; color: var(--muted);">
          ${progresso.toFixed(1)}%
        </div>
      </td>
      <td>
        <button class="btn-icon" onclick="addContribution(${index})">+</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Mostrar modal para adicionar investimento
function showAddInvestmentModal() {
  const name = prompt('Nome do investimento:');
  if (!name) return;
  
  const meta = parseFloat(prompt('Meta (R$):') || 0);
  
  // Verificar se estamos na tab correta
  if (window.currentTab !== 'dashboard') {
    if (typeof showTab === 'function') showTab('dashboard');
    setTimeout(() => {
      if (typeof addInvest === 'function' || typeof window.addInvest === 'function') {
        (window.addInvest || addInvest)(name, 0, meta);
      }
    }, 100);
  } else {
    if (typeof addInvest === 'function' || typeof window.addInvest === 'function') {
      (window.addInvest || addInvest)(name, 0, meta);
    }
  }
  
  // Atualizar tabela de investimentos se estiver na tab de investimentos
  if (window.currentTab === 'investments') {
    setTimeout(() => {
      loadInvestmentsTable();
    }, 200);
  }
  
  if (typeof showToast === 'function') showToast('Investimento adicionado!', 'success');
}

// Adicionar aporte a um investimento existente no DOM
function addContribution(index) {
  const valor = parseFloat(prompt('Valor do aporte (R$):') || 0);
  if (valor <= 0) {
    if (typeof showToast === 'function') showToast('Valor inválido', 'error');
    return;
  }
  
  // Acessar a linha de investimento no DOM do dashboard
  const investRows = document.querySelectorAll('#invest tbody tr');
  const row = investRows[index];
  
  if (!row) {
    if (typeof showToast === 'function') showToast('Investimento não encontrado', 'error');
    return;
  }
  
  // Pegar o input de aporte (segunda coluna)
  const aporteInput = row.querySelector('td:nth-child(2) input');
  if (!aporteInput) {
    if (typeof showToast === 'function') showToast('Campo de aporte não encontrado', 'error');
    return;
  }
  
  // Atualizar o valor
  const currentValue = parseFloat(aporteInput.value) || 0;
  aporteInput.value = (currentValue + valor).toFixed(2);
  
  // Disparar recalculação
  if (typeof calc === 'function' || typeof window.calc === 'function') {
    (window.calc || calc)();
  }
  
  // Atualizar a tabela de investimentos se estiver visível
  if (window.currentTab === 'investments') {
    setTimeout(() => {
      loadInvestmentsTable();
    }, 100);
  }
  
  if (typeof showToast === 'function') showToast('Aporte registrado!', 'success');
}

// Executar simulação de investimento
function runSimulation() {
  const initialEl = document.getElementById('simInitial');
  const monthlyEl = document.getElementById('simMonthly');
  const rateEl = document.getElementById('simRate');
  const yearsEl = document.getElementById('simYears');
  
  if (!initialEl || !monthlyEl || !rateEl || !yearsEl) {
    console.error('❌ Elementos do simulador não encontrados');
    return;
  }
  
  const initial = parseFloat(initialEl.value) || 0;
  const monthly = parseFloat(monthlyEl.value) || 0;
  const rate = parseFloat(rateEl.value) || 0;
  const years = parseFloat(yearsEl.value) || 0;
  
  const monthlyRate = Math.pow(1 + rate/100, 1/12) - 1;
  let total = initial;
  
  for (let i = 0; i < years * 12; i++) {
    total = total * (1 + monthlyRate) + monthly;
  }
  
  const totalInvested = initial + (monthly * years * 12);
  const earnings = total - totalInvested;
  
  const resultDiv = document.getElementById('simulationResult');
  const resultContent = document.getElementById('simResultContent');
  
  if (resultDiv && resultContent) {
    resultDiv.style.display = 'block';
    resultContent.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
        <div>
          <div style="font-size: 12px; color: var(--muted);">Total Investido</div>
          <div style="font-size: 18px; font-weight: 600;">${safeFormatCurrency(totalInvested)}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: var(--muted);">Rendimentos</div>
          <div style="font-size: 18px; font-weight: 600; color: var(--green);">${safeFormatCurrency(earnings)}</div>
        </div>
        <div style="grid-column: span 2;">
          <div style="font-size: 12px; color: var(--muted);">Valor Final</div>
          <div style="font-size: 24px; font-weight: 700; color: var(--primary);">${safeFormatCurrency(total)}</div>
        </div>
      </div>
    `;
  }
  
  if (typeof showToast === 'function') showToast('Simulação concluída!', 'success');
}

// Exportar funções globalmente para onclick handlers
window.addContribution = addContribution;
window.showAddInvestmentModal = showAddInvestmentModal;
window.runSimulation = runSimulation;
window.loadInvestmentsContent = loadInvestmentsContent;