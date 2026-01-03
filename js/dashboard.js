// ============================================
// FUNÇÕES DO DASHBOARD
// ============================================

// Carregar conteúdo do dashboard
function loadDashboardContent() {
  const content = document.getElementById('dashboardContent');
  if (!content) return;
  
  content.innerHTML = `
    <!-- Cards de Resumo -->
    <div class="summary-cards">
      <div class="summary-card fade-in">
        <span>Renda</span>
        <h2 id="totalRenda">R$ 0,00</h2>
      </div>
      <div class="summary-card fade-in">
        <span>Despesas</span>
        <h2 id="totalDespesa">R$ 0,00</h2>
      </div>
      <div class="summary-card fade-in">
        <span>Saldo</span>
        <h2 id="saldo">R$ 0,00</h2>
      </div>
      <div class="summary-card fade-in">
        <span>Investimentos</span>
        <h2 id="totalInvest">R$ 0,00</h2>
      </div>
    </div>

    <!-- Rendas e Despesas -->
    <div class="main-grid">
<<div class="content-card fade-in">
  <h3>
    Rendas
    <span style="color: var(--green); font-size: 14px;" id="rendaCount">0 itens</span>
  </h3>
  <div class="table-container">
    <table id="renda">
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Valor</th>
          <th></th> <!-- APENAS 3 COLUNAS -->
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
  <button class="btn btn-add" id="addRendaBtn">
    <i>+</i> Adicionar Renda
  </button>
</div>
      <div class="content-card fade-in">
        <h3>
          Despesas
          <span style="color: var(--red); font-size: 14px;" id="despesaCount">0 itens</span>
        </h3>
        <div class="table-container">
          <table id="despesa">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Pago</th>
                <th></th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn btn-add" id="addDespesaBtn">
          <i>+</i> Adicionar Despesa
        </button>
      </div>
    </div>

    <!-- Investimentos e Histórico -->
    <div class="main-grid">
      <div class="content-card fade-in">
        <h3>Investimentos</h3>
        <div class="table-container">
          <table id="invest">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Aporte</th>
                <th>Meta</th>
                <th></th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn btn-add" id="addInvestBtn">
          <i>+</i> Adicionar Investimento
        </button>
      </div>

      <div class="content-card fade-in">
        <h3>Histórico Financeiro</h3>
        <div class="chart-container">
          <canvas id="historico"></canvas>
        </div>
      </div>
    </div>

    <!-- Gráfico de Resumo -->
    <div class="content-card fade-in">
      <h3>Resumo do Mês</h3>
      <div class="chart-container">
        <canvas id="grafico"></canvas>
      </div>
    </div>
  `;
  
  // Configurar event listeners
  setupDashboardListeners();
  
  // Carregar dados do mês
  loadMonth();
}

// Configurar listeners do dashboard
function setupDashboardListeners() {
  // Botão Adicionar Renda
  const addRendaBtn = document.getElementById('addRendaBtn');
  if (addRendaBtn) {
    addRendaBtn.addEventListener('click', () => addRow('renda'));
  }
  
  // Botão Adicionar Despesa
  const addDespesaBtn = document.getElementById('addDespesaBtn');
  if (addDespesaBtn) {
    addDespesaBtn.addEventListener('click', () => addRow('despesa'));
  }
  
  // Botão Adicionar Investimento
  const addInvestBtn = document.getElementById('addInvestBtn');
  if (addInvestBtn) {
    addInvestBtn.addEventListener('click', () => addInvest());
  }
}

// Adicionar linha nas tabelas
// Adicionar linha nas tabelas
// Adicionar linha nas tabelas - VERSÃO CORRIGIDA
function addRow(tipo, d = '', v = 0, pago = false) {
  console.log(`Adicionando linha na tabela: ${tipo}`, { desc: d, valor: v, pago: pago });
  
  const tbody = document.querySelector(`#${tipo} tbody`);
  if (!tbody) {
    console.error(`Tabela #${tipo} não encontrada`);
    return;
  }
  
  const tr = document.createElement('tr');
  tr.className = 'fade-in';
  
  // Verificar qual tabela estamos adicionando
  if (tipo === 'renda') {
    console.log('Adicionando renda SEM checkbox');
    tr.innerHTML = `
      <td>
        <input class="table-input" value="${d}" oninput="calc()" placeholder="Descrição" type="text">
      </td>
      <td>
        <input class="table-input" value="${v}" oninput="calc()" placeholder="0.00" type="number" step="0.01">
      </td>
      <td>
        <button class="btn-icon" onclick="removeRow(this)">✕</button>
      </td>
    `;
  } else if (tipo === 'despesa') {
    console.log('Adicionando despesa COM checkbox');
    tr.innerHTML = `
      <td>
        <input class="table-input" value="${d}" oninput="calc()" placeholder="Descrição" type="text">
      </td>
      <td>
        <input class="table-input" value="${v}" oninput="calc()" placeholder="0.00" type="number" step="0.01">
      </td>
      <td>
        <input type="checkbox" class="check-pago" ${pago ? 'checked' : ''} onchange="calc()">
      </td>
      <td>
        <button class="btn-icon" onclick="removeRow(this)">✕</button>
      </td>
    `;
  }
  
  tbody.appendChild(tr);
  console.log(`Linha adicionada na tabela ${tipo}`);
  
  updateCounts();
  calc();
  showToast(`${tipo === 'renda' ? 'Renda' : 'Despesa'} adicionada`, 'success');
}
// Remover linha
function removeRow(button) {
  const tr = button.closest('tr');
  if (tr) {
    tr.remove();
    calc();
  }
}

// Adicionar investimento
function addInvest(n = '', a = 0, m = 0) {
  const tbody = document.querySelector('#invest tbody');
  if (!tbody) {
    console.error('Tabela #invest não encontrada');
    return;
  }
  
  const tr = document.createElement('tr');
  tr.className = 'fade-in';
  tr.innerHTML = `
    <td><input class="table-input" value="${n}" oninput="calc()" placeholder="Nome"></td>
    <td><input class="table-input" type="number" value="${a}" oninput="calc()" placeholder="Aporte" step="0.01"></td>
    <td><input class="table-input" type="number" value="${m}" oninput="calc()" placeholder="Meta" step="0.01"></td>
    <td><button class="btn-icon" onclick="removeRow(this)">✕</button></td>
  `;
  tbody.appendChild(tr);
  calc();
  showToast('Investimento adicionado', 'success');
}

// Cálculos principais
function calc() {
  const renda = sumTable('renda', 1);
  const despesa = sumTable('despesa', 1);
  const invest = sumTable('invest', 1);
  const saldoValor = renda - despesa - invest;

  // Atualizar displays
  document.getElementById('totalRenda').textContent = formatCurrency(renda);
  document.getElementById('totalDespesa').textContent = formatCurrency(despesa);
  document.getElementById('totalInvest').textContent = formatCurrency(invest);
  
  const saldoEl = document.getElementById('saldo');
  if (saldoEl) {
    saldoEl.textContent = formatCurrency(saldoValor);
    saldoEl.className = saldoValor >= 0 ? 'positive' : 'negative';
  }

  // Salvar no banco de dados
  const db = getDB();
  db[mesAtual] = {
    renda: getData('renda'),
    despesa: getData('despesa'),
    invest: getData('invest'),
    saldo: saldoValor,
    updatedAt: new Date().toISOString()
  };
  saveDB(db);

  // Atualizar contagens
  updateCounts();
  
  // Atualizar gráficos
  if (window.updateChart) updateChart(renda, despesa, invest, saldoValor);
  if (window.updateHistory) updateHistory();
}