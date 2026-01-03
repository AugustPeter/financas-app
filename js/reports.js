// ============================================
// FUNÇÕES DE RELATÓRIOS
// ============================================

let wealthChart = null;
let forecastChart = null;

// Carregar conteúdo de relatórios
function loadReportsContent() {
  const content = document.getElementById('reportsContent');
  if (!content) return;
  
  content.innerHTML = `
    <div class="reports-grid">
      <div class="report-card fade-in">
        <h4>Resumo Financeiro</h4>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Maior Renda:</span>
            <span id="reportMaxIncome">R$ 0,00</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Maior Despesa:</span>
            <span id="reportMaxExpense">R$ 0,00</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Média Mensal:</span>
            <span id="reportAvgMonth">R$ 0,00</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Economia Média:</span>
            <span id="reportAvgSavings">R$ 0,00</span>
          </div>
        </div>
      </div>
      
      <div class="report-card fade-in">
        <h4>Melhor Mês</h4>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 24px; font-weight: 700; color: var(--green);" id="reportBestMonth">-</div>
          <div style="font-size: 18px;" id="reportBestAmount">R$ 0,00</div>
          <div style="font-size: 14px; color: var(--muted);">Maior saldo acumulado</div>
        </div>
      </div>
      
      <div class="report-card fade-in">
        <h4>Exportar Dados</h4>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button class="btn" id="exportCsvBtn">
            📥 Exportar como CSV
          </button>
          <button class="btn" id="exportJsonBtn">
            📥 Exportar como JSON
          </button>
          <button class="btn" id="printReportBtn">
            🖨️ Imprimir Relatório
          </button>
        </div>
      </div>
    </div>

    <div class="content-card fade-in">
      <h3>Evolução Patrimonial</h3>
      <div class="chart-container">
        <canvas id="wealthChart"></canvas>
      </div>
    </div>

    <div class="main-grid">
      <div class="content-card fade-in">
        <h3>Metas Financeiras</h3>
        <div style="display: flex; flex-direction: column; gap: 16px;" id="goalsList">
          <div style="text-align: center; padding: 20px; color: var(--muted);">
            Nenhuma meta definida
          </div>
        </div>
        <button class="btn btn-add" id="addGoalBtn">
          <i>+</i> Adicionar Meta
        </button>
      </div>
      
      <div class="content-card fade-in">
        <h3>Projeção para Próximos 6 Meses</h3>
        <div class="chart-container">
          <canvas id="forecastChart"></canvas>
        </div>
      </div>
    </div>
  `;
  
  // Configurar event listeners
  setupReportsListeners();
  
  // Carregar relatórios
  updateReports();
  updateGoalsList();
}

// Configurar listeners de relatórios
function setupReportsListeners() {
  // Botão Exportar CSV
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => exportData('csv'));
  }
  
  // Botão Exportar JSON
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => exportData('json'));
  }
  
  // Botão Imprimir
  const printReportBtn = document.getElementById('printReportBtn');
  if (printReportBtn) {
    printReportBtn.addEventListener('click', printReport);
  }
  
  // Botão Adicionar Meta
  const addGoalBtn = document.getElementById('addGoalBtn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', addGoal);
  }
}

// Atualizar relatórios
function updateReports() {
  const db = getDB();
  const months = Object.keys(db);
  
  if (months.length === 0) return;
  
  // Calcular estatísticas
  let totalIncome = 0;
  let totalExpense = 0;
  let maxIncome = 0;
  let maxExpense = 0;
  let bestMonth = '';
  let bestAmount = -Infinity;
  
  months.forEach(month => {
    const data = db[month];
    const income = sumArray(data.renda || [], 1);
    const expense = sumArray(data.despesa || [], 1);
    const savings = (data.saldo || 0);
    
    totalIncome += income;
    totalExpense += expense;
    
    if (income > maxIncome) maxIncome = income;
    if (expense > maxExpense) maxExpense = expense;
    
    if (savings > bestAmount) {
      bestAmount = savings;
      bestMonth = month;
    }
  });
  
  // Atualizar UI
  const elements = {
    'reportMaxIncome': formatCurrency(maxIncome),
    'reportMaxExpense': formatCurrency(maxExpense),
    'reportAvgMonth': formatCurrency((totalIncome - totalExpense) / months.length),
    'reportAvgSavings': formatCurrency((totalIncome - totalExpense) / months.length),
    'reportBestMonth': bestMonth,
    'reportBestAmount': formatCurrency(bestAmount)
  };
  
  Object.keys(elements).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = elements[id];
    }
  });
}

// Soma de array
function sumArray(arr, index) {
  return arr.reduce((sum, item) => sum + parseFloat(item[index] || 0), 0);
}

// Exportar dados
function exportData(format) {
  const db = getDB();
  
  // Verificar se há dados para exportar
  if (Object.keys(db).length === 0) {
    showToast('Nenhum dado para exportar', 'error');
    return;
  }
  
  let dataStr, fileName, mimeType;
  
  if (format === 'csv') {
    // Converter para CSV
    const csvRows = [];
    csvRows.push('Mês,Tipo,Descrição,Valor,Pago');
    
    Object.keys(db).forEach(month => {
      const data = db[month];
      
      // Rendas
      (data.renda || []).forEach(([desc, value, pago]) => {
        const pagoStr = pago === true || pago === 'true' ? 'Sim' : 'Não';
        csvRows.push(`${month},Renda,"${desc}",${value},${pagoStr}`);
      });
      
      // Despesas
      (data.despesa || []).forEach(([desc, value, pago]) => {
        const pagoStr = pago === true || pago === 'true' ? 'Sim' : 'Não';
        csvRows.push(`${month},Despesa,"${desc}",${value},${pagoStr}`);
      });
      
      // Investimentos
      (data.invest || []).forEach(([nome, aporte, meta]) => {
        csvRows.push(`${month},Investimento,"${nome}",${aporte},${meta}`);
      });
    });
    
    dataStr = csvRows.join('\n');
    fileName = `financas_${new Date().toISOString().split('T')[0]}.csv`;
    mimeType = 'text/csv;charset=utf-8;';
  } else {
    dataStr = JSON.stringify(db, null, 2);
    fileName = `financas_${new Date().toISOString().split('T')[0]}.json`;
    mimeType = 'application/json';
  }
  
  // Criar e iniciar download
  try {
    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(`Dados exportados como ${format.toUpperCase()}`, 'success');
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    showToast('Erro ao exportar dados', 'error');
  }
}

// Imprimir relatório
function printReport() {
  window.print();
}

// Adicionar meta
function addGoal() {
  const goal = prompt('Descrição da meta:');
  if (!goal) return;
  
  const value = parseFloat(prompt('Valor da meta (R$):') || 0);
  if (value <= 0) {
    showToast('Valor da meta inválido', 'error');
    return;
  }
  
  // Salvar meta no localStorage
  const goals = JSON.parse(localStorage.getItem('financeGoals') || '[]');
  goals.push({
    goal,
    value,
    current: 0,
    createdAt: new Date().toISOString()
  });
  
  localStorage.setItem('financeGoals', JSON.stringify(goals));
  updateGoalsList();
  showToast('Meta adicionada!', 'success');
}

// Atualizar lista de metas
function updateGoalsList() {
  const goals = JSON.parse(localStorage.getItem('financeGoals') || '[]');
  const goalsList = document.getElementById('goalsList');
  
  if (!goalsList) return;
  
  if (goals.length === 0) {
    goalsList.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--muted);">
        Nenhuma meta definida
      </div>
    `;
    return;
  }
  
  goalsList.innerHTML = '';
  goals.forEach((g, i) => {
    const progress = g.value > 0 ? (g.current / g.value) * 100 : 0;
    const goalEl = document.createElement('div');
    goalEl.className = 'fade-in';
    goalEl.style.cssText = `
      background: var(--card);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--border);
    `;
    goalEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <strong>${g.goal}</strong>
        <span>${progress.toFixed(1)}%</span>
      </div>
      <div style="background: var(--border); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
        <div style="width: ${Math.min(progress, 100)}%; height: 100%; background: var(--primary);"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 14px; color: var(--muted);">
        <span>${formatCurrency(g.current)} / ${formatCurrency(g.value)}</span>
        <button class="btn-icon" onclick="addToGoal(${i})" style="font-size: 14px;">+ Adicionar</button>
      </div>
    `;
    goalsList.appendChild(goalEl);
  });
}

// Adicionar valor à meta
function addToGoal(index) {
  const amount = parseFloat(prompt('Valor a adicionar (R$):') || 0);
  if (amount <= 0) {
    showToast('Valor inválido', 'error');
    return;
  }
  
  const goals = JSON.parse(localStorage.getItem('financeGoals') || '[]');
  if (!goals[index]) {
    showToast('Meta não encontrada', 'error');
    return;
  }
  
  goals[index].current += amount;
  localStorage.setItem('financeGoals', JSON.stringify(goals));
  updateGoalsList();
  showToast('Valor adicionado à meta!', 'success');
}