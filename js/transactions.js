// ============================================
// FUNÇÕES DE TRANSAÇÕES
// ============================================

// Carregar conteúdo de transações
function loadTransactionsContent() {
  const content = document.getElementById('transactionsContent');
  if (!content) return;
  
  content.innerHTML = `
    <div class="content-card fade-in">
      <h3>Todas as Transações</h3>
      <div class="filters" style="margin-bottom: 20px;">
        <select class="table-input" style="width: auto;" id="filterType">
          <option value="all">Todas as transações</option>
          <option value="renda">Apenas rendas</option>
          <option value="despesa">Apenas despesas</option>
        </select>
        <select class="table-input" style="width: auto;" id="filterMonth">
          <option value="current">Mês atual</option>
          <option value="all">Todos os meses</option>
        </select>
      </div>
      
      <div class="transactions-list" id="transactionsList">
        <!-- Transações serão carregadas dinamicamente -->
        <div style="text-align: center; padding: 40px; color: var(--muted);">
          Nenhuma transação encontrada
        </div>
      </div>
    </div>

    <div class="main-grid">
      <div class="content-card fade-in">
        <h3>Adicionar Transação Rápida</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <select class="table-input" id="quickType">
            <option value="renda">Renda</option>
            <option value="despesa">Despesa</option>
          </select>
          <input class="table-input" id="quickDesc" placeholder="Descrição">
          <input class="table-input" id="quickValue" type="number" placeholder="Valor" step="0.01">
          <button class="btn btn-primary" id="addQuickTransactionBtn">
            Adicionar Transação
          </button>
        </div>
      </div>
      
      <div class="content-card fade-in">
        <h3>Transações por Categoria</h3>
        <div class="chart-container">
          <canvas id="categoryChart"></canvas>
        </div>
      </div>
    </div>
  `;
  
  // Configurar event listeners
  setupTransactionsListeners();
  
  // Carregar transações
  loadTransactions();
}

// Configurar listeners de transações
function setupTransactionsListeners() {
  // Botão Adicionar Transação Rápida
  const addQuickBtn = document.getElementById('addQuickTransactionBtn');
  if (addQuickBtn) {
    addQuickBtn.addEventListener('click', addQuickTransaction);
  }
  
  // Filtros
  const filterType = document.getElementById('filterType');
  const filterMonth = document.getElementById('filterMonth');
  
  if (filterType) {
    filterType.addEventListener('change', loadTransactions);
  }
  
  if (filterMonth) {
    filterMonth.addEventListener('change', loadTransactions);
  }
}

// Carregar transações
function loadTransactions() {
  const db = getDB();
  const transactionsList = document.getElementById('transactionsList');
  if (!transactionsList) return;
  
  let allTransactions = [];
  
  // Coletar todas as transações de todos os meses
  Object.keys(db).forEach(month => {
    const monthData = db[month];
    
    // Rendas
    if (monthData.renda) {
      monthData.renda.forEach(([desc, value]) => {
        // Renda não tem status de pago
        allTransactions.push({
          month,
          type: 'renda',
          desc,
          value: parseFloat(value) || 0,
          pago: false, // Renda sempre considerada como "recebida"
          date: monthData.updatedAt
        });
      });
    }
    
    // Despesas
    if (monthData.despesa) {
      monthData.despesa.forEach(([desc, value, pago]) => {
        allTransactions.push({
          month,
          type: 'despesa',
          desc,
          value: parseFloat(value) || 0,
          pago: pago === 'true' || pago === true,
          date: monthData.updatedAt
        });
      });
    }
  });
  
  // Aplicar filtros
  const filterType = document.getElementById('filterType');
  const filterMonth = document.getElementById('filterMonth');
  
  let filteredTransactions = allTransactions;
  
  if (filterType && filterType.value !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => t.type === filterType.value);
  }
  
  if (filterMonth && filterMonth.value === 'current') {
    filteredTransactions = filteredTransactions.filter(t => t.month === mesAtual);
  }
  
  // Ordenar por data (mais recente primeiro)
  filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Exibir transações
  if (filteredTransactions.length === 0) {
    transactionsList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--muted);">
        Nenhuma transação encontrada
      </div>
    `;
    return;
  }
  
  transactionsList.innerHTML = '';
  filteredTransactions.forEach(trans => {
    const transEl = document.createElement('div');
    transEl.className = 'transaction-item fade-in';
    transEl.innerHTML = `
      <div class="transaction-info">
        <div class="transaction-name">${trans.desc || 'Sem descrição'}</div>
        <div style="display: flex; gap: 8px; margin-top: 4px;">
          <span class="transaction-category">${trans.type === 'renda' ? '💰 Renda' : '💸 Despesa'}</span>
          <span class="transaction-category">${trans.month}</span>
          ${trans.pago ? '<span class="transaction-category" style="color: var(--green);">✓ Pago</span>' : ''}
        </div>
      </div>
      <div class="transaction-amount ${trans.type === 'renda' ? 'positive' : 'negative'}">
        ${trans.type === 'renda' ? '+' : '-'}${formatCurrency(trans.value)}
      </div>
    `;
    transactionsList.appendChild(transEl);
  });
}

// Adicionar transação rápida
function addQuickTransaction() {
  const type = document.getElementById('quickType');
  const desc = document.getElementById('quickDesc');
  const value = document.getElementById('quickValue');
  
  if (!type || !desc || !value) {
    showToast('Elementos do formulário não encontrados', 'error');
    return;
  }
  
  const typeValue = type.value;
  const descValue = desc.value.trim();
  const valueNum = parseFloat(value.value) || 0;
  
  if (!descValue || valueNum <= 0) {
    showToast('Preencha descrição e valor corretamente', 'error');
    return;
  }
  
  // Para renda, não usar parâmetro pago
  if (typeValue === 'renda') {
    addRow(typeValue, descValue, valueNum);
  } else {
    // Para despesa, pode começar como não pago
    addRow(typeValue, descValue, valueNum, false);
  }
  
  // Limpar campos
  desc.value = '';
  value.value = '';
  
  // Atualizar lista de transações se estiver na tab de transações
  if (currentTab === 'transactions') {
    setTimeout(() => {
      loadTransactions();
    }, 200);
  }
  
  showToast('Transação adicionada com sucesso!', 'success');
}