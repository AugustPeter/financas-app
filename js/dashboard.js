// js/dashboard.js - VERSÃO SIMPLIFICADA QUE FUNCIONA COM O NOVO APP.JS

console.log('📊 dashboard.js carregado');

// Função principal que será chamada pelo app.js
function loadDashboardContent() {
  console.log('🎯 Criando conteúdo do dashboard...');
  
  const dashboardContent = document.getElementById('dashboardContent');
  if (!dashboardContent) {
    console.error('❌ Elemento dashboardContent não encontrado!');
    return;
  }
  
  // HTML do dashboard
  dashboardContent.innerHTML = `
    <!-- Cards de Resumo -->
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

    <!-- Rendas e Despesas -->
    <div class="main-grid">
      <div class="content-card">
        <h3>Rendas <span id="rendaCount" style="color: #94a3b8; font-size: 14px;">0 itens</span></h3>
        <div class="table-container">
          <table id="renda">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn btn-add" onclick="addRow('renda')">+ Adicionar Renda</button>
      </div>
      
      <div class="content-card">
        <h3>Despesas <span id="despesaCount" style="color: #94a3b8; font-size: 14px;">0 itens</span></h3>
        <div class="table-container">
          <table id="despesa">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Pago</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn btn-add" onclick="addRow('despesa')">+ Adicionar Despesa</button>
      </div>
    </div>

    <!-- Investimentos e Gráfico -->
    <div class="main-grid">
      <div class="content-card">
        <h3>Investimentos <span id="investCount" style="color: #94a3b8; font-size: 14px;">0 itens</span></h3>
        <div class="table-container">
          <table id="invest">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Aporte</th>
                <th>Meta</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn btn-add" onclick="addInvest()">+ Adicionar Investimento</button>
      </div>
      
      <div class="content-card">
        <h3>Resumo do Mês</h3>
        <div class="chart-container">
          <canvas id="grafico"></canvas>
        </div>
      </div>
    </div>
  `;
  }
  // 🔥 AQUI ESTÁ A PARTE IMPORTANTE 🔥
  // Aguardar um pouco para o canvas ser criado e então gerar o gráfico
  async function loadDataFromSupabase() {
  try {
    // 1. Buscar transações do Supabase
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (transError) throw transError;
    
    // 2. Buscar investimentos do Supabase
    const { data: investments, error: invError } = await supabase
      .from('investments')
      .select('*');
    
    if (invError) throw invError;
    
    // 3. Limpar a tabela atual antes de carregar
    document.querySelectorAll('#transactionTable tbody tr').forEach(row => row.remove());
    document.querySelectorAll('#investmentTable tbody tr').forEach(row => row.remove());
    
    // 4. Adicionar transações do banco
    if (transactions && transactions.length > 0) {
      transactions.forEach(trans => {
        addRow(trans.type, trans.description, trans.amount);
      });
    } else {
      console.log('Nenhuma transação encontrada no banco.');
    }
    
    // 5. Adicionar investimentos do banco
    if (investments && investments.length > 0) {
      investments.forEach(inv => {
        addInvest(inv.name, inv.monthly_value, inv.total_value);
      });
    } else {
      console.log('Nenhum investimento encontrado no banco.');
    }
    
    // 6. Calcular totais
    calc();
    
    // 7. Gerar gráfico
    generateInitialChart();
    
    console.log('✅ Dados carregados do Supabase com sucesso!');
    console.log(`📊 ${transactions?.length || 0} transações carregadas`);
    console.log(`📈 ${investments?.length || 0} investimentos carregados`);
    
  } catch (error) {
    console.error('❌ Erro ao carregar dados do Supabase:', error);
    
    // Mostrar erro para o usuário
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      background: #ff4444; color: white; padding: 10px; 
      margin: 10px; border-radius: 5px; text-align: center;
    `;
    errorDiv.innerHTML = `Erro ao carregar dados: ${error.message}`;
    document.body.prepend(errorDiv);
    
    // Remover erro após 5 segundos
    setTimeout(() => errorDiv.remove(), 5000);
  }
}

// 🔥 NOVA FUNÇÃO PARA GERAR GRÁFICO INICIAL 🔥
function generateInitialChart() {
  console.log('📊 Gerando gráfico inicial...');
  
  // Verificar se Chart.js está disponível
  if (typeof Chart === 'undefined') {
    console.error('❌ Chart.js não carregado!');
    return;
  }
  
  // Verificar se canvas existe
  const canvas = document.getElementById('grafico');
  if (!canvas) {
    console.error('❌ Canvas #grafico não encontrado');
    return;
  }
  
  // Pegar os valores dos cards
  const totalRenda = parseFloat(document.getElementById('totalRenda').textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const totalDespesa = parseFloat(document.getElementById('totalDespesa').textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const totalInvest = parseFloat(document.getElementById('totalInvest').textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const saldoValor = parseFloat(document.getElementById('saldo').textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  
  console.log('📈 Valores para gráfico:', { totalRenda, totalDespesa, totalInvest, saldoValor });
  
  // Usar SUA função updateChart se existir
  if (typeof updateChart === 'function') {
    console.log('🎯 Usando sua função updateChart()');
    updateChart(totalRenda, totalDespesa, totalInvest, saldoValor);
  } else {
    console.log('⚠️ Criando gráfico alternativo');
    createAlternativeChart(totalRenda, totalDespesa, totalInvest, saldoValor);
  }
}

// Gráfico alternativo caso sua função não exista
function createAlternativeChart(renda, despesa, investimento, saldo) {
  const canvas = document.getElementById('grafico');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destruir gráfico anterior se existir
  if (window.dashboardChart) {
    window.dashboardChart.destroy();
  }
  
  window.dashboardChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Renda', 'Despesas', 'Investimentos', 'Saldo'],
      datasets: [{
        label: 'Valores (R$)',
        data: [renda, despesa, investimento, saldo],
        backgroundColor: [
          'rgba(34, 197, 94, 0.7)',    // Verde para renda
          'rgba(239, 68, 68, 0.7)',    // Vermelho para despesas
          'rgba(99, 102, 241, 0.7)',   // Azul para investimentos
          saldo >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'  // Verde ou vermelho para saldo
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
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `R$ ${context.raw.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            }
          }
        }
      }
    }
  });
}
// ============================================
// FUNÇÕES DO DASHBOARD (mantenha as suas)
// ============================================

// Adicionar linha
function addRow(tipo, descricao = '', valor = 0, pago = false) {
  const tbody = document.querySelector(`#${tipo} tbody`);
  if (!tbody) return;
  
  const tr = document.createElement('tr');
  
  if (tipo === 'renda') {
    tr.innerHTML = `
      <td><input class="table-input" value="${descricao}" oninput="calc()" placeholder="Descrição"></td>
      <td><input class="table-input" type="number" value="${valor}" oninput="calc()" placeholder="0.00" step="0.01"></td>
      <td><button class="btn-icon" onclick="removeRow(this)">✕</button></td>
    `;
  } else if (tipo === 'despesa') {
    tr.innerHTML = `
      <td><input class="table-input" value="${descricao}" oninput="calc()" placeholder="Descrição"></td>
      <td><input class="table-input" type="number" value="${valor}" oninput="calc()" placeholder="0.00" step="0.01"></td>
      <td><input type="checkbox" class="check-pago" ${pago ? 'checked' : ''} onchange="calc()"></td>
      <td><button class="btn-icon" onclick="removeRow(this)">✕</button></td>
    `;
  }
  
  tbody.appendChild(tr);
  updateCounts();
  calc();
}

// Adicionar investimento
function addInvest(nome = '', aporte = 0, meta = 0) {
  const tbody = document.querySelector('#invest tbody');
  if (!tbody) return;
  
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="table-input" value="${nome}" oninput="calc()" placeholder="Nome"></td>
    <td><input class="table-input" type="number" value="${aporte}" oninput="calc()" placeholder="Aporte" step="0.01"></td>
    <td><input class="table-input" type="number" value="${meta}" oninput="calc()" placeholder="Meta" step="0.01"></td>
    <td><button class="btn-icon" onclick="removeRow(this)">✕</button></td>
  `;
  
  tbody.appendChild(tr);
  updateCounts();
  calc(); // 🔥 IMPORTANTE: Chamar calc() para atualizar saldo
  
  
}

// Remover linha
function removeRow(button) {
  const tr = button.closest('tr');
  if (tr) {
    tr.remove();
    calc();
  }
}

// Calcular totais
function calc() {
  console.log('🧮 Calculando totais...');
  
  // ========== 1. CALCULAR RENDAS ==========
  const rendaInputs = document.querySelectorAll('#renda input[type="number"]');
  let totalRenda = 0;
  rendaInputs.forEach(input => {
    totalRenda += parseFloat(input.value) || 0;
  });
  
  // ========== 2. CALCULAR DESPESAS ==========
  const despesaInputs = document.querySelectorAll('#despesa input[type="number"]');
  let totalDespesa = 0;
  despesaInputs.forEach(input => {
    totalDespesa += parseFloat(input.value) || 0;
  });
  
  // ========== 3. CALCULAR INVESTIMENTOS (CORRIGIDO) ==========
  const investRows = document.querySelectorAll('#invest tbody tr');
  let totalInvest = 0;
  
  investRows.forEach(row => {
    // Pegar o input de APORTE (segunda coluna - index 1)
    const aporteInput = row.querySelector('td:nth-child(2) input');
    if (aporteInput) {
      totalInvest += parseFloat(aporteInput.value) || 0;
    }
  });
  
  // ========== 4. CALCULAR SALDO (CORRIGIDO - SUBTRAI INVESTIMENTOS) ==========
  const saldoValor = totalRenda - totalDespesa - totalInvest;
  
  console.log('📊 Totais calculados:', {
    renda: totalRenda,
    despesa: totalDespesa,
    investimento: totalInvest,
    saldo: saldoValor
  });
  
  // ========== 5. ATUALIZAR DISPLAYS ==========
  document.getElementById('totalRenda').textContent = formatCurrency(totalRenda);
  document.getElementById('totalDespesa').textContent = formatCurrency(totalDespesa);
  document.getElementById('totalInvest').textContent = formatCurrency(totalInvest);
  
  const saldoEl = document.getElementById('saldo');
  if (saldoEl) {
    saldoEl.textContent = formatCurrency(saldoValor);
    saldoEl.className = saldoValor >= 0 ? 'positive' : 'negative';
  }
  
  // ========== 6. ATUALIZAR CONTAGENS ==========
  updateCounts();
  
  // ========== 7. SALVAR NO BANCO DE DADOS (se tiver) ==========
 async function saveToSupabase() {
  try {
    // Coletar todas as transações da tabela atual
    const rendas = getData('renda');  // Sua função que pega dados da tabela
    const despesas = getData('despesa');
    const investimentos = getData('invest');
    
    // Preparar dados para o Supabase
    const transactionsToSave = [];
    
    // Adicionar rendas
    rendas.forEach(item => {
      transactionsToSave.push({
        type: 'renda',
        description: item.descricao || item.description,
        amount: parseFloat(item.valor || item.amount),
        category: item.categoria || 'geral',
        created_at: new Date().toISOString()
      });
    });
    
    // Adicionar despesas
    despesas.forEach(item => {
      transactionsToSave.push({
        type: 'despesa',
        description: item.descricao || item.description,
        amount: parseFloat(item.valor || item.amount),
        category: item.categoria || 'geral',
        created_at: new Date().toISOString()
      });
    });
    
    // 2. Enviar para o Supabase
    if (transactionsToSave.length > 0) {
      const { data, error } = await supabase
        .from('transactions')
        .upsert(transactionsToSave, { onConflict: 'description,created_at' });
      
      if (error) {
        console.error('❌ Erro ao salvar no Supabase:', error);
      } else {
        console.log('✅ Dados salvos no Supabase:', data);
      }
    }
    
    // 3. Salvar investimentos separadamente
    const investmentsToSave = investimentos.map(item => ({
      name: item.nome || item.name,
      monthly_value: parseFloat(item.mensal || item.monthly_value),
      total_value: parseFloat(item.total || item.total_value),
      created_at: new Date().toISOString()
    }));
    
    if (investmentsToSave.length > 0) {
      const { data, error } = await supabase
        .from('investments')
        .upsert(investmentsToSave, { onConflict: 'name,created_at' });
      
      if (error) {
        console.error('❌ Erro ao salvar investimentos:', error);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral ao salvar:', error);
  }
}
  
  // ========== 8. ATUALIZAR GRÁFICO (CORRIGIDO) ==========
  if (typeof updateChart === 'function') {
    // Passar os 4 valores: renda, despesa, investimento, saldo
    updateChart(totalRenda, totalDespesa, totalInvest, saldoValor);
    console.log('📈 Gráfico atualizado com valores:', [totalRenda, totalDespesa, totalInvest, saldoValor]);
  } else if (window.dashboardChart) {
    // Atualizar gráfico alternativo
    window.dashboardChart.data.datasets[0].data = [totalRenda, totalDespesa, totalInvest, saldoValor];
    window.dashboardChart.data.datasets[0].backgroundColor[3] = saldoValor >= 0 
      ? 'rgba(34, 197, 94, 0.7)' 
      : 'rgba(239, 68, 68, 0.7)';
    window.dashboardChart.data.datasets[0].borderColor[3] = saldoValor >= 0 
      ? 'rgb(34, 197, 94)' 
      : 'rgb(239, 68, 68)';
    window.dashboardChart.update();
  }
}

// Atualizar contagens
function updateCounts() {
  const tables = ['renda', 'despesa', 'invest'];
  tables.forEach(tableId => {
    const count = document.querySelectorAll(`#${tableId} tbody tr`).length;
    const countEl = document.getElementById(`${tableId}Count`);
    if (countEl) {
      countEl.textContent = `${count} ite${count === 1 ? 'm' : 'ns'}`;
    }
  });
}

// Formatar moeda
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Exportar funções globais
window.addRow = addRow;
window.addInvest = addInvest;
window.removeRow = removeRow;
window.calc = calc;

// Função para formatar moeda (se não tiver)
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Função para atualizar contagens
function updateCounts() {
  const tables = ['renda', 'despesa', 'invest'];
  
  tables.forEach(tableId => {
    const rows = document.querySelectorAll(`#${tableId} tbody tr`).length;
    const countElement = document.getElementById(`${tableId}Count`);
    if (countElement) {
      countElement.textContent = `${rows} ite${rows === 1 ? 'm' : 'ns'}`;
    }
  });
}

// Função para remover linha
function removeRow(button) {
  const tr = button.closest('tr');
  if (tr) {
    tr.remove();
    updateCounts();
    calc(); // 🔥 IMPORTANTE: Recalcular após remover
  }
}


// ============================================
// INTEGRAÇÃO COM SUPABASE
// ============================================


async function saveDashboardData() {
    console.log('💾 Salvando dados do dashboard...');
    
    if (typeof saveDashboardToSupabase === 'function') {
        const result = await saveDashboardToSupabase();
        
        if (result.success) {
            showToast('✅ Dados salvos com sucesso!', 'success');
        } else {
            showToast('⚠️ ' + (result.message || 'Erro ao salvar'), 'warning');
        }
        
        return result;
    } else {
        console.error('❌ Função saveDashboardToSupabase não encontrada');
        showToast('❌ Erro: Sistema de salvamento não carregado', 'error');
        return { success: false, error: 'Função não disponível' };
    }
}

// Atualizar a função calc() para usar a função correta
const originalCalc = window.calc;
window.calc = function() {
    // Executar cálculo original
    if (originalCalc) originalCalc();
    
    // Salvar automaticamente (com debounce)
    if (typeof saveDashboardToSupabase === 'function') {
        setTimeout(async () => {
            await saveDashboardToSupabase();
        }, 2000);
    }
};

// Adicionar botões de salvar/carregar no dashboard
function addDataManagementButtons() {
    const dashboardContent = document.getElementById('dashboardContent');
    if (!dashboardContent) return;
    
    // Verificar se já tem botões
    if (document.getElementById('dataManagementButtons')) return;
    
    const buttonsHtml = `
        <div id="dataManagementButtons" style="display: flex; gap: 10px; margin: 20px 0; justify-content: center;">
            <button onclick="loadFromCloud()" class="btn" style="background: #3b82f6;">
                🔄 Carregar Dados
            </button>
            <button onclick="saveDashboardData()" class="btn" style="background: #10b981;">
                💾 Salvar Dados
            </button>
            <button onclick="exportData()" class="btn" style="background: #8b5cf6;">
                📤 Exportar
            </button>
        </div>
    `;
    
    // Inserir depois dos summary cards
    const summaryCards = dashboardContent.querySelector('.summary-cards');
    if (summaryCards) {
        summaryCards.insertAdjacentHTML('afterend', buttonsHtml);
    }
}

// Função para exportar dados
async function exportData() {
    if (typeof collectDashboardData !== 'function') {
        showToast('❌ Função de exportação não disponível', 'error');
        return;
    }
    
    const data = collectDashboardData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financas-${getCurrentMonth()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('📤 Dados exportados com sucesso!', 'success');
}

// Helper para getCurrentMonth (se não existir no supabase-data.js)
function getCurrentMonth() {
    const date = new Date();
    const month = date.toLocaleString('pt-BR', { month: 'long' });
    const year = date.getFullYear();
    return `${month}-${year}`.toLowerCase();
}

// Adicionar botões quando dashboard carregar
setTimeout(addDataManagementButtons, 2000);

// Exportar funções
window.saveDashboardData = saveDashboardData;
window.loadDashboardData = loadFromCloud;
window.exportData = exportData;

async function testSupabase() {
    if (window.supabaseData && window.supabaseData.testConnection) {
        const result = await window.supabaseData.testConnection();
        
        if (result) {
            showToast('✅ Conexão com Supabase OK!', 'success');
        } else {
            showToast('❌ Problema com conexão Supabase', 'error');
        }
    } else {
        showToast('❌ Função de teste não disponível', 'error');
    }
};

// Função para salvar dados no Supabase



console.log('✅ dashboard.js pronto para uso');